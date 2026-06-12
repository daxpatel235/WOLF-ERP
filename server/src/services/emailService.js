const env = require('../config/env');
const { getTransport } = require('../config/email');
const logger = require('../utils/logger');

// Generic mail sender. Never throws — email is best-effort so it can't break
// the core flow. Falls back to console logging when SMTP is not configured.
async function sendMail({ to, subject, html, text }) {
  const transport = getTransport();
  if (!transport) {
    logger.info(`[email:dev] To: ${to} | Subject: ${subject}`);
    return { delivered: false, simulated: true };
  }
  try {
    const info = await transport.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
    logger.info(`Email sent to ${to} (${info.messageId})`);
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    logger.error(`Email to ${to} failed: ${err.message}`);
    return { delivered: false, error: err.message };
  }
}

// Convenience wrappers used by controllers.
const sendRFQInvite = (vendorEmail, rfq) =>
  sendMail({
    to: vendorEmail,
    subject: `Invitation to quote — ${rfq.title} (${rfq.code || rfq.id})`,
    html: `<p>You are invited to submit a quotation for <strong>${rfq.title}</strong>.</p>
           <p>Reference: ${rfq.code || rfq.id}. Please respond before ${rfq.due || 'the due date'}.</p>`,
  });

const sendInvoiceMail = (to, invoice, note = '') =>
  sendMail({
    to,
    subject: `Invoice ${invoice.code || invoice.id} from Wolf ERP`,
    html: `<p>Please find invoice <strong>${invoice.code || invoice.id}</strong> for
           ₹${Number(invoice.amount || 0).toLocaleString('en-IN')}.</p>
           ${note ? `<p>${note}</p>` : ''}`,
  });

module.exports = { sendMail, sendRFQInvite, sendInvoiceMail };
