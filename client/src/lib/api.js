// Thin fetch wrapper around the Wolf ERP backend.
// Attaches the JWT, parses JSON, and turns non-2xx responses into ApiError.
//
// In the desktop app this layer doubles as the offline snapshot: every
// successful read is mirrored to disk through the Rust shell, and when the
// server can't be reached the snapshot is served instead of an error. Writes
// are never served from the snapshot — offline the app is strictly read-only,
// because a queued mutation applied hours later against data that has since
// moved on is worse than an honest refusal.

import { API_URL, TOKEN_KEY } from "./constants";
import {
  isDesktop,
  transport,
  cacheGet,
  cachePut,
  markOnline,
  markOffline,
} from "./desktop";

export class ApiError extends Error {
  constructor(message, status = 0, errors = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors; // field-level validation messages, if any
    /** True when this failed because the machine is offline, not because the
     *  request was bad. The UI uses it to explain rather than just complain. */
    this.offline = false;
    /** True when the payload came from the on-disk snapshot. */
    this.stale = false;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function qs(params) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries).toString();
}

// Client-side backstop, just above the server's 30s timeout. Aborting a hung
// request lets the UI surface a clear "waking up" message instead of an endless
// spinner when the host is cold-starting.
const REQUEST_TIMEOUT_MS = 35000;

/**
 * Serve a GET from the on-disk snapshot, or rethrow if there isn't one.
 *
 * Only reached after the network has already failed, so the choice is between
 * stale data and nothing at all.
 */
async function serveFromSnapshot(path, networkError) {
  const hit = await cacheGet(path);
  if (!hit?.body) {
    markOffline();
    networkError.offline = true;
    throw networkError;
  }
  try {
    const data = JSON.parse(hit.body);
    markOffline();
    return data;
  } catch {
    // A truncated or corrupt entry is no better than a miss.
    markOffline();
    networkError.offline = true;
    throw networkError;
  }
}

