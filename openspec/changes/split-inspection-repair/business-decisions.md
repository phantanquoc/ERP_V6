# Quyết Định Nghiệp Vụ — split-inspection-repair

> 10 câu hỏi cần stakeholder chốt trước khi implement. Mỗi câu hỏi có **đề xuất mặc định** — stakeholder chỉ cần confirm hoặc chọn phương án thay thế. Cột "Spec Impact" cho biết nếu đổi quyết định thì phải sửa gì trong `proposal/design/tasks`.

---

## Q1 — Phân biệt kiểm tra vs sửa chữa bằng gì?

**Bối cảnh:** Tab Chung hiện không phân biệt được phiếu kiểm tra định kỳ và phiếu sửa chữa đột xuất. Cần một cơ chế để tách thống kê, điều hướng và luồng xử lý.

**Đề xuất (mặc định):** Thêm `requestType` discriminator (`KIEM_TRA | SUA_CHUA`, default `SUA_CHUA`) trên cùng bảng `RepairRequest`.

**Rationale:**
- Ít rủi ro migration nhất — không di chuyển dữ liệu, không dual-write.
- Query đơn giản: `WHERE requestType = 'KIEM_TRA'` cho báo cáo/điều hướng.
- Dữ liệu cũ tự động là `SUA_CHUA`, không đổi hành vi hiện tại.
- Phase 2 vẫn có thể tách view/materialized table nếu thống kê cho thấy cần thiết, không khóa đường lùi.

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| B — Tách bảng `InspectionRequest` riêng ngay | Khi stakeholder yêu cầu FK thật và constraint mạnh ngay từ đầu | Migration phức tạp, phải chuyển dữ liệu, tăng thời gian Phase 1 thêm ~1 tuần |
| C — Không thêm discriminator, chỉ thêm field suy luận | Khi muốn giữ schema tối thiểu | Query phải dùng heuristic (`keHoachChiTiet IS NOT NULL → SUA_CHUA`), dễ sai, khó mở rộng |

**Spec Impact nếu đổi:** Đổi sang B → sửa `common.prisma` (tạo model `InspectionRequest` mới), migration thành `CREATE TABLE` + data copy, API tách `/inspection-requests` riêng, FE tách 2 tab vật lý thay vì segmented control.

---

## Q2 — Phiếu kiểm tra có cần luồng duyệt / lập kế hoạch không?

**Bối cảnh:** Kiểm tra định kỳ thường là ghi nhận nhanh, không cần kế hoạch chi tiết như sửa chữa. Nhưng nếu yêu cầu duyệt chặt, luồng sẽ dài hơn.

**Đề xuất (mặc định):** Luồng ngắn 3 bước: `CHO_XU_LY → DA_TIEP_NHAN → HOAN_THANH`, nhánh `TU_CHOI / DA_HUY` từ 2 bước đầu. Không có `LEN_KE_HOACH / DANG_SUA_CHUA / CHO_NGHIEM_THU / DA_NGHIEM_THU`.

**Rationale:**
- Kiểm tra là thu thập thông tin, không phải thi công — không cần kế hoạch/vật tư/nghiệm thu.
- Luồng ngắn giảm số click cho kỹ thuật viên kiểm tra (thường làm số lượng lớn).
- Service guard `requestType=KIEM_TRA` chặn các transition dài, tránh nhầm lẫn.
- Nếu sau này cần duyệt nhiều cấp, có thể thêm bước mà không ảnh hưởng luồng sửa chữa.

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Luồng đầy đủ như SUA_CHUA | Khi quy trình ISO yêu cầu duyệt kế hoạch kiểm tra | Thêm ~2 transitions, FE phải hiển thị planning section cho KIEM_TRA, tăng độ phức tạp không cần thiết |

**Spec Impact nếu đổi:** Thêm `LEN_KE_HOACH` vào luồng KIEM_TRA trong `design.md §3.2` và `statusTransition.ts`; FE `RepairDetailPanel` hiển thị `PlanningSection` cho cả hai loại.

---

## Q3 — Tạo phiếu sửa chữa từ kết quả kiểm tra có bắt buộc chọn nguồn không?

