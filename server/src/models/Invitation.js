const mongoose = require('mongoose');
const { baseOptions } = require('../utils/schema');
const { ROLES } = require('./User');

// A pending invitation for someone to join an organization (team collaboration,
// Phase 3). We store only a SHA-256 hash of the emailed token — never the raw
// token — mirroring the password-reset flow. `select: false` keeps the hash out
// of API responses even if a document is serialised.

const STATUSES = ['pending', 'accepted', 'revoked', 'expired'];

const invitationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ROLES, default: 'buyer' },
    // Capabilities the invitee gets on joining. Defaults come from the org's
    // settings.memberDefaultPermissions when the invite is created.
    permissions: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    tokenHash: { type: String, required: true, select: false },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: STATUSES, default: 'pending' },
    expiresAt: { type: Date, required: true },
  },
  baseOptions()
);

// Accepting looks the invite up by token hash; the org views list by org+status.
invitationSchema.index({ tokenHash: 1 });
invitationSchema.index({ organization: 1, status: 1 });
invitationSchema.index({ organization: 1, email: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
module.exports.STATUSES = STATUSES;
