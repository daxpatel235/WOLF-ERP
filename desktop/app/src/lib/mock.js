// Centralized mock data for the Wolf ERP dashboard.
// Swap these arrays for real API calls when the backend is ready.

export const vendors = [
  { id: "V-1001", name: "Tata Steel Ltd.", category: "Raw Materials", contact: "Rohan Mehta", email: "rohan@tatasteel.com", phone: "+91 98200 11223", gstin: "27AAACT2727Q1ZW", location: "Mumbai, MH", status: "Active", rating: 4.7, orders: 42, spend: 4820000 },
  { id: "V-1002", name: "Infosys Procurement", category: "IT Services", contact: "Sneha Rao", email: "sneha@infosys.com", phone: "+91 99000 44556", gstin: "29AAACI4741P1Z8", location: "Bengaluru, KA", status: "Active", rating: 4.5, orders: 28, spend: 3120000 },
  { id: "V-1003", name: "Steelcase Inc.", category: "Office Furniture", contact: "David Kim", email: "david@steelcase.com", phone: "+1 616 247 2710", gstin: "—", location: "Michigan, US", status: "Active", rating: 4.8, orders: 15, spend: 1890000 },
  { id: "V-1004", name: "Reliance Digital", category: "Electronics", contact: "Aarti Shah", email: "aarti@reliancedigital.in", phone: "+91 91670 88990", gstin: "27AABCR1234M1Z5", location: "Navi Mumbai, MH", status: "Pending", rating: 4.1, orders: 9, spend: 642000 },
  { id: "V-1005", name: "Aarogya Supplies", category: "Medical", contact: "Dr. Iqbal Khan", email: "iqbal@aarogya.co.in", phone: "+91 90040 33221", gstin: "24AAACA9999K1ZP", location: "Ahmedabad, GJ", status: "Pending", rating: 3.9, orders: 4, spend: 215000 },
  { id: "V-1006", name: "Cleartrip Corporate", category: "Travel", contact: "Meera Nair", email: "meera@cleartrip.com", phone: "+91 98765 12345", gstin: "27AAACC8765L1ZX", location: "Mumbai, MH", status: "Active", rating: 4.3, orders: 21, spend: 985000 },
  { id: "V-1007", name: "Persistent Systems", category: "IT Services", contact: "Karan Joshi", email: "karan@persistent.com", phone: "+91 90210 55667", gstin: "27AABCP3344N1Z9", location: "Pune, MH", status: "Inactive", rating: 4.0, orders: 6, spend: 410000 },
  { id: "V-1008", name: "Godrej Interio", category: "Office Furniture", contact: "Priya Desai", email: "priya@godrej.com", phone: "+91 99300 77889", gstin: "27AAACG1122H1ZT", location: "Mumbai, MH", status: "Active", rating: 4.6, orders: 18, spend: 1540000 },
];

export const rfqs = [
  { id: "RFQ-2025-042", title: "Office furniture — 3rd floor refit", category: "Office Furniture", status: "Published", created: "2025-05-28", due: "2025-06-12", invited: 8, received: 3, items: [{ name: "Ergonomic chair", qty: 40, unit: "pcs" }, { name: "Height-adjustable desk", qty: 40, unit: "pcs" }, { name: "Filing cabinet", qty: 12, unit: "pcs" }] },
  { id: "RFQ-2025-041", title: "Server room cooling upgrade", category: "Electronics", status: "Published", created: "2025-05-22", due: "2025-06-08", invited: 5, received: 4, items: [{ name: "Precision AC unit (5T)", qty: 2, unit: "pcs" }, { name: "Rack-mount fans", qty: 16, unit: "pcs" }] },
  { id: "RFQ-2025-040", title: "Q3 laptop refresh", category: "Electronics", status: "Closed", created: "2025-05-10", due: "2025-05-25", invited: 6, received: 6, items: [{ name: "Business laptop i7/16GB", qty: 60, unit: "pcs" }] },
  { id: "RFQ-2025-039", title: "Annual travel desk contract", category: "Travel", status: "Awarded", created: "2025-04-30", due: "2025-05-15", invited: 4, received: 3, items: [{ name: "Corporate travel management", qty: 1, unit: "contract" }] },
  { id: "RFQ-2025-038", title: "Raw steel — H1 supply", category: "Raw Materials", status: "Draft", created: "2025-06-02", due: "2025-06-20", invited: 0, received: 0, items: [{ name: "TMT bars Fe550", qty: 120, unit: "tonnes" }] },
];

