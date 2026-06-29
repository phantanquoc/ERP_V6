## Why

The Pricing Department module (`Phòng giá thành` — 4 tabs: quotation requests, quotations, orders, export costs) currently has 7 CRITICAL defects discovered during audit:

1. All 4 list components fetch `limit: 1000` and filter client-side, which breaks correctness once data grows past 1000 rows (current data: 100–500, growing).
2. `ExportCost` routes have no role-based authorization — any authenticated user can create/update/delete cost master data.
3. `ExportCost` controller returns raw objects instead of the project-standard `{ success, message?, data?, pagination? }` envelope.
4. Quotation and Order status fields can be updated to any value (backwards, skipped steps), violating the project's "status is forward-only" invariant from CLAUDE.md.
5. `QuotationManagement` exposes edit/delete buttons to every authenticated user, including `EMPLOYEE`.
6. `alert()` and `window.confirm()` are scattered across all 4 components, conflicting with the rest of the app's toast/dialog conventions.
7. `QuotationRequest` service interface is missing the `items[]` array, forcing `(request as any).items` casts in 6+ call sites and erasing type safety.

These defects must be fixed before Phases 2–4 (versioning, cost sheet, dashboard KPI) can build on top of the module safely.

## What Changes

- **BREAKING (server contract)**: `ExportCost` endpoints now return `{ success, data, message?, pagination? }` envelopes. Existing clients reading raw objects must be updated. Only one consumer exists today (`ExportCostManagement.tsx`) and it is updated in this change.
- Add `authorize(...)` middleware to all `ExportCost` routes; `DELETE` is restricted to `ADMIN`, write operations to `ADMIN`/`DEPARTMENT_HEAD`.
- Add new helper `backend/src/utils/statusTransitions.ts` exposing `advanceQuotationStatus` and `advanceOrderProductionStatus`. `quotationService.update` and `orderService.update` must route status changes through these helpers and reject illegal transitions with `ValidationError`. `ADMIN` role may override via `bypass: true`.
- Server-side pagination becomes the only mode for all 4 list endpoints. Frontend hooks send real `page`/`limit`/`search`/`status`/`customerType`/`dateFrom`/`dateTo` query params and stop loading 1000 rows. Default page size 20; page-size selector exposes 10/20/50/100.
- Frontend `QuotationManagement` gates edit/delete buttons on the user's role using the existing `permissions.ts` utility. Backend `DELETE /quotations/:id` enforces the same restriction.
- Replace every `alert(...)` with `react-hot-toast` (added as a dependency if not already present) and every `window.confirm(...)` with a reusable `ConfirmDialog` component. The `Toaster` is mounted at the app root.
- Extend `QuotationRequest` service types to include `items: QuotationRequestItem[]`. Remove all `(request as any).items` casts.

## Capabilities

### New Capabilities

- `pricing-quotation-request`: Manage RFQ (Yêu cầu báo giá) lifecycle, list/filter/pagination, and item-level data shape.
- `pricing-quotation`: Manage quotations, including status workflow, role-based edit/delete, and pagination.
- `pricing-order`: Manage orders converted from quotations, including production status workflow and pagination.
- `pricing-export-cost`: Manage export-cost master data with proper RBAC and standard response envelopes.
- `status-transitions`: Shared forward-only status transition helpers used by quotation and order services.

### Modified Capabilities

<!-- None — these capabilities are introduced for the first time in this change. -->

## Impact

- **Backend code**: `backend/src/routes/{quotationRoutes,quotationRequestRoutes,orderRoutes,exportCostRoutes}.ts`, `backend/src/controllers/exportCostController.ts`, `backend/src/services/{quotationService,orderService,quotationRequestService,exportCostService}.ts`, new `backend/src/utils/statusTransitions.ts`.
- **Frontend code**: `frontend/src/components/{QuotationRequestManagement,QuotationManagement,OrderManagement,ExportCostManagement}.tsx`, `frontend/src/services/{quotationService,quotationRequestService,orderService,exportCostService}.ts`, hooks in `frontend/src/hooks/`, possibly new `frontend/src/components/common/ConfirmDialog.tsx`, `frontend/src/App.tsx` to mount `Toaster`.
- **Dependencies**: `react-hot-toast` may be added to `frontend/package.json` if not already present.
- **Database**: No schema changes. JSON-column migrations (`flowchartData`, `generalCostGroupsData`) are explicitly deferred to Phase 3.
- **API contract**: `ExportCost` endpoints change response shape (BREAKING for any external consumer; only known consumer is updated in this change).
- **Out of scope (deferred to later phases)**: multi-currency FX revaluation, lot/batch traceability, comment thread, file attachment, shipment entity, multi-level approval workflow, cost-sheet breakdown view on Order, KPI dashboard, bulk actions, splitting oversized components, removal of JSON columns.
