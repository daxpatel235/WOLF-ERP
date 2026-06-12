# Demo Flow (5 minutes)

Sign in as `admin@wolferp.in` / `admin123`.

1. **Dashboard** — note the live stats, recent activity, and pending-approvals
   widget. The sidebar shows a badge with the pending-approval count.

2. **Vendors → Add Vendor** — fill the form and save. It appears in the list
   with an auto-assigned code (`V-1009`).

3. **RFQs → Create RFQ** — 3-step wizard: details → line items → pick vendors →
   *Publish RFQ*. You land on the RFQ detail page.

4. **Quotations** — the seed already has quotes for `RFQ-2025-042`. Open
   **Compare** (or the RFQ's "Compare quotes" button):
   - The lowest total and fastest delivery are highlighted.
   - Click **Award** on the winner.
   - → the other quotes are auto-rejected, the RFQ becomes *Awarded*, and a
     **draft Purchase Order** is created.

5. **Purchase Orders** — open the new PO → **Submit for approval**.
   - Watch the **Approvals** badge in the sidebar increase.

6. **Approvals** — click **Approve**.
   - Go back to the PO: it is now **Approved** (no manual status change needed).

7. **Purchase Orders** — **Send to vendor**, then **Create invoice**
   (the form is pre-filled from the PO).

8. **Invoices** — **Mark paid**, then **Send**.

9. **Vendor detail** (open that vendor) and **Reports** — both now reflect the
   new purchase order and invoice (orders, spend, category/vendor breakdowns).

Everything above is real data persisted through the API — reload the page and it
stays. (With the in-memory fallback DB, data resets when you restart the server.)