**Bối cảnh:** Sau khi kiểm tra phát hiện hỏng hóc, kỹ thuật tạo phiếu sửa chữa. Có nên bắt buộc liên kết với phiếu kiểm tra nguồn để giữ vết truy vết?

**Đề xuất (mặc định):** Không bắt buộc, nhưng khuyến khích. `sourceInspectionRequestId` nullable; khi có thì auto-fill `sourceInspectionItemId` xuống từng item và hiển thị chip "Từ kiểm tra #YC-SC-...".

**Rationale:**
- Sửa chữa đột xuất (máy đang chạy bị hỏng) không có phiếu kiểm tra trước — bắt buộc sẽ chặn luồng khẩn cấp.
- Khuyến khích bằng UX (picker nổi bật khi tạo SUA_CHUA, gợi ý "Chọn phiếu kiểm tra nguồn nếu có") thay vì validation cứng.
- Vẫn giữ được truy vết cho các trường hợp có kiểm tra trước (thống kê "bao nhiêu sửa chữa xuất phát từ kiểm tra").

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Bắt buộc khi tạo SUA_CHUA | Khi quy trình yêu cầu mọi sửa chữa phải qua kiểm tra | Thêm Zod validation `sourceInspectionRequestId: required`, chặn sửa chữa đột xuất — cần luồng "sửa chữa khẩn" riêng |
| Không cho liên kết (tách rời hoàn toàn) | Khi muốn hai luồng độc lập tuyệt đối | Mất khả năng truy vết, không thống kê được hiệu quả kiểm tra |

**Spec Impact nếu đổi:** Đổi sang bắt buộc → sửa Zod schema (`sourceInspectionRequestId: z.string().min(1)`), service throw `ValidationError` nếu thiếu, FE form disable submit khi chưa chọn nguồn.

---

## Q4 — Hủy phiếu sau khi đã bắt đầu sửa có cho phép không?

**Bối cảnh:** Khi đã vào `DANG_SUA_CHUA` (đã giao việc, có thể đã lấy vật tư/kho), việc hủy sẽ để lại vật tư dở dang và công việc treo.

**Đề xuất (mặc định):** Chỉ `ADMIN` được hủy sau `DANG_SUA_CHUA` (bypass). Các role khác chỉ được hủy ở `CHO_XU_LY | DA_TIEP_NHAN | LEN_KE_HOACH`. Không cho hủy sau `DA_NGHIEM_THU`.

**Rationale:**
- Bảo vệ tính toàn vẹn: đã thi công thì phải nghiệm thu (DAT hoặc KHONG_DAT → sửa lại), không được xóa vết.
- `ADMIN` bypass là safety valve cho trường hợp đặc biệt (nhầm lẫn, sự cố) — có log `reason: 'admin_override'` để audit.
- Phù hợp với nguyên tắc forward-only hiện tại (`advanceStatus` đã có `bypass` cho ADMIN).

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Cho phép mọi role hủy đến `CHO_NGHIEM_THU` | Khi ưu tiên linh hoạt hơn toàn vẹn | Rủi ro vật tư đã xuất kho không được thu hồi, cần thêm luồng hoàn trả |
| Không cho hủy sau `DA_TIEP_NHAN` (chỉ TU_CHOI) | Khi muốn chặt chẽ tuyệt đối | Giảm linh hoạt, kế hoạch sai phải đi qua TU_CHOI thay vì DA_HUY — cần làm rõ khác biệt 2 trạng thái với user |

**Spec Impact nếu đổi:** Sửa guard trong `advanceRepairRequestStatus` và bảng RBAC trong `design.md §4.3`; FE ẩn/hiện nút Hủy theo trạng thái + role.

---

## Q5 — Nghiệm thu KHONG_DAT thì xử lý thế nào?

**Bối cảnh:** Sau khi nghiệm thu, nếu kết quả không đạt, phiếu phải quay lại sửa chữa hay phải tạo phiếu mới?

**Đề xuất (mặc định):** Vòng lặp `DA_NGHIEM_THU --KHONG_DAT--> DANG_SUA_CHUA`. Giữ nguyên bản ghi `AcceptanceHandover` cũ (với `ketQua=KHONG_DAT`), tạo lần nghiệm thu mới khi sửa xong.

