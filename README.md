# Wolf ERP — Procurement & Vendor Management System

A **full-stack, production-ready Procurement & Vendor Management ERP** built for modern organizations. Streamline your procurement workflows with centralized vendor management, RFQ creation, quotation comparison, approval automation, purchase orders, and invoice generation—all in one connected platform.

---

## 🎯 Overview

Wolf ERP digitizes and automates the entire procurement lifecycle. Instead of fragmented emails and spreadsheets, organizations get a **unified platform** where vendors, RFQs, quotations, approvals, purchase orders, and invoices are seamlessly connected—decisions in one module automatically flow through the others.

### The Connected Workflow

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

### 1. **Vendor Management**
- Register and manage vendors with categories, GST/tax details, and contact information
- Track vendor performance via ratings and spending analytics
- Status tracking (Active, Inactive, Pending, Blocked)
- Search and filter across vendor network

### 2. **RFQ (Request for Quotation)**
- Create structured RFQs with product/service details, quantities, and deadlines
- Invite multiple vendors simultaneously
- Attachment support for specifications
- Real-time RFQ status tracking (Draft, Published, Awarded, Cancelled)

### 3. **Quotation Management**
- Vendors submit pricing and delivery timelines
- Editable quotations with comments/notes
- **Side-by-side quotation comparison** with automatic lowest-price highlighting
- Award and reject decisions with single click

### 4. **Approval Workflow Engine**
- Multi-step approval process for POs, invoices, and RFQs
- Role-based approval routing (Manager, Approver, Admin)
- Priority-based pending queue
- Approval comments and audit trail
- Automatic status transitions when approved/rejected

### 5. **Purchase Order Generation**
- Auto-drafted POs from awarded quotations
- Auto-generated PO numbers with sequential tracking
- Status workflow: Draft → Pending Approval → Approved → Sent → Received
- Send to vendor with notification

### 6. **Invoice Management**
- Create invoices from purchase orders
- Automatic tax and amount calculations
- Status tracking: Draft, Sent, Partially Paid, Paid, Overdue
- **Download as PDF**, print, or email directly to vendor
- Payment and reconciliation tracking

### 7. **Reports & Analytics**
- **Procurement KPIs**: Total spend, outstanding amounts, active vendors
- **Spend by category** visualization with bar/pie charts
- **Top vendors by spend** ranking
- **Monthly procurement trends** analysis
- Export reports as PDF or CSV
- Real-time dashboard with live metrics

### 8. **Role-Based Access Control**
- **Admin**: Full system access, user/vendor management, analytics
- **Procurement Officer**: Create RFQs, compare quotations, generate POs/invoices
- **Manager/Approver**: Approve/reject procurement requests
- **Vendor**: Submit quotations, track RFQ status, view purchase orders
- **Buyer**: View dashboard, create RFQs, limited invoice access

### 9. **Activity Logs & Notifications**
- Complete audit trail of all procurement activities
- Real-time notifications for approvals and status changes
- Activity timeline with actor, action, entity, and timestamp
- Email notifications for RFQs, approvals, and invoice updates

### 10. **Authentication & Security**
- JWT-based stateless authentication
- Password hashing with bcrypt
- Session management with token expiry
- Email verification for password reset
- Input validation and sanitization
- CORS protection

---

## 🛠 Technology Stack

### **Frontend**
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Modern React framework with built-in routing and SSR |
| **UI Library** | React 18 | Component-based UI with hooks |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS for responsive, accessible design |
| **Icons** | Lucide React | Lightweight, customizable icon library |
| **PDF Export** | jsPDF + html2canvas | Client-side PDF generation for invoices/reports |
| **State Management** | React Context API | Lightweight auth state and session management |
| **HTTP Client** | Fetch API | Native browser API with custom wrapper |
| **Package Manager** | npm | Dependency management |

