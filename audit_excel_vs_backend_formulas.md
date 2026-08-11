# So Sánh Công Thức: Excel CHAM-CONG.xlsx vs Backend timesheetService.ts

**Ngày audit:** 2026-08-11  
**Nguồn Excel:** `/Users/vunam/Downloads/CHAM-CONG.xlsx` (2 sheets: "CHẤM CÔNG", "TĂNG CA")  
**Nguồn Backend:** `backend/src/services/timesheetService.ts` — function `computeSummary` (line 73-223)

---

## Sheet 1: CHẤM CÔNG (Main Attendance)

### Cột Tổng Hợp — So Sánh Từng Cột

| # | Cột Excel | Công Thức Excel (Row 9) | Backend Field | Backend Logic | Khớp? |
|---|-----------|-------------------------|---------------|---------------|-------|
| 1 | **AO** — Giờ lương | `=SUM(AP9:AU9)` | `payableHours` | `officialHours + leaveHoursPayable + leaveHoursHolidayRegime + leaveHoursUnpaid + probationDays×8` (:195) | ❌ **SAI** — backend CỘNGprobation×8, Excel KHÔNG cộng AT (thử việc) vào AO |
| 2 | **AP** — Làm CT | `(x×8)+(x/2×4)+(P×0)+(p/2×4)-AU` | `officialHours - lateEarlyHours` | x=8, N/TV/2=4, X/2=4, P/2=4, ON=8 (:124-135); `lateEarlyHours` luôn 0 (:89) | ⚠️ **LOGIC SAI** — Excel trừ AU (trễ/sớm) nhưng backend `lateEarlyHours` không bao giờ tự cộng, chỉ có override |
| 3 | **AQ** — Nghỉ phép (tính lương) | `(P×8)+(P/2×4)+(BU×8)-BM` | `leaveHoursPayable` | P=8, P/2=4, BU=8 (:136-138); backend KHÔNG trừ BM (phép bù) | ⚠️ **THIẾU** — Excel `-BM9` (phép bù), backend không trừ |
| 4 | **AR** — Nghỉ lễ/chế độ | `(L×8)+(CD×8)` | `leaveHoursHolidayRegime` | L=8, CD=8 (:139-141) | ✅ Khớp |
| 5 | **AS** — Nghỉ không lương | `(B×8)+(KL×8)+(x/2×4)+(O×8)+(TS×8)+(NCC×8)+(NCC/2×4)` | `leaveHoursUnpaid` | B/KL/O/TS/NCC/NCC/2/O/2 (:142-144); **X/2 đếm 2 lần** — vừa vào `officialHours` (:130) vừa vào `leaveHoursUnpaid` (:131) | ⚠️ **LOGIC ĐÚNG** — Excel x/2 vào AS (không lương), backend x/2 = 4h làm + 4h nghỉ (cả 2 đều đúng, nhưng cách tính khác) |
| 6 | **AT** — Thử việc | `(TV×8)+(TV/2×4)` | `probationDays` | TV=1 day, TV/2=0.5 day (:147-148) | ✅ Khớp (nhưng đơn vị khác: Excel giờ, backend ngày) |
| 7 | **AU** — Trễ/Sớm | *(không có công thức, nhập tay)* | `lateEarlyHours` | Khởi tạo 0 (:89), không bao giờ tự cộng | ❌ **KHÔNG TỰ TÍNH** — cả Excel và backend đều nhập tay |
| 8 | **AV** — Ký nhận | *(manual)* | *(không có)* | — | — |
| 9 | **AW** — Cơm NC | *(nhập tay, =0 trong mẫu)* | `mealAllowanceDays` | x/TV=1, N=0.5, ON=0 (:125-127) | ⚠️ Backend tính, Excel =0 trong mẫu |
| 10-14 | **AX-BB** — Tăng ca 5 band | `=VLOOKUP(E9,'Bảng tăng ca'!E:AT,col,0)` | `otWeekday, otWeekdayExtra, otSunday, otSundayExtra, otHoliday` | Holiday/Sunday/Weekday phân nhánh (:152-161) | ❌ **SAI** — backend chỉ 3 nhánh, không có `otWeekdayExtra` / `otSundayExtra` |
| 15 | **BC** — Số KM | *(nhập tay)* | `kmDistance` | Nhập tay override (:478) | ✅ Khớp |
| 16 | **BD** — Xăng xe | `=ROUND(BC9×BD8,0)` | `fuelAmount` | `kmDistance × fuelPricePerKm × (officialWorkDays/8)` (:475) | ⚠️ **LOGIC KHÁC** — Excel BC×giá, backend thêm tỷ lệ ngày công |
| 17 | **BE** — Cơm TC | `=VLOOKUP(E9,'Bảng tăng ca'!E:AX,46,0)` | `overtimeMealMoney` | Frontend tính `:606-607` | ✅ Khớp (tính frontend) |
| 18 | **BF** — Phép tháng trước | *(manual)* | `leaveBalanceCarryOver` | Nhập tay | ✅ Khớp |
| 19 | **BG** — Phép hiện tại | `=BF9-(AQ9/8)` | `leaveCurrentBalance` | `carryOver + leaveCurrentBalance` (:486) | ✅ Khớp |
| 20 | **BH** — Ghi chú | *(text)* | *(không có)* | — | — |
| 21 | **BI** — Chuyên cần | `=IF(SUM(x/2×0.5,KL×1)>1,"","x")` | `diligenceQualified` | `diligencePenalty = x/2×0.5 + KL×1`; đạt khi ≤1 (:169-170, :188) | ✅ Khớp |
| 22 | **BJ** — Tính cơm | *(formula unclear)* | *(không có)* | — | — |
| 23 | **BK** — Giờ CC KL | `=(NCC×8)+(NCC/2×4)+(B×8)+(ON×8)` | *(không có)* | — | ❌ **THIẾU** — backend không có field này |
| 24 | **BL** — Truy thu ứng phép | *(formula unclear)* | *(không có)* | — | — |
| 25 | **BM** — Phép bù | *(manual)* | `leaveCompensatory` | Count BU (:164-166) | ⚠️ Backend đếm, nhưng không dùng để trừ AQ |
| 26 | **BN** — Cơm CN | *(formula)* | `sundayMeal` | x/ON=1, N=0.5 vào CN (:177-183) | ✅ Khớp |
| 27 | **BO** — Ngày nghỉ việc | *(date)* | *(không có)* | — | — |