**Rationale:**
- Giữ vết đầy đủ: mỗi lần nghiệm thu là một `AcceptanceHandover` riêng, audit được "đã nghiệm thu bao nhiêu lần mới đạt".
- Không mất công tạo lại phiếu sửa chữa — giữ nguyên `maYeuCau`, assignee, vật tư, supply links.
- Phù hợp với thực tế: sửa không đạt thì sửa tiếp, không phải làm lại thủ tục từ đầu.
- State machine chỉ cho phép loop duy nhất này, tránh vòng lặp vô hạn ở các trạng thái khác.

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Tạo phiếu sửa chữa mới, đóng phiếu cũ là KHONG_DAT | Khi muốn mỗi lần nghiệm thu là một phiếu riêng | Tăng số phiếu, phải copy items/assignee/material, phức tạp hơn |
| Quay về LEN_KE_HOACH (lập lại kế hoạch) | Khi KHONG_DAT đồng nghĩa với phải lập kế hoạch mới | Thêm một bước, kéo dài luồng; chỉ nên chọn nếu KHONG_DAT thường do sai kế hoạch |

**Spec Impact nếu đổi:** Đổi target loop → sửa `REPAIR_STATUS_ORDER` và `advanceRepairRequestStatus` (ví dụ `DA_NGHIEM_THU → LEN_KE_HOACH`), FE `RepairAcceptanceSection` hiển thị cảnh báo khác.

---

## Q6 — Vật tư dự kiến có bắt buộc trước khi lập kế hoạch không?

**Bối cảnh:** Khi lập kế hoạch sửa chữa (`LEN_KE_HOACH`), có nên yêu cầu phải khai báo vật tư dự kiến trước?

**Đề xuất (mặc định):** Không bắt buộc, nhưng cảnh báo nếu thiếu. Cho phép vào `LEN_KE_HOACH` mà chưa có `RepairMaterialNeed`; FE hiển thị banner "Chưa khai báo vật tư — có thể bổ sung sau" và BE không chặn transition.

**Rationale:**
- Nhiều sửa chữa nhỏ (vệ sinh, hiệu chỉnh) không cần vật tư — bắt buộc sẽ tạo ma sát.
- Vật tư có thể được xác định dần trong quá trình sửa, không nhất thiết biết hết khi lập kế hoạch.
- Cảnh báo thay vì chặn giúp planner không quên nhưng không bị khóa luồng.
- Thống kê sau này có thể đo "tỷ lệ phiếu có vật tư" để đánh giá.

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Bắt buộc ít nhất 1 materialNeed trước khi LEN_KE_HOACH | Khi quy trình yêu cầu dự toán vật tư đầy đủ trước khi duyệt kế hoạch | Thêm guard trong `plan()` service: `if (materialNeeds.length === 0) throw ValidationError`, FE disable nút Lập kế hoạch |
| Bắt buộc trước khi DANG_SUA_CHUA | Thỏa hiệp: cho lập kế hoạch trước, nhưng phải có vật tư mới được bắt đầu sửa | Guard ở `start()` thay vì `plan()` |

**Spec Impact nếu đổi:** Thêm validation trong service transition tương ứng, FE thêm disable + tooltip trên nút chuyển trạng thái.

---

## Q7 — Liên kết YC vật tư ở cấp phiếu hay cấp item?

**Bối cảnh:** Một phiếu sửa chữa có nhiều hạng mục (items), mỗi hạng mục có thể cần vật tư khác nhau. Liên kết với phiếu YC vật tư (SupplyRequest) nên ở cấp nào?

**Đề xuất (mặc định):** Cấp item là chính, cấp phiếu là fallback. `RepairSupplyLink.repairRequestItemId` nullable — nếu có thì link per-item, nếu null thì link per-request (header-level). Unique `[repairRequestItemId, supplyRequestId]` khi per-item.

