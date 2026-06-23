// Level 3 — Retrieval-Augmented Generation over the ERP's own data.
//
// Pipeline:
//   1. reindex()  — turn every vendor/RFQ/quotation/PO/invoice into a short
//      natural-language summary, embed it, and upsert it into `knowledgechunks`.
//   2. retrieve() — embed the user's question and find the most similar chunks.
//      • On MongoDB Atlas: native `$vectorSearch` (fast, scales to millions).
//      • Anywhere else (local/in-memory Mongo): in-process cosine similarity,
//        so the feature still works in dev without any Atlas setup.
//   3. answer()   — feed the retrieved context + chat history to the LLM and
//      return a grounded answer plus the sources it drew from.

const crypto = require('crypto');
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('../utils/logger');

const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const KnowledgeChunk = require('../models/KnowledgeChunk');

const embeddings = require('./embeddingService');
const ai = require('./aiService');
const chatDomain = require('../config/chatDomain');

const enabled = embeddings.enabled;

// Capability anchors: example phrasings (from config/chatDomain.js) embedded
// once and cached. A question that semantically matches any anchor is in-scope
// even if it doesn't strongly match a specific stored record — this defines the
// assistant's domain by *what it can do*, not just by what data exists.
let _anchorPromise = null;
async function getAnchorVectors() {
  if (!_anchorPromise) {
    const texts = chatDomain.anchorTexts();
    _anchorPromise = embeddings
      .embedBatch(texts, 'RETRIEVAL_QUERY')
      .then((vectors) => {
        logger.info(`RAG scope: embedded ${vectors.length} capability anchors.`);
        return vectors;
      })
      .catch((err) => {
        // Non-fatal: if anchors fail to embed, fall back to data-only gating.
        _anchorPromise = null;
        logger.warn(`Could not embed capability anchors (${err.message}); using data-only scope gate.`);
        return [];
      });
  }
  return _anchorPromise;
}

// Best normalised similarity of the question to any capability anchor.
async function capabilityScore(queryVector) {
  const anchors = await getAnchorVectors();
  let best = 0;
  for (const a of anchors) {
    const s = (cosine(queryVector, a) + 1) / 2;
    if (s > best) best = s;
  }
  return best;
}

// Whether to attempt Atlas `$vectorSearch`. Starts from the URI heuristic but
// flips to false permanently the first time the aggregation fails (e.g. the
// index doesn't exist yet), so we degrade to cosine without spamming errors.
let useAtlasVectorSearch = env.isAtlas;

// ---------------------------------------------------------------------------
// 1. Document builders — record → readable text the LLM can reason over
// ---------------------------------------------------------------------------

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');
const itemList = (items = []) =>
  items.length
    ? items.map((it) => `${it.qty}×${it.name}${it.unitPrice ? ` @ ${inr(it.unitPrice)}` : ''}`).join(', ')
    : 'no line items';

function vendorDoc(v) {
  return {
    source: 'vendor',
    sourceId: v.code,
    title: `${v.name} (${v.code})`,
    text:
      `Vendor ${v.name} (code ${v.code}). Category: ${v.category}. Status: ${v.status}. ` +
      `Rating: ${v.rating}/5. Location: ${v.location || 'unknown'}. ` +
      `Contact: ${v.contact || '—'}${v.email ? ` <${v.email}>` : ''}${v.phone ? `, ${v.phone}` : ''}. ` +
      `GSTIN: ${v.gstin || '—'}.${v.notes ? ` Notes: ${v.notes}` : ''}`,
  };
}

function rfqDoc(r) {
  return {
    source: 'rfq',
    sourceId: r.code,
    title: `${r.title} (${r.code})`,
    text:
      `RFQ ${r.code}: "${r.title}". Category: ${r.category}. Status: ${r.status}. ` +
      `Created ${day(r.created)}, due ${day(r.due)}. Invited ${r.invitedVendors?.length || 0} vendors. ` +
      `Items: ${itemList(r.items)}.${r.notes ? ` Notes: ${r.notes}` : ''}`,
  };
}

