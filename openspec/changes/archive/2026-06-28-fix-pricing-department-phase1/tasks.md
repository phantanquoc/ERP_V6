## 1. Status transition helpers (shared utility)

- [x] 1.1 Create `backend/src/utils/statusTransitions.ts` exporting `QUOTATION_STATUS_ORDER` (`['DRAFT','DANG_CHO_PHAN_HOI','DANG_CHO_GUI_DON_HANG','DA_DAT_HANG']`), `QUOTATION_TERMINAL_STATUSES` (`{KHONG_DAT_HANG, EXPIRED, REJECTED, DA_DAT_HANG}`), `QUOTATION_CANCEL_TARGETS` (`{KHONG_DAT_HANG, EXPIRED, REJECTED}`), and `ORDER_PRODUCTION_STATUS_ORDER` (full 7-step enum order from `OrderProductionStatus`).
- [x] 1.2 Implement `advanceQuotationStatus(current, next, opts?: { bypass?: boolean }): QuotationStatus`. Allow no-op, single-step forward, or move to any cancel target from a non-terminal state; reject all other transitions with `ValidationError('Không thể chuyển trạng thái báo giá từ X sang Y')`. When `opts.bypass === true`, return `next` unchanged.
- [x] 1.3 Implement `advanceOrderProductionStatus(current, next, opts?: { bypass?: boolean }): OrderProductionStatus`. Allow no-op or single-step forward only; reject backward/skipping with `ValidationError('Không thể chuyển trạng thái sản xuất từ X sang Y')`. Bypass returns `next` unchanged.
- [x] 1.4 Add unit tests covering all 7 scenarios in `specs/status-transitions/spec.md` at `backend/src/__tests__/statusTransitions.test.ts`. ← (verify: every scenario in status-transitions/spec.md has at least one passing test; ValidationError messages are in Vietnamese)

## 2. Apply forward-only transitions to services

- [x] 2.1 In `backend/src/services/quotationService.ts` `update` method, when `data.tinhTrang` is provided, fetch existing row first, then call `advanceQuotationStatus(existing.tinhTrang, data.tinhTrang, { bypass: actorRole === 'ADMIN' })` and use its return as the value passed to Prisma. Plumb `actorRole` through controller→service if not already available.
- [x] 2.2 In `backend/src/services/orderService.ts` `update` method, do the equivalent for `data.trangThaiSanXuat` using `advanceOrderProductionStatus`.
- [x] 2.3 In `backend/src/controllers/quotationController.ts` and `orderController.ts`, pass `req.user.role` (typed as `Role`) into the service `update` call so the bypass flag works.
- [x] 2.4 Add integration tests: legal forward, skip-rejected, backward-rejected, cancel-from-non-terminal-accepted, admin-bypass for both quotation and order updates. ← (verify: PATCH /api/quotations/:id and PATCH /api/orders/:id reject invalid transitions with 400 + ValidationError envelope; ADMIN succeeds in any direction)

## 3. ExportCost RBAC

- [x] 3.1 In `backend/src/routes/exportCostRoutes.ts`, add `authorize('ADMIN','DEPARTMENT_HEAD','TEAM_LEAD','EMPLOYEE')` after `authenticate` on `GET /` and `GET /:id`.
- [x] 3.2 Add `authorize('ADMIN','DEPARTMENT_HEAD')` to `POST /` and `PATCH /:id`.
- [x] 3.3 Add `authorize('ADMIN')` to `DELETE /:id`.
- [x] 3.4 Add tests in `backend/src/__tests__/exportCostRoutes.test.ts` covering: EMPLOYEE GET 200, EMPLOYEE POST 403, TEAM_LEAD DELETE 403, ADMIN DELETE 200, DEPARTMENT_HEAD PATCH 200. ← (verify: every scenario in pricing-export-cost/spec.md authorization section passes)

## 4. ExportCost response envelope

