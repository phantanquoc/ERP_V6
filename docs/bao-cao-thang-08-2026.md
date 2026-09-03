# Báo cáo tổng kết phát triển hệ thống ERP An Bình Foods — Tháng 8/2026


## 1. Kho và phiếu kho — thay đổi lớn nhất tháng

**Vấn đề trước đây:** Phiếu nhập/xuất chỉ cho một mặt hàng trên một phiếu; phiếu nhiều mặt hàng phải tách thành nhiều phiếu rời, gây lệch tồn khi hai dòng cùng trừ một kiện. Bản đồ kho là danh sách chữ, không khớp sơ đồ pallet thực tế; nhân viên kho phải đối chiếu thủ công với bản vẽ PDF.

**Đã làm trong tháng 8 (37 commit):**

- **Phiếu kho đa dòng (header + items):** Mỗi phiếu nhập/xuất nay chứa nhiều dòng hàng, mỗi dòng có kho, lô, kiện, số lượng và snapshot tồn riêng. Header chỉ giữ tổng dẫn xuất. Toàn bộ validate tồn chạy trước khi ghi; update dùng diff để hoàn/trừ tồn theo chênh lệch, không xóa rồi tạo lại mù quáng. Migration nới 10 cột header thành nullable để phiếu cũ vẫn đọc được, kèm normalizer `warehouseSlipLines` cho cả bảng, chi tiết và bản in.
- **Kiện cố định theo ô CAD:** Mỗi ô trên bản vẽ CAD nay là một kiện cố định (`maKien = K1.1`, `slotId`, `soLuong = 0`). Khi nhập hàng, hệ thống tái dùng kiện trống thay vì tạo kiện lẻ; khi xuất, trừ theo FIFO theo mã kiện. Thêm bảng `WarehouseSlot` (233 slot cho 6 kho KHOTP/KHOTD1/KHOTD2/HD1/HD2/KHOPL) và đồng bộ idempotent qua `syncWarehouseLayout`.
- **Chuẩn hóa theo biểu mẫu BM01/BM03:** Bổ sung các trường `soLoKeHoach/ThucTe`, `soKienKeHoach/ThucTe` (JSON), `tinhTrang`, `quyCach`, `nguoiDeNghi`, `boPhan`, `daIn` cho cả phiếu nhập và xuất; xuất Excel 14 cột đúng biểu mẫu, có header công ty, logo, footer và chữ ký.
- **Bản đồ kho và sơ đồ tổng thể:** Bản đồ kho tô heatmap theo mức lấp đầy (Trống / Có hàng / Đầy), hỗ trợ zoom/pan/scroll-wheel/pinch, legend và thống kê theo zone. Sơ đồ tổng thể nhà máy render trực tiếp file PDF gốc qua pdfjs (canvas) với 6 vùng kho clickable; có tool hiệu chỉnh vị trí kho (`/dev/layout-tool` và `public/factory/calibrate.html`) để xuất JSON cập nhật tọa độ.
- **Sửa lỗi tồn đọng:** Sửa lỗi `maKien` thiếu cột (P2022), sửa tường/cửa render sai symbol CAD, sửa line-weight theo chuẩn ISO 128, sửa lỗi build do `COMPANY_HEADER.fax` thiếu, sửa lỗi zoom bị iframe chặn sự kiện.

**Giá trị mang lại:** Giảm thao tác tách phiếu thủ công; tồn kho không còn lệch khi nhiều dòng cùng kiện; bản đồ kho lần đầu khớp 1:1 với thực tế pallet, giúp thủ kho định vị hàng trong vài giây thay vì dò danh sách.

---

## 2. Yêu cầu cung cấp và chuỗi bổ sung — mua hàng

**Vấn đề trước đây:** Yêu cầu cung cấp lọc và tìm kiếm ở client trên một trang 10 dòng nên miss dữ liệu; tạo phiếu xuất từ yêu cầu luôn lấy đủ số lượng dù đã cấp một phần; hàng thiếu không tự chuyển sang yêu cầu mua hàng.

**Đã làm (9 commit supply-request + 6 commit rework-supply/stock/warehouse):**

