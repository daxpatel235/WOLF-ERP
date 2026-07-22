const mongoose = require('mongoose');
const { baseOptions } = require('../utils/schema');

// A workspace that one or more users share. Introduced by the team-collaboration
// work (see docs/TEAM_COLLABORATION_PLAN.md). Phase 1 only creates orgs and
// stamps records with an `organization`; the isolation boundary flips from
// `createdBy` to `organization` in Phase 2.

// Baseline capabilities a newly-invited (non-owner) member gets. The owner can
// override these per member later (Phase 4). Kept here so the model is the single
// source of truth for the default permission shape.
const DEFAULT_MEMBER_PERMISSIONS = {
  canInviteMembers: false,
  canManageMembers: false,
  canManageVendors: true,
  canCreateRFQ: true,
  canApprove: false,
  canCreatePO: true,
  canSendInvoices: false,
  canViewReports: true,
  canManageOrgSettings: false,
  canChat: true,
};

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // The account that owns the workspace — top authority, cannot be removed.
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    settings: {
      // When true, ordinary members can see the member directory (names + emails).
      directoryVisibleToMembers: { type: Boolean, default: true },
      // Default capabilities applied to new members (owner can override per member).
      memberDefaultPermissions: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({ ...DEFAULT_MEMBER_PERMISSIONS }),
      },
    },
  },
  baseOptions()
);

// Every capability name the app knows about.
const PERMISSION_KEYS = Object.keys(DEFAULT_MEMBER_PERMISSIONS);

// A permission map with everything granted — what the owner effectively holds.
const allPermissions = () => Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]));

// Keep only known capability names, coercing values to booleans, so a client can
// never inject arbitrary keys into a member's permission map.
function sanitizePermissions(input = {}) {
  const out = {};
  for (const key of PERMISSION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key] === true;
  }
  return out;
}

module.exports = mongoose.model('Organization', organizationSchema);
module.exports.DEFAULT_MEMBER_PERMISSIONS = DEFAULT_MEMBER_PERMISSIONS;
module.exports.PERMISSION_KEYS = PERMISSION_KEYS;
module.exports.allPermissions = allPermissions;
module.exports.sanitizePermissions = sanitizePermissions;
