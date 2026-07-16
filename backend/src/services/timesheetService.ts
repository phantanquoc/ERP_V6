import prisma from '@config/database';
import { ValidationError } from '@utils/errors';

// Leave-type to code map (D2)
const LEAVE_TYPE_CODE_MAP: Record<string, string> = {
  ANNUAL: 'P',
  SICK: 'B',
  MATERNITY: 'TS',
  COMPENSATORY: 'BU',
  PERSONAL: 'KL',
  EMERGENCY: 'KL',
};

// Attendance status to code map
const STATUS_CODE_MAP: Record<string, string> = {
  PRESENT: 'x',
  LATE: 'x',
  ABSENT: 'O',
};

export interface TimesheetCellData {
  employeeId: string;
  date: string; // YYYY-MM-DD
  code: string;
  note?: string | null;
  workHours: number;
  overtimeHours: number;
  isSeeded?: boolean; // indicates if this is derived from attendance (not persisted)
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
  cells: TimesheetCellData[];
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

/**
 * Compute summary and 5-band OT from cells + settings + holidays
 */
export function computeSummary(
  cells: TimesheetCellData[],
  holidays: Date[],
  _settings: { standardWorkDays: number; otRateWeekday: number; otRateWeekdayExtra: number; otRateSunday: number; otRateSundayExtra: number; otRateHoliday: number },
): TimesheetSummary {
  const holidaySet = new Set(holidays.map(d => d.toISOString().split('T')[0]));

  let payableHours = 0;
  let officialWorkDays = 0;
  let leaveHoursPayable = 0;
  let leaveHoursHolidayRegime = 0;
  let leaveHoursUnpaid = 0;
  let probationDays = 0;
  let lateEarlyHours = 0;
  let mealAllowanceDays = 0;
  let overtimeMealDays = 0;
  let otWeekday = 0;
  let otWeekdayExtra = 0;
  let otSunday = 0;
  let otSundayExtra = 0;
  let otHoliday = 0;

  // Codes that count as payable/official work
  const workCodes = new Set(['x', 'ON', 'TV', 'N']);
  const payableLeaveCodes = new Set(['P', 'P/2', 'BU', 'CD', 'TS']);
  const holidayLeaveCodes = new Set(['L']);
  const unpaidLeaveCodes = new Set(['KL', 'X/2', 'O', 'NCC', 'O/2']);
  const probationCodes = new Set(['TV', 'TV/2']);

  // Formula accumulators
  let leaveCompensatory = 0;
  let sundayMeal = 0;
  let annualLeaveDaysUsed = 0;
  const sundayWorkCodes = new Set(['x', 'ON']);

  for (const cell of cells) {
    const code = cell.code;
    const dateStr = cell.date;
    const cellDate = new Date(dateStr);
    const isSunday = cellDate.getDay() === 0;
    const isHoliday = holidaySet.has(dateStr);

    // Work hours classification
    if (workCodes.has(code)) {
      payableHours += cell.workHours;
      officialWorkDays += code === 'N' || code === 'TV/2' ? 0.5 : 1;
      // ON (online work) does not count toward company meal
      mealAllowanceDays += code === 'ON' ? 0 : (code === 'N' ? 0.5 : 1);
    } else if (payableLeaveCodes.has(code)) {
      const defaultHours = cell.workHours || (code.endsWith('/2') ? 4 : 8);
      leaveHoursPayable += defaultHours;
    } else if (holidayLeaveCodes.has(code)) {
      const defaultHours = cell.workHours || (code.endsWith('/2') ? 4 : 8);
      leaveHoursHolidayRegime += defaultHours;
    } else if (unpaidLeaveCodes.has(code)) {
      const defaultHours = cell.workHours || (code.endsWith('/2') ? 4 : 8);
      leaveHoursUnpaid += defaultHours;
    }

    if (probationCodes.has(code)) {
      probationDays += code === 'TV/2' ? 0.5 : 1;
    }

    // Overtime classification by day type
    if (cell.overtimeHours > 0) {
      overtimeMealDays++;
      if (isHoliday) {
        otHoliday += cell.overtimeHours;
      } else if (isSunday) {
        otSunday += cell.overtimeHours;
      } else {
        otWeekday += cell.overtimeHours;
      }
    }

    // Formula: leaveCompensatory — count of 'BU' code days
    if (code === 'BU') {
      leaveCompensatory++;
    }

    // Formula: annualLeaveDaysUsed — 'P' = 1, 'P/2' = 0.5
    if (code === 'P') annualLeaveDaysUsed += 1;
    else if (code === 'P/2') annualLeaveDaysUsed += 0.5;

    // Formula: sundayMeal — Sundays actually worked (x/ON = 1, N = 0.5)
    if (isSunday) {
      if (sundayWorkCodes.has(code)) {
        sundayMeal += 1;
      } else if (code === 'N') {
        sundayMeal += 0.5;
      }
    }
  }

  const diligence = leaveHoursUnpaid === 0 && lateEarlyHours === 0;

  return {
    payableHours,
    officialWorkDays,
    leaveHoursPayable,
    leaveHoursHolidayRegime,
    leaveHoursUnpaid,
    probationDays,
    lateEarlyHours,
    diligence,
    otWeekday,
    otWeekdayExtra,
    otSunday,
    otSundayExtra,
    otHoliday,
    mealAllowanceDays,
    fuelAmount: 0, // computed per-employee externally
    overtimeMealDays,
    // Formula fields (leaveCurrentBalance, otSalary, otTotalIncome computed per-employee in getMonthly)
    leaveCurrentBalance: -annualLeaveDaysUsed, // partial; getMonthly adds carryOver
    mealCount: mealAllowanceDays, // same as mealAllowanceDays (meal-eligible days)
    sundayMeal,
    otSalary: 0, // computed per-employee in getMonthly (needs baseSalary)
    otTotalIncome: 0, // computed per-employee in getMonthly
    leaveCompensatory,
  };
}

class TimesheetService {
  async getMonthly(month: number, year: number, filters?: { search?: string; departmentId?: string; positionId?: string }) {
    if (month < 1 || month > 12) {
      throw new ValidationError('Tháng phải từ 1 đến 12');
    }
    if (!year || isNaN(year)) {
      throw new ValidationError('Năm không hợp lệ');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59); // last day of month
    const daysInMonth = new Date(year, month, 0).getDate();

    // Build employee filter
    const employeeWhere: any = {
      status: 'ACTIVE',
      user: { role: { not: 'ADMIN' } },
    };

    if (filters?.positionId) {
      employeeWhere.positionId = filters.positionId;
    }
    if (filters?.departmentId) {
      employeeWhere.OR = [
        { user: { departmentId: filters.departmentId } },
        { subDepartment: { departmentId: filters.departmentId } },
      ];
    }
    if (filters?.search) {
      const searchConds: any[] = [
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
      if (employeeWhere.OR) {
        employeeWhere.AND = [{ OR: employeeWhere.OR }, { OR: searchConds }];
        delete employeeWhere.OR;
      } else {
        employeeWhere.OR = searchConds;
      }
    }

    // Fetch employees, attendance, leave requests, persisted cells in parallel
    const [employees, attendances, leaveRequests, persistedCells, holidays, settings] = await Promise.all([
      prisma.employee.findMany({
        where: employeeWhere,
        include: {
          user: true,
          position: true,
          subDepartment: { include: { department: true } },
        },
        orderBy: { employeeCode: 'asc' },
      }),
      prisma.attendance.findMany({
        where: {
          attendanceDate: { gte: startDate, lte: endDate },
          employee: employeeWhere,
        },
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      }),
      prisma.timesheetCell.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          employee: employeeWhere,
        },
      }),
      prisma.holiday.findMany({
        where: { date: { gte: startDate, lte: endDate } },
      }),
      prisma.payrollSettings.findFirst(),
    ]);

