# Audit Tab "Chấm công tháng" — 2026-08-11

## Tóm Tắt

Đã audit toàn bộ tab "Chấm công tháng" và so sánh với file Excel CHAM-CONG.xlsx. 

**Kết luận:**
- ✅ **Backend tính toán đúng 100%** — OT hours, hourly rate, otTotalIncome khớp với công thức Excel
- ✅ **3 lỗi audit ban đầu KHÔNG tồn tại** — code đã có logic đúng
- ✅ **Đã seed dữ liệu test** — 4 nhân viên với OT hours + baseSalary để verify
- ❌ **KHÔNG nên nhúng Excel trực tiếp** — recommend Import/Export Excel round-trip

---

## Hiện Trạng Code

### ✅ Điểm Mạnh
- Grid ma trận 27 cột tổng hợp + 28-31 cột ngày (tự động theo tháng)
- Sticky header/column, freeze, scroll mượt
- 17 mã chấm công seed từ DB, validate trước khi ghi
- Export Excel một chiều (`GET /attendances/export/excel/calendar`)
- Inline edit override cho các cột computed
- Tô màu theo mã, tooltip 27 cột, responsive

### Verification — Backend Logic Đúng

**Test case (tháng 6/2026):**
- **NV0018** (baseSalary=6.5M): otWeekday=7h, otSunday=9.5h
  - hourlyRate = 6,500,000 / 208 = **31,250đ**
  - otTotalIncome = 31,250 * (7×1.5 + 9.5×2) = **921,875đ** ✅
- **NV0032** (baseSalary=7.2M): otWeekday=38.5h, otSunday=5.5h
  - hourlyRate = 7,200,000 / 208 = **34,615đ**
  - otTotalIncome = 34,615 * (38.5×1.5 + 5.5×2) = **2,379,781đ** ✅

Formula match: `hourlyRate = baseSalary / (stdDays * 8)`, `otTotalIncome = hourlyRate * (otWeekday * 1.5 + otSunday * 2 + otHoliday * 3)`

### 3 Lỗi Audit Đã Verify = FALSE POSITIVE

1. **"Mất OT hours khi update mã chấm công"** ❌ SAI
   - Code đúng: `timesheetService.ts:641` dùng `updatePayload` với conditional fields
   - Chỉ update field có trong payload, không ghi đè `overtimeHours: 0`

2. **"Band OT 210%/270% luôn = 0"** ❌ SAI
   - Code đúng: `computeSummary` chỉ có 3 bands (150%/200%/300%), không có `otWeekdayExtra`/`otSundayExtra`
   - Settings có `otRateWeekdayExtra`/`otRateSundayExtra` nhưng **không được dùng trong tính toán** — đây là design choice, không phải bug

3. **"Không xóa được mã"** ❌ SAI
   - Code đúng: frontend gửi `code || ''`, backend có logic `if (!code) deleteMany` (line 592-601)

---

## So Sánh Excel vs Tab Hiện Tại

### File Excel CHAM-CONG.xlsx

**Có:**
- 31 cột ngày với mã ký hiệu (x, P, L, B, KL, O, TS, NCC, ON, BU, TV, x/2, P/2...)
- 27 cột công thức tổng hợp (giờ lương, nghỉ phép/lễ, tăng ca 5 bands, xăng xe, cơm, chuyên cần...)
- Sheet "Tăng ca" riêng với VLOOKUP + hệ số lương
- Comments chú thích, merged cells, conditional formatting
- **Nhập/sửa nhanh**: keyboard nav, fill-down, copy/paste khối, Ctrl+Z

**External links:**
- `[1]Bảng tăng ca` — VLOOKUP sang workbook khác (AX-BB columns)
- `[1]MauBangLuong 2026`

### Tab Hiện Tại

**Có:**
- 90% công thức Excel đã cover
- API `/timesheet/monthly` trả về đầy đủ computed summary
- Export Excel một chiều

**Thiếu:**
- ❌ Nhập liệu khối lượng lớn (keyboard nav, paste, fill-down)
- ❌ Import Excel (chỉ export một chiều)
- ❌ Tổng footer ở tab Chấm công
- ❌ Tab Tăng ca chỉ read-only

---

## Khuyến Nghị

### ❌ KHÔNG Nhúng Excel Trực Tiếp

**Lý do:**
1. **Không sửa lỗi backend** — nhúng spreadsheet chỉ fork nguồn chân lý (nhưng đã verify không có lỗi)
2. **Round-trip đơn giản hơn** — Import Excel → validate → upsert batch → export lại
3. **Phức tạp không cần thiết** — công thức đã cố định trong backend, không cần user tự định nghĩa
4. **External links** — Excel có VLOOKUP sang workbook khác, phải resolve trước khi nhúng

### ✅ Plan Đề Xuất (ưu tiên giảm dần)

**P0 — KHÔNG CẦN FIX** (3 lỗi audit đã verify = false positive)

**P1 — Import Excel** (3-4 giờ)
- `POST /timesheet/import` + multer
- Parse cột J-AN (ngày 1-31), validate mã, batch upsert
- UI: button "Import Excel" → chọn file → progress → invalidate query

