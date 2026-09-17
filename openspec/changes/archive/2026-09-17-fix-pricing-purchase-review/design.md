## Context

`PurchaseRequestReviewTab` is the Pricing Room's purchase-request approval UI. Approvals currently go through generic `PUT /purchase-requests/:id` with client-supplied `nguoiDuyet`/`ngayDuyet`; frontend's fallback `"Phòng giá thành"` masks the real approver. `cancelPurchaseRequest` already derives the actor server-side — the approval path should do the same. The detail modal and action column also diverge from system norms (labels, nested scroll, text buttons).

## Goals / Non-Goals

**Goals:**
- Make approval/rejection audit correct: server-derived `nguoiDuyet`/`ngayDuyet` from JWT actor.
- Align detail modal labels and scrolling with established patterns (`CreatePurchaseRequestModal`, `SupplyRequestManagement`, `Modal` + `modal-viewport-h`).
- Make the action column icon-only and remove redundant status rendering.

**Non-Goals:**
- Adding `nguoiDuyetId` FK or migration (deferred).
- Redesigning other Pricing Room tabs.
- Introducing new dependencies or changing Prisma schema.

## Decisions

- **Server-derive on `PUT` vs dedicated `POST /:id/approve`:** Tighten `updatePurchaseRequest` in place (ignore client fields when `trangThai` is `Đã duyệt`/`Từ chối`, lookup `prisma.user` by `__actorUserId`). Chosen because `PUT` already carries actor via `requireRule` + `__actorUserId` injection and `ALLOWED_TRANSITIONS`; a dedicated route is compatible but not required for correctness. Alternative (dedicated route) kept as follow-up.
- **Name formatting:** `${lastName} ${firstName}`.trim() || `email` — matches `cancelPurchaseRequest` and `authService` display.
- **Modal scroll:** Single outer `overflow-y-auto flex-1` only; inner table wrapper uses `overflow-x-auto` (no `max-h-64`, no `overflow-hidden` + `overflow-auto` conflict). `thead sticky top-0` then adheres to outer scroll. Alternative `max-h-[50vh]` inner scroll considered but rejected for simplicity and sticky correctness.
- **Icons:** `lucide-react` `Eye`/`Check`/`XCircle` (`p-1.5 rounded-md title + aria-label`, `disabled:opacity-50`) — Q1:C. `XCircle` emphasizes destructive reject.

## Risks / Trade-offs

- **Existing approvals with "Phòng giá thành":** Historical rows remain; only new approvals are correct → No backfill, acceptable.
- **Client still sending old fields:** Ignored server-side; no breaking change for callers that already send only `trangThai`.
- **Sticky header regression:** Must verify `sticky top-0` still works after removing inner scroll container → Manual QA + visual check.
- **Tests expecting client `nguoiDuyet`:** Transition guard tests that pass `nguoiDuyet` will still pass (field ignored, server supplies value); update tests only if they assert the exact stored string.

## Migration Plan

- No DB migration. Deploy backend first (server now ignores client fields), then frontend (stops sending them). Rollback: revert backend; frontend still works (client fields would again be trusted, but no data loss).

## Open Questions

- None blocking. Dedicated `POST /:id/approve` route can be added later without changing this fix.
