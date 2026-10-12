# Spec Delta

## Purpose

Unify attachment handling for purchasing documents so YCMH and YCBS behave like YCCC: up to four files per ticket, filenames derived from the ticket code, append-only semantics, and aggregated visibility across the YCCC → YCBS → YCMH → warehouse chain.

## ADDED Requirements

### Requirement: PurchaseRequest supports up to four code-named attachments
A `PurchaseRequest` SHALL store attachments in `tepDinhKem: String[]` (max 4 URLs). `fileKemTheo: String?` SHALL remain as a read-only legacy alias for rows created before this change and SHALL be surfaced whenever `tepDinhKem` is read. On create, incoming `files[]` SHALL be truncated to 4, renamed to `{maYeuCau}-{k}{ext}` via `renameAttachmentsByCode('purchase-requests', maYeuCau, urls, 1)`, and persisted; on update, incoming files SHALL be appended after existing ones continuing the numbering (`kept.length+1`) and the total SHALL NOT exceed 4 — exceeding SHALL return `400 ValidationError` before any disk rename. `ReplenishmentRequest` follows the same contract when it carries files.

#### Scenario: Create YCMH with two files renames by code
- **WHEN** a `PurchaseRequest` is created with two uploaded files and receives `maYeuCau = YC-MH-2026-042`
- **THEN** the persisted `tepDinhKem` equals `["/uploads/purchase-requests/YC-MH-2026-042-1.pdf","/uploads/purchase-requests/YC-MH-2026-042-2.jpg"]` and the files exist on disk under those names

#### Scenario: Append third file continues numbering
- **WHEN** an existing YCMH with `tepDinhKem = [..-1.pdf, ..-2.jpg]` is updated with one new file
- **THEN** the result is three URLs ending `..-1.pdf`, `..-2.jpg`, `..-3.pdf` in order, with the new file renamed to `..-3.pdf`

#### Scenario: Fifth file is rejected
- **WHEN** a YCMH already holding 3 files is updated with 2 new files
- **THEN** the system returns `400` mentioning "tối đa 4 tệp" and persists nothing

#### Scenario: Legacy fileKemTheo still visible
- **WHEN** an old YCMH row has `tepDinhKem = []` and `fileKemTheo = "/uploads/purchase-requests/old.pdf"`
- **THEN** any read returns `collectAttachments` containing `fileKemTheo` so the file remains downloadable until migrated

### Requirement: Completed YCMH remains attachment-mutable
When `trangThai === "Hoàn thành"`, `PUT /api/purchase-requests/:id` SHALL allow `tepDinhKem` append and per-URL delete (remove specific URLs from the array) while still rejecting any mutation of `items`, `nhaCungCapId`, `giaDuKien`, `phanLoai`, `tenHangHoa`, `soLuong`, `ngayDuKienNhap`, `warehouseId`, or `ghiChuVanChuyen`. When `trangThai === "Đã hủy"` no file mutation SHALL be allowed. A delete that removes a URL SHALL delete the corresponding file from disk (`deleteUploadedFile`) when it resides under `uploads/purchase-requests/`.

#### Scenario: Append invoice after completion succeeds
- **WHEN** a YCMH in `Hoàn thành` with 1 file is updated with one new invoice file
- **THEN** the system appends it as `..-2.pdf` and returns `200` while leaving pricing/schedule untouched

#### Scenario: Remove one file after completion succeeds
- **WHEN** a YCMH in `Hoàn thành` with 2 files is updated to keep only the first URL
- **THEN** the second file URL is dropped, the DB array shrinks to 1, and the orphaned file is removed from disk

#### Scenario: Editing items after completion still blocked
- **WHEN** a YCMH in `Hoàn thành` is updated with a new `items` array
- **THEN** the system returns `400 "Không thể sửa yêu cầu đã hoàn thành"` and makes no changes

### Requirement: Aggregated chain attachments are returned on reads
Every `GET /api/purchase-requests` (list) and `GET /api/purchase-requests/:id` (detail), and the corresponding YCBS/YCCC list/detail endpoints, SHALL return an `aggregatedAttachments` envelope resolved from the full chain `YCCC (SupplyRequest.tepDinhKem/fileKemTheo) → YCBS (ReplenishmentRequest.fileKemTheo/tepDinhKem) → YCMH (PurchaseRequest.tepDinhKem/fileKemTheo)` via `SupplyRequestDecision` / `SupplyRequestItem` / `ReplenishmentRequest.convertedPurchaseRequestId` links. The envelope SHALL be `{ own: string[], ybs: string[]|null, yccc: string[], all: string[] }` (deduplicated, order `yccc → ybs → own`). `all` is what listing chips and detail blocks SHALL render; individual arrays are for auditing/filtering. The same aggregated set SHALL be available to the warehouse receipt/inbound views.

#### Scenario: YCMH detail shows union of YCCC+YCBS+own files
- **WHEN** YCCC holds 2 files, YCBS holds 1 file, and YCMH holds 1 file linked through the same shortage chain
- **THEN** `GET /api/purchase-requests/:id` returns `aggregatedAttachments.all` with 4 distinct URLs and the detail modal renders 4 files

#### Scenario: YCCC view shows downstream invoices
- **WHEN** a YCCC has no own files but its downstream YCMH has 2 invoices
- **THEN** the YCCC detail/list aggregated view still shows those 2 YCMH files in `all`

#### Scenario: Purchase list row shows aggregated count
- **WHEN** `GET /api/purchase-requests` is called for the purchasing table
- **THEN** each row carries `aggregatedAttachments.all` so the chip renders the total chain count without extra requests

### Requirement: Upload uses multi-file array field
The YCMH and YCBS upload middleware SHALL accept the multipart field `files` as an array of up to 4 files (`createUploadMiddleware('purchase-requests',4).array('files',4)`), not `file` single. The controller SHALL map `req.files[]` to URLs via `getFileUrl` and forward the array to the service merge. A request sending `file` (singular) SHALL still be accepted for backward compatibility and treated as a one-element array.

#### Scenario: Multi-file form upload
- **WHEN** a client sends `PUT /api/purchase-requests/:id` with `files` containing 2 files
- **THEN** both files are stored, renamed, and appended as above

#### Scenario: Legacy single-file field still works
- **WHEN** a client sends `PUT /api/purchase-requests/:id` with the old field name `file`
- **THEN** the system treats it as `files=[file]` and succeeds
