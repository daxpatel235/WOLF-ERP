const rateLimit = require('express-rate-limit');

// Throttle auth-sensitive endpoints (login/register/forgot/reset) to blunt
// brute-force and credential-stuffing. Keyed by IP. Generous enough not to
// bother real users, strict enough to matter.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // max 20 attempts per IP per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

module.exports = { authLimiter };
