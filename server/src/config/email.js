const env = require('./env');
const logger = require('../utils/logger');

// Lazily build a nodemailer transport. When SMTP isn't configured we return
// null and callers fall back to console logging — so the app runs out of the
// box without any mail credentials.
let cached;

function getTransport() {
  if (cached !== undefined) return cached;

  if (!env.emailEnabled) {
    logger.warn('SMTP not configured — emails will be logged to the console.');
    cached = null;
    return cached;
  }

  // Require lazily so a missing nodemailer install can't crash boot.
  const nodemailer = require('nodemailer');
  cached = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return cached;
}

module.exports = { getTransport };
