// Small, dependency-free validation helpers used by controllers/middleware.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/;

const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());
const isGSTIN = (v) => typeof v === 'string' && GSTIN_RE.test(v.trim().toUpperCase());
const isNonEmpty = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const isPositiveNumber = (v) =>
  typeof v === 'number' ? v > 0 : isNonEmpty(v) && Number(v) > 0;

// Returns an object of { field: message } for any failing rule.
// rules = { fieldName: [ [predicate, message], ... ] }
function check(payload, rules) {
  const errors = {};
  for (const [field, checks] of Object.entries(rules)) {
    for (const [predicate, message] of checks) {
      if (!predicate(payload[field], payload)) {
        errors[field] = message;
        break;
      }
    }
  }
  return errors;
}

module.exports = { isEmail, isGSTIN, isNonEmpty, isPositiveNumber, check, EMAIL_RE };
