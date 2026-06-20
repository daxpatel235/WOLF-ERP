const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Approval = require('../models/Approval');
const { asyncHandler } = require('../middleware/errorHandler');
const notify = require('../services/notificationService');

const SPENDABLE = ['Approved', 'Sent', 'Received'];

const NON_OUTSTANDING = ['Paid', 'Cancelled', 'Draft'];

// GET /api/reports/summary  — headline numbers for the dashboard.
// Every figure is computed in the database (counts + grouped sums) so the API
// never streams whole collections into Node just to total them up. Combined
// with the { createdBy, status } indexes, each branch is an index-backed scan.
const summary = asyncHandler(async (req, res) => {
  const owner = req.user._id;
  const [vendors, activeVendors, rfqs, openRfqs, poAgg, invAgg, pendingApprovals] = await Promise.all([
    Vendor.countDocuments({ createdBy: owner }),
    Vendor.countDocuments({ createdBy: owner, status: 'Active' }),
    RFQ.countDocuments({ createdBy: owner }),
    RFQ.countDocuments({ createdBy: owner, status: 'Published' }),
    PurchaseOrder.aggregate([
      { $match: { createdBy: owner } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalSpend: {
            $sum: { $cond: [{ $in: ['$status', SPENDABLE] }, { $ifNull: ['$amount', 0] }, 0] },
          },
        },
      },
    ]),
    Invoice.aggregate([
      { $match: { createdBy: owner } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          outstanding: {
            $sum: {
              $cond: [
                { $in: ['$status', NON_OUTSTANDING] },
                0,
                { $subtract: [{ $ifNull: ['$amount', 0] }, { $ifNull: ['$amountPaid', 0] }] },
              ],
            },
          },
          overdue: { $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] } },
        },
      },
    ]),
    Approval.countDocuments({ createdBy: owner, status: 'Pending' }),
  ]);

  const po = poAgg[0] || { total: 0, totalSpend: 0 };
  const inv = invAgg[0] || { total: 0, outstanding: 0, overdue: 0 };

  res.json({
    data: {
      vendors: { total: vendors, active: activeVendors },
      rfqs: { total: rfqs, open: openRfqs },
      purchaseOrders: { total: po.total, totalSpend: po.totalSpend },
      invoices: { total: inv.total, outstanding: inv.outstanding, overdue: inv.overdue },
      approvals: { pending: pendingApprovals },
    },
  });
});

// GET /api/reports/spend-by-category
const spendByCategory = asyncHandler(async (req, res) => {
  const owner = req.user._id;
  // Map vendorId -> category, then bucket PO spend by it.
  const [vendors, pos] = await Promise.all([
    Vendor.find({ createdBy: owner }).select('code category').lean(),
    PurchaseOrder.find({ createdBy: owner, status: { $in: SPENDABLE } }).select('vendorId amount').lean(),
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
const spendByVendor = asyncHandler(async (req, res) => {
  const pos = await PurchaseOrder.find({ createdBy: req.user._id, status: { $in: SPENDABLE } })
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
  // Scope the feed to the signed-in account so it only shows their own events.
  const items = await notify.recent(Number(req.query.limit) || 12, req.user?._id);
  res.json({ data: items.map((i) => i.toJSON()) });
});

module.exports = { summary, spendByCategory, spendByVendor, activity };
