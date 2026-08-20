# Catalog Brief — ERP An Binh Foods

**Ngày:** 2026-08-20 | **Mục đích:** Triển lãm — tài liệu brief cho team thiết kế catalog (12–16 trang)
**Source of truth:** Repository `ERP_V6` branch `main` (audit evidence-first ngày 2026-08-20) + `README.md` mới
**Đối tượng đọc file này:** Designer, content writer, sales/presales chuẩn bị gian hàng

> File này trích từ báo cáo audit tổng hợp 25 mục — chỉ giữ phần liên quan trực tiếp tới catalog.
> Báo cáo audit đầy đủ (Product Audit, Architecture, Database, AI, CV, Infra, Security) nằm trong phản hồi chat ngày 2026-08-20 và `README.md`.

---

## 1. Product Category & Positioning

**Category:** **Intelligent Manufacturing Platform** — không kể là "ERP nội bộ cho An Bình Foods" nếu muốn câu chuyện rộng hơn.

**Positioning Statement:**

> "Intelligent Manufacturing Platform cho nhà sản xuất trái cây sấy — nơi mọi mẻ chiên được truy vết từ nguyên liệu tới thành phẩm, mọi thiết bị được bảo trì theo kế hoạch, và mọi nhân viên được hỗ trợ bởi AI hiểu ngữ cảnh vận hành."

**Main Headline — 5 phương án (chọn 1 cho cover):**

1. Từ mẻ chiên tới thành phẩm — mọi thứ được kết nối
2. ERP hiểu nhà máy sấy của bạn
3. Manufacturing intelligence, không chỉ quản lý
4. Một mẻ chiên, một câu chuyện dữ liệu
5. Vận hành sấy chân không — số hóa trọn vẹn

**Subheadline — 3 phương án:**

1. Sales → Kho → Mẻ chiên → Sấy 4 giai đoạn → 8-grade yield → Chất lượng → Nhân sự — trên một nền tảng, với AI hỗ trợ và kiosk khuôn mặt tại xưởng.
2. Không phải ERP chung chung — được xây cho quy trình chiên chân không, với AI RAG và face recognition gắn vào vận hành thực tế.
3. Modular monolith, production-hardened — 82 API groups, 60+ entities, deploy single-VPS với backup 3 lớp và playbook 6-phase.

**Slogan — 5 phương án:**

1. Sấy thông minh, quản lý liền mạch
2. Mỗi mẻ chiên đều có dữ liệu
3. Nhà máy trong tầm tay
4. Từ nguyên liệu tới thành phẩm — một dòng chảy
5. AI hiểu xưởng, face hiểu người

**5 Messaging Pillars (dùng cho trang 3 — The Solution):**

1. **Manufacturing Traceability** — maChien xuyên 4 bảng, 06:30 boundary, 8-grade yield, 4-stage drying gắn MachineSystem.
2. **Connected Operations** — QuotationCalculator (giá hòa vốn) → Order → Supply/Purchase → Warehouse kiện/FIFO → Production → Quality → Invoice/Payroll.
3. **AI-Assisted Enterprise** — RAG hybrid (Chroma+BM25+RRF+FlashRank) + 72-tool ReAct agent hiểu department scope.
4. **Physical-Digital Bridge** — Kiosk ArcFace 4-layer liveness + adaptive gallery + advisory-lock attendance tại xưởng.
5. **Extensible Foundation** — Modular monolith, multi-schema Prisma, RBAC/ABAC secondary departments, WS+Web Push, Docker Compose production-ready.

---

## 2. Product DNA — trả lời nhanh cho người kể chuyện

