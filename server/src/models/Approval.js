const mongoose = require('mongoose');
const { baseOptions } = require('../utils/schema');

// One approval task per thing that needs sign-off (a PO, an invoice, an RFQ).
// `refId` is the human code of the underlying entity so decisions can flow
// back to it (see services/approvalEngine).
const approvalSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Purchase Order', 'Invoice', 'RFQ Approval'],
      required: true,
    },
    refModel: {
      type: String,
      enum: ['PurchaseOrder', 'Invoice', 'RFQ'],
      required: true,
    },
    refId: { type: String, required: true, index: true }, // entity code, e.g. PO-2025-021
    vendor: { type: String, default: '—' },
    amount: { type: Number, default: 0 },
    requestedBy: { type: String, default: '' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    decision: { type: String, default: null }, // 'Approved' | 'Rejected' | null
    decidedBy: { type: String, default: '' },
    decidedAt: { type: Date },
    comment: { type: String, default: '' },
  },
  baseOptions()
);

module.exports = mongoose.model('Approval', approvalSchema);
