const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateCode } = require('../utils/generateId');
const { sumItems } = require('../utils/schema');
const { openApproval } = require('../services/approvalEngine');
const notify = require('../services/notificationService');

// GET /api/purchase-orders
const list = asyncHandler(async (req, res) => {
  const { q, status, vendorId, priority } = req.query;
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (vendorId) filter.vendorId = vendorId;
  if (priority) filter.priority = priority;
  if (q) filter.$or = [{ vendor: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }];

  const pos = await PurchaseOrder.find(filter).sort({ created: -1 });
  res.json({ data: pos.map((p) => p.toJSON()), count: pos.length });
});

// GET /api/purchase-orders/:id
const getOne = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ code: req.params.id });
  if (!po) return res.status(404).json({ message: 'Purchase order not found.' });
  const invoices = await Invoice.find({ poId: po.code }).sort({ issued: -1 });
  res.json({ data: po.toJSON(), invoices: invoices.map((i) => i.toJSON()) });
});

// POST /api/purchase-orders
const create = asyncHandler(async (req, res) => {
  const code = await generateCode(PurchaseOrder, { prefix: 'PO', year: true, pad: 3 });
  const items = req.body.items || [];
  const amount = req.body.amount != null ? req.body.amount : sumItems(items);

  const po = await PurchaseOrder.create({
    ...req.body,
    code,
    amount,
    requestedBy: req.body.requestedBy || req.user?.name || '',
    createdBy: req.user?._id,
  });

  // If created already in "Pending Approval", open an approval task.
  if (po.status === 'Pending Approval') {
    await openApproval({
      refModel: 'PurchaseOrder',
      refId: po.code,
      type: 'Purchase Order',
      vendor: po.vendor,
      amount: po.amount,
      requestedBy: po.requestedBy,
      priority: po.priority,
    });
  }

  await notify.record({
    actor: req.user?.name || 'System',
    action: 'created',
    entityType: 'PurchaseOrder',
    entityId: code,
    message: `Purchase order ${code} created for ${po.vendor}`,
  });
  res.status(201).json({ data: po.toJSON() });
});

// PUT /api/purchase-orders/:id
const update = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ code: req.params.id });
  if (!po) return res.status(404).json({ message: 'Purchase order not found.' });

  const allowed = ['vendor', 'vendorId', 'priority', 'delivery', 'items', 'notes', 'amount'];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) po[f] = req.body[f];
  });
  if (req.body.items && req.body.amount == null) po.amount = sumItems(req.body.items);
  await po.save();
  res.json({ data: po.toJSON() });
});

// POST /api/purchase-orders/:id/submit → Pending Approval + approval task
const submit = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findOne({ code: req.params.id });
  if (!po) return res.status(404).json({ message: 'Purchase order not found.' });

  po.status = 'Pending Approval';
  await po.save();
  await openApproval({
    refModel: 'PurchaseOrder',
    refId: po.code,
    type: 'Purchase Order',
    vendor: po.vendor,
    amount: po.amount,
    requestedBy: po.requestedBy || req.user?.name || '',
    priority: po.priority,
  });
  res.json({ data: po.toJSON() });
});

// POST /api/purchase-orders/:id/status { status }
const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Received', 'Cancelled', 'Rejected'];
  if (!valid.includes(status)) return res.status(422).json({ message: 'Invalid status.' });

  const po = await PurchaseOrder.findOne({ code: req.params.id });
  if (!po) return res.status(404).json({ message: 'Purchase order not found.' });
  po.status = status;
  await po.save();

  if (status === 'Pending Approval') {
    await openApproval({
      refModel: 'PurchaseOrder',
      refId: po.code,
      type: 'Purchase Order',
      vendor: po.vendor,
      amount: po.amount,
      requestedBy: po.requestedBy || req.user?.name || '',
      priority: po.priority,
    });
  }
  await notify.record({
    actor: req.user?.name || 'System',
    action: 'updated status',
    entityType: 'PurchaseOrder',
    entityId: po.code,
    message: `Purchase order ${po.code} marked ${status}`,
  });
  res.json({ data: po.toJSON() });
});

module.exports = { list, getOne, create, update, submit, setStatus };
