const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

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

// Last-resort fallback: spin up an in-memory MongoDB so the app still runs for
// demos/dev when no real MongoDB is reachable. Only used outside production,
// and only if `mongodb-memory-server` is installed. Data resets on restart.
async function tryInMemory() {
  if (env.isProd || process.env.USE_MEMORY_DB === 'false') return null;

  let MongoMemoryServer;
  try {
    ({ MongoMemoryServer } = require('mongodb-memory-server'));
  } catch {
    return null; // package not installed — nothing to fall back to
  }

  try {
    const mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri('wolf_erp'));
    logger.warn('Connected to an IN-MEMORY MongoDB (data resets when the server stops).');
    logger.warn('Install/run a real MongoDB or set MONGO_URI for persistent storage.');

    // Auto-seed so the in-memory database isn't empty.
    try {
      const { seedDatabase } = require('../seed');
      await seedDatabase();
    } catch (e) {
      logger.error(`Auto-seed of in-memory DB failed: ${e.message}`);
    }
    return mongoose.connection;
  } catch (e) {
    logger.error(`In-memory MongoDB failed to start: ${e.message}`);
    return null;
  }
}

// Connect to MongoDB. Prefer the configured MONGO_URI; fall back to in-memory.
const connectDB = async () => {
  attachConnectionListeners();
  try {
    const conn = await mongoose.connect(env.MONGO_URI, CONNECT_OPTIONS);
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.warn(`Could not reach MongoDB at ${env.MONGO_URI} (${error.message}).`);

    const fallback = await tryInMemory();
    if (fallback) return fallback;

    logger.error(
      'No database available. Start a local MongoDB (mongod), set MONGO_URI in server/.env ' +
        'to a MongoDB Atlas string, or run `npm install mongodb-memory-server` for an automatic ' +
        'in-memory database.'
    );
    process.exit(1);
  }
};

module.exports = connectDB;
