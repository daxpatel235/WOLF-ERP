// Dormancy-based data reset — the free-tier storage guard, per organization.
//
// Rule: user logins and their workspaces live forever. For each organization, if
// NO member has logged in for `days` days, that org's business data is wiped so
// the database stays lean. Active orgs are never touched. Driven weekly by an
// external cron that hits POST /api/admin/cleanup (works even while the backend
// is asleep, because the cron request wakes it).

const User = require('../models/User');
const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Approval = require('../models/Approval');
const ActivityLog = require('../models/ActivityLog');
const KnowledgeChunk = require('../models/KnowledgeChunk');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const Invitation = require('../models/Invitation');
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
  channels: Channel,
  messages: Message,
  invitations: Invitation,
};

// Most recent login across all users, or null if there are no users at all.
async function lastActivityAt() {
  const u = await User.findOne().sort({ lastLoginAt: -1 }).select('lastLoginAt').lean();
  return u ? u.lastLoginAt : null;
}

// Wipes the business data of every organization whose members have all been idle
// for `days` days. Returns a report; `wiped: false` means no org was dormant.
async function runDormancyCleanup({ days = 30 } = {}) {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

  // Compute the most-recent login per organization (an org is "active" if ANY of
  // its members has signed in within the window).
  const users = await User.find().select('organization lastLoginAt').lean();
  const latestByOrg = new Map(); // orgKey -> { id, t }
  for (const u of users) {
    if (!u.organization) continue;
    const key = String(u.organization);
    const t = u.lastLoginAt ? new Date(u.lastLoginAt).getTime() : 0;
    const cur = latestByOrg.get(key);
    if (!cur || t > cur.t) latestByOrg.set(key, { id: u.organization, t });
  }

  const dormant = [...latestByOrg.values()].filter((o) => o.t < cutoffMs);
  const last = await lastActivityAt();

  // Nothing dormant → keep everything.
  if (!dormant.length) {
    return { wiped: false, days, lastActivityAt: last, dormantOrgs: 0, deleted: {} };
  }

  const orgIds = dormant.map((o) => o.id);
  const deleted = {};
  for (const [name, Model] of Object.entries(PURGEABLE)) {
    const { deletedCount } = await Model.deleteMany({ organization: { $in: orgIds } });
    deleted[name] = deletedCount;
  }
  logger.info(
    `Dormancy cleanup: ${dormant.length} organization(s) idle >${days}d — wiped ${JSON.stringify(deleted)}`
  );
  return { wiped: true, days, lastActivityAt: last, dormantOrgs: dormant.length, deleted };
}

module.exports = { runDormancyCleanup, lastActivityAt, PURGEABLE };