---

## Sheet 2: TĂNG CA (Overtime)

| # | Cột Excel | Công Thức Excel (Row 6) | Backend Field | Backend Logic | Khớp? |
|---|-----------|-------------------------|---------------|---------------|-------|
| 1 | **I** — TC tháng trước | *(manual)* | *(không có)* | — | ❌ **THIẾU** |
| 2-33 | **J-AN** — Ngày 1-31 | *(nhập giờ OT từng ngày)* | `TimesheetCell.overtimeHours` | Nhập từng cell | ✅ Khớp |
| 34 | **AO** — Giờ TC NT 1.5 | `=SUM(I6:AN6)-AP6-AQ6-AR6-AS6` | `otWeekday` | Weekday OT (:159) | ✅ Khớp (logic tính ngược) |
| 35 | **AP** — Giờ TC CN 2.0 | `=SUM(P6,W6,AD6,AK6)-AS6` | `otSunday` | Sunday OT (:157) | ✅ Khớp (P/W/AD/AK = Chủ nhật) |
| 36 | **AQ** — Giờ TC Lễ 3.0 | *(formula unclear, =0 in sample)* | `otHoliday` | Holiday OT (:155) | ✅ Khớp |
| 37 | **AR** — NT ngoài giờ 2.1 | *(formula unclear, =0)* | `otWeekdayExtra` | **KHÔNG BAO GIỜ ĐƯỢC CỘNG** (:93, không có nhánh) | ❌ **LỖI** — backend khai báo nhưng không dùng |
| 38 | **AS** — CN ngoài giờ 2.7 | *(formula unclear, =0)* | `otSundayExtra` | **KHÔNG BAO GIỜ ĐƯỢC CỘNG** (:95, không có nhánh) | ❌ **LỖI** — backend khai báo nhưng không dùng |
| 39 | **AT** — Lương tính TC | `=VLOOKUP(E6,'MauBangLuong'!C:W,13,0)` | `otSalary` | `= baseSalary` (:489) | ✅ Khớp |
| 40 | **AU** — Lương/giờ | `=ROUND((AT6/D4/8),0)` | `hourlyRate` | `ROUND(baseSalary/(stdDays×8))` (:494) | ✅ Khớp |
| 41 | **AV** — Tổng thu nhập OT | `=ROUND((AU6×AO6×50%)+(AU6×AP6×100%)+(AU6×AQ6×200%)+(AU6×AR6×110%)+(AU6×AS6×170%),0)` | `otTotalIncome` | `hourlyRate × Σ(band × rate)` (:495-502) | ❌ **SAI** — Excel dùng markup % (50/100/200/110/170), backend dùng multiplier (1.5/2/3/2.1/2.7) |
| 42 | **AW** — Ngày công TC | `=COUNTIF(J6:AN6,">3")+COUNTIF(J6:AN6,"=3")` | *(không có)* | — | ❌ **THIẾU** |
| 43 | **AX** — Cơm TC | `=AX5×AW6` (25000×ngày công) | `overtimeMealMoney` | Frontend `mealAllowance×overtimeMealDays` (:606-607) | ✅ Khớp |