**Frontend Structure:**
```
client/src/
  app/          → Next.js App Router pages (auth, dashboard, marketing)
  components/   → Reusable UI components (modals, forms, tables, cards)
  context/      → AuthContext for JWT token and user session
  hooks/        → Custom hooks (useAuth, useFetch, useVendors)
  lib/          → API client, utilities, formatters, constants
  styles/       → Global CSS and design tokens
```

### **Backend**
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime for server-side logic |
| **Framework** | Express.js 4.19 | Minimalist web framework for REST API |
| **Database** | MongoDB 8.3 (Mongoose ODM) | NoSQL document database with schema validation |
| **Authentication** | JWT + bcryptjs | Secure token-based auth with password hashing |
| **Validation** | Custom validators | Schema-based request validation |
| **Email** | Nodemailer 6.9 | SMTP integration for transactional emails |
| **PDF Generation** | Puppeteer 22 | Headless browser for server-side PDF rendering |
| **Logging** | Winston/Console | Structured logging with timestamps |
| **Environment Config** | dotenv | Environment variable management |
| **CORS** | cors middleware | Cross-origin request handling |
| **Package Manager** | npm | Dependency management |

**Backend Architecture (MVC Pattern):**
```
server/src/
  app.js                    → Express app initialization and middleware setup
  config/                   → Database, email, environment configuration
  models/                   → Mongoose schemas (User, Vendor, RFQ, Quotation, etc.)
  controllers/              → Business logic for each module (auth, vendors, RFQs, etc.)
  routes/                   → REST API endpoint definitions
  middleware/               → JWT auth, role-based access, validation, error handling
  services/                 → Complex business logic (approval engine, comparison, PDF, email)
  utils/                    → Helpers (ID generation, logging, validators)
  templates/                → HTML templates for emails and PDFs
  seed.js                   → Demo data generator for testing
```

### **Database Schema**

**Core Collections:**
- **Users**: Authentication, role management, session tracking
- **Vendors**: Vendor profiles, categories, ratings, spending
- **RFQs**: Request for quotations with details, deadlines, status
- **Quotations**: Vendor responses with pricing and delivery terms
- **PurchaseOrders**: Official orders with amounts, delivery, approval status
- **Invoices**: Billing documents with tax, payment status
- **Approvals**: Approval tasks linked to POs, invoices, RFQs
- **ActivityLog**: Complete audit trail of all system events

**Relationships:**
```
RFQ ←→ Quotation ←→ PurchaseOrder ←→ Invoice
  ↓         ↓            ↓              ↓
Vendor   Vendor    Vendor/Approver  Vendor
```

### **DevOps & Deployment**
| Tool | Purpose |
|------|---------|
| **Docker** | Containerization (optional, `docker-compose.yml` included) |
| **Environment Variables** | `.env.example` templates for all configs |
| **Port Configuration** | Backend :5000, Frontend :3000 (configurable) |
| **Database Fallback** | In-memory MongoDB for development (no local DB required) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (check: `node --version`)
- **npm** (comes with Node.js)
- **MongoDB** (optional; in-memory fallback available for development)

### 1️⃣ Clone & Install

```bash
git clone https://github.com/daxpatel235/procurement-ERP.git
cd procurement-ERP
```

### 2️⃣ Backend Setup (Terminal 1)

```bash
cd server
npm install
npm run dev      # Starts API on http://localhost:5000
```

The backend automatically:
- Falls back to in-memory MongoDB if real MongoDB isn't running
- Seeds demo data on first boot
- Logs seed status to console

### 3️⃣ Frontend Setup (Terminal 2)

```bash
cd client
npm install
npm run dev      # Starts app on http://localhost:3000
```

### 4️⃣ Open & Login

Open **http://localhost:3000** in your browser.

### Demo Accounts

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| `admin@wolferp.in` | `admin123` | Admin | Full system access, user management, analytics |
| `manager@wolferp.in` | `manager123` | Manager | Approve/reject POs, monitor workflows |
| `approver@wolferp.in` | `approver123` | Approver | Approve invoices and RFQs |
| (Register your own) | (Your password) | Buyer | Create RFQs, view dashboard |