- [x] 4.1 In `backend/src/controllers/exportCostController.ts`, refactor `getById` to return `{ success: true, data: exportCost }` and throw `NotFoundError('Không tìm thấy chi phí')` when row missing.
- [x] 4.2 Refactor `createExportCost` to return `res.status(201).json({ success: true, message: 'Tạo chi phí thành công', data: exportCost })`.
- [x] 4.3 Refactor `updateExportCost` to return `{ success: true, message: 'Cập nhật chi phí thành công', data: exportCost }`.
- [x] 4.4 Refactor `deleteExportCost` to return `{ success: true, message: 'Xóa chi phí thành công' }`.
- [x] 4.5 Refactor the list handler to return `{ success: true, data: items, pagination: { page, limit, total, totalPages } }`.
- [x] 4.6 Update frontend `frontend/src/services/exportCostService.ts` (and any hook) to read `response.data` / `response.pagination` from the envelope, not the raw row. ← (verify: every scenario in pricing-export-cost/spec.md envelope section passes; frontend list page renders without errors)

## 5. Server-side pagination — backend endpoints

- [x] 5.1 Inspect `backend/src/controllers/quotationRequestController.ts` + `quotationRequestService.ts`. Ensure `GET /api/quotation-requests` accepts `page`, `limit`, `search`, `customerType`, `status`, `dateFrom`, `dateTo` query params. `limit` must whitelist to `{10,20,50,100}` (default 20). Build Prisma `where` from the filters and return `{ success, data, pagination }`.
- [x] 5.2 Do the same for `GET /api/quotations` (quotationController + quotationService).
- [x] 5.3 Do the same for `GET /api/orders` (orderController + orderService) — status filter applies to `trangThaiSanXuat`.
- [x] 5.4 Do the same for `GET /api/export-costs` — accept `search` and `loaiChiPhi`.
- [x] 5.5 Reject invalid `limit` values by falling back to default 20 (do not throw).
- [x] 5.6 Add integration tests: default-page-size, custom-page-and-limit, invalid-limit-fallback, filter-by-status, filter-by-date-range, search+customerType-combo. ← (verify: every scenario in the four pricing-*/spec.md pagination requirements passes; querying with `limit=37` returns 20 rows)

## 6. Server-side pagination — frontend components

- [x] 6.1 Remove `limit: 1000` from `frontend/src/components/QuotationRequestManagement.tsx:65`. Wire fetch through a TanStack Query hook in `frontend/src/hooks/useQuotationRequests.ts` using query-key factory `quotationRequestKeys.list({page, limit, search, customerType, status, dateFrom, dateTo})`. Move filtering/pagination state into the component but pass it to the API via query params.
- [x] 6.2 Remove `limit: 1000` from `frontend/src/components/QuotationManagement.tsx:43`. Create/extend `frontend/src/hooks/useQuotations.ts` analogously.
- [x] 6.3 Remove `limit: 1000` from `frontend/src/components/OrderManagement.tsx:41`. Create/extend `frontend/src/hooks/useOrders.ts` analogously.
- [x] 6.4 Remove `limit: 1000` from `frontend/src/components/ExportCostManagement.tsx:52`. Create/extend `frontend/src/hooks/useExportCosts.ts` analogously.
- [x] 6.5 Add a page-size selector (10/20/50/100, default 20) to each of the four list views.
- [x] 6.6 Remove all client-side `.filter()` chains that duplicate server filters; keep only purely presentational sort/group transforms.
- [x] 6.7 Stats cards on `frontend/src/pages/general/GeneralPricing.tsx` continue to use existing count fetches — do not regress them.  ← (verify: network tab shows requests with `limit=20` and filter params; no request returns more than 100 rows; pagination controls drive server requests)

## 7. Quotation role gate (frontend + backend)

