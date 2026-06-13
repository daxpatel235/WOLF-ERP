const mongoose = require('mongoose');

// A single retrievable piece of the ERP knowledge base for Level 3 RAG chat.
// One chunk == one human-readable summary of a domain record (a vendor, RFQ,
// quotation, PO or invoice) plus its embedding vector.
//
// The `embedding` is stored as a plain array of floats. On MongoDB Atlas this
// field is indexed by an Atlas Search "vector" index (see docs/atlas-vector-
// search.md) and queried with `$vectorSearch`. On local/in-memory MongoDB —
// which can't do native vector search — ragService falls back to computing
// cosine similarity in process, so the same data works everywhere.
const knowledgeChunkSchema = new mongoose.Schema(
  {
    // Which user account this knowledge belongs to. Chat is scoped to the
    // signed-in user, so retrieval (and re-indexing) only ever touches the
    // owner's own records — never another account's data.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Source record identity, e.g. source='vendor', sourceId='V-1003'.
    source: {
      type: String,
      required: true,
      enum: ['vendor', 'rfq', 'quotation', 'purchaseOrder', 'invoice'],
      index: true,
    },
    sourceId: { type: String, required: true, index: true }, // human code
    title: { type: String, default: '' }, // short label for citations
    text: { type: String, required: true }, // the embedded natural-language text
    embedding: { type: [Number], default: undefined }, // float vector
    // Lets us detect stale chunks and re-embed only what changed.
    contentHash: { type: String, default: '' },
  },
  { timestamps: true }
);

// One chunk per source record *per owner* (codes like V-1003 repeat across
// accounts); re-indexing upserts on this triple.
knowledgeChunkSchema.index({ owner: 1, source: 1, sourceId: 1 }, { unique: true });

module.exports = mongoose.model('KnowledgeChunk', knowledgeChunkSchema);
