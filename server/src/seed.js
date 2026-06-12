/**
 * Seed the database with demo data so every module is connected and populated.
 * Run from the server folder:  npm run seed
 */
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

const User = require('./models/User');
const Vendor = require('./models/Vendor');
const RFQ = require('./models/RFQ');
const Quotation = require('./models/Quotation');
const PurchaseOrder = require('./models/PurchaseOrder');
const Invoice = require('./models/Invoice');
const Approval = require('./models/Approval');
const ActivityLog = require('./models/ActivityLog');

const users = [
  { name: 'Dax Patel', email: 'admin@wolferp.in', password: 'admin123', role: 'admin', company: 'Wolf ERP' },
  { name: 'Sneha Rao', email: 'manager@wolferp.in', password: 'manager123', role: 'manager', company: 'Wolf ERP' },
  { name: 'Priya Desai', email: 'approver@wolferp.in', password: 'approver123', role: 'approver', company: 'Wolf ERP' },
];

const vendors = [
  { code: 'V-1001', name: 'Tata Steel Ltd.', category: 'Raw Materials', contact: 'Rohan Mehta', email: 'rohan@tatasteel.com', phone: '+91 98200 11223', gstin: '27AAACT2727Q1ZW', location: 'Mumbai, MH', status: 'Active', rating: 4.7 },
  { code: 'V-1002', name: 'Infosys Procurement', category: 'IT Services', contact: 'Sneha Rao', email: 'sneha@infosys.com', phone: '+91 99000 44556', gstin: '29AAACI4741P1Z8', location: 'Bengaluru, KA', status: 'Active', rating: 4.5 },
  { code: 'V-1003', name: 'Steelcase Inc.', category: 'Office Furniture', contact: 'David Kim', email: 'david@steelcase.com', phone: '+1 616 247 2710', gstin: '', location: 'Michigan, US', status: 'Active', rating: 4.8 },
  { code: 'V-1004', name: 'Reliance Digital', category: 'Electronics', contact: 'Aarti Shah', email: 'aarti@reliancedigital.in', phone: '+91 91670 88990', gstin: '27AABCR1234M1Z5', location: 'Navi Mumbai, MH', status: 'Pending', rating: 4.1 },
  { code: 'V-1005', name: 'Aarogya Supplies', category: 'Medical', contact: 'Dr. Iqbal Khan', email: 'iqbal@aarogya.co.in', phone: '+91 90040 33221', gstin: '24AAACA9999K1ZP', location: 'Ahmedabad, GJ', status: 'Pending', rating: 3.9 },
  { code: 'V-1006', name: 'Cleartrip Corporate', category: 'Travel', contact: 'Meera Nair', email: 'meera@cleartrip.com', phone: '+91 98765 12345', gstin: '27AAACC8765L1ZX', location: 'Mumbai, MH', status: 'Active', rating: 4.3 },
  { code: 'V-1007', name: 'Persistent Systems', category: 'IT Services', contact: 'Karan Joshi', email: 'karan@persistent.com', phone: '+91 90210 55667', gstin: '27AABCP3344N1Z9', location: 'Pune, MH', status: 'Inactive', rating: 4.0 },
  { code: 'V-1008', name: 'Godrej Interio', category: 'Office Furniture', contact: 'Priya Desai', email: 'priya@godrej.com', phone: '+91 99300 77889', gstin: '27AAACG1122H1ZT', location: 'Mumbai, MH', status: 'Active', rating: 4.6 },
];

const rfqs = [
  { code: 'RFQ-2025-042', title: 'Office furniture — 3rd floor refit', category: 'Office Furniture', status: 'Published', created: '2025-05-28', due: '2025-06-12', invitedVendors: ['V-1003', 'V-1008', 'V-1004'], items: [{ name: 'Ergonomic chair', qty: 40, unit: 'pcs' }, { name: 'Height-adjustable desk', qty: 40, unit: 'pcs' }, { name: 'Filing cabinet', qty: 12, unit: 'pcs' }] },
  { code: 'RFQ-2025-041', title: 'Server room cooling upgrade', category: 'Electronics', status: 'Published', created: '2025-05-22', due: '2025-06-08', invitedVendors: ['V-1004', 'V-1002'], items: [{ name: 'Precision AC unit (5T)', qty: 2, unit: 'pcs' }, { name: 'Rack-mount fans', qty: 16, unit: 'pcs' }] },
  { code: 'RFQ-2025-040', title: 'Q3 laptop refresh', category: 'Electronics', status: 'Closed', created: '2025-05-10', due: '2025-05-25', invitedVendors: ['V-1007', 'V-1004'], items: [{ name: 'Business laptop i7/16GB', qty: 60, unit: 'pcs' }] },
  { code: 'RFQ-2025-039', title: 'Annual travel desk contract', category: 'Travel', status: 'Awarded', created: '2025-04-30', due: '2025-05-15', invitedVendors: ['V-1006'], items: [{ name: 'Corporate travel management', qty: 1, unit: 'contract' }] },
  { code: 'RFQ-2025-038', title: 'Raw steel — H1 supply', category: 'Raw Materials', status: 'Draft', created: '2025-06-02', due: '2025-06-20', invitedVendors: [], items: [{ name: 'TMT bars Fe550', qty: 120, unit: 'tonnes' }] },
];

