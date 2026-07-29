# Chuẩn hóa mã hàng hóa: LOAI-STT-TENVIETTAT

## Mục tiêu

Mã hàng hóa (`InternationalProduct.maSanPham`) chuyển sang cấu trúc 3 đoạn
`TENLOAIVIETTAT-STT-TENHANGVIETTAT` (ví dụ `NLT-001-MTLB`), cho **sửa tay**, và hệ thống
**gợi ý** mã khi người dùng nhập xong tên hàng + chọn loại. Viết tắt loại **suy ra từ tên
loại** (chữ đầu mỗi từ, bỏ dấu) — không thêm trường riêng. Đổi tên loại thì mã của hàng hóa
trong loại đó cập nhật theo.

## Hiện trạng (đã xác minh trên prod)

| Điều | Thực tế |
|---|---|
| Mã hiện tại | **Không** phải `SP-001` như code giả định. 77 mã đã là dạng 2 đoạn có cấu trúc: `NLT-TMITL`, `BB01-CT`, `SPK-MIB7` |
| Hàm sinh mã tự động | `nextStaticCode(lastCode, 'SP')` → `SP-001`. Gần như chưa từng dùng thật |
| `maSanPham` | `String @unique` (`business_orders.prisma:78`) |
| Quan hệ | Tất cả qua FK `id`, **không** join bằng chuỗi mã → đổi mã không phá quan hệ |
| Bản sao mã | `OrderItem.maSanPham`, `QuotationRequestItem.maSanPham` là snapshot lúc tạo chứng từ (có `productId` riêng) |
| `loaiSanPham` | String tự do, **không** FK tới `ProductCategory` |
| Sửa mã ở UI | `ProductFormModal.tsx:45` `readOnly` ở **cả** create và edit |
| Test | Không có test nào cho `nextStaticCode` / `generateProductCode` |

### Dữ liệu prod đang lệch (77 hàng hóa)

- `loaiSanPham` có 5 giá trị, trong đó **Nguyên liệu / Nguyên vật liệu** và
  **Sản phẩm / Thành phẩm** chồng nghĩa
- Bảng `product_categories` chỉ 4 dòng và **không khớp** 5 giá trị kia: có *Nguyên liệu thô*
  không ai dùng, thiếu *Nguyên vật liệu* và *Sản phẩm*
- Cùng prefix nằm ở 2 loại khác nhau: `BB06` (Bao bì + CCDC), `SPD` (Nguyên liệu + Sản phẩm)
- 3 biến thể cùng nhóm: `NLD` / `NLD02` / `NLĐ`
- Tên trùng: "Cơm dừa đông lạnh cắt hạt lựu" có 2 mã (`NLD-DUAHL`, `SPD-DUACOMHL`), 2 loại khác nhau
- 1 mã sai dạng: `NLĐ-XOAIK1`

### Bug sẵn có phát hiện khi điều tra

`finishedProductService.ts:733-739` lọc `maSanPham: { startsWith: 'SP' }` — trên prod có 20 mã
khớp (`SPK-*`, `SPD-*`). `parseInt('K-MSV2')` → `NaN` → sinh mã **`SPNaN`**. Đã verify bằng node.
Chưa xảy ra (0 mã lỗi trong DB) nhưng sẽ nổ ngay lần tới có ai nhập thành phẩm với tên hàng
chưa tồn tại. Sửa trong change này.

## Quyết định đã chốt

1. **Danh mục loại**: 8 loại suy từ prefix cũ (chi tiết hơn 5 giá trị hiện có)
2. **Đổi tên loại → ghi lại mã** của hàng hóa thuộc loại đó, có xác nhận trước khi lưu
3. **Viết tắt bỏ dấu** (Đ→D, Ư→U) — mã chỉ A-Z và số
4. **77 mã cũ**: map tự động theo prefix, xuất bảng cho user soát rồi mới chạy

### Danh mục 8 loại

| Tên loại | Viết tắt | Prefix cũ gộp vào | Số mã |
|---|---|---|---|
| Nguyên liệu trái | NLT | `NLT` | 12 |
| Nguyên liệu đông lạnh | NLDL | `NLD`, `NLĐ`, `NLD02`, `SPD` | 8 |
| Phụ liệu | PL | `PL01`, `PL02`, `PL03` | 3 |
| Bao bì | BB | `BB01`, `BB02`, `BB03`, `BB06` | 12 |
| Công cụ dụng cụ | CCDC | `BB04`, `BB05` | 10 |
| Thành phẩm sấy | TPS | `SPK`, `MSLB`, `MSSS` | 27 |
| Thành phẩm đông lạnh | TPDL | `SKD` | 1 |
| Nhiên liệu | NL | `NL01` | 1 |

Không có viết tắt nào trùng nhau (đã kiểm sau khi bỏ dấu).

## Thiết kế

### Quy tắc mã

```
{VIETTAT_LOAI}-{STT:3}-{VIETTAT_TEN}
```

- `VIETTAT_LOAI`: chữ đầu mỗi từ của tên loại, bỏ dấu, in hoa
- `STT`: đếm **riêng trong từng loại**, 3 chữ số, lấy max hiện có + 1 (không tái dùng số đã xóa)
- `VIETTAT_TEN`: chữ đầu mỗi từ tên hàng, bỏ dấu, in hoa, tối đa 6 ký tự
- Chỉ **gợi ý** — người dùng sửa được toàn bộ. Ràng buộc duy nhất là `@unique`

### Backend

**Util mới** `backend/src/utils/productCode.ts`:
- `abbreviateVietnamese(text, maxLen?)` — bỏ dấu, lấy chữ đầu mỗi từ, in hoa
- `categoryAbbr(categoryName)` — viết tắt loại
- `suggestProductCode({ tenSanPham, loaiSanPham, existingCodes })` — dựng mã đầy đủ
- `rewritePrefix(oldCode, newAbbr)` — thay đoạn đầu, giữ STT + viết tắt tên

