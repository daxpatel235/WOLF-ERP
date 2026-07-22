const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

// On-disk location for the local fallback database (used only when no real
// MONGO_URI is reachable). Keeping a fixed dbPath turns the dev fallback from a
// throwaway in-memory store into a PERSISTENT one: data survives restarts.
// In the packaged desktop app the install dir is read-only, so WOLF_DATA_DIR
// points this at a per-user writable folder (e.g. %APPDATA%/WolfERP).
// Gitignored — never committed.
const LOCAL_DB_PATH = process.env.WOLF_DATA_DIR
  ? path.join(process.env.WOLF_DATA_DIR, 'localdb')
  : path.join(__dirname, '..', '..', '.localdb');

// Held so graceful shutdown can stop the embedded mongod cleanly (avoids an
// unclean-shutdown lock on the persistent data directory).
let memoryServer = null;

// Connection options tuned for a free-tier Atlas cluster, which drops idle
// connections aggressively. The goal is to FAIL FAST and recover, rather than
// let a request hang while mongoose silently buffers commands against a dead
// socket (the classic "backend is stuck" symptom).
const CONNECT_OPTIONS = {
  serverSelectionTimeoutMS: 6000, // give up finding a server after 6s, don't hang
  socketTimeoutMS: 45000, // kill a socket that's been silent for 45s
  connectTimeoutMS: 10000, // cap the initial TCP/TLS handshake
  maxPoolSize: 10, // plenty for this workload; avoids exhausting free-tier limits
  bufferTimeoutMS: 8000, // queue a query for at most 8s while reconnecting, then error
  heartbeatFrequencyMS: 10000, // notice a dead primary within ~10s
};

// Log connection lifecycle so a silent drop/reconnect is visible in the logs
// instead of surfacing only as mysterious slow requests. Registered once.
let listenersAttached = false;
function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  const conn = mongoose.connection;
  conn.on('disconnected', () => logger.warn('MongoDB disconnected — mongoose will retry automatically.'));
  conn.on('reconnected', () => logger.info('MongoDB reconnected.'));
  conn.on('error', (err) => logger.error(`MongoDB connection error: ${err.message}`));
}

// Keep-warm heartbeat. Free-tier Atlas (and middleboxes) drop idle connections;
// the next real query then pays a multi-second stall while mongoose BUFFERS the
// command and re-establishes the socket (the "buffering too much" symptom). A
// cheap periodic ping keeps a pooled socket alive so user requests never wait on
// a reconnect. unref()'d so it never keeps the process alive on its own.
const HEARTBEAT_MS = 4 * 60 * 1000; // under typical idle-drop windows
let heartbeat = null;
function startHeartbeat() {
  if (heartbeat) return;
  heartbeat = setInterval(async () => {
    if (mongoose.connection.readyState !== 1) return; // not connected — nothing to keep warm
    try {
      await mongoose.connection.db.admin().command({ ping: 1 });
    } catch (e) {
      logger.warn(`DB keep-warm ping failed: ${e.message}`);
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();
}
function stopHeartbeat() {
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
}

// Fallback database for local dev when no real MONGO_URI is reachable. Spins up
// an embedded mongod (via mongodb-memory-server) pointed at a PERSISTENT on-disk
// dbPath, so data survives restarts. Only used outside production and only if
// the package is installed. Demo data is seeded ONLY when the store is empty, so
// a restart never wipes what you've added.
async function tryLocalDb() {
  // The packaged desktop app runs with NODE_ENV=production but still needs the
  // embedded engine (it ships its own bundled mongod), so allow it in prod when
  // WOLF_DESKTOP=1. Otherwise keep the original "dev fallback only" behaviour.
  const desktop = process.env.WOLF_DESKTOP === '1';
  if ((env.isProd && !desktop) || process.env.USE_MEMORY_DB === 'false') return null;

  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  } catch {
    return null; // package not installed — nothing to fall back to
  }

  try {
    fs.mkdirSync(LOCAL_DB_PATH, { recursive: true });
    memoryServer = await MongoMemoryServer.create({
      instance: { dbPath: LOCAL_DB_PATH, storageEngine: 'wiredTiger' },
    });
    await mongoose.connect(memoryServer.getUri('wolf_erp'), CONNECT_OPTIONS);
    logger.warn(`Using a PERSISTENT local database at ${LOCAL_DB_PATH} (data survives restarts).`);
    logger.warn('Set MONGO_URI to a MongoDB Atlas string for cloud-hosted, production-grade storage.');

    // Seed demo data only on a fresh/empty store — never overwrite existing data.
    try {
      const User = require('../models/User');
      const existing = await User.estimatedDocumentCount();
      if (existing === 0) {
        const { seedDatabase } = require('../seed');
        await seedDatabase();
      } else {
        logger.info(`Local database already has data (${existing} users) — skipping seed.`);
      }
    } catch (e) {
      logger.error(`Auto-seed check failed: ${e.message}`);
    }
    return mongoose.connection;
  } catch (e) {
    logger.error(`Local fallback database failed to start: ${e.message}`);
    return null;
  }
}

// Stop the embedded mongod cleanly (called from graceful shutdown). doCleanup
// is false so the persistent data directory is kept intact for next boot.
async function closeLocalDb() {
  stopHeartbeat();
  if (!memoryServer) return;
  try {
    await memoryServer.stop({ doCleanup: false });
  } catch (e) {
    logger.warn(`Error stopping local database: ${e.message}`);
  }
}

// Connect to MongoDB. Prefer the configured MONGO_URI; fall back to in-memory.
const connectDB = async () => {
  attachConnectionListeners();

  // Desktop build with no user-supplied MONGO_URI: there is no external Mongo to
  // reach, so go straight to the bundled embedded engine instead of wasting the
  // 6s server-selection timeout failing to connect to 127.0.0.1:27017 first.
  if (process.env.WOLF_DESKTOP === '1' && !process.env.MONGO_URI) {
    const fallback = await tryLocalDb();
    if (fallback) return fallback;
    logger.error('Embedded database failed to start — the desktop app cannot run without it.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(env.MONGO_URI, CONNECT_OPTIONS);
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    startHeartbeat(); // keep the pool warm so queries never wait on a reconnect
    return conn;
  } catch (error) {
    logger.warn(`Could not reach MongoDB at ${env.MONGO_URI} (${error.message}).`);

    const fallback = await tryLocalDb();
    if (fallback) return fallback;

    logger.error(
      'No database available. Start a local MongoDB (mongod), set MONGO_URI in server/.env ' +
        'to a MongoDB Atlas string, or run `npm install mongodb-memory-server` for an automatic ' +
        'persistent local database.'
    );
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports.closeLocalDb = closeLocalDb;
