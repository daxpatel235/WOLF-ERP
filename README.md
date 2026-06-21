# Wolf ERP — AI-Powered Procurement & Vendor Management

A full-stack **Procurement & Vendor Management ERP** that digitises the entire source-to-pay lifecycle — vendors, RFQs, quotations, approvals, purchase orders, and invoices — in one connected platform, with **Google Gemini** powering assistive drafting, analytics, and a retrieval-grounded (RAG) chat assistant.

---

## 🌐 Live Demo

| | URL |
|---|---|
| **App (frontend)** | **https://wolf-erp.vercel.app** |
| **API (backend)** | https://wolf-erp-api.onrender.com |

> **Getting in:** the live database starts empty, so open the app and **Create an account** to begin. (On a local install the backend auto-seeds demo logins — see [Local Development](#-local-development).)
>
> ℹ️ This is a **demo** deployment. Data you add is for demonstration only and is automatically cleared after **30 days of inactivity** (your login is always kept). The backend runs on a free tier, so the very first request after it's been idle may take ~30–50s to wake up.

---

## 🎯 Overview

Instead of fragmented emails and spreadsheets, Wolf ERP gives organisations a unified platform where every procurement decision flows automatically into the next module.

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

---

## ✨ Key Features

### Core Procurement
- **Vendor Management** — categories, GST/tax details, contacts, ratings, spend tracking, and status (Active / Pending / Inactive).
- **RFQs** — structured requests with items, quantities, deadlines, and multi-vendor invitations.
- **Quotations** — vendor pricing & delivery responses with **side-by-side comparison** and lowest-price highlighting, award/reject in one click.
- **Approval Engine** — idempotent state machine routing POs, invoices, and RFQs through role-based approvers with a full audit trail.
- **Purchase Orders** — auto-drafted from awarded quotations, sequential numbering, status flow Draft → Pending → Approved → Sent → Received.
- **Invoices** — generated from POs with automatic tax math, status tracking, and **PDF download / print / email**.
- **Reports & Analytics** — spend KPIs, spend-by-category, top vendors, and activity trends.

### AI Features (Google Gemini)
All AI runs through `POST /api/ai/*` and degrades gracefully (the app works fully even with no API key).

- **Assistive Drafting & Extraction** — describe a need in plain English to auto-generate a structured RFQ; upload a vendor invoice (PDF/image) to auto-extract its fields.
- **Analytical Insights** — award justifications, executive report summaries, vendor risk scoring, and invoice 3-way-match audits.
- **Wolf AI Chat (RAG)** — a floating assistant that answers questions grounded in *your own* data (vendors, RFQs, quotes, POs, invoices) via Gemini embeddings → MongoDB vector search, with source chips that deep-link to records, scope-guarding, and per-user rate limiting.

### Accounts & Demo-Data Lifecycle
- **Role-based access** — Admin, Manager, Approver, Buyer, Vendor.
- **JWT auth** — bcrypt-hashed passwords; "Remember me" keeps a session for up to **15 days**, after which the token expires and you return to the landing page.
- **Dormancy reset** — if nobody signs in for **30 days**, every collection *except user logins* is wiped, keeping the free database lean. A first-time login shows a welcome notice; a return after a reset shows a friendly "your data was cleared" explainer.

---

## 🛠 Tech Stack

**Frontend** — Next.js 15.5 (App Router), React 18, Tailwind CSS 3.4, Lucide icons, jsPDF + html2canvas for client-side PDFs. Deployed on **Vercel**.

**Backend** — Node.js + Express 4, MongoDB via Mongoose 8, JWT + bcryptjs, Nodemailer (SMTP), and `@google/genai` (Gemini 2.5 Flash + `gemini-embedding-001`, 768-dim). Deployed on **Render**.

**Database** — **MongoDB Atlas** (with Atlas Vector Search powering RAG). A persistent local MongoDB fallback (embedded mongod on disk, so data survives restarts) means the app runs with zero setup in development.

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
│       ├── hooks/ lib/      # hooks, API client, utils, PDF
│       └── ...
├── server/                  # Express backend (MVC)
│   └── src/
│       ├── config/          # db, email, env
│       ├── models/          # Mongoose schemas
│       ├── controllers/     # request handlers
│       ├── routes/          # REST endpoints
│       ├── middleware/      # auth, roles, validation, errors
│       ├── services/        # approval engine, comparison, PDF, email,
│       │                    #   aiService, embeddingService, ragService,
│       │                    #   cleanupService (dormancy reset)
│       ├── seed.js          # demo-data generator
│       └── templates/       # email/PDF HTML
├── docs/                    # API.md, SCHEMA.md, DEMO_FLOW.md, atlas-vector-search.md
└── render.yaml              # Render Blueprint for the backend
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+ and npm
- MongoDB is **optional** — the backend falls back to a persistent local database (data survives restarts) and auto-seeds demo data on first boot.

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

> These exist only after seeding. On the **live demo**, register your own account instead.

**Per-account workspaces.** Each account sees only its own data — vendors, RFQs,
quotations, POs, invoices, approvals, reports, and activity are all scoped to the
signed-in user. The seeded demo data belongs to `manager@wolferp.in`; a freshly
registered account starts with an empty workspace. Approvals are decided within
your own workspace (roles still apply: buyers can't approve).

**Admins.** Self-registration only creates non-admin roles. To get an admin, set
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before seeding, or promote an existing
user: `cd server && npm run make-admin -- you@example.com`.

---

## ☁️ Deployment

The project deploys as three free-tier pieces:

1. **Database — MongoDB Atlas (M0).** Create a free cluster, add a database user, allow network access from `0.0.0.0/0`, and create an Atlas Vector Search index (768 dims, cosine) for RAG.
2. **Backend — Render.** Use the included **`render.yaml` Blueprint** (Render → New → Blueprint → pick this repo). It builds `server/`, runs a health check, and auto-generates secrets. Fill in `MONGO_URI`, `CLIENT_URL`, and (optionally) `GEMINI_API_KEY`.
3. **Frontend — Vercel.** Import the repo with **Root Directory = `client`** and set `NEXT_PUBLIC_API_URL` to `https://<your-render-service>.onrender.com/api`. Then set the backend's `CLIENT_URL` to your Vercel URL for CORS.

Every push to `main` triggers an automatic redeploy on both Render and Vercel.

### Environment variables

**Backend** (`server/.env`)
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/wolf_erp
PORT=5000
JWT_SECRET=your-long-random-string
JWT_EXPIRES_IN=15d
CLIENT_URL=http://localhost:3000
GEMINI_API_KEY=                 # optional; AI features disable cleanly if blank
VECTOR_INDEX=knowledge_vector_index
EMBED_DIM=768
CLEANUP_TOKEN=your-long-random-string   # enables the weekly dormancy-reset endpoint
CLEANUP_INACTIVE_DAYS=30
# Optional SMTP (blank = emails log to console)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

**Frontend** (`client/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🔌 API Overview

REST API grouped by module (full reference in [docs/API.md](docs/API.md)):

- **Auth** — `POST /api/auth/register`, `/login`, `/forgot-password`, `GET /api/auth/me`
- **Vendors / RFQs / Quotations / Purchase Orders / Invoices** — standard CRUD under `/api/<module>`, plus `POST /api/quotations/compare` and `GET /api/invoices/:id/pdf`
- **Approvals** — `GET /api/approvals`, `POST /api/approvals/:id/decide`
- **Reports** — `GET /api/reports/summary | spend-by-category | spend-by-vendor | activity`
- **AI** — `/api/ai/draft-rfq`, `/extract-document`, `/award-insight`, `/report-summary`, `/vendor-risk`, `/invoice-audit`, `/chat`
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
