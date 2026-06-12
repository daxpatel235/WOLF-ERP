# Data Model

Every business entity exposes a human-readable `id` (its `code`, e.g. `V-1001`,
`PO-2025-021`) in API responses. Relationships are keyed by these codes so the
modules stay connected and the UI never has to show raw ObjectIds.

## User
`name, email (unique), password (hashed), role (admin|manager|approver|buyer|vendor), company, status`

## Vendor — `V-####`
`code, name, category, contact, email, phone, gstin, location, status (Active|Pending|Inactive), rating, notes, createdBy`
Computed on read: `orders`, `spend` (from purchase orders).

## RFQ — `RFQ-YYYY-###`
`code, title, category, status (Draft|Published|Closed|Awarded|Cancelled), created, due, invitedVendors[] (vendor codes), items[{name, qty, unit}], createdBy`
Computed on read: `invited`, `received`.

## Quotation — `Q-####`
`code, rfqId (RFQ code), rfqTitle, vendor, vendorId (vendor code), amount, deliveryDays, validTill, status (Received|Shortlisted|Awarded|Rejected), submitted, items[{name, qty, unitPrice}]`

## PurchaseOrder — `PO-YYYY-###`
`code, vendor, vendorId, rfqId?, quotationId?, amount, status (Draft|Pending Approval|Approved|Sent|Received|Cancelled|Rejected), priority, created, delivery, items[], requestedBy, approvedBy`

## Invoice — `INV-YYYY-###`
`code, vendor, vendorId, poId (PO code), amount, amountPaid, status (Draft|Sent|Partially Paid|Paid|Overdue|Cancelled), issued, due, items[]`

## Approval
`type (Purchase Order|Invoice|RFQ Approval), refModel (PurchaseOrder|Invoice|RFQ), refId (entity code), vendor, amount, requestedBy, priority, status (Pending|Approved|Rejected), decidedBy, decidedAt, comment`

## ActivityLog
`actor, action, entityType, entityId, message, meta` — powers the dashboard
activity feed and is written whenever something meaningful happens.

## How decisions flow (the "connection")

`services/approvalEngine.decide()` looks up the entity referenced by an approval
and applies a status transition:

| refModel       | Approved → | Rejected →  |
| -------------- | ---------- | ----------- |
| PurchaseOrder  | Approved   | Rejected    |
| Invoice        | Sent       | Cancelled   |
| RFQ            | Published  | Cancelled   |
