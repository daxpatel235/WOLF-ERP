const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const Vendor = require('../models/Vendor');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateCode } = require('../utils/generateId');
const notify = require('../services/notificationService');
const { openApproval } = require('../services/approvalEngine');
const { sendRFQInvite } = require('../services/emailService');

// Attach the live "received" count (quotations) to an RFQ JSON object.
async function withCounts(rfqDocs) {
  const codes = rfqDocs.map((r) => r.code);
  const quotes = await Quotation.find({ rfqId: { $in: codes } }).select('rfqId').lean();
  const received = {};
  quotes.forEach((q) => (received[q.rfqId] = (received[q.rfqId] || 0) + 1));
  return rfqDocs.map((r) => ({
    ...r.toJSON(),
    invited: (r.invitedVendors || []).length,
    received: received[r.code] || 0,
  }));
}

// GET /api/rfqs
const list = asyncHandler(async (req, res) => {
  const { q, status, category } = req.query;
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (category && category !== 'All') filter.category = category;
  if (q) filter.$or = [{ title: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }];

  const rfqs = await RFQ.find(filter).sort({ created: -1 });
  const data = await withCounts(rfqs);
  res.json({ data, count: data.length });
});

// GET /api/rfqs/:id  (includes its quotations)
const getOne = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ code: req.params.id });
  if (!rfq) return res.status(404).json({ message: 'RFQ not found.' });

  const quotations = await Quotation.find({ rfqId: rfq.code }).sort({ amount: 1 });
  const [data] = await withCounts([rfq]);
  res.json({ data, quotations: quotations.map((q) => q.toJSON()) });
});

// POST /api/rfqs
const create = asyncHandler(async (req, res) => {
  const code = await generateCode(RFQ, { prefix: 'RFQ', year: true, pad: 3 });
  const rfq = await RFQ.create({
    ...req.body,
    code,
    createdBy: req.user?._id,
  });
  await notify.record({
    actor: req.user?.name || 'System',
    action: 'created',
    entityType: 'RFQ',
    entityId: code,
    message: `RFQ "${rfq.title}" (${code}) created`,
  });
  res.status(201).json({ data: { ...rfq.toJSON(), invited: (rfq.invitedVendors || []).length, received: 0 } });
});

// PUT /api/rfqs/:id
const update = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ code: req.params.id });
  if (!rfq) return res.status(404).json({ message: 'RFQ not found.' });
  const allowed = ['title', 'category', 'status', 'due', 'invitedVendors', 'items', 'notes'];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) rfq[f] = req.body[f];
  });
  await rfq.save();
  const [data] = await withCounts([rfq]);
  res.json({ data });
});

// POST /api/rfqs/:id/publish  → status Published + email invited vendors
const publish = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ code: req.params.id });
  if (!rfq) return res.status(404).json({ message: 'RFQ not found.' });

  rfq.status = 'Published';
  await rfq.save();

  // Best-effort invitations.
  const vendors = await Vendor.find({ code: { $in: rfq.invitedVendors || [] } }).select('email');
  await Promise.all(vendors.filter((v) => v.email).map((v) => sendRFQInvite(v.email, rfq)));

  await notify.record({
    actor: req.user?.name || 'System',
    action: 'published',
    entityType: 'RFQ',
    entityId: rfq.code,
    message: `RFQ ${rfq.code} published to ${vendors.length} vendor(s)`,
  });
  const [data] = await withCounts([rfq]);
  res.json({ data });
});

// POST /api/rfqs/:id/submit  → open an approval task
const submitForApproval = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findOne({ code: req.params.id });
  if (!rfq) return res.status(404).json({ message: 'RFQ not found.' });

  const approval = await openApproval({
    refModel: 'RFQ',
    refId: rfq.code,
    type: 'RFQ Approval',
    requestedBy: req.user?.name || '',
    priority: req.body.priority || 'medium',
  });
  res.status(201).json({ data: approval.toJSON() });
});

module.exports = { list, getOne, create, update, publish, submitForApproval };
