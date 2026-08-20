# ERP An Binh Foods — Intelligent Manufacturing Platform

> Hệ thống ERP tích hợp cho nhà sản xuất trái cây sấy — vận hành từ báo giá đến thành phẩm, kho bãi, thiết bị và nhân sự — với AI RAG assistant và chấm công nhận diện khuôn mặt anti-spoofing.

[![Backend](https://img.shields.io/badge/backend-Express%205%20%2B%20Prisma%206-blue)](#technology-stack)
[![Frontend](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite%205-61dafb)](#technology-stack)
[![AI Service](https://img.shields.io/badge/AI-FastAPI%20%2B%20DeepSeek%20%2B%20ChromaDB-ff6b35)](#ai-capabilities)
[![Database](https://img.shields.io/badge/database-PostgreSQL%2016-336791)](#technology-stack)
[![License](https://img.shields.io/badge/license-ISC-lightgrey)](#license)

---

## Mục lục

- [Overview](#overview)
- [Product Vision](#product-vision)
- [Key Capabilities](#key-capabilities)
- [Business Flow](#business-flow)
- [ERP Modules](#erp-modules)
- [Manufacturing](#manufacturing)
- [AI Capabilities](#ai-capabilities)
- [Computer Vision](#computer-vision)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Security & Reliability](#security--reliability)
- [Repository Structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Development Setup](#development-setup)
- [Database Setup](#database-setup)
- [Running Frontend](#running-frontend)
- [Running Backend](#running-backend)
- [Running AI Service](#running-ai-service)
- [Docker](#docker)
- [Production Deployment](#production-deployment)
- [Backup / Recovery](#backup--recovery)
- [Current Status](#current-status)
- [Roadmap](#roadmap)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

ERP An Binh Foods là hệ thống quản trị tài nguyên doanh nghiệp được xây dựng riêng cho **An Binh Foods** — nhà sản xuất trái cây sấy (mít, xoài, chuối, v.v.) — bao phủ toàn bộ vòng đời vận hành:

```
Khách hàng → Báo giá → Đơn hàng → Thu mua → Kho → Sản xuất → Chất lượng → Thành phẩm → Hóa đơn → Nhân sự
```

Hệ thống gồm 3 services chính:

| Service | Stack | Port | Vai trò |
|---------|-------|------|---------|
| **Frontend** | React 18 + Vite + TailwindCSS | :5173 | SPA — toàn bộ giao diện người dùng |
| **Backend** | Express 5 + Prisma 6 + PostgreSQL 16 | :5000 (dev :5003) | API — 82 route groups, ~90 services |
| **AI Service** | FastAPI + Python 3.11 | :8001 | Face recognition + RAG chatbot & agent |

Hạ tầng production: Docker Compose (6 services) + Nginx reverse proxy + Redis — deploy trên VPS Linux với playbook 6-phase, backup 3 lớp.

---

## Product Vision

**Từ ERP nội bộ → Intelligent Manufacturing Platform.**

ERP này không chỉ là CRUD cho các phòng ban. Điểm khác biệt nằm ở 3 trụ cột:

1. **Manufacturing DNA** — Mô hình sản xuất sấy chân không được mã hóa sâu: định mức nguyên liệu (MaterialStandard), quy trình sản xuất (ProductionProcess + Flowchart với costing theo công đoạn), đánh giá nguyên liệu đầu vào (MaterialEvaluation), vận hành hệ thống sấy (SystemOperation — 4 giai đoạn nhiệt/áp), thành phẩm phân loại A/B/C/vụn/phế phẩm, và báo cáo sản lượng. Đây là phần có độ sâu nghiệp vụ lớn nhất trong hệ thống.

2. **AI-Assisted Operations** — RAG chatbot hiểu ngữ cảnh ERP + ReAct agent thực thi 72 tools qua LLM (DeepSeek). Không phải chatbot độc lập — AI là lớp hỗ trợ vận hành, giúp nhân viên tra cứu quy trình, tạo đơn hàng, và thao tác dữ liệu bằng ngôn ngữ tự nhiên.

3. **Physical-Digital Bridge** — Chấm công khuôn mặt (ArcFace + RetinaFace + MiniFASNet anti-spoofing + LBP texture + temporal liveness) kết nối thế giới vật lý (kiosk tại xưởng) với dữ liệu ERP (attendance, payroll, timesheet).

---

## Key Capabilities

| Nhóm | Capability | Mức độ |
|------|-----------|--------|
| **Sales / CRM** | Khách hàng QT/NĐ, yêu cầu báo giá, báo giá, bảng tính giá, đơn hàng | Production |
| **Procurement** | Nhà cung cấp, yêu cầu mua hàng, yêu cầu cung ứng, quy tắc đặt lại hàng | Production |
| **Inventory / Warehouse** | Kho, lô, kiện (slot), phiếu nhập/xuất, tồn kho, BM01/BM03 | Production |
| **Manufacturing** | Quy trình, định mức, đánh giá NVL, vận hành sấy, thành phẩm, báo cáo | Production — **Hero** |
| **Quality** | Đánh giá chất lượng thành phẩm, kiểm tra nội bộ, tiêu chí NVL | Production |
| **Engineering** | Hệ thống máy, chi tiết máy, bảo trì (plan/record/template), sửa chữa, nghiệm thu | Production |
| **Finance** | Hóa đơn, công nợ, báo cáo thuế, chi phí chung/xuất khẩu | Production |
| **HR** | Nhân sự, vị trí/cấp bậc, chấm công, nghỉ phép, tăng ca, bảng lương, đánh giá | Production |
| **Collaboration** | Nhiệm vụ, kế hoạch, dự án (phases/tasks), báo cáo ngày, góp ý | Production |
| **AI** | RAG chatbot, ReAct agent (72 tools), knowledge base 14 docs | Production |
| **Computer Vision** | Face enrollment/verification, liveness (4 lớp), kiosk, attendance link | Production |
| **Platform** | RBAC+ABAC, audit log, notifications (WS + Web Push), file upload | Production |

Chi tiết từng module: xem [ERP Modules](#erp-modules).

---

## Business Flow

Luồng nghiệp vụ thực tế được mã hóa trong hệ thống (dựa trên Prisma relations và service logic):

```mermaid
flowchart LR
    IC[InternationalCustomer] --> QR[QuotationRequest]
    QR --> QC[QuotationCalculator]
    QC --> Q[Quotation]
    Q --> O[Order]
    O --> TR[TaxReport]
    O --> PR

    subgraph Procurement
    SR[SupplyRequest] --> PR2[PurchaseRequest]
    PR2 --> S[Supplier]
    RR[ReorderRule] -.-> PR2
    end

    subgraph Warehouse
    W[Warehouse] --> L[Lot]
    L --> LP[LotProduct]
    LP --> WR[WarehouseReceipt - BM01]
    LP --> WI[WarehouseIssue - BM03]
    WR & WI --> ME
    end

    subgraph Manufacturing
    MS[MaterialStandard] --> PP[ProductionProcess]
    PP --> PFC[ProductionFlowchart]
    ME[MaterialEvaluation] --> SO[SystemOperation]
    SO --> FP[FinishedProduct]
    FP --> QE[QualityEvaluation]
    FP --> PR3[ProductionReport]
    end

    O -.-> W
    ME -.-> LP
    FP -.-> LP

    subgraph People
    E[Employee] --> A[Attendance]
    A --> P[Payroll]
    E --> LR[LeaveRequest]
    E --> OP[OvertimePlan]
    E --> EV[Evaluation]
    end

    style ME fill:#4a9,stroke:#333,color:#fff
    style FP fill:#4a9,stroke:#333,color:#fff
    style QC fill:#f96,stroke:#333,color:#fff
```

**Luồng chính:**

1. **Khách hàng** tạo **Yêu cầu báo giá** (QuotationRequest) với danh sách sản phẩm.
2. **Bảng tính giá** (QuotationCalculator) tính toán chi phí: định mức nguyên liệu, chi phí chung, chi phí xuất khẩu, sản phẩm phụ — cho ra giá hòa vốn và lợi nhuận.
3. **Báo giá** (Quotation) được tạo từ bảng tính, gửi khách hàng. Khách chấp nhận → **Đơn hàng** (Order) với 7 trạng thái sản xuất + 3 trạng thái thanh toán.
4. **Cung ứng nội bộ** (SupplyRequest) hoặc **Mua hàng** (PurchaseRequest) được tạo khi cần nguyên vật liệu — có thể tự động từ tồn kho thấp (ReorderRule) hoặc thiếu hàng khi cấp phát.
5. **Kho** quản lý theo mô hình **Kho → Lô → Kiện (Slot)** với phiếu nhập (BM01) / xuất (BM03) đa dòng, tracking tồn kho trước/sau, và in phiếu.
6. **Sản xuất sấy chân không**: Đánh giá nguyên liệu → Vận hành hệ thống sấy (4 giai đoạn) → Thành phẩm phân loại (A/B/B-dầu/C/vụn/phế phẩm/ướt) → Đánh giá chất lượng → Báo cáo sản lượng.
7. **Nhân sự**: Chấm công (kiosk khuôn mặt hoặc thủ công) → Timesheet → Bảng lương (tính OT theo hệ số ngày thường/CN/lễ).

---

## ERP Modules

### Sales / CRM

| Entity | Mô tả | Workflow |
|--------|-------|----------|
| **InternationalCustomer** | Khách hàng QT (quocGia) / NĐ (tinhThanh). Phân loại: Nhà phân phối, Nhà nhập khẩu, v.v. | CRUD + search, phân loại địa lý |
| **QuotationRequest** | Yêu cầu báo giá: khách hàng + danh sách sản phẩm + vận chuyển/thanh toán | `CHO_XU_LY → DANG_BAO_GIA → DA_BAO_GIA → HUY` |
| **QuotationCalculator** | Bảng tính giá chi tiết: sản phẩm + chi phí chung + chi phí XK + sản phẩm phụ, tính giá hòa vốn | Upsert theo QuotationRequest, nhiều tab sản phẩm |
| **Quotation** | Báo giá chính thức: giá báo khách, thời gian giao hàng, hiệu lực, khóa giá | `DRAFT → DANG_CHO_PHAN_HOI → DANG_CHO_GUI_DON_HANG → DA_DAT_HANG / KHONG_DAT_HANG` + SENT/APPROVED/REJECTED/EXPIRED |
| **Order** | Đơn hàng từ báo giá: giá trị USD/VND, 2 đợt thanh toán, ngày SX/giao hàng | `CHO_LEN_KE_HOACH → CHO_SAN_XUAT → DANG_SAN_XUAT → CHO_GIAO_HANG → DA_LEN_CONTAINER → DANG_VAN_CHUYEN → DA_GIAO_CHO_KHACH_HANG` + 3 trạng thái thanh toán |
| **CustomerFeedback** | Phản hồi/khiếu nại từ khách hàng | CRUD + xử lý |
| **PricingOverview** | Dashboard tổng hợp giá: aggregated endpoint cho 5-card overview | Read-only aggregated |

### Procurement / Supply Chain

| Entity | Mô tả | Workflow |
|--------|-------|----------|
| **Supplier** | Nhà cung cấp: NVL / Thiết bị, trong nước / quốc tế | CRUD + phân loại |
| **PurchaseRequest** | Yêu cầu mua hàng: multi-item, liên kết SupplyRequest, nguồn MANUAL/SHORTAGE/REORDER/QUICK | `Chờ duyệt → Đã duyệt / Từ chối` |
| **SupplyRequest** | Yêu cầu cung ứng nội bộ: multi-item với fulfillment tracking, decision audit trail | `Chờ xử lý → Đủ/Thiếu tồn kho → Đã cấp (một phần/đủ) → Đã hủy` + auto PurchaseRequest khi thiếu |
| **ProductReorderRule** | Quy tắc đặt lại hàng: ngưỡng tồn kho tối thiểu, số lượng đặt lại, cooldown | Theo dõi tồn kho LotProduct, trigger alert/PR |

### Inventory / Warehouse

| Entity | Mô tả |
|--------|-------|
| **Warehouse** | Kho hàng: mã kho, tên, loại, địa chỉ, sức chứa |
| **Lot** | Lô trong kho: liên kết zone trên sơ đồ CAD, baseline lots vs user-added |
| **WarehouseSlot** | Kiện (pallet position): mã K1.1..., zone, deterministic ID `WS-<maKho>-<zone>-<code>` |
| **LotProduct** | Sản phẩm trong kiện: số lượng, đơn vị, giá thành, liên kết InternationalProduct + Slot |
| **WarehouseReceipt** | Phiếu nhập kho (BM01): multi-item, tracking số lượng trước/sau, in phiếu |
| **WarehouseIssue** | Phiếu xuất kho (BM03): multi-item, liên kết MaterialEvaluation, in phiếu |
| **Inventory** | Tồn kho aggregated (read endpoint) |

### Manufacturing

Chi tiết: xem [Manufacturing](#manufacturing) — đây là module có độ sâu lớn nhất.

### Quality

| Entity | Mô tả |
|--------|-------|
| **MaterialStandard** | Định mức NVL: đầu vào (input items) + đầu ra (output items) + tỉ lệ kg NVL / 1kg TP |
| **MaterialStandardItem** | Thành phẩm đầu ra của định mức (tỉ lệ, liên kết InternationalProduct) |
| **MaterialStandardInputItem** | Nguyên liệu đầu vào của định mức |
| **QualityEvaluation** | Đánh giá chất lượng thành phẩm: màu sắc, mùi, vị, độ ngọt/giòn, tỉ lệ A/B/C, đề xuất |
| **InternalInspection** | Kiểm tra nội bộ: mã vi phạm, mức độ, xác minh 2 cấp |
| **MaterialEvaluationCriteria** | Tiêu chí đánh giá NVL (lookup) |

### Engineering / Maintenance

| Entity | Mô tả |
|--------|-------|
| **MachineSystem** | Hệ thống máy: khu vực, vị trí, loại (14 categories: SAN_XUAT, DONG_GOI, DIEN, HOI...), trạng thái, clone hierarchy |
| **MachineSystemDetail** | Chi tiết máy: 4 loại (Thiết bị/Cụm/Linh kiện/Điểm kiểm tra), hierarchy cha-con |
| **FaultTemplate** | Mẫu lỗi: mô tả, mức độ, gợi ý detail, liên kết hệ thống |
| **FaultRecord** | Ghi nhận lỗi: `DANG_THEO_DOI → DA_XU_LY → TAI_PHAT`, liên kết template + hệ thống |
| **SparePart** | Linh kiện dự phòng: tồn kho, loại (CK/DT/D/TH), giá nhập |
| **RepairRequest** | Yêu cầu sửa chữa: multi-item, 4 trạng thái, liên kết FaultRecord |
| **AcceptanceHandover** | Biên bản nghiệm thu: liên kết RepairRequest items, tình trạng trước/sau |
| **MaintenanceTemplate** | Template bảo trì: tần suất, tổ thực hiện |
| **MaintenancePlan** | Kế hoạch bảo trì năm: theo hệ thống, items theo chi tiết máy, log theo tháng |
| **MaintenanceRecord** | Biên bản bảo trì: liên kết plan + detail, người thực hiện/phụ |
| **MachineStatusLog** | Nhật ký chuyển trạng thái máy |
| **Project** | Dự án: phases, task groups, tasks, costs, approvals, updates, members |

### Finance / Accounting

| Entity | Mô tả |
|--------|-------|
| **Invoice** | Hóa đơn: bán hàng/mua hàng/dịch vụ, thuế VAT, trạng thái thanh toán |
| **Debt** | Công nợ: theo supplier, số tiền phải trả/đã trả, ngày hạch toán/đến hạn |
| **TaxReport** | Báo cáo thuế: liên kết Order, 5 trạng thái `CHUA_BAO_CAO → DA_QUYET_TOAN` |
| **GeneralCost** | Chi phí chung: điện, nước, nhân công, khấu hao |
| **ExportCost** | Chi phí xuất khẩu: vận chuyển, bảo hiểm, thuế |
| **Asset** | Tài sản (qua LotProduct tracking) |

### HR

| Entity | Mô tả |
|--------|-------|
| **Employee** | Nhân sự: mã NV, vị trí, cấp bậc, phòng ban, lương cơ bản, thông tin cá nhân |
| **Position / PositionLevel / PositionResponsibility** | Vị trí, cấp độ lương (baseSalary + kpiSalary), trách nhiệm (weight) |
| **Attendance** | Chấm công: check-in/out, giờ làm, ca (1/2/3), liên kết OvertimePlan, shift derivation |
| **TimesheetCell / MonthlyTimesheetOverride** | Bảng chấm công tháng: mã công (AttendanceCode), giờ làm/OT, overrides |
| **LeaveRequest** | Nghỉ phép: 6 loại (ANNUAL/SICK/PERSONAL/MATERNITY/EMERGENCY/COMPENSATORY), nửa ngày |
| **OvertimePlan** | Kế hoạch tăng ca: multi-item theo ngày, ca làm việc, người tham gia, giờ thực tế clock-pair |
| **WorkShift** | Ca làm việc: giờ bắt đầu/kết thúc, cửa sổ check-in |
| **Holiday** | Ngày lễ |
| **Payroll** | Bảng lương: lương cơ bản, phụ cấp, BHXH/BHYT/BHTN, thuế TNCN, OT (hệ số 1.5/2/3) |
| **Evaluation** | Đánh giá nhân viên: mode QUICK/FULL, self + 2 supervisor scores, N/A flag, appeal, peer feedback, evidence, goals, IDP, audit log |
| **FaceProfile / FaceImage / FaceAttendanceLog** | Hồ sơ khuôn mặt, gallery ảnh, log chấm công khuôn mặt |

### Administration / Collaboration

| Entity | Mô tả |
|--------|-------|
| **User / Role / Permission** | Quản lý người dùng, vai trò, phân quyền chi tiết (action × resource) |
| **Task** | Nhiệm vụ: người giao/nhận (multi), hạn hoàn thành, độ ưu tiên, tiếp nhận/đánh giá |
| **WorkPlan** | Kế hoạch công việc: người thực hiện (multi), thời gian, trạng thái |
| **DailyWorkReport** | Báo cáo ngày: mô tả, thành tựu, khó khăn, kế hoạch mai, supervisor review |
| **Notification** | Thông báo: event-driven registry, WebSocket + Web Push, preferences/muting |
| **PrivateFeedback** | Góp ý riêng / Nêu khó khăn: 2 loại, xử lý/phản hồi |
| **AuditLog** | Nhật ký audit: entityType, entityId, action, before/after, actor |
| **SystemSettings** | Cài đặt hệ thống: theme, slogan, notification settings |
| **Lookup** | Danh mục dùng chung (polymorphic): đơn vị tính, loại chi phí, v.v. + cascade rename + audit trail |
| **Department / SubDepartment** | Phòng ban, bộ phận |

---

## Manufacturing

Module có độ sâu nghiệp vụ lớn nhất — mô hình hóa toàn bộ quy trình sấy chân không cho trái cây:

### Định mức & Quy trình

- **MaterialStandard**: Định mức nguyên liệu — danh sách nguyên liệu đầu vào (input items) và thành phẩm đầu ra (output items) với tỉ lệ, liên kết InternationalProduct, và tỉ lệ `kgNguyenLieuTren1KgThanhPham`.
- **Process**: Quy trình chung (template) — lưu đồ (flowchart) chia theo phân đoạn, mỗi phân đoạn có chi phí (ProcessFlowchartCost).
- **ProductionProcess**: Quy trình sản xuất thực tế — liên kết Process + MaterialStandard + ProductionFlowchart với costing chi tiết theo công đoạn (định mức lao động, số phút, năng suất/phút, số lượng kế hoạch/thực tế, giá kế hoạch/thực tế).

### Sản xuất sấy chân không

```
MaterialEvaluation          SystemOperation              FinishedProduct         QualityEvaluation
(Đánh giá NVL)    →      (Vận hành sấy)      →       (Thành phẩm)     →     (Đánh giá CL)
- mẻ chiên (maChien)       - 4 giai đoạn               - Phân loại:             - Màu sắc, mùi, vị
- nhiệt độ ngâm            - nhiệt/áp suất              A / B / B-dầu /         - Độ ngọt, độ giòn
- Brix, thời gian ngâm     - tổng thời gian sấy         C / vụn lớn/nhỏ /      - Tỉ lệ từng loại
- đánh giá trước/sau       - khối lượng đầu vào         phế phẩm / ướt         - Đề xuất cải tiến
- liên kết LotProduct      - liên kết MachineSystem     - liên kết MachineSystem
  + WarehouseIssue           + MaterialEvaluation         + MaterialEvaluation
```

- **MaterialEvaluation**: Đánh giá nguyên liệu đầu vào cho mỗi mẻ chiên — nhiệt độ nước trước/sau ngâm, Brix, số lần ngâm, liên kết LotProduct (trừ tồn kho khi tạo).
- **SystemOperation**: Vận hành hệ thống sấy — 4 giai đoạn, mỗi giai đoạn có thời gian/nhiệt độ/áp suất, tổng thời gian sấy, liên kết MachineSystem.
- **FinishedProduct**: Thành phẩm phân loại chi tiết — 8 loại (A/B/B-dầu/C/vụn lớn/vụn nhỏ/phế phẩm/ướt) với khối lượng + tỉ lệ, tổng khối lượng, flag `daNhapKho` (nhập kho thành phẩm).
- **QualityEvaluation**: Đánh giá chất lượng thành phẩm — màu sắc, mùi hương, vị, độ ngọt/giòn, đánh giá tổng quan, đề xuất điều chỉnh.
- **ProductionReport**: Báo cáo sản lượng ngày — số tua/mẻ kế hoạch vs thực tế, khối lượng NVL/TP định mức vs thực tế, chênh lệch và nguyên nhân.

### Đặc điểm nổi bật

- **Production day boundary 06:30** — Ngày sản xuất tính từ 06:30, không phải 00:00 (phù hợp ca sản xuất).
- **LotProduct stock integration** — Tạo MaterialEvaluation trừ tồn kho, tạo FinishedProduct có thể nhập kho (đảo ngược khi xóa).
- **Warehouse receipt for finished goods** — Thành phẩm có flow nhập kho riêng qua `daNhapKho` flag.

---

## AI Capabilities

### RAG Chatbot — Knowledge Assistant

Chatbot hướng dẫn nhân viên sử dụng ERP, trả lời dựa trên knowledge base nội bộ.

**Knowledge Base:** `docs/chatbot/` — 14 file markdown (00-chung → 13-he-thong-thong-bao), mỗi file có frontmatter `department` để filter theo phòng ban người hỏi.

**Pipeline thực tế** (xác thực từ `ai-service/chat/`):

```
User Message
  → Synonym Expansion (abbr: đh→đơn hàng, ncc→nhà cung cấp...)
  → Query Rewrite (LLM — chỉ khi query < 60 chars & < 8 words)
  → Dense Retrieval (ChromaDB + Vietnamese_Embedding_v2)
  → Sparse Retrieval (BM25 — rank-bm25)
  → RRF Fusion (k=60, top 20)
  → Confidence Gate (cosine sim ≥ 0.32)
  → FlashRank Reranking (ms-marco-MultiBERT-L-12)
  → Lost-in-the-middle Mitigation (giữ first + last)
  → LLM Generation (OpenRouter / DeepSeek deepseek-chat-v3-0324)
  → Faithfulness Check (LLM judge — PASS/FAIL)
  → Semantic Cache (threshold 0.95, max 200 entries, scope: department:role)
  → Response + Sources
```

| Thành phần | Công nghệ | Trạng thái |
|-----------|-----------|-----------|
| Embedding | `AITeamVN/Vietnamese_Embedding_v2` (sentence-transformers) | Production |
| Vector DB | ChromaDB (PersistentClient, cosine/HNSW) | Production |
| Keyword search | BM25Okapi (rank-bm25) | Production |
| Fusion | Reciprocal Rank Fusion (k=60) | Production |
| Reranking | FlashRank (ms-marco-MultiBERT-L-12) | Production |
| LLM | OpenRouter — `deepseek/deepseek-chat-v3-0324` | Production |
| Confidence gate | Cosine similarity threshold 0.32 | Production |
| Faithfulness | LLM-as-judge (PASS/FAIL) | Production |
| Semantic cache | In-memory, cosine 0.95, FIFO 200, scoped by department:role | Production |
| Query rewrite | LLM rewrite cho short queries | Production |
| Department filter | ChromaDB `where` + BM25 score zeroing | Production |
| Evaluation | Golden dataset (20 QA pairs) + RAGAS-ready | Implemented |

### ReAct Agent — Action Executor

Agent tự động thực thi thao tác ERP qua function calling.

- **Registry:** `ai-service/agent/registry.py` — **72 tools** (đếm thực tế), mỗi tool mapping tới 1 ERP API endpoint với `is_write` flag.
- **Executor:** `ai-service/agent/executor.py` — ReAct loop: `classify_intent → filter_tools (→ ~10-15 tools) → LLM function calling → execute → observe → repeat` (max 5 iterations, 90s timeout).
- **Department scoping:** `DEPARTMENT_CATEGORY_ACCESS` — mỗi phòng ban chỉ thấy tools thuộc category của mình + common categories. ADMIN bypass.
- **Write confirmation:** Tools có `is_write: True` yêu cầu user confirm trước khi execute.
- **File upload:** Hỗ trợ upload file (PDF/DOCX/XLSX) → extract structured data → auto-call create tools (quotation, process flowchart, v.v.).

**Tool categories:** attendance, leave, customer, order, task, employee, notification, supplier, purchase, payroll, quotation, product, production, warehouse, maintenance, finance, planning, report, knowledge, và nhiều hơn.

---

## Computer Vision

### Face Recognition — Kiosk Chấm công

Tích hợp chấm công khuôn mặt tại kiosk đặt ở xưởng, kết nối trực tiếp với module Attendance/Payroll.

**Pipeline thực tế** (xác thực từ `ai-service/face/` + `backend/src/services/faceAttendanceService.ts`):

```
Enrollment                          Verification (Kiosk)
─────────                           ────────────
Camera → RetinaFace            →    Camera → Yunet (primary) / SSD (fallback)
       → ArcFace embedding           → ArcFace embedding
       → Quality gate                → Liveness pipeline (4 lớp)
         (blur/brightness/pose)      → Gallery matching (voting)
       → Gallery (FaceImage)         → Attendance record
       → Adaptive replacement             ↓
         (TTL 6 tháng, quality)      Payroll / Timesheet
```

| Thành phần | Công nghệ | Chi tiết |
|-----------|-----------|---------|
| Detection (enroll) | **RetinaFace** | `ENROLL_DETECTOR = retinaface` |
| Detection (verify) | **Yunet** (primary) + **SSD** (fallback) | `VERIFY_DETECTOR = yunet`, `VERIFY_DETECTOR_FB = ssd` |
| Recognition | **ArcFace** | `MODEL_NAME = ArcFace` (DeepFace), embedding 512-dim |
| Matching | Voting (count 40% + distance 60%) | `MATCH_MAX_DISTANCE=0.38`, `MATCH_MIN_SCORE=0.58`, `MATCH_MIN_MARGIN=0.05` |
| Anti-spoofing 1 | **DeepFace anti_spoofing** | `is_real` + `antispoof_score` |
| Anti-spoofing 2 | **MiniFASNet** (uniface) | `MiniFASNet.predict()` — second opinion |
| Anti-spoofing 3 | **LBP Texture** | `_lbp_texture_score` — screen/print detection, threshold 0.35 |
| Anti-spoofing 4 | **Temporal liveness** | Motion analysis — flat motion detection, deformation score |
| Quality gate | Blur, brightness, face area, pose | `MIN_BLUR=12`, brightness 35-225, tilt < 20°, eye span > 0.22 |
| Gallery | FaceImage (embedding JSON + quality/pose/hour) | Adaptive replacement, TTL 6 tháng, cap quality/poison/coverage |

**Liveness — 4 lớp phòng vệ:**

1. **DeepFace anti-spoofing** + **MiniFASNet** — combined score (50/50), pass ratio ≥ 65%, min score ≥ 0.72
2. **LBP texture** — phát hiện màn hình/ảnh in (threshold 0.35)
3. **Temporal analysis** — phát hiện chuyển động phẳng (ảnh bị lắc), deformation score
4. **Final weighted score** — `0.50×anti_spoof + 0.20×temporal + 0.15×quality + 0.15×lbp ≥ 0.68`

**ERP Integration:**

- `FaceProfile` (1:1 với Employee) → `FaceImage[]` (gallery) → `FaceAttendanceLog` (event log)
- `FaceAdaptiveEvent` — observability cho gallery replacement
- `AttendanceDevice` — quản lý thiết bị kiosk (apiKey, type, isActive)
- Dual-auth: `x-device-key` header (kiosk) hoặc JWT (browser) — `deviceOrJwtAuth` middleware
- Kiosk pages: `FaceKioskPage` (V1) / `FaceKioskPageV2` / `FaceKioskPageV3` + `FaceAdminPage`

---

## Architecture

### Tổng quan

```
                         ┌─────────────────────────────────────────┐
                         │              Nginx (:80/:443)            │
                         │   HTTP→HTTPS  ·  TLS 1.2/1.3  ·  gzip  │
                         └──────┬──────────────┬───────────────────┘
                                │              │
                    /api/*      │    /*        │
                         ┌──────▼──┐    ┌──────▼──────┐
                         │ Backend │    │  Frontend   │
                         │ :5000   │    │   :80       │
                         │ Express │    │  React SPA  │
                         │ + WS    │    │  (Vite)     │
                         └────┬────┘    └─────────────┘
                              │
              ┌───────────────┼───────────────────┐
              │               │                   │
       ┌──────▼────┐   ┌──────▼────┐      ┌──────▼────┐
       │PostgreSQL │   │  Redis    │      │AI Service │
       │  :5432    │   │  :6379    │      │  :8001    │
       │  3 schemas│   │  cache+RL │      │  FastAPI  │
       │  60+ models│  │  LRU 128M │      │  ArcFace  │
       └───────────┘   └───────────┘      │  + RAG    │
                                          └───────────┘
```

### Backend — Modular Monolith

Backend là **modular monolith** (không phải microservices) — evidence:

- **Single Express app** (`backend/src/index.ts`) — một process, một deployment unit.
- **82 route groups** đăng ký qua `ROUTE_MAP` trong `backend/src/routes/index.ts` — auto-discovery qua `fs.readdirSync`, mỗi file `*Routes.ts` mapping tới 1 API path.
- **~90 services** trong `backend/src/services/` — mỗi service encapsulate business logic cho 1 domain, controller chỉ làm HTTP plumbing (Route → Controller → Service → Prisma).
- **3 Prisma schemas** (`auth`, `business`, `common`) — logical separation nhưng cùng một PostgreSQL instance, cùng một PrismaClient.
- **Shared cross-cutting concerns**: `auth.ts` (JWT + device key), `rbacAbac.ts` (RBAC+ABAC), `rateLimiter.ts` (Redis-backed), `errorHandler.ts`, `validation.ts`/`zodValidation.ts`.

```
Route (HTTP) → Controller (parse req/res) → Service (business logic) → Prisma (DB)
                     ↓
              Middleware chain: helmet → cors → rateLimiter → authenticate → authorize/checkAccess → validate → handler → errorHandler
```

**Đặc điểm kiến trúc:**

| Aspect | Chi tiết |
|--------|----------|
| Framework | Express 5 + TypeScript 5.9 |
| Validation | Zod schemas (`@schemas/`) + `zodValidation` middleware |
| Auth | JWT (access 30m + refresh 30d) + bcryptjs, dual-auth cho kiosk |
| Authorization | 3 middleware: `authenticate` → `authorize(...roles)` → `checkAccess({ allowedRoles, checkDepartment })` |
| Error handling | Typed errors (`AppError` → `ValidationError`, `NotFoundError`, v.v.) + global `errorHandler` |
| Rate limiting | `express-rate-limit` + `rate-limit-redis` (RedisStore), 3 tiers: global/auth/sensitive, IP via `X-Real-IP` |
| Realtime | `ws` (WebSocketServer) — JWT auth, heartbeat 30s, multi-tab, force-logout |
| Push | `web-push` (VAPID) — Web Push notifications |
| File upload | `multer` (100MB max), `pdfkit` + `exceljs` cho export |
| Logging | `winston` (LOG_LEVEL env) |
| Path aliases | `@config/*`, `@controllers/*`, `@services/*`, `@middlewares/*`, `@utils/*` |
| API docs | `swagger-jsdoc` + `swagger-ui-express` |
| Background | `node-cron` (evaluation cron, v.v.) |

### Frontend — SPA với TanStack Query

| Aspect | Chi tiết |
|--------|----------|
| Framework | React 18 + TypeScript 5.5 + Vite 5 |
| Styling | TailwindCSS 3.4 + `@tailwindcss/typography` |
| Routing | `react-router-dom` 7.6 |
| Data fetching | `@tanstack/react-query` 5.90 — mọi resource có hook trong `src/hooks/`, query key factory pattern |
| Forms | `react-hook-form` 7.62 + `@hookform/resolvers` (zod) |
| Charts | `recharts` 3.2 |
| Icons | `lucide-react` |
| State | `AuthContext` (auth), TanStack Query (server state), local state |
| DnD | `@dnd-kit` (sortable) |
| PDF | `pdfjs-dist` (viewer) |
| Testing | `vitest` 4.1 + `@testing-library/react` + `msw` 2.14 + `@playwright/test` (e2e) |
| Pages | 46 pages — grouped by domain (business, purchasing, production, quality, technical, accounting, general, face) |
| Components | 251 TSX files — shared + domain-specific |
| Hooks | 70 custom hooks |

### Database — Multi-Schema PostgreSQL

| Aspect | Chi tiết |
|--------|----------|
| Engine | PostgreSQL 16 |
| ORM | Prisma 6.17 |
| Schemas | 3 schemas: `auth` (users, tokens, roles), `business` (orders, warehouse, production...), `common` (employees, attendance, evaluation...) |
| Models | 60+ models, 3,733 lines of schema |
| IDs | CUID (`@id @default(cuid())`) — không dùng UUID hay auto-increment (trừ RepairRequest: autoincrement Int) |
| Timestamps | `createdAt @default(now())` + `updatedAt @updatedAt` trên mọi model |
| Indexes | Indexes trên foreign keys, status fields, date fields, composite indexes |
| Constraints | `@unique` trên business keys (maDonHang, maBaoGia, maChien+ngaySanXuat, v.v.) |
| Relations | Cascade/SetNull/Restrict delete behaviors được định nghĩa rõ |
| Transactions | `prisma.$transaction` cho parent+children creation, stock movements |
| Init | `backend/prisma/init.sql` — schema creation |

### AI Service — FastAPI

| Aspect | Chi tiết |
|--------|----------|
| Framework | FastAPI + uvicorn |
| Face | DeepFace (ArcFace + RetinaFace/Yunet/SSD) + uniface (MiniFASNet) + OpenCV |
| RAG | ChromaDB + sentence-transformers + rank-bm25 + FlashRank + OpenAI SDK (OpenRouter) |
| LLM | OpenRouter — `deepseek/deepseek-chat-v3-0324` (configurable via `OPENROUTER_MODEL`) |
| Embedding | `AITeamVN/Vietnamese_Embedding_v2` |

---

## Technology Stack

| Layer | Công nghệ | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.3 |
| | TypeScript | 5.5 |
| | Vite | 5.4 |
| | TailwindCSS | 3.4 |
| | TanStack Query | 5.90 |
| | React Router | 7.6 |
| | Recharts | 3.2 |
| **Backend** | Node.js | 20+ (Docker) |
| | Express | 5.1 |
| | TypeScript | 5.9 |
| | Prisma | 6.17 |
| | Zod | 4.3 |
| | Winston | 3.19 |
| | WebSocket (ws) | 8.20 |
| **Database** | PostgreSQL | 16-alpine |
| | Redis | 7-alpine (ioredis 5.11) |
| **AI Service** | Python | 3.11-slim |
| | FastAPI | 0.115 |
| | DeepFace | 0.0.93 |
| | TensorFlow | 2.13–2.18 |
| | PyTorch | 2.0+ |
| | ChromaDB | 0.6.3 |
| | sentence-transformers | 3.4.1 |
| | FlashRank | 0.2.9 |
| | uniface | 3.5.0 |
| **Infra** | Docker + Compose v2 | 24+ |
| | Nginx | alpine (TLS 1.2/1.3, http2) |
| | Swagger | swagger-jsdoc 6.2 + swagger-ui 5.0 |

---

## Security & Reliability

### Authentication & Authorization

| Mechanism | Chi tiết | Evidence |
|-----------|----------|----------|
| **JWT** | Access token (30m) + Refresh token (30d), `jsonwebtoken` 9.0 | `backend/src/config/env.ts`, `authService.ts` |
| **Password hashing** | `bcryptjs` 3.0 | `authService.ts` |
| **RBAC** | 4 roles: `ADMIN > DEPARTMENT_HEAD > TEAM_LEAD > EMPLOYEE` | `auth.prisma` enum `UserRole` |
| **ABAC** | Department + sub-department scoping, secondary departments | `rbacAbac.ts` — `checkAccess({ checkDepartment, checkSubDepartment })` |
| **ADMIN bypass** | `req.user.role === 'ADMIN'` → `next()` ngay lập tức | `rbacAbac.ts:13` |
| **Device auth** | `x-device-key` header cho kiosk (dual-auth: device key hoặc JWT) | `auth.ts:deviceOrJwtAuth` |
| **Secret guard** | Refuse to start nếu JWT secrets là dev fallback trong production-like env | `env.ts:40-52` |

### Rate Limiting & Network Security

| Mechanism | Chi tiết |
|-----------|----------|
| **Rate limiting** | 3 tiers: global (1000/15m), auth (30/15m), sensitive (100/15m) — Redis-backed, fallback in-memory |
| **IP resolution** | `X-Real-IP` (nginx `$remote_addr`, không spoof được) → `req.ip` → last hop của `X-Forwarded-For` |
| **Helmet** | Security headers via `helmet` 8.1 |
| **CORS** | Configurable `CORS_ORIGIN` (comma-separated), strict in production |
| **DB isolation** | PostgreSQL **không expose port** ra host trong production (chỉ trong Docker network) |
| **Redis auth** | `--requirepass` bắt buộc, `REDIS_PASSWORD` required env var |

### Data & Operational Security

| Mechanism | Chi tiết |
|-----------|----------|
| **Validation** | Zod schemas cho mọi input — `zodValidation` middleware |
| **Audit log** | `AuditLog` model — entityType, entityId, action, before/after, actorId/role |
| **Face data encryption** | `FACE_DATA_SECRET` env var cho face embeddings |
| **File upload** | `multer` với size limit 100MB, type checking |
| **Soft references** | `createdById` soft ref tới `auth.User.id` (không FK constraint) — tránh cross-schema FK issues |
| **Nginx** | TLS 1.2/1.3, http2, `client_max_body_size 50M`, gzip, proxy timeouts 180s |

### Những claim KHÔNG nên dùng

Vì chưa có evidence đủ mạnh trong repository:

- "Enterprise-grade security" / "military-grade" / "bank-grade" — chưa có pentest, SOC2, hay security audit bên ngoài.
- "Zero-trust" — chưa implement mTLS, service mesh, hay identity-aware proxy.
- "Zero downtime" / "highly available" — single VPS, không có load balancer hay multi-AZ.
- "Predictive maintenance" — maintenance là schedule-based (tần suất cố định), chưa có ML prediction.
- "Microservices" — đây là modular monolith (1 Express app), không phải microservices.
- "Fully autonomous AI" — agent cần user confirmation cho write actions, max 5 iterations.

---

## Repository Structure

```
ERP_V6/
├── frontend/                   # React SPA (Vite + TailwindCSS)
│   ├── src/
│   │   ├── pages/              # 46 pages — grouped by domain
│   │   │   ├── business/       #  Kinh doanh QT/NĐ
│   │   │   ├── purchasing/     #  Thu mua NVL + Thiết bị
│   │   │   ├── production/     #  Sản xuất + Data Entry
│   │   │   ├── quality/        #  Chất lượng
│   │   │   ├── technical/      #  Kỹ thuật
│   │   │   ├── accounting/     #  Kế toán
│   │   │   ├── general/        #  Tổng hợp
│   │   │   ├── face/           #  Kiosk + Face admin
│   │   │   └── common/         #  Dashboard, MyHistory, v.v.
│   │   ├── components/         # 251 TSX — shared + domain components
│   │   ├── hooks/              # 70 custom hooks (TanStack Query wrappers)
│   │   ├── contexts/           # AuthContext
│   │   ├── services/           # API clients
│   │   └── App.tsx             # Router
│   ├── e2e/                    # Playwright E2E tests
│   ├── Dockerfile              # Production (multi-stage)
│   ├── Dockerfile.dev          # Development (Vite HMR)
│   └── package.json
│
├── backend/                    # Express API
│   ├── src/
│   │   ├── routes/             # 82 route files + ROUTE_MAP (index.ts)
│   │   ├── controllers/        # HTTP layer — parse req/res only
│   │   ├── services/           # ~90 services — business logic + Prisma
│   │   ├── middlewares/        # auth, rbacAbac, rateLimiter, validation, upload
│   │   ├── config/             # env, database (PrismaClient), redis, logger
│   │   ├── utils/              # errors (typed), helpers, dateUtils, crypto
│   │   ├── types/              # Shared TypeScript types
│   │   ├── schemas/            # Zod validation schemas
│   │   └── index.ts            # App entry — Express setup + WS + cron
│   ├── prisma/
│   │   ├── schema/             # 5 files: _base + auth + common + business_orders + business_production + business_machines
│   │   ├── migrations/         # Prisma migrations (history)
│   │   ├── seed.ts             # Main seed
│   │   ├── seed-data/          # Seed data files (machine systems, positions, v.v.)
│   │   └── init.sql            # DB init (schema creation)
│   ├── Dockerfile              # Production
│   ├── Dockerfile.dev          # Development (ts-node + nodemon)
│   └── package.json
│
├── ai-service/                 # FastAPI — Face + RAG
│   ├── face/                   # Face recognition: helpers, liveness, routes
│   ├── chat/                   # RAG: indexer, retrieval, llm, faithfulness, routes
│   ├── agent/                  # ReAct agent: registry (72 tools), executor, classifier
│   ├── doc_processing/         # Document upload: chunker, extractors
│   ├── eval/                   # Golden dataset (20 QA) + run_eval.py + RAGAS-ready
│   ├── config.py               # All constants + env vars
│   ├── app.py                  # FastAPI app — face routes + warmup
│   ├── main.py                 # Entry point (uvicorn)
│   ├── requirements.txt        # Full deps (RAG + face)
│   ├── requirements.face.txt   # Face-only deps (for prod Dockerfile.face)
│   ├── Dockerfile              # Full AI service (face + RAG)
│   └── Dockerfile.face         # Face-only (production — lighter)
│
├── docs/
│   └── chatbot/                # 14 markdown files — RAG knowledge base
│
├── nginx/
│   ├── nginx.conf              # Reverse proxy: HTTP→HTTPS, /api→backend, /*→frontend
│   └── ssl/                    # TLS certs (not committed)
│
├── scripts/                    # Backup scripts (bash + PowerShell)
│
├── openspec/                   # OpenSpec change tracking
│
├── docker-compose.yml          # Production (6 services + volumes + networks)
├── docker-compose.dev.yml      # Development (5 services + e2e profile)
├── DEPLOY.md                   # Deploy guide (Windows Server 2019 + Linux)
├── DEPLOY_PROD_PLAYBOOK.md     # 6-phase production playbook (backup 3 lớp)
├── AGENTS.md                   # Project rules & conventions
└── CLAUDE.md                   # Claude-specific instructions
```

---

## Prerequisites

| Yêu cầu | Phiên bản | Ghi chú |
|---------|-----------|---------|
| Docker Desktop / Engine + Compose v2 | 24+ | Bắt buộc cho cả dev và prod |
| Node.js | 20+ | Chỉ cần nếu chạy backend/frontend ngoài Docker |
| Python | 3.11 | Chỉ cần nếu chạy ai-service ngoài Docker |
| RAM | 16GB khuyến nghị | TensorFlow + PyTorch + embeddings |
| Disk | 20GB trống | Models (~500MB) + DB + uploads |

---

## Environment Variables

### Bắt buộc (production)

| Variable | Mô tả | Ví dụ |
|----------|-------|-------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://erp_user:***@postgres:5432/erp_database` |
| `JWT_SECRET` | Secret cho access token (≥64 chars) | — |
| `JWT_REFRESH_SECRET` | Secret cho refresh token (≥64 chars) | — |
| `REDIS_PASSWORD` | Mật khẩu Redis (bắt buộc, không có default trong prod) | — |
| `CORS_ORIGIN` | Origins cho phép (comma-separated) | `https://anbinhfoods.net,https://www.anbinhfoods.net` |
| `FACE_DATA_SECRET` | Secret mã hóa face embeddings | — |

### Tùy chọn

| Variable | Default (dev) | Mô tả |
|----------|---------------|-------|
| `JWT_EXPIRE` | `30m` | Thời hạn access token |
| `JWT_REFRESH_EXPIRE` | `30d` | Thời hạn refresh token |
| `AI_SERVICE_URL` | `http://ai-service:8001` (dev) / `http://erp_ai:8001` (prod) | URL AI service — backend gọi tới |
| `OPENROUTER_API_KEY` | (trống) | API key cho DeepSeek LLM (RAG + agent) |
| `OPENROUTER_MODEL` | `deepseek/deepseek-chat-v3-0324` | Model LLM |
| `VAPID_PUBLIC_KEY` | (trống) | Public key cho Web Push |
| `VAPID_PRIVATE_KEY` | (trống) | Private key cho Web Push (`npx web-push generate-vapid-keys`) |
| `VAPID_SUBJECT` | `mailto:admin@anbinhfoods.net` | Subject cho Web Push |
| `LOG_LEVEL` | `debug` (dev) / `warn` (prod) | Mức log (winston) |
| `VITE_API_URL` | `http://localhost:5003/api` (dev) | URL backend cho frontend |
| `VITE_FACE_DEVICE_KEY` | (trống) | Device key cho kiosk chấm công |
| `VITE_FACE_DEVICE_ID` | (trống) | Device ID cho kiosk |
| `APP_TIMEZONE` | `Asia/Ho_Chi_Minh` | Timezone cho date handling |

> Xem `.env.production.example` ở root để có template đầy đủ.
> Trong Docker dev, các giá trị dev đã được hardcode trong `docker-compose.dev.yml` — không cần file `.env`.

---

## Development Setup

### Khởi động toàn bộ stack (khuyến nghị)

```bash
# 1. Clone
git clone https://github.com/phantanquoc/ERP_V6.git
cd ERP_V6

# 2. Start tất cả services (backend, frontend, postgres, redis, ai-service)
docker compose -f docker-compose.dev.yml up --build -d

# Lần đầu build mất ~10-15 phút (cài Python deps + build frontend)
# Các lần sau nhanh hơn nhờ Docker layer cache
```

### Kiểm tra services

```bash
docker compose -f docker-compose.dev.yml ps
# Tất cả containers phải ở trạng thái healthy/running

# Xem logs
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f ai-service
```

### Truy cập

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5003/api |
| Backend Health | http://localhost:5003/health |
| AI Service | http://localhost:8001 |
| AI Health | http://localhost:8001/health |
| PostgreSQL | localhost:5432 (user: `erp_user`, db: `erp_database`) |
| Redis | Không expose port (chỉ trong Docker network) |

> **Lưu ý port:** Backend internal port là 5000, nhưng Docker dev map ra ngoài thành **:5003**. Frontend `VITE_API_URL` phải trỏ tới `:5003`.

---

## Database Setup

```bash
# Generate Prisma client (sau khi thay đổi schema)
cd backend && npx prisma generate

# Tạo + apply migration (development — có lịch sử)
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate dev --name <ten_migration>

# Apply migration (production — không tạo file mới)
docker compose -f docker-compose.dev.yml exec backend npx prisma migrate deploy

# Seed dữ liệu mẫu
docker compose -f docker-compose.dev.yml exec backend npx prisma db seed
# hoặc trực tiếp:
docker compose -f docker-compose.dev.yml exec backend npm run prisma:seed

# Mở Prisma Studio (visual DB browser)
docker compose -f docker-compose.dev.yml exec backend npx prisma studio
# hoặc local:
cd backend && npx prisma studio
```

**Multi-schema Prisma:** 3 schemas — `auth`, `business`, `common`. Mọi model phải có `@@schema(...)`. Xem `backend/prisma/schema/` để biết chi tiết từng domain.

---

## Running Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Dev server (Vite HMR — cần backend đang chạy)
npm run dev
# → http://localhost:5173

# Production build
npm run build

# Type check (PHẢI pass — 0 lỗi)
npx tsc --noEmit -p tsconfig.app.json

# Lint
npm run lint

# Tests (Vitest)
npm run test
npm run test:run        # single run
npm run test:coverage   # with coverage

# E2E (Playwright — cần Docker dev stack)
docker compose -f docker-compose.dev.yml --profile e2e up --build
```

---

## Running Backend

```bash
cd backend

# Cài dependencies
npm install

# Generate Prisma client
npx prisma generate

# Dev server (nodemon + ts-node — auto-reload)
npm run dev
# → http://localhost:5000 (hoặc :5003 nếu qua Docker)

# Production build
npm run build
# → tsc + tsc-alias → dist/

# Start production
npm start
# → node dist/index.js

# Type check (PHẢI pass)
npx tsc --noEmit

# Lint
npm run lint
npm run lint:fix         # auto-fix

# Tests (Jest)
npm test
npm run test:coverage
npx jest src/__tests__/auth.test.ts --runInBand   # chạy 1 file
```

---

## Running AI Service

```bash
cd ai-service

# Cài dependencies
pip install -r requirements.txt
# Hoặc chỉ face (nhẹ hơn — cho production):
pip install -r requirements.face.txt

# Chạy server
python main.py
# hoặc:
uvicorn app:app --host 0.0.0.0 --port 8001 --reload

# Health check
curl http://localhost:8001/health

# Chạy RAG evaluation (cần OPENROUTER_API_KEY)
pip install -r eval/requirements-eval.txt
python eval/run_eval.py --url http://localhost:8001

# Chạy tests
python -m pytest tests/ -x -q
python -m pytest tests/test_registry.py -x -q    # chỉ registry (72 tools)
```

> **Lưu ý:** Lần đầu startup, AI service download ~500MB models (ArcFace, RetinaFace, Vietnamese embedding, FlashRank) — đợi log `Warmup complete` / `RAG ready`.

---

## Docker

### Development

```bash
# Start toàn bộ stack
docker compose -f docker-compose.dev.yml up --build -d

# Start với E2E tests
docker compose -f docker-compose.dev.yml --profile e2e up --build

# Restart 1 service (không đụng DB)
docker compose -f docker-compose.dev.yml restart backend
docker compose -f docker-compose.dev.yml restart ai-service

# Xem logs
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend

# Dừng (giữ data)
docker compose -f docker-compose.dev.yml down

# Dừng + xóa volumes (RESET DATABASE — cần xác nhận)
docker compose -f docker-compose.dev.yml down -v
```

### Production

```bash
# Build + start
docker compose up --build -d

# Xem trạng thái
docker compose ps

# Logs
docker compose logs -f backend
docker compose logs -f nginx

# Restart 1 service
docker compose restart backend

# KHÔNG BAO GIỜ chạy down -v trên production nếu chưa backup
# Dùng playbook: DEPLOY_PROD_PLAYBOOK.md
```

### Services & Ports

| Container (prod) | Container (dev) | Image | Ports | Mô tả |
|-----------------|-----------------|-------|-------|-------|
| `erp_postgres` | `erp_dev_postgres` | postgres:16-alpine | — (prod) / 5432 (dev) | Database |
| `erp_redis` | `erp_dev_redis` | redis:7-alpine | — (không expose) | Cache + rate limiting |
| `erp_backend` | `erp_dev_backend` | erp_v6-backend | — (prod) / 5003:5000 (dev) | Express API |
| `erp_frontend` | `erp_dev_frontend` | erp_v6-frontend | — (prod) / 5173:5173 (dev) | React SPA |
| `erp_ai` | `erp_dev_ai` | erp_v6-ai-service | — (prod) / 8001:8001 (dev) | FastAPI |
| `erp_nginx` | — | nginx:alpine | 80 + 443 | Reverse proxy (prod only) |
| — | `erp_dev_e2e` | erp_v6-e2e | — | Playwright E2E (profile: e2e) |

### Volumes

| Volume (prod) | Volume (dev) | Mô tả |
|---------------|--------------|-------|
| `postgres_data` | `postgres_dev_data` | Dữ liệu PostgreSQL |
| `backend_uploads` | `backend_uploads_dev` | File uploads |
| `backend_logs` | — | Logs backend |
| `nginx_logs` | — | Logs nginx |
| `deepface_weights` | `deepface_weights` (shared) | Model weights (ArcFace, v.v.) |

---

## Production Deployment

Xem playbook chi tiết: **[DEPLOY_PROD_PLAYBOOK.md](./DEPLOY_PROD_PLAYBOOK.md)** — quy trình 6-phase an toàn, ưu tiên **không bao giờ mất dữ liệu**.

Tóm tắt:

```
Phase 0: Pre-flight + Backup 3 lớp (pg_dump + volume tar + uploads tar) + Verify
Phase 1: Pull (fast-forward only — fail nếu diverged)
Phase 2: Rebuild + Health verify (không đụng postgres/redis)
Phase 3: Migrate (prisma migrate deploy — chỉ additive được auto-tiếp)
Phase 4: Smoke test (health endpoints + login + critical flows)
Phase 5: Verify + Keep backup (giữ backup 7 ngày, log checksums)
```

**Thông tin hạ tầng:**

- **VPS:** `erp@14.224.233.11 -p 2223`
- **Project dir:** `/home/erp/ERP_V6`
- **Backup dir:** `/backup/erp-backups/pre-deploy/`
- **DB:** `erp_user` / `erp_database`

**Nguyên tắc:**

- Backup TRƯỚC mọi thứ, kể cả khi không có migration.
- Kiểm tra migration destructive (`DROP TABLE/COLUMN`, `ALTER TYPE`) — DỪNG nếu phát hiện.
- `git merge --ff-only` — không tạo merge commit, fail nếu prod diverged.
- Không phase nào được bỏ qua trừ khi ghi rõ điều kiện.

Xem thêm: [DEPLOY.md](./DEPLOY.md) cho cấu hình Windows Server 2019, SSL, DNS, firewall.

---

## Backup / Recovery

### Backup tự động (scripts/)

```bash
# Backup scripts nằm trong scripts/ — hỗ trợ cả bash và PowerShell
ls scripts/
```

### Backup thủ công (3 lớp — theo playbook)

```bash
TS=$(date +%Y%m%d_%H%M%S)
BK=/backup/erp-backups/pre-deploy
mkdir -p $BK

# Lớp 1: pg_dump custom format
docker compose exec -T postgres pg_dump -U erp_user -Fc erp_database > $BK/pre_deploy_$TS.dump

# Lớp 2: postgres volume
docker run --rm -v erp_postgres_data:/data -v $BK:/backup alpine tar czf /backup/postgres_volume_$TS.tar.gz -C /data .

# Lớp 3: uploads
docker compose exec -T backend tar czf - -C /app uploads > $BK/uploads_$TS.tar.gz

# Verify (bắt buộc — không chỉ checksum)
docker compose exec -T postgres pg_restore -l $BK/pre_deploy_$TS.dump | head
tar tzf $BK/postgres_volume_$TS.tar.gz | head
tar tzf $BK/uploads_$TS.tar.gz | head
sha256sum $BK/*_$TS.* >> $BK/checksums.log
```

### Recovery

```bash
# Restore từ pg_dump
docker compose exec -T postgres pg_restore -U erp_user -d erp_database --clean --if-exists < /backup/erp-backups/pre-deploy/pre_deploy_$TS.dump

# Hoặc restore volume
docker compose down
docker run --rm -v erp_postgres_data:/data -v /backup/erp-backups/pre-deploy:/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/postgres_volume_$TS.tar.gz -C /data"
docker compose up -d
```

> **Cảnh báo:** Không bao giờ chạy `docker compose down -v` trên production nếu chưa backup — sẽ xóa toàn bộ dữ liệu PostgreSQL.
> Không bao giờ down container `postgres`/`db` — chỉ restart `backend`/`frontend`/`ai-service`.

---

## Current Status

| Area | Status | Evidence / Notes |
|------|--------|-----------------|
| **ERP Core** | Production | 82 routes, ~90 services, 60+ Prisma models, 3 schemas |
| **Sales / CRM** | Production | QuotationRequest → Calculator → Quotation → Order (7 production statuses), pricing overview |
| **Procurement** | Production | Supplier, PurchaseRequest (4 source types), SupplyRequest (fulfillment tracking), ReorderRule |
| **Inventory** | Production | Warehouse → Lot → Slot → LotProduct, BM01/BM03 multi-item receipts/issues, stock tracking |
| **Manufacturing** | Production | MaterialStandard, ProductionProcess (flowchart + costing), MaterialEvaluation → SystemOperation (4 phases) → FinishedProduct (8 grades) → QualityEvaluation |
| **Quality** | Production | MaterialStandard, QualityEvaluation, InternalInspection, MaterialEvaluationCriteria |
| **Engineering** | Production | MachineSystem (14 categories, clone hierarchy), FaultRecord/Template, SparePart, RepairRequest, AcceptanceHandover, MaintenancePlan/Record/Template, Project (phases/tasks/costs) |
| **Finance** | Production | Invoice, Debt, TaxReport (5 statuses), GeneralCost, ExportCost |
| **HR** | Production | Employee, Position/Level/Responsibility, Attendance (shift derivation), Timesheet, LeaveRequest, OvertimePlan, Payroll (OT 1.5/2/3×), Evaluation (QUICK/FULL, peer feedback, appeal) |
| **Collaboration** | Production | Task, WorkPlan, DailyWorkReport, Notification (WS+Web Push), PrivateFeedback, AuditLog |
| **AI — RAG Chatbot** | Production | ChromaDB + BM25 + RRF + FlashRank + DeepSeek, 14 knowledge docs, confidence gate, faithfulness check, semantic cache, golden dataset |
| **AI — Agent** | Production | 72 tools, ReAct loop (max 5 iter), department scoping, write confirmation, file upload |
| **Computer Vision** | Production | ArcFace + RetinaFace/Yunet/SSD, MiniFASNet + LBP + temporal (4-layer liveness), kiosk V1/V2/V3, adaptive gallery |
| **Infrastructure** | Production | Docker Compose (prod+dev), Nginx (TLS 1.2/1.3), healthchecks, resource limits, 6-phase deploy playbook |
| **Security** | Production | JWT (access+refresh), RBAC+ABAC, rate limiting (Redis), helmet, audit log, secret guards |
| **Realtime** | Production | WebSocket (ws) + Web Push (VAPID), notification registry, heartbeat 30s |
| **Testing** | Partial | Backend: Jest (~20 test files), Frontend: Vitest + Playwright E2E, AI: pytest (6 test files) |
| **Mobile** | Planned | Chưa có — responsive web là chính |
| **Multi-site / Multi-company** | Planned | Single-site, single-company hiện tại |
| **BI / Analytics** | Partial | BusinessReport page, Dashboard1 (55K lines), chưa có dedicated BI service |
| **IoT / Sensors** | Planned | Chưa có — machine data nhập thủ công |

---

## Roadmap

### Phase 1 — Integrated ERP (Hiện tại — Production)

Hệ thống ERP tích hợp hoàn chỉnh cho An Binh Foods: Sales → Procurement → Warehouse → Manufacturing → Quality → Finance → HR, với RBAC+ABAC, realtime notifications, và file management.

### Phase 2 — AI-Assisted ERP (Hiện tại — Production)

RAG chatbot (14 knowledge docs, hybrid retrieval, faithfulness) + ReAct agent (72 tools) + Face recognition kiosk (4-layer liveness). AI là lớp hỗ trợ vận hành, không phải sản phẩm độc lập.

### Phase 3 — Data-Driven ERP (Near-term)

- **BI Dashboard mở rộng** — Khai thác dữ liệu manufacturing (yield, waste, costing variance) và sales (quotation conversion, order pipeline).
- **Báo cáo tùy chỉnh** — Builder cho phép tạo báo cáo theo nhu cầu từng phòng ban.
- **Mobile-responsive enhancement** — Tối ưu cho tablet tại xưởng (kiosk + data entry).
- **Skill Matrix cho công nhân sản xuất** — Follow-up từ evaluation enhancement (BS4).

### Phase 4 — Smart Factory (Future)

- **IoT integration** — Kết nối cảm biến nhiệt/áp suất từ hệ thống sấy → SystemOperation auto-fill.
- **Predictive maintenance** — Từ schedule-based (hiện tại) → condition-based dựa trên MachineStatusLog + FaultRecord history.
- **Yield optimization** — Phân tích MaterialEvaluation + FinishedProduct để tối ưu tỉ lệ thu hồi.

### Phase 5 — Enterprise Platform (Future)

- **Multi-site support** — Nhiều nhà máy, kho, với data isolation.
- **API ecosystem** — Public API + webhooks cho tích hợp bên thứ ba (accounting software, logistics).
- **Microservices evolution** — Tách AI service và manufacturing service khi scale đòi hỏi (hiện tại modular monolith là đủ).

---

## Documentation

| Tài liệu | Mô tả |
|----------|-------|
| [AGENTS.md](./AGENTS.md) | Quy tắc dự án, conventions, high-risk areas, gotchas |
| [CLAUDE.md](./CLAUDE.md) | Hướng dẫn cho Claude Code |
| [DEPLOY.md](./DEPLOY.md) | Hướng dẫn deploy (Windows Server + Linux) |
| [DEPLOY_PROD_PLAYBOOK.md](./DEPLOY_PROD_PLAYBOOK.md) | Playbook 6-phase production deploy |
| [docs/chatbot/](./docs/chatbot/) | Knowledge base cho RAG (14 files) |
| [openspec/](./openspec/) | Change tracking (OpenSpec) |
| Swagger UI | `http://localhost:5003/api-docs` (khi backend đang chạy) |

---

## Contributing

### Quy trình implement feature

Thứ tự bắt buộc (theo `AGENTS.md`):

```
1. Prisma schema (schema.prisma) + migration
2. Backend: service → controller → route → đăng ký vào ROUTE_MAP (backend/src/routes/index.ts)
3. Frontend: service types → custom hook → component(s)
```

### Verification (chạy trước khi kết thúc task)

```bash
# Backend
cd backend && npx tsc --noEmit          # Type check — PHẢI pass (0 lỗi)
cd backend && npm run lint               # ESLint
cd backend && npm test                   # Jest

# Frontend
cd frontend && npx tsc --noEmit -p tsconfig.app.json   # Type check — PHẢI pass (0 lỗi)
cd frontend && npm run lint              # ESLint

# AI Service
cd ai-service && python -m pytest tests/ -x -q
```

### Quy tắc

- Không gọi Prisma trực tiếp từ controller — phải qua service.
- Không thêm LLM provider — giữ OpenRouter là provider duy nhất.
- Không expose `PATCH /status` endpoint chung — status chỉ thay đổi qua business events.
- Không dùng `docker compose down -v` mà không xác nhận — sẽ xóa toàn bộ DB.
- Commit thẳng `main` — không tạo nhánh mỗi task (theo convention hiện tại).
- Mọi API response phải có shape `{ success, message?, data?, pagination? }`.

---

## License

ISC — Internal use for An Binh Foods.

---

<p align="center">
  <sub>Built for An Binh Foods — Intelligent Manufacturing Platform</sub><br>
  <sub>An Binh Foods · Trái cây sấy · Sản xuất · Chất lượng · Công nghệ</sub>
</p>
