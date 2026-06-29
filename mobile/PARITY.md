# Wolf ERP — Web vs Mobile frontend parity audit

Verified by reading every web route under `client/src/app` and every mobile
route under `mobile/src/app`. Legend: ✅ present · ⚠️ partial · ❌ missing (in mobile).

## Snapshot

Mobile has reached **screen-level parity** with the web app. Every authenticated
module the web exposes now has a mobile screen, the AI layer is wired across
screens (status gating, RFQ draft, invoice audit, vendor risk, quote-comparison
insight, report summary, document extraction, RAG chat with citations +
proposed actions), and the global chrome (search, notifications, AI chat) exists.

The only intentional non-parity is the **marketing site** (`/`, `/pricing`,
`/privacy`, `/terms`) — out of scope for a native app.

Route map (web → mobile) and status:

| Web route | Mobile route | Status |
|---|---|---|
| `/login` | `(auth)/login` | ✅ |
| `/register` | `(auth)/register` | ✅ |
| `/forgot-password` | `(auth)/forgot-password` | ✅ |
| `/reset-password` | `(auth)/reset-password` | ✅ |
| `/dashboard` | `(app)/index` | ✅ |
| `/vendors` | `(app)/vendors` | ✅ |
| `/vendors/[id]` | `vendor/[id]` | ✅ (incl. AI risk) |
| `/vendors/new` | `vendor/new` | ✅ |
| `/rfqs` | `rfqs/index` | ✅ |
| `/rfqs/[id]` | `rfqs/[id]` | ✅ |
| `/rfqs/new` | `rfqs/new` | ✅ (incl. Draft with AI) |
| `/quotations` | `quotations/index` | ✅ |
| `/quotations/[id]` | `quotations/[id]` | ✅ |
| `/quotations/compare` | `quotations/compare` | ✅ (incl. AI insight) |
| `/approvals` | `(app)/approvals` | ✅ |
| `/purchase-orders` | `(app)/orders` | ✅ |
| `/purchase-orders/[id]` | `po/[id]` | ✅ (lifecycle actions) |
| `/purchase-orders/new` | `po/new` | ✅ |
| `/invoices` | `invoices/index` | ✅ |
| `/invoices/[id]` | `invoices/[id]` | ✅ (incl. AI audit) |
| `/invoices/[id]/print` | `invoices/[id]/print` | ✅ |
| `/invoices/[id]/send` | `invoices/[id]/send` | ✅ |
| `/invoices/new` | `invoices/new` | ✅ (incl. AI extract) |
| `/reports` | `reports` | ✅ (incl. AI summary) |
| `/settings` | `settings` | ✅ |
| `/activity` | `activity` | ✅ |
| global search | `search` | ✅ |
| notifications bell | `notifications` | ✅ |
| floating AI chat | `ai-chat` + `AiFab` | ✅ |
| `/` `/pricing` `/privacy` `/terms` | — | ➖ marketing, out of scope |

---

## Known limitations (platform-driven, not missing screens)

1. **Invoice AI extraction is text-only.** `invoices/new` supports pasting the
   vendor's invoice text → `api.ai.extract` fills vendor + line items. The web
   also accepts an **image upload**; matching that on mobile needs
   `expo-image-picker` (a native module → requires a dev-client rebuild). The
   data layer already accepts `{ image: { media_type, data } }`, so it's a
   UI-only addition once the picker is installed.
2. **Invoice Print exports via the OS share sheet, not a native print dialog.**
   `invoices/[id]/print` renders the full TAX INVOICE document (From/Bill-to with
   `COMPANY` constants, items table, GST totals, footer) and the action shares a
   formatted invoice through React Native's built-in `Share`. A true PDF /
   AirPrint flow would add `expo-print` + `expo-sharing` (native rebuild).
3. **Invoice Send uses a `mailto:` handoff.** `invoices/[id]/send` is the full
   email composer (prefilled To/Subject/Message, attachment row, success state)
   and opens the device mail client; there's no server `send` endpoint on mobile
   (mirrors the demo backend).

---

## Notes

- AI affordances everywhere are gated on `useAiStatus().data?.enabled`, so they
  stay hidden in the offline mock and appear only against a live backend.
- The mobile data layer (`api/{client,live,hooks}.ts`) mirrors the full web API
  surface; screens never branch on mock vs live.