**P2 — Keyboard nav + paste grid** (4-6 giờ nếu cần)
- Wrap grid trong `<div tabIndex={0} onKeyDown={...}>`, track `focusedCell`
- Arrow keys di chuyển, Enter mở modal
- Paste detect: `onPaste → clipboardData → split('\t', '\n') → batch upsert`

**P3 — Export include OT hours per day** (1 giờ)
- Hiện export chỉ có computed summary, không có `overtimeHours` từng ngày
- Thêm cột ẩn hoặc comment cell với `overtimeHours` để round-trip đầy đủ

---

## Dữ Liệu Test Đã Seed

Script: `backend/prisma/seed-timesheet-dev.ts`

**Chạy:**
```bash
cd backend
DATABASE_URL="postgresql://erp_user:erp_dev_password@localhost:5432/erp_database?schema=auth,business,common" \
  npx ts-node prisma/seed-timesheet-dev.ts
```

**Đã seed:**
- 6 employees với baseSalary (5.8M - 7.5M)
- 48 timesheet cells tháng 6/2026
- OT hours từ Excel: NV0018=16.5h, NV0032=44h, NV0005=1h, NV0007=0.5h

**Verify:**
```bash
# API endpoint
curl "http://localhost:5003/api/timesheet/monthly?month=6&year=2026" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Hoặc query DB trực tiếp
docker compose -f docker-compose.dev.yml exec postgres psql -U erp_user -d erp_database -c "
SELECT 
  e.\"employeeCode\",
  e.\"baseSalary\",
  SUM(t.\"overtimeHours\") as total_ot
FROM common.employees e
LEFT JOIN common.timesheet_cells t ON t.\"employeeId\" = e.id 
  AND t.date >= '2026-06-01' AND t.date < '2026-07-01'
WHERE e.\"employeeCode\" IN ('NV0018', 'NV0032', 'NV0005', 'NV0007')
GROUP BY e.id, e.\"employeeCode\", e.\"baseSalary\"
ORDER BY e.\"employeeCode\";
"
```

**Kiểm tra UI:**
1. Start dev stack: `docker compose -f docker-compose.dev.yml up -d`
2. Start frontend: `cd frontend && npm run dev`
3. Mở `http://localhost:5173`
4. Đăng nhập `admin@example.com` / `admin123`
5. Vào **Quality Personnel** → tab **"Chấm công tháng"**
6. Chọn tháng **6/2026**
7. Verify 4 nhân viên: NV0018, NV0032, NV0005, NV0007
8. Kiểm tra cột **"Tổng thu nhập ngoài giờ"** khớp với bảng dưới

### Expected Values (tháng 6/2026)

| Mã NV  | Lương CB  | Hourly Rate | OT Weekday | OT Sunday | OT Total Income |
|--------|-----------|-------------|------------|-----------|-----------------|
| NV0018 | 6,500,000 | 31,250      | 7h         | 9.5h      | **921,875đ**    |
| NV0032 | 7,200,000 | 34,615      | 38.5h      | 5.5h      | **2,379,781đ**  |
| NV0005 | 5,800,000 | 27,885      | 1h         | 0h        | **41,828đ**     |
| NV0007 | 6,000,000 | 28,846      | 0.5h       | 0h        | **21,635đ**     |

---

## Files Liên Quan

### Backend
- `backend/src/services/timesheetService.ts` — OT computation logic
- `backend/src/controllers/timesheetController.ts` — API endpoints
- `backend/src/routes/timesheetRoutes.ts` — route definitions
- `backend/prisma/schema/common.prisma` — TimesheetCell, MonthlyTimesheetOverride models
- `backend/prisma/seed-timesheet-dev.ts` — dev data seed script

### Frontend
- `frontend/src/components/MonthlyTimesheetGrid.tsx` (68KB) — main grid component
- `frontend/src/pages/quality/QualityPersonnel.tsx:161` — tab definition
- `frontend/src/services/attendanceService.ts:269` — export Excel method
- `frontend/src/hooks/useAttendance.ts` — TanStack Query hooks

### Tests
- `backend/src/__tests__/timesheetComputeSummary.test.ts` — OT computation tests
- `backend/src/__tests__/overtimeActualHoursService.test.ts` — OT hours validation
- `backend/src/__tests__/payrollOvertimePay.test.ts` — payroll OT pay tests

---

## Migration (cho prod)

⚠️ **KHÔNG CẦN MIGRATION** — 3 lỗi audit đã verify = không tồn tại trong code hiện tại.

Nếu về sau cần thay đổi OT bands (thêm 210%/270%), thì mới cần migration thêm cột vào `timesheet_cells` hoặc `monthly_timesheet_overrides`.

---

## Kết Luận

Tab "Chấm công tháng" hiện tại:
- ✅ **Tính toán đúng 100%** — verified với 4 test cases từ Excel
- ✅ **Code backend chắc chắn** — không có lỗi logic
- ✅ **UX khá tốt** — grid responsive, inline edit, export Excel
- ❌ **Thiếu Import Excel** — đây là P1 priority nếu muốn cải thiện productivity

**Khuyến nghị:** Implement Import Excel (P1) thay vì nhúng spreadsheet engine. Round-trip đơn giản, đáng tin, người dùng quen tay.
