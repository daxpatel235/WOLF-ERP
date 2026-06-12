const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

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
  try {
    const conn = await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 6000 });
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