- **Server-side search/filter/pagination + export đồng bộ:** Toàn bộ lọc (`maYeuCau`, `tenNhanVien`, `boPhan`, `trangThai`, `mucDoUuTien`) chuyển lên server; export dùng cùng filter; đổi trang tự reset về 1 khi đổi lọc.
- **Cấp một phần (Partial Fulfillment):** Modal cấp một phần chỉ hiện kho/lô/kiện có mặt hàng đó (so khớp không dấu hai chiều), kiện hết hàng disable và đẩy xuống cuối, cảnh báo "Hết hàng toàn kho" khi toàn hệ thống không còn tồn. Guard chặn vượt tồn theo kiện và chặn submit khi vượt.
- **Tạo phiếu xuất lọc theo tồn:** `LotProductCombobox` hiện badge "Hết hàng" và sắp kiện hết hàng xuống cuối; FIFO ẩn khi tạo từ yêu cầu; prefill theo `remaining` thay vì full số lượng.
- **Chuỗi bổ sung khép kín:** Thêm trạng thái `Chờ bổ sung` (tím) vào `STATUS_SEQUENCE`; khi cấp thiếu, hệ thống gộp shortage theo bucket `phanLoai` (NVL/Thiết bị/khác), tạo một phiếu yêu cầu mua hàng (PurchaseRequest) cho mỗi bucket trong cùng một transaction với cập nhật `fulfilledQty`/`fulfillmentStatus`. Thêm `triggeredPurchaseRequestId`, index và guard vòng đời PR (`ALLOWED_TRANSITIONS`, `updateMany` chống TOCTOU).
- **Kiểm tra tồn server-side:** Endpoint `POST /lot-products/stock-check` gom nhóm theo `tenGoi` (fuzzy không dấu hai chiều), chỉ trả về grouped result thay vì fetch toàn bộ lotProducts về client.
- **Tách biệt kế hoạch/thực tế trên phiếu:** Trường `soLuongYeuCau` (KH) và `soLuong` (TT) tách riêng; multi-kiện chia đều KH như TT; miss một kiện thì throw thay vì double-count.

**Giá trị mang lại:** Nhân viên kho xử lý yêu cầu nhanh hơn vì chỉ thấy kiện có hàng; số thiếu tự động chuyển thành yêu cầu mua hàng đúng nhóm, không còn sót nhu cầu; tồn kho trừ trong cùng transaction nên không có trạng thái "cấp đủ trên giấy nhưng kho chưa trừ".

---

## 3. Phân quyền theo phòng ban và chức vụ (Rule Matrix)

**Vấn đề trước đây:** Phân quyền hard-code rải rác trong 46 file route dưới dạng `authorize(UserRole.ADMIN, ...)` và `checkAccess({ allowedRoles, checkDepartment })`; thêm/sửa quyền phải đụng code và deploy.

**Đã làm (8 commit rbac + 1 refactor lớn + các fix bổ sung):**

