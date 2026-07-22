/**
 * Backfill Organizations onto pre-team-collaboration data.
 *
 * Before team collaboration, every record was scoped only by its owning user
 * (`createdBy`, or `userId`/`owner` on a couple of models). This script gives
 * every existing user their own Organization (workspace) and stamps all of that
 * user's records with `organization`, which is now the isolation boundary — so
 * no record goes dark after the switch.
 *
 * Non-destructive & idempotent:
 *   - A user who already has an `organization` keeps it (no duplicate org).
 *   - Only records missing an `organization` are stamped; nothing is reassigned.
 *
 * Usage (from the server folder):
 *   npm run migrate-orgs -- --dry-run   # preview only
 *   npm run migrate-orgs                # apply
 *
 * Point MONGO_URI in server/.env at your real Atlas cluster before running.
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');

const User = require('../models/User');
const Organization = require('../models/Organization');
const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Approval = require('../models/Approval');
const ActivityLog = require('../models/ActivityLog');
const KnowledgeChunk = require('../models/KnowledgeChunk');

// Business records keyed by their owning-user field. Most use `createdBy`;
// ActivityLog uses `userId` and KnowledgeChunk uses `owner`.
const OWNED_MODELS = [
  ['Vendor', Vendor, 'createdBy'],
  ['RFQ', RFQ, 'createdBy'],
  ['Quotation', Quotation, 'createdBy'],
  ['PurchaseOrder', PurchaseOrder, 'createdBy'],
  ['Invoice', Invoice, 'createdBy'],
  ['Approval', Approval, 'createdBy'],
  ['ActivityLog', ActivityLog, 'userId'],
  ['KnowledgeChunk', KnowledgeChunk, 'owner'],
];

// Records with no organization yet (field missing or null).
const orgless = () => ({ $or: [{ organization: { $exists: false } }, { organization: null }] });

/**
 * Core migration. Operates on the CURRENT mongoose connection so it can be
 * driven from tests as well as the CLI. Returns a summary report.
 */
async function migrateToOrganizations({ dryRun = false, log = logger } = {}) {
  const users = await User.find().select('name company organization').lean();
  log.info(`${dryRun ? '[DRY RUN] ' : ''}Migrating ${users.length} user(s) to organizations.`);

  let orgsCreated = 0;
  let recordsStamped = 0;

  for (const u of users) {
    // Reuse an existing org if the user already has one; otherwise create it.
    let orgId = u.organization;
    if (!orgId) {
      const name = (u.company && u.company.trim()) || `${u.name}'s Workspace`;
      if (dryRun) {
        log.info(`  [would create org] "${name}" owned by ${u.name} (${u._id})`);
      } else {
        const org = await Organization.create({ name, ownerId: u._id });
        orgId = org._id;
        await User.updateOne({ _id: u._id }, { $set: { organization: orgId } });
      }
      orgsCreated += 1;
    }

    // In a dry run with no real orgId, we can still count what WOULD be stamped.
    for (const [name, Model, ownerField] of OWNED_MODELS) {
      const filter = { [ownerField]: u._id, ...orgless() };
      const count = await Model.countDocuments(filter);
      if (!count) continue;
      if (!dryRun && orgId) await Model.updateMany(filter, { $set: { organization: orgId } });
      log.info(`    ${u.name}: ${name} ${count} ${dryRun ? 'would be stamped' : 'stamped'}`);
      recordsStamped += count;
    }
  }

  log.info(
    `${dryRun ? '[DRY RUN] ' : ''}Done. ${orgsCreated} org(s) ${dryRun ? 'would be' : ''} created, ` +
      `${recordsStamped} record(s) ${dryRun ? 'would be' : 'were'} stamped.`
  );
  if (dryRun) log.info('Re-run without --dry-run to apply.');

  return { users: users.length, orgsCreated, recordsStamped, dryRun };
}

// CLI entry point: `npm run migrate-orgs [-- --dry-run]`
async function runCli() {
  const dryRun = process.argv.slice(2).includes('--dry-run');

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

  await migrateToOrganizations({ dryRun });

  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  runCli().catch((err) => {
    logger.error('migrate-orgs failed:', err);
    process.exit(1);
  });
}

module.exports = { migrateToOrganizations, OWNED_MODELS };