export const quotations = [
  { id: "Q-5001", rfqId: "RFQ-2025-042", rfqTitle: "Office furniture — 3rd floor refit", vendor: "Steelcase Inc.", vendorId: "V-1003", amount: 482500, deliveryDays: 21, validTill: "2025-06-30", status: "Received", submitted: "2025-06-01", items: [{ name: "Ergonomic chair", qty: 40, unitPrice: 6200 }, { name: "Height-adjustable desk", qty: 40, unitPrice: 4800 }, { name: "Filing cabinet", qty: 12, unitPrice: 3375 }] },
  { id: "Q-5002", rfqId: "RFQ-2025-042", rfqTitle: "Office furniture — 3rd floor refit", vendor: "Godrej Interio", vendorId: "V-1008", amount: 451000, deliveryDays: 28, validTill: "2025-07-05", status: "Shortlisted", submitted: "2025-06-02", items: [{ name: "Ergonomic chair", qty: 40, unitPrice: 5800 }, { name: "Height-adjustable desk", qty: 40, unitPrice: 4500 }, { name: "Filing cabinet", qty: 12, unitPrice: 3250 }] },
  { id: "Q-5003", rfqId: "RFQ-2025-042", rfqTitle: "Office furniture — 3rd floor refit", vendor: "Reliance Digital", vendorId: "V-1004", amount: 498000, deliveryDays: 18, validTill: "2025-06-28", status: "Received", submitted: "2025-06-03", items: [{ name: "Ergonomic chair", qty: 40, unitPrice: 6400 }, { name: "Height-adjustable desk", qty: 40, unitPrice: 4900 }, { name: "Filing cabinet", qty: 12, unitPrice: 3433 }] },
  { id: "Q-5004", rfqId: "RFQ-2025-041", rfqTitle: "Server room cooling upgrade", vendor: "Reliance Digital", vendorId: "V-1004", amount: 312000, deliveryDays: 14, validTill: "2025-06-25", status: "Received", submitted: "2025-05-30", items: [{ name: "Precision AC unit (5T)", qty: 2, unitPrice: 142000 }, { name: "Rack-mount fans", qty: 16, unitPrice: 1750 }] },
  { id: "Q-5005", rfqId: "RFQ-2025-040", rfqTitle: "Q3 laptop refresh", vendor: "Persistent Systems", vendorId: "V-1007", amount: 4560000, deliveryDays: 30, validTill: "2025-06-10", status: "Awarded", submitted: "2025-05-20", items: [{ name: "Business laptop i7/16GB", qty: 60, unitPrice: 76000 }] },
];

export const purchaseOrders = [
  { id: "PO-2025-021", vendor: "Tata Steel Ltd.", vendorId: "V-1001", amount: 345000, status: "Pending Approval", priority: "high", created: "2025-06-03", delivery: "2025-06-25", items: [{ name: "TMT bars Fe550", qty: 8, unitPrice: 43125 }] },
  { id: "PO-2025-020", vendor: "Persistent Systems", vendorId: "V-1007", amount: 4560000, status: "Approved", priority: "medium", created: "2025-05-26", delivery: "2025-06-26", items: [{ name: "Business laptop i7/16GB", qty: 60, unitPrice: 76000 }] },
  { id: "PO-2025-019", vendor: "Cleartrip Corporate", vendorId: "V-1006", amount: 215000, status: "Sent", priority: "low", created: "2025-05-20", delivery: "2025-06-15", items: [{ name: "Corporate travel — Q2 retainer", qty: 1, unitPrice: 215000 }] },
  { id: "PO-2025-018", vendor: "Godrej Interio", vendorId: "V-1008", amount: 451000, status: "Received", priority: "medium", created: "2025-05-12", delivery: "2025-06-05", items: [{ name: "Ergonomic chair", qty: 40, unitPrice: 5800 }, { name: "Height-adjustable desk", qty: 40, unitPrice: 4500 }] },
  { id: "PO-2025-017", vendor: "Infosys Procurement", vendorId: "V-1002", amount: 120500, status: "Draft", priority: "low", created: "2025-06-04", delivery: "2025-06-30", items: [{ name: "Cloud migration — phase 1", qty: 1, unitPrice: 120500 }] },
];

