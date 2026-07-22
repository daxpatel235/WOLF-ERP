// Team management for an organization (team collaboration, Phase 3):
// the member directory, invitations, and member role/permission administration.
//
// Invitation tokens follow the same discipline as password reset: we email a raw
// token and store only its SHA-256 hash, and the hash never leaves the server.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Organization = require('../models/Organization');
const Invitation = require('../models/Invitation');
const env = require('../config/env');
const { asyncHandler } = require('../middleware/errorHandler');
const { isOwner } = require('../middleware/permission');
const { sendInvitationMail } = require('../services/emailService');
const notify = require('../services/notificationService');

const { DEFAULT_MEMBER_PERMISSIONS, allPermissions, sanitizePermissions } = Organization;

// Invitations are valid for a week.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Roles a workspace admin may hand out. `admin` is deliberately excluded — it is
// granted out-of-band (seed / npm run make-admin), never through an invite.
const ASSIGNABLE_ROLES = ['manager', 'approver', 'buyer', 'vendor'];

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

// Guard against CLIENT_URL being '*' (a CORS wildcard, not a link target).
function clientBaseUrl() {
  return !env.CLIENT_URL || env.CLIENT_URL === '*' ? 'http://localhost:3000' : env.CLIENT_URL;
}

// Member as shown in the directory. The owner is reported as holding every
// permission, which is what `can()` actually enforces.
function memberView(u, ownerId) {
  const owner = String(u._id) === String(ownerId);
  return {
    id: String(u._id),
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    isOwner: owner,
    permissions: owner ? allPermissions() : u.permissions || {},
    joinedAt: u.createdAt,
  };
}

// Invitation as exposed by the API. Built by hand (never toJSON) so `tokenHash`
// can't leak even if the field is loaded.
function inviteView(i) {
  return {
    id: String(i._id),
    email: i.email,
    role: i.role,
    status: i.status,
    expiresAt: i.expiresAt,
    invitedBy: i.invitedBy ? String(i.invitedBy) : null,
    createdAt: i.createdAt,
  };
}

// GET /api/team/members — the member directory (registered name + email).
// Visible to any member unless the owner has hidden it in org settings; members
// who can manage the team always see it.
const members = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.organization).lean();
  if (!org) return res.status(404).json({ message: 'Workspace not found.' });

  const owner = String(org.ownerId) === String(req.user._id);
  const canManage = owner || req.user.permissions?.canManageMembers === true;
  const directoryVisible = org.settings?.directoryVisibleToMembers !== false;

  if (!canManage && !directoryVisible) {
    return res.status(403).json({ message: 'The member directory is not visible in this workspace.' });
  }

  const users = await User.find({ organization: org._id })
    .select('name email role status permissions createdAt')
    .sort({ createdAt: 1 })
    .lean();

  res.json({
    data: users.map((u) => memberView(u, org.ownerId)),
    count: users.length,
    organization: { id: String(org._id), name: org.name },
    canManage,
  });
});

// POST /api/team/invite  { email, role?, permissions? }
const invite = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();

  const org = await Organization.findById(req.user.organization).lean();
  if (!org) return res.status(404).json({ message: 'Workspace not found.' });

  // v1 scope: invite people who don't have an account yet. Moving an existing
  // account between workspaces has messy edge cases (their old data) and is not
  // supported yet.
  if (await User.findOne({ email })) {
    return res.status(409).json({
      message: 'That email already has a Wolf ERP account. Inviting existing accounts is not supported yet.',
    });
  }
  if (await Invitation.findOne({ organization: org._id, email, status: 'pending' })) {
    return res.status(409).json({ message: 'An invitation is already pending for that email.' });
  }

  const role = ASSIGNABLE_ROLES.includes(req.body.role) ? req.body.role : 'buyer';
  const permissions = {
    ...(org.settings?.memberDefaultPermissions || DEFAULT_MEMBER_PERMISSIONS),
    ...sanitizePermissions(req.body.permissions || {}),
  };

  const rawToken = crypto.randomBytes(32).toString('hex');
  const invitation = await Invitation.create({
    organization: org._id,
    email,
    role,
    permissions,
    tokenHash: hashToken(rawToken),
    invitedBy: req.user._id,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  const link = `${clientBaseUrl()}/accept-invite?token=${rawToken}`;
  const emailResult = await sendInvitationMail(email, {
    orgName: org.name,
    inviterName: req.user.name,
    link,
    expiresAt: invitation.expiresAt,
  });

  await notify.record({
    userId: req.user._id,
    organization: org._id,
    actor: req.user.name,
    action: 'invited',
    entityType: 'User',
    entityId: email,
    message: `${req.user.name} invited ${email} to ${org.name}`,
  });

  res.status(201).json({ data: inviteView(invitation), email: emailResult });
});

// GET /api/team/invites — pending invitations for this workspace.
const listInvites = asyncHandler(async (req, res) => {
  const invites = await Invitation.find({ organization: req.user.organization, status: 'pending' })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ data: invites.map(inviteView), count: invites.length });
});

