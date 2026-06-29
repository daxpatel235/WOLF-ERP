/**
 * Typed React Query hooks. Screens import only these — never the client or keys
 * directly, keeping the data source swappable.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { api, type ListParams } from './client';
import { qk } from './queryClient';
import type { Approval, DocStatus } from '@/types/domain';

const PAGE = 20;
type DocFilter = Pick<ListParams, 'query' | 'status'>;

function infinite<T>(key: readonly unknown[], fn: (cursor: number) => Promise<{ items: T[]; nextCursor: number | null; total: number }>, opts?: { refetchInterval?: number }) {
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fn(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextCursor,
    ...opts,
  });
}

// ---- Dashboard / reports ----
export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: () => api.dashboard(), refetchInterval: 15_000 });
}
export function useSpendByCategory() {
  return useQuery({ queryKey: qk.spendByCategory, queryFn: () => api.spendByCategory() });
}
export function useSpendByVendor() {
  return useQuery({ queryKey: qk.spendByVendor, queryFn: () => api.spendByVendor() });
}

// ---- Purchase orders ----
export function usePurchaseOrders(f: DocFilter = {}) {
  return infinite(qk.purchaseOrders(f), (c) => api.purchaseOrders({ ...f, cursor: c, limit: PAGE }));
}
export function usePurchaseOrder(id: string) {
  return useQuery({ queryKey: qk.purchaseOrder(id), queryFn: () => api.purchaseOrder(id), enabled: !!id });
}
export function useSetPoStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: DocStatus) => api.setPurchaseOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.purchaseOrder(id) });
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}
export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createPurchaseOrder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchaseOrders'] }),
  });
}

// ---- Invoices ----
export function useInvoices(f: DocFilter = {}) {
  return infinite(qk.invoices(f), (c) => api.invoices({ ...f, cursor: c, limit: PAGE }));
}
export function useInvoice(id: string) {
  return useQuery({ queryKey: qk.invoice(id), queryFn: () => api.invoice(id), enabled: !!id });
}
export function usePayInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.payInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.invoice(id) });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

// ---- Quotations ----
export function useQuotations(f: DocFilter = {}) {
  return infinite(qk.quotations(f), (c) => api.quotations({ ...f, cursor: c, limit: PAGE }));
}
export function useQuotation(id: string) {
  return useQuery({ queryKey: qk.quotation(id), queryFn: () => api.quotation(id), enabled: !!id });
}
export function useCompareQuotes(rfqId: string) {
  return useQuery({ queryKey: qk.compare(rfqId), queryFn: () => api.compareQuotes(rfqId), enabled: !!rfqId });
}
export function useComparableRfqs() {
  return useQuery({ queryKey: qk.comparableRfqs, queryFn: () => api.comparableRfqs() });
}
export function useAwardQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.awardQuotation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotations'] });
      qc.invalidateQueries({ queryKey: ['compare'] });
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
  });
}
export function useSetQuotationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; status: DocStatus }) => api.setQuotationStatus(v.id, v.status),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.quotation(v.id) });
      qc.invalidateQueries({ queryKey: ['quotations'] });
    },
  });
}

// ---- RFQs ----
export function useRfqs(f: DocFilter = {}) {
  return infinite(qk.rfqs(f), (c) => api.rfqs({ ...f, cursor: c, limit: PAGE }));
}
export function useRfq(id: string) {
  return useQuery({ queryKey: qk.rfq(id), queryFn: () => api.rfq(id), enabled: !!id });
}
export function useCreateRfq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createRfq,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rfqs'] }),
  });
}

// ---- Vendors ----
export function useVendors(f: Pick<ListParams, 'query' | 'status'> = {}) {
  return infinite(qk.vendors(f), (c) => api.vendors({ ...f, cursor: c, limit: PAGE }));
}
export function useVendor(id: string) {
  return useQuery({ queryKey: qk.vendor(id), queryFn: () => api.vendor(id), enabled: !!id });
}
export function useAllVendors() {
  // For pickers (PO/Invoice/RFQ forms) — first page is plenty for the mock set.
  return useQuery({ queryKey: qk.vendors('picker'), queryFn: () => api.vendors({ limit: 100 }) });
}
export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createVendor,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

// ---- Activity ----
export function useActivity() {
  return infinite(qk.activity, (c) => api.activity({ cursor: c, limit: 25 }), { refetchInterval: 20_000 });
}

// ---- Approvals ----
export function useApprovals() {
  return useQuery({ queryKey: qk.approvals, queryFn: () => api.approvals(), refetchInterval: 20_000 });
}
export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; decision: 'approved' | 'rejected' }) => api.decideApproval(v.id, v.decision),
    onMutate: async ({ id, decision }) => {
      await qc.cancelQueries({ queryKey: qk.approvals });
      const prev = qc.getQueryData<{ pending: Approval[]; decided: Approval[] }>(qk.approvals);
      qc.setQueryData<{ pending: Approval[]; decided: Approval[] }>(qk.approvals, (old) => {
        if (!old) return old;
        const moved = old.pending.find((a) => a.id === id);
        return {
          pending: old.pending.filter((a) => a.id !== id),
          decided: moved ? [{ ...moved, status: decision }, ...old.decided] : old.decided,
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.approvals, ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.approvals });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
}

// ---- Global search ----
export function useSearch(query: string) {
  return useQuery({ queryKey: qk.search(query), queryFn: () => api.search(query), enabled: query.trim().length > 0 });
}

// ---- AI ----
export function useAiStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: () => api.ai.status(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
export function useAiChat() {
  return useMutation({ mutationFn: (v: { message: string; history: { role: string; content: string }[] }) => api.ai.chat(v.message, v.history) });
}
export function useAiAct() {
  return useMutation({ mutationFn: (action: Parameters<typeof api.ai.act>[0]) => api.ai.act(action) });
}
export function useDraftRfq() {
  return useMutation({ mutationFn: (prompt: string) => api.ai.draftRfq(prompt) });
}
export function useComparisonInsight() {
  return useMutation({ mutationFn: (rfqId: string) => api.ai.comparisonInsight(rfqId) });
}
export function useReportSummary() {
  return useMutation({ mutationFn: () => api.ai.reportSummary() });
}
export function useVendorRisk() {
  return useMutation({ mutationFn: (id: string) => api.ai.vendorRisk(id) });
}
export function useInvoiceAudit() {
  return useMutation({ mutationFn: (id: string) => api.ai.invoiceAudit(id) });
}
export function useExtractDocument() {
  return useMutation({ mutationFn: (body: Parameters<typeof api.ai.extract>[0]) => api.ai.extract(body) });
}

/** Flatten infinite-query pages into a single array for FlashList `data`. */
export function flattenPages<T>(data: { pages: { items: T[] }[] } | undefined): T[] {
  return data?.pages.flatMap((p) => p.items) ?? [];
}
