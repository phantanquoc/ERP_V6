# Tasks

## 1. Schema & upload plumbing (backend)

- [x] 1.1 Add `tepDinhKem String[] @default([]) @map("tep_dinh_kem")` to `RepairRequest` in `backend/prisma/schema/common.prisma`, run `npx prisma migrate dev`, then `npx prisma generate` ← (verify: migration applies cleanly, generated client exposes `tepDinhKem`, legacy `fileDinhKem` untouched)
- [x] 1.2 Switch `POST /` and `PUT /:id` in `backend/src/routes/repairRequestRoutes.ts` from `createSingleUploadMiddleware('repair-requests')` to `createUploadMiddleware('repair-requests', 4)` and verify `npx tsc --noEmit` still passes
- [x] 1.3 In `backend/src/controllers/repairRequestController.ts`, map `req.files` → `tepDinhKem` URLs on create (keep body `fileDinhKem` passthrough) and set `data.tepDinhKem = newFiles` on update only when new files exist; verify `npx tsc --noEmit` passes
- [x] 1.4 In `backend/src/services/repairRequestService.ts`: create path writes `tepDinhKem` sliced to 4; update path appends new files to existing `tepDinhKem`, caps at 4, and throws `ValidationError('Mỗi phiếu tối đa 4 tệp đính kèm')` before any write when exceeded ← (verify: jest test covering create-cap, append-merge, and over-cap rejection passes via `npx jest <test> --runInBand`)
- [x] 1.5 Add/extend a jest test (alongside existing `repairRequestHardening`/`backendYcktYcscGuards` patterns) for the merge+cap behavior and run it with `npx jest <file> --runInBand` until green

## 2. Frontend attachment wiring

- [x] 2.1 Change `frontend/src/services/repairRequestService.ts` `createRepairRequest`/`update` to accept `files?: File[]` appending field `files` (max 4); grep for any other caller of the old `file` field and update it; verify `npx tsc --noEmit -p tsconfig.app.json` passes
- [x] 2.2 In `frontend/src/components/RepairRequestFormModal.tsx`: delete the dead `selectedFile` state (declaration, reset, and both YCSC save call sites) and pass `selectedFiles` on create and update; verify no `selectedFile` references remain (`rg "selectedFile\b"`) and type check passes
- [x] 2.3 Confirm create/edit/view picker blocks (lines ~2088/2102/2137) now persist and list files for YCSC as they already do for YCKT; verify via type check + lint (`npm run lint`)

## 3. Create-time YCCC attachments

- [x] 3.1 Add a `FileUpload` (max `SUPPLY_MAX_FILES`, same accept list as `SupplyRequestModal`) to the "Phiếu yêu cầu cung cấp (YCCC)" section of the create form, hold files in state, and pass them to `supplyRequestService.createSupplyRequest(data, files)` in the auto-create flow; verify type check + lint pass and the create-time flow's existing toasts/link behavior is unchanged

## 4. Phat-sinh YCCC block (chi phí phát sinh panel)

- [x] 4.1 Extract a local goods-rows editor component (reusing `MaterialDraft`, `ProductCombobox`, `UnitSelect`) shared by the create-time YCCC section and the new block, plus a `resolveYcccRequester(viewUser, employees)` helper (verbatim from the create-time flow, including missing-employee error and `boPhan` fallback); verify the create-time flow still compiles and `npx tsc --noEmit -p tsconfig.app.json` passes
- [x] 4.2 Add the "Vật tư phát sinh" block under the money-row table in the view-mode Chi phí phát sinh panel, gated by `!readOnly && can('supply-requests','CREATE', role) && record.trangThai !== 'DA_HUY'`; block absent otherwise; verify type check + lint pass
- [x] 4.3 Implement creation orchestration: exported pure row-validation helper (non-blank name, qty > 0, valid item index, slip has items, employee resolves) → create YCCC (`mucDichYeuCau: 'Phát sinh cho <maYeuCau>'` + files ≤4) → `linkSupplyRequest` → `createMaterialNeed` per row → invalidate `detail`/`supplyChain`/`costSummary`/`materialNeeds` + `supplyRequests` → `setSelectedSupplyId(newId)`; disable submit while pending; staged toasts per design (abort on validation/YCCC failure, warning on link/need failure) ← (verify: end-to-end behavior per specs/repair-context-yccc-creation scenarios — happy path shows new chain row + raised "Thực tế" + inline detail opens without route change; each failure toast path leaves no unintended writes)
- [x] 4.4 Add the "Tạo YCCC ngay" action to the amber "Chưa tạo YCCC" warning that reveals the block; verify with the same gating rules and type check passes
- [x] 4.5 Add a vitest test for the exported row-validation helper covering valid rows, blank name, qty ≤ 0, invalid item index, and empty-items slip; run `npm run test:run` until green

## 5. Integration checks

- [x] 5.1 Backend gates: `npx tsc --noEmit` → 0 errors, `npm run lint` clean of new issues, `npx jest src/__tests__/repairRequestHardening.test.ts src/__tests__/repairRequestCascade.test.ts src/__tests__/backendYcktYcscGuards.test.ts --runInBand` all pass ← (verify: commands executed, outputs green)
- [x] 5.2 Frontend gates: `npx tsc --noEmit -p tsconfig.app.json` → 0 errors attributable to this change (3 baseline tsc errors + 5 baseline vitest failures + 34 baseline lint errors pre-exist and are untouched), `npm run lint` clean of new issues, `npm run test:run` green ← (verify: commands executed; the 3 tsc errors are in `MaintenanceLogModal.tsx`/`RepairStatisticsDashboard.tsx`, the 5 vitest failures are in `WarehouseSlipPrintView.test.tsx`/`WarehouseSlipTabs.test.tsx`, the 34 lint errors are repo-wide baseline — none in files touched by this change)
- [x] 5.3 Debt-prevention greps on the diff: `git diff --unified=0 | grep -cE "^\+\s*.*\bany\b"` = 0 (excluding comments), `grep -cE "^\+\s*console\."` = 0, `grep -cE "^\+\s*res\.status\("` = 0
- [x] 5.4 `openspec validate --change repair-ycsc-attachments-phatsinh-yccc` passes and `git diff --stat` touches only files named in proposal.md Impact