# Presentation — ERP An Binh Foods

**Ngày:** 2026-08-21 | **Nguồn:** `docs/catalog-brief-2026-08-20.md` + `docs/catalog-content-2026-08-21.md` + `README.md` (branch `main`, audit evidence-first 2026-08-20)
**Mục đích:** Bài thuyết trình tại triển lãm / demo cho khách — dùng trực tiếp để dựng slide (PowerPoint / Google Slides)
**Thời lượng:** 15 phút thuyết trình + 5 phút demo trực tiếp + 5 phút Q&A (tổng 25 phút). Có phương án rút gọn 7 phút ở cuối file.
**Ngôn ngữ:** Tiếng Việt — headline có bản EN trong ngoặc để dùng khi khách quốc tế
**Tỉ lệ slide:** 16:9 | **Font gợi ý:** Inter / Be Vietnam Pro | **Tone:** Evidence-first, hình xưởng thực + diagram kỹ thuật

> Quy ước file này: Mỗi slide có `Headline`, `Nội dung trên slide` (copy-paste), `Visual`, `Lời dẫn` (nói gì — học thuộc), `Thời lượng` và `Ghi chú dựng slide`. Lời dẫn đã tính nhịp nói ~130 từ/phút.

---

## Tổng quan deck — 18 slides

| # | Slide | Thời lượng | Mục đích |
|---|-------|------------|----------|
| 1 | Cover | 0:00-0:30 | Ấn tượng đầu |
| 2 | Agenda | 0:30-1:00 | Cho biết sẽ nghe gì |
| 3 | The Problem | 1:00-2:30 | Đồng cảm — nỗi đau |
| 4 | The Solution | 2:30-3:30 | Tổng quan 5 pillars |
| 5 | Connected Operations | 3:30-4:30 | Dòng chảy dữ liệu |
| 6 | Manufacturing I — Mẻ chiên | 4:30-6:00 | Hero 1/2 |
| 7 | Manufacturing II — 8-grade yield | 6:00-7:00 | Hero 2/2 |
| 8 | Supply & Warehouse | 7:00-8:00 | Kiện/FIFO |
| 9 | Engineering | 8:00-8:45 | Bảo trì |
| 10 | Quality | 8:45-9:15 | QC theo mẻ |
| 11 | AI Assistant | 9:15-10:30 | AI story |
| 12 | Face Kiosk | 10:30-11:30 | Physical-digital |
| 13 | Technology — 5 Layers | 11:30-12:15 | Stack |
| 14 | Architecture | 12:15-13:00 | Modular monolith |
| 15 | Security | 13:00-13:45 | Trung thực |
| 16 | Roadmap | 13:45-14:30 | Lộ trình |
| 17 | CTA — Gặp tại gian hàng | 14:30-15:00 | Kêu gọi |
| 18 | Q&A / Demo | 15:00-25:00 | Demo trực tiếp |

---

## Slide 1 — Cover

**Headline:** Từ mẻ chiên tới thành phẩm — mọi thứ được kết nối
**EN:** From Fry Batch to Finished Goods — Everything Connected

**Trên slide:**
- Headline lớn (48-56pt)
- Subheadline: *Intelligent Manufacturing Platform cho nhà sản xuất trái cây sấy*
- Slogan lockup: **Sấy thông minh, quản lý liền mạch**
- Logo An Bình Foods (góc trên trái) + tên triển lãm / gian hàng số (góc dưới)

**Visual:** Ảnh xưởng sấy thực tế full-bleed, overlay tối 20-30% để chữ nổi. Không dùng stock generic.

**Lời dẫn (30s):**
> "Xin chào, chúng tôi là An Bình Foods. Hôm nay tôi sẽ kể câu chuyện về một nhà máy sấy chân không — nơi mỗi mẻ chiên đều có dữ liệu, mỗi kiện đều có vị trí, và AI thực sự hiểu xưởng của bạn. Đây không phải ERP chung chung — nó được xây cho quy trình sấy của chúng ta."

**Ghi chú dựng:** Một câu duy nhất trên slide — để khán giả nhìn ảnh xưởng 3 giây trước khi bạn nói.

---

## Slide 2 — Agenda

**Headline:** Hôm nay chúng ta sẽ đi qua gì?

**Trên slide (6 mục, dạng timeline ngang hoặc vertical steps, icon outline):**

1. Vấn đề — vì sao Excel không đủ
2. Giải pháp — 5 trụ cột
3. Dòng chảy — từ báo giá tới thành phẩm
4. Manufacturing — mẻ chiên & 8-grade yield (trọng tâm)
5. AI + Face — kiosk và trợ lý xưởng
6. Nền tảng — công nghệ, kiến trúc, bảo mật, lộ trình

**Lời dẫn (30s):**
> "15 phút — 6 phần. Tôi sẽ đi nhanh phần vấn đề, dành thời gian nhiều nhất cho manufacturing — vì đó là DNA khác biệt của hệ thống này — rồi tới AI và kiosk khuôn mặt mà lát nữa chúng ta sẽ demo trực tiếp tại gian hàng."

**Ghi chú dựng:** Không bullet dài — chỉ 6 label + icon. Người nghe cần biết "sắp nghe gì" trong 5 giây.

---

## Slide 3 — The Problem

**Headline:** Quản lý nhà máy sấy bằng Excel và giấy tờ — đã đến lúc thay đổi
**EN:** Managing a Drying Factory on Spreadsheets — Time for a Change

**Trên slide (3 cột, mỗi cột 1 icon + headline + 1 câu):**