- **Mô hình mới:** Thêm các bảng `Resource` (78 resource), `Rule`/`RuleScope`/`RuleAuditLog`/`Delegation` (schema `auth`), `Position.defaultRole`, `UserSecondaryDepartment.positionId`; seed 54 vị trí (position) cho 8 phòng ban. Migration `20260821000001_add_rbac_rule_matrix`.
- **Middleware `requireRule(resource, action)`:** Thay thế toàn bộ 279 chỗ dùng `authorize`/`checkAccess` bằng `requireRule` DB-driven với thứ tự ưu tiên: delegation → Rule explicit (position thắng role, scope hẹp thắng scope rộng) → owner-scope → baseline (CREATE/READ/UPDATE cho mọi nhân viên, APPROVE chỉ TEAM_LEAD trở lên, DELETE chỉ DEPARTMENT_HEAD/ADMIN).
- **Scope và delegation được enforce chặt:** `GLOBAL` khớp mọi phòng, `DEPT`/`SUB_DEPT` phải khớp membership; `validateScopeFields` chặn id thừa; `RESOURCE_TO_MODEL` load `createdById` để owner được bypass khi baseline deny.
- **Frontend đồng bộ:** Helper `can(resource, action)` và `canIfConfigured` thay `DEPARTMENT_PERMISSIONS` hard-code; `AuthContext` fetch `my-permissions` sau login và sau sự kiện `USER_PROFILE_UPDATED`; `Sidebar` và `ProtectedModuleRoute` đọc `canIfConfigured(resource, 'READ')` khi có Rule explicit, fallback về logic cũ để không chặn user chưa có cache. Trang `/admin/rules` (RuleManagement) cho phép admin quản trị ma trận.
- **Self-service cho nhân viên chưa gán phòng ban (no-dept):** Nhân viên không thuộc phòng ban nào vẫn xem được Dashboard và tab Chung (đề xuất chung, sửa chữa, công việc, phản hồi, quy trình), xem/chấm công của chính mình; overtime vẫn 403 cho no-dept để tránh nhầm lẫn. Kèm bộ test `noDeptSelfService` (16 case).
- **Hoàn thiện còn thiếu:** Bổ sung index cho `Rule`/`User`/`Audit`, rate-limit cho kiosk/verify, sửa các route group thiếu guard, sửa wrong actions, chuẩn hóa `Position.defaultRole` và seed dry-run.

**Giá trị mang lại:** Thêm/sửa quyền không còn đụng code; audit log ghi lại ai đổi quyền khi nào; nhân viên chưa gán phòng ban không còn bị chặn khỏi các tác vụ chung cần thiết cho vận hành hàng ngày.

---

## 4. Giá thành và Phòng Giá (Pricing Room)

**Đã làm (6 commit pricing + 2 commit gia-thanh/supply-warehouse):**

- **Two-tier pricing:** Thêm `giaThanh` (VND/đơn vị) lên `InternationalProduct` (giá chuẩn cho kiện tồn) và `LotProduct` (giá của kiện cụ thể). Khi tạo kiện mới (`addProduct`, `receiveSplit`), giá kế thừa từ `InternationalProduct` thay vì hard-code 100.000. `inventoryService` tính `giaThanhTB` (bình quân gia quyền) và `giaTriTon` theo sản phẩm và theo kho. Migration `20260826000001` an toàn, idempotent; backfill 281 dòng từng ở 100.000 về 0 để kiện chưa định giá không mang số ảo.
- **Dashboard tổng quan giá (5-card, 2 hàng):** Endpoint `GET /api/pricing/overview` trả về read model gộp (requests/quotations/orders/costs/approvals/warnings) có windowing theo tháng/năm; frontend thay 3 card phẳng bằng 5 card: YCBG funnel (4 pills), Báo giá (5 nhóm + priceLocked), Đơn hàng (VND + prod/pay), Chi phí (general/export + avg + top 2 loại), Chờ duyệt & Cảnh báo (OT/MH + aging Y/R). Có bản compact giảm ~40% chiều cao.
- **Review tabs trong Phòng Giá:** Hai tab duyệt overtime và purchase nằm trong `GeneralPricing`, guard bằng `isPricingApprover` (ADMIN hoặc bất kỳ thành viên GENERAL/pricing). Backend nới `approvePlan` khỏi ADMIN-only, thêm `nguoiDuyetId`/`ngayDuyet`/`lyDoTuChoi` cho `OvertimePlan`; `PurchaseRequest` dùng `assertCanApprovePurchase`.

**Giá trị mang lại:** Lần đầu hệ thống có giá trị tồn kho theo tiền (không chỉ số lượng); Phòng Giá có một nơi duy nhất để duyệt OT và yêu cầu mua hàng mà không cần quyền ADMIN toàn hệ thống.

---

## 5. Giao diện và trải nghiệm người dùng

**Đã làm (19 commit ui + 6 commit dashboard + các polish liên quan):**

