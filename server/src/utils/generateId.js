// Human-readable, sequential codes for each entity (V-1001, RFQ-2025-042, ...).
// Codes are derived from the highest existing code in the collection so they
// stay stable and readable (unlike raw ObjectIds, which the UI shouldn't show).

// Pull the trailing numeric part out of a code like "PO-2025-021" -> 21.
function trailingNumber(code) {
  if (!code) return 0;
  const m = String(code).match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Generate the next code for a collection.
 * @param {import('mongoose').Model} Model - the mongoose model
 * @param {object} opts
 * @param {string} opts.prefix   - e.g. "V", "RFQ", "Q", "PO", "INV"
 * @param {boolean} [opts.year]  - include the current year segment (RFQ-2025-001)
 * @param {number} [opts.start]  - starting number when collection is empty
 * @param {number} [opts.pad]    - zero-pad width for the numeric part
 */
async function generateCode(Model, { prefix, year = false, start = 1, pad = 3 }) {
  const yearSeg = year ? `${new Date().getFullYear()}` : null;
  const filter = year
    ? { code: new RegExp(`^${prefix}-${yearSeg}-`) }
    : { code: new RegExp(`^${prefix}-`) };

  // Scan recent docs to find the true max trailing number, then increment.
  const recent = await Model.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .select('code')
    .lean();

  const maxExisting = recent.reduce((max, d) => Math.max(max, trailingNumber(d.code)), start - 1);
  const next = maxExisting + 1;

  const num = String(next).padStart(pad, '0');
  return year ? `${prefix}-${yearSeg}-${num}` : `${prefix}-${num}`;
}

module.exports = { generateCode, trailingNumber };
