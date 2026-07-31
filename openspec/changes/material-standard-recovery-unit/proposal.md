# Proposal: Đổi đơn vị thu hồi định mức NVL + sinh loại định mức + định mức thực hiện

## Why

Ba vấn đề trong Quản lý sản xuất:

1. **Tỷ lệ thu hồi lưu sai chiều so với cách người sản xuất nói.** DB lưu `tiLeThuHoi` là % thành phẩm thu từ 1kg nguyên liệu (DM-001 = 22.2%). Nhưng khi bàn định mức, người vận hành nói "4,5 kg nguyên liệu ra 1 kg thành phẩm". Hai cách là nghịch đảo của nhau, và cách nói của người vận hành là cách đúng để lưu.

2. **Loại định mức là enum cứng, không phản ánh thực tế.** `MaterialStandardType = RAW_MATERIAL | EQUIPMENT` không mô tả được luồng biến đổi nguyên liệu. Thực tế có nhiều luồng: Nguyên liệu trái → Thành phẩm, Nguyên liệu trái → Nguyên liệu đông, Nguyên liệu đông → Thành phẩm. Loại định mức nên **sinh ra** từ loại hàng hóa đầu vào và đầu ra, không phải chọn tay.

3. **Danh sách định mức không cho thấy định mức nói về cái gì.** Cột hiện tại là Mã / Tên định mức / Loại / Tỷ lệ thu hồi (%) — không thấy nguyên liệu đầu vào, và "Tên định mức" thực chất là tên thành phẩm đầu ra.

Thêm nữa, chi tiết quy trình sản xuất dùng nhãn "Định mức lao động" và "Khối lượng nguyên liệu (kg)" cho công đoạn không chỉ có lao động (còn vật tư, máy), và thiếu chỗ ghi năng suất theo phút.

## What Changes

### a. Định mức NVL

**Schema:**
- `MaterialStandard.tiLeThuHoi` (Float, %) → `kgNguyenLieuTren1KgThanhPham` (Float, kg NL/1kg TP). Migration chuyển đổi `100 / tiLeThuHoi`.
- `MaterialStandardInputItem` + `MaterialStandardItem`: thêm `internationalProductId` (nullable FK → `business.InternationalProduct`), để lấy được `loaiSanPham` của đầu vào/đầu ra.
- `MaterialStandard.loaiDinhMuc`: enum `MaterialStandardType` → String, chứa nhãn sinh tự động dạng `"<loại đầu vào> → <loại đầu ra>"`.

**Danh sách định mức** — 5 cột theo đúng thứ tự yêu cầu:
Mã định mức · Tên thành phẩm đầu ra · Tên nguyên liệu đầu vào · Khối lượng thu hồi (kg NL → 1kg TP) · Loại định mức

**Chi tiết định mức:** nhập trực tiếp kg nguyên liệu cho 1kg thành phẩm, bỏ ô % (hiện là ô readonly tính tự động theo chiều ngược).

### b. Quy trình sản xuất — chi tiết quy trình

- Nhãn "ĐỊNH MỨC LAO ĐỘNG" → "ĐỊNH MỨC THỰC HIỆN"
- Nhãn "SỐ LƯỢNG NGUYÊN LIỆU (Kg)" → "KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)"
- Thêm cột nhập liệu `nangSuatTrenPhut` + `donViNangSuat` hiển thị dạng "ĐVT/phút" (vd kg/phút, cái/phút, lít/phút)

## Capabilities

### New Capabilities
- `material-standard-recovery-unit`: Khối lượng thu hồi tính bằng kg nguyên liệu cho 1kg thành phẩm, thay cho %.
- `material-standard-type-derivation`: Loại định mức sinh tự động từ loại hàng hóa đầu vào → loại hàng hóa đầu ra.
- `production-process-performance-rate`: Cột năng suất thực hiện (ĐVT/phút) trong chi tiết quy trình sản xuất.

### Modified Capabilities
- `material-standard-list`: Đổi bộ cột hiển thị và nhãn tiêu đề của danh sách định mức.

## Impact

