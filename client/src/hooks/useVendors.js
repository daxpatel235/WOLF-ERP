"use client";

import { useCallback } from "react";
import { vendorsApi } from "@/lib/api";
import { useFetch } from "./useFetch";

// Vendors list with live filtering + CRUD helpers that refetch on success.
export function useVendors({ q, status, category } = {}) {
  const { data, loading, error, refetch } = useFetch(
    () => vendorsApi.list({ q, status, category }),
    [q, status, category]
  );

  const create = useCallback(
    async (payload) => {
      const res = await vendorsApi.create(payload);
      await refetch();
      return res.data;
    },
    [refetch]
  );

  const update = useCallback(
    async (id, payload) => {
      const res = await vendorsApi.update(id, payload);
      await refetch();
      return res.data;
    },
    [refetch]
  );

  const remove = useCallback(
    async (id) => {
      await vendorsApi.remove(id);
      await refetch();
    },
    [refetch]
  );

  return {
    vendors: data?.data || [],
    count: data?.count || 0,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  };
}

export default useVendors;
