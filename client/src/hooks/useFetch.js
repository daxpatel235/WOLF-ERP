"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Generic data-fetching hook.
 * @param {() => Promise<any>} fetcher - returns a promise (e.g. an api call)
 * @param {Array} deps - re-run when these change
 * @returns {{ data, loading, error, refetch, setData }}
 */
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch: run, setData };
}

export default useFetch;
