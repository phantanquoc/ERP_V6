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
