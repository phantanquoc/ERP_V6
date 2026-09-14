# Tasks: Tích hợp MISA AMIS Kế toán qua Open API

## 0. Onboarding MISA (phụ thuộc MISA, 1–2 tuần)

- [ ] 0.1 Liên hệ NVKD MISA đăng ký sử dụng API, nhận `app_id`
- [ ] 0.2 Trong AMIS: bật "Cho phép đẩy dữ liệu từ phần mềm khác qua kết nối API", thiết
      lập dữ liệu kết nối (tab Danh mục + Chứng từ)
- [ ] 0.3 Lấy `access_code` (tài khoản quyền quản trị dữ liệu) + `branch_id` (`data_type` 6)
- [ ] 0.4 Import Postman collection MISA, test tay `connect → get_dictionary → save`;
      chốt path `/apir/` vs `/api/`; gửi 6 câu hỏi design.md §6 cho MISA

## 1. Backend — nền tảng sync

- [ ] 1.1 Schema `business`: model `MisaSyncRequest` (`orgRefid` unique, `voucherType`,
      `erpModel`/`erpId`, status forward-only, `errorCode`/`errorMessage`, timestamps)
      + migration + `npx prisma generate`
- [ ] 1.2 `misaSyncService.ts`: cache token 12h + refresh sớm, `getDictionary`增量
      (`skip/take/last_sync_time`), retry 1 lần khi lỗi token, typed errors + message TV
- [ ] 1.3 Callback endpoint công khai nhận kết quả MISA → `advanceStatus`
      (`SENT → ACKNOWLEDGED → POSTED/FAILED`); verify nguồn gọi theo chuẩn MISA (§6-câu 2)
- [ ] 1.4 Job retry QUEUED/SENT kẹt (backoff); MISA lỗi không fail nghiệp vụ chính
      (try/catch như quy ước notification)

## 2. Pha 1 — Master data

- [ ] 2.1 Đẩy Đối tượng (KH từ `InternationalCustomer`, NCC từ `Supplier`, NV từ
      `Employee`), VTHH (`Product`/`FinishedProduct`), Kho, ĐVT — mapping bằng mã
- [ ] 2.2 Kéo `get_dictionary` về đối chiếu; màn hình đối chiếu mã ERP ↔ AMIS
- [ ] 2.3 Verification: `tsc --noEmit`, `eslint`, `jest`; kế toán check mã khớp 2 bên

## 3. Pha 2 — Mua hàng + kho

- [ ] 3.1 `WarehouseReceipt` hoàn thành → `in_inward` + `pu_invoice` (`include_invoice`)
- [ ] 3.2 `PurchaseRequest`/`SupplyRequest` duyệt → đơn mua hàng (21)
- [ ] 3.3 `WarehouseIssue` → xuất kho (`in_outward`)
- [ ] 3.4 Kế toán nghiệm thu luồng *Sinh CT từ đề nghị* trên dữ liệu thật

## 4. Pha 3 — Bán hàng

- [ ] 4.1 `Order` → đơn đặt hàng (20) → hóa đơn bán (11, `reftype` 3560)
- [ ] 4.2 Xử lý `IsCreatedVoucher` (trùng `org_refid`) và điều chỉnh hóa đơn sai (§6-câu 5)

## 5. Pha 4 — Lương + vận hành

- [ ] 5.1 `Payroll` chốt tháng → `gl_voucher`
- [ ] 5.2 Dashboard trạng thái sync + alert kẹt SENT quá hạn; nghiệm thu end user
- [ ] 5.3 Verification cuối: `tsc --noEmit` (backend + frontend), `eslint`, `jest`,
      `pytest ai-service` (không đụng AI nhưng chạy đủ bộ); `gitnexus_detect_changes()`
