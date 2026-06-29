/**
 * Live data layer — talks to the real `server/` Express API and maps its JSON
 * (Mongo `code` ids, Title-Case statuses, money-as-number, `{data}` envelopes)
 * onto the mobile domain types. Implements the SAME method surface as the mock
 * `api`, so screens/hooks never change. Selected at runtime in `client.ts` when
 * `EXPO_PUBLIC_API_URL` is set.
 */
import { secureStorage } from '@/store/storage';
import type {
  AiStatus,
  ChatAnswer,
  ActionResult,
  ChatAction,
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
  Quotation,
  QuoteCompare,
  Rfq,
  Vendor,
  VendorSpend,
} from '@/types/domain';
import type { ListParams } from './client';

const TOKEN_KEY = 'wolf.auth.token';
// Free-tier hosts (e.g. Render) cold-start in ~30–60s after idling. Keep the
// timeout above that window so the very first request can complete on its first
// attempt instead of aborting at 35s and paying for a whole second attempt.
const REQUEST_TIMEOUT_MS = 60000;

// Hardcoded production backend. Release (Play Store / TestFlight) builds must
// NEVER fall back to the in-app mock data or accept-any-password sign-in, so if
// no EXPO_PUBLIC_API_URL is baked in we still pin the live API. A production
// .env / eas.json `env` block can override it. Dev builds stay on the mock
// unless EXPO_PUBLIC_API_URL is explicitly set.
const PRODUCTION_API_URL = 'https://wolf-erp-api.onrender.com/api';
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_URL = configuredApiUrl || (__DEV__ ? '' : PRODUCTION_API_URL);

/**
 * Fire-and-forget ping to start waking a sleeping backend the moment the app
 * launches — overlaps the cold start with the splash/login screen so the first
 * real screen loads fast. Safe to call when there's no backend (no-ops).
 */
export function warmUp(): void {
  if (!API_URL) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  fetch(`${API_URL}/ai/status`, { signal: controller.signal })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
}

const inr = (amount: number): Money => ({ amount: Number(amount) || 0, currency: 'INR' });

