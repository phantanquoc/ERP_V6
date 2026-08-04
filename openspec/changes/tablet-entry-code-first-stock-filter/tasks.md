## 1. Prisma schema + migration

- [x] 1.1 Trong `backend/prisma/schema/business_production.prisma`, thêm `maSanPham String?` vào model `MaterialEvaluation` (cạnh `tenHangHoa`) và `@@index([maSanPham])`
- [x] 1.2 Thêm `maSanPham String?` vào model `FinishedProduct` (cạnh `tenHangHoa`) và `@@index([maSanPham])`
- [x] 1.3 Chạy `cd backend && npx prisma migrate dev --name add_ma_san_pham_to_entry_records` và `npx prisma generate`
- [x] 1.4 Thêm bước backfill vào migration SQL: `UPDATE business.material_evaluations me SET "maSanPham" = ip."maSanPham" FROM business.lot_products lp JOIN business.international_products ip ON ip.id = lp."internationalProductId" WHERE me."lotProductId" = lp.id AND me."maSanPham" IS NULL`, và tương tự cho `finished_products` qua `internationalProductId`
- [x] 1.5 Xác nhận backfill idempotent (điều kiện `IS NULL`) và chạy được trên tập rỗng — DB dev hiện 0 dòng cả hai bảng ← (verify: chạy migration 2 lần, lần 2 không lỗi)

## 2. Backend: tồn kho trong raw-materials endpoint

- [x] 2.1 Trong `backend/src/services/internationalProductService.ts`, sửa `getRawMaterials()` (`:508`) để trả thêm `tongTonKho: number` cho từng nguyên liệu
- [x] 2.2 Tính tồn bằng **một** `prisma.lotProduct.groupBy` theo `internationalProductId` với `where: { soLuong: { gt: 0 }, donViTinh: 'Kg' }` rồi map vào kết quả — không query trong loop ← (verify: đếm số query phát sinh, phải là 2 chứ không phải 1+N)
- [x] 2.3 Giữ nguyên hành vi trả **tất cả** nguyên liệu (không loại mục hết hàng) vì toggle "Tất cả" ở frontend phụ thuộc vào chúng có mặt
- [x] 2.4 Viết test cho `getRawMaterials()`: nguyên liệu có tồn trả đúng tổng, nguyên liệu không tồn trả `tongTonKho: 0` và vẫn có trong kết quả, nguyên liệu có `lot_products` đơn vị khác Kg không được tính vào tồn
- [x] 2.5 Chạy `cd backend && npx jest src/__tests__/internationalProductService.test.ts --runInBand` (tạo file nếu chưa có)

## 3. Backend: gán maSanPham khi tạo record

- [x] 3.1 Trong `backend/src/services/materialEvaluationService.ts:298`, cạnh dòng gán `tenHangHoa = lotProduct.internationalProduct.tenSanPham`, gán thêm `maSanPham = lotProduct.internationalProduct.maSanPham`, và đưa vào `data` ở `:307`
- [x] 3.2 Ở đường tạo tay (`:178`) và update (`:363`), truyền `maSanPham` từ payload nếu có
- [x] 3.3 Trong `backend/src/services/finishedProductService.ts:165`, gán `maSanPham` — lấy từ `internationalProduct.maSanPham` khi có `internationalProductId`, ngược lại từ payload
- [x] 3.4 Trong `backend/src/schemas/index.ts`, thêm `maSanPham: z.string().optional()` vào schema material evaluation (`:231`) và finished product (`:281`)
- [x] 3.5 Viết test: tạo material evaluation qua warehouse package thì record có `maSanPham` đúng; tạo không qua package thì `maSanPham` null và không lỗi
- [x] 3.6 Chạy `cd backend && npx jest src/__tests__/materialEvaluationService.test.ts --runInBand`
- [x] 3.7 Chạy `cd backend && npx tsc --noEmit` — phải pass

## 4. Frontend: types + service layer