- [x] 7.1 In `frontend/src/utils/permissions.ts`, add helpers `canEditQuotation(role)` (ADMIN/DEPARTMENT_HEAD/TEAM_LEAD) and `canDeleteQuotation(role)` (ADMIN/DEPARTMENT_HEAD) if not already present.
- [x] 7.2 In `frontend/src/components/QuotationManagement.tsx` (around lines 124-137), wrap Edit button render with `canEditQuotation(user.role)` and Delete button with `canDeleteQuotation(user.role)`.
- [x] 7.3 In `backend/src/routes/quotationRoutes.ts`, ensure `DELETE /:id` has `authorize('ADMIN','DEPARTMENT_HEAD')` after `authenticate`. If already present, leave; otherwise add.
- [x] 7.4 Add tests: EMPLOYEE DELETE 403, DEPARTMENT_HEAD DELETE 200. ← (verify: scenarios in pricing-quotation/spec.md role-gated requirement pass; UI hides buttons for EMPLOYEE)

## 8. Toast + ConfirmDialog (replace alert / window.confirm)

- [x] 8.1 Check `frontend/package.json` for an existing toast library. If none, add `react-hot-toast` and mount `<Toaster position="top-right" />` in `frontend/src/App.tsx` (or root layout) once.
- [x] 8.2 Check `frontend/src/components/common/` (and `frontend/src/components/`) for an existing `ConfirmDialog`/`Modal`. If none exists, create `frontend/src/components/common/ConfirmDialog.tsx` — a Tailwind-styled modal with title, message, confirm/cancel buttons, `isOpen`/`onConfirm`/`onCancel` props, Vietnamese button labels.
- [x] 8.3 In `QuotationRequestManagement.tsx`, replace every `alert(...)` with the appropriate `toast.success/error/info` call and every `window.confirm(...)` with `ConfirmDialog` state.
- [x] 8.4 Do the same in `QuotationManagement.tsx`.
- [x] 8.5 Do the same in `OrderManagement.tsx`.
- [x] 8.6 Do the same in `ExportCostManagement.tsx`. ← (verify: `grep -rn "alert(\|window.confirm" frontend/src/components/{Quotation,Order,ExportCost}*.tsx frontend/src/components/QuotationRequestManagement.tsx` returns nothing; destructive actions show ConfirmDialog; successes show toasts in Vietnamese)

## 9. QuotationRequest items[] typing

- [x] 9.1 In `frontend/src/services/quotationRequestService.ts`, define `QuotationRequestItem` interface matching the backend Prisma model (id, quotationRequestId, productId, productName?, soLuong, donViTinh, ghiChu? — match backend payload exactly).
- [x] 9.2 Update `QuotationRequest` interface to declare `items: QuotationRequestItem[]` (non-optional, defaults to `[]` in service). Remove any obsolete singular `productId` / `soLuong` / `donViTinh` fields if backend no longer returns them at the parent level.
- [x] 9.3 Remove every `(request as any).items` cast in `frontend/src/components/QuotationRequestManagement.tsx` (lines 527, 531, 540 and any other occurrences).
- [x] 9.4 Search `frontend/src/components/` for any other `(<...> as any).items` or similar unsafe casts on QuotationRequest consumers (e.g., QuotationManagement, OrderManagement) and replace with typed access.
- [x] 9.5 Run `cd frontend && npx tsc --noEmit` and fix any newly surfaced type errors caused by the stricter interface. ← (verify: `grep -rn "as any" frontend/src/components/QuotationRequestManagement.tsx` returns 0 results for the items field; tsc passes with 0 errors)

## 10. Verification gates (Phase 1 sign-off)

- [x] 10.1 `cd backend && npx tsc --noEmit` returns 0 errors.
- [x] 10.2 `cd backend && npm run lint` passes (no new warnings introduced).
- [x] 10.3 `cd backend && npm test` — all tests pass (existing + new).
- [x] 10.4 `cd frontend && npx tsc --noEmit` returns 0 errors.
- [x] 10.5 `cd frontend && npm run lint` passes (no new warnings introduced).
- [x] 10.6 Manual smoke: open `/general/pricing` in dev, navigate all 4 tabs as ADMIN, DEPARTMENT_HEAD, and EMPLOYEE — confirm pagination, role-gated buttons, toasts, ConfirmDialog, forward-only status all behave per specs. ← (verify: all 5 spec files' scenarios manifest in the UI; no console errors; no `alert()` or `window.confirm()` calls remain)
