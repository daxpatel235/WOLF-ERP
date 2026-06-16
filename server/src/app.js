const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const mongoose = require('mongoose');

const env = require('./config/env');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const requestTimeout = require('./middleware/timeout');

const app = express();

// ---- Core middleware ----
// Security headers. crossOriginResourcePolicy relaxed so the separate frontend
// origin can still load /uploads assets.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.CLIENT_URL === '*' ? true : [env.CLIENT_URL, 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' })); // 10mb headroom for base64 images sent to the AI extractor
app.use(express.urlencoded({ extended: true }));
app.use(requestTimeout()); // backstop so a stuck handler can't hang the client forever
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Simple request logger (dev only).
if (!env.isProd) {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });
}

// ---- Health checks ----
// `/` is a cheap liveness probe (the process is up). `/api/health` is a
// readiness probe: it reports the MongoDB connection state and returns 503 when
// the DB is unreachable, so the platform health check (and any uptime monitor)
// catches a half-dead instance instead of seeing a green "ok" while every data
// request hangs.
const DB_STATE = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
app.get('/', (_req, res) => res.json({ message: 'Wolf ERP Procurement API', status: 'ok' }));
app.get('/api/health', (_req, res) => {
  const state = mongoose.connection.readyState;
  const dbOk = state === 1;
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: DB_STATE[state] || 'unknown',
    uptime: Math.round(process.uptime()),
    time: new Date().toISOString(),
  });
});

// ---- Feature routes ----
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/vendors', require('./routes/vendorRoutes'));
app.use('/api/rfqs', require('./routes/rfqRoutes'));
app.use('/api/quotations', require('./routes/quotationRoutes'));
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// ---- 404 + error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