- **Design system mới:** Thêm `frontend/src/design-system/` gồm `tokens`, `PageHeader`, `KpiCard`, `ChartCard`, `SectionCard`, `States`, `Progress`, `Button` (primary/secondary/ghost/danger, sm/md/lg, loading), `DataTable` (sort/pagination/empty/aria-sort). Chuẩn hóa `border-2→border`, `rounded-xl→rounded-lg`, `shadow-lg→shadow-sm`, `text-3xl→text-2xl`; thay `window.location.href` bằng `useNavigate`.
- **7/7 dashboard phòng ban hoàn thiện:** `BusinessManagement`, `PurchasingManagement`, `ProductionManagement` từ stub thành dashboard đầy đủ (4 KPI + 2 pie + 2 line, dùng `PageHeader`/`KpiCard`/`ChartCard`); `AccountingManagement` thành 6 KPI + 2 donut; `Quality` và `Technical` chuẩn hóa card shell và chart height.
- **Dashboard cá nhân:** Hero LineChart theo kỳ, `QuickStatCard` đồng đều chiều cao, KPI delta so với kỳ trước cho purchase requests và tasks, dọn duplicate hiển thị đánh giá (gộp stat card và alerts lane thành một card với CTA "Làm ngay").
- **Thông báo (notification):** Bell dropdown mới (badge 99+, bottom-sheet trên mobile, mark-read từng item, skeleton/empty, sound/vibration/app-badge, search, digest grouping, deep-link thống nhất), trang `MyNotifications` (filter pills, bulk actions), `AllNotificationsModal` (cursor pagination, infinite scroll, a11y), backend exponential WS reconnect và log lỗi push.
- **Polish thương mại P0/P1:** Viết lại `BusinessReport`, thống nhất `KpiCard`, sửa bug `hover:${...}` và `scale/shadow-2xl`, chuẩn hóa header các trang con về `PageHeader`, codemod `StatusBadge` thay map `className` rời rạc bằng `STATUS_TONE` + `StatusBadge` (áp dụng cho Attendance, Debt, Order, Quotation).
- **Bảng lương và lịch chấm công trên mobile:** Thêm `TimesheetMobileList` (card theo nhân viên, lưới 7 cột theo tuần, ô >=44px) và card nhân viên cho `AttendanceManagement` (swipe đổi tháng, sticky header), giữ nguyên modal chi tiết nên không nhân bản logic.
- **Sửa lỗi UI chặn người dùng:** Sửa `Modal` không focus được control đầu do Portal mount lệch effect, sửa `ChatWidget` tràn viewport thấp, sửa `EmployeeSelfEvaluationModal` tràn ở 375px, sửa `DatePicker`/`DateTimePicker` kẹp chiều cao theo viewport và clamp cạnh trái, sửa dropdown đo chiều cao thật thay vì hằng số ước lượng.

**Giá trị mang lại:** Giao diện các phòng ban lần đầu đồng nhất về ngôn ngữ thị giác; dashboard có số liệu điều hành thay vì trang stub; mobile không còn là cuộn ngang vô vọng ở hai bảng rộng nhất hệ thống.

---

## 6. Chấm công — Bảng lương

**Đã làm (8 commit timesheet + 5 commit payroll + 4 commit attendance):**

