// Organization (workspace) profile + settings — the "organization mode" surface.
// Reading is open to any member; changing anything requires canManageOrgSettings
// (which the owner always holds).

const Organization = require('../models/Organization');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { isOwner, effectivePermissions } = require('../middleware/permission');
const notify = require('../services/notificationService');

const { DEFAULT_MEMBER_PERMISSIONS, PERMISSION_KEYS, sanitizePermissions } = Organization;

// GET /api/organization — everything the org pages need in one round trip.
const get = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.organization).lean();
  if (!org) return res.status(404).json({ message: 'Workspace not found.' });

  const [memberCount, owner, permissions] = await Promise.all([
    User.countDocuments({ organization: org._id }),
    User.findById(org.ownerId).select('name email').lean(),
    effectivePermissions(req.user),
  ]);

  res.json({
    data: {
      id: String(org._id),
      name: org.name,
      createdAt: org.createdAt,
      isOwner: String(org.ownerId) === String(req.user._id),
      owner: owner ? { name: owner.name, email: owner.email } : null,
      memberCount,
      settings: {
        directoryVisibleToMembers: org.settings?.directoryVisibleToMembers !== false,
        memberDefaultPermissions: {
          ...DEFAULT_MEMBER_PERMISSIONS,
          ...(org.settings?.memberDefaultPermissions || {}),
        },
      },
    },
    // The capability vocabulary + the caller's own rights, so the client gates
    // its UI on exactly what the server enforces.
    permissionKeys: PERMISSION_KEYS,
    permissions,
  });
});

// PATCH /api/organization  { name?, settings? }
const update = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.organization);
  if (!org) return res.status(404).json({ message: 'Workspace not found.' });

  const update$ = {};

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(422).json({ message: 'Workspace name cannot be empty.' });
    update$.name = name;
  }

  const settings = req.body.settings || {};
  if (settings.directoryVisibleToMembers !== undefined) {
    update$['settings.directoryVisibleToMembers'] = settings.directoryVisibleToMembers === true;
  }
  if (settings.memberDefaultPermissions !== undefined) {
    // Always store a COMPLETE, known-key map so a later invite can't inherit
    // a half-defined permission set.
    update$['settings.memberDefaultPermissions'] = {
      ...DEFAULT_MEMBER_PERMISSIONS,
      ...sanitizePermissions(settings.memberDefaultPermissions),
    };
  }

  if (!Object.keys(update$).length) {
    return res.status(422).json({ message: 'Provide a name or settings to update.' });
  }

  await Organization.updateOne({ _id: org._id }, { $set: update$ });

  await notify.record({
    userId: req.user._id,
    organization: org._id,
    actor: req.user.name,
    action: 'updated settings',
    entityType: 'Organization',
    entityId: String(org._id),
    message: `${req.user.name} updated the workspace settings`,
  });

  const fresh = await Organization.findById(org._id).lean();
  res.json({
    data: {
      id: String(fresh._id),
      name: fresh.name,
      isOwner: await isOwner(req.user),
      settings: {
        directoryVisibleToMembers: fresh.settings?.directoryVisibleToMembers !== false,
        memberDefaultPermissions: {
          ...DEFAULT_MEMBER_PERMISSIONS,
          ...(fresh.settings?.memberDefaultPermissions || {}),
        },
      },
    },
  });
});

module.exports = { get, update };
