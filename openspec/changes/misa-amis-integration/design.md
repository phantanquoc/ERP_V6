# Design: Tích hợp MISA AMIS Kế toán qua Open API

## 1. Kết nối kỹ thuật (từ tài liệu MISA)

| Hạng mục | Giá trị |
|---|---|
| Base URL | `https://actapp.misa.vn` |
| Lấy token | `POST /api/oauth/actopen/connect` body `{app_id, access_code, org_company_code}` → `access_token` hiệu lực **12 giờ** (`expired_time` trong response). Không có refresh token — hết hạn thì gọi lại connect |
| Header xác thực | `X-MISA-AccessToken: {access_token}` |
| Đọc danh mục | `POST /apir/sync/actopen/get_dictionary` body `{data_type, skip, take, app_id, last_sync_time}` — phân trang `skip/take` (ví dụ `take: 1000`), đồng bộ增量 qua `last_sync_time` |
| Tạo danh mục | `POST /apir/sync/actopen/save_dictionary` — bất đồng bộ, kết quả qua callback |
| Tạo yêu cầu sinh CT | `POST /apir/sync/actopen/save` body `{app_id, org_company_code, voucher[]}` — bất đồng bộ, kết quả qua callback |
| Response chung | `{Success, ErrorCode, ErrorMessage, Data}` — kiểm tra `Success → ErrorCode → Data` |

> Cảnh báo: path `/apir/` vs `/api/` lẫn lộn trong tài liệu gốc — đối chiếu Postman
> collection MISA (link Google Drive trong tài liệu) trước khi hardcode.

### 1.1. Danh mục đọc được (`data_type`)

| data_type | Đối tượng | Model ERP tương ứng |
|---|---|---|
| 1 | Đối tượng — KH/NCC/nhân viên qua cờ `is_customer/is_vendor/is_employee` | `Supplier`, `InternationalCustomer`, `Employee` |
| 2 | Vật tư hàng hóa (`inventory_item_type`: 0 VTHH, 1 thành phẩm, 2 dịch vụ, 3 NVL) | `Product`, `FinishedProduct`, `Lot` |
| 3 | Kho | `warehouses` |
| 4 | Đơn vị tính | ĐVT dùng trong `Product`/phiếu kho |
| 5 | Hệ thống tài khoản | — (tham chiếu TK Nợ/Có) |
| 6 | Cơ cấu tổ chức / chi nhánh (`branch_id` — gần như mọi chứng từ bắt buộc) | Cache `branch_id` duy nhất |
| 8 | Tài khoản ngân hàng | — |
| 14 | Nhóm VTHH | `ProductCategory` |

### 1.2. Chứng từ đẩy được (`voucher_type` đã đọc trực tiếp từ tài liệu)

- Bán hàng: chứng từ bán hàng `sa_voucher` (13), đơn đặt hàng `sa_order` (20), giảm giá
  bán `sa_discount` (10), hóa đơn bán `sa_invoice` (11, `reftype` 3560 nội địa...), trả lại
  hàng bán `sa_return` (12).
- Mua hàng: mua hàng nhập kho (`in_inward` + khối `pu_invoice`, `include_invoice` 0/1/2),
  mua dịch vụ `pu_service` (17, `reftype` 330–334), đơn mua hàng `pu_invoice` (21), giảm
  giá/trả lại hàng mua.
- Khác: chứng từ khác `gl_voucher`; thu/chi tiền mặt (`ca_receipt`/`ca_payment`) và tiền
  gửi (`ba_deposit`/`ba_withdraw`); nhập/xuất/chuyển/kiểm kê kho.
- Thuế suất chuẩn: `0/5/8/10`, `-1` KCT, `-2` KKKNT, `-3` khác (kèm `other_vat_rate`).
  Tiền song song `*_oc` (nguyên tệ) / quy đổi; `exchange_rate_operator` `*`/`/`.
- Mỗi voucher mang `org_refid` (ERP tự định nghĩa — dùng CUID chứng từ gốc = idempotency
  key), `org_refno`, `org_reftype`. Lỗi `IsCreatedVoucher` = trùng (đã lập CT, muốn sửa
  phải xóa CT đã sinh).

### 1.3. Lỗi thường gặp (mọi endpoint lặp lại một bộ)

`InvalidAppID`, `InvalidToken`/`ExpiredToken`/`InvalidAccessToken` (→ gọi lại connect,
retry 1 lần), `InvalidParam`, `DBAmisNotConnectDBACT` (chưa thiết lập kết nối trong AMIS),
`AppIDDisconnect` (bị ngắt — liên hệ MISA), `IsCreatedVoucher`, `VoucherNotFound`.

## 2. Mapping ERP → MISA

| Nghiệp vụ ERP | Hướng | Chứng từ MISA |
|---|---|---|
| `WarehouseReceipt` + items (nhập kho mua hàng) | ERP → MISA | Mua hàng nhập kho (`in_inward` + `pu_invoice`) |
| `PurchaseRequest` / `SupplyRequest` đã duyệt | ERP → MISA | Đơn mua hàng (21) |
| `Order` + `OrderItem` | ERP → MISA | Đơn đặt hàng (20) → Hóa đơn bán (11) |
| `WarehouseIssue` (xuất kho; `reftype` 2020 khi bán hàng) | ERP → MISA | Xuất kho (`in_outward`) |
| `Payroll` / `TimesheetCell` (lương tháng) | ERP → MISA | Chứng từ khác (`gl_voucher`) |
| `Supplier` ↔ NCC, `InternationalCustomer` ↔ KH, `Employee` ↔ nhân viên | 2 chiều | Đối tượng (1) |
| VTHH / Kho / ĐVT / Nhóm VTHH | ERP → MISA lần đầu, sau đó `get_dictionary` về | `save_dictionary` / `get_dictionary` |
| `Debt`, `Invoice`, `TaxReport` | Đối chiếu (callback + thủ công) | Không đẩy |

