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
const { generateCode } = require('../utils/generateId');
const notify = require('./notificationService');

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

// Pull this organization's records and flatten into one array of
// {source, sourceId, title, text}. Scoped by `organization` so the knowledge
// base holds the whole workspace's data, shared across its members.
async function buildDocuments(organization) {
  const [vendors, rfqs, quotes, pos, invoices] = await Promise.all([
    Vendor.find({ organization }).lean(),
    RFQ.find({ organization }).lean(),
    Quotation.find({ organization }).lean(),
    PurchaseOrder.find({ organization }).lean(),
    Invoice.find({ organization }).lean(),
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

async function buildSnapshot(organization) {
  const [vendors, rfqs, quotes, pos, invoices] = await Promise.all([
    Vendor.find({ organization }).select('name code category status rating').lean(),
    RFQ.find({ organization }).select('code status').lean(),
    Quotation.find({ organization }).select('code status amount').lean(),
    PurchaseOrder.find({ organization }).select('code vendor amount status').lean(),
    Invoice.find({ organization }).select('code vendor amount amountPaid status due').lean(),
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

// One-time migration: drop the legacy global/per-owner unique indexes and purge
// any chunks that predate per-organization scoping (they get rebuilt on the next
// reindex). Runs at most once per process.
let _schemaFixed = false;
async function ensureOrgSchema() {
  if (_schemaFixed) return;
  _schemaFixed = true;
  try {
    const indexes = await KnowledgeChunk.collection.indexes();
    for (const name of ['source_1_sourceId_1', 'owner_1_source_1_sourceId_1']) {
      if (indexes.some((ix) => ix.name === name)) {
        await KnowledgeChunk.collection.dropIndex(name);
        logger.info(`RAG: dropped legacy index ${name} (chunks are now scoped per organization).`);
      }
    }
    // Chunks written before org scoping can't be served safely — drop them.
    const purged = await KnowledgeChunk.deleteMany({
      $or: [{ organization: { $exists: false } }, { organization: null }],
    });
    if (purged.deletedCount) {
      logger.info(`RAG: purged ${purged.deletedCount} pre-organization knowledge chunks.`);
    }
  } catch (err) {
    _schemaFixed = false; // let a later call retry if this one raced/failed
    logger.warn(`RAG org-schema migration skipped: ${err.message}`);
  }
}

/**
 * Re-embed and store one owner's knowledge base. Incremental: only records whose
 * text changed since last time are re-embedded. Orphaned chunks (records that
 * were deleted) are pruned. Returns a small summary for the API/UI.
 */
async function reindex({ organization, owner = null, force = false } = {}) {
  if (!enabled) {
    const e = new Error('Chat needs GEMINI_API_KEY for embeddings.');
    e.statusCode = 503;
    throw e;
  }
  if (!organization) {
    const e = new Error('reindex requires an organization.');
    e.statusCode = 400;
    throw e;
  }
  await ensureOrgSchema();

  const docs = await buildDocuments(organization);
  const existing = await KnowledgeChunk.find({ organization }).select('source sourceId contentHash').lean();
  const prevHash = new Map(existing.map((c) => [`${c.source}:${c.sourceId}`, c.contentHash]));
  const liveKeys = new Set(docs.map((d) => `${d.source}:${d.sourceId}`));

  // Only embed new or changed documents.
  const stale = docs.filter((d) => force || prevHash.get(`${d.source}:${d.sourceId}`) !== hash(d.text));

  let embedded = 0;
  if (stale.length) {
    const vectors = await embeddings.embedBatch(stale.map((d) => d.text), 'RETRIEVAL_DOCUMENT');
    const ops = stale.map((d, i) => ({
      updateOne: {
        filter: { organization, source: d.source, sourceId: d.sourceId },
        update: {
          $set: {
            organization,
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

  // Prune this org's chunks whose source record no longer exists.
  const orphans = existing.filter((c) => !liveKeys.has(`${c.source}:${c.sourceId}`));
  if (orphans.length) {
    await KnowledgeChunk.deleteMany({
      organization,
      $or: orphans.map((o) => ({ source: o.source, sourceId: o.sourceId })),
    });
  }

  const result = { total: docs.length, embedded, unchanged: docs.length - embedded, pruned: orphans.length };
  logger.info(
    `RAG reindex (org ${organization}): ${result.total} records, ${result.embedded} (re)embedded, ${result.pruned} pruned.`
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

// Native Atlas vector search, restricted to one organization's chunks. Throws if
// the index/feature isn't available, so the caller can fall back to cosine.
async function atlasSearch(queryVector, organization, k) {
  const rows = await KnowledgeChunk.aggregate([
    {
      $vectorSearch: {
        index: env.VECTOR_INDEX,
        path: 'embedding',
        queryVector,
        filter: { organization },
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
async function cosineSearch(queryVector, organization, k) {
  const chunks = await KnowledgeChunk.find({ organization, embedding: { $exists: true } })
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
// caller also needs the vector, e.g. for capability scoring). Org-scoped.
async function retrieveByVector(queryVector, organization, k = 6) {
  if (useAtlasVectorSearch) {
    try {
      const rows = await atlasSearch(queryVector, organization, k);
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
  return cosineSearch(queryVector, organization, k);
}

/**
 * Return the top-k knowledge chunks most relevant to `query` for one organization.
 * Re-scans the org's live records first so answers reflect current data.
 */
async function retrieve(query, organization, k = 6) {
  await reindex({ organization });
  const queryVector = await embeddings.embedOne(query, 'RETRIEVAL_QUERY');
  return retrieveByVector(queryVector, organization, k);
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

// ---------------------------------------------------------------------------
// Agentic actions — the assistant can DO things, not just answer. Each action
// is proposed via a tool call; the actual write happens only after the user
// confirms in the UI (see executeAction). This keeps the agent safe.
// ---------------------------------------------------------------------------

// Mirrors the category options in the create forms so the AI's choice maps to a
// real dropdown value.
const CATEGORIES = ['Office Furniture', 'Electronics', 'Raw Materials', 'IT Services', 'Travel', 'Medical', 'General'];

const AGENT_SYSTEM =
  '\n\nYou can also take actions for the user. When they clearly ask to CREATE/RAISE an RFQ ' +
  'or to ADD/REGISTER a vendor, call the matching tool with sensible values inferred from their ' +
  'request (and the data above). Do NOT call a tool for questions, lookups or summaries — answer ' +
  'those directly. The action is only PROPOSED; the user confirms before anything is saved, so it ' +
  'is safe to prepare it. After calling a tool, also write one short sentence telling the user what ' +
  'you prepared and that they can confirm it.';

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_rfq',
      description:
        'Prepare a new Request for Quotation (RFQ) for the user to confirm. Use when the user asks ' +
        'to create/raise/start an RFQ or request quotes for things to procure.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short, professional RFQ title' },
          category: { type: 'string', enum: CATEGORIES },
          suggestedDueInDays: { type: 'integer', description: 'Vendor response window in days (5-30)' },
          items: {
            type: 'array',
            description: 'Line items to procure',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                qty: { type: 'integer' },
                unit: { type: 'string', description: 'e.g. pcs, kg, units, licenses' },
              },
              required: ['name', 'qty', 'unit'],
            },
          },
          notes: { type: 'string', description: 'Optional specs/requirements for vendors' },
        },
        required: ['title', 'category', 'suggestedDueInDays', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_vendor',
      description:
        'Prepare a new vendor/supplier record for the user to confirm. Use when the user asks to ' +
        'add/create/register a vendor or supplier.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          location: { type: 'string' },
          contact: { type: 'string', description: 'Contact person name' },
          email: { type: 'string' },
          phone: { type: 'string' },
          gstin: { type: 'string' },
        },
        required: ['name', 'category'],
      },
    },
  },
];

// Human-friendly summary of a proposed action, shown on the confirm card.
function describeAction(tool, args) {
  if (tool === 'create_rfq') {
    const items = (args.items || []).map((it) => `${it.qty}× ${it.name}`).join(', ') || 'no items';
    return `Create RFQ "${args.title}" (${args.category}) — ${items}; vendors get ${args.suggestedDueInDays || 14} days.`;
  }
  if (tool === 'add_vendor') {
    return `Add vendor "${args.name}" (${args.category}${args.location ? `, ${args.location}` : ''}).`;
  }
  return 'Proposed action.';
}

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
async function answer({ message, history = [], organization, owner = null }) {
  if (!enabled) {
    const e = new Error('Chat needs GEMINI_API_KEY for embeddings.');
    e.statusCode = 503;
    throw e;
  }
  if (!organization) {
    const e = new Error('Chat requires an organization.');
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
  await reindex({ organization, owner });

  // Layer 2 — scope gate: embed the question ONCE (cheap), then judge scope from
  // three independent signals. If none fire, refuse here and SKIP the expensive
  // generation call entirely. We also build the account snapshot in parallel so
  // analytical questions (totals/counts/rankings) can be answered accurately.
  const queryVector = await embeddings.embedOne(message, 'RETRIEVAL_QUERY');
  const [chunks, capScore, snapshot] = await Promise.all([
    retrieveByVector(queryVector, organization, 10),
    capabilityScore(queryVector),
    buildSnapshot(organization),
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

  // De-duplicate sources for citation chips in the UI (computed up front so both
  // the answer and any action response can carry them).
  const seen = new Set();
  const sources = [];
  for (const c of chunks) {
    const key = `${c.source}:${c.sourceId}`;
    if (!seen.has(key)) {
      seen.add(key);
      sources.push({ source: c.source, id: c.sourceId, title: c.title, score: Number(c.score?.toFixed?.(3) ?? 0) });
    }
  }

  // Layer 3 — grounded generation. When Groq is configured we run an AGENTIC
  // turn: the model can either answer from the data, or PROPOSE an action
  // (create RFQ / add vendor) via a tool call that the user confirms. Without
  // Groq we fall back to the plain grounded answer (no actions).
  const context = buildContext(chunks);
  const userPrompt =
    `${snapshot}\n\nCONTEXT (specific records):\n${context}` +
    `${buildHistory(history)}\n\nUser request: ${message}`;

  if (!ai.groqEnabled) {
    const text = await ai.generateChat({
      system: SYSTEM,
      maxTokens: 1500,
      prompt: `${userPrompt}\n\nAnswer:`,
    });
    return { answer: text, sources, refused: false };
  }

  const msg = await ai.groqComplete({
    maxTokens: 1500,
    tools: TOOLS,
    messages: [
      { role: 'system', content: SYSTEM + AGENT_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
  });

  // Did the model propose an action? If so, return it for confirmation instead
  // of writing anything now.
  const call = msg.tool_calls?.find((c) => c.function?.name === 'create_rfq' || c.function?.name === 'add_vendor');
  if (call) {
    let args = {};
    try {
      args = JSON.parse(call.function.arguments || '{}');
    } catch {
      args = {};
    }
    const tool = call.function.name;
    const answerText =
      (msg.content && msg.content.trim()) ||
      `I've prepared this for you — review and confirm to save it.`;
    logger.info(`RAG agent proposed action: ${tool} for org ${organization}`);
    return {
      answer: answerText,
      sources,
      refused: false,
      pendingAction: { tool, args, summary: describeAction(tool, args) },
    };
  }

  return { answer: (msg.content || '').trim(), sources, refused: false };
}

// ---------------------------------------------------------------------------
// Execute a user-confirmed action (the write half of the agent). Owner-scoped
// and reusing the same models/codes as the normal controllers.
// ---------------------------------------------------------------------------
async function executeAction({ action, organization, owner, userId, userName }) {
  if (!organization) {
    const e = new Error('Action requires an organization.');
    e.statusCode = 401;
    throw e;
  }
  const tool = action?.tool;
  const args = action?.args || {};

  if (tool === 'create_rfq') {
    if (!args.title) {
      const e = new Error('The RFQ needs a title.');
      e.statusCode = 422;
      throw e;
    }
    const code = await generateCode(RFQ, { prefix: 'RFQ', year: true, pad: 3 });
    const days = Number(args.suggestedDueInDays) || 14;
    const rfq = await RFQ.create({
      code,
      title: args.title,
      category: args.category || 'General',
      status: 'Draft',
      due: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      items: (args.items || []).map((it) => ({ name: it.name, qty: Number(it.qty) || 1, unit: it.unit || 'units' })),
      notes: args.notes || '',
      organization,
      createdBy: owner,
    });
    await notify.record({
      userId,
      organization,
      actor: userName || 'Wolf AI',
      action: 'created',
      entityType: 'RFQ',
      entityId: code,
      message: `RFQ "${rfq.title}" (${code}) created via AI assistant`,
    });
    logger.info(`RAG agent created RFQ ${code} for owner ${owner}`);
    return { kind: 'rfq', code, title: rfq.title, href: `/rfqs/${code}`, message: `Created RFQ ${code} — "${rfq.title}". It's a draft you can review, invite vendors, and publish.` };
  }

  if (tool === 'add_vendor') {
    if (!args.name) {
      const e = new Error('The vendor needs a name.');
      e.statusCode = 422;
      throw e;
    }
    const code = await generateCode(Vendor, { prefix: 'V', start: 1001, pad: 4 });
    const vendor = await Vendor.create({
      code,
      name: args.name,
      category: args.category || 'General',
      status: 'Active',
      location: args.location || '',
      contact: args.contact || '',
      email: args.email || '',
      phone: args.phone || '',
      gstin: args.gstin || '',
      organization,
      createdBy: owner,
    });
    await notify.record({
      userId,
      organization,
      actor: userName || 'Wolf AI',
      action: 'created',
      entityType: 'Vendor',
      entityId: code,
      message: `Vendor ${vendor.name} (${code}) added via AI assistant`,
    });
    logger.info(`RAG agent added vendor ${code} for owner ${owner}`);
    return { kind: 'vendor', code, title: vendor.name, href: `/vendors/${code}`, message: `Added vendor ${code} — ${vendor.name}.` };
  }

  const e = new Error('Unknown action.');
  e.statusCode = 400;
  throw e;
}

async function stats() {
  const indexed = mongoose.connection.readyState === 1 ? await KnowledgeChunk.estimatedDocumentCount() : 0;
  return {
    enabled,
    indexed,
    backend: useAtlasVectorSearch ? 'atlas-vector-search' : 'cosine',
  };
}

module.exports = { enabled, reindex, retrieve, answer, executeAction, stats };
