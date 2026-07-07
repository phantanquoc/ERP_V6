# Tasks — Multi-file Section Attachments

## Task 1: Prisma Schema — Add new models

- [ ] Add `ProcessFlowchartSectionFile` model to `backend/prisma/schema/common.prisma`
- [ ] Add `ProductionFlowchartSectionFile` model to `backend/prisma/schema/common.prisma`
- [ ] Add `files ProcessFlowchartSectionFile[]` relation on `ProcessFlowchartSection`
- [ ] Add `files ProductionFlowchartSectionFile[]` relation on `ProductionFlowchartSection`
- [ ] Add back-relations on `User` model (`processFlowchartSectionFiles`, `productionFlowchartSectionFiles`)
- [ ] Run `npx prisma generate` to verify schema validity

## Task 2: Migration A — Create tables + backfill

- [ ] Run `npx prisma migrate dev --name add_section_files --create-only`
- [ ] Add inline SQL backfill to migration file:
  - INSERT into `process_flowchart_section_files` from sections with non-null `fileUrl`
  - INSERT into `production_flowchart_section_files` from sections with non-null `fileUrl`
- [ ] Apply migration: `npx prisma migrate dev`
- [ ] Verify backfill: count files table = count sections with `fileUrl`
- [ ] Do NOT drop `fileUrl` column yet

## Task 3: Backend Service — processService.ts

- [ ] Update `createFlowchart`: after creating sections, `createMany` files from `section.files[]` input with `uploadedById`
- [ ] Update `updateFlowchart`: fetch old file metadata (id, uploadedById, uploadedAt) before delete; after recreating sections, create files preserving old metadata for files with matching `id`
- [ ] Update `getProcessById` include: add `files: { orderBy: { order: 'asc' } }` inside sections include
- [ ] Update any other reads that include sections to also include files

## Task 4: Backend Service — productionProcessService.ts

- [ ] Same changes as Task 3 but for production counterpart
- [ ] Update `createProductionProcess` / `updateProductionProcess` / relevant flowchart methods
- [ ] Update `getProductionProcessById` include to add files

## Task 5: Backend Tests

- [ ] Create or update `processService.test.ts`:
  - Create flowchart with 0, 1, 2 files → verify persisted
  - Update flowchart keeping old file (id match) → verify `uploadedAt` unchanged
  - Update flowchart removing file → verify record deleted
  - Update flowchart reorder → verify new `order` values
- [ ] Run `npm test` — all pass

## Task 6: Frontend Types + Service Methods

- [ ] `frontend/src/services/processService.ts`: Add `SectionFile` interface, update `ProcessFlowchartSection` to include `files: SectionFile[]` (keep `fileUrl?` for backward compat until Migration B)
- [ ] `frontend/src/services/productionProcessService.ts`: Same updates
- [ ] Update `createFlowchart`/`updateFlowchart` payload to send `section.files[]`

## Task 7: Frontend — ProcessManagement.tsx (edit modal)

- [ ] Replace single file upload with multi-file list UI
- [ ] Each file row: fileName, description input, Xem, In, Xóa, ↑/↓ order buttons
- [ ] "Thêm biểu mẫu" button → FileUpload → append to `section.files[]`
- [ ] On save: send `files[]` with sequential `order` (0, 1, 2...)

## Task 8: Frontend — ProcessManagement.tsx (view modal)

- [ ] Update "Biểu mẫu" column to render list of file chips/buttons instead of single file
- [ ] Each file: numbered chip with Xem + In buttons
- [ ] Tooltip: fileName + uploadedBy.hoTen + uploadedAt

## Task 9: Frontend — ProcessListModal.tsx

- [ ] Update "Biểu mẫu" column to render multi-file chips
- [ ] Reuse existing `getFullFileUrl`, `handlePrintFile`, `previewFileUrl` state

## Task 10: Frontend — ProductionProcessManagement.tsx

- [ ] Edit table: multi-file upload list per section
- [ ] View modal: multi-file chips in "Biểu mẫu" column

## Task 11: Frontend — QuotationCalculatorModal.tsx

- [ ] Both flowchart tables: update "Biểu mẫu" column from single file to list
- [ ] Read-only: no edit/delete, just Xem + In per file

## Task 12: Migration B — Drop fileUrl (DEFERRED)

- [ ] Only after Tasks 1-11 deployed and verified in production
- [ ] Create migration dropping `fileUrl` from both section tables
- [ ] Remove `fileUrl` references from frontend types

## Verification

After implementation:
1. `cd backend && npx tsc --noEmit`
2. `cd backend && npm test`
3. `cd frontend && npx tsc --noEmit`
4. `cd frontend && npm run lint`
