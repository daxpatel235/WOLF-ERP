// Central wrapper around the project's LLM provider (Google Gemini, free tier).
//
// The rest of the app only calls generateText / generateJSON and never imports
// the SDK directly, so the provider stays an implementation detail.
//
// When no key is configured, `enabled` is false and the generate helpers throw
// AiDisabledError, which controllers turn into a clean 503.

const env = require('../config/env');
const logger = require('../utils/logger');

// Thrown when an AI feature is used but no provider is configured.
class AiDisabledError extends Error {
  constructor() {
    super('AI features are not configured. Set GEMINI_API_KEY (free) on the server.');
    this.name = 'AiDisabledError';
    this.statusCode = 503;
  }
}

const provider = env.aiProvider; // 'gemini' | null
const enabled = Boolean(provider);
const model = enabled ? env.GEMINI_MODEL : null;

let genai = null;

if (enabled) {
  const { GoogleGenAI } = require('@google/genai');
  genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  logger.info(`AI enabled — provider: Gemini (${model})`);
} else {
  logger.warn('No AI key set (GEMINI_API_KEY) — AI features are disabled.');
}

function ensureReady() {
  if (!enabled) throw new AiDisabledError();
}

// Transient failures worth retrying — free tiers frequently return 503
// "overloaded/high demand" or brief network blips. Hard quota (429) is NOT
// retried here (a tight retry loop would just burn the quota faster).
const RETRYABLE = /(\b503\b|UNAVAILABLE|overloaded|high demand|\b500\b|INTERNAL|ECONNRESET|ETIMEDOUT|fetch failed|network)/i;

// Run `fn`, retrying transient errors with exponential backoff + jitter.
async function withRetry(fn, { tries = 3, baseMs = 600 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err?.message || '';
      if (attempt < tries && RETRYABLE.test(msg)) {
        const wait = Math.round(baseMs * 2 ** (attempt - 1) + Math.random() * 250);
        logger.warn(`AI call failed (attempt ${attempt}/${tries}): ${msg.slice(0, 90)} — retrying in ${wait}ms`);
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Normalise a thrown SDK error into a clean message + status for the client.
function wrapError(err) {
  const msg = err?.message || 'The AI request failed.';
  // Surface rate-limit / quota issues clearly (common on free tiers).
  if (/quota|rate.?limit|429|RESOURCE_EXHAUSTED/i.test(msg)) {
    const e = new Error('AI rate limit reached. Please wait a moment and try again.');
    e.statusCode = 429;
    return e;
  }
  const e = new Error(msg);
  e.statusCode = err?.statusCode || 502;
  return e;
}

// ---------------------------------------------------------------------------
// Gemini helpers
// ---------------------------------------------------------------------------

// Build Gemini `contents` parts: inline images first, then the text prompt.
// `images` is [{ media_type, data }] where data is raw base64.
function geminiParts(prompt, images = []) {
  const parts = images.map((img) => ({
    inlineData: { mimeType: img.media_type, data: img.data },
  }));
  parts.push({ text: prompt });
  return [{ role: 'user', parts }];
}

async function geminiText({ system, prompt, images, maxTokens }) {
  const resp = await genai.models.generateContent({
    model,
    contents: geminiParts(prompt, images),
    config: { systemInstruction: system, maxOutputTokens: maxTokens },
  });
  return (resp.text || '').trim();
}

async function geminiJSON({ system, prompt, images, schema, maxTokens }) {
  const resp = await genai.models.generateContent({
    model,
    contents: geminiParts(prompt, images),
    config: {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
      // responseJsonSchema accepts a standard JSON Schema.
      responseJsonSchema: schema,
    },
  });
  return (resp.text || '').trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Free-text generation (drafts, summaries, narratives).
 * @returns {Promise<string>}
 */
async function generateText({ system, prompt, images, maxTokens = 1500 }) {
  ensureReady();
  try {
    return await withRetry(() => geminiText({ system, prompt, images, maxTokens }));
  } catch (err) {
    throw wrapError(err);
  }
}

/**
 * Structured generation — constrains output to a JSON Schema and returns the
 * parsed object.
 * @returns {Promise<object>}
 */
async function generateJSON({ system, prompt, images, schema, maxTokens = 4096 }) {
  ensureReady();
  let raw;
  try {
    raw = await withRetry(() => geminiJSON({ system, prompt, images, schema, maxTokens }));
  } catch (err) {
    throw wrapError(err);
  }

  try {
    // Some models wrap JSON in ```json fences; strip them defensively.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    return JSON.parse(cleaned);
  } catch {
    logger.error(`AI returned non-JSON output: ${raw.slice(0, 200)}`);
    const err = new Error('The AI returned an unexpected response. Please try again.');
    err.statusCode = 502;
    throw err;
  }
}

module.exports = {
  enabled,
  provider,
  model,
  AiDisabledError,
  generateText,
  generateJSON,
  withRetry, // shared transient-error retry, reused by embeddingService
};
