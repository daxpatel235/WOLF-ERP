const mongoose = require('mongoose');
const { baseOptions, lineItemFields } = require('../utils/schema');

const purchaseOrderSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true }, // PO-2025-021
    vendor: { type: String, required: true },
    vendorId: { type: String, index: true },
    rfqId: { type: String, default: '' }, // source RFQ code (optional)
    quotationId: { type: String, default: '' }, // source quotation code (optional)
    amount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Approved', 'Sent', 'Received', 'Cancelled', 'Rejected'],
      default: 'Draft',
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    created: { type: Date, default: Date.now },
    delivery: { type: Date },
    items: { type: [lineItemFields], default: [] },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedBy: { type: String, default: '' }, // display name for approvals
    approvedBy: { type: String, default: '' },
    // Owning workspace — the isolation boundary (team collaboration). Covered by
    // the { organization, status } compound index below; `createdBy` stays as the
    // authoring user.
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  },
  baseOptions()
);

// Dashboard spend rollups scope by organization and filter on status; the list
// view sorts newest-first, so the sort field is carried in the index and the
// rows come back already ordered. The prefixes still serve `{ organization }`
// and `{ organization, status }` on their own.
purchaseOrderSchema.index({ organization: 1, created: -1 });
purchaseOrderSchema.index({ organization: 1, status: 1, created: -1 });
// Vendor detail pages, and the spend-per-vendor rollup, look POs up by the
// vendor's code within one workspace.
purchaseOrderSchema.index({ organization: 1, vendorId: 1 });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
