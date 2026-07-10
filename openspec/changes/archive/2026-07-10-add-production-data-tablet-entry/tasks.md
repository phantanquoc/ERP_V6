## 1. Data hooks (TanStack Query)

- [x] 1.1 Add a hook to list fry-batch codes from material evaluations (wrap `materialEvaluationService.getAllMaterialEvaluations`) with a query-key factory
- [x] 1.2 Add a hook to load the SystemOperation record for a (maChien, machineSystemId) pair via `getSystemOperationsByMaChien` filtered by machineSystemId
- [x] 1.3 Add a hook to load the FinishedProduct record for a (maChien, machineSystemId) pair via `getAllFinishedProducts` filtered by maChien
- [x] 1.4 Reuse `useActiveFryerMachineSystems` for the fryer list; no new fryer hook ← (verify: no direct apiClient calls in components; hooks wrap existing services; query keys are structured)

## 2. Numeric input + shared UI

- [x] 2.1 Create a reusable large-touch numeric input (inputMode="decimal", ≥44px target) using `parseNumberInput` for onChange
- [x] 2.2 Ensure integer fields (giaiDoan*ThoiGian, minutes) parse as int on save while still using the numeric keyboard ← (verify: time fields persist as integers, weights/temperature/pressure as floats)

## 3. ProductionDataEntry page shell

- [x] 3.1 Create `frontend/src/pages/production/ProductionDataEntry.tsx` full-screen page (no sidebar chrome)
- [x] 3.2 Fry-batch selector (from material-evaluation hook) — no create-new option
- [x] 3.3 Fryer selector (from active SAN_XUAT fryers); require re-selecting fryer each session (no pinning)
- [x] 3.4 Sticky top header holding step tabs + Save/navigation controls in the upper half of the screen ← (verify: save/nav controls remain visible when the tablet keyboard is open)

## 4. Step 1 — Thông số vận hành (SystemOperation)

- [x] 4.1 Render fields: khoiLuongDauVao + 4 stages × {thoiGian, nhietDo, apSuat} + optional ghiChu using the numeric input
- [x] 4.2 Pre-fill from the loaded SystemOperation record; show a clear Vietnamese empty-state if no record exists for the batch+fryer
- [x] 4.3 Auto-fill nguoiThucHien from `useAuth` (`${lastName} ${firstName}`)
- [x] 4.4 Independent Save → PATCH via `updateSystemOperation`; block only on negative/empty fields with Vietnamese messages ← (verify: saving this step does not require step 2; PATCH updates existing record, no create/bulk)

## 5. Step 2 — Thành phẩm đầu ra (FinishedProduct)

- [x] 5.1 Render 8 output-weight (kg) fields using the numeric input
- [x] 5.2 Pre-fill from the loaded FinishedProduct record; empty-state if none exists
- [x] 5.3 Compute tongKhoiLuong and each tiLe = round((weight/total)*100, 2) (mirror calculatePercentage); handle total=0 without division error
- [x] 5.4 Auto-fill nguoiThucHien from `useAuth`
- [x] 5.5 Independent Save → PATCH via `updateFinishedProduct` with weights + computed percentages + tongKhoiLuong; block only on negative/empty fields ← (verify: percentages auto-computed and persisted; totals not enforced; PATCH updates existing record)

## 6. Routing

- [x] 6.1 Add lazy import of ProductionDataEntry in `frontend/src/App.tsx`
- [x] 6.2 Register route `/production/nhap-lieu` wrapped in `ProtectedRoute` (auth) but OUTSIDE `ProtectedLayout` (no sidebar) ← (verify: authenticated worker sees full-screen page without sidebar; unauthenticated visitor redirected to login)

## 7. Verification

- [x] 7.1 Run `cd frontend && npx tsc --noEmit` — must pass
- [x] 7.2 Run `cd frontend && npm run lint`
- [ ] 7.3 Manually confirm the route renders full-screen without sidebar and the two steps save independently ← (verify: end-to-end flow — pick batch → pick fryer → fill each step → save each independently → values persist on reload)
