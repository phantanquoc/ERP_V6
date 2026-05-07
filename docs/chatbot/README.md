# Hệ thống Chatbot ERP An Binh Foods — Chỉ mục tài liệu

> **Mục đích:** Tài liệu này dùng để hỗ trợ chatbot RAG (Retrieval-Augmented Generation) trả lời câu hỏi của nhân viên An Binh Foods về cách sử dụng hệ thống ERP.

---

## Giới thiệu

ERP An Binh Foods là hệ thống quản lý doanh nghiệp nội bộ, truy cập qua trình duyệt web. Hệ thống bao gồm các module dành cho từng bộ phận, cùng các chức năng chung cho toàn thể nhân viên.

**Chatbot này sẽ:**
- Hướng dẫn từng bước thao tác trên ERP, bao gồm **từng ô nhập liệu, giá trị dropdown, trường bắt buộc**
- Giải thích quyền hạn theo vai trò (ADMIN / Trưởng phòng / Tổ trưởng / Nhân viên)
- Gợi ý liên hệ đúng người/phòng ban khi người dùng không có quyền thực hiện
- Trả lời các câu hỏi thường gặp của từng phòng ban

---

## Bạn thuộc phòng nào?

> Chatbot sẽ tìm tài liệu phù hợp nhất cho bạn dựa trên phòng ban. Hãy cho chatbot biết bạn đang làm việc ở phòng nào.

| Bộ phận | Sub-phòng | File tài liệu |
|---|---|---|
| 🏢 **Tất cả nhân viên** | Chức năng chung | [`00-chung.md`](./00-chung.md) |
| 🔍 **Bộ phận chất lượng** (DEPT_QUALITY) | Phòng CL nhân sự, Phòng CL quy trình | [`01-bo-phan-chat-luong.md`](./01-bo-phan-chat-luong.md) |
| 📊 **Bộ phận tổng hợp** (DEPT_GENERAL) | Phòng giá thành, Phòng chăm sóc | [`02-bo-phan-tong-hop.md`](./02-bo-phan-tong-hop.md) |
| 💼 **Bộ phận kinh doanh** (DEPT_BUSINESS) | Phòng KD Quốc Tế, Phòng KD Nội Địa | [`03-bo-phan-kinh-doanh.md`](./03-bo-phan-kinh-doanh.md) |
| 💰 **Bộ phận kế toán** (DEPT_ACCOUNTING) | Phòng KT Hành chính, Phòng KT thuế | [`04-bo-phan-ke-toan.md`](./04-bo-phan-ke-toan.md) |
| 🛒 **Bộ phận thu mua** (DEPT_PURCHASING) | Phòng thu mua NVL, Phòng mua Thiết bị | [`05-bo-phan-thu-mua.md`](./05-bo-phan-thu-mua.md) |
| 🏭 **Bộ phận sản xuất** (DEPT_PRODUCTION) | Phòng QLSX, Quản lý kho, Dữ liệu SX | [`06-bo-phan-san-xuat.md`](./06-bo-phan-san-xuat.md) |
| ⚙️ **Bộ phận kỹ thuật** (DEPT_TECHNICAL) | Phòng QLHTM, Phòng cơ-điện | [`07-bo-phan-ky-thuat.md`](./07-bo-phan-ky-thuat.md) |
| 🔐 **Quản trị hệ thống** (ADMIN) | — | [`08-admin-system.md`](./08-admin-system.md) |

---

## Cấu trúc hệ thống ERP (URL)

| Đường dẫn | Trang |
|---|---|
| `/dashboard` | Trang tổng quan cá nhân (EmployeeDashboard) |
| `/common` | Chức năng chung (yêu cầu, nhiệm vụ, kế hoạch, góp ý…) |
| `/quality/*` | Các trang bộ phận chất lượng |
| `/general/*` | Các trang bộ phận tổng hợp |
| `/business/*` | Các trang bộ phận kinh doanh |
| `/accounting/*` | Các trang bộ phận kế toán |
| `/purchasing/*` | Các trang bộ phận thu mua |
| `/production/*` | Các trang bộ phận sản xuất |
| `/technical/*` | Các trang bộ phận kỹ thuật |
| `/system-settings` | Cài đặt hệ thống (chỉ ADMIN) |

---

## Vai trò trong hệ thống

| Vai trò | Mã | Mô tả |
|---|---|---|
| Quản trị hệ thống | `ADMIN` | Toàn quyền trên tất cả chức năng |
| Trưởng phòng | `DEPARTMENT_HEAD` | Quản lý nhân viên trong bộ phận, phê duyệt |
| Tổ trưởng | `TEAM_LEAD` | Quản lý nhóm nhỏ, tạo nhiệm vụ/kế hoạch |
| Nhân viên | `EMPLOYEE` | Thực hiện công việc, xem thông tin cá nhân |

---

## Ghi chú quan trọng

- **Chức năng chung** (xem [`00-chung.md`](./00-chung.md)) áp dụng cho **mọi nhân viên** bất kể phòng ban.
- Mỗi nhân viên chỉ thấy dữ liệu của phòng ban mình (ABAC — kiểm soát truy cập theo thuộc tính).
- ADMIN có thể truy cập tất cả các bộ phận và chức năng.
- Một số chức năng đang trong giai đoạn phát triển (sẽ được ghi chú rõ trong từng file).

---

## Hướng dẫn sử dụng chatbot hiệu quả

**Ví dụ câu hỏi chatbot có thể trả lời:**
- *"Tôi muốn tạo yêu cầu báo giá, cần điền những gì?"*
- *"Hình thức thanh toán có những lựa chọn nào?"*
- *"Tôi là nhân viên, tại sao không thấy nút Tạo nhiệm vụ?"*
- *"Phiếu nhập kho gồm những trường nào bắt buộc?"*
- *"Ai có quyền phê duyệt kế hoạch tăng ca?"*

**Mẹo:** Cho chatbot biết bạn thuộc phòng ban nào và vai trò (Trưởng phòng / Tổ trưởng / Nhân viên) để nhận câu trả lời chính xác hơn.

---

*Tài liệu này được tạo từ mã nguồn ERP An Binh Foods và được cập nhật để phản ánh chính xác các trường form, dropdown options và luồng thao tác thực tế trên hệ thống.*
