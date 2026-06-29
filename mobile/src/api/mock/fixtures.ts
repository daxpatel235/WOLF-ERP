/**
 * Deterministic mock dataset for Wolf ERP. Generated once at load so every
 * screen has rich, related data (vendors → POs → invoices, RFQs → quotes →
 * awards) and large lists to stress FlashList. Swap for the live adapter in
 * `src/api/client.ts`.
 */
import type {
  ActivityEvent,
  Approval,
  CategorySpend,
  DashboardSummary,
  Invoice,
  LineItem,
  Priority,
  PurchaseOrder,
  Quotation,
  Rfq,
  Vendor,
  VendorSpend,
} from '@/types/domain';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260623);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const inr = (amount: number) => ({ amount, currency: 'INR' as const });
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000).toISOString();

const VENDOR_NAMES = [
  'Apex Industrial Supply', 'BlueRidge Components', 'Cendris Logistics', 'Drava Steelworks',
  'Evercore Plastics', 'Forge & Mill Co.', 'Granite Peak Tools', 'Helios Energy Systems',
  'Ironwood Fasteners', 'Juniper Packaging', 'Kepler Electronics', 'Lumen Lighting',
  'Meridian Chemicals', 'Northstar Bearings', 'Orbit Automation', 'Pinnacle Hydraulics',
] as const;
const CONTACTS = ['A. Mehta', 'R. Iyer', 'S. Khan', 'P. Rao', 'N. Desai', 'K. Nair', 'V. Shah'];
const CATEGORIES = ['Raw Materials', 'Electronics', 'Logistics', 'Packaging', 'Tooling', 'Chemicals', 'IT Services'] as const;
const CITIES = ['Mumbai', 'Pune', 'Bengaluru', 'Chennai', 'Surat', 'Ahmedabad'] as const;
const VENDOR_STATUS = ['active', 'active', 'active', 'pending', 'inactive'] as const;
const AVATAR_COLORS = ['#2563EB', '#0891B2', '#7C3AED', '#059669', '#DC2626', '#D97706', '#DB2777'] as const;
const ITEM_DESCS = [
  'M8 Hex Bolt (Zn)', 'Steel Plate 4mm', 'PLC Module X20', 'Hydraulic Hose 1/2"',
  'LED Panel 40W', 'Industrial Solvent 20L', 'Bearing 6204-ZZ', 'Corrugated Box L',
  'Copper Wire 2.5sqmm', 'Pneumatic Valve', 'Safety Gloves (pair)', 'Coolant 5L',
] as const;
const UNITS = ['pcs', 'kg', 'box', 'set', 'm', 'litre'] as const;
const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

function gstin(i: number) {
  return `27AAACW${1000 + i}F1Z${i % 9}`;
}

