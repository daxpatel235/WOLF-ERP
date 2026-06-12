// Tiny in-memory sliding-window rate limiter.
//
// Per-process only (fine for a single instance / dev). For a multi-instance
// production deployment, back this with Redis instead. Used to cap how many
// AI chat messages a single user can send in a window, bounding API cost.

function createRateLimiter({ max, windowMs }) {
  const hits = new Map(); // key -> array of request timestamps (ms)

  // Occasionally drop fully-expired keys so the map doesn't grow unbounded.
  function sweep(now) {
    for (const [key, arr] of hits) {
      if (!arr.length || now - arr[arr.length - 1] >= windowMs) hits.delete(key);
    }
  }

  let sinceSweep = 0;

  return function check(key) {
    const now = Date.now();
    if ((sinceSweep += 1) % 500 === 0) sweep(now);

    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      const retryMs = windowMs - (now - recent[0]);
      return { ok: false, retryMs };
    }
    recent.push(now);
    hits.set(key, recent);
    return { ok: true, remaining: max - recent.length };
  };
}

module.exports = { createRateLimiter };