**Rationale:**
- Per-item cho phép theo dõi chính xác "hạng mục nào cần vật tư nào, đã cấp bao nhiêu" — quan trọng khi một phiếu sửa chữa có nhiều hạng mục với vật tư khác nhau.
- Per-request fallback cho trường hợp YC vật tư chung cho cả phiếu (ví dụ: bộ dụng cụ chung).
- Unique constraint ngăn double-link cùng item với cùng SupplyRequest.
- Đủ linh hoạt cho cả hai cách dùng mà không cần 2 bảng riêng.

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Chỉ cấp phiếu (header-level) | Khi muốn đơn giản, mỗi sửa chữa chỉ có 1 YC vật tư | Mất độ chính xác per-item, không biết vật tư nào phục vụ hạng mục nào |
| Chỉ cấp item (bắt buộc repairRequestItemId) | Khi muốn chặt chẽ tuyệt đối | Phiếu chỉ có 1 item vẫn phải chọn item, thêm thao tác thừa |

**Spec Impact nếu đổi:** Đổi sang chỉ header → bỏ `repairRequestItemId` khỏi `RepairSupplyLink`, bỏ unique per-item, FE `SupplyLinkPanel` không cần picker item. Đổi sang chỉ item → set `repairRequestItemId` NOT NULL, migration thêm NOT NULL constraint.

---

## Q8 — Phân công nhiều người, ai là lead?

**Bối cảnh:** Một phiếu sửa chữa có thể cần nhiều người (thợ chính, thợ phụ, giám sát). Cần cơ chế phân công và xác định người chịu trách nhiệm chính.

**Đề xuất (mặc định):** Bảng `RepairRequestAssignee` với `vaiTro` (`CHINH | PHU`) và `isLead` boolean. Tối đa 1 `isLead=true` per `repairRequestId` (enforce bằng partial unique index + service transaction). `CHINH` là người phụ trách chính, `PHU` là hỗ trợ.

**Rationale:**
- Rõ trách nhiệm: `isLead` duy nhất giúp xác định người chịu trách nhiệm nghiệm thu/báo cáo.
- `vaiTro` phân biệt mức độ tham gia — dùng cho thống kê giờ công sau này (`gioCongThucTe` có thể chia theo vai trò).
- Partial unique index (`WHERE is_lead = true`) là safety net DB, service guard là lớp chính — double protection.
- `userName` denormalized để hiển thị ngay cả khi user bị xóa/đổi tên.

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Không có lead, chỉ danh sách ngang hàng | Khi mọi người tham gia như nhau | Mất điểm chịu trách nhiệm duy nhất, khó xác định ai báo cáo nghiệm thu |
| Cho phép nhiều lead | Khi sửa chữa lớn có nhiều tổ, mỗi tổ một lead | Bỏ unique constraint, thêm `teamId` grouping — tăng độ phức tạp |

**Spec Impact nếu đổi:** Bỏ lead → xóa `isLead` khỏi model, xóa partial index, FE bỏ crown icon. Nhiều lead → bỏ unique, thêm `teamId` field.

---

## Q9 — Kho cấp phát thiếu so với dự kiến thì sao?

**Bối cảnh:** `RepairMaterialNeed.soLuongDuKien` là dự kiến, nhưng kho có thể chỉ cấp được một phần (thiếu tồn, chưa nhập). Có nên chặn nghiệm thu khi thiếu?

**Đề xuất (mặc định):** Cho phép nghiệm thu với `soLuongThucTe` (thực cấp), ghi chênh lệch. Không chặn `CHO_NGHIEM_THU → DA_NGHIEM_THU` khi `soLuongThucTe < soLuongDuKien`; FE hiển thị cảnh báo "Cấp thiếu X so với dự kiến" và BE lưu `ghiChu` chênh lệch.

**Rationale:**
- Thực tế kho thường thiếu — chặn nghiệm thu sẽ làm treo phiếu sửa chữa vô hạn.
- Ghi chênh lệch giúp thống kê "tỷ lệ đáp ứng vật tư" và cải thiện dự trù sau này.
- Sửa chữa có thể hoàn thành với vật tư thay thế hoặc phương án khác — không nên cứng nhắc.
- Nếu thiếu nghiêm trọng, người nghiệm thu có thể đánh `KHONG_DAT` để yêu cầu bổ sung.

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Chặn nghiệm thu khi thiếu > ngưỡng (ví dụ 20%) | Khi yêu cầu chất lượng chặt | Thêm guard trong `confirmAcceptance`: so sánh `soLuongThucTe` vs `soLuongDuKien`, throw nếu chênh > threshold |
| Tự động tạo YC bổ sung khi thiếu | Khi muốn tự động hóa | Thêm logic tạo `SupplyRequest` bổ sung, tăng độ phức tạp Phase 1 — nên defer |

