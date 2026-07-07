# Design — Multi-file Section Attachments

## Context

Hiện tại `ProcessFlowchartSection` và `ProductionFlowchartSection` mỗi row có `fileUrl String?` — 1 file / phân đoạn. Người dùng yêu cầu nhiều file / phân đoạn kèm metadata (uploadedBy, uploadedAt, fileName, description, order).

`AGENTS.md` cấm JSON columns cho related items → dùng bảng con với FK cascade.

## Schema Design

### Nguyên tắc

- CUID id (`@id @default(cuid())`)
- Multi-schema Prisma: `@@schema("common")` (nơi các model flowchart hiện có)
- Cascade delete từ section → files (xóa section → xóa hết file records; blob trên disk tạm giữ, cleanup job tách sau)
- FK `uploadedById` optional (nullable) — nếu user bị xóa, file record vẫn còn với `uploadedById = null`
- Index `@@index([sectionId, order])` để list files theo section theo thứ tự nhanh

### Model mới

```prisma
model ProcessFlowchartSectionFile {
  id             String                  @id @default(cuid())
  sectionId      String
  url            String
  fileName       String?
  description    String?
  order          Int                     @default(0)
  uploadedById   String?
  uploadedAt     DateTime                @default(now())
  section        ProcessFlowchartSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  uploadedBy     User?                   @relation(fields: [uploadedById], references: [id], onDelete: SetNull)

  @@index([sectionId, order])
  @@map("process_flowchart_section_files")
  @@schema("common")
}

model ProductionFlowchartSectionFile {
  id             String                     @id @default(cuid())
  sectionId      String
  url            String
  fileName       String?
  description    String?
  order          Int                        @default(0)
  uploadedById   String?
  uploadedAt     DateTime                   @default(now())
  section        ProductionFlowchartSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  uploadedBy     User?                      @relation(fields: [uploadedById], references: [id], onDelete: SetNull)

  @@index([sectionId, order])
  @@map("production_flowchart_section_files")
  @@schema("common")
}
```

Trên các model gốc:
- `ProcessFlowchartSection`: thêm `files ProcessFlowchartSectionFile[]`, drop `fileUrl` ở migration (b)
- `ProductionFlowchartSection`: thêm `files ProductionFlowchartSectionFile[]`, drop `fileUrl` ở migration (b)
- `User`: thêm 2 back-relation `processFlowchartSectionFiles`, `productionFlowchartSectionFiles`

## Migration Strategy

**Split thành 2 migration** để tránh mất data:

### Migration A — `add_section_files`

1. Create table `process_flowchart_section_files` + `production_flowchart_section_files`
2. Data migration inline (raw SQL trong migration file):
   ```sql
   INSERT INTO common.process_flowchart_section_files (id, "sectionId", url, "fileName", "order", "uploadedAt")
   SELECT
     'cf' || substr(md5(random()::text || id), 1, 23) AS id,  -- cuid-like fallback
     id AS "sectionId",
     "fileUrl" AS url,
     regexp_replace(
       regexp_replace("fileUrl", '.*/', ''),
       '-\d+-\d+(?=\.)', '', 'g'
     ) AS "fileName",
     0 AS "order",
     NOW() AS "uploadedAt"
   FROM common.process_flowchart_sections
   WHERE "fileUrl" IS NOT NULL AND "fileUrl" <> '';
   ```
   (tương tự cho production)
3. Chưa drop `fileUrl` — cột vẫn còn, chỉ backfill

### Migration B — `drop_section_fileurl`

- Chạy sau khi (a) migration A đã apply prod, (b) code backend + frontend đọc từ `files[]` đã deploy, (c) verify không còn code path nào đọc `fileUrl` cũ
- `ALTER TABLE ... DROP COLUMN "fileUrl";`

**Lý do split**: nếu backend deploy chậm hơn migration, code cũ vẫn đọc `fileUrl` được (nullable, không crash) — chỉ hiển thị thiếu file cho đến khi backend mới lên. Nếu drop luôn trong migration A, code cũ đọc `fileUrl` sẽ Prisma runtime error trên field không tồn tại.

## Backend Service Design

### `processService.createFlowchart`

Trong `prisma.$transaction`:
1. Tạo `ProcessFlowchart`
2. `createMany` sections
3. Với mỗi section có `files[]`: fetch section id, `createMany` files với `sectionId`, `url`, `fileName`, `description`, `order = index`, `uploadedById = ctx.userId`
4. `createMany` costs

### `processService.updateFlowchart` (delete-then-recreate)

Trong `prisma.$transaction`:
1. `deleteMany` sections theo flowchartId → cascade xóa costs + files
2. Tạo lại sections
3. Tạo lại files từ input (như create)
4. Tạo lại costs

Không update từng file — luôn delete-then-recreate (khớp convention `AGENTS.md` "Update items bằng delete-then-recreate").

### `processService.getProcessById` include