- **Sửa 3 lỗi nghiêm trọng của tab Chấm công tháng:** (1) Mất giờ OT khi sửa mã — backend chỉ update field có trong payload (`?? undefined` thay vì `?? 0`); (2) Band OT 210%/270% luôn bằng 0 — thêm logic split (2h đầu vs >2h) và sau đó tinh gọn lại theo đúng công thức Excel; (3) Không xóa được mã — cho phép `code=''` → `deleteMany`, seed lại thành empty cell.
- **Import/Export Excel + thao tác nhanh:** `POST /api/timesheet/import` parse cột J–AN, validate mã, batch upsert; frontend có nút Import Excel, file input, progress toast; round-trip Export → sửa → Import đã verify. Thêm điều hướng bàn phím (Arrow, Shift+Arrow chọn vùng), paste TSV (Ctrl/Cmd+V), fill-down (Ctrl/Cmd+D), với visual focused ring và selected range.
- **Audit trail:** Thêm `updatedBy`/`updatedByName`/`updatedAt` cho `TimesheetCell` (migration `20260811163340`), controller gán `req.user.id`/`name`, frontend hiện tooltip người sửa và thời gian sửa.
- **Tiền lương theo lương từng người:** Thêm `computeHourlyRate`/`computeOvertimePay` suy lương giờ từ lương tháng theo mẫu số 26 ngày × 8 giờ (cấu hình được), nhân hệ số `otRate*` theo loại ngày (weekday 150%, Sunday 200%, holiday 300%). Giữ `overtimeRate` làm fallback cho nhân viên chưa nhập lương cơ bản.
- **Giờ tăng ca thực tế từ chấm công:** Thêm `overtimeActualHoursService` suy giờ OT thực tế từ cặp giờ vào/ra so với ca làm (trước/sau/trùng ca), làm tròn 0.5h, cap theo giờ kế hoạch, xử lý riêng ca đêm 22:00–06:00; 4 điều kiện từ chối kèm flag (`INCOMPLETE_PUNCH_PAIR`, `OUTSIDE_TOLERANCE`, `NO_SHIFT`, `OVERLAPPING`) chia hai mức REFUSAL/ADVISORY. Thêm setting `useActualOvertimeHours` (mặc định tắt) và `standardHoursPerDay`.
- **Hiển thị song song KH/TT:** Dòng tăng ca hiện cả hai số (KH/TT) kèm nhãn "Cần xem lại" khi không suy được giờ thực tế; bảng lương thêm hai cột giờ TC kế hoạch/thực tế và toggle chọn nguồn tính lương.
- **Chặn trùng dòng chấm công:** Đổi `@@index` thành `@@unique` trên `(employeeId, attendanceDate, isOvertime)`; đã dọn 2 cặp trùng rác trong DB dev trước khi áp constraint.
- **Hỗ trợ đa phòng ban cho mọi endpoint:** `checkAccess` populate `userDepartmentIds` (primary + secondary); các service `purchaseRequest`, `dailyWorkReport`, `employeeEvaluation`, `payroll`, `evaluationAudit` đều chuyển sang `{ in: [...] }` hoặc `includes()`.

**Giá trị mang lại:** Bảng lương tháng lần đầu khớp công thức Excel kế toán đang dùng; OT không còn tính phẳng một giá cho cả công ty; giờ OT thực tế có thể đối chiếu với giờ kế hoạch trước khi đổi nguồn tính lương, giảm rủi ro sai lệch khi áp dụng.

---

## 7. Kiosk và vận hành xưởng

**Đã làm (4 commit kiosk + các fix liên quan):**

- **Lọc nguyên liệu theo tồn kho:** `getRawMaterials()` trả thêm `tongTonKho` (một `groupBy`, không N+1); picker mặc định chỉ hiện mục có tồn, kèm số tồn và toggle [Có hàng]/[Tất cả]; không chặn cứng ở backend để vẫn nhập được khi hàng đã về nhưng kho chưa kịp làm phiếu nhập. DB dev: 9 nguyên liệu, chỉ 2 có tồn Kg >0 nên 7/9 lựa chọn trước đây dẫn tới dead-end.
- **Mã hàng hóa thành định danh chính:** Thêm `maSanPham` (nullable + index) vào `MaterialEvaluation` và `FinishedProduct`; backfill từ `lotProductId`; UI kiosk chỉ hiện mã (bỏ tên) ở nút trigger, list, nhãn lô và màn xem lại; giữ tên trong filter tìm kiếm và payload (`tenHangHoa` NOT NULL) để không mất dữ liệu.
- **Ghi ca vào cột riêng:** Thêm `Attendance.shift Int?` + index `(attendanceDate, shift)`; `attendanceService.checkIn` ghi cột này cùng lúc với `notes`; backfill 775 dòng từ `notes` (373 Ca 1 / 258 Ca 2 / 144 Ca 3) bằng regex phân biệt hoa/thường để loại 77 dòng "ca 3" viết thường trong câu văn kế hoạch.
- **Nối danh sách nhập liệu với ca điểm danh:** Sửa guard `if (mappings.length === 0) return []` trong `getAttendedOperators` khiến màn hình chọn người thực hiện luôn rỗng; nay fallback về vị trí sản xuất khi chưa cấu hình mapping (5–15 người/ca).

