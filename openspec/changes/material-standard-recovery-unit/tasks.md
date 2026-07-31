# Tasks: Đổi đơn vị thu hồi định mức NVL + sinh loại định mức + định mức thực hiện

## 1. Schema + Migration

- [ ] 1.1 `backend/prisma/schema/common.prisma` — rename `MaterialStandard.tiLeThuHoi` → `kgNguyenLieuTren1KgThanhPham`
- [ ] 1.2 Đổi `loaiDinhMuc` từ enum `MaterialStandardType` sang `String?`; giữ enum `MaterialStandardType` khai báo trong schema (không xóa) để không phá code chưa rà hết
- [ ] 1.3 Thêm `internationalProductId String?` + relation vào `MaterialStandardInputItem` và `MaterialStandardItem`, `onDelete: SetNull`, `@@index`
- [ ] 1.4 Thêm `nangSuatTrenPhut Float?`, `donViNangSuat String?` vào `ProductionFlowchartCost`
- [ ] 1.5 Viết migration SQL tay theo đúng thứ tự trong design.md (rename → set NULL cho 0 → chia). Đặt tên `add_material_standard_recovery_kg`
- [ ] 1.6 Viết migration backfill riêng (script SQL hoặc TS one-off) match `tenNguyenLieu`/`tenThanhPham` theo tên chính xác case-insensitive vào `international_products.tenSanPham`; log số dòng backfill được và số dòng bỏ qua
- [ ] 1.7 `npx prisma generate`

## 2. Backend — Service loại định mức

- [ ] 2.1 Viết hàm thuần `deriveMaterialStandardType(inputItems, outputItems): string | null` trong `materialStandardService.ts` theo quy tắc: nhóm theo `loaiSanPham` (qua item đã link `InternationalProduct`), chọn nhóm `tiLe` cao nhất mỗi phía, ghép " + " nếu còn khác biệt, "Chưa xác định" nếu phía đó không có item nào link được, `null` nếu phía đó không có item nào
- [ ] 2.2 Gọi `deriveMaterialStandardType` trong `create()` và `update()` của `materialStandardService.ts`, lưu kết quả vào `loaiDinhMuc`
- [ ] 2.3 Cập nhật `getAll()`/`getById()` để include `internationalProduct` (chỉ `id`, `tenSanPham`, `loaiSanPham`) trên cả input và output items

## 3. Backend — Verification

- [ ] 3.1 `cd backend && npx tsc --noEmit`
- [ ] 3.2 Viết test cho `deriveMaterialStandardType`: một loại mỗi phía; nhiều loại đầu ra chọn theo tiLe cao nhất; ghép khi còn khác biệt; phía không link được → "Chưa xác định"; phía rỗng → null
- [ ] 3.3 `npm test -- materialStandard` (hoặc chạy toàn bộ nếu không có filter theo tên)

## 4. Frontend — Định mức NVL: form + danh sách

- [ ] 4.1 `frontend/src/services/materialStandardService.ts` — rename field `tiLeThuHoi` → `kgNguyenLieuTren1KgThanhPham` trong types, đổi `loaiDinhMuc` type thành `string`
- [ ] 4.2 `MaterialStandardManagement.tsx` — bỏ ô readonly "Tỉ lệ thu hồi (%)" và biến `kgThuHoi` tạm tính ngược; đổi ô còn lại thành input trực tiếp `kgNguyenLieuTren1KgThanhPham`, nhãn "Khối lượng thu hồi (kg NL → 1kg TP)"
- [ ] 4.3 Đổi cảnh báo bất thường: hiện khi giá trị nhập `< 1` (không phải `> 1` như cũ), nhãn "Cần dưới 1 kg nguyên liệu cho 1 kg thành phẩm là bất thường..."
- [ ] 4.4 Đổi tiêu đề cột danh sách: "Tên định mức" → "Tên thành phẩm đầu ra"; thêm cột "Tên nguyên liệu đầu vào" sau đó; đổi cột "Tỉ lệ thu hồi (%)" thành "Khối lượng thu hồi (kg NL → 1kg TP)", bỏ ký hiệu `%`
- [ ] 4.5 Cột "Tên nguyên liệu đầu vào": item `tiLe` cao nhất + hậu tố `+N`, hoặc `—` nếu rỗng (theo spec)
- [ ] 4.6 Đổi bộ lọc `loaiDinhMuc` từ `select` 2 giá trị cứng sang `text` (contains, không phân biệt hoa thường)
- [ ] 4.7 Modal chi tiết định mức: hiển thị "X kg nguyên liệu → 1 kg thành phẩm" thay cho "X% (Y kg/1kg NL)"
- [ ] 4.8 Dropdown chọn sản phẩm cho input/output item: lưu thêm `internationalProductId` cạnh `tenNguyenLieu`/`tenThanhPham` khi người dùng chọn từ danh sách; xóa `internationalProductId` khi người dùng sửa tay text sau khi đã chọn

## 5. Frontend — Quy trình sản xuất: nhãn + năng suất

- [ ] 5.1 `ProductionProcessManagement.tsx` — đổi nhãn cột "ĐỊNH MỨC LAO ĐỘNG" → "ĐỊNH MỨC THỰC HIỆN"
- [ ] 5.2 Đổi nhãn cột "SỐ LƯỢNG NGUYÊN LIỆU (Kg)" → "KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)"
- [ ] 5.3 Thêm 2 cột nhập liệu `nangSuatTrenPhut` + `donViNangSuat` vào bảng flowchart, cột hiển thị ghép "<donViNangSuat>/phút"; `<datalist>` gợi ý kg/cái/lít
- [ ] 5.4 Cập nhật `productionProcessService.ts` types + payload gửi lên cho 2 field mới
- [ ] 5.5 `ProcessManagement.tsx`, `quotation-calculator/QuotationCalculatorModal.tsx` — đổi nhãn "ĐỊNH MỨC LAO ĐỘNG" → "ĐỊNH MỨC THỰC HIỆN" cho nhất quán (theo Assumed trong proposal)
- [ ] 5.6 `ChatWidget.tsx` — đổi label map `dinhMucLaoDong: 'Định mức lao động'` → `'Định mức thực hiện'`

## 6. Frontend — Verification

- [ ] 6.1 `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — tổng lỗi không vượt baseline hiện tại
- [ ] 6.2 `npx eslint` trên các file đã sửa — không thêm lỗi mới
- [ ] 6.3 Rà lại `grep -rn "tiLeThuHoi"` toàn repo sau khi sửa — xác nhận `quotationService.ts`, `quotationCalculatorService.ts`, `QuotationCalculatorModal.tsx`, `RevisionSnapshotView.tsx`, `snapshotFormat.ts`, `ai-service/agent/registry.py` **không đổi**

## 7. Deploy verification (dev container)

- [ ] 7.1 Backup DB trước khi apply migration (theo quy trình đã dùng ở các lần deploy trước)
- [ ] 7.2 Apply migration trong container dev, `prisma generate`, restart backend
- [ ] 7.3 Xác nhận qua psql: DM-001 → `4.5045...`, DM-002 → `5.0`
- [ ] 7.4 Xác nhận `loaiDinhMuc` của DM-001/DM-002 sau khi backfill: input "Mít đông sấy Lá Bàng" khớp tên → link được; output 7 dòng không khớp tên nào → "Chưa xác định" ở phía đầu ra
- [ ] 7.5 Test UI: sửa DM-001, gán tay `internationalProductId` cho 1 output item qua dropdown, lưu, xác nhận `loaiDinhMuc` cập nhật lại
