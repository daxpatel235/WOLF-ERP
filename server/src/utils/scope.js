// Org-scoping helpers (team collaboration, Phase 2).
//
// The isolation boundary is the ORGANIZATION the signed-in user belongs to — not
// the individual user. `protect` guarantees req.user.organization is always set
// (it self-heals a missing org), so these helpers never produce an
// { organization: null } filter that could match another workspace's
// un-migrated records.

// The caller's organization id.
const orgId = (req) => req.user && req.user.organization;

// Query filter scoped to the caller's organization, plus any extra fields.
//   Vendor.find(orgFilter(req, { status: 'Active' }))
const orgFilter = (req, extra = {}) => ({ organization: orgId(req), ...extra });

// Fields to stamp on a newly created record: the owning org (the isolation
// boundary) plus the authoring user (kept for display/audit, never for scoping).
const orgStamp = (req) => ({ organization: orgId(req), createdBy: req.user && req.user._id });

module.exports = { orgId, orgFilter, orgStamp };
