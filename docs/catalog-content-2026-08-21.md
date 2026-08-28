# Catalog Content — ERP An Binh Foods

**Ngày:** 2026-08-21 | **Nguồn:** `docs/catalog-brief-2026-08-20.md` + `README.md` (branch `main`, audit evidence-first 2026-08-20)
**Mục đích:** Triển lãm — nội dung hoàn chỉnh 16 trang để designer dàn trang trực tiếp (copy-paste ready)
**Đối tượng đọc:** Designer, content writer, sales/presales tại gian hàng
**Ngôn ngữ:** Tiếng Việt (headline có phương án EN), copy ngắn — mỗi trang 1 headline + 1 visual chính + 3 bullet proof

> Nguyên tắc: Evidence first. Mọi claim đều có file path đối chiếu trong brief. Những gì ghi "roadmap" là chưa có — không marketing như đã production.

---

## Hướng dẫn chung cho designer

**Tone:** Chuyên nghiệp, evidence-first, hình xưởng thực tế + diagram kỹ thuật. Không dùng từ đao to búa lớn ("quân sự", "ngân hàng", "zero-trust") — xem mục 10 brief.

**Voice (theo `openspec/ui-dna.md`):** Tiếng Việt ngắn gọn, mang tính vận hành. Empty state giải thích rõ, feedback nêu tên hành động đã xong.

**Palette gợi ý (theo UI DNA):** Nền trung tính lạnh, xanh dương cho action chính, xanh lá/đỏ chỉ cho success/destructive, bo góc mềm, shadow chỉ cho modal/chat panel, bảng dense có viền rõ + header xám.

**Cấu trúc mỗi trang trong file này:**

- `Headline` — dòng lớn nhất trang
- `Subheadline` — 1 câu dưới headline
- `Body` — 1 đoạn ngắn (2-3 câu) giải thích
- `3 Proof Points` — 3 bullet có evidence (dùng icon số/chấm, không icon trang trí)
- `Visual` — mô tả diagram/screenshot + crop gợi ý
- `Audience` + `Elevator 1 câu` — để sales biết nói gì khi khách đứng trước trang đó

---

## Lựa chọn Cover (chốt 1 trước khi dàn trang)

