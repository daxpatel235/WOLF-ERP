// The assistant's scope, defined explicitly.
//
// This is the single source of truth for "what Wolf AI is allowed to talk
// about". It is NOT a list of literal questions to string-match (language is
// infinite) — it's a finite set of CAPABILITIES, each with a few example
// phrasings. Those examples are embedded once at runtime and used as semantic
// "anchors": an incoming question is considered in-scope if it means something
// close to any anchor (or to the live data). So paraphrases you never wrote
// still match, and you stay in control of the domain by editing this file.
//
// To extend the assistant's scope, add a capability or more examples below.

const CAPABILITIES = [
  {
    id: 'vendor_lookup',
    label: 'Vendor details',
    examples: [
      'Show me details for vendor V-1003',
      'Tell me about Tata Steel',
      "What's the contact and GSTIN for this supplier?",
    ],
  },
  {
    id: 'vendor_risk',
    label: 'Vendor risk & ratings',
    examples: [
      'Which vendors are risky?',
      'Show me low-rated or unreliable suppliers',
      'Any vendors I should be cautious about?',
    ],
  },
  {
    id: 'top_vendors',
    label: 'Top vendors by spend / rating',
    examples: [
      'Who are my top vendors by spend?',
      'Which supplier do we spend the most with?',
      'Best rated vendors?',
    ],
  },
  {
    id: 'vendor_status',
    label: 'Vendor status',
    examples: ['Which vendors are inactive?', 'Show me pending or unapproved vendors'],
  },
  {
    id: 'overdue_invoices',
    label: 'Overdue invoices',
    examples: [
      'Which invoices are overdue?',
      'Show me late or unpaid bills',
      'What payments are past due, and by how much?',
    ],
  },
  {
    id: 'outstanding_payments',
    label: 'Outstanding / owed amounts',
    examples: [
      'How much do we owe in total?',
      "What's our outstanding payable balance?",
      'How much is still unpaid to Godrej Interio?',
    ],
  },
  {
    id: 'invoice_status',
    label: 'Invoice status',
    examples: [
      "What's the status of invoice INV-2025-088?",
      'Show me unpaid or partially paid invoices',
      'Which invoices are still in draft?',
    ],
  },
  {
    id: 'duplicate_payments',
    label: 'Duplicate-payment risk',
    examples: ['Are there any duplicate invoices?', 'Is there a double-payment risk to review?'],
  },
  {
    id: 'rfq_status',
    label: 'RFQ status',
    examples: ["What's the status of RFQ-2025-042?", 'Show me closed or awarded RFQs'],
  },
  {
    id: 'open_rfqs',
    label: 'Open RFQs',
    examples: [
      'Summarise the open RFQs',
      'Which RFQs are still accepting quotes?',
      'What RFQs are due soon?',
    ],
  },
  {
    id: 'quotation_compare',
    label: 'Quotation comparison',
    examples: [
      'Compare the quotes for RFQ-2025-042',
      'Which vendor quoted the lowest price?',
      'Which quotation should we award?',
    ],
  },
  {
    id: 'po_status',
    label: 'Purchase order status',
    examples: [
      "What's the status of PO-2025-021?",
      'Show me pending purchase orders',
      'Which POs are awaiting approval?',
    ],
  },
  {
    id: 'spend_by_category',
    label: 'Spend by category',
    examples: ['How much did we spend on Electronics?', 'Break down our spend by category'],
  },
  {
    id: 'spend_overview',
    label: 'Procurement overview / KPIs',
    examples: [
      "What's our total spend?",
      'Give me a procurement summary',
      'How are we doing on procurement this quarter?',
    ],
  },
  {
    id: 'delivery_timelines',
    label: 'Deliveries & timelines',
    examples: ['Which orders are arriving late?', 'What are the delivery dates for my open POs?'],
  },
  {
    id: 'approvals',
    label: 'Approvals',
    examples: ["What's pending my approval?", 'Show me items awaiting approval'],
  },
];

// Flat list of every anchor example (used to build the embedding anchors).
function anchorTexts() {
  return CAPABILITIES.flatMap((c) => c.examples);
}

// A few good starter prompts for the empty chat state / suggestions.
const SUGGESTIONS = [
  'Which invoices are overdue?',
  'Who are my top vendors by spend?',
  'Summarise the open RFQs',
  'Any vendors I should be cautious about?',
];

// Human-readable capability list for the "what can you do?" reply.
function helpText() {
  const lines = CAPABILITIES.map((c) => `- ${c.label}`).join('\n');
  return (
    'I answer questions grounded in your own Wolf ERP data. I can help with:\n' +
    lines +
    "\n\nFor example: \"Which invoices are overdue?\" or \"Who are my top vendors by spend?\"\n" +
    "I can't help with topics outside your procurement data (weather, news, coding, general knowledge)."
  );
}

module.exports = { CAPABILITIES, anchorTexts, SUGGESTIONS, helpText };
