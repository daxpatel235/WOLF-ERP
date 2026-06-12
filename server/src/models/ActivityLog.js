const mongoose = require('mongoose');
const { baseOptions } = require('../utils/schema');

// Lightweight audit trail powering the dashboard "recent activity" feed.
const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: String, default: 'System' }, // user name
    action: { type: String, required: true }, // 'created' | 'approved' | 'paid' | ...
    entityType: { type: String, default: '' }, // 'Vendor' | 'PurchaseOrder' | ...
    entityId: { type: String, default: '' }, // entity code
    message: { type: String, default: '' }, // human-readable summary
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  baseOptions()
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
