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
    // Owning workspace — the isolation boundary (team collaboration). Covered by
    // the { organization, status } compound index below; `createdBy` stays as the
    // authoring user.
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  },
  baseOptions()
);

// Dashboard/listing queries always scope by organization, often plus status,
// and the list is always returned newest-first. Carrying the sort field in the
// index lets Mongo walk it in order instead of collecting the whole match and
// sorting it in memory — the difference between a fast list and one that slows
// down as the workspace grows.
//
// The leading-field prefixes still serve `{ organization }` and
// `{ organization, status }` lookups on their own.
vendorSchema.index({ organization: 1, createdAt: -1 });
vendorSchema.index({ organization: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Vendor', vendorSchema);
