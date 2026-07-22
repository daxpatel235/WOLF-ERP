const mongoose = require('mongoose');
const { baseOptions } = require('../utils/schema');

// Lightweight audit trail powering the dashboard "recent activity" feed.
const activityLogSchema = new mongoose.Schema(
  {
    // Account this event belongs to. The dashboard feed is scoped to the
    // signed-in user, so each account only sees its own activity (events
    // without a userId — e.g. seed/system entries — never surface in a feed).
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    // Owning workspace — the feed's scope boundary (team collaboration). Covered
    // by the { organization, createdAt } index below; `userId` stays as the actor.
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
    actor: { type: String, default: 'System' }, // user name
    action: { type: String, required: true }, // 'created' | 'approved' | 'paid' | ...
    entityType: { type: String, default: '' }, // 'Vendor' | 'PurchaseOrder' | ...
    entityId: { type: String, default: '' }, // entity code
    message: { type: String, default: '' }, // human-readable summary
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  baseOptions()
);

// The dashboard feed pulls one organization's events, newest first.
activityLogSchema.index({ organization: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