| Cột 1 | Cột 2 | Cột 3 |
|-------|-------|-------|
| **Truy vết mẻ chiên thủ công** | **Tồn kho kiện không khớp** | **Chấm công gian lận & tốn công** |
| Mã mẻ ghi tay, không xuyên suốt. Truy nguyên lô lỗi mất ngày lần sổ. | Kho là con số tổng, không phải vị trí K1.1. FIFO phụ thuộc trí nhớ. | Chấm hộ, ghi tay, tổng hợp cuối tháng thủ công. |

**Visual:** 3 cột + dải ảnh nhỏ xám: sổ tay ghi mẻ / kệ kho kiện / máy chấm vân tay cũ.

**Lời dẫn (90s):**
> "Ba nỗi đau chúng tôi gặp ở xưởng trước khi có hệ thống này.
> Thứ nhất — mẻ chiên. Mỗi mẻ chiên qua ngâm, sấy, phân loại — nhưng mã mẻ ghi tay, không nối từ nguyên liệu tới thành phẩm. Khi khách phàn nàn một lô hàng, chúng ta mất cả ngày lần lại sổ để biết nó thuộc mẻ nào, dùng kiện nguyên liệu nào.
> Thứ hai — tồn kho. Kho trong Excel là một con số tổng. Nhưng thực tế kho là kiện K1.1, K1.2 nằm ở kệ nào, nhập khi nào. Không có FIFO thực, không có capacity guard — kiểm kê lệch liên tục.
> Thứ ba — chấm công. Chấm hộ là chuyện thường, tổng hợp cuối tháng thủ công, quản lý mất giờ đối chiếu và nhân sự thắc mắc bảng công.
> Nếu mẻ chiên không có dữ liệu xuyên suốt, mọi báo cáo sau đó đều thiếu gốc."

**Ghi chú dựng:** Tone trầm hơn các slide sau (nền xám nhạt). Chuyển sang nền sáng từ slide 4.

---

## Slide 4 — The Solution

**Headline:** Một nền tảng — mọi vận hành được kết nối
**EN:** One Platform — Every Operation Connected

**Trên slide:**

- Subheadline: *Không ghép nhiều phần mềm rời rạc. Một dòng chảy dữ liệu từ báo giá tới thành phẩm và nhân sự.*
- 5 pillars (dạng 5 cards, mỗi card icon + tên + 1 câu):

1. **Manufacturing Traceability** — `maChien` xuyên 4 bảng, 06:30 boundary, 8-grade yield, 4-stage drying
2. **Connected Operations** — QuotationCalculator → Order → Warehouse kiện/FIFO → Production → Quality → Invoice/Payroll
3. **AI-Assisted Enterprise** — RAG hybrid + 72-tool ReAct agent hiểu department scope
4. **Physical-Digital Bridge** — Kiosk ArcFace 4-layer liveness + adaptive gallery + advisory-lock attendance
5. **Extensible Foundation** — Modular monolith, multi-schema Prisma, RBAC/ABAC, WS+Web Push, Docker Compose

- Dải nhỏ dưới: 8 capability chips — Sales | Supply | Warehouse | Manufacturing | Quality | Equipment | HR | AI & Face

**Lời dẫn (60s):**
> "Giải pháp là một nền tảng duy nhất — không ghép nhiều phần mềm rời rạc.
> Năm trụ cột: truy vết mẻ chiên xuyên suốt, dòng chảy kết nối từ báo giá tới nhân sự, AI hiểu ngữ cảnh xưởng, kiosk khuôn mặt nối thế giới vật lý với dữ liệu ERP, và nền tảng modular sẵn sàng mở rộng.
> Tám nhóm năng lực bên dưới — nhưng hôm nay tôi sẽ kể sâu nhất về manufacturing, vì đó là nơi ERP này khác biệt hoàn toàn với phần mềm chung chung."

**Ghi chú dựng:** 5 cards đều nhau, không card nào to hơn — pillars ngang hàng. Dải 8 chips nhỏ, muted.

---

## Slide 5 — Connected Operations

**Headline:** Từ báo giá tới thành phẩm — một dòng chảy dữ liệu
**EN:** From Quotation to Finished Goods — One Data Flow

**Trên slide:**

- Horizontal flow diagram — 3 swim lanes (Sales/Supply | Warehouse/Production | HR), highlight `maChien` bằng màu nhấn:

```
InternationalCustomer → QuotationRequest → QuotationCalculator → Quotation (priceLocked)
  → Order (7 SX + 3 TT) → TaxReport
SupplyRequest → PurchaseRequest → Supplier
Warehouse → Lot → Slot (K1.1…) → LotProduct → BM01/BM03 (multi-line, transaction)
MaterialStandard → MaterialEvaluation (maChien, Brix) → SystemOperation (4 giai đoạn)
  → FinishedProduct (8 grades) → QualityEvaluation → ProductionReport
Employee → Attendance → Timesheet → Payroll (OT 1.5/2/3) → Evaluation
```

- 3 proof points nhỏ dưới diagram:

> **Giá hòa vốn có cơ sở** — định mức + chi phí chung + xuất khẩu, khóa giá trước khi gửi khách
> **Kho kiện là first-class** — Lot → Slot K1.1 → LotProduct, FIFO, capacity guard
> **Mẻ chiên là backbone** — `maChien` xuyên 4 bảng, boundary 06:30 theo ca thực tế

