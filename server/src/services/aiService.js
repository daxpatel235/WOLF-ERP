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

// Per-request upstream timeout (ms). Without this the SDK can wait on a hung
// connection indefinitely, and withRetry would multiply the hang. 25s per
// attempt keeps each try bounded while still allowing for a slow free-tier model.
const AI_HTTP_TIMEOUT_MS = parseInt(process.env.AI_HTTP_TIMEOUT_MS, 10) || 25000;

if (enabled) {
  const { GoogleGenAI } = require('@google/genai');
  genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, httpOptions: { timeout: AI_HTTP_TIMEOUT_MS } });
  logger.info(`AI enabled — provider: Gemini (${model}), per-call timeout ${AI_HTTP_TIMEOUT_MS}ms`);
} else {
  logger.warn('No AI key set (GEMINI_API_KEY) — AI features are disabled.');
}

// Optional: route the RAG chat answer to Groq's free, larger models. Everything
// else (document scanning, drafts, embeddings) stays on Gemini.
const groqEnabled = Boolean(env.GROQ_API_KEY);
const groqModel = env.GROQ_MODEL;
if (groqEnabled) {
  logger.info(`Chat answers — provider: Groq (${groqModel}); Gemini still handles scanning & embeddings.`);
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

async function geminiJSON({ system, prompt, images, schema, maxTokens, model: modelOverride }) {
  const resp = await genai.models.generateContent({
    model: modelOverride || model,
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
// Groq helper (OpenAI-compatible REST — no SDK dependency)
// ---------------------------------------------------------------------------

// Text-only chat completion via Groq. Used for the RAG answer; images/JSON
// schema are intentionally not supported here (those stay on Gemini).
async function groqText({ system, prompt, maxTokens }) {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: groqModel,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
    // Bound each attempt the same way the Gemini SDK is bounded above.
    signal: AbortSignal.timeout(AI_HTTP_TIMEOUT_MS),
  });
  if (!resp.ok) {
    // Keep the status in the message so withRetry/wrapError can classify it
    // (e.g. 503 → retry, 429 → "rate limit reached").
    const body = await resp.text().catch(() => '');
    throw new Error(`Groq ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

// Low-level Groq chat completion that supports tool/function calling. Returns
// the raw assistant message ({ role, content, tool_calls }) so the caller can
// run an agent loop. Used by ragService for the agentic chat.
async function groqComplete({ messages, tools, maxTokens = 1200, temperature = 0.2 }) {
  if (!groqEnabled) throw new Error('Groq is not configured (GROQ_API_KEY).');
  const payload = { model: groqModel, messages, max_tokens: maxTokens, temperature };
  if (tools && tools.length) {
    payload.tools = tools;
    payload.tool_choice = 'auto';
  }
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(AI_HTTP_TIMEOUT_MS),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`Groq ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message || { role: 'assistant', content: '' };
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
 * Free-text generation for the RAG chat answer. Uses Groq when GROQ_API_KEY is
 * set (free, larger models), otherwise falls back to the Gemini text path. This
 * is the ONLY place Groq is used — scanning, drafts and embeddings stay Gemini.
 * @returns {Promise<string>}
 */
async function generateChat({ system, prompt, maxTokens = 1200 }) {
  if (!groqEnabled) {
    // No Groq configured — behave exactly like before (Gemini text).
    return generateText({ system, prompt, maxTokens });
  }
  try {
    return await withRetry(() => groqText({ system, prompt, maxTokens }));
  } catch (err) {
    throw wrapError(err);
  }
}

/**
 * Structured generation — constrains output to a JSON Schema and returns the
 * parsed object.
 * @returns {Promise<object>}
 */
async function generateJSON({ system, prompt, images, schema, maxTokens = 4096, model: modelOverride }) {
  ensureReady();
  let raw;
  try {
    raw = await withRetry(() => geminiJSON({ system, prompt, images, schema, maxTokens, model: modelOverride }));
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
  groqEnabled,
  generateText,
  generateChat,
  groqComplete,
  generateJSON,
  withRetry, // shared transient-error retry, reused by embeddingService
};
