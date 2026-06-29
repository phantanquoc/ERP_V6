## Context

The Pricing Department (Phòng giá thành) module is the front line for revenue: every customer order starts as an RFQ (Yêu cầu báo giá), becomes a Quotation, and is then promoted to an Order. A separate ExportCost master-data tab feeds the Quotation Calculator with export-cost line items. The audit reported in `proposal.md` found 7 defects that span backend (RBAC, response envelopes, status transitions, type definitions) and frontend (server-driven pagination, role-aware UI, toast/dialog conventions). Phase 1 fixes all 7 at once because they share the same code paths and a piecemeal rollout would re-touch the same files multiple times.

Current state worth noting:

- `quotationService.update` accepts `tinhTrang` blindly: `if (data.tinhTrang !== undefined) updateData.tinhTrang = data.tinhTrang;` (`backend/src/services/quotationService.ts:255`).
- `orderService.update` accepts `trangThaiSanXuat` the same way (~line 282).
- `exportCostController` returns raw entities (`getById`, `createExportCost`, `deleteExportCost` at lines 34/44/66) and `exportCostRoutes.ts` chains only `authenticate`.
- `QuotationManagement.tsx:124-137` renders Edit/Delete buttons unconditionally.
- All 4 list components fetch `limit: 1000` and filter via `useMemo` or local arrays.
- `QuotationRequest` interface in `quotationRequestService.ts` lacks `items[]`; consumers cast through `(request as any).items`.

Constraints:

- CLAUDE.md / AGENTS.md must be followed (`@services/*` aliases, typed errors from `@utils/errors`, response shape envelope, TanStack Query with key factory).
- No Prisma schema changes in Phase 1.
- User-facing strings must be in Vietnamese.
- ADMIN role bypasses all ABAC checks per project convention.

## Goals / Non-Goals

**Goals:**

- Make every list endpoint truly server-paginated and consumed via a server-driven hook on the frontend.
- Enforce RBAC on the `ExportCost` resource and the `Quotation` delete path.
- Centralise quotation/order status transition rules so future code paths reuse them automatically.
- Restore type safety to `QuotationRequest` consumers.
- Replace native `alert` / `window.confirm` with a project-consistent toast + dialog pattern across the 4 components.
- Keep current data flow and external API surface stable except for the `ExportCost` envelope (single internal consumer is updated in the same change).

**Non-Goals:**

- Reworking the quotation status enum or adding new states.
- Touching the `QuotationCalculator` JSON columns (`flowchartData`, `generalCostGroupsData`) — Phase 3.
- Adding KPI dashboards, bulk actions, file attachments, or a shipment entity — Phase 4.
- Multi-currency lock with FX revaluation, lot/batch traceability, approval workflow — deliberately deferred.
- Splitting oversized components (`OrderManagement.tsx`, `QuotationRequestManagement.tsx`) — Phase 4.

## Decisions

### D1. Centralise status transition rules in a new utility

Create `backend/src/utils/statusTransitions.ts` exporting:

- `QUOTATION_STATUS_ORDER: QuotationStatus[]` — ordered chain `[DRAFT, DANG_CHO_PHAN_HOI, DANG_CHO_GUI_DON_HANG, DA_DAT_HANG]`.
- `QUOTATION_TERMINAL_STATUSES: Set<QuotationStatus>` — `{KHONG_DAT_HANG, EXPIRED, REJECTED, DA_DAT_HANG}` (terminal — no further transitions).
- `QUOTATION_CANCEL_TARGETS: Set<QuotationStatus>` — `{KHONG_DAT_HANG, EXPIRED, REJECTED}` (any non-terminal status may move to one of these).
- `ORDER_PRODUCTION_STATUS_ORDER: OrderProductionStatus[]` — read from the existing enum, e.g. `[CHO_SAN_XUAT, DANG_SAN_XUAT, DA_SAN_XUAT, DA_LEN_CONTAINER, DANG_VAN_CHUYEN, DA_GIAO, HOAN_THANH]`.
- `advanceQuotationStatus(current, next, opts?: { bypass?: boolean }): QuotationStatus` — returns the validated `next`, throws `ValidationError('Không thể chuyển trạng thái …')` on illegal moves.
- `advanceOrderProductionStatus(current, next, opts?: { bypass?: boolean }): OrderProductionStatus` — same shape.