---

## 🎯 Complete End-to-End Flow

1. **Admin** registers vendors via **Vendors** screen (e.g., E2E Test Supplies)
2. **Procurement Officer** creates an **RFQ** with product specs, quantity, and invites vendors
3. **Vendors** receive invitations, submit **Quotations** with pricing and delivery terms
4. **Procurement Officer** **compares quotations** side-by-side, awards to best vendor
   - System auto-creates a **draft Purchase Order**
5. **Procurement Officer** submits PO for approval
6. **Manager/Approver** approves PO (status: Draft → Approved)
7. **Procurement Officer** sends PO to vendor
8. **Procurement Officer** creates **Invoice** from approved PO
9. **Manager** approves invoice
10. **Finance** marks invoice as paid
11. **Reports** now reflect the complete procurement cycle with spend analytics

---

## 📁 Project Structure

```
procurement-ERP/
├── client/                          # Next.js Frontend
│   ├── src/
│   │   ├── app/(auth)/             # Auth pages (login, register, forgot password)
│   │   ├── app/(dashboard)/        # Procurement module pages
│   │   ├── app/(marketing)/        # Landing page and pricing
│   │   ├── components/             # Reusable React components
│   │   ├── context/                # React Context (AuthContext)
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # API client, utilities, PDF generation
│   │   └── styles/                 # Global CSS
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
│
├── server/                          # Express Backend
│   ├── src/
│   │   ├── app.js                  # Express app setup
│   │   ├── config/                 # Database, email, environment
│   │   ├── models/                 # Mongoose schemas
│   │   ├── controllers/            # Business logic
│   │   ├── routes/                 # API endpoints
│   │   ├── middleware/             # Auth, validation, error handling
│   │   ├── services/               # Complex services (approval, comparison, PDF, email)
│   │   ├── utils/                  # Helpers and validators
│   │   ├── seed.js                 # Demo data generator
│   │   └── templates/              # Email/PDF HTML templates
│   ├── package.json
│   ├── server.js                   # Entry point
│   └── .env.example
│
├── docs/                            # Documentation
│   ├── API.md                       # Endpoint reference
│   ├── SCHEMA.md                    # Database schema details
│   └── DEMO_FLOW.md                # Step-by-step demo walkthrough
│
├── README.md                        # This file
└── docker-compose.yml              # Docker setup (optional)
```

---

## 🔌 API Endpoints (Overview)

The backend exposes a **RESTful API** with the following module groups:

### Auth Module
- `POST /api/auth/register` — Create new account
- `POST /api/auth/login` — Login and get JWT token
- `POST /api/auth/forgot-password` — Request password reset

### Vendors
- `GET /api/vendors` — List all vendors
- `POST /api/vendors` — Create vendor
- `GET /api/vendors/:id` — Get vendor details
- `PUT /api/vendors/:id` — Update vendor

### RFQs
- `GET /api/rfqs` — List RFQs
- `POST /api/rfqs` — Create RFQ
- `GET /api/rfqs/:id` — Get RFQ details
- `PUT /api/rfqs/:id` — Update RFQ

### Quotations
- `GET /api/quotations` — List quotations
- `POST /api/quotations` — Submit quotation
- `PUT /api/quotations/:id` — Update quotation
- `POST /api/quotations/compare` — Compare multiple quotations

### Purchase Orders
- `GET /api/purchase-orders` — List POs
- `POST /api/purchase-orders` — Create PO
- `PUT /api/purchase-orders/:id` — Update PO status

### Invoices
- `GET /api/invoices` — List invoices
- `POST /api/invoices` — Create invoice
- `GET /api/invoices/:id/pdf` — Download invoice as PDF

### Approvals
- `GET /api/approvals` — List pending approvals
- `POST /api/approvals/:id/decide` — Approve or reject

### Reports
- `GET /api/reports/summary` — KPI summary
- `GET /api/reports/spending` — Spending by category
- `GET /api/reports/vendors` — Vendor performance

