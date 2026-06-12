const Quotation = require('../models/Quotation');
const RFQ = require('../models/RFQ');

// Build a side-by-side comparison of all quotations for one RFQ.
// Returns the data the /quotations/compare screen needs.
async function compareRfq(rfqId) {
  const [rfq, quotations] = await Promise.all([
    RFQ.findOne({ code: rfqId }),
    Quotation.find({ rfqId }).sort({ amount: 1 }),
  ]);

  const live = quotations.filter((q) => q.status !== 'Rejected');

  // Union of all item names across quotations, preserving first-seen order.
  const itemNames = [];
  quotations.forEach((q) =>
    (q.items || []).forEach((it) => {
      if (!itemNames.includes(it.name)) itemNames.push(it.name);
    })
  );

  const vendors = quotations.map((q) => ({
    quotationId: q.code,
    vendor: q.vendor,
    vendorId: q.vendorId,
    amount: q.amount,
    deliveryDays: q.deliveryDays,
    validTill: q.validTill,
    status: q.status,
    prices: Object.fromEntries(
      itemNames.map((name) => {
        const item = (q.items || []).find((it) => it.name === name);
        return [name, item ? item.unitPrice : null];
      })
    ),
  }));

  const amounts = live.map((q) => q.amount).filter((n) => n > 0);
  const lowestAmount = amounts.length ? Math.min(...amounts) : 0;
  const highestAmount = amounts.length ? Math.max(...amounts) : 0;
  const fastest = live.reduce(
    (best, q) => (best === null || q.deliveryDays < best ? q.deliveryDays : best),
    null
  );
  const recommended = live.find((q) => q.amount === lowestAmount) || null;

  return {
    rfq: rfq ? { id: rfq.code, title: rfq.title, category: rfq.category } : { id: rfqId },
    itemNames,
    vendors,
    summary: {
      count: quotations.length,
      lowestAmount,
      highestAmount,
      potentialSavings: highestAmount - lowestAmount,
      fastestDeliveryDays: fastest,
      recommendedQuotationId: recommended ? recommended.code : null,
    },
  };
}

module.exports = { compareRfq };
