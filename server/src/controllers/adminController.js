const crypto = require('crypto');
const env = require('../config/env');
const { asyncHandler } = require('../middleware/errorHandler');
const { runDormancyCleanup, lastActivityAt } = require('../services/cleanupService');

// Constant-time compare so the shared secret can't be brute-forced by timing.
function tokenOk(provided) {
  if (!env.CLEANUP_TOKEN || !provided) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(env.CLEANUP_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// POST /api/admin/cleanup
// Triggered weekly by an external cron (cron-job.org / UptimeRobot). A cron
// can't log in, so auth is a shared secret in the `x-cleanup-token` header
// (or `?token=` query). If CLEANUP_TOKEN is unset the endpoint is disabled.
const cleanup = asyncHandler(async (req, res) => {
  if (!env.CLEANUP_TOKEN) {
    return res.status(503).json({ message: 'Cleanup is disabled (CLEANUP_TOKEN not set).' });
  }
  const provided = req.get('x-cleanup-token') || req.query.token;
  if (!tokenOk(provided)) {
    return res.status(401).json({ message: 'Invalid cleanup token.' });
  }

  const result = await runDormancyCleanup({ days: env.CLEANUP_INACTIVE_DAYS });
  res.json({
    message: result.wiped
      ? `App dormant since ${result.lastActivityAt.toISOString()} — all data wiped, logins kept.`
      : 'App still active — nothing deleted.',
    ...result,
  });
});

// GET /api/admin/cleanup/status — read-only; same token. Lets the cron (or you)
// see when the next idle wipe would trigger without deleting anything.
const status = asyncHandler(async (req, res) => {
  if (!env.CLEANUP_TOKEN) {
    return res.status(503).json({ message: 'Cleanup is disabled (CLEANUP_TOKEN not set).' });
  }
  const provided = req.get('x-cleanup-token') || req.query.token;
  if (!tokenOk(provided)) {
    return res.status(401).json({ message: 'Invalid cleanup token.' });
  }

  const last = await lastActivityAt();
  const cutoff = new Date(Date.now() - env.CLEANUP_INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  res.json({
    inactiveDays: env.CLEANUP_INACTIVE_DAYS,
    lastActivityAt: last,
    wouldWipeNow: Boolean(last && last <= cutoff),
  });
});

module.exports = { cleanup, status };
