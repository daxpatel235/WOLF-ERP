const mongoose = require('mongoose');
const { baseOptions, lineItemFields } = require('../utils/schema');

const invoiceSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true }, // INV-2025-088
    vendor: { type: String, required: true },
    vendorId: { type: String, index: true },
    poId: { type: String, default: '', index: true }, // linked purchase order code
    amount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Draft',
    },
    issued: { type: Date, default: Date.now },
    due: { type: Date },
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

// Dashboard outstanding/overdue rollups scope by organization and filter on
// status. The compound also serves org-only lookups via its leading-field prefix.
invoiceSchema.index({ organization: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
