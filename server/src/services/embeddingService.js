// Embeddings wrapper for Level 3 RAG.
//
// Embeddings turn text into a vector so we can find semantically similar ERP
// records. Only Google Gemini ships free embeddings in this project, so this
// module is a no-op (ragEnabled === false) when GEMINI_API_KEY isn't set.
//
// Gemini's `text-embedding-004` returns 768-dim vectors. We tag each request
// with a taskType so the model optimises the vector for its job: documents are
// embedded as RETRIEVAL_DOCUMENT, the user's question as RETRIEVAL_QUERY. This
// asymmetric embedding measurably improves retrieval quality.

const env = require('../config/env');
const logger = require('../utils/logger');
const { withRetry } = require('./aiService');

const enabled = env.ragEnabled;
const model = env.GEMINI_EMBED_MODEL;
const dim = env.EMBED_DIM;

let genai = null;
if (enabled) {
  const { GoogleGenAI } = require('@google/genai');
  genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

// Gemini caps batch embedding requests; stay well under it.
const BATCH = 96;

function ensureReady() {
  if (!enabled) {
    const e = new Error('RAG/embeddings need GEMINI_API_KEY. Set it on the server to enable chat.');
    e.statusCode = 503;
    throw e;
  }
}

// Embed many texts at once. Returns an array of float[] in the same order.
// `taskType` is RETRIEVAL_DOCUMENT (indexing) or RETRIEVAL_QUERY (searching).
async function embedBatch(texts, taskType = 'RETRIEVAL_DOCUMENT') {
  ensureReady();
  const clean = texts.map((t) => (t || '').toString().slice(0, 8000));
  const out = [];

  for (let i = 0; i < clean.length; i += BATCH) {
    const slice = clean.slice(i, i + BATCH);
    const resp = await withRetry(() =>
      genai.models.embedContent({
        model,
        contents: slice,
        config: { taskType, outputDimensionality: dim },
      })
    );
    const vectors = (resp.embeddings || []).map((e) => e.values || []);
    if (vectors.length !== slice.length) {
      throw new Error(`Embedding count mismatch: asked ${slice.length}, got ${vectors.length}`);
    }
    out.push(...vectors);
  }
  return out;
}

// Embed a single piece of text → float[].
async function embedOne(text, taskType = 'RETRIEVAL_QUERY') {
  const [v] = await embedBatch([text], taskType);
  return v;
}

if (enabled) {
  logger.info(`Embeddings enabled — model: ${model} (${dim} dims)`);
}

module.exports = { enabled, model, dim, embedBatch, embedOne };
