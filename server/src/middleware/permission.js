// Capability-based access control within an organization (team collaboration).
// Use after `protect`, which guarantees req.user.organization is set.
//
// The workspace OWNER implicitly holds every permission and can never be locked
// out. Other members are governed by their `permissions` map, which the owner
// (or a delegate with canManageMembers) sets.

const Organization = require('../models/Organization');
const { asyncHandler } = require('./errorHandler');

const { allPermissions } = Organization;

// True when the signed-in user owns their organization.
async function isOwner(user) {
  if (!user || !user.organization) return false;
  const org = await Organization.findById(user.organization).select('ownerId').lean();
  return Boolean(org && String(org.ownerId) === String(user._id));
}

// The capabilities a user actually holds — every permission for the owner, the
// stored map for everyone else. This is what `can()` enforces, so the UI can
// gate on exactly the same answer.
async function effectivePermissions(user) {
  if (!user || !user.organization) return {};
  return (await isOwner(user)) ? allPermissions() : { ...(user.permissions || {}) };
}

// Guard a route by capability, e.g. can('canInviteMembers').
function can(permission) {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authorized.' });
    if (await isOwner(req.user)) return next(); // owner: all rights, always
    if (req.user.permissions && req.user.permissions[permission] === true) return next();
    return res.status(403).json({ message: 'You do not have permission to perform this action.' });
  });
}

// Guard a route so only the workspace owner may call it.
const ownerOnly = asyncHandler(async (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized.' });
  if (await isOwner(req.user)) return next();
  return res.status(403).json({ message: 'Only the workspace owner can perform this action.' });
});

module.exports = { can, ownerOnly, isOwner, effectivePermissions };