const quotations = [
  { code: 'Q-5001', rfqId: 'RFQ-2025-042', rfqTitle: 'Office furniture — 3rd floor refit', vendor: 'Steelcase Inc.', vendorId: 'V-1003', amount: 482500, deliveryDays: 21, validTill: '2025-06-30', status: 'Received', submitted: '2025-06-01', items: [{ name: 'Ergonomic chair', qty: 40, unitPrice: 6200 }, { name: 'Height-adjustable desk', qty: 40, unitPrice: 4800 }, { name: 'Filing cabinet', qty: 12, unitPrice: 3375 }] },
  { code: 'Q-5002', rfqId: 'RFQ-2025-042', rfqTitle: 'Office furniture — 3rd floor refit', vendor: 'Godrej Interio', vendorId: 'V-1008', amount: 451000, deliveryDays: 28, validTill: '2025-07-05', status: 'Shortlisted', submitted: '2025-06-02', items: [{ name: 'Ergonomic chair', qty: 40, unitPrice: 5800 }, { name: 'Height-adjustable desk', qty: 40, unitPrice: 4500 }, { name: 'Filing cabinet', qty: 12, unitPrice: 3250 }] },
  { code: 'Q-5003', rfqId: 'RFQ-2025-042', rfqTitle: 'Office furniture — 3rd floor refit', vendor: 'Reliance Digital', vendorId: 'V-1004', amount: 498000, deliveryDays: 18, validTill: '2025-06-28', status: 'Received', submitted: '2025-06-03', items: [{ name: 'Ergonomic chair', qty: 40, unitPrice: 6400 }, { name: 'Height-adjustable desk', qty: 40, unitPrice: 4900 }, { name: 'Filing cabinet', qty: 12, unitPrice: 3433 }] },
  { code: 'Q-5004', rfqId: 'RFQ-2025-041', rfqTitle: 'Server room cooling upgrade', vendor: 'Reliance Digital', vendorId: 'V-1004', amount: 312000, deliveryDays: 14, validTill: '2025-06-25', status: 'Received', submitted: '2025-05-30', items: [{ name: 'Precision AC unit (5T)', qty: 2, unitPrice: 142000 }, { name: 'Rack-mount fans', qty: 16, unitPrice: 1750 }] },
  { code: 'Q-5005', rfqId: 'RFQ-2025-040', rfqTitle: 'Q3 laptop refresh', vendor: 'Persistent Systems', vendorId: 'V-1007', amount: 4560000, deliveryDays: 30, validTill: '2025-06-10', status: 'Awarded', submitted: '2025-05-20', items: [{ name: 'Business laptop i7/16GB', qty: 60, unitPrice: 76000 }] },
];

const purchaseOrders = [
  { code: 'PO-2025-021', vendor: 'Tata Steel Ltd.', vendorId: 'V-1001', amount: 345000, status: 'Pending Approval', priority: 'high', created: '2025-06-03', delivery: '2025-06-25', requestedBy: 'Dax Patel', items: [{ name: 'TMT bars Fe550', qty: 8, unitPrice: 43125 }] },
  { code: 'PO-2025-020', vendor: 'Persistent Systems', vendorId: 'V-1007', amount: 4560000, status: 'Approved', priority: 'medium', created: '2025-05-26', delivery: '2025-06-26', requestedBy: 'Sneha Rao', quotationId: 'Q-5005', rfqId: 'RFQ-2025-040', items: [{ name: 'Business laptop i7/16GB', qty: 60, unitPrice: 76000 }] },
  { code: 'PO-2025-019', vendor: 'Cleartrip Corporate', vendorId: 'V-1006', amount: 215000, status: 'Sent', priority: 'low', created: '2025-05-20', delivery: '2025-06-15', requestedBy: 'Meera Nair', items: [{ name: 'Corporate travel — Q2 retainer', qty: 1, unitPrice: 215000 }] },
  { code: 'PO-2025-018', vendor: 'Godrej Interio', vendorId: 'V-1008', amount: 451000, status: 'Received', priority: 'medium', created: '2025-05-12', delivery: '2025-06-05', requestedBy: 'Priya Desai', items: [{ name: 'Ergonomic chair', qty: 40, unitPrice: 5800 }, { name: 'Height-adjustable desk', qty: 40, unitPrice: 4500 }] },
  { code: 'PO-2025-017', vendor: 'Infosys Procurement', vendorId: 'V-1002', amount: 120500, status: 'Pending Approval', priority: 'low', created: '2025-06-04', delivery: '2025-06-30', requestedBy: 'Sneha Rao', items: [{ name: 'Cloud migration — phase 1', qty: 1, unitPrice: 120500 }] },
];