    // Index persisted cells by employeeId+date
    const cellMap = new Map<string, typeof persistedCells[0]>();
    for (const cell of persistedCells) {
      const key = `${cell.employeeId}_${cell.date.toISOString().split('T')[0]}`;
      cellMap.set(key, cell);
    }

    // Index attendances by employeeId+date
    const attMap = new Map<string, typeof attendances>();
    for (const att of attendances) {
      const key = `${att.employeeId}_${att.attendanceDate.toISOString().split('T')[0]}`;
      if (!attMap.has(key)) attMap.set(key, []);
      attMap.get(key)!.push(att);
    }

    // Index leave requests by employeeId (for date range lookup)
    const leaveMap = new Map<string, typeof leaveRequests>();
    for (const lr of leaveRequests) {
      if (!leaveMap.has(lr.employeeId)) leaveMap.set(lr.employeeId, []);
      leaveMap.get(lr.employeeId)!.push(lr);
    }

    // Resolve department names
    const userDeptIds = employees
      .map(e => (e.user as any)?.departmentId)
      .filter((id): id is string => !!id);
    const departmentNameById = new Map<string, string>();
    if (userDeptIds.length > 0) {
      const departments = await prisma.department.findMany({
        where: { id: { in: Array.from(new Set(userDeptIds)) } },
        select: { id: true, name: true },
      });
      departments.forEach(d => departmentNameById.set(d.id, d.name));
    }