- [x] 4.1 Trong `frontend/src/services/internationalProductService.ts`, thêm `tongTonKho: number` vào type nguyên liệu mà `getRawMaterials()` (`:223`) trả về
- [x] 4.2 Trong `frontend/src/services/materialEvaluationService.ts`, thêm `maSanPham?: string` vào interface `MaterialEvaluation` (`:3-24`) và vào payload tạo
- [x] 4.3 Trong `frontend/src/services/finishedProductService.ts`, thêm `maSanPham?: string` vào interface `FinishedProduct` (`:5-58`)

## 5. RawMaterialPicker: filter tồn kho

- [x] 5.1 Trong `frontend/src/components/production/RawMaterialPicker.tsx`, thêm state `showAll` (default `false`) và reset về `false` trong `handleClose` (`:65-69`) để trạng thái không persist qua lần mở
- [x] 5.2 Sửa `filtered` (`:41-56`) để khi `!showAll` chỉ giữ mục `tongTonKho > 0`; khi `showAll` giữ tất cả nhưng đẩy mục hết hàng xuống cuối
- [x] 5.3 Thêm chip toggle `[Có hàng] [Tất cả]` vào header overlay cạnh chip `loaiSanPham` hiện có (`:118-146`), touch target tối thiểu 44px, kèm nhãn số mục đang ẩn
- [x] 5.4 Hiển thị `tongTonKho` bên phải mỗi dòng list (`:157-179`) dạng `8.549 Kg`; mục hết hàng ghi rõ "Hết hàng" bằng màu xám
- [x] 5.5 Thêm loading state **trong overlay** — hiện `loading` chỉ tác động nút trigger (`:76`, `:83-84`) nên overlay mở lúc chưa có data sẽ hiện sai thông báo "Không tìm thấy sản phẩm phù hợp" (`:154`)
- [x] 5.6 Phân biệt empty do list rỗng với empty do search không khớp — hiện dùng chung một message
- [x] 5.7 Kiểm tra trên viewport ~501px portrait: chip toggle, số tồn và mã cùng nằm trên một dòng không tràn ngang ← (verify: 9 nguyên liệu, mã dài nhất `NLTDSC-002-MMTSS`)

## 6. Hiển thị mã thay tên trên màn hình nhập

- [x] 6.1 Trong `frontend/src/pages/production/ProductionDataEntry.tsx:1121-1123`, đổi cột "Nguyên liệu" thành "Mã hàng hóa", render `maSanPham`, bỏ `truncate max-w-[150px]`
- [x] 6.2 Ở card chế độ hẹp (`:1067-1070`), thay `tenHangHoa` bằng `maSanPham`
- [x] 6.3 Ở header card preview (`:293-296`), thay `tenHangHoa` bằng `maSanPham`
- [x] 6.4 Trong `ProductionSystemOperationEntry.tsx:778-781` (nút chọn mẻ chiên), thay `tenHangHoa` bằng `maSanPham`
- [x] 6.5 Khi `maSanPham` null (record cũ / tạo tay), render không có mã thay vì hiện `undefined` hoặc lỗi ← (verify: giả lập record `maSanPham: null`, màn hình không crash)
- [x] 6.6 Không đổi `RawMaterialPicker` và `EvaluationDetailReadOnly` — hai chỗ này giữ cả mã và tên có chủ ý

## 7. Bổ sung mã hàng hóa vào nhãn context

