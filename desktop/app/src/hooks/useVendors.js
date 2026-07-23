"use client";

import { useCallback } from "react";
import { vendorsApi } from "@/lib/api";
import { useFetch, invalidate } from "./useFetch";

// Vendors list with live filtering + CRUD helpers that refetch on success.
export function useVendors({ q, status, category } = {}) {
  const { data, loading, validating, error, refetch } = useFetch(
    () => vendorsApi.list({ q, status, category }),
    [q, status, category],
    { key: "vendors" }
  );

  // A write invalidates every cached view that derives from vendors — other
  // filter combinations, the individual vendor pages, and the spend reports —
  // so none of them can serve a stale copy after this change.
  const invalidateRelated = useCallback(() => {
    invalidate("vendors");
    invalidate("vendor");
    invalidate("reports");
  }, []);

  const create = useCallback(
    async (payload) => {
      const res = await vendorsApi.create(payload);
      invalidateRelated();
      await refetch();
      return res.data;
    },
    [refetch, invalidateRelated]
  );

  const update = useCallback(
    async (id, payload) => {
      const res = await vendorsApi.update(id, payload);
      invalidateRelated();
      await refetch();
      return res.data;
    },
    [refetch, invalidateRelated]
  );

  const remove = useCallback(
    async (id) => {
      await vendorsApi.remove(id);
      invalidateRelated();
      await refetch();
    },
    [refetch, invalidateRelated]
  );

  return {
    vendors: data?.data || [],
    count: data?.count || 0,
    loading,
    validating,
    error,
    refetch,
    create,
    update,
    remove,
  };
}

export default useVendors;