Transition rules implemented by both helpers:

1. If `bypass === true`, accept any value present in the enum.
2. If `next === current`, return `current` (no-op accepted).
3. If `current` is in the terminal set, reject any `next`.
4. If `next` is in the cancel-target set and `current` is non-terminal, accept.
5. Otherwise `next` must equal `current`'s direct successor in the order array (no skipping, no backwards).
6. Any other case → `ValidationError`.

`quotationService.update` and `orderService.update` route status fields through these helpers. The service reads the current row first; if the status field is in the patch payload, it computes the new status via the helper before writing. ADMIN callers pass `bypass: true` (the service decides based on `req.user.role` which is plumbed through controllers).

**Alternatives considered**: Per-status guard methods (`canTransitionToSent()`, etc.). Rejected — would duplicate the order array in many places. The single ordered array + cancel set models the real workflow with one source of truth.

### D2. Server-side pagination contract

All four list endpoints accept these query params:

- `page: number` (default 1, min 1)
- `limit: number` (default 20, allowed values 10/20/50/100)
- `search?: string` (existing — keep behavior)
- `customerType?: 'QUOC_TE' | 'NOI_DIA'` (existing)
- `status?: string` (NEW for quotations and orders)
- `dateFrom?: string` (ISO date, NEW where missing)
- `dateTo?: string` (ISO date, NEW where missing)

The service layer translates these into Prisma `where`/`orderBy`/`skip`/`take`. Validation is performed in the controller (`limit` must be one of the allowed values, otherwise default to 20; `page` clamped to `Math.max(1, page)`). The response envelope is `{ success, data, pagination: { page, limit, total, totalPages } }`.

Frontend hooks (`useQuotationRequests`, `useQuotations`, `useOrders`, `useExportCosts`) expose a `params` object and a page-size selector. The legacy client-side `useMemo` filter chains are removed. Stats cards on `GeneralPricing.tsx` keep their existing approach in Phase 1 (each card already issues a `limit: 1` count call) — see Phase 4 for the `/stats` endpoint replacement.

**Alternatives considered**: Keep `limit: 1000` and only add server-side filtering. Rejected — does not solve the correctness ceiling and still ships 1MB JSON per tab switch.

### D3. RBAC matrix for ExportCost

Routes apply both `authenticate` and `authorize(...roles)`:

| Verb / Route | Allowed roles |
|---|---|
| `GET /export-costs` | `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD`, `EMPLOYEE` |
| `GET /export-costs/:id` | same as list |
| `POST /export-costs` | `ADMIN`, `DEPARTMENT_HEAD` |
| `PATCH /export-costs/:id` | `ADMIN`, `DEPARTMENT_HEAD` |
| `DELETE /export-costs/:id` | `ADMIN` |

`DELETE /quotations/:id` is restricted to `ADMIN`, `DEPARTMENT_HEAD` (verified and tightened if currently looser).

ABAC is not needed for ExportCost master data because it is a global lookup table without department ownership. ADMIN bypasses are inherent to `authorize`.

### D4. ExportCost response envelope

All `exportCostController` methods return `{ success: true, data, message?, pagination? }`:

- `list` keeps `pagination`.
- `getById`: `{ success, data }`. `404 → NotFoundError('Không tìm thấy chi phí')`.
- `create`: `{ success, message: 'Tạo chi phí thành công', data }`, HTTP 201.
- `update`: `{ success, message: 'Cập nhật chi phí thành công', data }`.
- `delete`: `{ success: true, message: 'Xóa chi phí thành công' }`.