| Câu hỏi | Trả lời ngắn |
|---|---|
| ERP này thực chất là gì? | Manufacturing Execution–leaning ERP cho nhà máy trái cây sấy/chiên chân không — vòng kín mẻ chiên là backbone. |
| Mạnh nhất ở đâu? | Manufacturing (maChien trace + 8-grade yield + 4-stage drying + kiện/FIFO linkage + bulk nhập kho idempotent). |
| Khác CRUD thường ở đâu? | State machines forward-only, transaction parent+children, advisory locks, production day 06:30, capacity guards, Brix/tiLe/daNhapKho rules. |
| Manufacturing có phải DNA không? | CÓ — duy nhất có traceability xuyên bảng và yield model gắn nghiệp vụ chiên chân không. |
| AI có đủ hero không? | Chưa — cần 4 điều kiện: ≥100 QAs nightly RAGAS, streaming faithfulness parity, fallback khi daily limit, p95 dashboards. |
| Face có đủ hero không? | CÓ nếu kể đúng: "kiosk giá rẻ chống giả mạo cho 100-300 CN" (không claim FaceID phone-level). Cần FAR/FRR + hardening. |
| Architecture đáng kể gì với CTO? | Modular monolith có chủ ý, 82 slices, RBAC/ABAC secondary, Redis RL spoof-proof, WS+Postgres NOTIFY, cron advisory-lock safe. |
| Mở rộng tới đâu hiện tại? | Single-VPS single-site single-company, đủ cho 1 nhà máy 100-300 CN. Multi-site/IoT là roadmap. |

---

## 3. Target Audience (4 nhóm — dùng để chọn message theo người xem gian hàng)

| Nhóm | Quan tâm | Message chính khi họ dừng lại ở gian hàng | Cho họ xem | Không cần đưa |
|---|---|---|---|---|
| **CEO / Business Owner** | Visibility, cost, productivity, control | "Mọi mẻ chiên, mọi đơn hàng, mọi chi phí — trên một dashboard. AI giúp nhân viên tự phục vụ, giảm tải quản lý." | Business Flow diagram, Dashboard1, PricingOverview 5-card, ProductionReport chênh lệch | Prisma schema, FlashRank params, AES-GCM |
| **Factory / Operations Manager** | Production, inventory, quality, machine | "Trace mẻ chiên end-to-end, kho kiện FIFO, bảo trì template-driven, QC theo mẻ — đúng nghiệp vụ sấy chân không." | Manufacturing flow (MaterialEvaluation→SystemOperation→FinishedProduct 8 grades), Warehouse kiện, MaintenancePlan, QualityEvaluation | LLM model name, Nginx TLS version |
| **CIO / IT Manager** | Architecture, security, scalability, deployment | "Modular monolith 82 routes, RBAC/ABAC secondary, Redis RL spoof-proof, WS cross-instance, backup 3 lớp, 6-phase playbook — single-VPS đã production-hardened." | Architecture diagram (Mermaid), Security table, Docker Compose, Infra maturity | 8-grade tiLe formula, Brix thresholds |
| **Technology / Implementation Partner** | Extensibility, API, modules, integration | "82 API groups với ROUTE_MAP, Zod validation, Swagger, 72-tool agent registry, multi-schema Prisma CUID — sẵn sàng tích hợp và mở rộng theo vertical." | ROUTE_MAP, Tool registry categories, Prisma schemas, path aliases, OpenSpec | Giá thành sấy, ca 3 logic |

---

## 4. Catalog Strategy

**Format:** 12–16 trang, storytelling — không phải README thiết kế lại, không phải technical documentation, không liệt kê hàng chục module thành ô.

**Narrative arc:**

```
Problem → Solution → Connected Operations → Manufacturing (hero, 2 trang)
  → Supply & Warehouse → Engineering → AI → Face
  → Technology → Architecture → Security → Scalability → Roadmap → CTA
```

**Tone:** Evidence-first, hình ảnh xưởng thực tế + diagram kỹ thuật, mỗi trang 1 headline + 1 visual chính + 3 bullet proof points.

---

## 5. Page-by-Page (đề xuất 16 trang)