**Lời dẫn (60s):**
> "Dữ liệu chảy một mạch — không nhập lại.
> Khách quốc tế hỏi giá → hệ thống tính giá hòa vốn từ định mức và chi phí, khóa giá rồi mới gửi khách → thành đơn hàng → thu mua → kho kiện → mẻ chiên → sấy 4 giai đoạn → phân loại 8 grades → QC → hóa đơn → nhân sự.
> Điểm mấu chốt: một mã `maChien` nối suốt từ nguyên liệu tới thành phẩm. Và ngày sản xuất tính từ 06:30 theo ca thực tế — không phải 00:00 hệ thống — nên báo cáo khớp với ca xưởng."

**Ghi chú dựng:** Diagram là visual chính — chiếm 60% slide. Text chỉ 3 proof points nhỏ. Mũi tên `maChien` màu nhấn chạy xuyên diagram.

---

## Slide 6 — Manufacturing I — Mỗi mẻ chiên đều có câu chuyện dữ liệu

**Headline:** Mỗi mẻ chiên đều có câu chuyện dữ liệu ⭐ HERO
**EN:** Every Fry Batch Has a Data Story

**Trên slide:**

- Subheadline: *Từ Brix ngâm tới 4 giai đoạn sấy — truy vết một mã `maChien` xuyên suốt*
- Vertical pipeline (4 bước, icon mỗi bước):

```
MaterialStandard (định mức NL→TP)
  ↓
MaterialEvaluation — maChien, Brix, lotProductId → trừ kho (transaction)
  ↓
SystemOperation — 4 giai đoạn nhiệt/áp, gắn MachineSystem (HOAT_DONG guard)
  ↓
FinishedProduct — 8 grades + tiLe auto + daNhapKho → WarehouseReceipt bulk (idempotent)
```

- 3 proof points:

> **Trừ kho gắn mẻ** — trừ LotProduct cụ thể qua `lotProductId` trong transaction
> **4 giai đoạn sấy có guard** — chỉ vận hành khi MachineSystem ở HOAT_DONG
> **Ngày sản xuất 06:30** — khớp ca xưởng, báo cáo không lệch ngày

- Screenshot nhỏ: **ProductionMaterialEvaluationEntry** — crop vào form Brix/nhiệt độ/mã mẻ

**Lời dẫn (90s):**
> "Đây là phần khác biệt lớn nhất — manufacturing DNA.
> Mỗi mẻ chiên có một mã `maChien` duy nhất. Khi đánh giá nguyên liệu, chúng ta ghi Brix, nhiệt độ ngâm, và trừ kho không phải trừ chung — mà trừ đúng kiện LotProduct cụ thể qua `lotProductId` trong transaction. Biết chính xác kiện nào đã dùng cho mẻ nào.
> Tới sấy — 4 giai đoạn nhiệt/áp, mỗi giai đoạn có ngưỡng, và hệ thống chỉ cho phép vận hành khi máy ở trạng thái HOAT_DONG. Không sấy trên máy đang bảo trì.
> Và ngày sản xuất tính từ 06:30 — theo ca thực tế. Nghe nhỏ nhưng báo cáo sản lượng khớp với ca xưởng là nhờ chi tiết này.
> Không có mẻ nào là 'không rõ nguồn gốc'."

**Ghi chú dựng:** Slide hero — dành thời gian. Pipeline vertical chiếm 50% trái, screenshot + proof points 50% phải. Nói chậm, nhấn vào `maChien` và Brix.

---

## Slide 7 — Manufacturing II — 8-Grade Yield

**Headline:** 8-grade yield — hiểu rõ từng phần của thành phẩm ⭐ HERO
**EN:** 8-Grade Yield — Know Every Part of Your Output

**Trên slide:**

- Subheadline: *Không chỉ "bao nhiêu kg" — mà là A/B/B-Dầu/C/Vụn/Phế/Ướt, với tỉ lệ tự động*
- 8 grades — bar breakdown (màu đậm → nhạt):

| A (loại 1, giá cao nhất) | B | B-Dầu (đặc thù chiên chân không) | C | Vụn | Phế | Ướt (cần sấy lại) | (+1 theo cấu hình) |

- 3 proof points:

> **Tỉ lệ tự động** — `tiLe` = khối lượng grade / tổng mẻ, không tính tay
> **Nhập kho bulk idempotent** — `daNhapKho` guard, mỗi mẻ chỉ nhập một lần
> **Báo cáo chênh lệch KH/TT** — ProductionReport so sánh kế hoạch vs thực tế theo grade

- Screenshot nhỏ: **FinishedProduct + QualityEvaluation** — bảng yield và form QC

**Lời dẫn (60s):**
> "Thành phẩm không phải một con số tổng.
> Hệ thống phân loại 8 grades — A đẹp nhất giá cao nhất, B, B-Dầu đặc thù chiên chân không, C, vụn, phế, ướt cần sấy lại. Mỗi grade có tỉ lệ `tiLe` tính tự động — khối lượng grade chia tổng mẻ — không tính tay, không sai số nhập liệu.
> Nhập kho bulk có guard `daNhapKho` — mỗi mẻ chỉ nhập một lần, thao tác lại không trùng kiện.
> Và ProductionReport so sánh kế hoạch vs thực tế theo từng grade — biết ngay mẻ nào lệch, grade nào hao hụt. CEO nhìn vào đây là thấy tiền."

**Ghi chú dựng:** Bar breakdown là visual chính — mỗi grade một đoạn bar với label. Screenshot nhỏ góc dưới.

---

## Slide 8 — Supply & Warehouse

**Headline:** Kiện là first-class — tồn kho không còn là con số mơ hồ
**EN:** Package is First-Class — Inventory is a Location, Not a Number

**Trên slide:**

- Subheadline: *Mỗi kiện có vị trí K1.1, có FIFO, có capacity guard*
- Hierarchy diagram:

