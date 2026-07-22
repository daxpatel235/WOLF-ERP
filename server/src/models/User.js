const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { baseOptions } = require('../utils/schema');

const ROLES = ['admin', 'manager', 'approver', 'buyer', 'vendor'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: true },
    role: { type: String, enum: ROLES, default: 'buyer' },
    company: { type: String, trim: true, default: '' },
    // The workspace this account belongs to (team collaboration, Phase 1). Every
    // new account gets its own org on register; existing accounts are backfilled
    // by scripts/migrateToOrganizations.js. Nullable until that migration runs.
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    // Capabilities within the organization. The owner implicitly has every
    // permission (see middleware/permission.js), so this map only governs
    // non-owner members. Set from the org's defaults when a member joins.
    permissions: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    // Drives the dormancy cleanup: if no user has logged in for N days, every
    // collection except User is wiped. Defaults to now so fresh accounts count
    // as active until their first idle period.
    lastLoginAt: { type: Date, default: Date.now },
    // Successful sign-ins. 0 = brand-new account; drives the first-login demo
    // welcome notice.
    loginCount: { type: Number, default: 0 },
    // Password reset: we store only a SHA-256 hash of the emailed token plus its
    // expiry, never the raw token. Both cleared once the password is reset.
    resetPasswordToken: { type: String, default: null, select: false },
    resetPasswordExpires: { type: Date, default: null, select: false },
  },
  baseOptions({ hidePassword: true })
);

// Hash password whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
