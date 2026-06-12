const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateCode } = require('../utils/generateId');
const notify = require('../services/notificationService');

// Compute live orders/spend for a set of vendor codes from purchase orders.
async function statsFor(vendorCodes) {
  const pos = await PurchaseOrder.find({ vendorId: { $in: vendorCodes } }).select('vendorId amount status').lean();
  const map = {};
  vendorCodes.forEach((c) => (map[c] = { orders: 0, spend: 0 }));
  pos.forEach((po) => {
    if (!map[po.vendorId]) map[po.vendorId] = { orders: 0, spend: 0 };
    map[po.vendorId].orders += 1;
    if (!['Cancelled', 'Rejected', 'Draft'].includes(po.status)) {
      map[po.vendorId].spend += po.amount || 0;
    }
  });
  return map;
}

// GET /api/vendors
const list = asyncHandler(async (req, res) => {
  const { q, status, category } = req.query;
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (category && category !== 'All') filter.category = category;
  if (q) {
    filter.$or = [
      { name: new RegExp(q, 'i') },
      { contact: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
      { code: new RegExp(q, 'i') },
    ];
  }

  const vendors = await Vendor.find(filter).sort({ createdAt: -1 });
  const stats = await statsFor(vendors.map((v) => v.code));
  const data = vendors.map((v) => ({ ...v.toJSON(), ...(stats[v.code] || { orders: 0, spend: 0 }) }));
  res.json({ data, count: data.length });
});

// GET /api/vendors/:id  (id = vendor code)
const getOne = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ code: req.params.id });
  if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });

  const [pos, invoices, stats] = await Promise.all([
    PurchaseOrder.find({ vendorId: vendor.code }).sort({ created: -1 }),
    Invoice.find({ vendorId: vendor.code }).sort({ issued: -1 }),
    statsFor([vendor.code]),
  ]);

  res.json({
    data: { ...vendor.toJSON(), ...(stats[vendor.code] || { orders: 0, spend: 0 }) },
    purchaseOrders: pos.map((p) => p.toJSON()),
    invoices: invoices.map((i) => i.toJSON()),
  });
});

// POST /api/vendors
const create = asyncHandler(async (req, res) => {
  const code = await generateCode(Vendor, { prefix: 'V', start: 1001, pad: 4 });
  const vendor = await Vendor.create({
    ...req.body,
    code,
    createdBy: req.user?._id,
  });
  await notify.record({
    actor: req.user?.name || 'System',
    action: 'created',
    entityType: 'Vendor',
    entityId: code,
    message: `Vendor ${vendor.name} (${code}) added`,
  });
  res.status(201).json({ data: vendor.toJSON() });
});

// PUT /api/vendors/:id
const update = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ code: req.params.id });
  if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });

  const allowed = ['name', 'category', 'contact', 'email', 'phone', 'gstin', 'location', 'status', 'rating', 'notes'];
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) vendor[f] = req.body[f];
  });
  await vendor.save();
  res.json({ data: vendor.toJSON() });
});

// DELETE /api/vendors/:id
const remove = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOneAndDelete({ code: req.params.id });
  if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });
  res.json({ message: `Vendor ${vendor.code} deleted.` });
});

module.exports = { list, getOne, create, update, remove };