```
Warehouse → Lot (zone CAD) → Slot (K1.1, K1.2… K1.n, capacity guard)
  → LotProduct (soLuong, giaThanh) — FIFO K1.1 → K1.n
    → WarehouseReceipt BM01 / WarehouseIssue BM03 (multi-line, transaction, reorder hook)
```

- 3 proof points:

> **FIFO thực tế** — xuất K1.1 trước, hết mới tới K1.2
> **Capacity guard** — chặn khi vượt sức chứa slot
> **BM01/BM03 multi-line + reorder hook** — một phiếu nhiều dòng, tự gợi ý đặt lại khi tồn thấp

- Screenshot: **Warehouse + LotProduct + BM01** — bảng kiện và form phiếu

**Lời dẫn (60s):**
> "Kho không phải con số — là kiện K1.1 nằm ở đâu, nhập khi nào.
> Kho được mô hình tới cấp kiện: Warehouse tới Lot, tới Slot K1.1, K1.2 với capacity guard, tới LotProduct với số lượng và giá thành. Xuất kho lấy K1.1 trước — đúng FIFO, giảm tồn đọng. Slot đầy thì chặn — không nhồi vượt tải.
> Phiếu BM01 nhập / BM03 xuất là multi-line trong transaction — một phiếu nhiều dòng, và khi tồn dưới ngưỡng thì tự gợi ý đặt hàng lại."

**Ghi chú dựng:** Diagram hierarchy chiếm 50%. Nói nhấn vào "kiện là first-class" — đây là khác biệt vs ERP thường.

---

## Slide 9 — Engineering

**Headline:** Bảo trì không còn là phản ứng — là kế hoạch
**EN:** Maintenance is a Plan, Not a Reaction

**Trên slide:**

- Subheadline: *Từ hệ thống máy tới kế hoạch năm, tới fault KB và phụ tùng*
- Diagram:

```
MachineSystem (hierarchy, HOAT_DONG / BAO_TRI / HONG)
  → MaintenancePlan (kế hoạch năm, template-driven)
    → FaultRecord (ghi lỗi, tra KB) → SparePart (phụ tùng)
```

- 3 proof points:

> **Template-driven** — kế hoạch lặp theo năm, không tạo tay từng lần
> **Fault knowledge base** — lỗi tra từ KB tích lũy, thợ mới cũng biết cách xử
> **Gắn phụ tùng thực tế** — SparePart gắn fault & machine, biết đã thay gì

- Screenshot: **MachineSystem + MaintenancePlan + FaultRecord**

**Lời dẫn (45s):**
> "Máy không hỏng mới sửa — có kế hoạch.
> Mỗi MachineSystem có trạng thái, có kế hoạch bảo trì năm theo template — lặp tự động. Khi lỗi, FaultRecord ghi nhận và tra knowledge base — lỗi đã từng xảy ra thì thợ mới cũng biết cách xử. Và phụ tùng gắn với machine — biết đã thay gì, còn tồn bao nhiêu."

**Ghi chú dựng:** Slide ngắn — 45s. Không kể quá sâu, đây là module support cho manufacturing.

---

## Slide 10 — Quality

**Headline:** Chất lượng được ghi nhận theo mẻ — không phải cảm tính
**EN:** Quality Recorded per Batch — Not by Gut Feel

**Trên slide:**

- Subheadline: *Màu, mùi, vị, độ giòn — mỗi chỉ tiêu có người ghi, có mẻ gắn, có lịch sử*
- 3 proof points:

> **Auto-fill tỉ lệ** — QualityEvaluation lấy `tiLe` tự động từ FinishedProduct
> **Đánh giá đa chiều** — màu/mùi/vị/độ giòn, thang điểm chuẩn, có người ký
> **Truy nguyên về mẻ** — mọi phiếu QC gắn `maChien`, lần ngược trong phút

- Screenshot: **QualityEvaluation** — form đánh giá và bảng lịch sử

**Lời dẫn (30s):**
> "Chất lượng không phải lời nói — là phiếu QC gắn mẻ.
> QualityEvaluation auto-fill tỉ lệ từ thành phẩm — không nhập lại. Đánh giá màu, mùi, vị, độ giòn theo thang chuẩn, có người ký và thời gian. Khi khách phàn nàn lô hàng, lần ngược về mẻ chiên trong phút — vì mọi phiếu QC đều gắn `maChien`."

**Ghi chú dựng:** Slide ngắn nhất — 30s. Screenshot QC là visual chính.

---

## Slide 11 — AI Assistant

**Headline:** AI hiểu ngữ cảnh xưởng — không phải chatbot chung chung
**EN:** AI That Understands the Factory Floor

**Trên slide:**

- Subheadline: *Hỏi bằng tiếng Việt tự nhiên — trả lời bằng quy trình thực, thao tác thực*
- Pipeline diagram (horizontal, 8 bước, icon mỗi bước):

```
14 docs (department frontmatter) → Synonym Expansion
  → Dense (ChromaDB Vietnamese) + Sparse (BM25) → RRF (k=60)
  → Confidence Gate (0.32) → FlashRank Reranking
  → DeepSeek (OpenRouter, CONTEXT-only) → Faithfulness Check (LLM-as-judge)
  → Semantic Cache (0.95, scoped) → Response + Sources
+ ReAct Agent (72 tools, department RBAC, 5 iter) — thao tác thực qua ERP API
```

- 3 proof points:

> **Hybrid retrieval** — Dense + Sparse → RRF k=60 → FlashRank reranking
> **Grounded + Faithfulness** — chỉ trả lời từ CONTEXT, có LLM-as-judge
> **72-tool agent với guard** — department RBAC, max 5 iter, write cần confirm

