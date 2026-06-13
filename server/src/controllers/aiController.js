// AI feature endpoints (mounted at /api/ai).
//
// Each handler gathers the relevant procurement data, hands it to the AI
// wrapper in services/aiService, and returns a clean JSON envelope. Grouped by
// the integration "level" described in the AI roadmap:
//   Level 1 (assistive): draftRfq, comparisonInsight, reportSummary
//   Level 2 (analytical): extractDocument, vendorRisk, invoiceAudit

const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../middleware/errorHandler');
const env = require('../config/env');
const ai = require('../services/aiService');
const rag = require('../services/ragService');
const { compareRfq } = require('../services/comparisonService');
const notify = require('../services/notificationService');
const { createRateLimiter } = require('../utils/rateLimiter');

// Per-user cap on chat messages to bound AI spend (see env.RAG_RATE_*).
const chatLimiter = createRateLimiter({ max: env.RAG_RATE_MAX, windowMs: env.RAG_RATE_WINDOW_MS });

// Mirrors the category options in the "Create RFQ" form so the AI's choice
// always maps onto a real dropdown value.
const RFQ_CATEGORIES = ['Office Furniture', 'Electronics', 'Raw Materials', 'IT Services', 'Travel', 'Medical'];

// GET /api/ai/status — lets the UI hide AI affordances when unconfigured.
const status = (_req, res) =>
  res.json({
    enabled: ai.enabled,
    provider: ai.provider,
    model: ai.enabled ? ai.model : null,
    chat: rag.enabled, // Level 3 RAG chat availability
  });

// ----------------------------------------------------------------------------
// Level 1 — Assistive
// ----------------------------------------------------------------------------

// POST /api/ai/rfq/draft  { prompt }
// Turn a plain-English need into a structured RFQ draft.
const draftRfq = asyncHandler(async (req, res) => {
  const prompt = (req.body.prompt || '').trim();
  if (!prompt) return res.status(422).json({ message: 'Describe what you need to procure.' });

  const draft = await ai.generateJSON({
    system:
      'You are a procurement assistant for an Indian organisation. Turn a buyer\'s plain-English request ' +
      'into a structured Request for Quotation. Infer sensible line items with quantities. Keep titles short ' +
      'and professional. Use Indian context (₹, GST) where relevant. Never invent prices.',
    prompt: `Buyer's request:\n"""${prompt}"""\n\nProduce an RFQ draft.`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', description: 'Short RFQ title, e.g. "Office furniture — 3rd floor refit"' },
        category: { type: 'string', enum: RFQ_CATEGORIES },
        suggestedDueInDays: { type: 'integer', description: 'Reasonable vendor response window in days (5-30)' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              qty: { type: 'integer' },
              unit: { type: 'string', description: 'e.g. pcs, kg, units, licenses' },
            },
            required: ['name', 'qty', 'unit'],
          },
        },
        notes: { type: 'string', description: 'Specs/requirements to include for vendors. May be empty.' },
      },
      required: ['title', 'category', 'suggestedDueInDays', 'items', 'notes'],
    },
  });

  res.json({ data: draft });
});

// POST /api/ai/quotations/insight  { rfqId }
// Narrative award recommendation on top of the structured comparison.
const comparisonInsight = asyncHandler(async (req, res) => {
  const rfqId = (req.body.rfqId || '').trim();
  if (!rfqId) return res.status(422).json({ message: 'rfqId is required.' });

  const cmp = await compareRfq(rfqId);
  if (!cmp.vendors.length) {
    return res.status(404).json({ message: 'No quotations to analyse for this RFQ.' });
  }

  const insight = await ai.generateText({
    thinking: true,
    maxTokens: 1200,
    system:
      'You are a procurement analyst. Given a side-by-side quotation comparison, write a concise award ' +
      'recommendation for a buyer. Weigh price, delivery time and any trade-offs. Be specific with numbers ' +
      '(amounts in ₹, delivery in days). 3-5 short sentences. End with a clear recommended vendor. ' +
      'Do not use markdown headers; plain sentences only.',
    prompt: `Comparison data (JSON):\n${JSON.stringify(cmp, null, 2)}`,
  });

  res.json({ data: { insight, recommendedQuotationId: cmp.summary.recommendedQuotationId } });
});

