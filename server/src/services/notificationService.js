const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

// Records an audit/activity entry. Best-effort: a logging failure must never
// break the action that triggered it.
async function record({ actor = 'System', action, entityType = '', entityId = '', message = '', meta = {} }) {
  try {
    return await ActivityLog.create({ actor, action, entityType, entityId, message, meta });
  } catch (err) {
    logger.error(`Activity log failed: ${err.message}`);
    return null;
  }
}

// Most recent activity for the dashboard feed.
async function recent(limit = 12) {
  return ActivityLog.find().sort({ createdAt: -1 }).limit(limit);
}

module.exports = { record, recent };