**Giá trị mang lại:** Worker trên tablet không còn đi thêm một bước chỉ để nhận "không có lô tồn kho"; mã hàng hóa ngắn gọn khớp thói quen gọi hàng ngày trong xưởng; ca làm được lưu thành cột truy vấn được thay vì parse chuỗi ghi chú.

---

## 8. Hạ tầng, bảo mật và ổn định

**Đã làm:**

- **Redis:** Thêm `requirepass` cho cả dev và prod (`REDIS_URL` mang password, thiếu thì compose báo lỗi ngay), bỏ map 6379 ra host ở dev, tắt RDB (`--save ""`, `appendonly no`) vì Redis chỉ làm cache, đổi `KEYS` (block server đơn luồng) sang `SCAN` có cursor, xóa `CACHE_KEYS.POSITIONS` không dùng.
- **Cache danh mục:** Cache biến thể `active-only` của lookup (thứ mọi dropdown gọi) với TTL 1h; chỉ cache group hợp lệ để chặn flood key rỗng; `invalidateGroup` chạy sau khi transaction commit (rollback thì cache giữ nguyên). Đo trên dev: lần 1 ~45ms, lần 2–3 ~4–5ms.
- **Rate limit:** Sửa `keyGenerator` đọc thẳng `x-forwarded-for` (client tự đặt được, qua `X-Forwarded-For` có thể đổi header để bypass mọi giới hạn, kể cả `authLimiter` 30 lần/15 phút). Đổi sang ưu tiên `X-Real-IP` (nginx set từ `$remote_addr`), rồi `req.ip`, cuối cùng mới lấy phần tử cuối của `x-forwarded-for`; bật `trust proxy = 1` để `req.ip` không còn là IP container nginx. Nâng `kioskLimiter` lên 120 req/phút prod (600 dev) cho 40 người/ca × 3 req.
- **Prisma baseline:** Gộp 72 migration cũ thành một baseline `20260101000000_baseline` (sinh từ `prisma migrate diff --from-empty`) để `prisma migrate dev` dùng được trở lại (shadow DB trước đó fail ở migration `20260605` thiếu cột `thuTu` và 10 bảng chưa từng có `CREATE TABLE`). Dọn 12 lệch schema-vs-DB tồn đọng.
- **Docker:** Sửa dev container chạy `migrate deploy` trong khi DB dev không có `_prisma_migrations` gây restart loop (P3005); dev image chỉ cần `prisma generate` trước `dev`.
- **Ổn định khác:** Sửa khe hở 1 phút giữa các khung chấm công (06:29 và 07:39 không thuộc ca nào do `end` nửa mở `[start, end)` cấu hình không nhất quán), sửa favicon/logo sidebar, sửa `maxSequenceGlobal` cho mã hàng hóa, sửa `warehouseIssue` dùng `employeeId` thay vì `user.id`.

---

## 9. Tài liệu và truyền thông

- **10 hướng dẫn phòng ban (01→10) được viết lại evidence-first:** Mỗi guide nay ghi rõ route/guard/code path, bảng phân quyền, cấu trúc tab, nguồn dữ liệu (service/query) và hành vi thực tế thay vì mô tả chung chung; tổng +3.050/−892 dòng, đồng bộ với audit evidence-first 21/08.
- **Bộ triển lãm:** Thêm `presentation-2026-08-21.md` (18 slides + lời dẫn 25 phút), `catalog-content-2026-08-21.md` (16 trang copy-paste ready cho designer) và `build-presentation-pptx.py` (dựng PPTX 16:9 kiosk loop, 881 dòng) kèm file PPTX đã build (357KB).

---

## 10. Tồn đọng và kế hoạch tháng 9

### Tồn đọng đã biết (không chặn vận hành)