// GET /api/ai/reports/summary
// Plain-English executive summary of current procurement KPIs.
const reportSummary = asyncHandler(async (_req, res) => {
  const SPENDABLE = ['Approved', 'Sent', 'Received'];
  const [vendors, activeVendors, rfqs, openRfqs, pos, invoices, topVendors] = await Promise.all([
    Vendor.countDocuments(),
    Vendor.countDocuments({ status: 'Active' }),
    RFQ.countDocuments(),
    RFQ.countDocuments({ status: 'Published' }),
    PurchaseOrder.find().select('amount status vendorId vendor').lean(),
    Invoice.find().select('amount amountPaid status').lean(),
    PurchaseOrder.find({ status: { $in: SPENDABLE } }).select('vendor amount').lean(),
  ]);

  const totalSpend = pos.filter((p) => SPENDABLE.includes(p.status)).reduce((t, p) => t + (p.amount || 0), 0);
  const outstanding = invoices
    .filter((i) => !['Paid', 'Cancelled', 'Draft'].includes(i.status))
    .reduce((t, i) => t + ((i.amount || 0) - (i.amountPaid || 0)), 0);
  const overdue = invoices.filter((i) => i.status === 'Overdue').length;

  const byVendor = {};
  topVendors.forEach((p) => (byVendor[p.vendor] = (byVendor[p.vendor] || 0) + (p.amount || 0)));
  const top = Object.entries(byVendor).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([vendor, amount]) => ({ vendor, amount }));

  const metrics = {
    vendors: { total: vendors, active: activeVendors },
    rfqs: { total: rfqs, open: openRfqs },
    purchaseOrders: { count: pos.length, totalSpend },
    invoices: { total: invoices.length, outstanding, overdue },
    topVendorsBySpend: top,
  };

  const summary = await ai.generateText({
    maxTokens: 900,
    system:
      'You are a procurement reporting assistant. Given KPI metrics, write a brief executive summary for ' +
      'leadership: 3-4 sentences covering spend, vendor concentration, and anything that needs attention ' +
      '(e.g. overdue invoices, large outstanding amounts). Amounts are Indian Rupees (₹). Be direct and ' +
      'factual; do not invent data not present. Plain prose, no markdown headers.',
    prompt: `KPI metrics (JSON):\n${JSON.stringify(metrics, null, 2)}`,
  });

  res.json({ data: { summary, metrics } });
});

// ----------------------------------------------------------------------------
// Level 2 — Analytical / Predictive
// ----------------------------------------------------------------------------

// POST /api/ai/extract  { kind: 'invoice'|'quotation', text?, image?: {media_type, data} }
// Pull structured line items out of a pasted document or a scanned image.
const extractDocument = asyncHandler(async (req, res) => {
  const kind = req.body.kind === 'quotation' ? 'quotation' : 'invoice';
  const text = (req.body.text || '').trim();
  const image = req.body.image && req.body.image.data ? req.body.image : null;
  if (!text && !image) {
    return res.status(422).json({ message: 'Paste the document text or attach an image to extract.' });
  }

  const data = await ai.generateJSON({
    images: image ? [image] : [],
    maxTokens: 4096,
    system:
      `You are a data-entry assistant for a procurement team. Extract the ${kind} details from the supplied ` +
      'document (text and/or image) into the schema. Amounts are numbers only (no currency symbols/commas). ' +
      'unitPrice and qty are per line item. If a field is absent, use an empty string or 0 — never guess. ' +
      'Indian invoices: GST/tax may appear; capture the grand total as "amount".',
    prompt: text ? `Document text:\n"""${text}"""` : 'Extract the details from the attached image.',
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        vendor: { type: 'string' },
        documentNumber: { type: 'string', description: 'Invoice/quote number if present' },
        amount: { type: 'number', description: 'Grand total' },
        taxAmount: { type: 'number' },
        deliveryDays: { type: 'integer', description: 'Quotations only; 0 if absent' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              qty: { type: 'number' },
              unit: { type: 'string' },
              unitPrice: { type: 'number' },
            },
            required: ['name', 'qty', 'unit', 'unitPrice'],
          },
        },
        notes: { type: 'string' },
      },
      required: ['vendor', 'documentNumber', 'amount', 'taxAmount', 'deliveryDays', 'items', 'notes'],
    },
  });

  res.json({ data });
});

// GET /api/ai/vendors/:id/risk
// Score a vendor's reliability/risk from their history.
const vendorRisk = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ code: req.params.id });
  if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });

  const [quotes, pos, invoices, activity] = await Promise.all([
    Quotation.find({ vendorId: vendor.code }).select('amount deliveryDays status submitted').lean(),
    PurchaseOrder.find({ vendorId: vendor.code }).select('amount status created delivery').lean(),
    Invoice.find({ vendorId: vendor.code }).select('amount amountPaid status due').lean(),
    ActivityLog.find({ entityType: 'Vendor', entityId: vendor.code }).select('action message createdAt').sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  const profile = {
    vendor: { name: vendor.name, category: vendor.category, status: vendor.status, rating: vendor.rating, since: vendor.createdAt },
    quotations: { count: quotes.length, awarded: quotes.filter((q) => q.status === 'Awarded').length },
    purchaseOrders: pos.map((p) => ({ status: p.status, amount: p.amount })),
    invoices: invoices.map((i) => ({ status: i.status, amount: i.amount, outstanding: (i.amount || 0) - (i.amountPaid || 0) })),
    recentActivity: activity.map((a) => a.message),
  };

  const data = await ai.generateJSON({
    thinking: true,
    maxTokens: 1500,
    system:
      'You are a procurement risk analyst. Assess a vendor\'s reliability from their transaction history. ' +
      'Consider: win rate, on-time delivery signals, overdue/unpaid invoices, rating, account status, and ' +
      'spend concentration. Return a 0-100 risk score (higher = riskier), a level, and concrete signals. ' +
      'Base everything strictly on the data provided; if history is thin, say so and keep the score moderate.',
    prompt: `Vendor profile (JSON):\n${JSON.stringify(profile, null, 2)}`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        score: { type: 'integer', description: '0-100, higher = riskier' },
        level: { type: 'string', enum: ['low', 'medium', 'high'] },
        rationale: { type: 'string', description: '2-3 sentence summary' },
        signals: { type: 'array', items: { type: 'string' }, description: 'Specific positive/negative signals' },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['score', 'level', 'rationale', 'signals', 'recommendations'],
    },
  });

  res.json({ data });
});

