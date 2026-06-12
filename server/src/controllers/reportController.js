const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Approval = require('../models/Approval');
const { asyncHandler } = require('../middleware/errorHandler');
const notify = require('../services/notificationService');

const SPENDABLE = ['Approved', 'Sent', 'Received'];

// GET /api/reports/summary  — headline numbers for the dashboard.
const summary = asyncHandler(async (_req, res) => {
  const [vendors, activeVendors, rfqs, openRfqs, pos, invoices, pendingApprovals] = await Promise.all([
    Vendor.countDocuments(),
    Vendor.countDocuments({ status: 'Active' }),
    RFQ.countDocuments(),
    RFQ.countDocuments({ status: 'Published' }),
    PurchaseOrder.find().select('amount status').lean(),
    Invoice.find().select('amount amountPaid status').lean(),
    Approval.countDocuments({ status: 'Pending' }),
  ]);

  const totalSpend = pos
    .filter((p) => SPENDABLE.includes(p.status))
    .reduce((t, p) => t + (p.amount || 0), 0);
  const outstanding = invoices
    .filter((i) => !['Paid', 'Cancelled', 'Draft'].includes(i.status))
    .reduce((t, i) => t + ((i.amount || 0) - (i.amountPaid || 0)), 0);
  const overdue = invoices.filter((i) => i.status === 'Overdue').length;

  res.json({
    data: {
      vendors: { total: vendors, active: activeVendors },
      rfqs: { total: rfqs, open: openRfqs },
      purchaseOrders: { total: pos.length, totalSpend },
      invoices: { total: invoices.length, outstanding, overdue },
      approvals: { pending: pendingApprovals },
    },
  });
});

// GET /api/reports/spend-by-category
const spendByCategory = asyncHandler(async (_req, res) => {
  // Map vendorId -> category, then bucket PO spend by it.
  const [vendors, pos] = await Promise.all([
    Vendor.find().select('code category').lean(),
    PurchaseOrder.find({ status: { $in: SPENDABLE } }).select('vendorId amount').lean(),
  ]);
  const catOf = Object.fromEntries(vendors.map((v) => [v.code, v.category || 'Other']));
  const buckets = {};
  pos.forEach((p) => {
    const cat = catOf[p.vendorId] || 'Other';
    buckets[cat] = (buckets[cat] || 0) + (p.amount || 0);
  });
  const data = Object.entries(buckets)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  res.json({ data });
});

// GET /api/reports/spend-by-vendor
const spendByVendor = asyncHandler(async (_req, res) => {
  const pos = await PurchaseOrder.find({ status: { $in: SPENDABLE } })
    .select('vendor vendorId amount')
    .lean();
  const buckets = {};
  pos.forEach((p) => {
    const key = p.vendorId || p.vendor;
    if (!buckets[key]) buckets[key] = { vendor: p.vendor, vendorId: p.vendorId, amount: 0, orders: 0 };
    buckets[key].amount += p.amount || 0;
    buckets[key].orders += 1;
  });
  const data = Object.values(buckets).sort((a, b) => b.amount - a.amount);
  res.json({ data });
});

// GET /api/reports/activity
const activity = asyncHandler(async (req, res) => {
  const items = await notify.recent(Number(req.query.limit) || 12);
  res.json({ data: items.map((i) => i.toJSON()) });
});

module.exports = { summary, spendByCategory, spendByVendor, activity };