const invoices = [
  { code: 'INV-2025-088', vendor: 'Persistent Systems', vendorId: 'V-1007', poId: 'PO-2025-020', amount: 4560000, status: 'Sent', issued: '2025-06-01', due: '2025-07-01', items: [{ name: 'Business laptop i7/16GB', qty: 60, unitPrice: 76000 }] },
  { code: 'INV-2025-087', vendor: 'Cleartrip Corporate', vendorId: 'V-1006', poId: 'PO-2025-019', amount: 215000, amountPaid: 215000, status: 'Paid', issued: '2025-05-22', due: '2025-06-06', items: [{ name: 'Corporate travel — Q2 retainer', qty: 1, unitPrice: 215000 }] },
  { code: 'INV-2025-086', vendor: 'Godrej Interio', vendorId: 'V-1008', poId: 'PO-2025-018', amount: 451000, status: 'Overdue', issued: '2025-05-10', due: '2025-05-30', items: [{ name: 'Ergonomic chair', qty: 40, unitPrice: 5800 }, { name: 'Height-adjustable desk', qty: 40, unitPrice: 4500 }] },
  { code: 'INV-2025-085', vendor: 'Tata Steel Ltd.', vendorId: 'V-1001', poId: 'PO-2025-016', amount: 345000, amountPaid: 150000, status: 'Partially Paid', issued: '2025-05-05', due: '2025-06-04', items: [{ name: 'TMT bars Fe550', qty: 8, unitPrice: 43125 }] },
  { code: 'INV-2025-084', vendor: 'Infosys Procurement', vendorId: 'V-1002', poId: 'PO-2025-017', amount: 120500, status: 'Draft', issued: '2025-06-04', due: '2025-07-04', items: [{ name: 'Cloud migration — phase 1', qty: 1, unitPrice: 120500 }] },
];

// Approval queue derived from the entities currently awaiting sign-off.
const approvals = [
  { type: 'Purchase Order', refModel: 'PurchaseOrder', refId: 'PO-2025-021', vendor: 'Tata Steel Ltd.', amount: 345000, requestedBy: 'Dax Patel', date: '2025-06-03', priority: 'high', status: 'Pending' },
  { type: 'Purchase Order', refModel: 'PurchaseOrder', refId: 'PO-2025-017', vendor: 'Infosys Procurement', amount: 120500, requestedBy: 'Sneha Rao', date: '2025-06-04', priority: 'medium', status: 'Pending' },
  { type: 'Invoice', refModel: 'Invoice', refId: 'INV-2025-084', vendor: 'Infosys Procurement', amount: 120500, requestedBy: 'Finance Bot', date: '2025-06-04', priority: 'low', status: 'Pending' },
  { type: 'RFQ Approval', refModel: 'RFQ', refId: 'RFQ-2025-038', vendor: '—', amount: 0, requestedBy: 'Dax Patel', date: '2025-06-02', priority: 'medium', status: 'Pending' },
];

// Populate the database. Assumes a live mongoose connection is already open
// (so it can be reused by the in-memory fallback in config/db.js).
async function seedDatabase() {
  logger.info('Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Vendor.deleteMany({}),
    RFQ.deleteMany({}),
    Quotation.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Invoice.deleteMany({}),
    Approval.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  // Users go through .create() so passwords are hashed by the pre-save hook.
  logger.info('Seeding users...');
  for (const u of users) await User.create(u);

  logger.info('Seeding business data...');
  await Vendor.insertMany(vendors);
  await RFQ.insertMany(rfqs);
  await Quotation.insertMany(quotations);
  await PurchaseOrder.insertMany(purchaseOrders);
  await Invoice.insertMany(invoices);
  await Approval.insertMany(approvals);
  await ActivityLog.create({ actor: 'System', action: 'seeded', message: 'Demo data loaded' });

  logger.info('Seed complete! Login: admin@wolferp.in / admin123 (also manager@ / manager123, approver@ / approver123)');
}

// CLI entry point: `npm run seed`
async function runCli() {
  await connectDB();
  await seedDatabase();
  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  runCli().catch((err) => {
    logger.error('Seed failed:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