async function request(path, { method = "GET", body, headers = {}, auth = true, _retried = false } = {}) {
  const opts = { method, headers: { ...headers } };

  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  if (auth) {
    const token = getToken();
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  opts.signal = controller.signal;

  // Reads are snapshotted; writes never are.
  const snapshottable = isDesktop() && method === "GET";

  let res;
  try {
    // Browser fetch on the web and on the live desktop UI; the Rust HTTP client
    // when running from the installer's bundled copy. See lib/desktop.js.
    const send = await transport();
    res = await send(`${API_URL}${path}`, opts);
  } catch (err) {
    // The first request after the host cold-starts (e.g. Render free tier spins
    // down when idle) often fails or aborts, then succeeds moments later. Retry
    // GETs once — they're idempotent, so this is always safe. Mutations are not
    // retried, so a POST can never run twice.
    if (method === "GET" && !_retried) {
      return request(path, { method, body, headers, auth, _retried: true });
    }

    const aborted = err?.name === "AbortError";
    const failure = new ApiError(
      aborted
        ? "The server is taking too long to respond — it may be waking up. Please try again."
        : `Cannot reach the server. Is the backend running at ${API_URL}?`,
      0
    );

    if (snapshottable) return serveFromSnapshot(path, failure);

    if (isDesktop()) {
      markOffline();
      failure.offline = true;
      failure.message =
        "You're offline, so this change can't be saved. Wolf ERP is read-only until the connection is back.";
    }
    throw failure;
  } finally {
    clearTimeout(timer);
  }

  // Parse body (may be empty).
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  // A 503 from the server's own timeout backstop on a cold start → retry GETs once.
  if (res.status === 503 && method === "GET" && !_retried) {
    return request(path, { method, body, headers, auth, _retried: true });
  }

  if (!res.ok) {
    // The server answered, so we are online — this is a real application error
    // (validation, permissions, a missing record) and the snapshot must not
    // paper over it with data that contradicts what the server just said.
    if (isDesktop()) markOnline();
    throw new ApiError(
      data?.message || `Request failed (${res.status})`,
      res.status,
      data?.errors || null
    );
  }

  if (isDesktop()) {
    markOnline();
    // Fire-and-forget: a slow disk must never hold up rendering, and a failed
    // write only costs this one entry in the snapshot.
    if (snapshottable && text) void cachePut(path, text);
  }
  return data;
}

export const api = {
  request,
  get: (p, o) => request(p, { ...o, method: "GET" }),
  post: (p, body, o) => request(p, { ...o, method: "POST", body }),
  put: (p, body, o) => request(p, { ...o, method: "PUT", body }),
  del: (p, o) => request(p, { ...o, method: "DELETE" }),
};

// ---- Resource helpers (return the parsed JSON envelope) ----

export const authApi = {
  login: (creds) => request("/auth/login", { method: "POST", body: creds, auth: false }),
  register: (data) => request("/auth/register", { method: "POST", body: data, auth: false }),
  me: () => request("/auth/me"),
  forgotPassword: (email) =>
    request("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (token, password) =>
    request("/auth/reset-password", { method: "POST", body: { token, password }, auth: false }),
};

// Team collaboration: the member directory and invitations.
export const teamApi = {
  members: () => request("/team/members"),
  invite: (body) => request("/team/invite", { method: "POST", body }),
  invites: () => request("/team/invites"),
  revokeInvite: (id) => request(`/team/invites/${id}`, { method: "DELETE" }),
  updateMember: (id, body) => request(`/team/members/${id}`, { method: "PATCH", body }),
  removeMember: (id) => request(`/team/members/${id}`, { method: "DELETE" }),
  // Public — the invitee has no account yet.
  previewInvite: (token) => request(`/team/invite/${token}`, { auth: false }),
  accept: (body) => request("/team/accept", { method: "POST", body, auth: false }),
};

// The workspace profile + settings that drive "organization mode".
export const organizationApi = {
  get: () => request("/organization"),
  update: (body) => request("/organization", { method: "PATCH", body }),
};

// Team chat. Messages are polled with an ObjectId cursor: pass the previous
// response's `cursor` as `after` and you only ever receive what's new.
export const chatApi = {
  channels: () => request("/chat/channels"),
  createChannel: (body) => request("/chat/channels", { method: "POST", body }),
  messages: (channelId, { after, limit } = {}) =>
    request(`/chat/channels/${channelId}/messages${qs({ after, limit })}`),
  send: (channelId, body) =>
    request(`/chat/channels/${channelId}/messages`, { method: "POST", body: { body } }),
};

export const vendorsApi = {
  list: (params) => request(`/vendors${qs(params)}`),
  get: (id) => request(`/vendors/${id}`),
  create: (data) => request("/vendors", { method: "POST", body: data }),
  update: (id, data) => request(`/vendors/${id}`, { method: "PUT", body: data }),
  remove: (id) => request(`/vendors/${id}`, { method: "DELETE" }),
};

export const rfqsApi = {
  list: (params) => request(`/rfqs${qs(params)}`),
  get: (id) => request(`/rfqs/${id}`),
  create: (data) => request("/rfqs", { method: "POST", body: data }),
  update: (id, data) => request(`/rfqs/${id}`, { method: "PUT", body: data }),
  publish: (id) => request(`/rfqs/${id}/publish`, { method: "POST" }),
  submit: (id, body) => request(`/rfqs/${id}/submit`, { method: "POST", body }),
};

export const quotationsApi = {
  list: (params) => request(`/quotations${qs(params)}`),
  get: (id) => request(`/quotations/${id}`),
  compare: (rfqId) => request(`/quotations/compare${qs({ rfqId })}`),
  create: (data) => request("/quotations", { method: "POST", body: data }),
  shortlist: (id) => request(`/quotations/${id}/shortlist`, { method: "POST" }),
  setStatus: (id, status) => request(`/quotations/${id}/status`, { method: "POST", body: { status } }),
  award: (id, body) => request(`/quotations/${id}/award`, { method: "POST", body }),
};

export const purchaseOrdersApi = {
  list: (params) => request(`/purchase-orders${qs(params)}`),
  get: (id) => request(`/purchase-orders/${id}`),
  create: (data) => request("/purchase-orders", { method: "POST", body: data }),
  update: (id, data) => request(`/purchase-orders/${id}`, { method: "PUT", body: data }),
  submit: (id) => request(`/purchase-orders/${id}/submit`, { method: "POST" }),
  setStatus: (id, status) => request(`/purchase-orders/${id}/status`, { method: "POST", body: { status } }),
};

export const invoicesApi = {
  list: (params) => request(`/invoices${qs(params)}`),
  get: (id) => request(`/invoices/${id}`),
  create: (data) => request("/invoices", { method: "POST", body: data }),
  setStatus: (id, body) => request(`/invoices/${id}/status`, { method: "POST", body }),
  pay: (id, amount) => request(`/invoices/${id}/pay`, { method: "POST", body: { amount } }),
  send: (id, body) => request(`/invoices/${id}/send`, { method: "POST", body }),
};

export const approvalsApi = {
  list: (params) => request(`/approvals${qs(params)}`),
  count: () => request("/approvals/count"),
  decide: (id, body) => request(`/approvals/${id}/decide`, { method: "POST", body }),
};

export const reportsApi = {
  summary: () => request("/reports/summary"),
  spendByCategory: () => request("/reports/spend-by-category"),
  spendByVendor: () => request("/reports/spend-by-vendor"),
  activity: (limit) => request(`/reports/activity${qs({ limit })}`),
};

// AI features (Gemini-powered). `status` is unauthenticated so the UI can
// decide whether to show AI affordances before the user acts.
export const aiApi = {
  status: () => request("/ai/status", { auth: false }),
  // Level 1 — assistive
  draftRfq: (prompt) => request("/ai/rfq/draft", { method: "POST", body: { prompt } }),
  comparisonInsight: (rfqId) => request("/ai/quotations/insight", { method: "POST", body: { rfqId } }),
  reportSummary: () => request("/ai/reports/summary"),
  // Level 2 — analytical
  extract: (body) => request("/ai/extract", { method: "POST", body }),
  vendorRisk: (id) => request(`/ai/vendors/${id}/risk`),
  invoiceAudit: (id) => request(`/ai/invoices/${id}/audit`),
  // Level 3 — conversational / RAG
  chat: (message, history) => request("/ai/chat", { method: "POST", body: { message, history } }),
  act: (action) => request("/ai/chat/act", { method: "POST", body: { action } }),
  reindex: (force = false) => request("/ai/chat/reindex", { method: "POST", body: { force } }),
};

export default api;
