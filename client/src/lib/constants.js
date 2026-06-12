// App-wide constants shared across the client.

// Base URL of the backend API. Override with NEXT_PUBLIC_API_URL in .env.local.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Storage keys (kept stable so existing sessions keep working).
export const TOKEN_KEY = "wolf_token";
export const USER_KEY = "wolf_user";

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
