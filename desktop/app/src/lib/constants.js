// App-wide constants shared across the client.

// Base URL of the backend API.
//
// This build is loaded live by the desktop app as well as served on the web, so
// the desktop shell gets first say: it injects the configured backend before any
// page script runs, which lets one installer point at the hosted deployment, a
// self-hosted server, or a developer's localhost without a rebuild. In a browser
// that global is absent and this falls through to the build-time env var.
function resolveApiUrl() {
  if (typeof window !== "undefined" && window.__WOLF_API_URL__) {
    return String(window.__WOLF_API_URL__);
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
}

export const API_URL = resolveApiUrl();

// Storage keys (kept stable so existing sessions keep working).
export const TOKEN_KEY = "wolf_token";
export const USER_KEY = "wolf_user";
// Workspace + capabilities for the signed-in member. Cached next to the user so
// a reload knows what they're allowed to do on the FIRST render, instead of
// treating "not loaded yet" as "not allowed".
export const CONTEXT_KEY = "wolf_context";

export const ROLES = ["admin", "manager", "approver", "buyer", "vendor"];

// Where each role lands right after login.
export const ROLE_HOME = {
  admin: "/dashboard",
  manager: "/dashboard",
  approver: "/approvals",
  buyer: "/dashboard",
  vendor: "/quotations",
};

export const VENDOR_CATEGORIES = [
  "Raw Materials",
  "IT Services",
  "Office Furniture",
  "Electronics",
  "Medical",
  "Travel",
  "Logistics",
  "General",
];

export const VENDOR_STATUSES = ["Active", "Pending", "Inactive"];
export const PO_STATUSES = ["Draft", "Pending Approval", "Approved", "Sent", "Received", "Cancelled", "Rejected"];
export const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Cancelled"];
export const RFQ_STATUSES = ["Draft", "Published", "Closed", "Awarded", "Cancelled"];
export const PRIORITIES = ["low", "medium", "high"];

export const COMPANY = {
  name: "Wolf ERP Pvt. Ltd.",
  address: "4th Floor, Lighthouse Tower, BKC, Mumbai 400051",
  gstin: "27AAACW1234F1Z2",
  email: "accounts@wolferp.in",
  phone: "+91 22 4000 1234",
};
