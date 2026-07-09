# Wolf ERP — Team Collaboration & Organizations

Implementation plan for turning Wolf ERP from **per-user isolation** into **shared
team workspaces (Organizations)**, with member management, delegated permissions,
a member directory, real email (Resend), and internal team chat.

> Status: **PLAN — not yet implemented.** Review before Phase 1 begins.

---

## 1. Goal

Today every record is isolated by `createdBy: req.user._id` (confirmed in every
controller and the `{ createdBy, status }` indexes on every model). Two users can
never see the same data. This plan moves the isolation boundary from **the user**
to **an Organization the user belongs to**, then adds the collaboration features on
top: invitations, a member directory, owner-delegated permissions, org settings,
working email, and team chat.

## 2. Current state (what already exists)

| Area | Status |
|---|---|
| One account per email | ✅ Enforced (unique+lowercase schema field, register check, duplicate-key → 409). |
| Per-user data isolation | ✅ Every record scoped by `createdBy` / `userId` (~161 query sites, 22 files). |
| Email infrastructure | ✅ Nodemailer transport + `sendMail` + `sendRFQInvite` + `sendInvoiceMail` + password-reset, **already wired** — but **off** until SMTP env vars are set (currently logs to console). |
| PDF generation | ✅ `pdfService` exists (used for invoices). |
| Roles | ✅ `admin/manager/approver/buyer/vendor` enum + `authorize()` middleware. |
| Organizations | ❌ None. |
| Invitations / member management | ❌ None. |
| Delegated permissions | ❌ None (only the fixed role enum). |
| Team chat | ❌ None. |

## 3. Locked decisions

| # | Decision | Choice |
|---|---|---|
| A | Orgs per user | **One org per user** — embed `organization` on the User. (Multi-org later.) |
| C | Security boundary | **Add `organization` as the boundary; keep `createdBy` as author.** |
| D | Roles | **Reuse the existing role enum**; ownership via `Organization.ownerId`; fine-grained control via a per-member `permissions` map. |
| E | JWT | **Derive org from `req.user`** (already loaded by `protect`) — no token change; member removal/permission changes take effect instantly. |
| Chat transport | **Polling** (~2–3s), free-tier friendly, no persistent sockets. |
| Email provider | **Resend via SMTP** (`smtp.resend.com`) — reuses the existing Nodemailer transport, no transport code changes. |

**Assumed defaults (say the word to change):**
- **B — inviting an email that already has its own workspace:** MVP **only invites
  emails without an existing account**. Existing-user invites (switch/merge) are
  deferred — that's where the hard edge cases live.
- **F — vendor-role logins:** out of scope here (that's the separate vendor-portal
  feature). Vendors remain records, not member logins.

## 4. Data model changes

### New: `Organization`
```
name, ownerId (ref User), createdAt,
settings: {
  directoryVisibleToMembers: Boolean (default true),
  memberDefaultPermissions: { ...capability booleans... },
}
```

### New: `Membership` (or embed on User — see note)
```
organization (ref), user (ref), role, status (active/invited/suspended),
permissions: { canInviteMembers, canManageMembers, canManageVendors,
  canCreateRFQ, canApprove, canCreatePO, canSendInvoices, canViewReports,
  canManageOrgSettings, canChat },
joinedAt
```
> One-org-per-user means this **can be embedded on the User** (`organization` +
> `role` + `permissions`). A separate `Membership` collection is only needed if we
> ever allow multi-org. **Recommendation: embed on User now**, refactor to
> `Membership` if/when multi-org is added.

### New: `Invitation`
```
organization (ref), email (lowercased), role, permissions,
tokenHash (SHA-256, same pattern as password reset), invitedBy (ref),
status (pending/accepted/revoked/expired), expiresAt
```
Indexes: `{ organization, email }`, `{ tokenHash }`.

### New (chat): `Channel` + `Message`
```
Channel:  organization (ref), name, description, createdBy, isDefault
Message:  organization (ref), channel (ref), sender (ref), body, createdAt
```
Indexes: `Message { organization, channel, createdAt }`.