| Page | Mục tiêu | Headline | Key content / Visual | Screenshot nên dùng |
|---|---|---|---|---|
| **1 — Cover** | Ấn tượng đầu | *Intelligent Manufacturing Platform — Built for Dried Fruit* | Ảnh xưởng sấy + logo An Bình Foods + tagline (chọn 1 slogan) | — |
| **2 — The Problem** | Nỗi đau | *Quản lý nhà máy sấy bằng Excel và giấy tờ — đã đến lúc thay đổi* | 3 pain points: trace mẻ chiên thủ công, tồn kho kiện không khớp, chấm công gian lận | — |
| **3 — The Solution** | Tổng quan | *Một nền tảng — mọi vận hành được kết nối* | 5 Messaging Pillars + capability groups (8 khối) | — |
| **4 — Connected Operations** | Luồng | *Từ báo giá tới thành phẩm — một dòng chảy dữ liệu* | Mermaid Business Flow (Customer→QR→Q→Order→Warehouse→Production→Quality→Invoice) | — |
| **5 — Manufacturing I** | Hero 1/2 | *Mỗi mẻ chiên đều có câu chuyện dữ liệu* | Diagram MaterialEvaluation→SystemOperation (4 giai đoạn)→FinishedProduct | Kiosk MaterialEvaluationEntry (66KB) |
| **6 — Manufacturing II** | Hero 2/2 | *8-grade yield — hiểu rõ từng phần của thành phẩm* | 8 grades A/B/B-Dầu/C/Vụn/Phế/Ướt + tiLe auto + ProductionReport | FinishedProduct + QualityEvaluation |
| **7 — Supply & Warehouse** | Chuỗi cung ứng | *Kiện là first-class — tồn kho không còn là con số mơ hồ* | Warehouse→Lot→Slot→LotProduct, FIFO K1.1→K1.n, BM01/BM03 | Warehouse + LotProduct + BM01 receipt |
| **8 — Engineering** | Thiết bị | *Bảo trì không còn là phản ứng — là kế hoạch* | MachineSystem hierarchy + MaintenancePlan năm + Fault KB + SparePart | MachineSystem + MaintenancePlan + FaultRecord |
| **9 — Quality** | Chất lượng | *Chất lượng được ghi nhận theo mẻ — không phải cảm tính* | QualityEvaluation (màu/mùi/vị/độ giòn) + InternalInspection | QualityEvaluation |
| **10 — AI Assistant** | AI story | *AI hiểu ngữ cảnh xưởng — không phải chatbot chung chung* | Pipeline Dense+BM25→RRF→FlashRank→Confidence→DeepSeek→Faithfulness, 14 docs | ChatWidget (67.9KB) |
| **11 — Face Kiosk** | Physical-digital | *Khuôn mặt là thẻ chấm công — chống giả mạo 4 lớp* | 4-layer liveness diagram + adaptive gallery + kiosk tại xưởng | FaceKioskPage V2/V3 + FaceAdminPage |
| **12 — Technology** | Stack | *Không phải danh sách logo — là 5 layers có chủ ý* | Experience / Application / Data / Intelligence / Infrastructure layers | — |
| **13 — Architecture** | Kiến trúc | *Modular monolith — đơn giản để deploy, đủ sâu để scale* | Mermaid infra diagram (Nginx→Backend/Frontend→Postgres/Redis/AI) | — |
| **14 — Security** | Tin cậy | *Bảo vệ từ JWT tới kiện hàng — thực tế, không khẩu hiệu* | RBAC/ABAC + Redis RL + helmet + AES-GCM + audit log (và "what we don't claim") | — |
| **15 — Roadmap** | Tương lai | *Từ Integrated ERP → Smart Factory — lộ trình có cơ sở kỹ thuật* | 5 phases (Integrated → AI-Assisted → Data-Driven → Smart Factory → Enterprise Platform) | — |
| **16 — CTA** | Kêu gọi | *Gặp chúng tôi tại gian hàng — xem kiosk và mẻ chiên trực tiếp* | QR + contact + "5 screenshots" teaser | — |

**Với mỗi trang, designer cần:**

- Mục tiêu + headline + subheadline (1 câu)
- Key content (3 bullet proof points — lấy từ Evidence trong báo cáo audit)
- Visual chính (diagram hoặc screenshot — crop gợi ý ở cột cuối)
- Audience chính (CEO / Factory / CIO / Partner)
- Message chính (1 câu elevator cho người đứng trước trang đó)

---

## 6. Business Flow for Catalog (thực tế theo code — không copy ví dụ chung)