**`internationalProductService.ts`**:
- `generateProductCode()` → nhận `tenSanPham` + `loaiSanPham`, trả mã gợi ý theo format mới
  (không còn `nextStaticCode('SP')`)
- `createProduct()` → nhận `maSanPham` từ client; nếu trống thì tự gợi ý. Validate format + unique
- `updateProduct()` → cho sửa `maSanPham`, validate unique (loại trừ chính nó)
- `renameCategory()` → thêm bước ghi lại prefix mã của mọi sản phẩm trong loại, chạy trong
  `$transaction`. Trả về danh sách `{ maCu, maMoi }` để UI hiển thị
- `previewRenameCategory(oldName, newName)` → endpoint mới, trả preview không ghi DB
- `addCategory()` / `renameCategory()` → chặn nếu viết tắt trùng loại đã có

**Sửa bug**: `finishedProductService.ts:733-739` và `warehouseReceiptService.ts:238-243` — cả 2
đường auto-tạo hàng hóa dùng chung util mới, bỏ `startsWith: 'SP'`.

**Zod schema** cho create/update product (hiện chưa có): `maSanPham` optional, regex
`^[A-Z0-9]+-\d{3}-[A-Z0-9]+$`, `tenSanPham` required.

### Frontend

- `ProductFormModal.tsx`: bỏ `readOnly` ở `maSanPham`. Thêm nút "Gợi ý lại mã" + tự gợi ý khi
  `tenSanPham` và `loaiSanPham` đều có giá trị và người dùng **chưa** tự sửa mã (theo dõi bằng
  cờ `codeTouched` để không ghi đè mã người dùng gõ tay)
- `InternationalProductManagement.tsx`: gửi `maSanPham` trong cả create và update payload
- `CategorySettingsModal.tsx`: khi đổi tên loại → gọi preview, hiện hộp xác nhận
  "Sẽ cập nhật mã của N hàng hóa" kèm danh sách `maCu → maMoi`, xác nhận rồi mới lưu

### Migration dữ liệu (77 mã)

Script `backend/prisma/scripts/standardize-product-codes.ts` (chạy tay, không phải migration
tự động — vì cần user soát trước):

1. `--dry-run` (mặc định): xuất bảng `maCu | tenSanPham | loaiCu | loaiMoi | maMoi` ra CSV
2. User soát, sửa file mapping nếu cần
3. `--apply`: chạy trong transaction — upsert 8 `ProductCategory`, update `loaiSanPham` +
   `maSanPham` của 77 sản phẩm

Không đụng `OrderItem.maSanPham` / `QuotationRequestItem.maSanPham` — snapshot chứng từ giữ
mã tại thời điểm tạo, đúng về mặt lịch sử.

**Tên trùng** "Cơm dừa đông lạnh cắt hạt lựu" (`NLD-DUAHL` vs `SPD-DUACOMHL`): script báo cảnh
báo, **không** tự gộp — gộp 2 sản phẩm là quyết định nghiệp vụ (có thể đã có tồn kho/chứng từ
gắn vào từng cái).

## Thứ tự thực hiện

1. `backend/src/utils/productCode.ts` + unit test (bảng case tiếng Việt có dấu, Đ/Ư, tên 1 từ,
   tên dài, ký tự đặc biệt, collision viết tắt)
2. Sửa bug `SPNaN` ở `finishedProductService` + `warehouseReceiptService` + test
3. `internationalProductService`: generate / create / update / renameCategory + preview
4. Zod schema + controller + route mới (`POST /categories/:name/rename-preview`)
5. Backend test: `internationalProductService` (unique, rewrite prefix, collision loại)
6. Frontend: service types → `ProductFormModal` → `InternationalProductManagement` →
   `CategorySettingsModal`
7. Script migration + chạy `--dry-run`, **gửi bảng 77 dòng cho user soát**
8. Verify: `npx tsc --noEmit` (backend + frontend), `npm test`, `npm run lint`
9. Chỉ sau khi user duyệt bảng mapping → deploy theo playbook + chạy `--apply` trên prod

## Rủi ro

| Rủi ro | Xử lý |
|---|---|
| Đổi mã 77 sản phẩm trên prod | Backup 3 lớp theo playbook; chạy trong transaction; `--dry-run` trước |
| Mã đã in trên nhãn/chứng từ giấy | Nêu rõ cho user ở bước soát bảng — mã cũ không còn tra được trong hệ thống |
| Hai loại ra cùng viết tắt | Chặn ở `addCategory`/`renameCategory`, báo lỗi rõ tên loại đang xung đột |
| Đổi tên loại làm đổi mã hàng loạt ngoài ý muốn | Preview + xác nhận trước khi lưu |
| Tồn kho / lô gắn theo `productId` | Không ảnh hưởng — quan hệ qua FK id, không qua chuỗi mã |

## Ngoài phạm vi

- **Chuẩn hóa lại toàn bộ *tên* hàng hóa** (yêu cầu gốc có nhắc). 77 tên hiện không nhất quán
  ("Mít sấy vụn mịn ( 10 Kg)", "Mít sấy vụn nhỏ 12Kg( múc muỗng)"). Sửa tên cần user duyệt
  từng cái và ảnh hưởng tới việc tra cứu theo tên ở 2 đường auto-tạo hàng hóa
  (`findFirst` theo `tenSanPham`) → tách change riêng.
- Gộp 2 sản phẩm trùng tên.
- Thêm FK `loaiSanPham` → `ProductCategory` (hiện là string tự do; đổi thành FK là refactor
  riêng, rộng hơn).