function quotationDoc(q) {
  return {
    source: 'quotation',
    sourceId: q.code,
    title: `Quote ${q.code} from ${q.vendor}`,
    text:
      `Quotation ${q.code} from vendor ${q.vendor} (${q.vendorId}) for RFQ ${q.rfqId || '—'}` +
      `${q.rfqTitle ? ` "${q.rfqTitle}"` : ''}. Amount: ${inr(q.amount)}. ` +
      `Delivery: ${q.deliveryDays} days. Status: ${q.status}. Submitted ${day(q.submitted)}. ` +
      `Valid till ${day(q.validTill)}. Items: ${itemList(q.items)}.`,
  };
}

function poDoc(p) {
  return {
    source: 'purchaseOrder',
    sourceId: p.code,
    title: `PO ${p.code} → ${p.vendor}`,
    text:
      `Purchase Order ${p.code} to vendor ${p.vendor} (${p.vendorId}). Amount: ${inr(p.amount)}. ` +
      `Status: ${p.status}. Priority: ${p.priority}. Created ${day(p.created)}, delivery ${day(p.delivery)}. ` +
      `${p.rfqId ? `From RFQ ${p.rfqId}. ` : ''}${p.quotationId ? `From quote ${p.quotationId}. ` : ''}` +
      `Items: ${itemList(p.items)}.${p.notes ? ` Notes: ${p.notes}` : ''}`,
  };
}

function invoiceDoc(i) {
  const outstanding = (i.amount || 0) - (i.amountPaid || 0);
  return {
    source: 'invoice',
    sourceId: i.code,
    title: `Invoice ${i.code} from ${i.vendor}`,
    text:
      `Invoice ${i.code} from vendor ${i.vendor} (${i.vendorId}). Amount: ${inr(i.amount)}, ` +
      `paid ${inr(i.amountPaid)}, outstanding ${inr(outstanding)}. Status: ${i.status}. ` +
      `Issued ${day(i.issued)}, due ${day(i.due)}.${i.poId ? ` Linked PO ${i.poId}.` : ''} ` +
      `Items: ${itemList(i.items)}.`,
  };
}

// Pull this owner's records and flatten into one array of
// {source, sourceId, title, text}. Scoped by `createdBy` so the knowledge base
// only ever contains the signed-in user's own data.
async function buildDocuments(owner) {
  const [vendors, rfqs, quotes, pos, invoices] = await Promise.all([
    Vendor.find({ createdBy: owner }).lean(),
    RFQ.find({ createdBy: owner }).lean(),
    Quotation.find({ createdBy: owner }).lean(),
    PurchaseOrder.find({ createdBy: owner }).lean(),
    Invoice.find({ createdBy: owner }).lean(),
  ]);
  return [
    ...vendors.map(vendorDoc),
    ...rfqs.map(rfqDoc),
    ...quotes.map(quotationDoc),
    ...pos.map(poDoc),
    ...invoices.map(invoiceDoc),
  ].filter((d) => d.sourceId); // skip any record missing a human code
}

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex');

// ---------------------------------------------------------------------------
// Account snapshot — whole-account aggregates the LLM needs for analytical
// questions ("total spend?", "how many overdue invoices?", "top vendors?").
// Vector retrieval only returns the few nearest records, which can't answer
// count/sum/ranking questions — so we compute these directly and always include
// them in the prompt alongside the retrieved detail.
// ---------------------------------------------------------------------------

const PO_SPENDABLE = ['Approved', 'Sent', 'Received'];
const INV_OPEN = (i) => !['Paid', 'Cancelled', 'Draft'].includes(i.status);

