// Centralized, validated access to environment variables.
// Everything that reads process.env should go through here.

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wolf_erp',

  JWT_SECRET: process.env.JWT_SECRET || 'dev_only_change_me_super_secret_key',

  // Optional seed admin. Self-registration can't create admins, so set these
  // (in server/.env or the host dashboard) to get one admin account on seed.
  // Leave unset to seed no admin at all.
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || '',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || '',
  SEED_ADMIN_NAME: process.env.SEED_ADMIN_NAME || 'Admin',
  // "Remember me" keeps a session alive for 15 days; after that the token
  // expires and the user lands back on the marketing page and must sign in
  // again. (The data wipe is separate — see CLEANUP_INACTIVE_DAYS, 30 days.)
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15d',

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // Optional self-ping target to stop a free-tier host (e.g. Render) from
  // spinning the service down after idle — the spin-down is what makes the
  // first request after a quiet spell cold-start for tens of seconds. Render
  // injects RENDER_EXTERNAL_URL automatically; set KEEPALIVE_URL to override or
  // to enable it on another host. Leave unset to disable self-pinging.
  KEEPALIVE_URL: process.env.KEEPALIVE_URL || process.env.RENDER_EXTERNAL_URL || '',

  // SMTP is optional — if unset, emails are logged to the console instead of sent.
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'Wolf ERP <no-reply@wolferp.in>',

  // AI is optional and powered by Google Gemini (genuinely free tier).
  // If GEMINI_API_KEY is unset, the AI endpoints return a friendly 503 and the
  // rest of the app keeps working unchanged.
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',

  // Embeddings power Level 3 (RAG chat). gemini-embedding-001 is free and
  // supports Matryoshka output sizes — we request 768-dim vectors. EMBED_DIM
  // must match the requested output AND the `numDimensions` in your Atlas index.
  GEMINI_EMBED_MODEL: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
  EMBED_DIM: parseInt(process.env.EMBED_DIM, 10) || 768,
  // Name of the Atlas Search vector index on the knowledgechunks collection.
  // Only used when running against MongoDB Atlas; ignored on local/in-memory
  // MongoDB (the app falls back to in-process cosine similarity).
  VECTOR_INDEX: process.env.VECTOR_INDEX || 'knowledge_vector_index',

  // --- Chat scope guard + cost controls (Level 3) ---
  // Minimum normalised similarity (0-1) of the best-matching record for a
  // question to be considered "about our data". Below this we refuse WITHOUT
  // calling the (expensive) generation model. Calibrated for gemini-embedding-001,
  // whose similarity floor is high (~0.75 even for unrelated English): measured
  // on-topic ≥0.82, off-topic ≤0.78, so 0.80 separates them. Raise to be stricter.
  RAG_MIN_SCORE: parseFloat(process.env.RAG_MIN_SCORE) || 0.8,
  // Min similarity of the question to any known capability example (see
  // config/chatDomain.js). Question-to-question similarity runs higher than
  // question-to-record, so this anchor threshold sits above RAG_MIN_SCORE.
  RAG_ANCHOR_MIN_SCORE: parseFloat(process.env.RAG_ANCHOR_MIN_SCORE) || 0.84,
  // Per-user chat rate cap: at most RAG_RATE_MAX messages per RAG_RATE_WINDOW_MS.
  RAG_RATE_MAX: parseInt(process.env.RAG_RATE_MAX, 10) || 30,
  RAG_RATE_WINDOW_MS: parseInt(process.env.RAG_RATE_WINDOW_MS, 10) || 5 * 60 * 1000,

  // --- Dormancy cleanup (free-tier storage guard) ---
  // A weekly external cron hits POST /api/admin/cleanup with this shared secret
  // in the x-cleanup-token header. If unset, the endpoint is disabled (503) so
  // nothing can ever be wiped by accident.
  CLEANUP_TOKEN: process.env.CLEANUP_TOKEN || '',
  // If nobody logs in for this many days, every collection except User is wiped.
  CLEANUP_INACTIVE_DAYS: parseInt(process.env.CLEANUP_INACTIVE_DAYS, 10) || 30,
};

env.isProd = env.NODE_ENV === 'production';
env.emailEnabled = Boolean(env.SMTP_HOST && env.SMTP_USER);
env.aiProvider = env.GEMINI_API_KEY ? 'gemini' : null;
env.aiEnabled = Boolean(env.aiProvider);
// RAG chat (Level 3) needs an embeddings provider. Only Gemini ships free
// embeddings here, so retrieval is enabled only when the Gemini key is set.
env.ragEnabled = Boolean(env.GEMINI_API_KEY);
// True when pointed at a real Atlas cluster (enables native $vectorSearch).
env.isAtlas = /mongodb\+srv/i.test(env.MONGO_URI) || /mongodb\.net/i.test(env.MONGO_URI);

module.exports = env;