- [x] 7.1 Trong `ProductionDataEntry.tsx:1221`, đổi nhãn `FieldFocusEditor` từ `${getMachineLabel(...)} · ${batch.maChien}` thành `... · ${batch.maChien} · ${batch.maSanPham}`; áp dụng cùng chỗ ở `:1089` và `:1135`
- [x] 7.2 Trong `ProductionDataEntry.tsx:338` (nhãn editor trong preview), thêm mã hàng hóa
- [x] 7.3 Trong `ProductionSystemOperationEntry.tsx:807`, heading "Chọn máy cho mã chiên {selectedMaChien}" thêm mã hàng hóa — dùng `selectedBatch` đã có sẵn ở `:654`
- [x] 7.4 Trong `ProductionSystemOperationEntry.tsx:851-963` (step `form`), thêm dải context mã mẻ + mã hàng hóa đọc được, không chỉ dựa vào breadcrumb chữ xám 14px ở `:727-731`
- [x] 7.5 Xác nhận nhãn `FieldFocusEditor` vẫn **duy nhất cho từng field** — `FieldFocusEditor` sync theo `label` (đổi từ change `2026-07-27-optimize-output-preview-portrait`), nhãn trùng sẽ phá việc sync khi bấm "Tiếp" ← (verify: bấm "Tiếp" qua hết một mẻ, mỗi ô hiện đúng giá trị của nó)

## 8. Sửa nhóm mất dữ liệu

- [x] 8.1 Trong `ProductionDataEntry.tsx:496-499`, bỏ việc reset `baselineLoaded.current = false` khi `fpIndex.size === 0` — tập rỗng là baseline hợp lệ
- [x] 8.2 Tách thành hai ref riêng: `baselineLoaded` (đã load xong) và điều kiện cho phép autosave ở `:560`, để hai trách nhiệm không chặn nhau
- [x] 8.3 Kiểm tra draft được ghi trên ngày/ca chưa có `FinishedProduct` nào: nhập giá trị, reload, giá trị phải còn ← (verify: đây là trạng thái mặc định vì `finished_products` đang 0 dòng — case quan trọng nhất của tasks này)
- [x] 8.4 Thêm guard vào effect load baseline (`:495-556`): không `setBoard` khi board đang dirty so với baseline
- [x] 8.5 Kiểm tra background refetch không ghi đè input đang gõ: nhập giá trị, trigger invalidate, giá trị phải còn ← (verify: dùng React Query devtools hoặc gọi mutation ở tab khác)
- [x] 8.6 Bọc `localStorage.setItem` ở `:559-564` trong try/catch, hiện toast khi ghi thất bại — theo mẫu `ProductionSystemOperationEntry.tsx:133-135`
- [x] 8.7 Debounce việc ghi draft (dùng `useDebounce` có sẵn ở `frontend/src/hooks/useDebounce.ts`) để không serialize JSON mỗi keystroke trên board 64 ô
- [x] 8.8 Validate shape draft khi load (`:532-551`) trước khi nạp vào `board` — hiện `Object.keys(draft.board) as QualityTab[]` cast mù, draft cũ sau khi đổi enum sẽ nạp rác
- [x] 8.9 Gỡ state `notes` (`:436`) hoặc nối nó vào payload — hiện được lưu/load draft (`:562`, `:547`) nhưng không có UI nhập và không gửi lên server, là dead state

## 9. Error state cho ba trang

- [x] 9.1 Trong `frontend/src/hooks/useRawMaterials.ts`, `useProductionDataEntry.ts`, `useLotsByProduct.ts`, `useKienByProductAndLot.ts`, expose `isError` và `refetch`
- [x] 9.2 Trong `ProductionDataEntry.tsx:1055-1059`, tách màn hình lỗi khỏi empty state: lỗi thì hiện "Không tải được dữ liệu" + nút thử lại; rỗng thật thì giữ message "Không có mã chiên nào cho Ca X ngày Y"
- [x] 9.3 Làm tương tự ở `ProductionSystemOperationEntry.tsx:757-763` và `ProductionMaterialEvaluationEntry.tsx`
- [x] 9.4 Thêm empty state khi `fryers` rỗng (`ProductionDataEntry.tsx:1110`) — hiện render header 4 cột với body không có input nào
- [x] 9.5 Trong `ProductionMaterialEvaluationEntry.tsx:371-387`, chuyển việc load criteria từ `useEffect` + `useState` thủ công sang react-query để có cache và error surface — hiện lỗi chỉ `console.error` ở `:379`
- [x] 9.6 Kiểm tra bằng cách chặn network: mỗi trang phải nói "lỗi", không nói "không có dữ liệu" ← (verify: DevTools offline mode trên cả 3 trang)

