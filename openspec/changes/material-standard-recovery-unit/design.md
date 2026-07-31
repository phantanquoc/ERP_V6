## Context

`MaterialStandard.tiLeThuHoi` (%) và `loaiDinhMuc` (enum RAW_MATERIAL/EQUIPMENT) chỉ có 2 bản ghi thật trong DB (DM-001, DM-002), cả hai có 1 input item và 7 output item, tên item là text tự do chưa link `InternationalProduct`. Field `tiLeThuHoi` cũng tồn tại độc lập ở 3 chỗ khác (QuotationRequest, Quotation, QuotationCalculatorByProduct) — đó là snapshot % của báo giá, không đọc từ MaterialStandard, và giữ nguyên trong change này.

## Goals / Non-Goals

**Goals:**
- Đổi `tiLeThuHoi` (%) → `kgNguyenLieuTren1KgThanhPham` (kg NL/1kg TP) không làm mất dữ liệu 2 định mức hiện có
- Sinh `loaiDinhMuc` tự động từ `loaiSanPham` của item liên kết, giữ khả năng lọc/sort qua cột cache
- Không đổi field `tiLeThuHoi` ở báo giá (QuotationRequest/Quotation/QuotationCalculator)

**Non-Goals:**
- Không đổi công thức tính giá hòa vốn hay bảng tính báo giá
- Không bắt buộc mọi item phải link `InternationalProduct` — text tự do vẫn hợp lệ, chỉ mất khả năng sinh loại định mức
- Không đổi công thức `soLuongKeHoach` trong quy trình sản xuất

## Decisions

**1. Migration nghịch đảo bằng SQL trực tiếp, không qua Prisma Client.**
`ALTER TABLE ... RENAME COLUMN` giữ dữ liệu tại chỗ, rồi hai câu `UPDATE` chuyển đổi trong cùng migration, thay vì thêm cột mới + xóa cột cũ. Rename giữ nguyên vẹn ràng buộc/index nếu có. Giá trị `0` được coi là dữ liệu bất thường (nhập nhầm) chứ không phải "chưa nhập" — chuyển thành `NULL` để không hiện "0 kg NL → 1kg TP" gây hiểu lầm; `NULL` sẵn có giữ `NULL`. Thứ tự bắt buộc: set `NULL` cho `0` **trước**, rồi mới chia — nếu chia trước thì `100.0/0` sẽ làm migration đổ:
```sql
ALTER TABLE "common"."material_standards" RENAME COLUMN "tiLeThuHoi" TO "kgNguyenLieuTren1KgThanhPham";

UPDATE "common"."material_standards"
SET "kgNguyenLieuTren1KgThanhPham" = NULL
WHERE "kgNguyenLieuTren1KgThanhPham" = 0;

UPDATE "common"."material_standards"
SET "kgNguyenLieuTren1KgThanhPham" = 100.0 / "kgNguyenLieuTren1KgThanhPham"
WHERE "kgNguyenLieuTren1KgThanhPham" IS NOT NULL;
```

**2. `loaiDinhMuc` tính lại mỗi lần ghi (create/update), không tính runtime mỗi lần đọc.**
Lý do: danh sách định mức cần filter/sort theo `loaiDinhMuc`, filter trên giá trị tính runtime cho N định mức × M item mỗi request là tốn và khó viết đúng bằng Prisma where. Cache trong cột, tính lại trong service khi ghi input/output items. Đánh đổi: nếu `loaiSanPham` của một `InternationalProduct` bị đổi sau đó, `loaiDinhMuc` của các định mức tham chiếu nó sẽ lệch tới lần ghi tiếp theo — chấp nhận được vì `loaiSanPham` gần như không đổi sau khi tạo sản phẩm trong thực tế vận hành.

**3. Quy tắc chọn loại khi nhiều đầu ra khác `loaiSanPham`: theo `tiLe` cao nhất, ghép nếu còn khác biệt.**
Alternative đã xét: lấy loại của item đầu tiên (bỏ — thứ tự nhập không có ý nghĩa nghiệp vụ), liệt kê tất cả loại luôn (bỏ — nhãn dài không đọc được khi có 7 output item cùng loại). Chọn theo tỉ lệ cao nhất phản ánh đúng "định mức này chủ yếu tạo ra loại gì".

**4. Backfill `internationalProductId` bằng match tên chính xác (case-insensitive), không dùng similarity/fuzzy.**
Dữ liệu thật cho thấy input item ("Mít đông sấy Lá Bàng") khớp đúng tên một `InternationalProduct`, nhưng output item ("Mít sấy Lá Bàng loại A 7 kg") là tên cụ thể theo lô, không khớp tên sản phẩm nào. Fuzzy match có nguy cơ gán sai sản phẩm âm thầm; match chính xác an toàn hơn — bỏ lỡ thì item vẫn dùng được (text tự do), chỉ mất phần "loại định mức tự động" cho tới khi người dùng chọn lại qua dropdown.

**5. Dropdown chọn sản phẩm cho item lưu thêm `internationalProductId`, giữ nguyên hành vi text hiện tại.**
`ProductCombobox` sinh cho warehouse receipt (change trước) không tái dùng ở đây — dropdown hiện tại của `MaterialStandardManagement` đã có filter theo loại + tìm kiếm, chỉ thiếu một dòng lưu `product.id` cạnh `product.tenSanPham`. Sửa tối thiểu, không thay component.

## Risks / Trade-offs

- **Blast radius rộng hơn nhìn ban đầu**: `tiLeThuHoi` trùng tên ở 4 model khác nhau. Rủi ro nhầm sang field báo giá khi sửa code — đã rà và chỉ động vào `common.MaterialStandard`, giữ nguyên 3 field còn lại. Cần double-check khi viết code: mọi thay đổi trong `materialStandardService.ts`/`.tsx`, không đụng `quotationService.ts`/`quotationCalculatorService.ts`.
- **Output item không backfill được** (7/7 dòng dữ liệu thật) — loại định mức phía "đầu ra" sẽ hiện "Chưa xác định" cho tới khi người dùng gán tay qua dropdown đã sửa. Không tự động hoàn toàn, cần thao tác thủ công một lần cho dữ liệu cũ.
- **Cache lệch khi `loaiSanPham` đổi** — xem Decision 2. Chấp nhận được, không có cơ chế tự đồng bộ lại.
- **Rename column ảnh hưởng mọi nơi đọc `tiLeThuHoi` của MaterialStandard** — đã rà thấy service/controller/frontend chỉ có `materialStandardService.ts` (be) và `MaterialStandardManagement.tsx`/`materialStandardService.ts` (fe). Không có nơi khác đọc field này của model MaterialStandard.