export const invoices = [
  { id: "INV-2025-088", vendor: "Persistent Systems", vendorId: "V-1007", poId: "PO-2025-020", amount: 4560000, status: "Sent", issued: "2025-06-01", due: "2025-07-01", items: [{ name: "Business laptop i7/16GB", qty: 60, unitPrice: 76000 }] },
  { id: "INV-2025-087", vendor: "Cleartrip Corporate", vendorId: "V-1006", poId: "PO-2025-019", amount: 215000, status: "Paid", issued: "2025-05-22", due: "2025-06-06", items: [{ name: "Corporate travel — Q2 retainer", qty: 1, unitPrice: 215000 }] },
  { id: "INV-2025-086", vendor: "Godrej Interio", vendorId: "V-1008", poId: "PO-2025-018", amount: 451000, status: "Overdue", issued: "2025-05-10", due: "2025-05-30", items: [{ name: "Ergonomic chair", qty: 40, unitPrice: 5800 }, { name: "Height-adjustable desk", qty: 40, unitPrice: 4500 }] },
  { id: "INV-2025-085", vendor: "Tata Steel Ltd.", vendorId: "V-1001", poId: "PO-2025-016", amount: 345000, status: "Partially Paid", issued: "2025-05-05", due: "2025-06-04", items: [{ name: "TMT bars Fe550", qty: 8, unitPrice: 43125 }] },
  { id: "INV-2025-084", vendor: "Infosys Procurement", vendorId: "V-1002", poId: "PO-2025-015", amount: 120500, status: "Draft", issued: "2025-06-04", due: "2025-07-04", items: [{ name: "Cloud migration — phase 1", qty: 1, unitPrice: 120500 }] },
];

export const approvals = [
  { id: "PO-2025-021", type: "Purchase Order", vendor: "Tata Steel Ltd.", amount: 345000, requestedBy: "Dax Patel", date: "2025-06-03", priority: "high" },
  { id: "PO-2025-017", type: "Purchase Order", vendor: "Infosys Procurement", amount: 120500, requestedBy: "Sneha Rao", date: "2025-06-04", priority: "medium" },
  { id: "INV-2025-084", type: "Invoice", vendor: "Infosys Procurement", amount: 120500, requestedBy: "Finance Bot", date: "2025-06-04", priority: "low" },
  { id: "RFQ-2025-038", type: "RFQ Approval", vendor: "—", amount: 0, requestedBy: "Dax Patel", date: "2025-06-02", priority: "medium" },
];

// Lookup helpers
export const findVendor = (id) => vendors.find((v) => v.id === id);
export const findRfq = (id) => rfqs.find((r) => r.id === id);
export const findQuotation = (id) => quotations.find((q) => q.id === id);
export const findPO = (id) => purchaseOrders.find((p) => p.id === id);
export const findInvoice = (id) => invoices.find((i) => i.id === id);

export const COMPANY = {
  name: "Wolf ERP Pvt. Ltd.",
  address: "4th Floor, Lighthouse Tower, BKC, Mumbai 400051",
  gstin: "27AAACW1234F1Z2",
  email: "accounts@wolferp.in",
  phone: "+91 22 4000 1234",
};
