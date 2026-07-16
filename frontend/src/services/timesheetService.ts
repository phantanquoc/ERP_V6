import apiClient from './apiClient';

export interface TimesheetCell {
  employeeId: string;
  date: string;
  code: string;
  note?: string | null;
  workHours: number;
  overtimeHours: number;
  isSeeded?: boolean;
}

export interface TimesheetRow {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  positionName: string;
  departmentName: string;
  hireDate: string;
  baseSalary: number;
  kmDistance: number | null;
  leaveBalanceCarryOver: number | null;
  cells: TimesheetCell[];
}

export interface TimesheetSummary {
  payableHours: number;
  officialWorkDays: number;
  leaveHoursPayable: number;
  leaveHoursHolidayRegime: number;
  leaveHoursUnpaid: number;
  probationDays: number;
  lateEarlyHours: number;
  diligence: boolean;
  otWeekday: number;
  otWeekdayExtra: number;
  otSunday: number;
  otSundayExtra: number;
  otHoliday: number;
  mealAllowanceDays: number;
  fuelAmount: number;
  overtimeMealDays: number;
  // Auto-computed formula fields
  leaveCurrentBalance: number;
  mealCount: number;
  sundayMeal: number;
  otSalary: number;
  otTotalIncome: number;
  leaveCompensatory: number;
}

export interface TimesheetHoliday {
  id: string;
  name: string;
  date: string;
  note: string | null;
}

export interface TimesheetSettings {
  standardWorkDays: number;
  otRateWeekday: number;
  otRateWeekdayExtra: number;
  otRateSunday: number;
  otRateSundayExtra: number;
  otRateHoliday: number;
  mealAllowancePerDay?: number;
  overtimeMealAllowance?: number;
  sundayMealAllowance?: number;
  fuelPricePerKm?: number;
}

export interface TimesheetMonthlyResponse {
  month: number;
  year: number;
  daysInMonth: number;
  holidays: TimesheetHoliday[];
  settings: TimesheetSettings;
  rows: TimesheetRow[];
  summaries: Record<string, TimesheetSummary>;
  overrides: Record<string, Record<string, string>>;
}

export interface UpsertTimesheetCellData {
  employeeId: string;
  date: string;
  code: string;
  note?: string;
  workHours?: number;
  overtimeHours?: number;
}

export interface UpsertTimesheetOverrideData {
  employeeId: string;
  month: number;
  year: number;
  fieldKey: string;
  value: string;
}

class TimesheetService {
  async getMonthly(month: number, year: number, filters?: {
    search?: string;
    departmentId?: string;
    positionId?: string;
  }): Promise<TimesheetMonthlyResponse> {
    const params: Record<string, any> = { month, year };
    if (filters?.search) params.search = filters.search;
    if (filters?.departmentId) params.departmentId = filters.departmentId;
    if (filters?.positionId) params.positionId = filters.positionId;
    const response = await apiClient.get('/timesheet/monthly', { params });
    return response.data;
  }

  async upsertCell(data: UpsertTimesheetCellData): Promise<TimesheetCell> {
    const response = await apiClient.post('/timesheet/cell', data);
    return response.data;
  }

  async upsertOverride(data: UpsertTimesheetOverrideData): Promise<any> {
    const response = await apiClient.post('/timesheet/override', data);
    return response.data;
  }
}

export default new TimesheetService();