// ---- HTTP wrapper (mirrors the web lib/api.js: JWT, timeout, GET retry) ----

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function http<T = unknown>(
  path: string,
  { method = 'GET', body, auth = true, _retried = false }: { method?: string; body?: unknown; auth?: boolean; _retried?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const opts: RequestInit = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  if (auth) {
    const token = await secureStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  opts.signal = controller.signal;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, opts);
  } catch (err) {
    if (method === 'GET' && !_retried) return http<T>(path, { method, body, auth, _retried: true });
    clearTimeout(timer);
    throw new ApiError(
      (err as Error)?.name === 'AbortError'
        ? 'The server is taking too long to respond — it may be waking up. Please try again.'
        : `Cannot reach the server at ${API_URL}.`,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (res.status === 503 && method === 'GET' && !_retried) return http<T>(path, { method, body, auth, _retried: true });
  if (!res.ok) {
    const msg = (data as { message?: string })?.message || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

// ---- Status mapping (server Title Case <-> mobile snake_case) ----

/** 'Pending Approval' -> 'pending_approval', 'Partially Paid' -> 'partially_paid'. */
function toStatus(s: string | undefined): DocStatus {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_') as DocStatus;
}
/** 'pending_approval' -> 'Pending Approval'. */
function toServerStatus(s: DocStatus | string): string {
  return String(s)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
// Quotations use "Received" where the mobile filter tab key is "pending".
const quotationStatusToServer = (s: DocStatus | string): string => (s === 'pending' ? 'Received' : toServerStatus(s));

// ---- Line item mapping ----

interface ServerLineItem {
  _id?: string;
  name?: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
}
function mapLineItems(items: ServerLineItem[] = []): LineItem[] {
  return items.map((it, i) => ({
    id: it._id ? String(it._id) : `li${i}`,
    description: it.name ?? '',
    quantity: Number(it.qty) || 0,
    unit: it.unit,
    unitPrice: inr(Number(it.unitPrice) || 0),
  }));
}
const toServerItems = (items: LineItem[]) =>
  items.map((it) => ({ name: it.description, qty: it.quantity, unit: it.unit ?? 'pcs', unitPrice: it.unitPrice.amount }));

// A soft palette so live vendors still get a stable avatar colour.
const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0EA5E9', '#059669', '#D97706', '#DC2626', '#DB2777'];
const colorFor = (key: string) => AVATAR_COLORS[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// ---- Entity mappers ----

interface ServerVendor {
  id: string;
  name: string;
  category?: string;
  contact?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  location?: string;
  status?: string;
  rating?: number;
  orders?: number;
  spend?: number;
}
function mapVendor(v: ServerVendor): Vendor {
  return {
    id: v.id,
    name: v.name,
    contact: v.contact ?? '',
    category: v.category ?? 'General',
    status: (toStatus(v.status) as Vendor['status']) || 'pending',
    rating: Number(v.rating) || 0,
    city: v.location ?? '—',
    email: v.email ?? '',
    phone: v.phone ?? '',
    gstin: v.gstin ?? '',
    totalSpend: inr(v.spend ?? 0),
    orders: Number(v.orders) || 0,
    openOrders: 0,
    onTimeRate: 1,
    logoColor: colorFor(v.id || v.name),
  };
}

interface ServerPo {
  id: string;
  vendorId?: string;
  vendor?: string;
  status?: string;
  priority?: Priority;
  amount?: number;
  createdAt?: string;
  due?: string;
  expectedAt?: string;
  items?: ServerLineItem[];
  notes?: string;
}
function mapPo(p: ServerPo): PurchaseOrder {
  return {
    id: p.id,
    number: p.id,
    vendorId: p.vendorId ?? '',
    vendorName: p.vendor ?? '',
    status: toStatus(p.status),
    priority: (p.priority as Priority) ?? 'medium',
    total: inr(p.amount ?? 0),
    createdAt: p.createdAt ?? new Date().toISOString(),
    expectedAt: p.expectedAt ?? p.due ?? p.createdAt ?? new Date().toISOString(),
    items: mapLineItems(p.items),
    notes: p.notes,
  };
}

interface ServerInvoice {
  id: string;
  vendorId?: string;
  vendor?: string;
  poId?: string;
  poNumber?: string;
  status?: string;
  amount?: number;
  amountPaid?: number;
  createdAt?: string;
  issuedAt?: string;
  due?: string;
  items?: ServerLineItem[];
}
function mapInvoice(i: ServerInvoice): Invoice {
  const total = Number(i.amount) || 0;
  const subtotal = Math.round(total / 1.18);
  return {
    id: i.id,
    number: i.id,
    vendorId: i.vendorId ?? '',
    vendorName: i.vendor ?? '',
    poId: i.poId,
    poNumber: i.poNumber,
    status: toStatus(i.status),
    subtotal: inr(subtotal),
    gst: inr(total - subtotal),
    total: inr(total),
    amountPaid: inr(i.amountPaid ?? 0),
    issuedAt: i.issuedAt ?? i.createdAt ?? new Date().toISOString(),
    dueAt: i.due ?? i.createdAt ?? new Date().toISOString(),
    items: mapLineItems(i.items),
  };
}

interface ServerRfq {
  id: string;
  title: string;
  category?: string;
  status?: string;
  invited?: number;
  received?: number;
  invitedVendors?: string[];
  due?: string;
  createdAt?: string;
  items?: ServerLineItem[];
  notes?: string;
}
function mapRfq(r: ServerRfq, quotesCount?: number): Rfq {
  return {
    id: r.id,
    number: r.id,
    title: r.title,
    category: r.category ?? 'General',
    status: toStatus(r.status),
    vendorCount: r.invited ?? r.invitedVendors?.length ?? 0,
    responsesCount: quotesCount ?? r.received ?? 0,
    dueAt: r.due ?? r.createdAt ?? new Date().toISOString(),
    createdAt: r.createdAt ?? new Date().toISOString(),
    items: (r.items ?? []).map((it) => ({ name: it.name ?? '', quantity: Number(it.qty) || 0, unit: it.unit ?? 'pcs' })),
    notes: r.notes,
  };
}

interface ServerQuotation {
  id: string;
  vendor?: string;
  vendorId?: string;
  rfqId?: string;
  rfqTitle?: string;
  status?: string;
  amount?: number;
  deliveryDays?: number;
  validUntil?: string;
  createdAt?: string;
  items?: ServerLineItem[];
}
function mapQuotation(q: ServerQuotation): Quotation {
  return {
    id: q.id,
    number: q.id,
    vendorId: q.vendorId ?? '',
    vendorName: q.vendor ?? '',
    rfqId: q.rfqId ?? '',
    rfqNumber: q.rfqId ?? '',
    rfqTitle: q.rfqTitle ?? '',
    status: toStatus(q.status),
    total: inr(q.amount ?? 0),
    deliveryDays: Number(q.deliveryDays) || 0,
    validUntil: q.validUntil ?? q.createdAt ?? new Date().toISOString(),
    submittedAt: q.createdAt ?? new Date().toISOString(),
    items: mapLineItems(q.items),
  };
}

interface ServerApproval {
  id: string;
  docType?: string;
  entityType?: string;
  refId?: string;
  docNumber?: string;
  vendorName?: string;
  vendor?: string;
  requestedBy?: string;
  priority?: Priority;
  amount?: number;
  createdAt?: string;
  requestedAt?: string;
  status?: string;
  decidedAt?: string;
}
const APPROVAL_DOC: Record<string, Approval['docType']> = {
  PurchaseOrder: 'purchase_order',
  Invoice: 'invoice',
  RFQ: 'rfq',
};
function mapApproval(a: ServerApproval): Approval {
  return {
    id: a.id,
    docType: APPROVAL_DOC[a.entityType ?? ''] ?? 'purchase_order',
    docNumber: a.docNumber ?? a.refId ?? a.id,
    refId: a.refId ?? '',
    vendorName: a.vendorName ?? a.vendor ?? '',
    requestedBy: a.requestedBy ?? '',
    priority: (a.priority as Priority) ?? 'medium',
    amount: inr(a.amount ?? 0),
    requestedAt: a.requestedAt ?? a.createdAt ?? new Date().toISOString(),
    status: (toStatus(a.status) as Approval['status']) || 'pending',
    decidedAt: a.decidedAt,
  };
}

interface ServerActivity {
  id: string;
  actor?: string;
  action?: string;
  message?: string;
  entityType?: string;
  target?: string;
  createdAt?: string;
  at?: string;
}
const ACTIVITY_KIND: Record<string, string> = {
  PurchaseOrder: 'po',
  Invoice: 'invoice',
  Quotation: 'quotation',
  RFQ: 'rfq',
  Vendor: 'vendor',
  Approval: 'approval',
  User: 'vendor',
};
function mapActivity(e: ServerActivity) {
  const kind = (ACTIVITY_KIND[e.entityType ?? ''] ?? 'po') as 'po' | 'invoice' | 'quotation' | 'rfq' | 'vendor' | 'approval';
  return {
    id: e.id,
    actor: e.actor ?? 'Someone',
    action: e.action ?? 'updated',
    target: e.target ?? e.message ?? e.entityType ?? '',
    at: e.at ?? e.createdAt ?? new Date().toISOString(),
    kind,
  };
}

// ---- Shared client-side filter/paginate (identical behaviour to the mock) ----

function paginate<T>(all: T[], cursor: number, limit: number): Page<T> {
  const start = cursor * limit;
  const items = all.slice(start, start + limit);
  return { items, nextCursor: start + limit < all.length ? cursor + 1 : null, total: all.length };
}
function textFilter<T>(list: T[], q: string | undefined, fields: (keyof T)[]) {
  const s = q?.trim().toLowerCase();
  if (!s) return list;
  return list.filter((d) => fields.some((f) => String(d[f] ?? '').toLowerCase().includes(s)));
}
function listSlice<T>(all: T[], params: ListParams, statusOf: (x: T) => DocStatus, fields: (keyof T)[]): Page<T> {
  let list = all;
  if (params.status && params.status !== 'all') list = list.filter((x) => statusOf(x) === params.status);
  list = textFilter(list, params.query, fields);
  return paginate(list, params.cursor ?? 0, params.limit ?? 20);
}

const enc = encodeURIComponent;

// ---- Live API (same surface as the mock `api`) ----

export const live = {
  // Dashboard / reports
  async dashboard(): Promise<DashboardSummary> {
    const { data } = await http<{ data: any }>('/reports/summary');
    return {
      spendThisMonth: inr(data.purchaseOrders?.totalSpend ?? 0),
      spendDelta: 0,
      openOrders: data.purchaseOrders?.total ?? 0,
      openRfqs: data.rfqs?.open ?? 0,
      pendingApprovals: data.approvals?.pending ?? 0,
      overdueInvoices: data.invoices?.overdue ?? 0,
      outstanding: inr(data.invoices?.outstanding ?? 0),
      activeVendors: data.vendors?.active ?? 0,
      totalVendors: data.vendors?.total ?? 0,
      poValue: inr(data.purchaseOrders?.totalSpend ?? 0),
      spendTrend: [],
      statusBreakdown: [],
    };
  },
  async spendByCategory(): Promise<CategorySpend[]> {
    const { data } = await http<{ data: CategorySpend[] }>('/reports/spend-by-category');
    return (data ?? []).map((c) => ({ category: c.category, amount: Number(c.amount) || 0 }));
  },
  async spendByVendor(): Promise<VendorSpend[]> {
    const { data } = await http<{ data: VendorSpend[] }>('/reports/spend-by-vendor');
    return (data ?? []).map((v) => ({ vendorId: v.vendorId, vendor: v.vendor, orders: Number(v.orders) || 0, amount: Number(v.amount) || 0 }));
  },

  // Purchase orders
  async purchaseOrders(params: ListParams = {}): Promise<Page<PurchaseOrder>> {
    const { data } = await http<{ data: ServerPo[] }>('/purchase-orders');
    return listSlice(data.map(mapPo), params, (p) => p.status, ['number', 'vendorName']);
  },
  async purchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    const { data } = await http<{ data: ServerPo }>(`/purchase-orders/${enc(id)}`);
    return data ? mapPo(data) : undefined;
  },
  async createPurchaseOrder(input: { vendorId: string; priority: Priority; expectedAt: string; items: LineItem[]; notes?: string }): Promise<PurchaseOrder> {
    const { data } = await http<{ data: ServerPo }>('/purchase-orders', {
      method: 'POST',
      body: { vendorId: input.vendorId, priority: input.priority, due: input.expectedAt, items: toServerItems(input.items), notes: input.notes },
    });
    return mapPo(data);
  },
  async setPurchaseOrderStatus(id: string, status: DocStatus): Promise<PurchaseOrder> {
    const { data } = await http<{ data: ServerPo }>(`/purchase-orders/${enc(id)}/status`, { method: 'POST', body: { status: toServerStatus(status) } });
    return mapPo(data);
  },

  // Invoices
  async invoices(params: ListParams = {}): Promise<Page<Invoice>> {
    const { data } = await http<{ data: ServerInvoice[] }>('/invoices');
    return listSlice(data.map(mapInvoice), params, (i) => i.status, ['number', 'vendorName']);
  },
  async invoice(id: string): Promise<Invoice | undefined> {
    const { data } = await http<{ data: ServerInvoice }>(`/invoices/${enc(id)}`);
    return data ? mapInvoice(data) : undefined;
  },
  async createInvoice(input: { vendorId: string; poId?: string; dueAt: string; items: LineItem[] }): Promise<Invoice> {
    const { data } = await http<{ data: ServerInvoice }>('/invoices', {
      method: 'POST',
      body: { vendorId: input.vendorId, poId: input.poId, due: input.dueAt, items: toServerItems(input.items) },
    });
    return mapInvoice(data);
  },
  async payInvoice(id: string): Promise<Invoice> {
    const current = await this.invoice(id);
    const amount = current?.total.amount ?? 0;
    const { data } = await http<{ data: ServerInvoice }>(`/invoices/${enc(id)}/pay`, { method: 'POST', body: { amount } });
    return mapInvoice(data);
  },

  // Quotations
  async quotations(params: ListParams = {}): Promise<Page<Quotation>> {
    const { data } = await http<{ data: ServerQuotation[] }>('/quotations');
    return listSlice(data.map(mapQuotation), params, (q) => q.status, ['number', 'vendorName', 'rfqNumber']);
  },
  async quotation(id: string): Promise<Quotation | undefined> {
    const { data } = await http<{ data: ServerQuotation }>(`/quotations/${enc(id)}`);
    return data ? mapQuotation(data) : undefined;
  },
  async setQuotationStatus(id: string, status: DocStatus): Promise<Quotation> {
    const { data } = await http<{ data: ServerQuotation }>(`/quotations/${enc(id)}/status`, { method: 'POST', body: { status: quotationStatusToServer(status) } });
    return mapQuotation(data);
  },
  async awardQuotation(id: string): Promise<{ quotation: Quotation; po: PurchaseOrder }> {
    const res = await http<{ data: ServerQuotation; purchaseOrder: ServerPo }>(`/quotations/${enc(id)}/award`, { method: 'POST', body: {} });
    return { quotation: mapQuotation(res.data), po: mapPo(res.purchaseOrder) };
  },
  async compareQuotes(rfqId: string): Promise<QuoteCompare | null> {
    const { data } = await http<{ data: any }>(`/quotations/compare?rfqId=${enc(rfqId)}`);
    if (!data) return null;
    const vendors = (data.vendors ?? []).map((v: any) => ({
      quotationId: v.quotationId ?? v.id,
      vendor: v.vendor ?? v.vendorName ?? '',
      amount: Number(v.amount) || 0,
      deliveryDays: Number(v.deliveryDays) || 0,
      status: toStatus(v.status),
      prices: v.prices ?? {},
    }));
    return {
      rfqId,
      rfqTitle: data.rfqTitle ?? '',
      itemNames: data.itemNames ?? [],
      vendors,
      summary: {
        lowestAmount: data.summary?.lowestAmount ?? Math.min(...vendors.map((v: any) => v.amount), Infinity),
        fastestDeliveryDays: data.summary?.fastestDeliveryDays ?? Math.min(...vendors.map((v: any) => v.deliveryDays), Infinity),
      },
    };
  },
  async comparableRfqs(): Promise<{ id: string; number: string; title: string }[]> {
    const { data } = await http<{ data: ServerQuotation[] }>('/quotations');
    const seen = new Map<string, string>();
    data.forEach((q) => {
      if (q.rfqId && !seen.has(q.rfqId)) seen.set(q.rfqId, q.rfqTitle ?? '');
    });
    return [...seen.entries()].map(([id, title]) => ({ id, number: id, title }));
  },

  // RFQs
  async rfqs(params: ListParams = {}): Promise<Page<Rfq>> {
    const { data } = await http<{ data: ServerRfq[] }>('/rfqs');
    return listSlice(data.map((r) => mapRfq(r)), params, (r) => r.status, ['number', 'title', 'category']);
  },
  async rfq(id: string): Promise<{ rfq: Rfq; quotes: Quotation[] } | undefined> {
    const res = await http<{ data: ServerRfq; quotations: ServerQuotation[] }>(`/rfqs/${enc(id)}`);
    if (!res?.data) return undefined;
    const quotes = (res.quotations ?? []).map(mapQuotation);
    return { rfq: mapRfq(res.data, quotes.length), quotes };
  },
  async createRfq(input: { title: string; category: string; dueAt: string; items: { name: string; quantity: number; unit: string }[]; invitedVendorIds: string[]; notes?: string }): Promise<Rfq> {
    const { data } = await http<{ data: ServerRfq }>('/rfqs', {
      method: 'POST',
      body: {
        title: input.title,
        category: input.category,
        due: input.dueAt,
        items: input.items.map((it) => ({ name: it.name, qty: it.quantity, unit: it.unit })),
        invitedVendors: input.invitedVendorIds,
        notes: input.notes,
        publish: true,
      },
    });
    return mapRfq(data);
  },

  // Vendors
  async vendors(params: ListParams = {}): Promise<Page<Vendor>> {
    const { data } = await http<{ data: ServerVendor[] }>('/vendors');
    return listSlice(data.map(mapVendor), params, (v) => v.status, ['name', 'category', 'city', 'contact']);
  },
  async vendor(id: string): Promise<{ vendor: Vendor; purchaseOrders: PurchaseOrder[]; invoices: Invoice[] } | undefined> {
    const res = await http<{ vendor: ServerVendor; purchaseOrders: ServerPo[]; invoices: ServerInvoice[] }>(`/vendors/${enc(id)}`);
    if (!res?.vendor) return undefined;
    return {
      vendor: mapVendor(res.vendor),
      purchaseOrders: (res.purchaseOrders ?? []).map(mapPo),
      invoices: (res.invoices ?? []).map(mapInvoice),
    };
  },
  async createVendor(input: Omit<Vendor, 'id' | 'logoColor' | 'orders' | 'openOrders' | 'onTimeRate' | 'totalSpend' | 'rating'>): Promise<Vendor> {
    const { data } = await http<{ data: ServerVendor }>('/vendors', {
      method: 'POST',
      body: {
        name: input.name,
        contact: input.contact,
        email: input.email,
        phone: input.phone,
        gstin: input.gstin,
        location: input.city,
        category: input.category,
        status: toServerStatus(input.status),
      },
    });
    return mapVendor(data);
  },

  // Approvals
  async approvals(): Promise<{ pending: Approval[]; decided: Approval[] }> {
    const { data } = await http<{ data: ServerApproval[] }>('/approvals');
    const all = (data ?? []).map(mapApproval);
    return { pending: all.filter((a) => a.status === 'pending'), decided: all.filter((a) => a.status !== 'pending') };
  },
  async decideApproval(id: string, decision: 'approved' | 'rejected'): Promise<Approval> {
    const { data } = await http<{ data: ServerApproval }>(`/approvals/${enc(id)}/decide`, { method: 'POST', body: { decision } });
    return mapApproval(data);
  },

  // Activity
  async activity(params: ListParams = {}) {
    const { data } = await http<{ data: ServerActivity[] }>('/reports/activity?limit=50');
    return paginate((data ?? []).map(mapActivity), params.cursor ?? 0, params.limit ?? 25);
  },

  // Global search — server has no single endpoint, so fan out across lists.
  async search(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return { vendors: [], purchaseOrders: [], rfqs: [], quotations: [], invoices: [] };
    const [v, p, r, qt, i] = await Promise.all([
      this.vendors({ query: q, limit: 4 }),
      this.purchaseOrders({ query: q, limit: 4 }),
      this.rfqs({ query: q, limit: 4 }),
      this.quotations({ query: q, limit: 4 }),
      this.invoices({ query: q, limit: 4 }),
    ]);
    return { vendors: v.items, purchaseOrders: p.items, rfqs: r.items, quotations: qt.items, invoices: i.items };
  },

  // ---- AI (Gemini/Groq via the server) ----
  ai: {
    status: () => http<AiStatus>('/ai/status', { auth: false }),
    chat: async (message: string, history: { role: string; content: string }[]) => {
      const { data } = await http<{ data: ChatAnswer }>('/ai/chat', { method: 'POST', body: { message, history } });
      return data;
    },
    act: async (action: ChatAction) => {
      const { data } = await http<{ data: ActionResult }>('/ai/chat/act', { method: 'POST', body: { action } });
      return data;
    },
    draftRfq: async (prompt: string) => {
      const { data } = await http<{ data: RfqDraft }>('/ai/rfq/draft', { method: 'POST', body: { prompt } });
      return data;
    },
    comparisonInsight: async (rfqId: string) => {
      const { data } = await http<{ data: CompareInsight }>('/ai/quotations/insight', { method: 'POST', body: { rfqId } });
      return data;
    },
    reportSummary: async () => {
      const { data } = await http<{ data: ReportSummary }>('/ai/reports/summary');
      return data;
    },
    vendorRisk: async (id: string) => {
      const { data } = await http<{ data: VendorRisk }>(`/ai/vendors/${enc(id)}/risk`);
      return data;
    },
    invoiceAudit: async (id: string) => {
      const { data } = await http<{ data: InvoiceAudit }>(`/ai/invoices/${enc(id)}/audit`);
      return data;
    },
    extract: async (body: ExtractRequest) => {
      const { data } = await http<{ data: ExtractResult }>('/ai/extract', { method: 'POST', body });
      return data;
    },
  },
};

// ---- Auth (used by the zustand store) ----

export interface ServerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  company?: string;
}
export const liveAuth = {
  login: (email: string, password: string) => http<{ token: string; user: ServerUser }>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  register: (name: string, email: string, password: string, role: string, company?: string) =>
    http<{ token: string; user: ServerUser }>('/auth/register', { method: 'POST', body: { name, email, password, role, company }, auth: false }),
  me: () => http<{ user: ServerUser }>('/auth/me'),
  forgotPassword: (email: string) => http<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (token: string, password: string) => http<{ message: string }>('/auth/reset-password', { method: 'POST', body: { token, password }, auth: false }),
};