**For full API reference**, see [docs/API.md](docs/API.md).

---

## 🔐 Security Features

✅ **JWT Authentication** — Stateless token-based auth with 7-day expiry  
✅ **Password Hashing** — bcrypt with salt rounds  
✅ **Role-Based Access Control (RBAC)** — Middleware enforces permissions per endpoint  
✅ **Input Validation** — Sanitize and validate all user inputs  
✅ **CORS Protection** — Restrict cross-origin requests  
✅ **Email Verification** — Avoid email enumeration in password reset  
✅ **Error Handling** — Graceful error responses with proper HTTP status codes  
✅ **Activity Audit Trail** — Complete log of all user actions  

---

## 🧪 Testing & Demo Data

Run `npm run seed` in the backend to load demo data:

```bash
cd server
npm run seed
```

This populates the database with:
- 3 demo user accounts (admin, manager, approver)
- 10 vendors across 5 categories
- 5 RFQs with quotations
- 3 purchase orders at various stages
- 6 invoices with different statuses
- Approval tasks in pending queue

---

## 🚢 Deployment

### Using Docker
```bash
docker-compose up
```

This starts both backend and frontend in containers.

### Manual Deployment
1. Set `NODE_ENV=production`
2. Configure `MONGO_URI` to point to your MongoDB instance
3. Set secure `JWT_SECRET` and `SMTP_*` credentials
4. Build frontend: `cd client && npm run build`
5. Start backend: `cd server && npm start`

---

## 📚 Documentation

- **[API.md](docs/API.md)** — Complete endpoint reference with request/response examples
- **[SCHEMA.md](docs/SCHEMA.md)** — Database schema, relationships, and field descriptions
- **[DEMO_FLOW.md](docs/DEMO_FLOW.md)** — Step-by-step walkthrough of the procurement workflow

---

## 🛠 Development

### Run Backend in Watch Mode
```bash
cd server
npm run dev    # Uses nodemon for auto-restart
```

### Run Frontend in Dev Mode
```bash
cd client
npm run dev    # Next.js dev server with fast refresh
```

### Environment Variables

**Backend** (.env):
```
MONGO_URI=mongodb://localhost:27017/wolf_erp
PORT=5000
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Frontend** (.env.local):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 📊 Architecture Highlights

### **Separation of Concerns**
- **Controllers** → Handle HTTP requests/responses
- **Services** → Implement complex business logic (approval engine, comparison)
- **Models** → Define data structure and validation
- **Middleware** → Cross-cutting concerns (auth, validation, error handling)

### **Approval Engine** 
Idempotent state machine that:
- Opens approval tasks for POs, invoices, and RFQs
- Routes decisions back to source entities
- Maintains complete audit trail
- Prevents duplicate approvals

### **Quotation Comparison**
- Side-by-side analysis with automatic highlighting
- Lowest-price detection
- Delivery timeline comparison
- Vendor rating indicators

### **Error Handling**
- Structured error responses with HTTP status codes
- Request validation before processing
- Database operation error wrapping
- Client-friendly error messages

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes with clear messages
4. Push to branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📄 License

This project is provided as-is for educational and hackathon purposes.

---

## ❓ FAQ

**Q: Can I run this without MongoDB?**  
A: Yes! The backend automatically falls back to an in-memory MongoDB for development. Real data persists only if you configure `MONGO_URI` to a real MongoDB instance.

**Q: How do I add new users?**  
A: Use the registration page, or manually add users via the admin panel after logging in as admin.

**Q: Can vendors use this system?**  
A: Yes! Vendors can create accounts and submit quotations. They have a limited role with access only to their RFQs, quotations, and purchase orders.

**Q: Is this production-ready?**  
A: The core architecture is solid, but for production: enable HTTPS, use a real database with backups, configure SMTP properly, and add rate limiting.

---

**Built with ❤️ for the Odoo Procurement Hackathon**

For questions or support, open an issue on GitHub.
