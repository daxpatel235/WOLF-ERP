// Shared Mongoose schema helpers.
// Every entity exposes a clean `id` (the human code when present, else the
// ObjectId) and hides Mongo internals from API responses.

function baseOptions({ hidePassword = false } = {}) {
  const transform = (_doc, ret) => {
    ret.id = ret.code || String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.code;
    if (hidePassword) delete ret.password;
    return ret;
  };
  return {
    timestamps: true,
    toJSON: { virtuals: false, transform },
    toObject: { virtuals: false, transform },
  };
}

// Reusable line-item subdocument: { name, qty, unit?, unitPrice? }
const lineItemFields = {
  name: { type: String, required: true, trim: true },
  qty: { type: Number, required: true, min: 0, default: 1 },
  unit: { type: String, trim: true, default: 'pcs' },
  unitPrice: { type: Number, min: 0, default: 0 },
};

// Sum of qty * unitPrice across line items.
const sumItems = (items = []) =>
  items.reduce((t, it) => t + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);

module.exports = { baseOptions, lineItemFields, sumItems };
