const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const { asyncHandler } = require('../middleware/errorHandler');
const { generateCode } = require('../utils/generateId');
const { sumItems } = require('../utils/schema');
const { sendInvoiceMail } = require('../services/emailService');
const notify = require('../services/notificationService');

// Keep status in sync with how much has been paid.
function reconcileStatus(invoice) {
  if (invoice.status === 'Cancelled') return 'Cancelled';
  // Payments win regardless of the prior state (e.g. paying a Draft invoice).
  if (invoice.amount > 0 && invoice.amountPaid >= invoice.amount) return 'Paid';
  if (invoice.amountPaid > 0) return 'Partially Paid';
  // No payment yet: a Draft stays Draft; a sent invoice past its due date is Overdue.
  if (invoice.status === 'Draft') return 'Draft';
  if (invoice.due && new Date(invoice.due) < new Date()) return 'Overdue';
  return invoice.status;
}

// GET /api/invoices
const list = asyncHandler(async (req, res) => {
  const { q, status, vendorId, poId } = req.query;
  const filter = {};
  if (status && status !== 'All') filter.status = status;
  if (vendorId) filter.vendorId = vendorId;
  if (poId) filter.poId = poId;
  if (q) filter.$or = [{ vendor: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }, { poId: new RegExp(q, 'i') }];

  const invoices = await Invoice.find(filter).sort({ issued: -1 });
  res.json({ data: invoices.map((i) => i.toJSON()), count: invoices.length });
});

// GET /api/invoices/:id
const getOne = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ code: req.params.id });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });
  res.json({ data: invoice.toJSON() });
});

// POST /api/invoices  (optionally seeded from a PO via poId)
const create = asyncHandler(async (req, res) => {
  const code = await generateCode(Invoice, { prefix: 'INV', year: true, pad: 3 });
  let body = { ...req.body };

  // If linked to a PO and fields are missing, pull them from the PO.
  if (body.poId) {
    const po = await PurchaseOrder.findOne({ code: body.poId });
    if (po) {
      body.vendor = body.vendor || po.vendor;
      body.vendorId = body.vendorId || po.vendorId;
      body.items = body.items && body.items.length ? body.items : po.items;
      body.amount = body.amount != null ? body.amount : po.amount;
    }
  }
  const items = body.items || [];
  const amount = body.amount != null ? body.amount : sumItems(items);

  const invoice = await Invoice.create({ ...body, code, amount, createdBy: req.user?._id });
  await notify.record({
    actor: req.user?.name || 'System',
    action: 'created',
    entityType: 'Invoice',
    entityId: code,
    message: `Invoice ${code} created for ${invoice.vendor}`,
  });
  res.status(201).json({ data: invoice.toJSON() });
});

// POST /api/invoices/:id/status { status, amountPaid }
const setStatus = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ code: req.params.id });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

  if (req.body.amountPaid !== undefined) invoice.amountPaid = Number(req.body.amountPaid) || 0;
  if (req.body.status) invoice.status = req.body.status;
  invoice.status = reconcileStatus(invoice);
  await invoice.save();

  await notify.record({
    actor: req.user?.name || 'System',
    action: 'updated status',
    entityType: 'Invoice',
    entityId: invoice.code,
    message: `Invoice ${invoice.code} marked ${invoice.status}`,
  });
  res.json({ data: invoice.toJSON() });
});

// POST /api/invoices/:id/pay  (record a full or partial payment)
const recordPayment = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ code: req.params.id });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

  const amount = Number(req.body.amount);
  invoice.amountPaid += Number.isFinite(amount) && amount > 0 ? amount : invoice.amount - invoice.amountPaid;
  invoice.status = reconcileStatus(invoice);
  await invoice.save();
  res.json({ data: invoice.toJSON() });
});

// POST /api/invoices/:id/send  (email + mark Sent)
const send = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ code: req.params.id });
  if (!invoice) return res.status(404).json({ message: 'Invoice not found.' });

  const to = req.body.to || req.body.email;
  const result = await sendInvoiceMail(to || 'accounts@example.com', invoice, req.body.note);
  if (invoice.status === 'Draft') invoice.status = 'Sent';
  await invoice.save();

  await notify.record({
    actor: req.user?.name || 'System',
    action: 'sent',
    entityType: 'Invoice',
    entityId: invoice.code,
    message: `Invoice ${invoice.code} sent${to ? ` to ${to}` : ''}`,
  });
  res.json({ data: invoice.toJSON(), email: result });
});

module.exports = { list, getOne, create, setStatus, recordPayment, send };
