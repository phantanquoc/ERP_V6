## Why

The tablet data-entry page currently makes a worker pick one fry-batch and one fryer at a time, then fill a per-record form. But the paper form workers actually use ("Bảng theo dõi sản lượng thành phẩm sấy") is a per-shift board: one product-quality category at a time, all the shift's fry-batches as rows, all 8 fryers as columns. The current flow is slow and does not match how they work. It also risks overwriting other workers' entries (multiple people share one tablet). This change reshapes the entry page around the shift board, keeps only "Sản phẩm đầu ra" (output products) for now, and makes saving safe by only writing cells the worker actually changed.

## What Changes

- New flow: kiosk guard (unchanged) → pick operator name (unchanged) → **pick shift (Ca 1/2/3)** (new, same card UI as name) → **output board**.
- **Remove the "Thông số vận hành" (operating parameters) section from this page's UI** (service code stays, just not shown here).
- Output board:
  - A "Ngày sản xuất" (production date) field, default today, with a "Hôm nay" quick button.
  - Six quality tabs: Hàng A, Hàng B, Hàng B dầu, Hàng C, Ướt, Vụn - Phế phẩm.
  - Each non-waste tab shows a matrix: rows = the shift+date's real fry-batches (STT, mã chiên, thời gian chiên and tên hàng hoá auto-filled and read-only), columns = Máy 1..8 (weight kg inputs), plus a Ghi chú text column. No operator column (name already chosen).
  - Fry-batch rows are filtered client-side by `ca` and by the local date of `thoiGianChien`. Empty shift/date → Vietnamese empty state.
- **Vụn - Phế phẩm tab**: a single total for the whole shift (one input, not a matrix). The total is split evenly across all cells (batches × 8 machines); each cell's share is split evenly across the three DB fields (vụn lớn / vụn nhỏ / phế phẩm).
- **Load existing values** into cells so workers see and edit prior input.
- **Dirty tracking**: only cells the worker actually changed are PATCHed on confirm; untouched cells are never sent — this prevents zeroing out others' data on a shared tablet.
- **Draft auto-save**: typing auto-saves a draft (localStorage keyed by date+shift, survives reload/tab close); switching tabs keeps the draft. Draft is NOT written to DB.
- **Save → preview (all six categories) → Xác nhận** performs the PATCH (dirty cells only); "Sửa lại" returns to the form. After confirm, reset to the name-selection screen and clear that date+shift draft.

## Capabilities

### New Capabilities
- `production-entry-output-board`: A per-shift output-products board for the tablet entry page — shift selection, production-date picker, six quality tabs over a fry-batch × 8-machine matrix, shift-total waste distribution, load-existing + dirty-tracked safe save, draft auto-save, and preview/confirm with reset.

### Modified Capabilities
<!-- None as delta specs — this extends the tablet-entry experience additively; the kiosk-session capability is unchanged. -->

## Impact

- **Frontend only** — no backend, service, schema, migration, permission, or kiosk-session changes.
- `frontend/src/hooks/useProductionDataEntry.ts` — hook to list fry-batches filtered by date+shift (client-side); hook to build the FinishedProduct matrix (batches × active fryers); mutation to PATCH multiple dirty records on confirm.
- `frontend/src/pages/production/ProductionDataEntry.tsx` — shift-selection step; output board with 6 tabs + date picker; matrix inputs; waste tab; draft auto-save (localStorage); dirty tracking; full preview; confirm PATCH (dirty only); reset + clear draft; remove operating-parameters UI.
- Possible new components: `ProductionOutputBoard`, `ShiftSelection` (reuse `NumericInput`).
- **Unchanged / not deleted**: `kioskSession.ts`, `apiClient.ts`, `FryBatchPicker.tsx`, operator-selection step, `systemOperationService` (kept, just removed from this page's UI).
- `nguoiThucHien` = the chosen operator name (not `useAuth`).