```typescript
include: {
  flowchart: {
    include: {
      sections: {
        include: {
          files: { orderBy: { order: 'asc' } },
          costs: true
        },
        orderBy: { stt: 'asc' }
      }
    }
  }
}
```

Tương tự cho `productionProcessService`.

### User context cho uploadedById

Service method signature nhận thêm optional `uploadedById?: string` (nếu không có → null). Controller lấy từ `req.user.id` khi gọi service. Update flowchart: nếu file mới thêm → `uploadedById = req.user.id`; nếu file cũ đã có trong DB (identify bằng url + order match) → giữ nguyên `uploadedById` cũ.

**Chi tiết identify file cũ vs mới trong delete-then-recreate**:
Khi client gửi `files[]`, mỗi file có thể có `id` (từ DB) hoặc không (mới upload). Service:
- File có `id` + tồn tại trong DB cũ → dùng lại `uploadedById`, `uploadedAt` từ record cũ (fetch trước khi delete)
- File không có `id` → tạo mới, `uploadedById = req.user.id`, `uploadedAt = now()`

Implementation:
```typescript
// Step 1: fetch old files (id, uploadedById, uploadedAt) → Map<id, {uploadedById, uploadedAt}>
// Step 2: delete-then-recreate sections + files
// Step 3: for each new file: if input.id exists in oldMap → use old metadata; else → new metadata
```

## Frontend Design

### Types

```typescript
// frontend/src/services/processService.ts
export interface SectionFile {
  id?: string;         // optional — có khi đã persist
  url: string;
  fileName?: string;
  description?: string;
  order: number;
  uploadedById?: string | null;
  uploadedBy?: { id: string; hoTen: string } | null; // populated by include
  uploadedAt?: string;
}

export interface ProcessFlowchartSection {
  // ... existing fields except fileUrl removed
  files: SectionFile[];
}
```

Tương tự cho `productionProcessService.ts`.

### Edit modal UX

- Nút "Thêm biểu mẫu" → `<input type="file">` (dùng existing FileUpload) → POST upload endpoint hiện tại → append vào `section.files[]` với `order = length`
- Mỗi row: filename, description input, nút Xem, nút Xóa, nút ↑/↓ để đổi order
- Save flowchart → gửi `files[]` với `order` sequential (0, 1, 2, ...)

### View mode UX

- Cột "Biểu mẫu" render danh sách numbered chips: `[📄 1] [📄 2] [📄 3]`
- Click chip → mở preview modal (existing pattern)
- Tooltip trên chip hiển thị filename + uploadedBy.hoTen + uploadedAt
- Popover option: click "..." nút → menu với "Xem", "In", "Xem thông tin" (hiển thị description + uploadedBy + uploadedAt)

### Read-only view (QuotationCalculatorModal)

- Không có nút Xóa/edit — chỉ list chips Xem/In
- Cell layout: `<div className="flex flex-col items-center gap-1">` với mỗi file 1 dòng "1. fileName [Xem] [In]"

## Alternatives Considered

1. **Hướng A (`fileUrls String[]`)** — rejected: không lưu được metadata, vi phạm convention "no JSON columns"
2. **Single migration drop + backfill trong 1 lần** — rejected: rủi ro rollback khó khi backend chưa deploy
3. **Endpoint mới POST /section-files** — rejected: không cần vì upload endpoint hiện tại đã trả `fileUrl`, DB row được tạo lúc save flowchart (nhất quán pattern cost + section hiện tại)
4. **Không cho user upload thêm sau khi save** — rejected: user cần update flexible, delete-then-recreate đã handle được

## Risks

- **Backfill sai** → mất data biểu mẫu cũ. Mitigation: backup DB trước migration A; migration A không drop cột nào — có thể re-run backfill
- **`fileName` extract sai** từ URL cũ do encoding → chấp nhận vì user có thể edit lại trong UI edit
- **Race condition** khi 2 user cùng edit 1 flowchart → không mới, đã tồn tại từ trước với `fileUrl` single; delete-then-recreate + `$transaction` giữ nguyên đảm bảo atomicity
- **Blob orphan** khi user xóa file trong UI: DB record xóa, nhưng file trên disk còn. Chấp nhận — cleanup job tách sau (nhất quán với upload hiện tại)

## Testing

- Backend: jest test `processService.test.ts` (nếu chưa có, tạo mới):
  - Create flowchart với 0, 1, 2 files → verify persisted
  - Update flowchart giữ nguyên file cũ (id match) → verify `uploadedAt` không đổi
  - Update flowchart xóa file cũ → verify record biến mất
  - Update flowchart reorder → verify `order` field mới
- Backfill: manual verification qua psql sau migrate dev — count files table = count sections có `fileUrl`
- Frontend: manual smoke test 4 components sau khi implement

## Verification Order

Sau khi implement:
1. `cd backend && npx tsc --noEmit`
2. `cd backend && npm test`
3. `cd frontend && npx tsc --noEmit`
4. `cd frontend && npm run lint`
5. `mcp__gitnexus__detect_changes` — kiểm tra blast radius trước commit
