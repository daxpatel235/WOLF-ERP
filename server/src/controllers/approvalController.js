const Approval = require('../models/Approval');
const { asyncHandler } = require('../middleware/errorHandler');
const approvalEngine = require('../services/approvalEngine');

// GET /api/approvals?status=Pending
const list = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && status !== 'All') filter.status = status;

  const approvals = await Approval.find(filter).sort({ date: -1 });
  const data = approvals.map((a) => a.toJSON());
  res.json({
    data,
    pending: data.filter((a) => a.status === 'Pending'),
    decided: data.filter((a) => a.status !== 'Pending'),
    counts: {
      pending: data.filter((a) => a.status === 'Pending').length,
      approved: data.filter((a) => a.status === 'Approved').length,
      rejected: data.filter((a) => a.status === 'Rejected').length,
    },
  });
});

// GET /api/approvals/count  (for the sidebar badge)
const count = asyncHandler(async (_req, res) => {
  const pending = await Approval.countDocuments({ status: 'Pending' });
  res.json({ pending });
});

// POST /api/approvals/:id/decide { decision, comment }
// Flows the decision back to the underlying PO / Invoice / RFQ.
const decide = asyncHandler(async (req, res) => {
  const { decision, comment } = req.body;
  const { approval, entity } = await approvalEngine.decide(req.params.id, {
    decision,
    decidedBy: req.user?.name || '',
    comment,
  });
  res.json({ data: approval.toJSON(), entity: entity ? entity.toJSON() : null });
});

module.exports = { list, count, decide };