- Screenshot: **ChatWidget** — khung chat với câu hỏi tiếng Việt và sources

**Lời dẫn (75s):**
> "AI không phải chatbot độc lập — là lớp hỗ trợ vận hành.
> Nhân viên hỏi bằng tiếng Việt tự nhiên — 'quy trình tạo YCBG thế nào?' — hệ thống tra 14 tài liệu vận hành qua pipeline hybrid: Dense Vietnamese embedding cộng BM25 sparse, fusion bằng RRF k=60, qua confidence gate 0.32, FlashRank reranking, rồi DeepSeek chỉ trả lời từ CONTEXT — có faithfulness check bằng LLM-as-judge để giảm hallucination, và semantic cache scoped.
> Ngoài tra cứu, ReAct agent có 72 tools để thao tác thực tế — tạo YCBG, tra tồn kho, xem đơn hàng — nhưng có guard: hiểu department scope, tối đa 5 iterations, và mọi write action đều yêu cầu user confirm. Không autonomous mù.
> CEO quan tâm: giảm 30-50% câu hỏi lặp cho quản lý. Manager: không cần nhớ menu, hỏi là ra. CTO: hybrid retrieval, faithfulness, 72-tool function calling — production, không phải demo."

**Ghi chú dựng:** Pipeline là visual chính — vẽ dạng flow ngang với icon. Screenshot ChatWidget góc dưới. Đừng claim "fully autonomous" — nói rõ cần confirm.

---

## Slide 12 — Face Kiosk

**Headline:** Khuôn mặt là thẻ chấm công — 4 lớp chống giả mạo, học dần theo thời gian
**EN:** Face is the Badge — 4-Layer Anti-Spoofing

**Trên slide:**

- Subheadline: *Một tablet tại xưởng — không cần thẻ, không chấm hộ, không gian lận*
- Pipeline (vertical, 7 bước):

```
Physical World (xưởng, ca 3) → RetinaFace/Yunet Detection → ArcFace Embedding (512D)
  → 4-Layer Liveness → Voting Match → Attendance (advisory lock + dual cooldown) → Payroll/Timesheet → ERP
```

- 4 lớp liveness (4 cards):

| 1. DeepFace + MiniFASNet (0.5/0.5) — pass_ratio≥0.65, avg≥0.72 | 2. Frame Quality — brightness 35-225, blur>12, area>0.035 |
| 3. LBP Texture 128×128 — avg≥0.35 | 4. Temporal — bbox shift vs 96×96 diff, flag flat_motion |

Final gate: `0.5×anti + 0.2×temporal + 0.15×quality + 0.15×lbp ≥ 0.68`

- 3 proof points:

> **Advisory lock** — nhiều người chấm cùng lúc không duplicate
> **Adaptive gallery** — càng dùng càng chính xác, không cần enroll lại
> **Chi phí thấp** — một tablet + device key cho 100-300 CN

- Screenshot: **FaceKioskPage V2/V3 + FaceAdminPage**

**Lời dẫn (60s):**
> "Kiosk đặt tại xưởng — công nhân đứng trước camera là chấm công. Không cần thẻ từ, không lo chấm hộ.
> 4 lớp liveness: DeepFace và MiniFASNet phát hiện màn hình/ảnh in, frame quality loại ảnh tối/mờ, LBP texture phát hiện vân ảnh in, và temporal phát hiện ảnh tĩnh. Bốn lớp cộng lại qua gate 0.68 mới cho qua.
> Nhiều người chấm cùng lúc không tạo duplicate — nhờ advisory lock. Gallery tự học dần — càng dùng càng chính xác. Và chi phí chỉ một tablet — phù hợp 100-300 công nhân.
> Lưu ý trung thực: đây là kiosk giá rẻ, chưa PAD ISO 30107, không depth sensor — chúng tôi không claim FaceID phone-level. Nhưng cho 100-300 CN tại xưởng thì đây là giải pháp thực tế và đã production."

**Ghi chú dựng:** 4 cards liveness là visual chính. Pipeline vertical bên trái. Nói rõ "không claim FaceID" — trung thực là điểm mạnh.

---

## Slide 13 — Technology — 5 Layers

**Headline:** Không phải danh sách logo — là 5 layers có chủ ý
**EN:** Not a Logo Soup — Five Layers with Intent

**Trên slide (5 khối stack vertical, mỗi khối màu + icon):**

| Layer | Stack | Vai trò |
|-------|-------|---------|
| **Experience** | React 18 + TS + Vite 5 + TailwindCSS + TanStack Query + Recharts | SPA 46 pages, 70 hooks, query key factory |
| **Application** | Node 20 + Express 5 + Prisma 6 + Zod + Winston + ws + web-push | 82 routes, modular monolith, RBAC/ABAC |
| **Data** | PostgreSQL 16 (3 schemas, 60+ models, CUID) + Redis 7 (LRU 128M) | Multi-schema, transaction, advisory locks |
| **Intelligence** | FastAPI + DeepSeek + ChromaDB + FlashRank + ArcFace/MiniFASNet | RAG 14 docs + 72-tool agent + 4-layer face |
| **Infrastructure** | Docker Compose + Nginx (TLS 1.2/1.3, http2) + healthchecks + backup 3 lớp | Single-VPS production, 6-phase playbook |

