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
    // Owning workspace (team collaboration, Phase 1). Becomes the isolation
    // boundary in Phase 2; `createdBy` stays as the authoring user.
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
  },
  baseOptions()
);

// Dashboard/listing queries always scope by owner, often plus status. The
// compound also serves owner-only lookups via its leading-field prefix.
vendorSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model('Vendor', vendorSchema);