## 10. Mã kiện thật

- [x] 10.1 Trong `frontend/src/hooks/useKienByProductAndLot.ts`, đảm bảo `maKien` có trong data trả về (backend `lotProductService.ts:205-217` đã `include` đủ)
- [x] 10.2 Trong `ProductionMaterialEvaluationEntry.tsx:425-432`, dùng `maKien` làm `primary` thay cho `"Kiện ${idx+1}"`; fallback về nhãn index chỉ khi `maKien` null
- [x] 10.3 Trong `handleKienChange` (`:675-699`), gán `soLoKien = maKien` thay cho `${tenLo}-${kienId.slice(-4)}` ở `:689`; fallback giữ cách cũ khi `maKien` null
- [x] 10.4 Gán thêm `maSanPham` vào wizard data trong `handleKienChange` — hiện chỉ gán `tenHangHoa` ở `:693`
- [x] 10.5 Kiểm tra nhãn worker thấy khớp giá trị lưu: chọn kiện, lưu, mở `EvaluationDetailReadOnly` xem `soLoKien` ← (verify: DB dev có `maKien` dạng `Lô Nguyên Liệu-s6hp` ở 43/44 dòng)
- [x] 10.6 Hiển thị thêm `maKho` ở nhãn lô (`:420` hiện chỉ `warehouse.tenKho`) — `warehouses` đã có cột `maKho`

## 11. Batch save song song + progress

- [x] 11.1 Trong `frontend/src/hooks/useProductionDataEntry.ts:142-175`, đổi for-loop tuần tự (`:147`) sang `Promise.allSettled`
- [x] 11.2 Giữ nguyên hình dạng báo cáo partial-failure (số thành công / số lỗi / ô nào lỗi) mà spec yêu cầu — map `rejected` results về danh sách ô lỗi
- [x] 11.3 Thêm progress indicator trong lúc lưu (số ô đã xong / tổng)
- [x] 11.4 Thu hẹp `invalidateQueries` ở `:172` và `:222` — hiện dùng `productionEntryKeys.all` trỏ tới `['materialEvaluations']` (`:10`) làm invalidate cả màn hình MaterialEvaluation khác
- [ ] 11.5 ~~Thêm `shift` vào query key `useAllFinishedProducts` và filter theo ca~~ — **KHÔNG LÀM, giả định ban đầu sai**: `FinishedProduct` không có cột `ca` (`business_production.prisma:394-400`), nên server không thể narrow theo ca; `getAllFinishedProducts` cũng không nhận param đó. Thêm `shift` vào query key sẽ làm **tệ hơn**: 3 cache entry riêng cho cùng một tập dữ liệu ngày, tức refetch mỗi lần đổi ca. Thay vào đó đã sửa vấn đề thật của limit 500: `warnIfTruncated` cảnh báo khi response bị cắt (trước đây mất dữ liệu im lặng vì hook bỏ `pagination`). Hook nhận `_shift` để giữ call-site rõ nghĩa nhưng không đưa vào key — có comment giải thích.
- [x] 11.6 Kiểm tra lưu 64 ô: hoàn tất nhanh hơn rõ rệt và báo cáo partial-failure vẫn đúng ← (verify: giả lập 1 request lỗi, message phải nói đúng ô nào)

## 12. Sửa getMachineLabel và waste rounding