**Spec Impact nếu đổi:** Thêm validation threshold trong `confirmAcceptance` service, FE thêm progress bar `soLuongThucTe / soLuongDuKien` và disable logic.

---

## Q10 — Phiếu cũ sau migration tính là loại gì?

**Bối cảnh:** DB hiện có N phiếu `RepairRequest` không có `requestType`. Sau khi thêm discriminator, chúng sẽ là gì?

**Đề xuất (mặc định):** Mặc định `SUA_CHUA` cho toàn bộ phiếu cũ. Backfill `UPDATE ... SET request_type = 'SUA_CHUA' WHERE request_type IS NULL` trong migration, sau đó `SET NOT NULL DEFAULT 'SUA_CHUA'`.

**Rationale:**
- 100% phiếu hiện tại là sửa chữa (không có kiểm tra định kỳ trước đây) — mặc định này phản ánh đúng thực tế.
- Không đổi hành vi: luồng 4 trạng thái cũ (`CHO_XU_LY → DANG_SUA_CHUA → HOAN_THANH / DA_HUY`) là sub-path của state machine mới nên vẫn hợp lệ.
- Không cần data review thủ công — migration chạy tự động, idempotent.
- Báo cáo cũ không bị xáo trộn (tỷ lệ KIEM_TRA = 0 ban đầu là đúng).

**Phương án thay thế:**
| Phương án | Khi nào chọn | Hệ quả |
|-----------|-------------|--------|
| Để NULL, yêu cầu user phân loại thủ công | Khi không chắc phiếu cũ là loại gì | Thêm màn hình bulk-classify, tăng công sức, migration không SET NOT NULL được |
| Suy luận từ field (có keHoachChiTiet → SUA_CHUA) | Khi muốn thông minh hơn | Phiếu cũ chưa có field mới nên heuristic vô dụng — tất cả vẫn ra SUA_CHUA |

**Spec Impact nếu đổi:** Đổi sang NULL → bỏ `SET NOT NULL` trong migration, thêm nullable handling trong service/FE (filter `requestType IS NULL` hiển thị riêng). Đổi sang suy luận → thêm script phân loại sau migration.

---

## Tổng hợp cần stakeholder confirm

| # | Câu hỏi | Đề xuất mặc định | Cần confirm? |
|---|---------|-------------------|--------------|
| Q1 | Discriminator vs tách bảng | Discriminator `requestType` | Yes — ảnh hưởng migration lớn nhất |
| Q2 | Luồng kiểm tra ngắn hay dài | Ngắn 3 bước | Yes |
| Q3 | Bắt buộc chọn nguồn khi tạo SUA_CHUA | Không bắt buộc | Yes |
| Q4 | Hủy sau DANG_SUA_CHUA | Chỉ ADMIN | Yes — ảnh hưởng RBAC |
| Q5 | KHONG_DAT loop về đâu | Về DANG_SUA_CHUA | Yes |
| Q6 | Vật tư bắt buộc trước kế hoạch | Không bắt buộc, cảnh báo | No — có thể đổi sau không cần migration |
| Q7 | Link YC vật tư cấp nào | Per-item + fallback header | Yes — ảnh hưởng schema unique |
| Q8 | Lead duy nhất | 1 isLead per request | No — có thể nới sau |
| Q9 | Thiếu vật tư có chặn nghiệm thu | Không chặn, ghi chênh lệch | No — có thể thêm guard sau |
| Q10 | Phiếu cũ mặc định loại gì | SUA_CHUA | Yes — ảnh hưởng migration backfill |

> **Cách confirm:** Stakeholder reply "Đồng ý toàn bộ đề xuất mặc định" hoặc liệt kê Q cần đổi (ví dụ: "Q4 đổi thành cho phép TEAM_LEAD hủy đến CHO_NGHIEM_THU"). Sau khi chốt, cập nhật `proposal.md` và `design.md` tương ứng trước khi bắt đầu Phase 1.