**Headline — chọn 1 (đề xuất #1):**

1. **Từ mẻ chiên tới thành phẩm — mọi thứ được kết nối** ← đề xuất
2. ERP hiểu nhà máy sấy của bạn
3. Manufacturing intelligence, không chỉ quản lý
4. Một mẻ chiên, một câu chuyện dữ liệu
5. Vận hành sấy chân không — số hóa trọn vẹn

**Subheadline — chọn 1 (đề xuất #1):**

1. Sales → Kho → Mẻ chiên → Sấy 4 giai đoạn → 8-grade yield → Chất lượng → Nhân sự — trên một nền tảng, với AI hỗ trợ và kiosk khuôn mặt tại xưởng. ← đề xuất
2. Không phải ERP chung chung — được xây cho quy trình chiên chân không, với AI RAG và face recognition gắn vào vận hành thực tế.
3. Modular monolith, production-hardened — 82 API groups, 60+ entities, deploy single-VPS với backup 3 lớp và playbook 6-phase.

**Slogan — chọn 1 (đề xuất #1, đặt dưới logo):**

1. **Sấy thông minh, quản lý liền mạch** ← đề xuất
2. Mỗi mẻ chiên đều có dữ liệu
3. Nhà máy trong tầm tay
4. Từ nguyên liệu tới thành phẩm — một dòng chảy
5. AI hiểu xưởng, face hiểu người

---

## Trang 1 — Cover

**Mục tiêu:** Ấn tượng đầu — dừng chân 3 giây.

**Headline:** Từ mẻ chiên tới thành phẩm — mọi thứ được kết nối

**Subheadline:** Intelligent Manufacturing Platform cho nhà sản xuất trái cây sấy

**Body (nhỏ, dưới subheadline):** An Bình Foods — vận hành sấy chân không được số hóa trọn vẹn: truy vết mẻ chiên, kho kiện FIFO, bảo trì theo kế hoạch, AI hiểu ngữ cảnh xưởng và kiosk khuôn mặt tại xưởng.

**Slogan lockup:** Sấy thông minh, quản lý liền mạch

**Visual:** Ảnh xưởng sấy thực tế (lò sấy / băng chuyền / mẻ chiên đang sấy) full-bleed, overlay tối nhẹ 20-30% để chữ nổi. Logo An Bình Foods góc trên. Không dùng stock photo generic.

**Footer nhỏ:** www.anbinhfoods.vn | Gian hàng [số] — Gặp chúng tôi để xem kiosk và mẻ chiên trực tiếp

**Audience:** Tất cả — CEO dừng vì headline, Factory dừng vì ảnh xưởng, CIO dừng vì chữ "Platform".

**Elevator:** "Đây là nền tảng sản xuất thông minh được xây riêng cho nhà máy sấy — không phải ERP chung chung."

---

## Trang 2 — The Problem

**Mục tiêu:** Đồng cảm — cho khách thấy chúng ta hiểu nỗi đau của họ.

**Headline:** Quản lý nhà máy sấy bằng Excel và giấy tờ — đã đến lúc thay đổi

**Subheadline:** Khi mẻ chiên không có dữ liệu, mọi quyết định đều là ước đoán

**Body:** Nhà máy sấy chân không có quy trình đặc thù — nhưng phần mềm chung chung không hiểu Brix, không hiểu 8-grade yield, không hiểu ca 06:30. Kết quả: dữ liệu nằm rải rác, tồn kho không khớp thực tế, chấm công phụ thuộc lòng tin.

**3 Pain Points (trình bày dạng 3 cột, mỗi cột 1 icon outline đơn giản):**

1. **Truy vết mẻ chiên thủ công** — Mã mẻ ghi tay, không xuyên suốt từ nguyên liệu tới thành phẩm. Khi cần truy nguyên lô lỗi, mất ngày để lần lại sổ sách.
2. **Tồn kho kiện không khớp** — Kho là con số tổng, không phải vị trí K1.1, K1.2 cụ thể. Xuất nhập ghi sau, FIFO phụ thuộc trí nhớ, kiểm kê lệch liên tục.
3. **Chấm công gian lận & tốn công** — Chấm hộ, ghi tay, tổng hợp cuối tháng thủ công. Quản lý mất giờ đối chiếu, nhân sự thắc mắc bảng công.

**Visual:** 3 cột pain points + 1 dải ảnh nhỏ: sổ tay ghi mẻ / kệ kho kiện / máy chấm vân tay cũ — tông xám, overlay icon cảnh báo nhẹ.

**Audience chính:** CEO / Factory Manager

**Elevator:** "Nếu mẻ chiên không có dữ liệu xuyên suốt, mọi báo cáo sau đó đều thiếu gốc."

**Ghi chú designer:** Trang này tone trầm hơn các trang sau (vấn đề) — dùng nền xám nhạt, chuyển sang nền sáng từ trang 3 (giải pháp).

---

## Trang 3 — The Solution

**Mục tiêu:** Tổng quan — 1 trang nói hết "chúng tôi giải quyết bằng gì".

**Headline:** Một nền tảng — mọi vận hành được kết nối

**Subheadline:** Không ghép nhiều phần mềm rời rạc. Một dòng chảy dữ liệu từ báo giá tới thành phẩm và nhân sự.

**Body:** ERP An Bình Foods là Intelligent Manufacturing Platform được xây riêng cho sấy chân không — nơi định mức nguyên liệu, 4 giai đoạn sấy, 8-grade yield, kho kiện FIFO và kiosk khuôn mặt cùng sống trên một nền tảng, với AI hiểu ngữ cảnh xưởng hỗ trợ vận hành hằng ngày.

**5 Messaging Pillars (trình bày dạng 5 cards hoặc 5 hàng, mỗi pillar 1 icon + 1 câu):**

1. **Manufacturing Traceability** — Mã `maChien` xuyên 4 bảng, boundary 06:30 theo ca thực tế, 8-grade yield với tỉ lệ tự động, 4-stage drying gắn MachineSystem.
2. **Connected Operations** — QuotationCalculator (giá hòa vốn) → Order → Supply/Purchase → Warehouse kiện/FIFO → Production → Quality → Invoice/Payroll — một dòng chảy, không đứt đoạn.
3. **AI-Assisted Enterprise** — RAG hybrid (Chroma + BM25 + RRF + FlashRank) + ReAct agent 72 tools hiểu department scope — hỏi bằng tiếng Việt, thao tác thực tế qua ERP API.
4. **Physical-Digital Bridge** — Kiosk ArcFace 4-layer liveness + adaptive gallery + advisory-lock attendance — khuôn mặt là thẻ chấm công tại xưởng.
5. **Extensible Foundation** — Modular monolith, multi-schema Prisma, RBAC/ABAC (secondary departments), WebSocket + Web Push, Docker Compose production-ready.

**8 Capability Groups (dải nhỏ dưới pillars, dạng chips hoặc grid 4×2):** Sales & Quotation | Supply & Purchase | Warehouse (kiện/FIFO) | Manufacturing | Quality | Equipment & Maintenance | HR & Payroll | AI & Face

**Visual:** Diagram tổng quan 5 pillars + 8 capability groups. Nền sáng, icon outline đồng bộ.

**Audience:** CEO (pillars 1-2) + CIO (pillars 3-5)

**Elevator:** "Năm trụ cột — truy vết, kết nối, AI, cầu nối vật lý-số, và nền tảng mở rộng — trên một deploy duy nhất."

---

## Trang 4 — Connected Operations

**Mục tiêu:** Cho thấy dữ liệu chảy liền mạch — không phải module rời.

**Headline:** Từ báo giá tới thành phẩm — một dòng chảy dữ liệu

**Subheadline:** Mỗi nghiệp vụ là một mắt xích — dữ liệu đi tiếp, không nhập lại

**Body:** Khách hàng quốc tế gửi yêu cầu báo giá → hệ thống tính giá hòa vốn từ định mức và chi phí → báo giá khóa giá → đơn hàng → thu mua → kho kiện → mẻ chiên → sấy → phân loại → chất lượng → hóa đơn → nhân sự. Một mã `maChien` nối suốt.

**Business Flow (Mermaid — designer vẽ lại dạng horizontal flow, màu theo phase):**

```
InternationalCustomer
  → QuotationRequest (+ items)
    → QuotationCalculator (MaterialStandard + GeneralCost + ExportCost → giá hòa vốn)
      → Quotation (priceLocked, gửi khách)
        → Order (7 trạng thái SX + 3 trạng thái TT)
          → TaxReport (snapshot OrderItems)

SupplyRequest (multi-item, fulfillment per-item)
  → PurchaseRequest (MANUAL/SHORTAGE/REORDER/QUICK, per-line supplier)
    → Supplier

Warehouse → Lot (zone CAD) → Slot (K1.1…) → LotProduct (soLuong, giaThanh)
  → WarehouseReceipt BM01 / WarehouseIssue BM03 (multi-line, transaction, reorder hook)

MaterialStandard (định mức NL→TP)
  → MaterialEvaluation (maChien, Brix, lotProductId → trừ kho)
    → SystemOperation (4 giai đoạn nhiệt/áp, MachineSystem HOAT_DONG guard)
      → FinishedProduct (8 grades + tiLe auto + daNhapKho → WarehouseReceipt bulk)
        → QualityEvaluation (auto-fill tiLe, mùi/vị/độ giòn)
          → ProductionReport (KH/TT chênh lệch)

Employee → Attendance (shift provenance, kiosk/face) → Timesheet → Payroll (OT 1.5/2/3) → Evaluation (QUICK/FULL, appeal, peer)
```

**3 Proof Points:**

1. **Giá hòa vốn có cơ sở** — QuotationCalculator cộng định mức nguyên liệu + chi phí chung + chi phí xuất khẩu, khóa giá trước khi gửi khách — không báo giá cảm tính.
2. **Kho kiện là first-class** — Lot → Slot (K1.1) → LotProduct với FIFO và capacity guard, phiếu BM01/BM03 multi-line trong transaction — tồn kho là vị trí, không phải con số.
3. **Mẻ chiên là backbone** — `maChien` xuyên MaterialEvaluation → SystemOperation → FinishedProduct → QualityEvaluation, boundary 06:30 theo ca thực tế.

**Visual:** Horizontal flow diagram — 3 swim lanes (Sales/Supply, Warehouse/Production, HR) với mũi tên nối. Highlight `maChien` bằng màu nhấn.

**Audience:** CEO (thấy dòng chảy) + Factory Manager (thấy mẻ chiên) + Partner (thấy API surface)

**Elevator:** "Một dòng chảy — từ lúc khách hỏi giá tới lúc thành phẩm nhập kho và nhân sự được trả lương — không đứt đoạn."

---

## Trang 5 — Manufacturing I — Mỗi mẻ chiên đều có câu chuyện dữ liệu

**Mục tiêu:** Hero 1/2 — kể sâu manufacturing DNA (khác biệt lớn nhất vs ERP chung).

**Headline:** Mỗi mẻ chiên đều có câu chuyện dữ liệu

**Subheadline:** Từ Brix ngâm tới 4 giai đoạn sấy — truy vết một mã `maChien` xuyên suốt

**Body:** Mỗi mẻ chiên được định danh bằng `maChien` duy nhất, gắn với Brix, nhiệt độ ngâm, lot nguyên liệu trừ kho thực tế, 4 giai đoạn sấy có ngưỡng nhiệt/áp, và MachineSystem phải ở trạng thái HOAT_DONG mới được vận hành. Không có mẻ nào là "không rõ nguồn gốc".

**Diagram (designer vẽ dạng vertical pipeline, 4 bước):**

```
MaterialStandard (định mức NL→TP)
  ↓
MaterialEvaluation — maChien, Brix, lotProductId → trừ kho (transaction)
  ↓
SystemOperation — 4 giai đoạn nhiệt/áp, gắn MachineSystem (HOAT_DONG guard)
  ↓
FinishedProduct — 8 grades + tiLe auto + daNhapKho → WarehouseReceipt bulk (idempotent)
```

**3 Proof Points:**

1. **Trừ kho gắn mẻ, không trừ chung** — MaterialEvaluation trừ LotProduct cụ thể qua `lotProductId` trong transaction — biết chính xác kiện nào đã dùng cho mẻ nào.
2. **4 giai đoạn sấy có guard** — SystemOperation ghi nhiệt/áp theo 4 giai đoạn, chỉ cho phép khi MachineSystem ở HOAT_DONG — không vận hành trên máy đang bảo trì/hỏng.
3. **Ngày sản xuất 06:30** — Production day boundary 06:30 theo ca thực tế, không phải 00:00 hệ thống — báo cáo sản lượng khớp với ca xưởng.

**Visual:** Diagram vertical + screenshot **ProductionMaterialEvaluationEntry** (kiosk 66KB) — crop vào form Brix/nhiệt độ/mã mẻ, bỏ sidebar chrome, giữ breadcrumb.

**Audience:** Factory / Operations Manager

**Elevator:** "Một mã mẻ chiên — biết nó dùng kiện nào, sấy trên máy nào, qua 4 giai đoạn nào, và ra bao nhiêu thành phẩm."

---

## Trang 6 — Manufacturing II — 8-Grade Yield

**Mục tiêu:** Hero 2/2 — USP duy nhất, không ERP nào có sẵn.

**Headline:** 8-grade yield — hiểu rõ từng phần của thành phẩm

**Subheadline:** Không chỉ "bao nhiêu kg" — mà là A/B/B-Dầu/C/Vụn/Phế/Ướt, với tỉ lệ tự động

**Body:** Thành phẩm không phải một con số tổng. Hệ thống phân loại 8 grades (A, B, B-Dầu, C, Vụn, Phế, Ướt…) với `tiLe` (tỉ lệ) tính tự động, gắn `maChien` để truy nguyên, và bulk nhập kho idempotent qua `daNhapKho` — nhập một lần, không trùng.

**8 Grades (trình bày dạng 8 ô hoặc bar breakdown, màu từ đậm → nhạt):**

| Grade | Ý nghĩa | Ghi chú |
|-------|---------|---------|
| **A** | Loại 1 — đẹp nhất | Giá cao nhất |
| **B** | Loại 2 |  |
| **B-Dầu** | Loại B có dầu | Đặc thù chiên chân không |
| **C** | Loại 3 |  |
| **Vụn** | Mảnh vụn | Tận dụng / bán vụn |
| **Phế** | Phế phẩm | Loại bỏ |
| **Ướt** | Chưa đạt độ khô | Cần sấy lại |
| *(+1 grade theo cấu hình)* | — | Tổng 8 grades |

**3 Proof Points:**

1. **Tỉ lệ tự động, không tính tay** — `tiLe` mỗi grade = khối lượng grade / tổng mẻ, tính tự động — báo cáo yield chính xác, không sai số nhập liệu.
2. **Nhập kho bulk idempotent** — `daNhapKho` guard đảm bảo mỗi mẻ chỉ nhập kho một lần — không trùng kiện khi thao tác lại.
3. **Báo cáo chênh lệch KH/TT** — ProductionReport so sánh kế hoạch vs thực tế theo grade — biết ngay mẻ nào lệch, grade nào hao hụt.

**Visual:** Bar/breakdown 8 grades + screenshot **FinishedProduct + QualityEvaluation** — crop vào bảng yield và form đánh giá.

**Audience:** Factory Manager + CEO (thấy yield = tiền)

**Elevator:** "Biết chính xác mỗi mẻ ra bao nhiêu loại A, bao nhiêu vụn, bao nhiêu phế — và tỉ lệ tự tính, không phải Excel."

---

## Trang 7 — Supply & Warehouse — Kiện là first-class

**Mục tiêu:** Cho thấy kho bãi khác biệt vs ERP thường (kiện/FIFO/BM01).

**Headline:** Kiện là first-class — tồn kho không còn là con số mơ hồ

**Subheadline:** Mỗi kiện có vị trí K1.1, có FIFO, có capacity guard — không phải ô tổng hợp

**Body:** Kho được mô hình hóa tới cấp kiện: Warehouse → Lot (zone CAD) → Slot (K1.1, K1.2…) → LotProduct (số lượng, giá thành). Xuất nhập qua phiếu BM01 (nhập) / BM03 (xuất) multi-line trong transaction, với FIFO K1.1 → K1.n và reorder hook tự động.

**Diagram (warehouse hierarchy):**

```
Warehouse
  → Lot (zone CAD)
    → Slot (K1.1, K1.2, … K1.n) — capacity guard
      → LotProduct (soLuong, giaThanh) — FIFO K1.1 → K1.n
        → WarehouseReceipt BM01 / WarehouseIssue BM03 (multi-line, transaction)
```

**3 Proof Points:**

1. **FIFO thực tế** — Xuất kho lấy K1.1 trước, hết mới tới K1.2 — đúng nguyên tắc nhập trước xuất trước, giảm tồn đọng và hết hạn.
2. **Capacity guard** — Slot có giới hạn sức chứa, hệ thống chặn khi vượt — không nhồi kiện vượt tải kệ.
3. **Phiếu BM01/BM03 multi-line + reorder hook** — Một phiếu nhiều dòng trong transaction, tự động gợi ý đặt hàng lại khi tồn dưới ngưỡng.

**Visual:** Diagram hierarchy + screenshot **WarehouseManagement + LotProduct + BM01 receipt** — crop vào bảng kiện và form tạo phiếu.

**Audience:** Factory / Operations Manager + CIO (thấy transaction + guard)

**Elevator:** "Tồn kho không phải con số — là kiện K1.1 nằm ở đâu, nhập khi nào, xuất theo FIFO, và phiếu nào đã nhập nó."

---

## Trang 8 — Engineering — Bảo trì là kế hoạch, không phải phản ứng

**Mục tiêu:** Cho thấy quản lý thiết bị có chiều sâu (template-driven, không phải list máy).

**Headline:** Bảo trì không còn là phản ứng — là kế hoạch

**Subheadline:** Từ hệ thống máy tới kế hoạch năm, tới fault knowledge base và phụ tùng

**Body:** Mỗi MachineSystem có hierarchy, trạng thái, và kế hoạch bảo trì năm (MaintenancePlan). Khi máy lỗi, FaultRecord ghi nhận với knowledge base tra cứu, gắn SparePart (phụ tùng) — vòng kín từ phát hiện tới khắc phục.

**Diagram:**

```
MachineSystem (hierarchy, status: HOAT_DONG / BAO_TRI / HONG)
  → MaintenancePlan (kế hoạch năm, theo template)
    → FaultRecord (ghi lỗi, tra KB)
      → SparePart (phụ tùng thay thế)
```

**3 Proof Points:**

1. **Template-driven maintenance** — Kế hoạch bảo trì theo template, lặp theo năm — không phải tạo tay từng lần.
2. **Fault knowledge base** — Lỗi được tra cứu từ KB tích lũy — thợ mới cũng biết cách xử lý lỗi đã từng xảy ra.
3. **Gắn phụ tùng thực tế** — SparePart gắn với fault và machine — biết đã thay gì, còn tồn bao nhiêu, khi nào cần đặt.

**Visual:** Screenshot **MachineSystem + MaintenancePlan + FaultRecord** — crop vào bảng máy và form kế hoạch.

**Audience:** Factory / Technical Manager

**Elevator:** "Máy không hỏng mới sửa — có kế hoạch năm, có KB lỗi, có phụ tùng gắn sẵn. Bảo trì là kế hoạch."

---

## Trang 9 — Quality — Chất lượng được ghi nhận theo mẻ

**Mục tiêu:** Cho thấy QC gắn mẻ, không phải cảm tính.

**Headline:** Chất lượng được ghi nhận theo mẻ — không phải cảm tính

**Subheadline:** Màu, mùi, vị, độ giòn — mỗi chỉ tiêu có người ghi, có mẻ gắn, có lịch sử

**Body:** QualityEvaluation gắn `maChien` và auto-fill `tiLe` từ FinishedProduct — đánh giá màu/mùi/vị/độ giòn theo thang chuẩn. InternalInspection cho kiểm tra nội bộ định kỳ. Mọi đánh giá đều truy nguyên được về mẻ chiên gốc.

**3 Proof Points:**

1. **Auto-fill tỉ lệ từ thành phẩm** — QualityEvaluation lấy `tiLe` tự động từ FinishedProduct — không nhập lại, không lệch số.
2. **Đánh giá đa chiều** — Màu, mùi, vị, độ giòn — mỗi chiều có thang điểm chuẩn, có người đánh giá và thời gian ghi nhận.
3. **Truy nguyên về mẻ** — Mọi phiếu QC đều gắn `maChien` — khi khách phàn nàn lô hàng, lần ngược về mẻ chiên trong phút.

**Visual:** Screenshot **QualityEvaluation** — crop vào form đánh giá và bảng lịch sử.

**Audience:** Factory / Quality Manager

**Elevator:** "Chất lượng không phải lời nói — là phiếu QC gắn mẻ, có điểm số, có người ký, truy nguyên được."

---

## Trang 10 — AI Assistant — AI hiểu ngữ cảnh xưởng

**Mục tiêu:** AI story — kể đúng, không nói quá (không claim autonomous).

**Headline:** AI hiểu ngữ cảnh xưởng — không phải chatbot chung chung

**Subheadline:** Hỏi bằng tiếng Việt tự nhiên — trả lời bằng quy trình thực, thao tác thực

**Body:** AI không phải chatbot độc lập — là lớp hỗ trợ vận hành hiểu department scope và quy trình ERP. Nhân viên hỏi bằng tiếng Việt, AI tra cứu 14 tài liệu vận hành qua RAG hybrid, hoặc thao tác trực tiếp qua 72-tool ReAct agent (có confirm cho write).

**Pipeline Visual (designer vẽ dạng horizontal pipeline, 8 bước, icon mỗi bước):**

```
ERP Knowledge (14 docs, department frontmatter)
  → Synonym Expansion
  → Dense (ChromaDB Vietnamese_Embedding_v2) + Sparse (BM25)
  → RRF Fusion (k=60)
  → Confidence Gate (0.32)
  → FlashRank Reranking
  → DeepSeek (OpenRouter) — grounded, CONTEXT-only
  → Faithfulness Check (LLM-as-judge)
  → Semantic Cache (0.95, scoped)
  → Response + Sources

+ ReAct Agent (72 tools, department RBAC, 5 iterations) — thao tác thực tế qua ERP API
```

**3 Proof Points:**

1. **Hybrid retrieval có evidence** — Dense (ChromaDB Vietnamese) + Sparse (BM25) → RRF (k=60) → FlashRank reranking — không chỉ vector search đơn thuần.
2. **Grounded + Faithfulness** — LLM chỉ trả lời từ CONTEXT, có faithfulness check (LLM-as-judge) — giảm hallucination, có sources đối chiếu.
3. **72-tool agent với guard** — ReAct agent thao tác thực tế (tạo YCBG, tra tồn kho…), department RBAC, max 5 iterations, write actions yêu cầu user confirm — không autonomous mù.

**Ghi chú "What we don't claim" (nhỏ, cuối trang, tone trung thực):** Agent cần confirm cho write, chưa streaming faithfulness parity, chưa fallback khi daily limit — đang cải thiện theo roadmap.

**Visual:** Pipeline diagram + screenshot **ChatWidget (67.9KB)** — crop vào khung chat với câu hỏi tiếng Việt và sources.

**Audience:** CEO ("giảm 30-50% câu hỏi lặp") + Manager ("không cần nhớ menu") + CTO ("hybrid retrieval, faithfulness, 72 tools")

**Elevator:** "Nhân viên hỏi 'quy trình tạo YCBG thế nào?' bằng tiếng Việt — AI trả lời từ SOP thực, có nguồn, và có thể tạo luôn YCBG nếu được confirm."

---

## Trang 11 — Face Kiosk — Khuôn mặt là thẻ chấm công

**Mục tiêu:** Physical-digital bridge — kể đúng, không claim FaceID phone-level.

**Headline:** Khuôn mặt là thẻ chấm công — 4 lớp chống giả mạo, học dần theo thời gian

**Subheadline:** Một tablet tại xưởng — chấm công không cần thẻ, không chấm hộ, không gian lận

**Body:** Kiosk đặt tại xưởng, công nhân đứng trước camera là chấm công — không cần thẻ từ, không lo chấm hộ. Hệ thống 4 lớp liveness chống giả mạo bằng ảnh/màn hình, adaptive gallery tự cải thiện theo thời gian, advisory lock chống duplicate khi nhiều người chấm cùng lúc.

**Pipeline Visual (designer vẽ dạng vertical, 7 bước):**

```
Physical World (xưởng, ca 3)
  → RetinaFace / Yunet Detection
  → ArcFace Embedding (512D)
  → 4-Layer Liveness (DeepFace + MiniFASNet + LBP + Temporal)
  → Voting Match (margin + threshold)
  → Attendance (advisory lock + dual cooldown)
  → Payroll / Timesheet
  → ERP
```

**4 Lớp Liveness (trình bày dạng 4 cards, mỗi card 1 lớp + threshold):**

1. **DeepFace anti_spoofing + MiniFASNet (0.5/0.5)** — `pass_ratio ≥ 0.65, avg ≥ 0.72` — phát hiện màn hình/ảnh in qua deep model.
2. **Frame Quality** — brightness 35-225, blur var > 12, area > 0.035 — loại frame tối/mờ/quá nhỏ.
3. **LBP Texture 128×128** — `avg ≥ 0.35` — phát hiện vân ảnh in/màn hình qua texture.
4. **Temporal** — bbox shift vs aligned 96×96 diff, flag `flat_motion` nếu `external ≥ 0.08 & diff ≤ 0.018` — phát hiện ảnh tĩnh.

**Final gate:** `0.5×anti + 0.2×temporal + 0.15×quality + 0.15×lbp ≥ 0.68`

**3 Proof Points:**

1. **Advisory lock chống duplicate** — Nhiều người chấm cùng lúc không tạo 2 bản ghi trùng — transaction + advisory lock ở `faceAttendanceService`.
2. **Adaptive gallery** — Gallery học dần theo thời gian, embedding mới làm giàu tập mẫu — càng dùng càng chính xác, không cần enroll lại.
3. **Chi phí thiết bị thấp** — Một tablet + device key — không cần đầu đọc vân tay/thẻ chuyên dụng, phù hợp 100-300 công nhân.

**Ghi chú trung thực (nhỏ, cuối trang):** Kiosk giá rẻ cho 100-300 CN, chưa PAD ISO 30107, không depth/IR sensor, chưa công bố FAR/FRR trên tập factory — không claim FaceID phone-level.

**Visual:** 4-layer diagram + screenshot **FaceKioskPage V2/V3 + FaceAdminPage** — crop vào kiosk UI và admin gallery.

**Audience:** CEO ("không chấm hộ") + Factory Manager ("kiosk tại xưởng") + CIO ("advisory lock, adaptive gallery")

**Elevator:** "Công nhân đứng trước tablet là chấm công — 4 lớp chống giả mạo, không chấm hộ được, và hệ thống tự học để càng dùng càng chính xác."

---

## Trang 12 — Technology — 5 Layers có chủ ý

**Mục tiêu:** Cho CTO/Partner thấy stack có chủ ý, không phải danh sách logo.

**Headline:** Không phải danh sách logo — là 5 layers có chủ ý

**Subheadline:** Mỗi layer một vai trò — từ trải nghiệm tới hạ tầng, production-hardened

**Body:** Stack được chọn có chủ ý cho single-VPS production: React SPA cho 46 pages, Express modular monolith cho 82 routes, PostgreSQL multi-schema cho 60+ entities, FastAPI cho AI, và Docker Compose + Nginx cho deploy.

**5 Layers (trình bày dạng stack vertical, mỗi layer 1 màu, icon + stack + vai trò):**

| Layer | Stack thực tế | Vai trò |
|-------|---------------|---------|
| **Experience** | React 18 + TypeScript + Vite 5 + TailwindCSS + TanStack Query + Recharts | SPA 46 pages, 70 hooks, query key factory, responsive |
| **Application** | Node 20 + Express 5 + Prisma 6 + Zod + Winston + ws + web-push | 82 routes, modular monolith, RBAC/ABAC, WS heartbeat |
| **Data** | PostgreSQL 16 (3 schemas, 60+ models, CUID) + Redis 7 (cache + RL, LRU 128M) | Multi-schema, transaction, advisory locks |
| **Intelligence** | FastAPI + DeepSeek (OpenRouter) + ChromaDB + FlashRank + ArcFace/MiniFASNet | RAG 14 docs + 72-tool agent + 4-layer face |
| **Infrastructure** | Docker Compose + Nginx (TLS 1.2/1.3, http2) + healthchecks + backup 3 lớp | Single-VPS production, 6-phase playbook |

**Visual:** Stack diagram 5 layers — mỗi layer một khối, mũi tên nối vertical.

**Audience:** CIO / Partner

**Elevator:** "Năm layers — mỗi layer một vai trò rõ ràng, không thừa, không thiếu — đủ để chạy production trên một VPS."

---

## Trang 13 — Architecture — Modular monolith

**Mục tiêu:** Cho CIO thấy kiến trúc có chủ ý (không phải microservices trá hình, không phải monolith lộn xộn).

**Headline:** Modular monolith — đơn giản để deploy, đủ sâu để scale

**Subheadline:** Một Express app, 82 slices — deploy một lần, mở rộng từng module

**Body:** Kiến trúc modular monolith có chủ ý: một Express app với 82 route groups đăng ký qua `ROUTE_MAP`, mỗi slice có service → controller → route riêng, multi-schema Prisma (auth/business/common), RBAC/ABAC với secondary departments, WebSocket cross-instance qua Postgres NOTIFY, Redis rate limiting spoof-proof.

**Infra Diagram (Mermaid — designer vẽ lại):**

```
Internet → Nginx (TLS 1.2/1.3, http2, rate limit)
  → Frontend (React SPA, :5173)
  → Backend (Express 5, :5000) → PostgreSQL 16 (3 schemas, CUID, advisory locks)
                              → Redis 7 (cache, RL, LRU 128M)
                              → AI Service (FastAPI, :8001) → ChromaDB + DeepSeek
  → WebSocket (ws, heartbeat, Postgres NOTIFY cross-instance)
  → Web Push (web-push, VAPID)
```

**3 Proof Points:**

1. **82 routes qua ROUTE_MAP** — Mọi route đăng ký tập trung tại `backend/src/routes/index.ts` — không route nào silently ignored, thêm module mới chỉ cần thêm entry.
2. **Multi-schema Prisma** — 3 schemas (auth/business/common), CUID ids, child tables không JSON columns — data integrity qua transaction parent+children.
3. **Cross-instance WebSocket** — Postgres NOTIFY cho WS cross-instance, advisory lock cho cron — sẵn sàng scale horizontal khi cần, dù hiện tại single-VPS.

**Visual:** Mermaid infra diagram — Nginx → Backend/Frontend → Postgres/Redis/AI.

**Audience:** CIO / Partner

**Elevator:** "Modular monolith — đơn giản như monolith khi deploy, tách bạch như microservices khi phát triển. 82 slices, một ROUTE_MAP, multi-schema."

---

## Trang 14 — Security — Thực tế, không khẩu hiệu

**Mục tiêu:** Tạo tin cậy bằng sự trung thực — nói những gì có, và những gì chưa.

**Headline:** Bảo vệ từ JWT tới kiện hàng — thực tế, không khẩu hiệu

**Subheadline:** Những gì đã có — và những gì chúng tôi không claim

**Body:** Bảo mật được xây theo lớp: JWT access/refresh, RBAC/ABAC với secondary departments, Redis rate limiting spoof-proof, helmet, CORS, AES-GCM cho face embeddings, audit log cho face/evaluation/login. Và chúng tôi nói rõ những gì chưa có.

**Security Table (2 cột — Đã có / Chưa có — tone trung thực là điểm mạnh):**

| Đã có (evidence) | Chưa claim (roadmap) |
|-------------------|----------------------|
| JWT access + refresh, role hierarchy ADMIN > HEAD > LEAD > EMPLOYEE | 2FA/MFA |
| RBAC/ABAC — secondary departments, 3 middlewares (authenticate → authorize → checkAccess) | WAF, vault secrets manager |
| Redis rate limiting spoof-proof (IP + user) | Pentest / SOC2 |
| Helmet, CORS (comma-separated origins), Zod validation | mTLS / service mesh (zero-trust) |
| AES-GCM encrypt face embeddings (FACE_DATA_SECRET) | Backup offsite encrypted (hiện local /backup) |
| Audit log: face / evaluation / login | Audit toàn diện mọi entity |
| Advisory locks cho attendance, face, cron | — |

**3 Proof Points:**

1. **RBAC/ABAC thực tế** — Không chỉ role — có secondary departments, checkDepartment/checkSubDepartment — nhân viên chỉ thấy dữ liệu phòng ban mình (trừ ADMIN bypass).
2. **Rate limiting không spoof được** — Redis RL dựa trên IP + user thực, không tin header `X-Forwarded-For` mù quáng.
3. **Face embeddings mã hóa** — AES-GCM với FACE_DATA_SECRET — embedding 512D không lưu plaintext trong DB.

**Visual:** Table 2 cột + icon khóa cho "Đã có", icon roadmap cho "Chưa claim" — tone trung thực, không che giấu.

**Audience:** CIO (tin cậy vì trung thực)

**Elevator:** "Chúng tôi nói rõ những gì đã bảo vệ — và những gì chưa — để bạn đánh giá đúng mức tin cậy."

---

## Trang 15 — Roadmap — Từ Integrated ERP → Smart Factory

**Mục tiêu:** Cho thấy lộ trình có cơ sở kỹ thuật, không phải wishlist.

**Headline:** Từ Integrated ERP → Smart Factory — lộ trình có cơ sở kỹ thuật

**Subheadline:** Mỗi phase xây trên nền đã production-hardened — không hứa viễn vông

**5 Phases (trình bày dạng timeline horizontal, mỗi phase 1 cột, phase hiện tại highlight):**

| Phase | Tên | Trạng thái | Nội dung chính |
|-------|-----|------------|----------------|
| **1** | **Integrated ERP** | ✅ Production | 82 routes, 60+ entities, warehouse kiện/FIFO, manufacturing maChien, HR/payroll — single-VPS, backup 3 lớp, 6-phase playbook |
| **2** | **AI-Assisted Operations** | 🔄 Đang hoàn thiện | RAG ≥100 QAs nightly RAGAS, streaming faithfulness parity, fallback khi daily limit, p95 dashboards + 72-tool agent hardening |
| **3** | **Data-Driven Factory** | 📋 Kế tiếp | Dashboard yield/Brix/OT, FAR/FRR công bố cho face, audit log toàn diện, backup offsite encrypted (S3) |
| **4** | **Smart Factory** | 🔮 Roadmap | Multi-site, IoT machine telemetry, predictive maintenance (ML trên dữ liệu sấy), mobile app |
| **5** | **Enterprise Platform** | 🔮 Tầm nhìn | Multi-company, marketplace integration, supply chain tài chính, API ecosystem cho partner |

**Hiện tại:** Single-VPS, single-site, single-company — đủ cho 1 nhà máy 100-300 công nhân. Multi-site/IoT là roadmap, không phải hiện tại.

**Visual:** Timeline 5 phases — phase 1-2 màu đậm (đã có/đang làm), phase 3-5 màu nhạt (roadmap).

**Audience:** CEO (thấy tầm nhìn) + CIO (thấy lộ trình kỹ thuật) + Partner (thấy cơ hội tích hợp phase 4-5)

**Elevator:** "Hôm nay là Integrated ERP production-hardened cho một nhà máy. Ngày mai là Smart Factory với IoT và predictive maintenance — mỗi phase xây trên nền đã vững."

---

## Trang 16 — CTA

**Mục tiêu:** Kêu gọi hành động — gặp trực tiếp, xem demo.

**Headline:** Gặp chúng tôi tại gian hàng — xem kiosk và mẻ chiên trực tiếp

**Subheadline:** Đừng chỉ đọc catalog — hãy chạm vào hệ thống đang chạy

**Body:** Tại gian hàng, chúng tôi demo trực tiếp: kiosk chấm công khuôn mặt, ChatWidget AI trả lời bằng tiếng Việt, và dashboard mẻ chiên với 8-grade yield. Mang theo câu hỏi về nhà máy của bạn — chúng tôi sẽ cho bạn thấy nó được số hóa như thế nào.

**CTA Blocks (3 cột):**

1. **Gặp trực tiếp** — Gian hàng [số] — [Tên triển lãm] — [Ngày] — Đội ngũ An Bình Foods + kỹ thuật có mặt cả ngày.
2. **Quét để xem thêm** — QR code → [URL demo / landing page / video 2 phút] — 5 screenshots teaser: MaterialEvaluation, FinishedProduct 8 grades, Warehouse kiện, ChatWidget, Dashboard1.
3. **Liên hệ** — [Email] | [Hotline] | [Website] — Đặt lịch demo riêng cho nhà máy của bạn — chúng tôi sẽ khảo sát quy trình sấy và tư vấn lộ trình số hóa.

**Visual:** QR lớn + 5 screenshots teaser nhỏ (dải ngang) + ảnh team/gian hàng nếu có.

**Audience:** Tất cả

**Elevator (30s cuối trước khi khách rời gian hàng):** "Mỗi mẻ chiên đều có dữ liệu. Mỗi kiện đều có vị trí. Mỗi công nhân đều có khuôn mặt làm thẻ. Và AI hiểu xưởng của bạn. Quét QR này — hoặc để lại thông tin, chúng tôi sẽ tới nhà máy của bạn."

---

## Phụ lục — Copy ngắn cho các ứng dụng khác

### Elevator Pitch 3 phút (sales học thuộc)

> **Phút 1 — Manufacturing DNA (30s):**
> "Mỗi mẻ chiên đều có dữ liệu — từ Brix ngâm tới 8 loại thành phẩm, truy vết một mã `maChien` xuyên 4 bảng, với ngày sản xuất 06:30 theo ca thực tế."
>
> **Phút 2 — Warehouse thực (30s):**
> "Kho không phải con số — là kiện K1.1, K1.2 với FIFO và capacity guard, phiếu BM01/BM03 multi-line, nhập kho thành phẩm bulk idempotent."
>
> **Phút 3 — AI + Face (60s) + demo trực tiếp (60s):**
> "Nhân viên hỏi AI bằng tiếng Việt tự nhiên — RAG hiểu phòng ban, agent thao tác 72 APIs; công nhân chấm công bằng khuôn mặt tại kiosk với 4 lớp chống giả mạo, học dần theo thời gian."
> Sau đó demo trực tiếp kiosk + ChatWidget tại gian hàng.

### Tagline cho backdrop / standee

- Sấy thông minh, quản lý liền mạch
- Từ mẻ chiên tới thành phẩm — mọi thứ được kết nối
- Mỗi mẻ chiên đều có dữ liệu

### Social / teaser post (ngắn, dùng trước triển lãm)

> ERP hiểu nhà máy sấy của bạn — không phải ERP chung chung.
> Truy vết mẻ chiên xuyên 4 bảng. Kho kiện FIFO tới K1.1. Kiosk khuôn mặt 4 lớp liveness. AI hỏi bằng tiếng Việt.
> Gặp chúng tôi tại [triển lãm] gian hàng [số] — xem kiosk và mẻ chiên trực tiếp.

### Danh sách screenshot cho designer (5 màn hình ưu tiên)

| # | Màn hình | File | Headline trên screenshot |
|---|----------|------|--------------------------|
| 1 | ProductionMaterialEvaluationEntry (66KB) | `frontend/src/pages/production/ProductionMaterialEvaluationEntry.tsx` | "Đánh giá nguyên liệu — Brix, nhiệt độ, từng mẻ chiên" |
| 2 | FinishedProduct (8 grades) | `frontend/src/components/FinishedProductManagement.tsx` | "8-grade yield — hiểu rõ từng phần của thành phẩm" |
| 3 | Warehouse — Lot/Slot/Kiện + BM01 | `frontend/src/components/WarehouseManagement.tsx` + `CreateWarehouseReceiptModal.tsx` | "Kiện là first-class — tồn kho là vị trí, không phải con số" |
| 4 | ChatWidget (67.9KB) | `frontend/src/components/ChatWidget.tsx` | "AI hiểu xưởng — hỏi bằng tiếng Việt, trả lời bằng quy trình thực" |
| 5 | Dashboard1 (55KB) | `frontend/src/pages/Dashboard1.tsx` | "Một cái nhìn — mọi vận hành" |

**Crop:** Vào table/form chính, bỏ sidebar/header chrome nếu có thể, giữ breadcrumb để thấy context. Headline đặt trên screenshot, không đè lên UI.

---

## Checklist bàn giao cho designer

- [ ] Chốt 1 headline cover + 1 subheadline + 1 slogan (mục đầu file)
- [ ] Ảnh xưởng sấy thực tế cho cover (không stock generic)
- [ ] Vẽ lại Business Flow (trang 4) và Manufacturing pipeline (trang 5) theo Mermaid trong file
- [ ] Vẽ AI pipeline 8 bước (trang 10) và Face pipeline 7 bước (trang 11)
- [ ] Vẽ 5 Layers stack (trang 12) và Infra diagram (trang 13)
- [ ] Chuẩn bị 5 screenshots đã crop theo gợi ý
- [ ] Security table 2 cột (trang 14) — giữ tone trung thực, không giấu "Chưa claim"
- [ ] Timeline 5 phases (trang 15) — phase 1-2 đậm, 3-5 nhạt
- [ ] QR + 5 teaser screenshots cho trang 16
- [ ] Kiểm tra không dùng claim cấm (mục 10 brief) ở bất kỳ trang nào
- [ ] In test 1 bản A4 để check cỡ chữ headline/body khi in offset

---

> **Ghi chú cuối:** File này là nội dung (copy) — designer dàn trang 12-16 trang theo narrative arc: Problem → Solution → Connected Operations → Manufacturing (2 trang) → Supply & Warehouse → Engineering → Quality → AI → Face → Technology → Architecture → Security → Roadmap → CTA. Mỗi trang 1 headline + 1 visual chính + 3 proof points. Tone evidence-first, hình xưởng thực + diagram kỹ thuật.
