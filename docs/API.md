# API Reference

Base URL: `http://localhost:5000/api`

All routes except auth `register`/`login`/`forgot-password` require a header:

```
Authorization: Bearer <token>
```

Responses are JSON. List endpoints return `{ data: [...], count }`; single
records return `{ data: {...} }`. Errors return `{ message, errors? }` with an
appropriate HTTP status (401/403/404/409/422/500).

## Auth — `/auth`
| Method | Path               | Body                                   | Notes |
| ------ | ------------------ | -------------------------------------- | ----- |
| POST   | `/register`        | `name, email, password, role?, company?` | Returns `{ token, user }` |
| POST   | `/login`           | `email, password`                      | Returns `{ token, user }` |
| GET    | `/me`              | —                                      | Current user |
| POST   | `/forgot-password` | `email`                                | Always 200 (no email enumeration) |

## Vendors — `/vendors`
| Method | Path        | Notes |
| ------ | ----------- | ----- |
| GET    | `/`         | Query: `q, status, category`. Each vendor includes computed `orders`, `spend`. |
| GET    | `/:id`      | Vendor + linked `purchaseOrders` + `invoices`. |
| POST   | `/`         | Create (auto code `V-1001`…). |
| PUT    | `/:id`      | Update. |
| DELETE | `/:id`      | admin/manager only. |

## RFQs — `/rfqs`
| Method | Path            | Notes |
| ------ | --------------- | ----- |
| GET    | `/`             | Query: `q, status, category`. Adds `invited`, `received`. |
| GET    | `/:id`          | RFQ + its `quotations`. |
| POST   | `/`             | Create (auto code `RFQ-2025-001`…). |
| PUT    | `/:id`          | Update. |
| POST   | `/:id/publish`  | Status → Published, emails invited vendors. |
| POST   | `/:id/submit`   | Opens an approval task. |

## Quotations — `/quotations`
| Method | Path             | Notes |
| ------ | ---------------- | ----- |
| GET    | `/`              | Query: `q, status, rfqId, vendorId`. |
| GET    | `/compare?rfqId=`| Side-by-side comparison + summary (lowest, fastest, recommended). |
| GET    | `/:id`           | One quotation. |
| POST   | `/`              | Create. |
| POST   | `/:id/shortlist` | Status → Shortlisted. |
| POST   | `/:id/status`    | `{ status }`. |
| POST   | `/:id/award`     | Awards, rejects siblings, marks RFQ Awarded, **drafts a PO**. |

## Purchase Orders — `/purchase-orders`
| Method | Path            | Notes |
| ------ | --------------- | ----- |
| GET    | `/`             | Query: `q, status, vendorId, priority`. |
| GET    | `/:id`          | PO + linked `invoices`. |
| POST   | `/`             | Create (auto code `PO-2025-001`…). |
| PUT    | `/:id`          | Update. |
| POST   | `/:id/submit`   | Status → Pending Approval + approval task. |
| POST   | `/:id/status`   | `{ status }`. |

## Invoices — `/invoices`
| Method | Path           | Notes |
| ------ | -------------- | ----- |
| GET    | `/`            | Query: `q, status, vendorId, poId`. |
| GET    | `/:id`         | One invoice. |
| POST   | `/`            | Create; pass `poId` to inherit vendor/items/amount from a PO. |
| POST   | `/:id/status`  | `{ status, amountPaid? }`. |
| POST   | `/:id/pay`     | `{ amount? }` (omit for full payment). |
| POST   | `/:id/send`    | `{ to, note? }`; marks Draft → Sent. |

## Approvals — `/approvals`
| Method | Path           | Notes |
| ------ | -------------- | ----- |
| GET    | `/`            | `{ data, pending, decided, counts }`. Query: `status`. |
| GET    | `/count`       | `{ pending }` (sidebar badge). |
| POST   | `/:id/decide`  | `{ decision: "Approved"\|"Rejected", comment? }`. Flows back to the entity. |

## Reports — `/reports`
| Method | Path                  | Notes |
| ------ | --------------------- | ----- |
| GET    | `/summary`            | Headline counts + totals for the dashboard. |
| GET    | `/spend-by-category`  | `[{ category, amount }]`. |
| GET    | `/spend-by-vendor`    | `[{ vendor, vendorId, amount, orders }]`. |
| GET    | `/activity`           | Recent activity feed (`?limit=`). |
