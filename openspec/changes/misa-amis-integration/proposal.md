# Proposal: Tích hợp MISA AMIS Kế toán qua Open API

## Why

Kế toán hiện làm việc song song trên hai hệ thống: ERP nội bộ (kho, mua hàng, bán hàng,
lương) và MISA AMIS Kế toán. Số liệu phải nhập lại tay từ ERP sang AMIS — chậm, sai sót,
không đối chiếu được công nợ/tồn kho/thuế giữa hai bên.

MISA cung cấp Open API cho AMIS Kế toán Doanh nghiệp cho phép hệ thống ngoài đẩy
"Danh mục" (đối tượng, VTHH, kho, ĐVT...) và "Yêu cầu sinh chứng từ" (bán hàng, mua hàng,
thu/chi, kho...) sang AMIS. Tích hợp này loại bỏ nhập liệu trùng, giữ ERP là nơi phát sinh
nghiệp vụ và AMIS là sổ kế toán chính thức.

Nguồn chính: [Tài liệu Open API tích hợp AMIS Kế toán Doanh nghiệp](https://www.misa.vn/154745/tai-lieu-open-api-tich-hop-amis-ke-toan-doanh-nghiep/)
(ngày 20/11/2025), [HD kết nối ứng dụng qua API](https://helpact.misa.vn/kb/lap-chung-tu-hach-toan-tu-du-lieu-ket-noi-voi-cac-ung-dung-khac-qua-api/),
[ACTOpenAPIHelp](https://actdocs.misa.vn/g2/graph/ACTOpenAPIHelp/index.html).

## Ràng buộc quan trọng nhất (từ tài liệu MISA, đã kiểm chứng đối kháng)

1. **API không ghi sổ trực tiếp.** Mọi ghi chứng từ là **bất đồng bộ**: response success chỉ
   nghĩa là "yêu cầu đã vào hàng đợi". Chứng từ kế toán chỉ được tạo khi kế toán mở AMIS →
   *Tiện ích → Sinh chứng từ từ đề nghị lập CT kế toán* → *Lập CT kế toán* (tay/hàng loạt).
   Kết quả xử lý trả về qua **callback do đối tác tự xây** theo chuẩn MISA. Do đó trạng thái
   "đã đẩy" ≠ "đã ghi sổ" — ERP phải theo dõi vòng đời đầy đủ.
2. **Chính tả path endpoint chưa chắc chắn** (`/apir/sync/...` vs `/api/sync/...` lẫn lộn
   trong tài liệu gốc): không hardcode theo trang web, phải đối chiếu Postman collection
   của MISA trước khi code.
3. **Không có tài liệu** về rate limit, idempotency key, sandbox, giá, điều kiện gói AMIS —
   coi là "chưa ghi" chứ không phải "không tồn tại"; xác nhận với MISA ở Pha 0.

## What Changes

- Backend: service `misaSyncService.ts` mới (quản lý token, đẩy danh mục/chứng từ, nhận
  callback), bảng `MisaSyncRequest` theo dõi vòng đời đồng bộ, endpoint callback công khai.
- Đồng bộ master data hai chiều: Đối tượng (KH/NCC/nhân viên), VTHH, Kho, ĐVT, Cơ cấu tổ
  chức — ưu tiên mapping bằng **mã** thay vì Guid MISA.
- Đẩy chứng từ một chiều ERP → AMIS theo pha: mua hàng + kho trước, bán hàng sau, lương
  cuối cùng. Không có API đọc chứng từ đã lập được ghi nhận — đối chiếu công nợ/thuế qua
  callback và làm thủ công cho đến khi MISA xác nhận.
- Frontend: màn hình trạng thái đồng bộ kế toán + đối chiếu mã (không chặn luồng nghiệp vụ
  khi MISA lỗi — nghiệp vụ ERP vẫn chạy, sync request ở QUEUED và retry sau).
- Xem chi tiết kỹ thuật ở `design.md`, checklist ở `tasks.md`.
