/**
 * Shared KPI deduction computation utility.
 *
 * Extracted from payrollService.ts to allow both payrollService and
 * employeeEvaluationService (payroll impact preview) to use the same formula
 * without coupling.
 *
 * Formula: kpiDeduction = kpiBonus > 0 ? Math.round((kpiBonus * (100 - sup2Percentage)) / 100) : 0
 *
 * IMPORTANT: Do not change this formula without also updating payrollService.ts
 * and any downstream consumers. A unit test in utils/payroll.test.ts asserts
 * identical output for a shared parameter grid.
 */

/**
 * Compute the KPI deduction amount from an employee's KPI bonus and their
 * supervisor-2 weighted score percentage.
 *
 * @param kpiBonus - Employee's KPI bonus amount (VND). 0 or negative yields 0 deduction.
 * @param sup2Percentage - Supervisor-2 weighted score percentage, 0-100.
 * @returns Rounded KPI deduction amount (VND).
 */
export function computeKpiDeduction(kpiBonus: number, sup2Percentage: number): number {
  return kpiBonus > 0
    ? Math.round((kpiBonus * (100 - sup2Percentage)) / 100)
    : 0;
}

/**
 * Lương một giờ, suy từ lương tháng.
 *
 * Mặc định của công ty: 26 ngày công/tháng, 8 giờ/ngày. Cả hai đều cấu hình
 * được ở `PayrollSettings` nên nơi này không hardcode.
 *
 * @param baseSalary Lương tháng (VND).
 * @param standardWorkDays Ngày công chuẩn một tháng.
 * @param standardHoursPerDay Giờ chuẩn một ngày.
 * @returns Lương giờ (VND, chưa làm tròn — người gọi tự làm tròn ở bước cuối).
 */
export function computeHourlyRate(
  baseSalary: number,
  standardWorkDays: number,
  standardHoursPerDay: number
): number {
  if (baseSalary <= 0 || standardWorkDays <= 0 || standardHoursPerDay <= 0) return 0;
  return baseSalary / standardWorkDays / standardHoursPerDay;
}

/**
 * Tiền tăng ca của một nhân viên.
 *
 * Tiền OT phải suy từ lương của CHÍNH nhân viên đó nhân hệ số quy định, không
 * thể dùng một mức tiền/giờ phẳng cho cả công ty: lương giờ mỗi người một khác
 * (dữ liệu thật chênh nhau từ 30.924₫/h đến 48.077₫/h), nên một con số chung
 * vừa trả thiếu người lương cao vừa trả vượt người lương thấp.
 *
 * `flatRateFallback` là mức ₫/giờ cũ trong `PayrollSettings.overtimeRate`. Chỉ
 * dùng khi nhân viên chưa có lương cơ bản — không có mẫu số thì không suy được
 * lương giờ, và trả 0 sẽ âm thầm mất tiền OT của người thật sự đã làm.
 *
 * @param overtimeHours Số giờ tăng ca.
 * @param baseSalary Lương tháng của nhân viên (VND).
 * @param multiplier Hệ số OT theo loại ngày (ngày thường 1.5, CN 2, lễ 3…).
 * @param standardWorkDays Ngày công chuẩn một tháng.
 * @param standardHoursPerDay Giờ chuẩn một ngày.
 * @param flatRateFallback Mức ₫/giờ phẳng, dùng khi không có lương cơ bản.
 * @returns Tiền tăng ca đã làm tròn (VND).
 */
export function computeOvertimePay(
  overtimeHours: number,
  baseSalary: number,
  multiplier: number,
  standardWorkDays: number,
  standardHoursPerDay: number,
  flatRateFallback = 0
): number {
  if (overtimeHours <= 0) return 0;

  const hourlyRate = computeHourlyRate(baseSalary, standardWorkDays, standardHoursPerDay);
  if (hourlyRate > 0) {
    return Math.round(overtimeHours * hourlyRate * multiplier);
  }

  // Chưa có lương cơ bản: quay về mức phẳng cấu hình sẵn.
  return Math.round(overtimeHours * flatRateFallback);
}
