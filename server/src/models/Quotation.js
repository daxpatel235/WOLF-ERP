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
  },
  baseOptions()
);

module.exports = mongoose.model('Quotation', quotationSchema);
