const mongoose = require('mongoose');
const { baseOptions } = require('../utils/schema');

// A chat channel inside one workspace (team collaboration, Phase 5).
// `lastMessageAt` is denormalized so the channel list can be ordered by recent
// activity without touching the messages collection.
const channelSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', trim: true, maxlength: 200 },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessageAt: { type: Date, default: null },
  },
  baseOptions()
);

// One channel name per workspace; also the guard against a duplicate "general"
// when two members hit the chat page at the same time.
channelSchema.index({ organization: 1, name: 1 }, { unique: true });
// Channel list: this org's channels, most recently active first.
channelSchema.index({ organization: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Channel', channelSchema);
