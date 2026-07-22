const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

// Records an audit/activity entry. Best-effort: a logging failure must never
// break the action that triggered it. `organization` scopes the event to a
// workspace so the whole team shares one activity feed; `userId` records who
// acted (kept for provenance).
async function record({ userId = null, organization = null, actor = 'System', action, entityType = '', entityId = '', message = '', meta = {} }) {
  try {
    return await ActivityLog.create({ userId, organization, actor, action, entityType, entityId, message, meta });
  } catch (err) {
    logger.error(`Activity log failed: ${err.message}`);
    return null;
  }
}

// Most recent activity for the dashboard feed. Scoped to a workspace when
// `organization` is given, so a team shares one feed but never sees another
// org's events.
async function recent(limit = 12, organization = null) {
  const filter = organization ? { organization } : {};
  return ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit);
}

module.exports = { record, recent };
