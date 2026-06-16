// Backstop request timeout. If a handler hasn't responded within its budget,
// reply 503 once so the client gets a clear error instead of an endless spinner
// (the "backend is stuck" symptom). This is a safety net, not the primary
// timeout — DB and AI calls have their own, shorter, internal timeouts.

const logger = require('../utils/logger');

// AI routes legitimately wait on an upstream model (with its own retry), so they
// get a longer budget than plain CRUD/report routes, which should finish in ms.
const DEFAULT_MS = 30000;
const AI_MS = 90000;

function requestTimeout() {
  return (req, res, next) => {
    const budget = req.path.startsWith('/api/ai') ? AI_MS : DEFAULT_MS;

    const timer = setTimeout(() => {
      if (res.headersSent) return;
      logger.warn(`Request timed out after ${budget}ms: ${req.method} ${req.originalUrl}`);
      res.status(503).json({ message: 'The server took too long to respond. Please try again.' });
    }, budget);

    // Clear the timer however the response ends (finish, close, or error).
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

module.exports = requestTimeout;