Errors are thrown as typed errors and caught by the global error handler (existing pattern). The Express middleware already converts typed errors to the standard envelope.

### D5. Frontend toast + ConfirmDialog convention

- Add `react-hot-toast` to `frontend/package.json` if not already present (project already uses Vite + React 18 — `react-hot-toast` is the smallest mature option and matches a "snappy" UX).
- Mount `<Toaster position="top-right" toastOptions={{ duration: 3500 }} />` once in `App.tsx`.
- Replace every `alert(...)`/`window.alert(...)` in the 4 components with `toast.success`/`toast.error`/`toast.loading`.
- Create `frontend/src/components/common/ConfirmDialog.tsx` if no equivalent exists. Props: `open: boolean`, `title: string`, `description?: ReactNode`, `confirmLabel?: string`, `cancelLabel?: string`, `tone?: 'danger' | 'primary'`, `onConfirm: () => void | Promise<void>`, `onCancel: () => void`, `loading?: boolean`. Uses the existing Tailwind tokens and the project's existing `Modal` primitive if present.
- Replace every `window.confirm(...)` in the 4 components with `ConfirmDialog`. The dialog is owned by the component that triggers the action (state held in component, hidden by default).

**Alternatives considered**: `sonner` (newer, similar API). `react-hot-toast` was chosen because its API is identical to what most React tutorials show, the project has no existing toast lib (verified during exploration), and the bundle is smaller. If `sonner` is already present in `package.json`, the implementation will use that instead — the goal is consistency, not a specific package.

### D6. `QuotationRequest` type repair

In `frontend/src/services/quotationRequestService.ts`, replace the single `productId/soLuong/donViTinh` fields with `items: QuotationRequestItem[]`. The shape mirrors what the backend already returns:

```ts
export interface QuotationRequestItem {
  id: string;
  quotationRequestId: string;
  productId: string;
  soLuong: number;
  donViTinh: string;
  ghiChu?: string | null;
  product?: { id: string; tenSanPham: string; maSanPham?: string };
}
```

Remove every `(request as any).items` cast in `QuotationRequestManagement.tsx` and any other consumer found during implementation. Where the schema actually allows a single-item form (legacy create flow), the form state shape is local to the modal and unaffected.

### D7. Role gating on QuotationManagement edit/delete

Use the existing `frontend/src/utils/permissions.ts` helper (`canEditQuotation`, `canDeleteQuotation`) and add helpers if they don't already exist. Buttons are rendered conditionally; backend remains the authoritative gate via D3.

## Risks / Trade-offs

- **[Risk] Search params with `dateFrom`/`dateTo` not previously supported** → Mitigation: parse defensively, treat missing/invalid as undefined, keep behavior identical when params absent. Backward-compatible with existing callers.
- **[Risk] Status transition helper rejects in-flight updates that were previously legal** → Mitigation: ship with `bypass: true` for ADMIN role and unit tests covering the cancel-paths + same-status no-op so legitimate flows still work. If a transition that was previously accepted is rejected post-deploy, the fix is a one-line addition to the order array — not a rollback.
- **[Risk] `react-hot-toast` dependency added** → Mitigation: smallest available toast lib (~3kb), no peer deps. If already present (verified during apply), no new install.
- **[Risk] `ExportCost` envelope change breaks any external consumer** → Mitigation: only known consumer (frontend) is updated in the same change. No external clients of `/export-costs` exist (confirmed via codebase search).
- **[Risk] Role gating only on frontend would be bypassable** → Mitigation: backend `DELETE /quotations/:id` and all ExportCost write routes also enforce role; frontend hiding is UX only.
- **[Trade-off] `Toaster` mount in `App.tsx` makes toasts a global concern** → Acceptable: this is the standard `react-hot-toast` pattern and the project has no competing toast system.
