/**
 * Data access layer. Serves the in-memory mock dataset today; flip `USE_LIVE`
 * and wire the live calls to point every screen at the real `server/` API
 * without touching a component — they all go through these methods.
 */
import { API_URL, live } from './live';
import * as fx from './mock/fixtures';
import type {
  AiStatus,
  ChatAction,
  ChatAnswer,
  ActionResult,
  RfqDraft,
  CompareInsight,
  ReportSummary,
  VendorRisk,
  InvoiceAudit,
  ExtractRequest,
  ExtractResult,
} from '@/types/ai';
import type {
  Approval,
  CategorySpend,
  DashboardSummary,
  DocStatus,
  Invoice,
  LineItem,
  Money,
  Page,
  Priority,
  PurchaseOrder,
  QuoteCompare,
  Quotation,
  Rfq,
  Vendor,
  VendorSpend,
} from '@/types/domain';

/**
 * Use the real backend when a base URL is resolved. `API_URL` is pinned to the
 * production server in any release build (see live.ts), so the mock dataset is
 * reachable ONLY in development — a shipped app always talks to the live API.
 */
export const USE_LIVE = !!API_URL;
// Yield to the event loop so callers stay async, but without the artificial lag
// that made every mock screen feel sluggish (was 90ms on every single call).
const tick = () => Promise.resolve();
const inr = (amount: number): Money => ({ amount, currency: 'INR' });

function paginate<T>(all: T[], cursor: number, limit: number): Page<T> {
  const start = cursor * limit;
  const items = all.slice(start, start + limit);
  return { items, nextCursor: start + limit < all.length ? cursor + 1 : null, total: all.length };
}

export interface ListParams {
  cursor?: number;
  limit?: number;
  query?: string;
  status?: DocStatus | 'all';
}

function textFilter<T>(list: T[], q: string | undefined, fields: (keyof T)[]) {
  const s = q?.trim().toLowerCase();
  if (!s) return list;
  return list.filter((d) => fields.some((f) => String(d[f] ?? '').toLowerCase().includes(s)));
}