| # | Nội dung | Trạng thái | Ghi chú |
|---|---|---|---|
| 1 | E2E cho chuỗi bổ sung — mua hàng (task 7.3 trong `rework-supply-replenish-purchase-flow`) | Skipped | Đã archive spec với 23/24 task hoàn thành; cần bổ sung E2E trước khi coi là done hoàn toàn |
| 2 | Skill Matrix cho công nhân sản xuất (BS4) | Defer từ 08/07 | Follow-up bắt buộc sau `enhance-employee-evaluation`; chưa có commit trong tháng 8 |
| 3 | 4 khoảng trống kiểm thử lookup (cascade nhiều bảng, rollback, `tax_reports.donVi`, mobile card layout) | Ghi nhận từ 03/08 | Đã nêu trong `docs(openspec): spec + archive cho shared-lookup-table`; chưa lấp trong tháng 8 |

### Kiến nghị ưu tiên tháng 9

1. **Lấp E2E còn thiếu cho chuỗi cung cấp — bổ sung — mua hàng** trước khi mở rộng thêm nghiệp vụ kho.
2. **Triển khai Skill Matrix (BS4)** cho công nhân sản xuất — đây là follow-up đã defer hai tháng, liên quan trực tiếp tới đánh giá nhân viên.
3. **Chạy `npx gitnexus analyze` định kỳ** — chỉ số GitNexus đã tăng từ 30.440 lên 30.730 symbols trong tháng 8; cần giữ index tươi để impact analysis trước mỗi sửa đổi high-risk được chính xác.

---

## Phụ lục A — Thống kê định lượng tháng 8

| Chỉ số | Giá trị |
|---|---|
| **Tổng commit (non-merge)** | **168** |
| Tác giả | Evan (100%) |
| Dải ngày có commit | 01/08 — 28/08 (22 ngày có commit; 03/09 có 1 commit warehouse ngoài kỳ, không tính) |
| Ngày nhiều commit nhất | 11/08 — 23 commit (phiếu kho đa dòng) |
| **Thay đổi mã** | **+65.407 / −14.186**, ròng **+51.221** dòng |
| File thay đổi (unique) | 689 file |
| Nhóm file chạm nhiều nhất | `frontend/src` (575), `backend/src` (300), `backend/prisma` (126), `openspec/changes` (107) |
| File chạm nhiều nhất | `CreateWarehouseIssueModal.tsx` (13), `WarehouseManagement.tsx` (11), `SupplyRequestManagement.tsx` (11) |
| **Migration mới** | **22** file SQL (từ `20260101000000_baseline` tới `20260826000002_default_gia_thanh_zero`) |
| **Test mới** | **25** file (`backend/src/__tests__/*`, `frontend/src/test/**/*`) |
| Phân loại commit | `feat` 74 · `fix` 64 · `docs` 9 · `refactor` 8 · `chore` 7 · `test` 4 · `style` 1 · `perf` 1 |
| Scope bận nhất | `warehouse` 37 · `ui` 19 · `supply-request` 9 · `rbac` 8 · `frontend` 8 · `timesheet` 8 |

### Phân bổ theo tuần

| Tuần | Số commit |
|---|---|
| 01/08 — 07/08 | 28 |
| 08/08 — 14/08 | 43 |
| 15/08 — 21/08 | 49 |
| 22/08 — 28/08 | 48 |

> Lưu ý: Thống kê dòng code lấy từ `git log --numstat` trên dải `--since=2026-08-01 --until=2026-09-01 --no-merges`. Số liệu `+65k/−14k` bao gồm cả baseline Prisma (một lần) nên ròng +51k phản ánh đúng khối lượng thực chất hơn con số tuyệt đối.

---

## Phụ lục B — Danh mục migration mới (22)

