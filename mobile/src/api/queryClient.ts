import { QueryClient } from '@tanstack/react-query';

/**
 * Tuned for an "always-fresh, never-blocking" feel: a longer staleTime so cached
 * data renders instantly without immediately re-hitting a (possibly cold) remote
 * server; long gcTime so navigating back is instant.
 *
 * Retry is deliberately low: the live `http` wrapper already retries GETs once
 * (and again on a 503), so stacking react-query's own retries on top just
 * multiplies the wait when the backend is waking up. We also skip the
 * focus-refetch storm that fires on every screen/app foreground — costly when
 * each round-trip is slow.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
    mutations: { retry: 0 },
  },
});

/** Centralised query keys so invalidation stays consistent. */
export const qk = {
  dashboard: ['dashboard'] as const,
  spendByCategory: ['spendByCategory'] as const,
  spendByVendor: ['spendByVendor'] as const,
  purchaseOrders: (p?: unknown) => ['purchaseOrders', p] as const,
  purchaseOrder: (id: string) => ['purchaseOrder', id] as const,
  invoices: (p?: unknown) => ['invoices', p] as const,
  invoice: (id: string) => ['invoice', id] as const,
  quotations: (p?: unknown) => ['quotations', p] as const,
  quotation: (id: string) => ['quotation', id] as const,
  compare: (rfqId: string) => ['compare', rfqId] as const,
  comparableRfqs: ['comparableRfqs'] as const,
  rfqs: (p?: unknown) => ['rfqs', p] as const,
  rfq: (id: string) => ['rfq', id] as const,
  vendors: (p?: unknown) => ['vendors', p] as const,
  vendor: (id: string) => ['vendor', id] as const,
  approvals: ['approvals'] as const,
  activity: ['activity'] as const,
  search: (q: string) => ['search', q] as const,
};
