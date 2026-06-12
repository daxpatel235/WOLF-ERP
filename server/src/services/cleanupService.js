// Dormancy-based data reset — the free-tier storage guard.
//
// Rule: user login credentials live forever. If NOBODY has logged in for
// `days` days, every other collection is wiped so the database stays lean and
// the demo resets cleanly. Driven weekly by an external cron that hits
// POST /api/admin/cleanup (works even while the backend is asleep, because the
// cron request wakes it).

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Approval = require('../models/Approval');
const ActivityLog = require('../models/ActivityLog');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const logger = require('../utils/logger');

// Every collection EXCEPT User. Listed explicitly (never derived from the
// model registry) so a newly added model can't be wiped — or User dropped —
// by accident.
const PURGEABLE = {
  vendors: Vendor,
  rfqs: RFQ,
  quotations: Quotation,
  purchaseOrders: PurchaseOrder,
  invoices: Invoice,
  approvals: Approval,
  activityLogs: ActivityLog,
  knowledgeChunks: KnowledgeChunk,
};

// Most recent login across all users, or null if there are no users at all.
async function lastActivityAt() {
  const u = await User.findOne().sort({ lastLoginAt: -1 }).select('lastLoginAt').lean();
  return u ? u.lastLoginAt : null;
}

// Wipes all non-User data when the app has been dormant for `days` days.
// Returns a report; `wiped: false` means the app was still active and nothing
// was deleted.
async function runDormancyCleanup({ days = 30 } = {}) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const last = await lastActivityAt();

  // No users yet, or someone logged in within the window → keep everything.
  if (!last || last > cutoff) {
    return { wiped: false, days, lastActivityAt: last, cutoff, deleted: {} };
  }

  const deleted = {};
  for (const [name, Model] of Object.entries(PURGEABLE)) {
    const { deletedCount } = await Model.deleteMany({});
    deleted[name] = deletedCount;
  }
  logger.info(
    `Dormancy cleanup: app idle since ${last.toISOString()} (>${days}d) — wiped ${JSON.stringify(deleted)}`
  );
  return { wiped: true, days, lastActivityAt: last, cutoff, deleted };
}

module.exports = { runDormancyCleanup, lastActivityAt, PURGEABLE };
