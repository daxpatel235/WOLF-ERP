const path = require('path');
const dotenv = require('dotenv');

// Load .env that sits right next to this file.
dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./src/config/db');
const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

async function start() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`Wolf ERP API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  // Fail loudly but cleanly on unexpected errors.
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', reason);
    server.close(() => process.exit(1));
  });
}

start();
