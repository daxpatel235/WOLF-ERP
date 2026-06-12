// Thin fetch wrapper around the Wolf ERP backend.
// Attaches the JWT, parses JSON, and turns non-2xx responses into ApiError.

import { API_URL, TOKEN_KEY } from "./constants";

export class ApiError extends Error {
  constructor(message, status = 0, errors = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors; // field-level validation messages, if any
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

async function request(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const opts = { method, headers: { ...headers } };

  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  if (auth) {
    const token = getToken();
    if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, opts);
  } catch {
    throw new ApiError(
      `Cannot reach the server. Is the backend running at ${API_URL}?`,
      0
    );
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

  if (!res.ok) {
    throw new ApiError(
      data?.message || `Request failed (${res.status})`,
      res.status,
      data?.errors || null
    );
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
  reindex: (force = false) => request("/ai/chat/reindex", { method: "POST", body: { force } }),
};

export default api;
