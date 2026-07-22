const Organization = require('../models/Organization');
const User = require('../models/User');

// Guarantee a user belongs to an organization (their workspace).
//
// New accounts get one at register time, but accounts created before the
// team-collaboration migration — or any edge case — could still have a null
// `organization`. Phase 2 makes the org the isolation boundary, so a null org
// must never reach a query (it would match every un-migrated record). This heals
// that lazily on first authenticated request and never returns null.
async function ensureOrganizationForUser(user) {
  if (user.organization) return user.organization;
  const org = await Organization.create({
    name: (user.company && user.company.trim()) || `${user.name}'s Workspace`,
    ownerId: user._id,
  });
  await User.updateOne({ _id: user._id }, { $set: { organization: org._id } });
  user.organization = org._id; // reflect on the in-memory doc for this request
  return org._id;
}

module.exports = { ensureOrganizationForUser };
