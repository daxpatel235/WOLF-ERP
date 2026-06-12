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
  },
  baseOptions()
);

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