const countBy = (rows, key) => {
  const out = {};
  for (const r of rows) out[r[key] || '—'] = (out[r[key] || '—'] || 0) + 1;
  return Object.entries(out)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${n} ${k}`)
    .join(', ');
};

async function buildSnapshot(owner) {
  const [vendors, rfqs, quotes, pos, invoices] = await Promise.all([
    Vendor.find({ createdBy: owner }).select('name code category status rating').lean(),
    RFQ.find({ createdBy: owner }).select('code status').lean(),
    Quotation.find({ createdBy: owner }).select('code status amount').lean(),
    PurchaseOrder.find({ createdBy: owner }).select('code vendor amount status').lean(),
    Invoice.find({ createdBy: owner }).select('code vendor amount amountPaid status due').lean(),
  ]);

  if (!vendors.length && !rfqs.length && !quotes.length && !pos.length && !invoices.length) {
    return 'ACCOUNT SNAPSHOT: this account has no procurement records yet.';
  }

  // Spend + top vendors from spendable purchase orders.
  const spendByVendor = {};
  let totalSpend = 0;
  for (const p of pos) {
    if (PO_SPENDABLE.includes(p.status)) {
      spendByVendor[p.vendor] = (spendByVendor[p.vendor] || 0) + (p.amount || 0);
      totalSpend += p.amount || 0;
    }
  }
  const topVendors = Object.entries(spendByVendor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([v, a]) => `${v} ${inr(a)}`);

  // Invoice money.
  let billed = 0;
  let paid = 0;
  let outstanding = 0;
  for (const i of invoices) {
    billed += i.amount || 0;
    paid += i.amountPaid || 0;
    if (INV_OPEN(i)) outstanding += (i.amount || 0) - (i.amountPaid || 0);
  }
  const overdue = invoices.filter((i) => i.status === 'Overdue');

  const activeVendors = vendors.filter((v) => v.status === 'Active').length;

  const lines = [
    'ACCOUNT SNAPSHOT (live, whole account — use for totals, counts, rankings):',
    `• Vendors: ${vendors.length} total (${activeVendors} active). By category: ${countBy(vendors, 'category') || '—'}.`,
    topVendors.length ? `• Top vendors by spend: ${topVendors.join('; ')}.` : '• No spend recorded yet.',
    `• RFQs: ${rfqs.length} total${rfqs.length ? ` (${countBy(rfqs, 'status')})` : ''}.`,
    `• Quotations: ${quotes.length} total${quotes.length ? ` (${countBy(quotes, 'status')})` : ''}.`,
    `• Purchase Orders: ${pos.length} total, total spend ${inr(totalSpend)}${pos.length ? ` (${countBy(pos, 'status')})` : ''}.`,
    `• Invoices: ${invoices.length} total. Billed ${inr(billed)}, paid ${inr(paid)}, outstanding ${inr(outstanding)}.`,
  ];
  if (overdue.length) {
    const overdueTotal = overdue.reduce((t, i) => t + ((i.amount || 0) - (i.amountPaid || 0)), 0);
    lines.push(
      `• Overdue invoices (${overdue.length}, total ${inr(overdueTotal)}): ` +
        overdue
          .slice(0, 15)
          .map((i) => `${i.code} ${i.vendor} ${inr((i.amount || 0) - (i.amountPaid || 0))} (due ${day(i.due)})`)
          .join('; ') +
        '.'
    );
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 2. Indexing
// ---------------------------------------------------------------------------

// One-time migration: drop the pre-owner global unique index and purge any
// legacy chunks that predate per-account scoping. Runs at most once per process.
let _schemaFixed = false;
async function ensureOwnerSchema() {
  if (_schemaFixed) return;
  _schemaFixed = true;
  try {
    const indexes = await KnowledgeChunk.collection.indexes();
    if (indexes.some((ix) => ix.name === 'source_1_sourceId_1')) {
      await KnowledgeChunk.collection.dropIndex('source_1_sourceId_1');
      logger.info('RAG: dropped legacy global source+sourceId index (now scoped per owner).');
    }
    // Chunks written before owner scoping can't be served safely — drop them.
    const purged = await KnowledgeChunk.deleteMany({ owner: { $exists: false } });
    if (purged.deletedCount) {
      logger.info(`RAG: purged ${purged.deletedCount} pre-owner knowledge chunks.`);
    }
  } catch (err) {
    _schemaFixed = false; // let a later call retry if this one raced/failed
    logger.warn(`RAG owner-schema migration skipped: ${err.message}`);
  }
}

/**
 * Re-embed and store one owner's knowledge base. Incremental: only records whose
 * text changed since last time are re-embedded. Orphaned chunks (records that
 * were deleted) are pruned. Returns a small summary for the API/UI.
 */
async function reindex({ owner, force = false } = {}) {
  if (!enabled) {
    const e = new Error('Chat needs GEMINI_API_KEY for embeddings.');
    e.statusCode = 503;
    throw e;
  }
  if (!owner) {
    const e = new Error('reindex requires an owner (user id).');
    e.statusCode = 400;
    throw e;
  }
  await ensureOwnerSchema();

  const docs = await buildDocuments(owner);
  const existing = await KnowledgeChunk.find({ owner }).select('source sourceId contentHash').lean();
  const prevHash = new Map(existing.map((c) => [`${c.source}:${c.sourceId}`, c.contentHash]));
  const liveKeys = new Set(docs.map((d) => `${d.source}:${d.sourceId}`));

  // Only embed new or changed documents.
  const stale = docs.filter((d) => force || prevHash.get(`${d.source}:${d.sourceId}`) !== hash(d.text));

  let embedded = 0;
  if (stale.length) {
    const vectors = await embeddings.embedBatch(stale.map((d) => d.text), 'RETRIEVAL_DOCUMENT');
    const ops = stale.map((d, i) => ({
      updateOne: {
        filter: { owner, source: d.source, sourceId: d.sourceId },
        update: {
          $set: {
            owner,
            title: d.title,
            text: d.text,
            embedding: vectors[i],
            contentHash: hash(d.text),
          },
        },
        upsert: true,
      },
    }));
    await KnowledgeChunk.bulkWrite(ops);
    embedded = stale.length;
  }

  // Prune this owner's chunks whose source record no longer exists.
  const orphans = existing.filter((c) => !liveKeys.has(`${c.source}:${c.sourceId}`));
  if (orphans.length) {
    await KnowledgeChunk.deleteMany({
      owner,
      $or: orphans.map((o) => ({ source: o.source, sourceId: o.sourceId })),
    });
  }

  const result = { total: docs.length, embedded, unchanged: docs.length - embedded, pruned: orphans.length };
  logger.info(
    `RAG reindex (owner ${owner}): ${result.total} records, ${result.embedded} (re)embedded, ${result.pruned} pruned.`
  );
  return result;
}

// ---------------------------------------------------------------------------
// 3. Retrieval
// ---------------------------------------------------------------------------

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Native Atlas vector search, restricted to one owner's chunks. Throws if the
// index/feature isn't available, so the caller can fall back to cosine.
async function atlasSearch(queryVector, owner, k) {
  const rows = await KnowledgeChunk.aggregate([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX,
        path: 'embedding',
        queryVector,
        filter: { owner },
        numCandidates: Math.max(k * 15, 100),
        limit: k,
      },
    },
    {
      $project: {
        _id: 0,
        source: 1,
        sourceId: 1,
        title: 1,
        text: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);
  return rows;
}

// In-process cosine similarity over all stored chunks. Works on any MongoDB.
// Scores are normalised to [0,1] as (1+cos)/2 so they're directly comparable
// to Atlas `vectorSearchScore` (cosine), letting one RAG_MIN_SCORE threshold
// work for both backends.
async function cosineSearch(queryVector, owner, k) {
  const chunks = await KnowledgeChunk.find({ owner, embedding: { $exists: true } })
    .select('source sourceId title text embedding')
    .lean();
  return chunks
    .map((c) => ({
      source: c.source,
      sourceId: c.sourceId,
      title: c.title,
      text: c.text,
      score: (cosine(queryVector, c.embedding || []) + 1) / 2,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// Search using an already-computed query vector (avoids re-embedding when the
// caller also needs the vector, e.g. for capability scoring). Owner-scoped.
async function retrieveByVector(queryVector, owner, k = 6) {
  if (useAtlasVectorSearch) {
    try {
      const rows = await atlasSearch(queryVector, owner, k);
      if (rows.length) return rows;
      // Empty result on Atlas is legitimate (e.g. nothing indexed yet) — fall
      // through to cosine only if the store actually has data.
    } catch (err) {
      useAtlasVectorSearch = false;
      logger.warn(
        `Atlas $vectorSearch unavailable (${err.message}). Falling back to in-process ` +
          'cosine similarity. Create the vector index (see docs/atlas-vector-search.md) for scale.'
      );
    }
  }
  return cosineSearch(queryVector, owner, k);
}

/**
 * Return the top-k knowledge chunks most relevant to `query` for one owner.
 * Re-scans the owner's live records first so answers reflect current data.
 */
async function retrieve(query, owner, k = 6) {
  await reindex({ owner });
  const queryVector = await embeddings.embedOne(query, 'RETRIEVAL_QUERY');
  return retrieveByVector(queryVector, owner, k);
}

// ---------------------------------------------------------------------------
// 4. Answering
// ---------------------------------------------------------------------------

const SYSTEM = [
  'You are Wolf, a sharp and helpful AI procurement analyst inside the Wolf ERP system.',
  'You answer questions about this organisation\'s own procurement data: vendors, RFQs,',
  'quotations, purchase orders and invoices. You are given two information sources:',
  '  1) ACCOUNT SNAPSHOT — live whole-account aggregates (totals, counts, status breakdowns,',
  '     top vendors by spend, outstanding/overdue amounts). Use this for any "how many",',
  '     "total", "how much", "list", "top/highest/lowest", "overall" or summary question.',
  '  2) CONTEXT — the specific records most relevant to the question, retrieved live. Use this',
  '     for details about particular vendors, RFQs, quotes, POs or invoices.',
  'Together these cover the account; answer confidently from them.',
  'Rules:',
  '• Stay on-topic: only procurement data. If the question is unrelated (weather, general',
  '  knowledge, coding, opinions, chit-chat), DO NOT answer. Reply only: "I can only help with',
  '  questions about your procurement data — vendors, RFQs, quotations, purchase orders and',
  '  invoices." Never use outside knowledge.',
  '• Prefer the SNAPSHOT for figures it already provides (totals, counts, rankings) — they are',
  '  computed over the whole account and are authoritative. Do not recompute them from CONTEXT,',
  '  which holds only a sample of records.',
  '• When you must add numbers yourself, do the arithmetic carefully and give only the final',
  '  figure cleanly — never show scratch calculations or corrections in your reply.',
  '• If a specific detail genuinely is not in either source, say so plainly and suggest where to',
  '  look — never invent vendors, amounts, codes or dates.',
  '• Amounts are Indian Rupees (₹). Be specific with numbers, codes (e.g. V-1003, INV-2025-088) and dates.',
  '• Be a good assistant: direct and concise, but complete. Use tight bullet lists or short',
  '  paragraphs for multi-item answers. No markdown headers.',
  '• When you cite a record, mention its code so the user can find it.',
].join('\n');

// ---- Cheap intent triage (no API cost) -----------------------------------
// Handle greetings and "what can you do" with canned replies, and recognise
// blatantly off-topic chatter, so we never spend tokens on them.
const GREETING_RE = /^(hi+|hey+|hello+|yo|sup|hiya|howdy|namaste|hola|good\s+(morning|afternoon|evening|day))\b[\s!.,]*$/i;
const HELP_RE = /\b(what can (you|u) do|what do (you|u) do|how (do|does) (you|this|it) work|who are (you|u)|what are (you|u)|what can i ask|how (to|do i) use|your (capabilities|features))\b/i;

const CANNED = {
  greeting:
    "👋 Hi! I'm Wolf AI, your procurement assistant. Ask me about your vendors, RFQs, " +
    'quotations, purchase orders or invoices — for example "Which invoices are overdue?" ' +
    'or "Who are my top vendors by spend?"',
  help: chatDomain.helpText(),
  outOfScope:
    "I can only answer questions about your Wolf ERP procurement data — vendors, RFQs, " +
    "quotations, purchase orders and invoices. That looks outside my scope, so I can't help " +
    'with it. Try asking about your vendors, spend, RFQs or invoices.',
};

function classifyIntent(message) {
  const m = message.trim();
  if (GREETING_RE.test(m)) return 'greeting';
  if (HELP_RE.test(m)) return 'help';
  return 'normal';
}

// Explicit procurement signal: a question mentioning these clearly belongs to
// our domain even if it embeds with a low score, so we skip the score-based
// refusal for it (the generation step + system prompt still keep it grounded).
const ERP_HINT_RE =
  /\b(vendor|supplier|rfq|quotation|quote|purchase\s*order|\bpo\b|invoice|payment|spend|budget|overdue|outstanding|gst(in)?|delivery|procure(ment)?|approval|award|shortlist|contract|tender)\b|[VQ]-\d{3,}|(RFQ|PO|INV)-\d/i;

function buildContext(chunks) {
  return chunks
    .map((c, i) => `[${i + 1}] (${c.source} ${c.sourceId}) ${c.text}`)
    .join('\n\n');
}

// Render recent chat turns so the model has conversational memory.
function buildHistory(history = []) {
  if (!history.length) return '';
  const turns = history
    .slice(-6)
    .map((m) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
    .join('\n');
  return `\n\nRecent conversation:\n${turns}`;
}

/**
 * Full RAG turn: retrieve context for `message`, generate a grounded answer.
 * @returns {Promise<{answer:string, sources:Array}>}
 */
async function answer({ message, history = [], owner }) {
  if (!enabled) {
    const e = new Error('Chat needs GEMINI_API_KEY for embeddings.');
    e.statusCode = 503;
    throw e;
  }
  if (!owner) {
    const e = new Error('Chat requires an authenticated user.');
    e.statusCode = 401;
    throw e;
  }

  // Layer 1 — zero-cost triage: greetings & "what can you do" never hit the API.
  const intent = classifyIntent(message);
  if (intent === 'greeting') return { answer: CANNED.greeting, sources: [], refused: false };
  if (intent === 'help') return { answer: CANNED.help, sources: [], refused: false };

  // Fresh scan: re-index THIS user's current records (new RFQs/POs/invoices get
  // picked up, deleted ones pruned) before we answer, so the chat reflects what
  // the account actually holds right now — not a stale first-run snapshot.
  // Incremental: unchanged records cost nothing thanks to the content-hash check.
  await reindex({ owner });

  // Layer 2 — scope gate: embed the question ONCE (cheap), then judge scope from
  // three independent signals. If none fire, refuse here and SKIP the expensive
  // generation call entirely. We also build the account snapshot in parallel so
  // analytical questions (totals/counts/rankings) can be answered accurately.
  const queryVector = await embeddings.embedOne(message, 'RETRIEVAL_QUERY');
  const [chunks, capScore, snapshot] = await Promise.all([
    retrieveByVector(queryVector, owner, 10),
    capabilityScore(queryVector),
    buildSnapshot(owner),
  ]);
  const dataScore = chunks[0]?.score ?? 0;
  const hasErpHint = ERP_HINT_RE.test(message);

  // In-scope if: matches a real record, OR matches a known capability, OR names
  // an explicit procurement term/code. Off-topic questions hit none of these.
  const inScope =
    hasErpHint || dataScore >= env.RAG_MIN_SCORE || capScore >= env.RAG_ANCHOR_MIN_SCORE;

  logger.debug(
    `RAG scope data=${dataScore.toFixed(3)} cap=${capScore.toFixed(3)} hint=${hasErpHint} ` +
      `=> ${inScope ? 'allow' : 'REFUSE'} :: "${message.slice(0, 60)}"`
  );

  if (!inScope) {
    return { answer: CANNED.outOfScope, sources: [], refused: true };
  }

  // Layer 3 — grounded generation (the system prompt is a final backstop).
  // The snapshot gives whole-account figures; the context gives specific records.
  const context = buildContext(chunks);
  const text = await ai.generateChat({
    system: SYSTEM,
    maxTokens: 1500,
    prompt:
      `${snapshot}\n\nCONTEXT (specific records):\n${context}` +
      `${buildHistory(history)}\n\nUser question: ${message}\n\nAnswer:`,
  });

  // De-duplicate sources for citation chips in the UI.
  const seen = new Set();
  const sources = [];
  for (const c of chunks) {
    const key = `${c.source}:${c.sourceId}`;
    if (!seen.has(key)) {
      seen.add(key);
      sources.push({ source: c.source, id: c.sourceId, title: c.title, score: Number(c.score?.toFixed?.(3) ?? 0) });
    }
  }

  return { answer: text, sources, refused: false };
}

async function stats() {
  const indexed = mongoose.connection.readyState === 1 ? await KnowledgeChunk.estimatedDocumentCount() : 0;
  return {
    enabled,
    indexed,
    backend: useAtlasVectorSearch ? 'atlas-vector-search' : 'cosine',
  };
}

module.exports = { enabled, reindex, retrieve, answer, stats };