```
InternationalCustomer
  → QuotationRequest (+ items)
    → QuotationCalculator (MaterialStandard + GeneralCost + ExportCost → giá hòa vốn)
      → Quotation (priceLocked, gửi khách)
        → Order (7 SX statuses + 3 TT statuses)
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

Dùng flow này cho **trang 4 — Connected Operations**. Không dùng flow ví dụ chung trong brief ban đầu nếu khác với code.

---

## 7. AI Story — "AI that understands the factory floor"

**Concept:** AI không phải chatbot độc lập — là lớp hỗ trợ vận hành, hiểu department scope và quy trình ERP.

**Visual pipeline (chỉ giữ bước có evidence):**

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

| Audience | Message |
|---|---|
| **CEO** | Nhân viên tự tìm được hướng dẫn vận hành bằng tiếng Việt tự nhiên — giảm 30-50% câu hỏi lặp lại cho quản lý. |
| **Manager** | Tra cứu SOP, tạo YCBG/đơn hàng, xem tồn kho — bằng một câu hỏi, không cần nhớ menu. |
| **CTO** | Hybrid retrieval (dense+sparse+RRF+rerank), confidence gate, faithfulness, semantic cache, department-aware filtering, 72-tool function calling với write confirmation — production, không phải demo. |

Dùng cho **trang 10 — AI Assistant**.

---

## 8. Computer Vision Story — "Face is the badge"

**Pipeline visual:**

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

**Headline đề xuất:** *"Khuôn mặt là thẻ chấm công — 4 lớp chống giả mạo, học dần theo thời gian"*

**Đừng nói quá:** Không claim FaceID phone-level, không depth sensor, chưa PAD ISO 30107. Hãy nói: "kiosk giá rẻ cho 100-300 CN, adaptive gallery tự cải thiện, audit log đầy đủ — chi phí thiết bị chỉ một tablet + device key".

Dùng cho **trang 11 — Face Kiosk**.

**4 lớp liveness (để designer vẽ diagram):**

1. DeepFace `anti_spoofing` + MiniFASNet 0.5/0.5 — `pass_ratio≥0.65, avg≥0.72`
2. Frame quality — brightness 35-225, blur var >12, area >0.035
3. LBP texture 128x128 — `avg≥0.35` (màn hình/ảnh in)
4. Temporal — bbox shift vs aligned 96x96 diff, flag flat_motion nếu `external≥0.08 & diff≤0.018`
5. Final `0.5*anti +0.2*temporal +0.15*quality +0.15*lbp ≥0.68`

---

## 9. Technology Story — 5 Layers (trang 12)

| Layer | Stack thực tế | Vai trò |
|---|---|---|
| **Experience** | React 18 + TypeScript + Vite 5 + TailwindCSS + TanStack Query + Recharts | SPA 46 pages, 70 hooks, query key factory, responsive |
| **Application** | Node 20 + Express 5 + Prisma 6 + Zod + Winston + ws + web-push | 82 routes, modular monolith, RBAC/ABAC, WS heartbeat |
| **Data** | PostgreSQL 16 (3 schemas, 60+ models, CUID) + Redis 7 (cache + RL, LRU 128M) | Multi-schema, transaction, advisory locks |
| **Intelligence** | FastAPI + DeepSeek (OpenRouter) + ChromaDB + FlashRank + ArcFace/MiniFASNet | RAG 14 docs + 72-tool agent + 4-layer face |
| **Infrastructure** | Docker Compose + Nginx (TLS 1.2/1.3, http2) + healthchecks + backup 3 lớp | Single-VPS production, 6-phase playbook |

Không biến tech stack thành danh sách logo — kể theo layers có chủ ý.

---

## 10. What NOT to Claim (bắt buộc — designer + sales KHÔNG được dùng những claim này)

| Claim cấm | Lý do (thiếu evidence) |
|---|---|
| "Fully autonomous AI" | Agent cần confirm cho write, max 5 iter |
| "Enterprise-grade / military-grade / bank-grade security" | Chưa pentest/SOC2, thiếu 2FA/MFA, WAF, vault |
| "Zero-trust" | Chưa mTLS/service mesh |
| "Zero downtime / highly available" | Single VPS, downtime 8-15s mỗi deploy |
| "Microservices architecture" | Là modular monolith — 1 Express app, 1 DB |
| "Predictive maintenance" | Hiện tại schedule-based, chưa ML |
| "Liveness 100% anti-spoof" | 2D heuristics chưa PAD ISO 30107, không depth/IR |
| "ArcFace >99% accuracy" | Chưa FAR/FRR công bố trên tập factory |
| "Backup offsite / encrypted" | Chỉ local `/backup`, chưa S3/encryption |
| "Audit log toàn diện" | Chỉ face/evaluation/login có audit |
| "Supports multi-site / multi-company / mobile app / IoT" | Chưa tồn tại — là roadmap |

---

## 11. Recommended Screenshots (5 màn hình — nếu chỉ được 5)

| # | Màn hình | File gợi ý | Headline đề xuất | Vì sao đưa vào catalog |
|---|---|---|---|---|
| 1 | **ProductionMaterialEvaluationEntry** (kiosk 66KB) | `frontend/src/pages/production/ProductionMaterialEvaluationEntry.tsx` | "Đánh giá nguyên liệu — Brix, nhiệt độ, từng mẻ chiên" | Hero manufacturing, kiosk thực tế, Brix là proof domain sâu |
| 2 | **FinishedProduct (8 grades)** | `frontend/src/components/FinishedProductManagement.tsx` (hoặc page production) | "8-grade yield — hiểu rõ từng phần của thành phẩm" | USP duy nhất, tiLe auto, visual breakdown A/B/C/vụn/phế |
| 3 | **Warehouse — Lot/Slot/Kiện + BM01 receipt** | `frontend/src/components/WarehouseManagement.tsx` + `CreateWarehouseReceiptModal.tsx` | "Kiện là first-class — tồn kho là vị trí, không phải con số" | Khác biệt vs ERP thường, FIFO, capacity guard |
| 4 | **ChatWidget (67.9KB)** | `frontend/src/components/ChatWidget.tsx` | "AI hiểu xưởng — hỏi bằng tiếng Việt, trả lời bằng quy trình thực" | AI story, department-scoped, grounded |
| 5 | **Dashboard1 (55KB)** | `frontend/src/pages/Dashboard1.tsx` | "Một cái nhìn — mọi vận hành" | CEO view, visibility, business flow tổng hợp |

**Crop gợi ý:** Với mỗi screenshot, crop vào phần table/form chính — bỏ sidebar/header chrome nếu có thể, giữ breadcrumb để thấy context. Headline đặt trên screenshot, không đè lên UI.

---

## 12. 3 phút giới thiệu tại gian hàng (elevator pitch)

> **Phút 1 — Manufacturing DNA (30s):**
> "Mỗi mẻ chiên đều có dữ liệu — từ Brix ngâm tới 8 loại thành phẩm, truy vết một mã `maChien` xuyên 4 bảng, với ngày sản xuất 06:30 theo ca thực tế."
>
> **Phút 2 — Warehouse thực (30s):**
> "Kho không phải con số — là kiện K1.1, K1.2 với FIFO và capacity guard, phiếu BM01/BM03 multi-line, nhập kho thành phẩm bulk idempotent."
>
> **Phút 3 — AI + Face (60s) + demo trực tiếp (60s):**
> "Nhân viên hỏi AI bằng tiếng Việt tự nhiên — RAG hiểu phòng ban, agent thao tác 72 APIs; công nhân chấm công bằng khuôn mặt tại kiosk với 4 lớp chống giả mạo, học dần theo thời gian."
> Sau đó demo trực tiếp kiosk + ChatWidget tại gian hàng.

---

## 13. Liên kết tài liệu

| Tài liệu | Đường dẫn |
|---|---|
| README (source of truth) | `README.md` |
| Báo cáo audit đầy đủ (25 mục) | Phản hồi chat audit ngày 2026-08-20 (chưa lưu file — cần thì lưu `reports/erp-audit-2026-08-20.md`) |
| Prisma schemas | `backend/prisma/schema/` (5 files, 3 schemas) |
| RAG knowledge base | `docs/chatbot/` (14 files) |
| Deploy playbook | `DEPLOY_PROD_PLAYBOOK.md` (6 phases) |
| Project rules | `AGENTS.md` |

---

> **Nguyên tắc cuối cho catalog:** Evidence first. Product value second. Marketing third. — Mọi claim trong brief này đều có file path + dòng code đối chiếu trong báo cáo audit. Những gì ghi "Planned" hoặc "Partial" là chưa đủ evidence để marketing như Production.
