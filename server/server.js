const path = require('path');
const dotenv = require('dotenv');

// Load .env that sits right next to this file.
dotenv.config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`Wolf ERP API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Keep-alive must outlive a proxy's idle timeout to avoid sporadic dropped
  // connections behind Render's load balancer. requestTimeout is a hard cap so a
  // slow/stalled client can't pin a socket open forever.
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000; // must exceed keepAliveTimeout
  server.requestTimeout = 120000;

  // Self-ping to keep a free-tier host awake. Render spins the service down
  // after ~15 min idle, so the first request afterwards cold-starts for tens of
  // seconds. Hitting our own cheap liveness route every ~13 min prevents that.
  // Only runs in production and only when a target URL is known (see env.js).
  if (env.isProd && env.KEEPALIVE_URL) {
    const pingUrl = `${env.KEEPALIVE_URL.replace(/\/$/, '')}/api/health`;
    const KEEPALIVE_MS = 13 * 60 * 1000; // safely under the ~15 min idle window
    const timer = setInterval(async () => {
      try {
        await fetch(pingUrl, { method: 'GET' });
      } catch (e) {
        logger.warn(`Keep-awake self-ping failed: ${e.message}`);
      }
    }, KEEPALIVE_MS);
    timer.unref(); // never block shutdown just for the self-ping
    logger.info(`Keep-awake self-ping enabled → ${pingUrl} every 13m.`);
  }

  // Graceful shutdown: Render (and most hosts) send SIGTERM on every deploy and
  // idle spin-down. Drain in-flight requests and close the DB so the next boot
  // starts clean instead of fighting half-open connections.
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — shutting down gracefully...`);
    server.close(async () => {
      try {
        await mongoose.connection.close(false);
        await connectDB.closeLocalDb(); // no-op unless the local fallback DB is in use
      } catch (e) {
        logger.error(`Error closing MongoDB: ${e.message}`);
      }
      logger.info('Shutdown complete.');
      process.exit(0);
    });
    // Don't hang forever if a connection refuses to drain.
    setTimeout(() => {
      logger.warn('Forced shutdown after 10s drain timeout.');
      process.exit(1);
    }, 10000).unref();
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Fail loudly but cleanly on unexpected errors. A rejected promise or thrown
  // error that reaches here means state may be corrupt — drain and restart so
  // the platform brings up a healthy instance.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', reason);
    shutdown('unhandledRejection');
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception:', err);
    shutdown('uncaughtException');
  });
}

start();