    // Build rows
    const rows: TimesheetRow[] = employees.map(emp => {
      const cells: TimesheetCellData[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const cellKey = `${emp.id}_${dateStr}`;

        // Check if persisted cell exists
        const persisted = cellMap.get(cellKey);
        if (persisted) {
          cells.push({
            employeeId: emp.id,
            date: dateStr,
            code: persisted.code,
            note: persisted.note,
            workHours: persisted.workHours,
            overtimeHours: persisted.overtimeHours,
            isSeeded: false,
          });
          continue;
        }

        // Seed from attendance
        const dayAttendances = attMap.get(cellKey) || [];
        let code = '';
        let workHours = 0;
        let overtimeHours = 0;

        for (const att of dayAttendances) {
          if (att.isOvertime) {
            overtimeHours += att.workHours || 0;
          } else {
            workHours += att.workHours || 0;
            if (!code) {
              if (att.status === 'ON_LEAVE') {
                // Find matching leave request
                const empLeaves = leaveMap.get(emp.id) || [];
                const matchingLeave = empLeaves.find(lr => {
                  const lrStart = lr.startDate.toISOString().split('T')[0];
                  const lrEnd = lr.endDate.toISOString().split('T')[0];
                  return dateStr >= lrStart && dateStr <= lrEnd;
                });
                if (matchingLeave) {
                  code = LEAVE_TYPE_CODE_MAP[matchingLeave.leaveType] || 'P';
                } else {
                  code = 'P';
                }
              } else {
                code = STATUS_CODE_MAP[att.status] || '';
              }
            }
          }
        }

        if (code || workHours > 0 || overtimeHours > 0) {
          cells.push({
            employeeId: emp.id,
            date: dateStr,
            code: code || 'x',
            note: null,
            workHours,
            overtimeHours,
            isSeeded: true,
          });
        } else {
          // Empty cell — no attendance data
          cells.push({
            employeeId: emp.id,
            date: dateStr,
            code: '',
            note: null,
            workHours: 0,
            overtimeHours: 0,
            isSeeded: true,
          });
        }
      }

      const deptName = emp.subDepartment?.department?.name
        || ((emp.user as any)?.departmentId ? departmentNameById.get((emp.user as any).departmentId) ?? '' : '');

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        fullName: `${(emp.user as any).lastName} ${(emp.user as any).firstName}`.trim(),
        positionName: emp.position?.name || '',
        departmentName: deptName,
        hireDate: emp.hireDate.toISOString().split('T')[0],
        baseSalary: emp.baseSalary,
        kmDistance: emp.kmDistance,
        leaveBalanceCarryOver: emp.leaveBalanceCarryOver,
        cells,
      };
    });

    // Compute summaries
    const holidayDates = holidays.map(h => h.date);
    const effectiveSettings = settings || {
      standardWorkDays: 26,
      otRateWeekday: 1.5,
      otRateWeekdayExtra: 2.1,
      otRateSunday: 2,
      otRateSundayExtra: 2.7,
      otRateHoliday: 3,
    };

    const summaries: Record<string, TimesheetSummary> = {};
    for (const row of rows) {
      const summary = computeSummary(row.cells, holidayDates, effectiveSettings);
      // Compute fuel
      summary.fuelAmount = (row.kmDistance || 0) * (settings?.fuelPricePerKm || 0) * summary.officialWorkDays;

      // Formula: leaveCurrentBalance = carryOver - annualLeaveDaysUsed (partial stored as negative)
      summary.leaveCurrentBalance = (row.leaveBalanceCarryOver ?? 0) + summary.leaveCurrentBalance;

      // Formula: otSalary = baseSalary (Lương tính tăng ca = lương cơ bản)
      summary.otSalary = row.baseSalary || 0;

      // Formula: otTotalIncome = hourlyRate * Σ(band × rate) (Tổng Thu nhập ngoài giờ)
      const stdDays = effectiveSettings.standardWorkDays || 26;
      const hourlyRate = Math.round((row.baseSalary || 0) / (stdDays * 8));
      const otTotalIncomeRaw = hourlyRate * (
        summary.otWeekday * effectiveSettings.otRateWeekday +
        summary.otWeekdayExtra * effectiveSettings.otRateWeekdayExtra +
        summary.otSunday * effectiveSettings.otRateSunday +
        summary.otSundayExtra * effectiveSettings.otRateSundayExtra +
        summary.otHoliday * effectiveSettings.otRateHoliday
      );
      summary.otTotalIncome = Math.round(otTotalIncomeRaw);

      summaries[row.employeeId] = summary;
    }

    return {
      month,
      year,
      daysInMonth,
      holidays: holidays.map(h => ({ id: h.id, name: h.name, date: h.date.toISOString().split('T')[0], note: h.note })),
      settings: effectiveSettings,
      rows,
      summaries,
      overrides: await this.getOverridesForMonth(month, year, rows.map(r => r.employeeId)),
    };
  }

  /**
   * Load all MonthlyTimesheetOverride rows for a given month/year and employee set,
   * returning { [employeeId]: { [fieldKey]: value } }
   */
  private async getOverridesForMonth(
    month: number,
    year: number,
    employeeIds: string[],
  ): Promise<Record<string, Record<string, string>>> {
    if (employeeIds.length === 0) return {};

    const overrideRows = await prisma.monthlyTimesheetOverride.findMany({
      where: { month, year, employeeId: { in: employeeIds } },
    });

    const result: Record<string, Record<string, string>> = {};
    for (const row of overrideRows) {
      if (!result[row.employeeId]) result[row.employeeId] = {};
      result[row.employeeId][row.fieldKey] = row.value;
    }
    return result;
  }

  async upsertOverride(data: { employeeId: string; month: number; year: number; fieldKey: string; value: string }) {
    if (!data.employeeId || !data.fieldKey) {
      throw new ValidationError('Thiếu thông tin bắt buộc (employeeId, fieldKey)');
    }
    if (!data.month || data.month < 1 || data.month > 12) {
      throw new ValidationError('Tháng phải từ 1 đến 12');
    }
    if (!data.year || isNaN(data.year)) {
      throw new ValidationError('Năm không hợp lệ');
    }

    // Empty value → delete the override so it falls back to computed
    if (data.value === '' || data.value === null || data.value === undefined) {
      await prisma.monthlyTimesheetOverride.deleteMany({
        where: {
          employeeId: data.employeeId,
          month: data.month,
          year: data.year,
          fieldKey: data.fieldKey,
        },
      });
      return null;
    }

    return prisma.monthlyTimesheetOverride.upsert({
      where: {
        employeeId_month_year_fieldKey: {
          employeeId: data.employeeId,
          month: data.month,
          year: data.year,
          fieldKey: data.fieldKey,
        },
      },
      create: {
        employeeId: data.employeeId,
        month: data.month,
        year: data.year,
        fieldKey: data.fieldKey,
        value: data.value,
      },
      update: {
        value: data.value,
      },
    });
  }

  async upsertCell(data: { employeeId: string; date: string; code: string; note?: string; workHours?: number; overtimeHours?: number }) {
    if (!data.employeeId || !data.date || !data.code) {
      throw new ValidationError('Thiếu thông tin bắt buộc (employeeId, date, code)');
    }

    // Validate code against active AttendanceCode
    const validCode = await prisma.attendanceCode.findFirst({
      where: { code: data.code, isActive: true },
    });
    if (!validCode) {
      throw new ValidationError(`Mã chấm công "${data.code}" không hợp lệ hoặc đã bị vô hiệu hóa`);
    }

    const parsedDate = new Date(data.date);
    if (isNaN(parsedDate.getTime())) {
      throw new ValidationError('Ngày không hợp lệ');
    }

    return prisma.timesheetCell.upsert({
      where: {
        employeeId_date: {
          employeeId: data.employeeId,
          date: parsedDate,
        },
      },
      create: {
        employeeId: data.employeeId,
        date: parsedDate,
        code: data.code,
        note: data.note || null,
        workHours: data.workHours ?? 0,
        overtimeHours: data.overtimeHours ?? 0,
      },
      update: {
        code: data.code,
        note: data.note || null,
        workHours: data.workHours ?? 0,
        overtimeHours: data.overtimeHours ?? 0,
      },
    });
  }
}

export default new TimesheetService();

