## 1. Data hooks

- [x] 1.1 Hook: list fry-batches filtered by shift (`ca`) + production date (client-side, local Y/M/D of `thoiGianChien`, no toISOString)
- [x] 1.2 Hook: build the FinishedProduct matrix — index existing records by `(maChien, machineSystemId)` over the filtered batches × active fryers (`useActiveFryerMachineSystems`)
- [x] 1.3 Mutation: PATCH multiple FinishedProduct records on confirm, accepting only the dirty set ← (verify: query-key factory used; no direct apiClient calls in components; date filter uses local date not UTC)

## 2. Shift selection step

- [x] 2.1 Add `ShiftSelection` (Ca 1/2/3) with the same large-card UI as name selection
- [x] 2.2 Gate: board shows only after a shift is chosen; name → shift → board order ← (verify: cannot reach board without name AND shift)

## 3. Output board shell

- [x] 3.1 Production-date field defaulting to today + "Hôm nay" quick button
- [x] 3.2 Six quality tabs (Hàng A, Hàng B, Hàng B dầu, Hàng C, Ướt, Vụn - Phế phẩm) as a button strip
- [x] 3.3 Remove the operating-parameters UI from this page (keep service code) ← (verify: no operating-parameters UI remains; systemOperationService still present in codebase)

## 4. Matrix tabs (non-waste)

- [x] 4.1 Render matrix: rows = filtered fry-batches (STT, mã chiên, thời gian chiên, tên hàng hoá read-only), columns = Máy 1..8 weight inputs, plus Ghi chú; no operator column
- [x] 4.2 Map active tab to its field (A→aKhoiLuong, B→bKhoiLuong, B dầu→bDauKhoiLuong, C→cKhoiLuong, Ướt→uotKhoiLuong)
- [x] 4.3 Prefill cells from loaded FinishedProduct values; empty-state (Vietnamese) when no batch matches ← (verify: read-only metadata; prefill shows prior values; empty state renders)

## 5. Waste tab

- [x] 5.1 Single shift-total input (not a matrix) for Vụn - Phế phẩm
- [x] 5.2 On apply/save, split total evenly across all cells (batches × 8) and each cell across the three fields (vunLon/vunNho/phePham = perCell/3); mark affected cells dirty ← (verify: perCell = total/(N×8); each field = perCell/3; 0 batches handled without divide error)

## 6. Draft + dirty tracking

- [x] 6.1 Draft auto-save to localStorage keyed by `date|shift`; restore on load; preserve across tab switches
- [x] 6.2 Track loaded baseline per cell; compute dirty set (changed vs loaded) ← (verify: draft survives reload and tab switch; dirty set excludes untouched cells)

## 7. Preview + confirm + reset

- [x] 7.1 Save → preview all six categories, changed cells only, readable Vietnamese; nothing persisted yet
- [x] 7.2 "Xác nhận" → PATCH dirty records only; recompute tiLe + tongKhoiLuong, stamp nguoiThucHien (chosen name) + ghiChu; "Sửa lại" returns to form keeping draft
- [x] 7.3 After confirmed save → reset to name-selection screen and clear the `date|shift` draft ← (verify: dirty-only PATCH proven — unchanged records never sent; no-change confirm sends nothing; reset + draft cleared)

## 8. Verification

- [x] 8.1 `cd frontend && npx tsc --noEmit` — must pass
- [x] 8.2 `cd frontend && npm run lint`
- [ ] 8.3 Manual: name → shift → board; enter some cells, reload (draft restored); confirm writes only changed cells; waste total distributes; reset to name ← (verify: end-to-end incl. shared-tablet no-overwrite)
