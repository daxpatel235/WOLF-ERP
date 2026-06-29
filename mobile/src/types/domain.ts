/**
 * Wolf ERP domain models. Shared contract for mock fixtures + live API so
 * screens never change when the data source swaps. Mirrors the web app's shapes.
 */

export type ID = string;

/** Every status the app can render — drives `statusMeta` badge colors. */
export type DocStatus =
  | 'draft'
  | 'pending'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'received'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'closed'
  | 'published'
  | 'awarded'
  | 'shortlisted'
  | 'active'
  | 'inactive';

export type Priority = 'low' | 'medium' | 'high';

export type Role = 'admin' | 'manager' | 'approver' | 'buyer' | 'vendor';

export interface Money {
  amount: number;
  currency: 'INR' | 'USD' | 'EUR';
}

export interface LineItem {
  id: ID;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: Money;
}

export interface Vendor {
  id: ID;
  name: string;
  contact: string;
  category: string;
  status: 'active' | 'pending' | 'inactive';
  rating: number; // 0–5
  city: string;
  email: string;
  phone: string;
  gstin: string;
  totalSpend: Money;
  orders: number;
  openOrders: number;
  onTimeRate: number; // 0–1
  logoColor: string;
}

export interface PurchaseOrder {
  id: ID;
  number: string; // PO-2041
  vendorId: ID;
  vendorName: string;
  status: DocStatus; // draft | pending_approval | approved | sent | received | cancelled | rejected
  priority: Priority;
  total: Money;
  createdAt: string;
  expectedAt: string;
  items: LineItem[];
  notes?: string;
}

export interface Invoice {
  id: ID;
  number: string; // INV-...
  vendorId: ID;
  vendorName: string;
  poNumber?: string;
  poId?: ID;
  status: DocStatus; // draft | sent | partially_paid | paid | overdue | cancelled
  subtotal: Money;
  gst: Money;
  total: Money;
  amountPaid: Money;
  issuedAt: string;
  dueAt: string;
  items: LineItem[];
}

export interface Quotation {
  id: ID;
  number: string; // QT-...
  vendorId: ID;
  vendorName: string;
  rfqId: ID;
  rfqNumber: string;
  rfqTitle: string;
  status: DocStatus; // pending | shortlisted | awarded | rejected | sent
  total: Money;
  deliveryDays: number;
  validUntil: string;
  submittedAt: string;
  items: LineItem[];
}

export interface RfqItem {
  name: string;
  quantity: number;
  unit: string;
}

export interface Rfq {
  id: ID;
  number: string; // RFQ-...
  title: string;
  category: string;
  status: DocStatus; // draft | published | closed | awarded | cancelled
  vendorCount: number;
  responsesCount: number;
  dueAt: string;
  createdAt: string;
  items: RfqItem[];
  notes?: string;
}

export interface Approval {
  id: ID;
  docType: 'purchase_order' | 'invoice' | 'rfq';
  docNumber: string;
  refId: ID; // id of the underlying document
  vendorName: string;
  requestedBy: string;
  priority: Priority;
  amount: Money;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: string;
}

export interface ActivityEvent {
  id: ID;
  actor: string;
  action: string;
  target: string;
  at: string;
  kind: 'po' | 'invoice' | 'quotation' | 'rfq' | 'vendor' | 'approval';
}

export interface DashboardSummary {
  spendThisMonth: Money;
  spendDelta: number;
  openOrders: number;
  openRfqs: number;
  pendingApprovals: number;
  overdueInvoices: number;
  outstanding: Money;
  activeVendors: number;
  totalVendors: number;
  poValue: Money;
  spendTrend: number[];
  statusBreakdown: { label: string; value: number; color: string }[];
}

export interface CategorySpend {
  category: string;
  amount: number;
}

export interface VendorSpend {
  vendorId: ID;
  vendor: string;
  orders: number;
  amount: number;
}

/** Side-by-side quotation comparison for an RFQ. */
export interface QuoteCompare {
  rfqId: ID;
  rfqTitle: string;
  itemNames: string[];
  vendors: {
    quotationId: ID;
    vendor: string;
    amount: number;
    deliveryDays: number;
    status: DocStatus;
    prices: Record<string, number>;
  }[];
  summary: { lowestAmount: number; fastestDeliveryDays: number };
}

/** Generic paginated envelope for infinite lists. */
export interface Page<T> {
  items: T[];
  nextCursor: number | null;
  total: number;
}