---

## Tổng Kết Lỗi Sai & Thiếu Sót

### 🔴 Lỗi Nghiêm Trọng (Ảnh Hưởng Tính Lương)

1. **Band OT 2.1 / 2.7 luôn = 0** (đã xác nhận trước đó)
   - Excel: AR × 110% + AS × 170%
   - Backend: `otWeekdayExtra` / `otSundayExtra` khai báo nhưng không bao giờ được cộng (:152-161 chỉ 3 nhánh)
   - **Impact:** Thiếu tiền OT ngoài giờ, có thể thiệt hại hàng triệu/tháng

2. ~~**Công thức OT income sai đơn vị**~~ — **ĐÃ VERIFY: KHÔNG PHẢI LỖI**
   - Excel AV6 tính **MARKUP ONLY** (phần thêm): `hourlyRate × hours × 0.5` (50% là phần thưởng thêm)
   - Backend `computeOvertimePay` (`utils/payroll.ts:69-91`) tính **TOTAL OT PAY**: `hourlyRate × hours × 1.5` (150% là tổng tiền nhận)
   - **Hai hệ thống đo khác nhau, cả 2 đều ĐÚNG:**
     - Excel: tracking chi phí OT thuần (phần thêm trả cho OT)
     - Backend: tổng tiền trả nhân viên (đúng theo luật lao động VN — OT NT = 150% base wage)
   - **Không cần fix** — đây là khác biệt về định nghĩa, không phải lỗi tính toán

3. **Giờ lương (AO) sai công thức**
   - Excel: `AP + AQ + AR + AS + AU` (KHÔNG cộng thử việc AT vào tổng giờ lương)
   - Backend :195: `officialHours + leaveHoursPayable + leaveHoursHolidayRegime + leaveHoursUnpaid + probationDays×8`
   - **Impact:** Nhân viên thử việc được tính thừa giờ lương → có thể ảnh hưởng công thức lương/KPI

### ⚠️ Thiếu Logic (Chưa Implement)

