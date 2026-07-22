const Quotation = require('../models/Quotation');
const RFQ = require('../models/RFQ');
const PurchaseOrder = require('../models/PurchaseOrder');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateCode } = require('../utils/generateId');
const { sumItems } = require('../utils/schema');
const { compareRfq } = require('../services/comparisonService');
const notify = require('../services/notificationService');
const { orgFilter, orgStamp } = require('../utils/scope');

// GET /api/quotations
const list = asyncHandler(async (req, res) => {
  const { q, status, rfqId, vendorId } = req.query;
  const filter = orgFilter(req);
  if (status && status !== 'All') filter.status = status;
  if (rfqId) filter.rfqId = rfqId;
  if (vendorId) filter.vendorId = vendorId;
  if (q) filter.$or = [{ vendor: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }, { rfqTitle: new RegExp(q, 'i') }];

  const quotations = await Quotation.find(filter).sort({ submitted: -1 });
  res.json({ data: quotations.map((x) => x.toJSON()), count: quotations.length });
});

// GET /api/quotations/compare?rfqId=RFQ-2025-042
const compare = asyncHandler(async (req, res) => {
  const { rfqId } = req.query;
  if (!rfqId) return res.status(400).json({ message: 'rfqId query parameter is required.' });
  res.json({ data: await compareRfq(rfqId, req.user.organization) });
});

// GET /api/quotations/:id
const getOne = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne(orgFilter(req, { code: req.params.id }));
  if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });
  res.json({ data: quotation.toJSON() });
});

// POST /api/quotations
const create = asyncHandler(async (req, res) => {
  const code = await generateCode(Quotation, { prefix: 'Q', start: 5001, pad: 4 });
  const items = req.body.items || [];
  const amount = req.body.amount != null ? req.body.amount : sumItems(items);

  // Denormalize the RFQ title for display if we can find it.
  let rfqTitle = req.body.rfqTitle || '';
  if (req.body.rfqId && !rfqTitle) {
    const rfq = await RFQ.findOne(orgFilter(req, { code: req.body.rfqId })).select('title');
    rfqTitle = rfq?.title || '';
  }

  const quotation = await Quotation.create({ ...req.body, code, amount, rfqTitle, ...orgStamp(req) });
  await notify.record({
    userId: req.user?._id,
    organization: req.user?.organization,
    actor: req.user?.name || quotation.vendor,
    action: 'submitted quotation',
    entityType: 'Quotation',
    entityId: code,
    message: `Quotation ${code} received from ${quotation.vendor}`,
  });
  res.status(201).json({ data: quotation.toJSON() });
});

// POST /api/quotations/:id/shortlist
const shortlist = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOneAndUpdate(
    orgFilter(req, { code: req.params.id }),
    { status: 'Shortlisted' },
    { new: true }
  );
  if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });
  res.json({ data: quotation.toJSON() });
});

// POST /api/quotations/:id/status { status }
const setStatus = asyncHandler(async (req, res) => {
  const valid = ['Received', 'Shortlisted', 'Awarded', 'Rejected'];
  if (!valid.includes(req.body.status)) {
    return res.status(422).json({ message: 'Invalid quotation status.' });
  }
  const quotation = await Quotation.findOneAndUpdate(
    orgFilter(req, { code: req.params.id }),
    { status: req.body.status },
    { new: true }
  );
  if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });
  res.json({ data: quotation.toJSON() });
});

// POST /api/quotations/:id/award
// Awards the quote, marks the RFQ Awarded, and drafts a Purchase Order from it.
const award = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne(orgFilter(req, { code: req.params.id }));
  if (!quotation) return res.status(404).json({ message: 'Quotation not found.' });

  quotation.status = 'Awarded';
  await quotation.save();

  // The next three writes are independent of each other, so run them together:
  //   1. reject sibling quotes on the same RFQ
  //   2. mark the RFQ Awarded
  //   3. draft a PO from the winning quote
  const poCode = await generateCode(PurchaseOrder, { prefix: 'PO', year: true, pad: 3 });
  const [, , po] = await Promise.all([
    Quotation.updateMany(
      orgFilter(req, { rfqId: quotation.rfqId, _id: { $ne: quotation._id }, status: { $ne: 'Awarded' } }),
      { status: 'Rejected' }
    ),
    quotation.rfqId
      ? RFQ.findOneAndUpdate(orgFilter(req, { code: quotation.rfqId }), { status: 'Awarded' })
      : Promise.resolve(null),
    PurchaseOrder.create({
      code: poCode,
      vendor: quotation.vendor,
      vendorId: quotation.vendorId,
      rfqId: quotation.rfqId,
      quotationId: quotation.code,
      amount: quotation.amount,
      status: 'Draft',
      priority: req.body.priority || 'medium',
      delivery: req.body.delivery,
      items: quotation.items,
      requestedBy: req.user?.name || '',
      ...orgStamp(req),
    }),
  ]);

  await notify.record({
    userId: req.user?._id,
    organization: req.user?.organization,
    actor: req.user?.name || 'System',
    action: 'awarded',
    entityType: 'Quotation',
    entityId: quotation.code,
    message: `Quotation ${quotation.code} awarded → ${poCode} drafted`,
  });

  res.json({ data: quotation.toJSON(), purchaseOrder: po.toJSON() });
});

module.exports = { list, compare, getOne, create, shortlist, setStatus, award };