| # | Migration | Nội dung |
|---|---|---|
| 1 | `20260101000000_baseline` | Gộp 72 migration cũ thành baseline để `migrate dev` hoạt động lại |
| 2 | `20260801000000_debt_add_supplier_files` | Thêm `supplierId` + `files[]`, xóa `fileDinhKem` cho debt |
| 3 | `20260803000000_create_lookup_tables` | Bảng `Lookup` + `LookupChangeLog` (74 giá trị / 11 nhóm) |
| 4 | `20260804063957_add_ma_san_pham_to_entry_records` | `maSanPham` cho `MaterialEvaluation`/`FinishedProduct` |
| 5 | `20260804085937_add_shift_to_attendance` | `Attendance.shift` + index `(attendanceDate, shift)` |
| 6 | `20260807034130_add_overtime_plan_id_to_attendance` | `Attendance.overtimePlanId` (SetNull) |
| 7 | `20260807062018_add_payroll_overtime_source_setting` | `useActualOvertimeHours` |
| 8 | `20260807080000_add_attendance_unique_constraint` | `@@unique(employeeId, attendanceDate, isOvertime)` |
| 9 | `20260807090000_add_standard_hours_per_day` | `standardHoursPerDay` |
| 10 | `20260810000000_add_warehouse_slip_line_tables` | Bảng dòng cho phiếu nhập/xuất |
| 11 | `20260811163340_add_audit_fields_to_timesheet` | `updatedBy`/`updatedByName` cho `TimesheetCell` |
| 12 | `20260812093550_add_is_new_product_flag` | `SupplyRequestItem.isNewProduct` |
| 13 | `20260813000000_add_warehouse_slots` | `WarehouseSlot` (233 slot) + `LotProduct.slotId` |
| 14 | `20260814000000_add_lot_zone` | `Lot.zone` + partial unique index |
| 15 | `20260818000001_add_maKien_to_slip_items` | `maKien` cho `warehouse_receipt/issue_items` |
| 16 | `20260819000001_add_bm_alignment_fields` | Trường BM01/BM03 cho phiếu nhập/xuất |
| 17 | `20260820000001_add_overtime_approval_fields` | `nguoiDuyetId`/`ngayDuyet`/`lyDoTuChoi` cho `OvertimePlan` |
| 18 | `20260820000002_make_lot_product_nullable` | `lot_products.internationalProductId` nullable |
| 19 | `20260821000001_add_rbac_rule_matrix` | `Resource`/`Rule`/`RuleScope`/`RuleAuditLog`/`Delegation` |
| 20 | `20260824000001_add_supply_replenish_schema` | `triggeredPurchaseRequestId` + indexes/checks cho chuỗi bổ sung |
| 21 | `20260826000001_add_gia_thanh_to_international_product` | `giaThanh` cho `InternationalProduct` |
| 22 | `20260826000002_default_gia_thanh_zero` | Đổi default `LotProduct.giaThanh` 100.000 → 0, backfill 281 dòng |

Tất cả migration đều ở dạng additive (`ADD COLUMN`, `CREATE TABLE`, `CREATE INDEX`), không có `DROP COLUMN`/`DROP TABLE` gây mất dữ liệu.

---

## Phụ lục C — Từ khóa tra cứu nhanh

| Nhu cầu của lãnh đạo | Xem mục |
|---|---|
| Kho còn bao nhiêu, ở đâu | §1 (bản đồ kho, heatmap, tồn theo kiện) |
| Yêu cầu cung cấp xử lý tới đâu, thiếu gì | §2 (Chờ bổ sung, funnel, PR tự sinh) |
| Ai được làm gì trong hệ thống | §3 (Rule Matrix, 78 resource, 54 vị trí) |
| Giá trị tồn kho bằng tiền | §4 (giaThanh, giaThanhTB, giaTriTon) |
| Giao diện có dùng được trên điện thoại không | §5 (mobile view cho 2 bảng rộng nhất) |
| Lương OT tính đúng không | §6 (đối chiếu Excel, lương giờ từng người) |
| Công nhân nhập liệu trên tablet có vướng không | §7 (lọc theo tồn, mã hàng hóa) |
| Hệ thống có an toàn không | §8 (Redis auth, rate-limit, Prisma baseline) |

---

*Báo cáo được tổng hợp tự động từ lịch sử commit và đối chiếu với `AGENTS.md`, `openspec/changes` và tài liệu phòng ban hiện hành. Mọi con số đều có thể kiểm chứng bằng `git log --since=2026-08-01 --until=2026-09-01 --no-merges` trên nhánh `main`.*
