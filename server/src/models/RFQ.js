const mongoose = require('mongoose');
const { baseOptions, lineItemFields } = require('../utils/schema');

const rfqSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true }, // RFQ-2025-042
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Closed', 'Awarded', 'Cancelled'],
      default: 'Draft',
    },
    created: { type: Date, default: Date.now },
    due: { type: Date },
    // Vendor codes (e.g. "V-1003") invited to quote.
    invitedVendors: [{ type: String }],
    items: { type: [lineItemFields], default: [] },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Owning workspace — the isolation boundary (team collaboration). Covered by
    // the { organization, status } compound index below; `createdBy` stays as the
    // authoring user.
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  },
  baseOptions()
);

// Dashboard/listing queries always scope by organization, often plus status.
// The compound also serves org-only lookups via its leading-field prefix.
rfqSchema.index({ organization: 1, status: 1 });

// `invited` mirrors the count of invited vendors for the list UI.
rfqSchema.virtual('invited').get(function getInvited() {
  return (this.invitedVendors || []).length;
});

module.exports = mongoose.model('RFQ', rfqSchema);