// GET /api/ai/invoices/:id/audit
// 3-way match (invoice vs PO) + duplicate detection.
const invoiceAudit = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ code: req.params.id });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

  const po = invoice.poId ? await PurchaseOrder.findOne({ code: invoice.poId }).lean() : null;

  // Cheap duplicate heuristic: same vendor + amount on a different invoice.
  const possibleDuplicates = await Invoice.find({
    code: { $ne: invoice.code },
    vendorId: invoice.vendorId,
    amount: invoice.amount,
  }).select('code issued status').lean();

  const bundle = {
    invoice: {
      code: invoice.code, vendor: invoice.vendor, amount: invoice.amount,
      status: invoice.status, items: invoice.items, poId: invoice.poId,
    },
    purchaseOrder: po
      ? { code: po.code, vendor: po.vendor, amount: po.amount, status: po.status, items: po.items }
      : null,
    possibleDuplicateInvoices: possibleDuplicates.map((d) => d.code),
  };

  const data = await ai.generateJSON({
    thinking: true,
    maxTokens: 1500,
    system:
      'You are an accounts-payable auditor. Perform a 3-way style match between an invoice and its purchase ' +
      'order. Flag mismatches in total amount, line items, quantities, and any missing PO link. Treat the ' +
      'listed possibleDuplicateInvoices as a duplicate-payment risk. Verdict: "pass" (safe to pay), ' +
      '"review" (minor issues), or "fail" (serious mismatch/duplicate). Base findings only on the data.',
    prompt: `Audit bundle (JSON):\n${JSON.stringify(bundle, null, 2)}`,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        verdict: { type: 'string', enum: ['pass', 'review', 'fail'] },
        confidence: { type: 'integer', description: '0-100' },
        duplicateSuspect: { type: 'boolean' },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              severity: { type: 'string', enum: ['info', 'warning', 'critical'] },
              message: { type: 'string' },
            },
            required: ['severity', 'message'],
          },
        },
        summary: { type: 'string' },
      },
      required: ['verdict', 'confidence', 'duplicateSuspect', 'findings', 'summary'],
    },
  });

  // Best-effort audit trail.
  await notify.record({
    userId: req.user?._id,
    actor: req.user?.name || 'AI',
    action: 'audited',
    entityType: 'Invoice',
    entityId: invoice.code,
    message: `AI audit on ${invoice.code}: ${data.verdict}`,
  });

  res.json({ data });
});

// ----------------------------------------------------------------------------
// Level 3 — Conversational / RAG
// ----------------------------------------------------------------------------

// POST /api/ai/chat  { message, history?: [{role, content}] }
// Grounded Q&A over the organisation's own procurement data.
const chat = asyncHandler(async (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message) return res.status(422).json({ message: 'Ask a question to get started.' });
  if (message.length > 2000) return res.status(422).json({ message: 'Question is too long.' });

  // Cost control: cap messages per user per window.
  const gate = chatLimiter(String(req.user._id));
  if (!gate.ok) {
    return res.status(429).json({
      message: `You've hit the chat limit. Please wait ${Math.ceil(gate.retryMs / 1000)}s and try again.`,
    });
  }

  // Only accept a small, well-formed slice of prior turns from the client.
  const history = Array.isArray(req.body.history)
    ? req.body.history
        .filter((m) => m && typeof m.content === 'string')
        .slice(-8)
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content.slice(0, 2000) }))
    : [];

  const result = await rag.answer({ message, history });
  res.json({ data: result });
});

// POST /api/ai/chat/reindex  { force?: boolean }
// Rebuild the knowledge base (embeddings). Admins/managers only.
const reindex = asyncHandler(async (req, res) => {
  const result = await rag.reindex({ force: Boolean(req.body?.force) });
  res.json({ data: result });
});

module.exports = {
  status,
  draftRfq,
  comparisonInsight,
  reportSummary,
  extractDocument,
  vendorRisk,
  invoiceAudit,
  chat,
  reindex,
};