const mock = {
  // ---- Dashboard / reports ----
  async dashboard(): Promise<DashboardSummary> {
    await tick();
    return fx.dashboard;
  },
  async spendByCategory(): Promise<CategorySpend[]> {
    await tick();
    return fx.spendByCategory;
  },
  async spendByVendor(): Promise<VendorSpend[]> {
    await tick();
    return fx.spendByVendor;
  },

  // ---- Purchase orders ----
  async purchaseOrders(params: ListParams = {}): Promise<Page<PurchaseOrder>> {
    await tick();
    let list = fx.purchaseOrders;
    if (params.status && params.status !== 'all') list = list.filter((p) => p.status === params.status);
    list = textFilter(list, params.query, ['number', 'vendorName']);
    return paginate(list, params.cursor ?? 0, params.limit ?? 20);
  },
  async purchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    await tick();
    return fx.purchaseOrders.find((p) => p.id === id);
  },
  async createPurchaseOrder(input: {
    vendorId: string;
    priority: Priority;
    expectedAt: string;
    items: LineItem[];
    notes?: string;
  }): Promise<PurchaseOrder> {
    await tick();
    const vendor = fx.vendors.find((v) => v.id === input.vendorId)!;
    const total = input.items.reduce((s, it) => s + it.quantity * it.unitPrice.amount, 0);
    const po: PurchaseOrder = {
      id: `po${fx.purchaseOrders.length + 1}`,
      number: `PO-${2000 + fx.purchaseOrders.length}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: 'draft',
      priority: input.priority,
      total: inr(total),
      createdAt: new Date().toISOString(),
      expectedAt: input.expectedAt,
      items: input.items,
      notes: input.notes,
    };
    fx.purchaseOrders.unshift(po);
    return po;
  },
  async setPurchaseOrderStatus(id: string, status: DocStatus): Promise<PurchaseOrder> {
    await tick();
    const po = fx.purchaseOrders.find((p) => p.id === id)!;
    po.status = status;
    return po;
  },

  // ---- Invoices ----
  async invoices(params: ListParams = {}): Promise<Page<Invoice>> {
    await tick();
    let list = fx.invoices;
    if (params.status && params.status !== 'all') list = list.filter((i) => i.status === params.status);
    list = textFilter(list, params.query, ['number', 'vendorName']);
    return paginate(list, params.cursor ?? 0, params.limit ?? 20);
  },
  async invoice(id: string): Promise<Invoice | undefined> {
    await tick();
    return fx.invoices.find((i) => i.id === id);
  },
  async createInvoice(input: {
    vendorId: string;
    poId?: string;
    dueAt: string;
    items: LineItem[];
  }): Promise<Invoice> {
    await tick();
    const vendor = fx.vendors.find((v) => v.id === input.vendorId)!;
    const subtotal = input.items.reduce((s, it) => s + it.quantity * it.unitPrice.amount, 0);
    const gst = Math.round(subtotal * 0.18);
    const po = input.poId ? fx.purchaseOrders.find((p) => p.id === input.poId) : undefined;
    const inv: Invoice = {
      id: `inv${fx.invoices.length + 1}`,
      number: `INV-${4500 + fx.invoices.length}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      poId: po?.id,
      poNumber: po?.number,
      status: 'draft',
      subtotal: inr(subtotal),
      gst: inr(gst),
      total: inr(subtotal + gst),
      amountPaid: inr(0),
      issuedAt: new Date().toISOString(),
      dueAt: input.dueAt,
      items: input.items,
    };
    fx.invoices.unshift(inv);
    return inv;
  },
  async payInvoice(id: string): Promise<Invoice> {
    await tick();
    const inv = fx.invoices.find((i) => i.id === id)!;
    inv.status = 'paid';
    inv.amountPaid = inv.total;
    return inv;
  },

  // ---- Quotations ----
  async quotations(params: ListParams = {}): Promise<Page<Quotation>> {
    await tick();
    let list = fx.quotations;
    if (params.status && params.status !== 'all') list = list.filter((q) => q.status === params.status);
    list = textFilter(list, params.query, ['number', 'vendorName', 'rfqNumber']);
    return paginate(list, params.cursor ?? 0, params.limit ?? 20);
  },
  async quotation(id: string): Promise<Quotation | undefined> {
    await tick();
    return fx.quotations.find((q) => q.id === id);
  },
  async setQuotationStatus(id: string, status: DocStatus): Promise<Quotation> {
    await tick();
    const q = fx.quotations.find((x) => x.id === id)!;
    q.status = status;
    return q;
  },
  /** Award a quote → mark it awarded, reject siblings, draft a PO. */
  async awardQuotation(id: string): Promise<{ quotation: Quotation; po: PurchaseOrder }> {
    await tick();
    const q = fx.quotations.find((x) => x.id === id)!;
    q.status = 'awarded';
    fx.quotations.filter((x) => x.rfqId === q.rfqId && x.id !== id).forEach((x) => (x.status = 'rejected'));
    const po = await this.createPurchaseOrder({
      vendorId: q.vendorId,
      priority: 'medium',
      expectedAt: q.validUntil,
      items: q.items,
      notes: `Awarded from ${q.number} (${q.rfqNumber})`,
    });
    return { quotation: q, po };
  },
  async compareQuotes(rfqId: string): Promise<QuoteCompare | null> {
    await tick();
    const rfq = fx.rfqs.find((r) => r.id === rfqId);
    if (!rfq) return null;
    const quotes = fx.quotations.filter((q) => q.rfqId === rfqId);
    const itemNames = rfq.items.map((it) => it.name);
    const vendors = quotes.map((q) => ({
      quotationId: q.id,
      vendor: q.vendorName,
      amount: q.total.amount,
      deliveryDays: q.deliveryDays,
      status: q.status,
      prices: Object.fromEntries(q.items.map((it) => [it.description, it.quantity * it.unitPrice.amount])),
    }));
    return {
      rfqId,
      rfqTitle: rfq.title,
      itemNames,
      vendors,
      summary: {
        lowestAmount: Math.min(...vendors.map((v) => v.amount), Infinity),
        fastestDeliveryDays: Math.min(...vendors.map((v) => v.deliveryDays), Infinity),
      },
    };
  },
  /** RFQ ids that have quotes — for the compare picker. */
  async comparableRfqs(): Promise<{ id: string; number: string; title: string }[]> {
    await tick();
    const ids = [...new Set(fx.quotations.map((q) => q.rfqId))];
    return ids
      .map((id) => fx.rfqs.find((r) => r.id === id))
      .filter((r): r is Rfq => !!r)
      .map((r) => ({ id: r.id, number: r.number, title: r.title }));
  },

  // ---- RFQs ----
  async rfqs(params: ListParams = {}): Promise<Page<Rfq>> {
    await tick();
    let list = fx.rfqs;
    if (params.status && params.status !== 'all') list = list.filter((r) => r.status === params.status);
    list = textFilter(list, params.query, ['number', 'title', 'category']);
    return paginate(list, params.cursor ?? 0, params.limit ?? 20);
  },
  async rfq(id: string): Promise<{ rfq: Rfq; quotes: Quotation[] } | undefined> {
    await tick();
    const rfq = fx.rfqs.find((r) => r.id === id);
    if (!rfq) return undefined;
    return { rfq, quotes: fx.quotations.filter((q) => q.rfqId === id) };
  },
  async createRfq(input: {
    title: string;
    category: string;
    dueAt: string;
    items: { name: string; quantity: number; unit: string }[];
    invitedVendorIds: string[];
    notes?: string;
  }): Promise<Rfq> {
    await tick();
    const rfq: Rfq = {
      id: `rfq${fx.rfqs.length + 1}`,
      number: `RFQ-${300 + fx.rfqs.length}`,
      title: input.title,
      category: input.category,
      status: 'published',
      vendorCount: input.invitedVendorIds.length,
      responsesCount: 0,
      dueAt: input.dueAt,
      createdAt: new Date().toISOString(),
      items: input.items,
      notes: input.notes,
    };
    fx.rfqs.unshift(rfq);
    return rfq;
  },

  // ---- Vendors ----
  async vendors(params: ListParams = {}): Promise<Page<Vendor>> {
    await tick();
    let list = fx.vendors;
    if (params.status && params.status !== 'all') list = list.filter((v) => v.status === params.status);
    list = textFilter(list, params.query, ['name', 'category', 'city', 'contact']);
    return paginate(list, params.cursor ?? 0, params.limit ?? 20);
  },
  async vendor(id: string): Promise<{ vendor: Vendor; purchaseOrders: PurchaseOrder[]; invoices: Invoice[] } | undefined> {
    await tick();
    const vendor = fx.vendors.find((v) => v.id === id);
    if (!vendor) return undefined;
    return {
      vendor,
      purchaseOrders: fx.purchaseOrders.filter((p) => p.vendorId === id).slice(0, 10),
      invoices: fx.invoices.filter((i) => i.vendorId === id).slice(0, 10),
    };
  },
  async createVendor(input: Omit<Vendor, 'id' | 'logoColor' | 'orders' | 'openOrders' | 'onTimeRate' | 'totalSpend' | 'rating'>): Promise<Vendor> {
    await tick();
    const vendor: Vendor = {
      ...input,
      id: `v${fx.vendors.length + 1}`,
      logoColor: '#2563EB',
      orders: 0,
      openOrders: 0,
      onTimeRate: 1,
      rating: 0,
      totalSpend: inr(0),
    };
    fx.vendors.unshift(vendor);
    return vendor;
  },

  // ---- Approvals ----
  async approvals(): Promise<{ pending: Approval[]; decided: Approval[] }> {
    await tick();
    return {
      pending: fx.approvals.filter((a) => a.status === 'pending'),
      decided: fx.approvals.filter((a) => a.status !== 'pending'),
    };
  },
  async decideApproval(id: string, decision: 'approved' | 'rejected'): Promise<Approval> {
    await tick();
    const item = fx.approvals.find((a) => a.id === id)!;
    item.status = decision;
    item.decidedAt = new Date().toISOString();
    return item;
  },

  // ---- Activity ----
  async activity(params: ListParams = {}) {
    await tick();
    return paginate(fx.activity, params.cursor ?? 0, params.limit ?? 25);
  },

  // ---- Global search ----
  async search(query: string) {
    await tick();
    const q = query.trim().toLowerCase();
    if (!q) return { vendors: [], purchaseOrders: [], rfqs: [], quotations: [], invoices: [] };
    return {
      vendors: fx.vendors.filter((v) => `${v.name} ${v.id} ${v.category}`.toLowerCase().includes(q)).slice(0, 4),
      purchaseOrders: fx.purchaseOrders.filter((p) => `${p.vendorName} ${p.number}`.toLowerCase().includes(q)).slice(0, 4),
      rfqs: fx.rfqs.filter((r) => `${r.title} ${r.number} ${r.category}`.toLowerCase().includes(q)).slice(0, 4),
      quotations: fx.quotations.filter((qt) => `${qt.vendorName} ${qt.number} ${qt.rfqTitle}`.toLowerCase().includes(q)).slice(0, 4),
      invoices: fx.invoices.filter((i) => `${i.vendorName} ${i.number}`.toLowerCase().includes(q)).slice(0, 4),
    };
  },

  // ---- AI ---- (disabled offline; UI hides AI affordances when status.enabled is false)
  ai: {
    status: async (): Promise<AiStatus> => ({ enabled: false, chat: false }),
    chat: async (_message: string, _history: { role: string; content: string }[]): Promise<ChatAnswer> => {
      throw new Error('AI is only available with a live backend.');
    },
    act: async (_action: ChatAction): Promise<ActionResult> => {
      throw new Error('AI is only available with a live backend.');
    },
    draftRfq: async (_prompt: string): Promise<RfqDraft> => {
      throw new Error('AI is only available with a live backend.');
    },
    comparisonInsight: async (_rfqId: string): Promise<CompareInsight> => {
      throw new Error('AI is only available with a live backend.');
    },
    reportSummary: async (): Promise<ReportSummary> => {
      throw new Error('AI is only available with a live backend.');
    },
    vendorRisk: async (_id: string): Promise<VendorRisk> => {
      throw new Error('AI is only available with a live backend.');
    },
    invoiceAudit: async (_id: string): Promise<InvoiceAudit> => {
      throw new Error('AI is only available with a live backend.');
    },
    extract: async (_body: ExtractRequest): Promise<ExtractResult> => {
      throw new Error('AI is only available with a live backend.');
    },
  },
};

export type Api = typeof mock;

/** Single entry point every hook uses. Swaps mock↔live without touching screens. */
export const api: Api = USE_LIVE ? (live as unknown as Api) : mock;
