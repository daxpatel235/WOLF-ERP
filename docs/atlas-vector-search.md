# MongoDB Atlas Vector Search — setup for Level 3 RAG chat

The chat assistant ("Wolf AI") answers questions from your own ERP records using
**retrieval-augmented generation (RAG)**. Each vendor / RFQ / quotation / PO /
invoice is summarised, embedded into a 768-dim vector with Google's
`gemini-embedding-001`, and stored in the `knowledgechunks` collection. At query
time the user's question is embedded and the most similar chunks are retrieved
and fed to the LLM.

Retrieval has two backends, chosen automatically:

| Where you run | Backend | Setup needed |
|---|---|---|
| Local / in-memory MongoDB | In-process **cosine similarity** | **None** — works out of the box |
| MongoDB **Atlas** | Native **`$vectorSearch`** | Create the index below (one-time) |

So everything works today with zero setup. Do the steps below only when you move
to Atlas and want fast, scalable vector search.

---

## 1. Point the app at Atlas

In `server/.env`, set your Atlas connection string (this also makes your data
persistent — the in-memory DB resets on restart):

```
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/wolf_erp
```

The app auto-detects `mongodb+srv` / `mongodb.net` and switches to
`$vectorSearch`. Keep `GEMINI_API_KEY` set so embeddings are generated.

## 2. Seed the knowledge base

Embeddings are built automatically the first time someone opens the chat. To
build them up front (recommended on Atlas), an admin/manager can call:

```
POST /api/ai/chat/reindex          # incremental (only changed records)
POST /api/ai/chat/reindex { "force": true }   # re-embed everything
```

This populates `knowledgechunks` with `embedding` arrays.

## 3. Create the Atlas Vector Search index

In the Atlas UI: **Atlas Search → Create Search Index → JSON Editor →**
**Vector Search**. Select database `wolf_erp`, collection `knowledgechunks`,
name the index exactly **`knowledge_vector_index`** (must match `VECTOR_INDEX`
in `.env`), and paste:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    { "type": "filter", "path": "source" }
  ]
}
```

> `numDimensions` (768) must equal `EMBED_DIM`. If you switch embedding models,
> update both and re-run a `force` reindex.

Index builds take a minute or two. Once it's **Active**, chat queries use
`$vectorSearch` automatically. If the index is missing or still building, the
app logs a warning and transparently falls back to cosine — it never breaks.

## 4. Keeping the index fresh

Re-run `POST /api/ai/chat/reindex` after large data changes (it's incremental —
only re-embeds records whose text changed, and prunes deleted ones). For a
production setup, call it on a schedule (e.g. a nightly cron) or after bulk
imports.

---

### Troubleshooting

- **"Atlas $vectorSearch unavailable … falling back to cosine"** in server logs:
  the index doesn't exist yet, is still building, or the name doesn't match
  `VECTOR_INDEX`. Cosine still answers correctly; create/verify the index for
  scale.
- **Chat says AI isn't configured (503):** set `GEMINI_API_KEY` in `server/.env`.
- **Dimension mismatch errors:** `EMBED_DIM`, the embedding model, and the
  index's `numDimensions` must all agree (we request 768 from
  `gemini-embedding-001`).