// DELETE /api/team/invites/:id — revoke a pending invitation.
const revokeInvite = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization, status: 'pending' },
    { status: 'revoked' },
    { new: true }
  );
  if (!invitation) return res.status(404).json({ message: 'Pending invitation not found.' });
  res.json({ data: inviteView(invitation) });
});

// Look an invitation up by its raw token. Only pending, unexpired ones count.
const findLiveInvitation = (token) =>
  Invitation.findOne({
    tokenHash: hashToken(String(token || '')),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });

// GET /api/team/invite/:token — public. Lets the accept page show who invited
// you and to which workspace, before you create an account.
const previewInvite = asyncHandler(async (req, res) => {
  const invitation = await findLiveInvitation(req.params.token).lean();
  if (!invitation) return res.status(400).json({ message: 'This invitation is invalid or has expired.' });

  const org = await Organization.findById(invitation.organization).select('name').lean();
  res.json({
    data: { email: invitation.email, role: invitation.role, organization: org ? org.name : 'a workspace' },
  });
});

// POST /api/team/accept  { token, name, password } — public.
// Creates the account inside the inviting workspace and signs them straight in.
const acceptInvite = asyncHandler(async (req, res) => {
  const { token, name, password } = req.body;

  const invitation = await findLiveInvitation(token);
  if (!invitation) return res.status(400).json({ message: 'This invitation is invalid or has expired.' });

  // Someone registered with this address after the invite was sent.
  if (await User.findOne({ email: invitation.email })) {
    return res.status(409).json({ message: 'An account with this email already exists. Please sign in instead.' });
  }

  // Joins the INVITING org — never creates a workspace of their own.
  const user = await User.create({
    name: String(name || '').trim(),
    email: invitation.email,
    password,
    role: invitation.role,
    organization: invitation.organization,
    permissions: invitation.permissions || {},
    loginCount: 1, // accepting signs them in; don't re-trigger the first-login notice
  });

  // updateOne (not save) — `tokenHash` is select:false, so the loaded doc can't
  // be re-validated/saved safely.
  await Invitation.updateOne({ _id: invitation._id }, { $set: { status: 'accepted' } });

  await notify.record({
    userId: user._id,
    organization: invitation.organization,
    actor: user.name,
    action: 'joined',
    entityType: 'User',
    message: `${user.name} joined the workspace`,
  });

  res.status(201).json({ token: signToken(user), user: user.toJSON() });
});

// PATCH /api/team/members/:id  { role?, permissions? }
const updateMember = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.organization).select('ownerId').lean();
  if (!org) return res.status(404).json({ message: 'Workspace not found.' });

  if (String(req.params.id) === String(org.ownerId)) {
    return res.status(400).json({ message: "The workspace owner's role and permissions cannot be changed." });
  }

  const member = await User.findOne({ _id: req.params.id, organization: req.user.organization });
  if (!member) return res.status(404).json({ message: 'Member not found.' });

  const update = {};
  if (req.body.role !== undefined) {
    if (!ASSIGNABLE_ROLES.includes(req.body.role)) {
      return res.status(422).json({ message: `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}.` });
    }
    update.role = req.body.role;
  }
  if (req.body.permissions !== undefined) {
    update.permissions = { ...(member.permissions || {}), ...sanitizePermissions(req.body.permissions) };
  }
  if (!Object.keys(update).length) {
    return res.status(422).json({ message: 'Provide a role or permissions to update.' });
  }

  await User.updateOne({ _id: member._id }, { $set: update });
  const fresh = await User.findById(member._id).lean();
  res.json({ data: memberView(fresh, org.ownerId) });
});

// DELETE /api/team/members/:id — remove a member from the workspace.
// Logins live forever, so we detach rather than delete: the member loses access
// to this org's data and gets a fresh personal workspace on their next request
// (see middleware/auth.js self-heal).
const removeMember = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.user.organization).select('ownerId').lean();
  if (!org) return res.status(404).json({ message: 'Workspace not found.' });

  if (String(req.params.id) === String(org.ownerId)) {
    return res.status(400).json({ message: 'The workspace owner cannot be removed.' });
  }

  const member = await User.findOne({ _id: req.params.id, organization: req.user.organization });
  if (!member) return res.status(404).json({ message: 'Member not found.' });

  await User.updateOne({ _id: member._id }, { $set: { organization: null, permissions: {} } });

  await notify.record({
    userId: req.user._id,
    organization: org._id,
    actor: req.user.name,
    action: 'removed member',
    entityType: 'User',
    entityId: member.email,
    message: `${req.user.name} removed ${member.name} from the workspace`,
  });

  res.json({ message: `${member.name} was removed from the workspace.` });
});

module.exports = {
  members,
  invite,
  listInvites,
  revokeInvite,
  previewInvite,
  acceptInvite,
  updateMember,
  removeMember,
};
