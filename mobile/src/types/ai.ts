/** AI feature contracts — mirror the server `aiController` response shapes. */

export interface AiStatus {
  enabled: boolean;
  chat: boolean;
  provider?: string;
  model?: string;
}

export type SourceKind = 'vendor' | 'rfq' | 'quotation' | 'purchaseOrder' | 'invoice';

export interface ChatSource {
  source: SourceKind;
  id: string;
  title?: string;
}

/** An action the assistant proposes (create_rfq / add_vendor). */
export interface ChatAction {
  tool: string;
  summary: string;
  [k: string]: unknown;
}

/** Result of confirming an action. */
export interface ActionResult {
  kind?: string;
  code?: string;
  title?: string;
  href?: string;
  message?: string;
}

export interface ChatAnswer {
  answer: string;
  sources?: ChatSource[];
  refused?: boolean;
  pendingAction?: ChatAction | null;
}

/** A rendered chat message (local UI state). */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  refused?: boolean;
  pendingAction?: ChatAction | null;
  actionStatus?: 'done' | 'cancelled';
  actionResult?: ActionResult;
}

export interface RfqDraftItem {
  name: string;
  qty: number;
  unit: string;
}
export interface RfqDraft {
  title: string;
  category: string;
  suggestedDueInDays: number;
  items: RfqDraftItem[];
  notes: string;
}

export interface CompareInsight {
  insight: string;
  recommendedQuotationId?: string;
}

export interface ReportSummary {
  summary: string;
  metrics?: Record<string, unknown>;
}

export type RiskLevel = 'low' | 'medium' | 'high';
export interface VendorRisk {
  score: number;
  level: RiskLevel;
  rationale: string;
  signals: string[];
  recommendations: string[];
}

export type AuditVerdict = 'pass' | 'review' | 'fail';
export interface InvoiceAudit {
  verdict: AuditVerdict | string;
  confidence?: number;
  duplicateSuspect?: boolean;
  findings: (string | { label?: string; detail?: string; severity?: string })[];
  summary: string;
}

/** Document extraction (invoice/quotation scan → structured fields). */
export interface ExtractedItem {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
}
export interface ExtractRequest {
  kind: 'invoice' | 'quotation';
  text?: string;
  image?: { media_type: string; data: string };
}
export interface ExtractResult {
  vendor: string;
  documentNumber: string;
  amount: number;
  taxAmount: number;
  deliveryDays: number;
  items: ExtractedItem[];
  notes: string;
}
