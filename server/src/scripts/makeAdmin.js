/**
 * Promote an existing user to the admin role.
 * Usage (from the server folder):  npm run make-admin -- user@example.com
 *
 * Self-registration can't create admins (roles are coerced), so this is the
 * supported way to grant admin to an account that already signed up.
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('../utils/logger');
const User = require('../models/User');

async function run() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    logger.error('Usage: npm run make-admin -- <email>');
    process.exit(1);
  }

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    logger.error(`No user found with email: ${email}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  user.role = 'admin';
  await user.save();
  logger.info(`✓ ${email} is now an admin.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error('make-admin failed:', err);
  process.exit(1);
});