export const vendors: Vendor[] = VENDOR_NAMES.map((name, i) => ({
  id: `v${i + 1}`,
  name,
  contact: pick(CONTACTS),
  category: pick(CATEGORIES),
  status: pick(VENDOR_STATUS),
  rating: Math.round((3 + rand() * 2) * 10) / 10,
  city: pick(CITIES),
  email: `sales@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
  phone: `+91 ${between(70, 99)}${between(10000000, 99999999)}`,
  gstin: gstin(i),
  totalSpend: inr(between(2, 80) * 100000),
  orders: between(2, 40),
  openOrders: between(0, 9),
  onTimeRate: Math.round((0.7 + rand() * 0.3) * 100) / 100,
  logoColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
}));

function makeItems(prefix: string, count: number): LineItem[] {
  return Array.from({ length: count }, (_, k) => ({
    id: `${prefix}-li${k}`,
    description: pick(ITEM_DESCS),
    quantity: between(5, 200),
    unit: pick(UNITS),
    unitPrice: inr(between(40, 9000)),
  }));
}
const sumItems = (items: LineItem[]) => items.reduce((s, it) => s + it.quantity * it.unitPrice.amount, 0);

const PO_STATUSES = ['draft', 'pending_approval', 'approved', 'sent', 'received', 'cancelled'] as const;
export const purchaseOrders: PurchaseOrder[] = Array.from({ length: 240 }, (_, i) => {
  const vendor = pick(vendors);
  const items = makeItems(`po${i}`, between(2, 6));
  const created = -between(0, 120);
  return {
    id: `po${i + 1}`,
    number: `PO-${2000 + i}`,
    vendorId: vendor.id,
    vendorName: vendor.name,
    status: pick(PO_STATUSES),
    priority: pick(PRIORITIES),
    total: inr(sumItems(items)),
    createdAt: daysFromNow(created),
    expectedAt: daysFromNow(created + between(5, 30)),
    items,
    notes: rand() > 0.6 ? 'Deliver to Gate 3, attn. stores.' : undefined,
  };
});

const INV_STATUSES = ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const;
export const invoices: Invoice[] = Array.from({ length: 160 }, (_, i) => {
  const vendor = pick(vendors);
  const items = makeItems(`inv${i}`, between(2, 5));
  const subtotal = sumItems(items);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const status = pick(INV_STATUSES);
  const issued = -between(0, 90);
  const linkedPo = rand() > 0.3 ? pick(purchaseOrders) : undefined;
  return {
    id: `inv${i + 1}`,
    number: `INV-${4500 + i}`,
    vendorId: vendor.id,
    vendorName: vendor.name,
    poNumber: linkedPo?.number,
    poId: linkedPo?.id,
    status,
    subtotal: inr(subtotal),
    gst: inr(gst),
    total: inr(total),
    amountPaid: inr(status === 'paid' ? total : status === 'partially_paid' ? Math.round(total / 2) : 0),
    issuedAt: daysFromNow(issued),
    dueAt: daysFromNow(issued + 30),
    items,
  };
});

// RFQs with related quotations -------------------------------------------------
const RFQ_STATUSES = ['draft', 'published', 'closed', 'awarded'] as const;
const QT_STATUSES = ['pending', 'shortlisted', 'awarded', 'rejected'] as const;

export const rfqs: Rfq[] = [];
export const quotations: Quotation[] = [];

Array.from({ length: 60 }).forEach((_, i) => {
  const created = -between(5, 60);
  const category = pick(CATEGORIES);
  const rfqItems = Array.from({ length: between(2, 5) }, () => ({
    name: pick(ITEM_DESCS),
    quantity: between(5, 100),
    unit: pick(UNITS),
  }));
  const invited = between(3, 8);
  const responses = between(0, invited);
  const rfq: Rfq = {
    id: `rfq${i + 1}`,
    number: `RFQ-${300 + i}`,
    title: `${category} — ${pick(ITEM_DESCS)}`,
    category,
    status: pick(RFQ_STATUSES),
    vendorCount: invited,
    responsesCount: responses,
    dueAt: daysFromNow(created + between(7, 21)),
    createdAt: daysFromNow(created),
    items: rfqItems,
    notes: rand() > 0.7 ? 'Quote inclusive of freight to Mumbai.' : undefined,
  };
  rfqs.push(rfq);

  // Quotes against this RFQ (so the compare view has data).
  const awardedIdx = rfq.status === 'awarded' ? between(0, Math.max(0, responses - 1)) : -1;
  for (let q = 0; q < responses; q++) {
    const vendor = pick(vendors);
    const items: LineItem[] = rfqItems.map((it, k) => ({
      id: `qt${quotations.length}-li${k}`,
      description: it.name,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: inr(between(40, 9000)),
    }));
    quotations.push({
      id: `qt${quotations.length + 1}`,
      number: `QT-${800 + quotations.length}`,
      vendorId: vendor.id,
      vendorName: vendor.name,
      rfqId: rfq.id,
      rfqNumber: rfq.number,
      rfqTitle: rfq.title,
      status: awardedIdx === q ? 'awarded' : pick(QT_STATUSES),
      total: inr(sumItems(items)),
      deliveryDays: between(3, 30),
      validUntil: daysFromNow(between(2, 25)),
      submittedAt: daysFromNow(created + between(2, 10)),
      items,
    });
  }
});

// Approvals (link to real docs) ------------------------------------------------
function makeApproval(i: number, status: 'pending' | 'approved' | 'rejected'): Approval {
  const kind = pick(['purchase_order', 'invoice', 'rfq'] as const);
  const doc =
    kind === 'purchase_order' ? pick(purchaseOrders) : kind === 'invoice' ? pick(invoices) : pick(rfqs);
  const amount = 'total' in doc ? doc.total : inr(between(2, 60) * 10000);
  return {
    id: `ap${i + 1}`,
    docType: kind,
    docNumber: doc.number,
    refId: doc.id,
    vendorName: 'vendorName' in doc ? doc.vendorName : '—',
    requestedBy: pick(CONTACTS),
    priority: pick(PRIORITIES),
    amount,
    requestedAt: daysFromNow(-between(0, 8)),
    status,
    decidedAt: status === 'pending' ? undefined : daysFromNow(-between(0, 4)),
  };
}
export const approvals: Approval[] = [
  ...Array.from({ length: 14 }, (_, i) => makeApproval(i, 'pending')),
  ...Array.from({ length: 8 }, (_, i) => makeApproval(14 + i, rand() > 0.4 ? 'approved' : 'rejected')),
];

// Activity ---------------------------------------------------------------------
const ACTIONS = ['approved', 'created', 'commented on', 'rejected', 'updated', 'sent'] as const;
export const activity: ActivityEvent[] = Array.from({ length: 120 }, (_, i) => ({
  id: `ac${i + 1}`,
  actor: pick([...CONTACTS, 'You']),
  action: pick(ACTIONS),
  target: pick(purchaseOrders).number,
  at: daysFromNow(-i * 0.12),
  kind: pick(['po', 'invoice', 'quotation', 'rfq', 'vendor', 'approval'] as const),
}));

// Reports aggregates -----------------------------------------------------------
const CAT_COLORS: Record<string, string> = {
  'Raw Materials': '#2563EB', Electronics: '#7C3AED', Logistics: '#0891B2',
  Packaging: '#059669', Tooling: '#D97706', Chemicals: '#DC2626', 'IT Services': '#DB2777',
};

export const spendByCategory: CategorySpend[] = CATEGORIES.map((category) => ({
  category,
  amount: purchaseOrders
    .filter((p) => vendors.find((v) => v.id === p.vendorId)?.category === category)
    .reduce((s, p) => s + p.total.amount, 0),
})).sort((a, b) => b.amount - a.amount);

export const spendByVendor: VendorSpend[] = vendors
  .map((v) => ({
    vendorId: v.id,
    vendor: v.name,
    orders: purchaseOrders.filter((p) => p.vendorId === v.id).length,
    amount: purchaseOrders.filter((p) => p.vendorId === v.id).reduce((s, p) => s + p.total.amount, 0),
  }))
  .sort((a, b) => b.amount - a.amount);

const outstanding = invoices
  .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
  .reduce((s, i) => s + (i.total.amount - i.amountPaid.amount), 0);

export const dashboard: DashboardSummary = {
  spendThisMonth: inr(4827400),
  spendDelta: 0.124,
  openOrders: purchaseOrders.filter((p) => !['received', 'cancelled'].includes(p.status)).length,
  openRfqs: rfqs.filter((r) => r.status === 'published').length,
  pendingApprovals: approvals.filter((a) => a.status === 'pending').length,
  overdueInvoices: invoices.filter((i) => i.status === 'overdue').length,
  outstanding: inr(outstanding),
  activeVendors: vendors.filter((v) => v.status === 'active').length,
  totalVendors: vendors.length,
  poValue: inr(purchaseOrders.reduce((s, p) => s + p.total.amount, 0)),
  spendTrend: [32, 38, 30, 41, 45, 39, 52, 48, 60, 55, 63, 71],
  statusBreakdown: [
    { label: 'Approved', value: 48, color: '#2563EB' },
    { label: 'Pending', value: 27, color: '#D97706' },
    { label: 'Draft', value: 15, color: '#94A3B8' },
    { label: 'Received', value: 10, color: '#059669' },
  ],
};

export const COMPANY = {
  name: 'Wolf ERP Pvt. Ltd.',
  address: '4th Floor, Lighthouse Tower, BKC, Mumbai 400051',
  gstin: '27AAACW1234F1Z2',
  email: 'accounts@wolferp.in',
  phone: '+91 22 4000 1234',
};

export const VENDOR_CATEGORIES = [...CATEGORIES];
