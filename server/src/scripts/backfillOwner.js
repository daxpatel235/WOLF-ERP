/**
 * Backfill ownership on pre-isolation records.
 *
 * After per-account isolation, every business record is scoped by `createdBy`
 * (and ActivityLog by `userId`). Records created BEFORE that change have no
 * owner, so they're invisible to every account. This script assigns all such
 * ownerless records to one chosen account so the existing data shows up again.
 *
 * Non-destructive: it only sets the owner on records that don't have one.
 * Nothing is deleted or reassigned away from an existing owner.
 *
 * Usage (from the server folder):
 *   npm run backfill-owner -- you@example.com            # apply
 *   npm run backfill-owner -- you@example.com --dry-run  # preview only
 *
 * Run it against your real database by making sure MONGO_URI in server/.env
 * points at Atlas (NOT the in-memory fallback).
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Approval = require('../models/Approval');
const ActivityLog = require('../models/ActivityLog');

// Models keyed by their owner field. ActivityLog uses `userId`; the rest use `createdBy`.
const CREATED_BY_MODELS = [
  ['Vendor', Vendor],
  ['RFQ', RFQ],
  ['Quotation', Quotation],
  ['PurchaseOrder', PurchaseOrder],
  ['Invoice', Invoice],
  ['Approval', Approval],
];

// Records with no owner yet (field missing or null).
const ownerless = (field) => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }] });

async function run() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const email = (args.find((a) => !a.startsWith('--')) || '').trim().toLowerCase();

  if (!email) {
    logger.error('Usage: npm run backfill-owner -- <email> [--dry-run]');
    process.exit(1);
  }

  // Connect DIRECTLY to the configured DB — never fall back to in-memory, or
  // we'd "succeed" against a throwaway database and change nothing real.
  try {
    await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    logger.info(`Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (e) {
    logger.error(`Could not connect to MONGO_URI (${e.message}).`);
    logger.error('Set MONGO_URI in server/.env to your Atlas string and try again.');
    process.exit(1);
  }

  const owner = await User.findOne({ email });
  if (!owner) {
    logger.error(`No user found with email: ${email}. Register/seed that account first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  logger.info(`${dryRun ? '[DRY RUN] ' : ''}Assigning ownerless records to ${owner.name} <${email}> (${owner._id})`);

  let total = 0;
  for (const [name, Model] of CREATED_BY_MODELS) {
    const filter = ownerless('createdBy');
    const count = await Model.countDocuments(filter);
    if (!dryRun && count) await Model.updateMany(filter, { $set: { createdBy: owner._id } });
    logger.info(`  ${name}: ${count} ownerless ${dryRun ? 'would be assigned' : 'assigned'}`);
    total += count;
  }

  // ActivityLog uses userId instead of createdBy.
  const actFilter = ownerless('userId');
  const actCount = await ActivityLog.countDocuments(actFilter);
  if (!dryRun && actCount) await ActivityLog.updateMany(actFilter, { $set: { userId: owner._id } });
  logger.info(`  ActivityLog: ${actCount} ownerless ${dryRun ? 'would be assigned' : 'assigned'}`);
  total += actCount;

  logger.info(`${dryRun ? '[DRY RUN] ' : ''}Done. ${total} record(s) ${dryRun ? 'would be' : 'were'} assigned to ${email}.`);
  if (dryRun) logger.info('Re-run without --dry-run to apply.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error('backfill-owner failed:', err);
  process.exit(1);
});
