"use client";

import { useEffect, useState } from "react";

/**
 * Trailing-edge debounce for a value. Typing in a filter box re-renders the
 * input immediately (so it stays responsive) while the expensive consumer —
 * a filter over thousands of rows, or a request — only sees the settled value.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
