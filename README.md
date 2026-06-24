# Wolf ERP — AI-Powered Procurement & Vendor Management

A full-stack **Procurement & Vendor Management ERP** that digitises the entire
source-to-pay lifecycle — vendors, RFQs, quotations, approvals, purchase orders,
and invoices — in one connected platform. AI runs throughout: **Groq (Llama 3.3
70B)** powers a retrieval-grounded chat assistant, while **Google Gemini** handles
document scanning, drafting, and analytics.

---

## 🌐 Live Demo

| | URL |
|---|---|
| **App (frontend)** | **https://wolf-erp.vercel.app** |
| **API (backend)** | https://wolf-erp-api.onrender.com |

> **Getting in:** the live database starts empty — open the app and **Create an
> account** to begin. (A local install auto-seeds demo logins; see
> [Local Development](#-local-development).)
>
> ℹ️ This is a **demo** deployment. Data you add is for demonstration only and is
> cleared automatically after **30 days of inactivity** (your login is always
> kept). The backend runs on a free tier, so the first request after an idle spell
> may take ~30–50s to wake up.

---

## 🎯 Overview

Instead of fragmented emails and spreadsheets, Wolf ERP gives an organisation a
single workspace where every procurement decision flows automatically into the
next step:

```
Vendor Registration
    ↓
RFQ Creation & Vendor Invitation
    ↓
Vendor Quotation Submission
    ↓
Quotation Comparison & Award
    ↓
Purchase Order Auto-Draft
    ↓
Approval Workflow
    ↓
Invoice Generation
    ↓
Payment & Reporting
```

Every account is its own **isolated workspace** — vendors, RFQs, quotations, POs,
invoices, approvals, reports, and activity are all scoped to the signed-in user.

---

## ✨ Key Features

### Core Procurement
- **Vendor Management** — categories, GST/tax details, contacts, ratings, spend
  tracking, and status (Active / Pending / Inactive).
- **RFQs** — structured requests with line items, quantities, deadlines, and
  multi-vendor invitations.
- **Quotations** — vendor pricing & delivery responses with **side-by-side
  comparison**, lowest-price highlighting, and one-click award/reject.
- **Approval Engine** — an idempotent state machine that routes POs, invoices, and
  RFQs through role-based approvers, with a full audit trail.
- **Purchase Orders** — auto-drafted from awarded quotations; sequential numbering;
  status flow Draft → Pending → Approved → Sent → Received.
- **Invoices** — generated from POs with automatic tax math, status tracking, and
  **PDF download / print / email**.
- **Reports & Analytics** — spend KPIs, spend-by-category, top vendors, and activity
  trends.

### AI Features
All AI runs through `POST /api/ai/*` and degrades gracefully — the app works fully
even with no API keys configured.

- **Wolf AI Chat (Agentic RAG)** — a floating assistant that answers questions
  grounded in *your own* data **and takes actions on your behalf**. Gemini
  embeddings + vector search retrieve the most relevant records, a **live account
  snapshot** supplies whole-account totals/counts/rankings, and **Groq's Llama 3.3
  70B** (with tool calling) writes the answer or proposes an action. Just say
  *"Create an RFQ for 10 office chairs"* or *"Add a vendor: Acme Corp, Electronics,
  Mumbai"* — the assistant prepares it and **you confirm before anything is saved**.
  Strictly scope-guarded to procurement topics, with per-user rate limiting and
  source citations.
- **Document Scanning** — upload a vendor invoice or quotation image and **Gemini
  2.5 Flash** extracts the vendor, document number, totals, GST, and line items into
  a reviewable form. Rate-limited per user.
- **Assistive Drafting** — describe a need in plain English and get a structured RFQ
  draft with inferred line items.
- **Analytical Insights** — award recommendations, executive report summaries,
  vendor risk scoring, and invoice 3-way-match audits.

> **Why two providers?** Each AI task uses the best free option for the job: Groq's
> large open model for fluent chat answers, Gemini's strong multimodal model for
> document vision, and Gemini's top-ranked embeddings for retrieval. Any provider
> can be disabled independently — chat falls back to Gemini if no Groq key is set.

### Accounts & Demo-Data Lifecycle
- **Role-based access** — Admin, Manager, Approver, Buyer, Vendor.
- **JWT auth** — bcrypt-hashed passwords; "Remember me" keeps a session for up to
  **15 days**, after which the token expires and you return to the landing page.
- **Dormancy reset** — if nobody signs in for **30 days**, every collection *except
  user logins* is wiped, keeping the free database lean.

---

## 🛠 Tech Stack

**Frontend** — Next.js 15.5 (App Router), React 18, Tailwind CSS 3.4, Lucide icons,
jsPDF + html2canvas for client-side PDFs. Deployed on **Vercel**.

**Backend** — Node.js + Express 4, MongoDB via Mongoose 8, JWT + bcryptjs,
Nodemailer (SMTP). Deployed on **Render**.

**AI** —
- Chat answers: **Groq** `llama-3.3-70b-versatile` (OpenAI-compatible REST, no extra SDK)
- Document scanning & drafting/analytics: **Google Gemini** `gemini-2.5-flash` (`@google/genai`)
- Embeddings for RAG: **Gemini** `gemini-embedding-001` (768-dim)

**Database** — **MongoDB Atlas** (with Atlas Vector Search powering RAG). A
persistent local MongoDB fallback (embedded `mongod` on disk, so data survives
restarts) lets the app run with zero setup in development.

---

## 📁 Project Structure

```
WOLF-ERP/
├── client/                  # Next.js frontend
│   └── src/
│       ├── app/(auth)/      # login, register, forgot-password
│       ├── app/(dashboard)/ # procurement modules
│       ├── app/(marketing)/ # landing & pricing
│       ├── components/      # reusable UI (incl. AI chat, demo notices)
│       ├── context/         # AuthContext (JWT/session + demo notices)
│       └── hooks/ lib/      # hooks, API client, utils, PDF
├── server/                  # Express backend (MVC)
│   └── src/
│       ├── config/          # db, env, chatDomain (AI scope)
│       ├── models/          # Mongoose schemas
│       ├── controllers/     # request handlers
│       ├── routes/          # REST endpoints
│       ├── middleware/      # auth, roles, validation, errors
│       ├── services/        # approval engine, comparison, PDF, email,
│       │                    #   aiService (Groq + Gemini), embeddingService,
│       │                    #   ragService, cleanupService
│       ├── seed.js          # demo-data generator
│       └── templates/       # email/PDF HTML
├── samples/                 # sample documents for testing AI scanning
├── docs/                    # API.md, SCHEMA.md, DEMO_FLOW.md, atlas-vector-search.md
└── render.yaml              # Render Blueprint for the backend
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+ and npm
- MongoDB is **optional** — the backend falls back to a persistent local database
  (data survives restarts) and auto-seeds demo data on first boot.

### 1. Clone
```bash
git clone https://github.com/daxpatel235/WOLF-ERP.git
cd WOLF-ERP
```

### 2. Backend (terminal 1)
```bash
cd server
npm install
npm run dev        # API on http://localhost:5000 (auto-seeds on first boot)
```

### 3. Frontend (terminal 2)
```bash
cd client
npm install
npm run dev        # App on http://localhost:3000
```

### Seeded demo logins (local / seeded environments only)
| Email | Password | Role |
|---|---|---|
| `manager@wolferp.in` | `manager123` | Manager |
| `approver@wolferp.in` | `approver123` | Approver |

> These exist only after seeding. On the **live demo**, register your own account.
> The seeded demo data belongs to `manager@wolferp.in`; a freshly registered
> account starts with an empty workspace.

**Admins.** Self-registration only creates non-admin roles. To get an admin, set
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before seeding, or promote an existing
user: `cd server && npm run make-admin -- you@example.com`.

### Trying the AI
- **Chat & scanning are optional** — set the keys below to enable them.
- A ready-made test invoice lives at [`samples/sample-invoice.html`](samples/sample-invoice.html):
  open it in a browser and screenshot it (to test image scanning), or copy its text
  (to test text extraction). Expected output is documented at the top of that file.

---

## 🔑 AI Configuration

All AI keys are optional and free. Copy [`.env.example`](.env.example) into
`server/.env` and fill in what you want to enable.

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Enables scanning, drafting, analytics, and RAG embeddings. Get one (no card) at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). | — (AI off if blank) |
| `GEMINI_MODEL` | Model for drafting/analytics. | `gemini-2.5-flash` |
| `GEMINI_SCAN_MODEL` | Model for document scanning. (`gemini-2.5-pro` is **not** on the free tier — needs billing.) | `gemini-2.5-flash` |
| `GROQ_API_KEY` | Routes chat answers to Groq. Get one (no card) at [console.groq.com/keys](https://console.groq.com/keys). If blank, chat falls back to Gemini. | — |
| `GROQ_MODEL` | Groq chat model. | `llama-3.3-70b-versatile` |
| `SCAN_RATE_MAX` / `SCAN_RATE_WINDOW_MS` | Per-user document-scan cap. | 2 per 60s |
| `RAG_RATE_MAX` / `RAG_RATE_WINDOW_MS` | Per-user chat cap. | 30 per 5min |

---

## ☁️ Deployment

The project deploys as three free-tier pieces:

1. **Database — MongoDB Atlas (M0).** Create a free cluster, add a database user,
   allow network access from `0.0.0.0/0`, and create an Atlas Vector Search index
   (768 dims, cosine) for RAG. See [docs/atlas-vector-search.md](docs/atlas-vector-search.md).
2. **Backend — Render.** Use the included **`render.yaml` Blueprint** (Render → New →
   Blueprint → pick this repo). It builds `server/`, runs a health check, and
   auto-generates secrets. Fill in `MONGO_URI`, `CLIENT_URL`, and (optionally)
   `GEMINI_API_KEY` / `GROQ_API_KEY`.
3. **Frontend — Vercel.** Import the repo with **Root Directory = `client`** and set
   `NEXT_PUBLIC_API_URL` to `https://<your-render-service>.onrender.com/api`. Then set
   the backend's `CLIENT_URL` to your Vercel URL for CORS.

Every push to `main` triggers an automatic redeploy on both Render and Vercel.

### Minimal backend env (`server/.env`)
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/wolf_erp
JWT_SECRET=your-long-random-string
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=                 # optional — enables scanning, analytics, RAG
GROQ_API_KEY=                   # optional — routes chat to Groq/Llama
CLEANUP_TOKEN=your-long-random-string   # enables the weekly dormancy-reset endpoint
```

### Frontend env (`client/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🔌 API Overview

REST API grouped by module (full reference in [docs/API.md](docs/API.md)):

- **Auth** — `POST /api/auth/register`, `/login`, `/forgot-password`; `GET /api/auth/me`
- **Vendors / RFQs / Quotations / Purchase Orders / Invoices** — CRUD under
  `/api/<module>`, plus `POST /api/quotations/compare` and `GET /api/invoices/:id/pdf`
- **Approvals** — `GET /api/approvals`, `POST /api/approvals/:id/decide`
- **Reports** — `GET /api/reports/summary | spend-by-category | spend-by-vendor | activity`
- **AI**
  - `GET /api/ai/status` — whether AI is configured
  - `POST /api/ai/rfq/draft` — draft an RFQ from plain English
  - `POST /api/ai/extract` — scan/extract an invoice or quotation
  - `POST /api/ai/quotations/insight` — award recommendation
  - `GET /api/ai/reports/summary` — executive summary
  - `GET /api/ai/vendors/:id/risk` — vendor risk score
  - `GET /api/ai/invoices/:id/audit` — invoice 3-way-match audit
  - `POST /api/ai/chat` — agentic RAG chat; `POST /api/ai/chat/act` — run a confirmed
    action (create RFQ / add vendor); `POST /api/ai/chat/reindex` — rebuild the knowledge base
- **Admin** — `POST /api/admin/cleanup` (token-protected dormancy reset)

---

## 📚 Documentation
- [docs/API.md](docs/API.md) — endpoint reference
- [docs/SCHEMA.md](docs/SCHEMA.md) — database schema & relationships
- [docs/DEMO_FLOW.md](docs/DEMO_FLOW.md) — step-by-step walkthrough
- [docs/atlas-vector-search.md](docs/atlas-vector-search.md) — RAG vector index setup

---

## 📄 License

Provided as-is for educational and demonstration purposes.

---

**Built by Dax Patel.** Questions or ideas? Open an issue on GitHub.
</content>
</invoke>
