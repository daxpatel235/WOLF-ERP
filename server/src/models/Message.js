const mongoose = require('mongoose');
const { baseOptions } = require('../utils/schema');

// A chat message (team collaboration, Phase 5).
//
// `senderName` is denormalized on purpose: the chat page polls this collection
// every few seconds, and copying the display name at write time means a poll is
// a single indexed range scan with no populate/join on the read path.
const messageSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderName: { type: String, default: '' },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  baseOptions()
);

// The polling query is exactly this prefix: organization + channel, then an
// ascending range on _id ("everything after the cursor"). ObjectIds are
// monotonic, so _id doubles as a cheap, index-backed cursor — no skip/offset,
// and cost is O(log n) in the channel's history regardless of how long it gets.
messageSchema.index({ organization: 1, channel: 1, _id: 1 });

module.exports = mongoose.model('Message', messageSchema);
