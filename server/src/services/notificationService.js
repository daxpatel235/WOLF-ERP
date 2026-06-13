const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

// Records an audit/activity entry. Best-effort: a logging failure must never
// break the action that triggered it.
async function record({ userId = null, actor = 'System', action, entityType = '', entityId = '', message = '', meta = {} }) {
  try {
    return await ActivityLog.create({ userId, actor, action, entityType, entityId, message, meta });
  } catch (err) {
    logger.error(`Activity log failed: ${err.message}`);
    return null;
  }
}

// Most recent activity for the dashboard feed. Scoped to a single account when
// `userId` is given, so users never see each other's events.
async function recent(limit = 12, userId = null) {
  const filter = userId ? { userId } : {};
  return ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit);
}

module.exports = { record, recent };