**Lời dẫn (45s):**
> "Stack được chọn có chủ ý cho single-VPS production — không thừa, không thiếu.
> Experience là React SPA 46 pages. Application là Express modular monolith 82 routes. Data là Postgres 3 schemas với advisory locks. Intelligence là FastAPI cho RAG và face. Infrastructure là Docker Compose với Nginx và backup 3 lớp.
> Mỗi layer một vai trò rõ ràng — kể theo layers, không liệt kê logo."

**Ghi chú dựng:** Stack vertical — mỗi layer một khối, mũi tên nối. Không đặt logo công nghệ to — chỉ tên stack.

---

## Slide 14 — Architecture

**Headline:** Modular monolith — đơn giản để deploy, đủ sâu để scale
**EN:** Modular Monolith — Simple to Deploy, Deep Enough to Scale

**Trên slide:**

- Subheadline: *Một Express app, 82 slices — deploy một lần, mở rộng từng module*
- Infra diagram:

```
Internet → Nginx (TLS 1.2/1.3, http2, rate limit)
  → Frontend (React SPA, :5173)
  → Backend (Express 5, :5000) → PostgreSQL 16 (3 schemas, CUID, advisory locks)
                              → Redis 7 (cache, RL, LRU 128M)
                              → AI Service (FastAPI, :8001) → ChromaDB + DeepSeek
  → WebSocket (ws, heartbeat, Postgres NOTIFY cross-instance)
  → Web Push (web-push, VAPID)
```

- 3 proof points:

> **82 routes qua ROUTE_MAP** — đăng ký tập trung tại `routes/index.ts`, không route nào silently ignored
> **Multi-schema Prisma** — auth/business/common, CUID, child tables không JSON
> **Cross-instance ready** — Postgres NOTIFY cho WS, advisory lock cho cron — sẵn sàng scale horizontal

**Lời dẫn (45s):**
> "Kiến trúc modular monolith có chủ ý — không phải microservices trá hình, cũng không phải monolith lộn xộn.
> Một Express app với 82 route groups đăng ký qua ROUTE_MAP — thêm module mới chỉ cần thêm entry, không route nào bị bỏ sót. Multi-schema Prisma 3 schemas, CUID ids, child tables không JSON columns — data integrity qua transaction.
> Và dù hiện tại single-VPS, WebSocket đã dùng Postgres NOTIFY cho cross-instance, cron có advisory lock — sẵn sàng scale horizontal khi cần."

**Ghi chú dựng:** Diagram là visual chính. Nói nhấn vào "có chủ ý" — modular monolith là lựa chọn, không phải vì chưa làm microservices.

---

## Slide 15 — Security

**Headline:** Bảo vệ từ JWT tới kiện hàng — thực tế, không khẩu hiệu
**EN:** From JWT to Packages — Practical, Not Slogans

**Trên slide (2 cột — Đã có / Chưa claim — tone trung thực là điểm mạnh):**

| Đã có (evidence) | Chưa claim (roadmap) |
|-------------------|----------------------|
| JWT access + refresh, role hierarchy ADMIN > HEAD > LEAD > EMPLOYEE | 2FA/MFA |
| RBAC/ABAC — secondary departments, 3 middlewares | WAF, vault |
| Redis RL spoof-proof (IP + user) | Pentest / SOC2 |
| Helmet, CORS, Zod validation | mTLS / zero-trust |
| AES-GCM encrypt face embeddings | Backup offsite encrypted (hiện local /backup) |
| Audit log: face / evaluation / login | Audit toàn diện |
| Advisory locks (attendance, face, cron) | — |

- 3 proof points:

> **RBAC/ABAC thực tế** — secondary departments, không chỉ role
> **RL không spoof được** — không tin `X-Forwarded-For` mù quáng
> **Face embeddings mã hóa** — AES-GCM, không plaintext trong DB

**Lời dẫn (45s):**
> "Bảo mật chúng tôi kể bằng sự trung thực — nói những gì đã có, và những gì chưa.
> Đã có: JWT, RBAC/ABAC với secondary departments, Redis rate limiting không spoof được, helmet, CORS, AES-GCM cho face embeddings, audit log cho face/evaluation/login.
> Chưa claim: 2FA, WAF, pentest/SOC2, zero-trust, backup offsite encrypted — đó là roadmap. Chúng tôi không nói 'enterprise-grade' hay 'military-grade' khi chưa có evidence.
> Trung thực là cách tạo tin cậy với CTO."

**Ghi chú dựng:** 2 cột với icon khóa (Đã có) và icon roadmap (Chưa claim). Đừng giấu cột phải — chính cột phải tạo tin cậy.

---

## Slide 16 — Roadmap

**Headline:** Từ Integrated ERP → Smart Factory — lộ trình có cơ sở kỹ thuật
**EN:** From Integrated ERP to Smart Factory — A Grounded Roadmap

**Trên slide (timeline 5 phases, phase hiện tại highlight):**

| Phase 1 ✅ Production | Phase 2 🔄 Đang hoàn thiện | Phase 3 📋 Kế tiếp | Phase 4 🔮 Roadmap | Phase 5 🔮 Tầm nhìn |
|---|---|---|---|---|
| **Integrated ERP** — 82 routes, 60+ entities, kiện/FIFO, maChien, HR/payroll, single-VPS, backup 3 lớp, 6-phase playbook | **AI-Assisted Operations** — RAG ≥100 QAs RAGAS, streaming faithfulness parity, fallback daily limit, p95 dashboards, 72-tool hardening | **Data-Driven Factory** — Dashboard yield/Brix/OT, FAR/FRR face, audit toàn diện, backup S3 encrypted | **Smart Factory** — Multi-site, IoT telemetry, predictive maintenance (ML trên dữ liệu sấy), mobile app | **Enterprise Platform** — Multi-company, marketplace, supply chain tài chính, API ecosystem |