**Schema + migration** (`backend/prisma/schema/common.prisma`):
- Rename + convert `tiLeThuHoi` → `kgNguyenLieuTren1KgThanhPham`
- Add `internationalProductId` vào 2 bảng item (nullable, `onDelete: SetNull`)
- `loaiDinhMuc`: enum → String; enum `MaterialStandardType` giữ lại cho tới khi không còn code tham chiếu
- Add `nangSuatTrenPhut`, `donViNangSuat` vào `ProductionFlowchartCost`

**Backend:** `materialStandardService.ts`, `materialStandardController.ts`, `productionProcessService.ts`

**Frontend:** `MaterialStandardManagement.tsx`, `ProductionProcessManagement.tsx`, `ProcessManagement.tsx`, `QuotationCalculatorModal.tsx` (2 nhãn), `materialStandardService.ts`, `productionProcessService.ts`, `ChatWidget.tsx` (label map)

**AI Service:** không đổi. `agent/registry.py:416` khai báo `tiLeThuHoi` cho endpoint `POST /api/quotations`, là field báo giá — xem mục dưới.

**KHÔNG đổi — `tiLeThuHoi` của báo giá là field khác cùng tên.** Rà toàn bộ codebase cho thấy `tiLeThuHoi` tồn tại ở 4 nơi:
- `common.MaterialStandard.tiLeThuHoi` — định mức, **đây là cái change này đổi**
- `business.QuotationRequest.tiLeThuHoi` + `business.Quotation.tiLeThuHoi` — snapshot % tại thời điểm báo giá, client gửi lên qua `data.tiLeThuHoi`, không đọc từ định mức
- `business.QuotationCalculatorByProduct.tiLe` / `tiLeThuHoiThucTe` — tỉ lệ kế hoạch/thực tế của bảng tính giá

`QuotationCalculatorModal` tính `tongNguyenLieuCanSanXuat * tiLeThuHoi / 100`, tức vẫn dùng nghĩa %. Giữ nguyên cả 3 nhóm sau; đổi chúng là change riêng và phải xét lại công thức giá hòa vốn.

## Design Decisions

**Migration chiều nghịch đảo.** Dữ liệu hiện có 2 định mức: DM-001 (22.2% → 4.5045 kg/kg), DM-002 (20% → 5.0 kg/kg). Migration dùng `100.0 / "tiLeThuHoi"`, và đặt NULL khi `tiLeThuHoi` là NULL hoặc 0 — chia cho 0 sẽ làm migration đổ.

**Loại định mức sinh ở đâu.** Sinh ở backend service khi đọc/ghi, không lưu cứng — vì `loaiSanPham` của hàng hóa có thể đổi, và định mức nhiều đầu ra thì loại phải suy từ tập đầu ra. Lưu vào cột `loaiDinhMuc` như cache để filter/sort được, tính lại mỗi lần ghi.

**Nhiều đầu ra thì lấy loại nào.** DM-001 có 7 đầu ra (loại A/B/C/vụn/phế phẩm) đều cùng `loaiSanPham`. Quy tắc: lấy loại của đầu ra có `tiLe` cao nhất. Nếu tập đầu ra có nhiều loại khác nhau, ghép các loại phân biệt bằng " + ".

**Item chưa link sản phẩm.** `tenNguyenLieu` / `tenThanhPham` đang là text tự do, dữ liệu cũ chưa có `internationalProductId`. Migration thử match theo tên (case-insensitive) để backfill; cái nào không match thì để NULL và loại định mức hiện "Chưa xác định".

## Assumed

- `donViNangSuat` là text tự do có datalist gợi ý (kg, cái, lít) — không ràng buộc enum, vì công đoạn mới có thể cần đơn vị mới.
- Cột "Ngày tạo" và "Hoạt động" trong danh sách định mức giữ nguyên; yêu cầu chỉ nói về 5 cột nội dung.
- `nangSuatTrenPhut` độc lập với `dinhMucLaoDong` (theo lựa chọn 3B), không thay công thức `soLuongKeHoach` đang có.
- Enum `MaterialStandardType` giữ trong schema ở change này để không phá code chưa rà; dọn ở change sau.
- Nhãn "ĐỊNH MỨC LAO ĐỘNG" trong `QuotationCalculatorModal` đổi theo cho nhất quán, dù yêu cầu chỉ nói về chi tiết quy trình sản xuất.