---

## Q11 — YCCC có bắt buộc với phiếu sửa chữa không? Ai được tạo YCCC cho kế hoạch?

**Bối cảnh:** Phiếu sửa chữa có thể không cần vật tư (vệ sinh, hiệu chỉnh), và YCCC vốn vẫn được tạo độc lập ở tab Cung ứng. Cần làm rõ tính bắt buộc và quyền tạo.

**Đề xuất (mặc định):** YCCC là **optional** — SC không có `RepairSupplyLink` vẫn đi thẳng `LEN_KE_HOACH → DANG_SUA_CHUA`. YCCC vẫn hoạt động độc lập như cũ (tạo ở tab Cung ứng, chưa link tới SC vẫn hợp lệ, có thể link sau). Bất kỳ actor nào có `repair:write` trên SC đều được bấm "Tạo YC vật tư" trong `SupplyLinkPanel` — `employeeId` lấy từ `req.user.id` (người bấm), không ràng buộc phải là assignee. Trong walkthrough, Bảo (người lập KH) hay Cường (thợ chính) đều tạo được.

**Rationale:**
- Sửa chữa không thay linh kiện thì không cần YCCC — bắt buộc sẽ tạo ma sát và phiếu YCCC rỗng.
- Giữ YCCC độc lập tránh breaking change cho luồng Cung ứng hiện tại.
- Nới quyền tạo khỏi assignee giảm phụ thuộc vào phân công trước khi có vật tư.

**Spec Impact nếu đổi:** Bắt buộc YCCC → thêm guard `if (supplyLinks.length===0) throw ValidationError` trước `start`; khóa actor → thêm check `req.user.id must be in assignees`.

---

## Q12 — Khuyến nghị cải tiến luồng SC ↔ YCCC (R1–R6) — chốt scope Phase 1

**Bối cảnh:** Đã có YCCC optional và 2 actor đều tạo được. Để giảm quên/quay lại gõ lại, đề xuất 6 cải tiến:

**Đề xuất (mặc định):** Phase 1 làm ngay **R1 + R2 + R3**; **R4** ở chế độ `warn, not block`; **R5 + R6** defer sang Phase 1.1.

| # | Khuyến nghị | Mô tả ngắn | Scope |
|---|-------------|------------|-------|
| R1 | Cảnh báo mềm thiếu YCCC | Nếu `materialNeeds.length>0 && supplyLinks.length===0` hiện banner vàng "Đã dự trù N vật tư nhưng chưa tạo YC cung cấp" | FE small |
| R2 | Pre-fill YCCC từ RepairMaterialNeed | Nút "Tạo YC vật tư" auto-map `materialNeeds → SupplyRequestItem` cho phép chỉnh trước submit; sau khi cấp, `soLuongThucTe` đồng bộ ngược | FE+BE small |
| R3 | Link YCCC có sẵn (pick existing) | Thêm action "Chọn YC có sẵn" (picker `GET /supply-requests?trangThai=Chưa cung cấp`) gắn vào SC | FE small |
| R4 | Guard start khi có YCCC nhưng chưa xuất | `if (supplyLinks.length>0 && !hasWarehouseIssue) → warn + require confirm` (không block khi `supplyLinks=[]`); thêm setting `requireWarehouseIssueBeforeStart` default `false` | BE guard + FE confirm |
| R5 | Cờ "Không cần vật tư" | Thêm `khongCanVatTu boolean? + lyDoKhongCanVatTu` khi `supplyLinks=[]` để ẩn R1 và thống kê `byNeedSupply` | Schema 2 cột nullable |
| R6 | Filter YCCC chưa gắn SC | `GET /supply-requests?unlinked=true` (chưa có RepairSupplyLink) để gợi ý gắn | BE small |

**Rationale:** R1–R3 giảm thao tác lặp và sai sót nhiều nhất với chi phí thấp; R4 tránh chặn SC không cần vật tư; R5–R6 hữu ích nhưng không blocking nên defer để giữ migration tối thiểu.

**Spec Impact nếu đổi:** Đổi R4 thành `block` → guard throw `ValidationError`; bỏ R1 → xóa banner; làm R5 → thêm 2 cột nullable + backfill `null`.

