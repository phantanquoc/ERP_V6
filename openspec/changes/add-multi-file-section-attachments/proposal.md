## Why

Mỗi phân đoạn (section) trong lưu đồ quy trình hiện chỉ đính kèm được **1 biểu mẫu** (`section.fileUrl String?`). Người dùng cần đính kèm **nhiều biểu mẫu** cho 1 phân đoạn, kèm theo metadata: tên file gốc, mô tả, người upload, thời điểm upload, và thứ tự hiển thị. Convention của repo (`AGENTS.md` → "Child tables, không dùng JSON columns") yêu cầu quan hệ nhiều-file phải được model bằng bảng con với cascade delete, không dùng `String[]`.

Yêu cầu áp dụng đồng thời cho cả 2 họ: Quy trình (`Process`) và Quy trình sản xuất (`ProductionProcess`).

## What Changes

- **BREAKING** Bỏ field `fileUrl String?` khỏi `ProcessFlowchartSection` và `ProductionFlowchartSection`
- Thêm model `ProcessFlowchartSectionFile` (many-to-one với `ProcessFlowchartSection`, cascade delete)
- Thêm model `ProductionFlowchartSectionFile` (many-to-one với `ProductionFlowchartSection`, cascade delete)
- Data migration: mỗi row cũ có `fileUrl` → insert 1 row `SectionFile { url: fileUrl, fileName: extractFromUrl(fileUrl), order: 0 }` trước khi drop cột `fileUrl`
- Backend `processService.createFlowchart` / `updateFlowchart` và `productionProcessService` counterpart: nhận `section.files: SectionFileInput[]` thay `section.fileUrl`. Update dùng delete-then-recreate pattern (nhất quán với order items / supply request items)
- Frontend types: `ProcessFlowchartSection.fileUrl?` → `ProcessFlowchartSection.files: SectionFile[]` (tương tự cho Production)
- Frontend upload flow không tạo endpoint mới — vẫn dùng `POST /processes/upload-file` và `POST /production-processes/upload-file` để lấy `fileUrl`, sau đó client append vào `section.files[]`. DB row chỉ được insert khi save flowchart
- Frontend edit modals (ProcessManagement + ProductionProcessManagement): thay input 1 file bằng danh sách nhiều file với upload thêm, edit description, kéo/nút đổi thứ tự, xóa từng file
- Frontend view modals (ProcessManagement, ProcessListModal, ProductionProcessManagement, QuotationCalculatorModal): cột "Biểu mẫu" render danh sách nút Xem/In cho từng file thay vì 1 nút. Metadata (uploadedBy, uploadedAt, description) hiển thị qua tooltip hoặc popover
- Notification: không cần — chỉ là data change, không có trạng thái workflow
- FlowchartEditor.tsx: dead code, không đụng vào

## Capabilities

### New Capabilities

- `flowchart-section-multi-file`: Mỗi phân đoạn có thể đính kèm nhiều biểu mẫu (0..N files) qua bảng con với FK cascade
- `flowchart-section-file-metadata`: Mỗi file section lưu tên file gốc, mô tả tuỳ chọn, người upload, thời điểm upload, và thứ tự hiển thị
- `production-flowchart-section-multi-file`: Cùng khả năng multi-file cho họ ProductionProcess

### Modified Capabilities

<!-- No prior spec exists for flowchart sections — new capabilities only, no delta -->

## Impact

- **Database**:
  - 2 bảng mới: `process_flowchart_section_files`, `production_flowchart_section_files` (schema `common`)
  - Drop cột `fileUrl` khỏi `process_flowchart_sections` và `production_flowchart_sections` (sau khi backfill)
  - 2 migration files: (a) create tables + backfill, (b) drop cột `fileUrl` sau khi verify backfill
- **Backend services**:
  - `backend/src/services/processService.ts` — `createFlowchart`, `updateFlowchart`, `getProcessById` (bao gồm `include: { flowchart: { include: { sections: { include: { files: true } } } } }`)
  - `backend/src/services/productionProcessService.ts` — tương tự (bao gồm `getProductionProcessById`, `createProductionProcess`, và các nơi khác đọc/ghi section)
- **Backend controllers/routes**: KHÔNG thêm endpoint mới. Endpoint upload hiện tại (`POST /processes/upload-file`, `POST /production-processes/upload-file`) giữ nguyên — chỉ trả về `{ fileUrl, fileName }`. Client tự quản lý mảng `files[]` cho tới khi save flowchart
- **Frontend services**:
  - `frontend/src/services/processService.ts` — type `ProcessFlowchartSection`, method `createFlowchart`, `updateFlowchart`
  - `frontend/src/services/productionProcessService.ts` — type `ProductionFlowchartSection`
- **Frontend components** (4 files):
  - `ProcessManagement.tsx` — edit modal (upload list + reorder + description) + 2 view tables (định mức + view modal)
  - `ProcessListModal.tsx` — view modal render list
  - `ProductionProcessManagement.tsx` — edit table (upload list) + view modal
  - `quotation-calculator/QuotationCalculatorModal.tsx` — 2 view tables (Additional cost tab + Main tab) render list
- **Backfill safety**: Migration (a) chạy trong 1 transaction: create table → insert từ `fileUrl` cũ → verify count → drop cột chỉ ở migration (b) sau khi confirm production data đã ổn
- **Không thêm external dependency** — dùng lại `lucide-react` icons và existing `Modal`/`FileUpload` components
- **User model**: dùng FK `uploadedById String?` → `User.id` để track người upload; lấy từ `req.user.id` trong service khi tạo section file record