4. **Phép bù (BM) không được trừ khỏi nghỉ phép**
   - Excel AQ9: `(P×8)+(P/2×4)+(BU×8) - BM9`
   - Backend: không trừ `leaveCompensatory`

5. **Trễ/Sớm không tự tính**
   - Backend `lateEarlyHours` luôn 0, chỉ có override
   - Excel cũng nhập tay → cả 2 đều thiếu

6. **Giờ công ty cho nghỉ (BK) không có**
   - Excel: `(NCC×8)+(NCC/2×4)+(B×8)+(ON×8)`
   - Backend: không có field

7. **TC tháng trước & Ngày công TC không có**
   - Sheet Tăng CA cột I, AW

### 🟡 Logic Khác Nhau (Cần Xác Nhận Với HR)

8. **Xăng xe tính theo ngày công**
   - Excel BD9: `kmDistance × fuelPrice`
   - Backend :475: `kmDistance × fuelPrice × (officialWorkDays/8)`
   - Backend tỷ lệ theo ngày công thực tế — hợp lý hơn nếu xe chỉ đi ngày làm việc

9. **X/2 đếm 2 lần**
   - Backend: X/2 = 4h `officialHours` + 4h `leaveHoursUnpaid` (:130-131)
   - Excel AS9: X/2 × 4 chỉ vào "Nghỉ không lương"
   - Cả 2 đều đúng về mặt kế toán (8h tổng), nhưng phân loại khác

---

## Mã Chấm Công — Excel vs Backend Seed

Excel dùng 17 mã trong công thức: `x, x/2, P, P/2, p/2, L, CD, BU, TV, TV/2, B, KL, O, TS, NCC, NCC/2, ON`

Backend seed 17 mã (`backend/prisma/seed.ts:830-846`): `x, P, P/2, L, BU, TV, TV/2, B, KL, X/2, O, CD, N, TS, NCC, ON, O/2`

**Khác biệt:**
- Excel: `x/2` (thường), `p/2` (thường), `NCC/2`
- Backend: `X/2` (HOA), `N`, `O/2` (không có trong Excel)
- `NCC/2` CÓ trong `unpaidLeaveCodes` (:105) nhưng **KHÔNG seed** → backend từ chối khi nhập

---

## Khuyến Nghị Hành Động

### P0 — Fix Ngay (Sai Lương)

1. **Fix công thức OT income** (:495-502)
   ```ts
   // SAI: hourlyRate × hours × 1.5
   // ĐÚNG: hourlyRate × hours × 0.5  (markup, không phải multiplier)
   const otTotalIncomeRaw = hourlyRate * (
     summary.otWeekday * 0.5 +        // Excel: ×50%
     summary.otWeekdayExtra * 1.1 +   // Excel: ×110%
     summary.otSunday * 1.0 +         // Excel: ×100%
     summary.otSundayExtra * 1.7 +    // Excel: ×170%
     summary.otHoliday * 2.0          // Excel: ×200%
   );
   ```

2. **Fix band 2.1 / 2.7 luôn 0** — thêm logic phân 5 nhánh thay vì 3 (cần xác nhận quy tắc phân loại với HR)

3. **Fix giờ lương (AO)** — KHÔNG cộng `probationDays×8` vào `payableHours` (:195)

### P1 — Align Logic (Sau Khi Xác Nhận HR)

4. Trừ `leaveCompensatory` khỏi `leaveHoursPayable` (Excel AQ - BM)
5. Seed `NCC/2`, `x/2` (thường), `p/2` (nếu HR dùng)
6. Implement `unpaidDeductHours` (BK) nếu HR cần

### P2 — Import Excel (Để Test Round-Trip)

7. Implement `POST /timesheet/import` để validate công thức bằng cách import file Excel của HR, so sánh computed values

---

**Kết luận:** Backend **KHÔNG KHỚP** với Excel ở 3 công thức then chốt (OT income, band 2.1/2.7, giờ lương). Phải fix P0 trước khi triển khai payroll thật.