### Changed: every business model gains `organization`
`Vendor, RFQ, Quotation, PurchaseOrder, Invoice, Approval, ActivityLog,
KnowledgeChunk` each add `organization` (ObjectId, indexed). Compound indexes flip
`{ createdBy, status }` → `{ organization, status }`. `createdBy` (and
ActivityLog's `userId`) stay as author fields.

### Changed: `User` gains
`organization` (ref, indexed), `role` (already exists, now the org-role),
`permissions` (map), `isOwner` derived from `Organization.ownerId`.

## 5. Backend changes

- **Register** ([authController.js](../server/src/controllers/authController.js)):
  create an `Organization` (name from the existing `company` field), set
  `user.organization`, mark the user owner with full permissions.
- **Scoping helper + middleware:** add `req.orgId` in `protect`; a single
  `orgScope(req)` helper returns `{ organization: req.user.organization }`. Every
  controller uses it instead of hand-writing `{ createdBy: req.user._id }`. On
  create, set **both** `organization` and `createdBy`.
- **Permission middleware:** extend `authorize()` with `can(permission)` for
  capability checks (e.g. `can('canSendInvoices')`).
- **Team routes** `/api/team/*`: invite, list members, accept (token), remove
  member, change role/permissions, list/revoke pending invites — guarded by
  owner/`canManageMembers`.
- **Org routes** `/api/organization/*`: get/update org settings (owner /
  `canManageOrgSettings`).
- **Chat routes** `/api/chat/*`: list channels, list messages (paged), post
  message — all org-scoped, `canChat` gated. Client polls the messages endpoint.
- **cleanupService:** per-org dormancy — wipe an org's records
  (`deleteMany({ organization })`) only when **no member** has logged in for 30
  days (currently a single global wipe).
- **notificationService / ragService / aiController / approvalEngine /
  comparisonService:** all scoped by org (RAG retrieval, the account snapshot, and
  reindex become org-wide).

## 6. Frontend changes

- **`/organization` route group** with sub-pages:
  - **Overview** — workspace name, member count, usage.
  - **Members** — directory: registered **name + email** + role + status; visible
    to members when `directoryVisibleToMembers` is on; manage actions gated.
  - **Roles & Permissions** — owner toggles per-member capabilities ("deploy rights
    to selected persons").
  - **Settings** — org-wide "selective choices" (default access, directory
    visibility, who can invite, etc.).
  - **Chat** — channel list + message thread + composer (polling).
- **`/accept-invite?token=…`** page — mirrors the existing reset-password page.
- **Registration** — default "create a workspace"; invited users land on accept.
- **Topbar/sidebar** — show workspace name; gate nav items by permission.
- **AuthContext** — expose org + permissions to the client.

## 7. Email (Resend)

Resend offers SMTP, so **no transport code changes** — set env vars:
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465                 # secure=true is auto-selected for 465
SMTP_USER=resend
SMTP_PASS=<RESEND_API_KEY>
MAIL_FROM=Wolf ERP <onboarding@resend.dev>   # or a verified-domain sender
```
- **Caveat:** until a domain is verified in Resend, you can only send from
  `onboarding@resend.dev` and (on the free tier) mostly to your own verified
  address. Verify a domain for real delivery.
- **Polish work:** upgrade the bare RFQ/invoice HTML templates and **attach the
  generated PDF** (via `pdfService`); make the sender **org-aware** (branding /
  reply-to). Works identically for solo and org users.
- **New:** invitation emails (reuse `sendMail` + hashed-token pattern).

## 8. Chat (polling)

- Client fetches `GET /api/chat/channels/:id/messages?after=<cursor>` every ~3s
  while the Chat page is open; composer POSTs a message.
- Strictly org-scoped; `canChat` gated. Start with a single default "General"
  channel, allow creating more.
- Upgrade path to socket.io later without changing the data model.

## 9. Migration

`migrateToOrganizations.js` (modeled on the existing
[backfillOwner.js](../server/src/scripts/backfillOwner.js): dry-run + direct-Atlas
connect, non-destructive):
1. For each distinct `createdBy` user → create an `Organization` they own
   (name = `company` || `"<name>'s Workspace"`), set `user.organization`.
2. `updateMany` all their records (`Vendor/RFQ/Quotation/PO/Invoice/Approval`) to
   set `organization`; `ActivityLog`/`KnowledgeChunk` by `userId`/owner.
3. Ships with `--dry-run`.

## 10. Phased delivery

| Phase | Content | Ships? |
|---|---|---|
| **1** | `Organization` + `User.organization` + `organization` on all models + migration | ✅ (no behavior change — each user alone in their org) |
| **2** | Flip scoping `createdBy` → `organization` everywhere (~161 sites) + cleanup + RAG scoping | ✅ correctness-critical |
| **3** | Invitations + Members directory + **email turn-on & polish (Resend)** | ✅ |
| **4** | Permissions/delegation + Org Settings + org UI/UX pages | ✅ |
| **5** | Team chat (polling) | ✅ |

## 11. Risks & mitigations

- **Cross-org data leakage** (top risk): a single un-migrated query leaks data
  across orgs → centralize scoping in one helper, audit all 22 files, add a scoping
  test.
- **Migration on live Atlas**: dry-run first; non-destructive; reversible.
- **Cleanup regression**: per-org rewrite must never wipe an active org — test
  deliberately.
- **Resend deliverability**: needs domain verification for real sending.

## 12. Effort

Phase 1 small–medium · **Phase 2 is the bulk** (mechanical but must be exhaustive)
· Phase 3–4 medium (follow existing token/email/settings patterns) · Phase 5 small.
Overall a multi-week build: ~4 new models, the scoping refactor, ~5–6 new pages.
