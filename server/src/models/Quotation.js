const mongoose = require('mongoose');
const { baseOptions, lineItemFields } = require('../utils/schema');

const quotationSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true }, // Q-5001
    rfqId: { type: String, index: true }, // RFQ code this quote answers
    rfqTitle: { type: String, default: '' },
    vendor: { type: String, required: true }, // vendor name (denormalized)
    vendorId: { type: String, index: true }, // vendor code (V-1003)
    amount: { type: Number, default: 0 },
    deliveryDays: { type: Number, default: 0 },
    validTill: { type: Date },
    status: {
      type: String,
      enum: ['Received', 'Shortlisted', 'Awarded', 'Rejected'],
      default: 'Received',
    },
    submitted: { type: Date, default: Date.now },
    items: { type: [lineItemFields], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    // Owning workspace (team collaboration, Phase 1). Becomes the isolation
    // boundary in Phase 2; `createdBy` stays as the authoring user.
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  },
  baseOptions()
);

// The list is scoped by organization and sorted by submission date; the RFQ
// comparison view pulls every quote answering one RFQ within a workspace.
// Carrying the sort field in the index avoids an in-memory sort of the match.
quotationSchema.index({ organization: 1, submitted: -1 });
quotationSchema.index({ organization: 1, rfqId: 1 });

module.exports = mongoose.model('Quotation', quotationSchema);