- Dòng nhỏ dưới: *Hiện tại: single-VPS, single-site, single-company — đủ cho 1 nhà máy 100-300 CN. Multi-site/IoT là roadmap.*

**Lời dẫn (45s):**
> "Lộ trình 5 phases — mỗi phase xây trên nền đã vững.
> Hôm nay chúng ta ở phase 1 — Integrated ERP production-hardened — và đang hoàn thiện phase 2 AI-Assisted. Phase 3 là data-driven với dashboard và FAR/FRR. Phase 4 là Smart Factory với IoT và predictive maintenance. Phase 5 là Enterprise Platform cho partner ecosystem.
> Hiện tại single-VPS cho một nhà máy 100-300 người — đủ và đã production. Multi-site, IoT là roadmap có cơ sở kỹ thuật — không phải wishlist."

**Ghi chú dựng:** Timeline ngang — phase 1-2 màu đậm, 3-5 màu nhạt dần. Dòng "Hiện tại" nhỏ nhưng rõ.

---

## Slide 17 — CTA

**Headline:** Gặp chúng tôi tại gian hàng — xem kiosk và mẻ chiên trực tiếp
**EN:** Meet Us at the Booth — See the Kiosk and Batches Live

**Trên slide (3 cột):**

| Gặp trực tiếp | Quét để xem thêm | Liên hệ |
|---------------|------------------|---------|
| Gian hàng [số] — [Tên triển lãm] — [Ngày] — Đội ngũ An Bình Foods + kỹ thuật có mặt cả ngày | QR lớn → [URL demo / landing / video 2 phút] + dải 5 screenshots teaser nhỏ | [Email] | [Hotline] | [Website] — Đặt lịch demo riêng, chúng tôi tới nhà máy của bạn khảo sát quy trình sấy |

- Slogan lặp lại nhỏ: *Mỗi mẻ chiên đều có dữ liệu. Mỗi kiện đều có vị trí. Mỗi công nhân đều có khuôn mặt làm thẻ.*

**Lời dẫn (30s):**
> "Đừng chỉ đọc catalog — hãy chạm vào hệ thống đang chạy.
> Tại gian hàng chúng tôi demo trực tiếp kiosk khuôn mặt, ChatWidget AI tiếng Việt, và dashboard mẻ chiên 8-grade yield. Quét QR này để xem 5 screenshots, hoặc để lại thông tin — chúng tôi sẽ tới nhà máy của bạn khảo sát quy trình sấy và tư vấn lộ trình số hóa.
> Cảm ơn — và mời mọi người qua gian hàng ngay sau phần này để xem demo trực tiếp."

**Ghi chú dựng:** QR lớn, 5 screenshots teaser dải ngang nhỏ. Thông tin liên hệ rõ ràng — người chụp ảnh slide là chụp slide này.

---

## Slide 18 — Q&A / Demo

**Headline:** Hỏi & Đáp — Demo trực tiếp
**EN:** Q&A — Live Demo

**Trên slide:**

- Headline + 3 gợi ý câu hỏi để phá băng (nếu không ai hỏi):

> 1. "Brix và 8-grade yield được tính thế nào trong hệ thống?"
> 2. "Kiosk face hoạt động ở xưởng bụi/ánh sáng kém ra sao?"
> 3. "Triển khai cho nhà máy 200 người mất bao lâu?"

- Visual: Ảnh kiosk tại xưởng + ChatWidget + Dashboard — teaser cho demo sắp diễn ra

**Lời dẫn demo (5 phút, sau Q&A hoặc song song):**

> **Demo 1 — Kiosk (2 phút):** Đứng trước tablet, chấm công trực tiếp — cho thấy 4-layer liveness (giơ ảnh in để thấy bị chặn nếu có thể demo).
> **Demo 2 — ChatWidget (2 phút):** Hỏi "quy trình tạo YCBG thế nào?" bằng tiếng Việt — cho thấy sources và department-scoped answer. Thử tạo YCBG qua agent (confirm flow).
> **Demo 3 — Dashboard mẻ chiên (1 phút):** Mở Dashboard1 và FinishedProduct 8-grade breakdown — cho thấy maChien xuyên suốt.

**Ghi chú dựng:** Slide Q&A để trống nhiều — không nhồi text. 3 câu hỏi gợi ý nhỏ, muted — để người dẫn tự phá băng nếu im lặng.

---

## Phụ lục A — Phương án rút gọn 7 phút (khi chỉ có 7 phút)

Dùng khi được báo "chỉ có 7 phút" — giữ 8 slides:

| # | Slide | Thời lượng |
|---|-------|------------|
| 1 | Cover | 30s |
| 3 | The Problem (rút 1 phút) | 60s |
| 4 | The Solution (5 pillars) | 45s |
| 6+7 | Manufacturing I+II gộp 1 slide (pipeline + 8 grades) | 90s |
| 11+12 | AI + Face gộp 1 slide (pipeline 2 bên) | 75s |
| 13+14 | Technology + Architecture gộp 1 slide (5 layers + infra) | 45s |
| 16 | Roadmap (5 phases) | 30s |
| 17 | CTA | 15s |

**Lời dẫn rút gọn (7 phút) — học thuộc bản này riêng:**
> "30s cover — 60s nỗi đau — 45s 5 pillars — 90s mẻ chiên và 8 grades là hero — 75s AI và kiosk — 45s stack và kiến trúc — 30s roadmap — 15s CTA. Mỗi phần một câu elevator, không kể proof points chi tiết."

---

