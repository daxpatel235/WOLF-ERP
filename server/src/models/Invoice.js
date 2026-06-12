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
  },
  baseOptions()
);

module.exports = mongoose.model('Invoice', invoiceSchema);
