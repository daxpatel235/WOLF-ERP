// Team chat for a workspace (team collaboration, Phase 5).
//
// Transport is polling, so the read path is built to be cheap:
//   • `after` is an ObjectId cursor — an indexed range scan, never a skip/offset.
//   • `senderName` is denormalized on the message, so a poll never populates.
//   • Every query is .lean() and capped by `limit`.
// An idle poll therefore costs one index seek that returns zero documents.

const mongoose = require('mongoose');
const Channel = require('../models/Channel');
const Message = require('../models/Message');
const { asyncHandler } = require('../middleware/errorHandler');
const { orgId } = require('../utils/scope');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_BODY = 2000;

const channelView = (c) => ({
  id: String(c._id),
  name: c.name,
  description: c.description || '',
  isDefault: Boolean(c.isDefault),
  lastMessageAt: c.lastMessageAt || null,
});

const messageView = (m) => ({
  id: String(m._id),
  body: m.body,
  senderId: m.sender ? String(m.sender) : null,
  senderName: m.senderName || '',
  createdAt: m.createdAt,
});

// Resolve a channel that belongs to the caller's workspace. Returns null when it
// doesn't exist or lives in another org — both surface as a 404, so a channel id
// from another workspace is indistinguishable from a missing one.
const findChannel = (req) =>
  Channel.findOne({ _id: req.params.id, organization: orgId(req) }).select('_id').lean();

// Every workspace gets a "general" channel the first time chat is opened. The
// unique { organization, name } index makes the concurrent case safe: the loser
// of the race gets E11000, which we swallow.
async function ensureDefaultChannel(organization, userId) {
  if (await Channel.exists({ organization })) return;
  try {
    await Channel.create({
      organization,
      name: 'general',
      description: 'Company-wide discussion',
      isDefault: true,
      createdBy: userId,
    });
  } catch (err) {
    if (err.code !== 11000) throw err; // someone else created it first — fine
  }
}

// GET /api/chat/channels
const listChannels = asyncHandler(async (req, res) => {
  const organization = orgId(req);
  await ensureDefaultChannel(organization, req.user._id);

  const channels = await Channel.find({ organization })
    .sort({ isDefault: -1, lastMessageAt: -1, name: 1 })
    .lean();

  res.json({ data: channels.map(channelView), count: channels.length });
});

// POST /api/chat/channels  { name, description? }
const createChannel = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(422).json({ message: 'Channel name is required.' });

  try {
    const channel = await Channel.create({
      organization: orgId(req),
      name,
      description: String(req.body.description || '').trim(),
      createdBy: req.user._id,
    });
    res.status(201).json({ data: channelView(channel) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A channel with that name already exists.' });
    }
    throw err;
  }
});

// GET /api/chat/channels/:id/messages?after=<cursor>&limit=50
//
// With `after`  → the messages created since that cursor, oldest→newest (a poll).
// Without       → the most recent `limit` messages, oldest→newest (initial load).
// `cursor` in the response is what the client should send back as `after`.
const listMessages = asyncHandler(async (req, res) => {
  const channel = await findChannel(req);
  if (!channel) return res.status(404).json({ message: 'Channel not found.' });

  const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const after = req.query.after;
  const filter = { organization: orgId(req), channel: channel._id };

  let rows;
  if (after && mongoose.isValidObjectId(after)) {
    filter._id = { $gt: new mongoose.Types.ObjectId(after) };
    rows = await Message.find(filter).sort({ _id: 1 }).limit(limit).lean();
  } else {
    // Newest `limit`, then flip to chronological order for rendering.
    rows = (await Message.find(filter).sort({ _id: -1 }).limit(limit).lean()).reverse();
  }

  // Hold the cursor steady when a poll returns nothing.
  const cursor = rows.length ? String(rows[rows.length - 1]._id) : after || null;
  res.json({ data: rows.map(messageView), cursor });
});

// POST /api/chat/channels/:id/messages  { body }
const postMessage = asyncHandler(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) return res.status(422).json({ message: 'Message cannot be empty.' });
  if (body.length > MAX_BODY) {
    return res.status(422).json({ message: `Message must be ${MAX_BODY} characters or fewer.` });
  }

  const channel = await findChannel(req);
  if (!channel) return res.status(404).json({ message: 'Channel not found.' });

  const message = await Message.create({
    organization: orgId(req),
    channel: channel._id,
    sender: req.user._id,
    senderName: req.user.name,
    body,
  });

  // Keeps the channel list ordered by activity without scanning messages.
  await Channel.updateOne({ _id: channel._id }, { $set: { lastMessageAt: message.createdAt } });

  res.status(201).json({ data: messageView(message) });
});

module.exports = { listChannels, createChannel, listMessages, postMessage };
