const mongoose = require('mongoose');
const { baseOptions } = require('../utils/schema');

const vendorSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true }, // V-1001
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: 'General' },
    contact: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    gstin: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Active', 'Pending', 'Inactive'], default: 'Pending' },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  baseOptions()
);

module.exports = mongoose.model('Vendor', vendorSchema);