## Phụ lục B — Elevator Pitch 3 phút (thuộc lòng, dùng khi khách chỉ dừng 3 phút tại gian hàng)

> **Phút 1 — Manufacturing DNA (60s):**
> "Mỗi mẻ chiên đều có dữ liệu — từ Brix ngâm tới 8 loại thành phẩm, truy vết một mã `maChien` xuyên 4 bảng, với ngày sản xuất 06:30 theo ca thực tế. Brix và nhiệt độ ngâm được ghi khi đánh giá nguyên liệu, trừ đúng kiện kho qua transaction, sấy 4 giai đoạn có guard máy HOAT_DONG, và ra 8 grades với tỉ lệ tự tính."
>
> **Phút 2 — Warehouse thực (45s):**
> "Kho không phải con số — là kiện K1.1, K1.2 với FIFO và capacity guard, phiếu BM01/BM03 multi-line trong transaction, nhập kho thành phẩm bulk idempotent qua `daNhapKho`."
>
> **Phút 3 — AI + Face (75s) + mời demo (30s):**
> "Nhân viên hỏi AI bằng tiếng Việt — RAG hybrid Dense+BM25→RRF→FlashRank, grounded CONTEXT-only, faithfulness check, 72-tool agent thao tác thực tế qua ERP API với department scope và write confirm. Công nhân chấm công bằng khuôn mặt tại kiosk — 4 lớp liveness, advisory lock, adaptive gallery, một tablet cho 100-300 CN."
> "Mời anh/chị qua đây xem kiosk và ChatWidget trực tiếp — 2 phút là thấy."

---

## Phụ lục C — Checklist dựng slide

- [ ] Chốt headline cover (1 trong 5 phương án) + subheadline + slogan trước khi dựng
- [ ] Ảnh xưởng sấy thực tế cho cover (không stock generic) — full-bleed, overlay 20-30%
- [ ] Vẽ Business Flow (slide 5) theo Mermaid trong file — 3 swim lanes, highlight `maChien`
- [ ] Vẽ Manufacturing pipeline vertical (slide 6) + bar 8 grades (slide 7)
- [ ] Vẽ Warehouse hierarchy (slide 8) + Engineering diagram (slide 9)
- [ ] Vẽ AI pipeline 8 bước (slide 11) + Face pipeline 7 bước + 4 cards liveness (slide 12)
- [ ] Vẽ 5 Layers stack (slide 13) + Infra diagram (slide 14)
- [ ] Security 2 cột (slide 15) — giữ tone trung thực, không giấu "Chưa claim"
- [ ] Timeline 5 phases (slide 16) — phase 1-2 đậm, 3-5 nhạt
- [ ] Chuẩn bị 5 screenshots đã crop: MaterialEvaluation, FinishedProduct 8 grades, Warehouse BM01, ChatWidget, Dashboard1
- [ ] QR + 5 teaser screenshots cho slide 17 — test QR scan được khi chiếu projector
- [ ] Kiểm tra không dùng claim cấm (mục 10 brief) ở bất kỳ slide nào
- [ ] Chạy thử full 15 phút với timer — slide 6-7 (hero) không được rush
- [ ] Chuẩn bị bản rút gọn 7 phút (phụ lục A) trong cùng file — ẩn slides thừa khi cần
- [ ] In handout 2 slides/page cho khách mang về (optional)

---

## Phụ lục D — Ghi chú cho người thuyết trình

**Nhịp nói:** ~130 từ/phút — lời dẫn mỗi slide đã tính theo nhịp này. Đừng nói nhanh hơn khi tới slide hero (6-7).

**Tương tác:**
- Slide 3 (Problem) — hỏi "Ở nhà máy mình có gặp tình huống truy mẻ mất cả ngày không?" để kéo khách vào.
- Slide 6-7 (Manufacturing) — dừng 2s sau câu "Không có mẻ nào là không rõ nguồn gốc." để nhấn.
- Slide 11-12 (AI/Face) — nói "lát nữa demo trực tiếp" để giữ khách tới slide 18.

**Khi bị hỏi khó:**
- "Có predictive maintenance không?" → "Hiện tại schedule-based theo template, chưa ML — phase 4 roadmap là predictive trên dữ liệu sấy."
- "Face chính xác bao nhiêu %?" → "Chưa công bố FAR/FRR trên tập factory — phase 3 sẽ công bố. Hiện tại kiosk giá rẻ cho 100-300 CN với 4 lớp liveness, không claim FaceID phone-level."
- "Microservices à?" → "Modular monolith có chủ ý — 82 slices trên một Express app, một DB. Deploy đơn giản, phát triển tách bạch. Cross-instance ready khi cần scale."
- "Backup offsite chưa?" → "Hiện local /backup 3 lớp, chưa S3 encrypted — roadmap phase 3. Playbook 6-phase và healthchecks đã production-hardened cho single-VPS."

**Chuẩn bị demo:**
- Kiosk tablet sạc đầy, đã enroll 2-3 khuôn mặt test, test 4-layer liveness trước giờ G.
- ChatWidget mở sẵn với câu hỏi mẫu "quy trình tạo YCBG thế nào?" — test RAG trả lời được.
- Dashboard1 và FinishedProduct mở sẵn tab — không mất thời gian gõ URL khi demo.

---

> **Ghi chú cuối:** File này là nội dung thuyết trình — người dựng slide copy headline + nội dung + visual spec trực tiếp. Lời dẫn là để người nói học thuộc, không đưa lên slide. Tổng 15 phút nói + 5 phút demo + 5 phút Q&A = 25 phút. Có bản rút gọn 7 phút ở phụ lục A khi thời lượng bị cắt.