- [x] 12.1 Trong `ProductionDataEntry.tsx:768`, map `machineSystemId` → `maHeThong` qua `fryers` trước khi gọi `getMachineLabel` — hiện truyền CUID vào hàm bóc số cuối bằng regex `/(\d+)$/` (`:708-711`) nên ra "Máy 7" sai hoặc nguyên CUID
- [x] 12.2 Bọc `getMachineLabel` trong `useCallback` — hiện là plain function nên identity mới mỗi render, làm `useCallback` của `handleConfirm` (`:800`) vô hiệu
- [x] 12.3 Sửa waste chia 3 (`:625`): tính sao cho tổng 3 field bằng số worker nhập, bù phần dư vào field cuối thay vì round độc lập từng field
- [x] 12.4 Thống nhất số chữ số thập phân giữa preview (`.toFixed(3)` ở `:365`, `:1173`) và giá trị lưu (round 2 chữ số ở `:586`)
- [x] 12.5 Kiểm tra: nhập 10 kg waste, tổng 3 field của mỗi ô bằng đúng share của ô đó, và preview hiện đúng số sẽ lưu ← (verify: 10 / (N×8) rồi chia 3, không mất 0.01 kg)

## 13. Hiệu năng + dọn dẹp

- [x] 13.1 Bọc `NumericInput` (`ProductionDataEntry.tsx:105-118`) trong `React.memo` và `useCallback` cho handler per-cell — hiện handler inline ở `:1085-1090`, `:1131-1136` nên memo vô dụng
- [x] 13.2 Memo hóa mảng `traversal` truyền vào `onNext` (`:1214-1233`) — hiện build lại toàn bộ batches × fryers mỗi render kể cả khi editor đóng
- [x] 13.3 Memo hóa `cardsData` và `getCardData` trong `FullGridPreview` (`:195-221`) — hiện tính O(batches × tabs × fryers) mỗi render
- [x] 13.4 Debounce search trong `OperatorSelectionScreen.tsx:102-110` bằng `useDebounce` — hiện normalize NFD regex trên tới 500 employee mỗi keystroke
- [x] 13.5 Bỏ prefetch `useProductionEmployees` (`:34`) khi đang ở attended mode — hiện load 500 dòng ngay khi mount dù có thể không bao giờ bấm "Tìm người khác"
- [x] 13.6 Xóa `frontend/src/components/production/FryBatchPicker.tsx` — dead code 8.3 KB, không import ở đâu trong `frontend/src` ← (verify: grep `FryBatchPicker` trước khi xóa, chỉ được có self-reference)
- [x] 13.7 Gỡ `useSystemOperationByBatchAndFryer` (`useProductionDataEntry.ts:179-188`) — trùng endpoint `GET /system-operations/ma-chien/{maChien}` với `useSystemOperationsByMaChien` (`:197-203`), và `machineRows.find()` ở `ProductionSystemOperationEntry.tsx:655` đã có đủ data
- [x] 13.8 Sửa `useMemo` có side effect ở `ProductionMaterialEvaluationEntry.tsx:467-478` (`URL.revokeObjectURL` + `createObjectURL`) — chuyển sang `useEffect` với cleanup
- [x] 13.9 Sửa race draft vs DB ở `ProductionSystemOperationEntry.tsx:341-361` và `:385-403` — nếu `existingOperation` resolve sau khi draft load thì DB ghi đè draft mà banner "Đang dùng nháp chưa lưu" (`:881-885`) vẫn hiện sai

## 14. Verification

- [x] 14.1 `cd backend && npx tsc --noEmit` — phải pass, không lỗi
- [x] 14.2 `cd backend && npm run lint`
- [x] 14.3 `cd backend && npm test` — toàn bộ Jest phải pass
- [x] 14.4 `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -c "error TS"` — tổng lỗi **không tăng** so với mốc 610, và **không có lỗi `TS2304`** ← (verify: ghi lại con số trước và sau)
- [x] 14.5 `cd frontend && npm run lint`
- [x] 14.6 `mcp__gitnexus__detect_changes()` — xác nhận scope thay đổi đúng như dự kiến, không chạm vùng ngoài ý định
- [x] 14.7 Chạy thử luồng thật trên viewport ~501px portrait: chọn nguyên liệu (chỉ 2 mục có tồn) → chọn lô → chọn kiện (mã thật) → nhập board → reload giữa lúc nhập (draft phải còn) → lưu → xác nhận preview khớp DB
- [x] 14.8 Cập nhật `openspec/specs/production-data-tablet-entry/spec.md` theo spec delta của change này
