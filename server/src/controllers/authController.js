const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { ensureOrganizationForUser } = require('../services/organizationService');
const { effectivePermissions } = require('../middleware/permission');
const env = require('../config/env');
const { asyncHandler } = require('../middleware/errorHandler');
const { sendMail } = require('../services/emailService');
const notify = require('../services/notificationService');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Everything the client needs to render a workspace-aware, permission-gated UI.
// Returned alongside the user on register / login / me so the app never has to
// guess what the signed-in member is allowed to do.
async function sessionContext(user) {
  if (!user.organization) return { organization: null, permissions: {} };
  const [org, permissions] = await Promise.all([
    Organization.findById(user.organization).select('name ownerId').lean(),
    effectivePermissions(user),
  ]);
  return {
    organization: org
      ? { id: String(org._id), name: org.name, isOwner: String(org.ownerId) === String(user._id) }
      : null,
    permissions,
  };
}

// Shown on a brand-new account's first sign-in.
function welcomeNotice() {
  return {
    kind: 'welcome',
    title: 'Welcome to Wolf ERP',
    message:
      `This is a demo project. Explore freely and add data — ` +
      `but heads-up: if you don't sign in for ${env.CLEANUP_INACTIVE_DAYS} days, all of your ` +
      `data is automatically wiped to keep the demo lean. Your login always stays.`,
  };
}

// Shown when a returning user signs in after being idle past the wipe window.
function dataWipedNotice(awayDays) {
  return {
    kind: 'data-wiped',
    awayDays,
    title: 'Your demo data was reset',
    message:
      `You were away for ${awayDays} days, so your workspace data was wiped. ` +
      `This is a demo project: data left idle for ${env.CLEANUP_INACTIVE_DAYS}+ days ` +
      `is cleared automatically. Your login is intact — start fresh anytime.`,
  };
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, company } = req.body;

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  // Only allow self-registration for non-privileged roles.
  const safeRole = ['buyer', 'manager', 'approver', 'vendor'].includes(role) ? role : 'buyer';

  // loginCount starts at 1: registering auto-signs them in, so a later manual
  // login shouldn't re-trigger the first-login welcome.
  const user = await User.create({ name, email, password, role: safeRole, company, loginCount: 1 });

  // Team collaboration: every new account owns a fresh workspace (organization),
  // which is the isolation boundary for all their data.
  const orgId = await ensureOrganizationForUser(user);

  await notify.record({ userId: user._id, organization: orgId, actor: user.name, action: 'registered', entityType: 'User', message: `${user.name} created an account` });

  const token = signToken(user);
  res.status(201).json({ token, user: user.toJSON(), notice: welcomeNotice(), ...(await sessionContext(user)) });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
  if (user.status !== 'Active') {
    return res.status(403).json({ message: 'Your account is not active. Contact an administrator.' });
  }

  // Work out the demo notice BEFORE we stamp this login.
  const firstLogin = (user.loginCount || 0) === 0;
  const prevLogin = user.lastLoginAt ? new Date(user.lastLoginAt).getTime() : null;
  const awayDays = prevLogin ? Math.floor((Date.now() - prevLogin) / MS_PER_DAY) : 0;
  // Past the idle window → the weekly cleanup has (or is about to have) wiped
  // everything but the login.
  const dataWiped = !firstLogin && awayDays >= env.CLEANUP_INACTIVE_DAYS;

  // Stamp activity so the dormancy cleanup keeps this user's data alive.
  // updateOne (not save) avoids re-running validation / the password hash hook.
  await User.updateOne(
    { _id: user._id },
    { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } }
  );

  let notice = null;
  if (firstLogin) notice = welcomeNotice();
  else if (dataWiped) notice = dataWipedNotice(awayDays);

  const token = signToken(user);
  res.json({ token, user: user.toJSON(), notice, ...(await sessionContext(user)) });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON(), ...(await sessionContext(req.user)) });
});

const RESET_TTL_MS = 60 * 60 * 1000; // reset links are valid for 1 hour
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// Base URL the reset link points at (the frontend). Guard against CLIENT_URL
// being '*' (a CORS wildcard, not a usable link target).
function clientBaseUrl() {
  return !env.CLIENT_URL || env.CLIENT_URL === '*' ? 'http://localhost:3000' : env.CLIENT_URL;
}

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });

  // Always respond the same way so we don't leak which emails exist.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const link = `${clientBaseUrl()}/reset-password?token=${rawToken}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your Wolf ERP password',
      html: `<p>Hi ${user.name || 'there'},</p>
             <p>We received a request to reset your Wolf ERP password. Click the link below to choose a new one — it expires in 1 hour:</p>
             <p><a href="${link}">Reset my password</a></p>
             <p>Or paste this URL into your browser:<br><code>${link}</code></p>
             <p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  }

  res.json({ message: 'If that email is registered, a reset link is on its way.' });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  // Look the user up by the hashed token and ensure it hasn't expired.
  const user = await User.findOne({
    resetPasswordToken: hashToken(String(token || '')),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) {
    return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' });
  }

  // Set the new password (the pre-save hook hashes it) and burn the token.
  user.password = password;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  // Log them straight in so they don't have to re-enter the new password.
  const authToken = signToken(user);
  res.json({ message: 'Your password has been reset.', token: authToken, user: user.toJSON() });
});

module.exports = { register, login, me, forgotPassword, resetPassword };