## 3. Thiết kế backend (tuân thủ AGENTS.md)

### 3.1. Bảng `MisaSyncRequest` (schema `business`)

`id` (cuid), `orgRefid` (unique — CUID chứng từ gốc), `voucherType` (int),
`erpModel` + `erpId` (trỏ về bảng gốc, **không lưu JSON blob** — chi tiết dòng đọc lại từ
bảng gốc qua `erpId`), `status` forward-only qua `advanceStatus`:
`QUEUED → SENT → ACKNOWLEDGED → POSTED`, nhánh `FAILED` từ bất kỳ trạng thái nào.
`errorCode`, `errorMessage` (tiếng Việt), timestamps. `@@schema("business")`.

### 3.2. `misaSyncService.ts`

- Quản lý token: cache `access_token` + `expired_time`, refresh sớm trước 12h; gặp lỗi
  token → gọi lại connect + retry đúng 1 lần.
- `pushVoucher()`: gọi trong cùng `prisma.$transaction` với nghiệp vụ gốc (tạo parent
  `MisaSyncRequest` status QUEUED rồi mới gọi MISA chuyển SENT — MISA lỗi không fail
  nghiệp vụ chính, đúng quy ước "notifications không bubble lỗi" mở rộng cho sync).
- Mapping **ưu tiên code**: gửi `account_object_code`, `inventory_item_code`,
  `stock_code`, `unit_name`, `employee_code` — MISA tự map; không lưu Guid MISA trừ
  `branch_id`.
- Callback endpoint công khai: nhận kết quả bất đồng bộ → `advanceStatus`
  `SENT → ACKNOWLEDGED → POSTED/FAILED`. Chỉ server-side, không `PATCH /status` chung.
- Lỗi nghiệp vụ (`InvalidParam`, `VoucherNotFound`, `IsCreatedVoucher`) → FAILED + message
  tiếng Việt qua typed errors (`ValidationError`, `ConflictError`...), không `res.status`
  trực tiếp.

### 3.3. Fallback khi MISA down

Nghiệp vụ ERP chạy bình thường; sync request nằm QUEUED, job quét retry định kỳ (backoff).
UI hiển thị trạng thái đồng bộ kế toán riêng — không chặn luồng kho/bán hàng/lương.

## 4. Frontend

- Hook `useMisaSync()` (TanStack Query, key factory `{all, lists, detail}`) + màn hình trạng
  thái đồng bộ (lọc theo trạng thái/model, nút retry cho FAILED, hiển thị `errorMessage`).
- Màn hình đối chiếu mã master data (mã ERP ↔ mã AMIS) cho Đối tượng/VTHH/Kho/ĐVT.
- Form validation `react-hook-form + zod`; message tiếng Việt; ngày `DD/MM/YYYY`.

## 5. Lộ trình

- **Pha 0 — Onboarding (1–2 tuần, phụ thuộc MISA):** liên hệ NVKD lấy `app_id`, bật "Cho
  phép đẩy dữ liệu từ phần mềm khác qua API" trong AMIS, lấy `access_code` (tài khoản quyền
  quản trị dữ liệu) + `branch_id`, import Postman test tay `connect → get_dictionary → save`,
  chốt path `/apir/` vs `/api/`.
- **Pha 1 — Master data (1–2 tuần):** token mgmt + callback endpoint + `MisaSyncRequest`;
  đồng bộ Đối tượng/VTHH/Kho/ĐVT; màn hình đối chiếu mã.
- **Pha 2 — Mua hàng + kho (2–3 tuần):** `WarehouseReceipt` → mua hàng nhập kho,
  `PurchaseRequest` → đơn mua (21), `WarehouseIssue` → xuất kho; kế toán nghiệm thu tay
  luồng *Sinh CT từ đề nghị*.
- **Pha 3 — Bán hàng (2 tuần):** `Order` → đơn đặt hàng (20) → hóa đơn bán (11).
- **Pha 4 — Lương + vận hành (1–2 tuần):** `Payroll` → `gl_voucher`; dashboard + alert khi
  kẹt SENT quá hạn; nghiệm thu với end user ("Confirm dữ liệu với end user và nghiệm thu").

## 6. Câu hỏi xác nhận với MISA (trước Pha 1)

1. Chi phí/quyền dùng Open API theo gói AMIS hiện tại? Có sandbox/test không?
2. Chuẩn callback chi tiết (payload, xác thực chiều MISA → ERP, retry policy)?
3. Rate limit/quota của `/save` và `get_dictionary`? Giới hạn voucher/batch?
4. Có API **đọc** chứng từ đã lập (đối chiếu `Debt`/`TaxReport`) hay chỉ ghi + callback?
5. Luồng sửa/xóa "Yêu cầu sinh CT" sau `IsCreatedVoucher` — điều chỉnh hóa đơn sai thế nào?
6. 5 Guid `purchase_purpose_id` khấu trừ VAT trong tài liệu có ổn định mọi tenant không?
