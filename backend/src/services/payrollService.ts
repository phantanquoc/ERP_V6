import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { computeKpiDeduction, computeOvertimePay } from '@utils/payroll';
import ExcelJS from 'exceljs';
import { NotificationEvent } from '@types';
import notificationService from './notificationService';
import { computeWeightedScoreForField } from '@services/employeeEvaluationService';
import { resolveActualOvertimeForPeriod } from '@services/overtimeActualHoursService';

export class PayrollService {
  async getPayrollByMonthYear(month: number, year: number, userDepartmentIds?: string[], userSubDepartmentId?: string): Promise<any[]> {
    // Date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Build where conditions
    const conditions: any[] = [
      { status: 'ACTIVE' },
    ];

    // Filter by department/subdepartment
    if (userSubDepartmentId) {
      // TEAM_LEAD/EMPLOYEE: only show subdepartment
      conditions.push({ user: { subDepartmentId: userSubDepartmentId } });
    } else if (userDepartmentIds?.length) {
      // DEPARTMENT_HEAD: show department (including subdepartments)
      conditions.push({
        OR: [
          { user: { departmentId: { in: userDepartmentIds } } },
          { subDepartment: { departmentId: { in: userDepartmentIds } } },
        ],
      });
    }
    // ADMIN: no filter, show all

    // Get ACTIVE employees with their payroll data for the specified month/year (if exists)
    const employees = await prisma.employee.findMany({
      where: {
        AND: conditions,
      },
      include: {
        user: true,
        position: {
          include: {
            levels: true,
          },
        },
        positionLevel: true,
        payrolls: {
          where: {
            month,
            year,
          },
        },
        attendances: {
          where: {
            attendanceDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
      orderBy: {
        employeeCode: 'asc',
      },
    });

    // Fetch overtime rate from settings
    const settings = await prisma.payrollSettings.findFirst();
    // Mẫu số suy lương giờ (mặc định 26 ngày × 8 giờ) và hệ số OT ngày thường.
    // Tiền OT tính từ lương của từng nhân viên, không dùng một mức phẳng chung.
    const settingStandardWorkDays = settings?.standardWorkDays ?? 26;
    const settingHoursPerDay = settings?.standardHoursPerDay ?? 8;
    const settingOtMultiplier = settings?.otRateWeekday ?? 1.5;
    const flatOvertimeRateFallback = settings?.overtimeRate ?? 0;
    const useActualOvertime = settings?.useActualOvertimeHours ?? false;

    // Derive actual overtime for the period. Computed regardless of the setting
    // so both figures can be displayed side by side; only the payable choice
    // below depends on the setting.
    const overtimeTotals = await resolveActualOvertimeForPeriod(
      startDate,
      endDate,
      employees.map(e => e.id)
    );

    // Query evaluations for this period to compute kpiDeduction server-side
    const periodStr = `${year}-${String(month).padStart(2, '0')}`;
    const evaluations = await prisma.evaluation.findMany({
      where: {
        period: periodStr,
        status: { in: ['COMPLETED', 'ACKNOWLEDGED'] },
      },
      include: {
        details: {
          include: { positionResponsibility: true },
        },
      },
    });
    // Build a map of employeeId -> evaluation for quick lookup
    const evaluationMap = new Map(evaluations.map(ev => [ev.employeeId, ev]));

    return employees.map((employee, index) => {
      const payroll = employee.payrolls[0];

      // Always calculate workDays and leaveDays from attendance records
      const attendanceLeaveDays = employee.attendances.filter(
        a => a.status === 'ABSENT' || a.status === 'ON_LEAVE'
      ).length;
      const attendanceWorkDays = employee.attendances.filter(
        a => a.status === 'PRESENT' || a.status === 'LATE'
      ).length;

      // Get kpiSalary from positionLevel or first level of position
      const defaultKpiSalary =
        employee.positionLevel?.kpiSalary ?? employee.position?.levels?.[0]?.kpiSalary ?? 0;

      const baseSalary = (payroll?.baseSalary && payroll.baseSalary > 0) ? payroll.baseSalary : employee.baseSalary;
      const kpiBonus = payroll?.kpiBonus ?? defaultKpiSalary;
      const positionAllowance = payroll?.positionAllowance ?? 0;
      const otherAllowances = payroll?.otherAllowances ?? 0;
      const totalIncome =
        payroll?.totalIncome ?? baseSalary + kpiBonus + positionAllowance + otherAllowances;

      const socialInsurance = payroll?.socialInsurance ?? 0;
      const healthInsurance = payroll?.healthInsurance ?? 0;
      const unemploymentInsurance = payroll?.unemploymentInsurance ?? 0;
      const personalIncomeTax = payroll?.personalIncomeTax ?? 0;
      const leaveDays = attendanceLeaveDays;

      // Compute kpiDeduction from evaluation (server-side)
      let kpiDeduction = 0;
      let evaluationPending = true;
      const evaluation = evaluationMap.get(employee.id);
      if (evaluation && evaluation.details.length > 0) {
        const supervisorScore2Percentage = computeWeightedScoreForField(
          evaluation.details as any,
          'supervisorScore2'
        );
        kpiDeduction = computeKpiDeduction(kpiBonus, supervisorScore2Percentage);
        evaluationPending = false;
      }

      // Luôn tính lại leaveDeduction từ attendance mới thay vì dùng giá trị cũ từ DB
      const standardWorkDays = settings?.standardWorkDays ?? 26;
      const leaveDeduction =
        baseSalary > 0 && leaveDays > 0 ? Math.round((baseSalary / standardWorkDays) * leaveDays) : 0;
      // Luôn tính lại totalDeductions và netSalary để phản ánh dữ liệu attendance mới nhất
      const totalDeductions =
        socialInsurance +
          healthInsurance +
          unemploymentInsurance +
          personalIncomeTax +
          kpiDeduction +
          leaveDeduction;

      // Planned hours: the stored overtime rows, exactly as before this change.
      const plannedOvertimeHours = employee.attendances
          .filter(a => a.status === 'OVERTIME')
          .reduce((sum, a) => sum + (Number(a.workHours) || 0), 0);
      // Actual hours: derived from the clock. Flagged participant-days already
      // contribute zero via payableActualHours.
      const actualOvertimeHours = overtimeTotals.actualByEmployee.get(employee.id) ?? 0;
      const employeeOvertimeHours = useActualOvertime
        ? actualOvertimeHours
        : plannedOvertimeHours;
      const employeeOvertimePay = computeOvertimePay(
        employeeOvertimeHours,
        baseSalary,
        settingOtMultiplier,
        settingStandardWorkDays,
        settingHoursPerDay,
        flatOvertimeRateFallback
      );
      const netSalary = totalIncome - totalDeductions + employeeOvertimePay;

      const fullName = employee.user
        ? `${employee.user.lastName} ${employee.user.firstName}`.trim()
        : '';

      return {
        stt: index + 1,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: fullName,
        positionName: employee.position?.name || '',
        month,
        year,
        baseSalary,
        kpiBonus,
        positionAllowance,
        otherAllowances,
        totalIncome,
        socialInsurance,
        healthInsurance,
        unemploymentInsurance,
        personalIncomeTax,
        kpiDeduction,
        leaveDeduction,
        totalDeductions,
        netSalary,
        workDays: attendanceWorkDays,
        leaveDays,
        overtimeHours: employeeOvertimeHours,
        // Both figures travel regardless of the setting, so managers can compare
        // before any pay moves. `overtimeHoursSource` names the payable one so
        // the parallel display cannot be misread.
        plannedOvertimeHours: Math.round(plannedOvertimeHours * 100) / 100,
        actualOvertimeHours,
        overtimeHoursSource: useActualOvertime ? 'ACTUAL' : 'PLANNED',
        overtimeFlags: (overtimeTotals.flagsByEmployee.get(employee.id) ?? []).map(e => ({
          date: e.dateKey,
          code: e.flag?.code ?? null,
          kind: e.flag?.kind ?? null,
          message: e.flag?.message ?? null,
          plannedHours: e.plannedHours,
          actualHours: e.actualHours,
        })),
        payrollId: payroll?.id || null,
        evaluationPending,
      };
    });
  }

  async getPayrollDetail(payrollId: string): Promise<any> {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    if (!payroll) {
      throw new NotFoundError('Payroll not found');
    }

    // Calculate workDays, leaveDays, overtimeHours from actual attendance data
    const startDate = new Date(payroll.year, payroll.month - 1, 1);
    const endDate = new Date(payroll.year, payroll.month, 0, 23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: payroll.employeeId,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const workDays = attendances.filter(
      a => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;
    const leaveDays = attendances.filter(
      a => a.status === 'ABSENT' || a.status === 'ON_LEAVE'
    ).length;
    // Planned hours: the stored overtime rows, exactly as before this change.
    const plannedOvertimeHours = attendances
      .filter(a => a.status === 'OVERTIME')
      .reduce((sum, a) => sum + (Number(a.workHours) || 0), 0);

    const detailSettings = await prisma.payrollSettings.findFirst();
    const detailStandardWorkDays = detailSettings?.standardWorkDays ?? 26;
    const detailHoursPerDay = detailSettings?.standardHoursPerDay ?? 8;
    const detailOtMultiplier = detailSettings?.otRateWeekday ?? 1.5;
    const detailFlatFallback = detailSettings?.overtimeRate ?? 0;
    const detailUseActual = detailSettings?.useActualOvertimeHours ?? false;

    // Actual hours: derived from the clock at read time. Flagged participant-days
    // contribute zero via payableActualHours.
    const detailOvertimeTotals = await resolveActualOvertimeForPeriod(
      startDate,
      endDate,
      [payroll.employeeId]
    );
    const actualOvertimeHours =
      detailOvertimeTotals.actualByEmployee.get(payroll.employeeId) ?? 0;

    const overtimeHours = detailUseActual ? actualOvertimeHours : plannedOvertimeHours;
    const overtimePay = computeOvertimePay(
      overtimeHours,
      payroll.baseSalary,
      detailOtMultiplier,
      detailStandardWorkDays,
      detailHoursPerDay,
      detailFlatFallback
    );

    return {
      id: payroll.id,
      employeeId: payroll.employeeId,
      employeeCode: payroll.employee.employeeCode,
      employeeName: `${payroll.employee.user.lastName} ${payroll.employee.user.firstName}`.trim(),
      positionName: payroll.employee.position?.name || '',
      month: payroll.month,
      year: payroll.year,
      baseSalary: payroll.baseSalary,
      kpiBonus: payroll.kpiBonus,
      positionAllowance: payroll.positionAllowance,
      otherAllowances: payroll.otherAllowances,
      totalIncome: payroll.totalIncome,
      socialInsurance: payroll.socialInsurance,
      healthInsurance: payroll.healthInsurance,
      unemploymentInsurance: payroll.unemploymentInsurance,
      personalIncomeTax: payroll.personalIncomeTax,
      kpiDeduction: payroll.kpiDeduction,
      leaveDeduction: payroll.leaveDeduction,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
      workDays,
      leaveDays,
      overtimeHours,
      overtimePay,
      plannedOvertimeHours: Math.round(plannedOvertimeHours * 100) / 100,
      actualOvertimeHours,
      overtimeHoursSource: detailUseActual ? 'ACTUAL' : 'PLANNED',
      overtimeFlags: (detailOvertimeTotals.flagsByEmployee.get(payroll.employeeId) ?? []).map(e => ({
        date: e.dateKey,
        code: e.flag?.code ?? null,
        kind: e.flag?.kind ?? null,
        message: e.flag?.message ?? null,
        plannedHours: e.plannedHours,
        actualHours: e.actualHours,
      })),
    };
  }

  async createOrUpdatePayroll(
    employeeId: string,
    month: number,
    year: number,
    data: any
  ): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        position: {
          include: {
            levels: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Validate input data
    if (data.workDays < 0 || data.leaveDays < 0) {
      throw new ValidationError('Work days and leave days must be non-negative');
    }

    const baseSalary = data.baseSalary ?? employee.baseSalary;
    const kpiBonus = data.kpiBonus ?? 0;
    const positionAllowance = data.positionAllowance ?? 0;
    const otherAllowances = data.otherAllowances ?? 0;

    // Calculate total income
    const totalIncome = baseSalary + kpiBonus + positionAllowance + otherAllowances;

    const socialInsurance = data.socialInsurance ?? 0;
    const healthInsurance = data.healthInsurance ?? 0;
    const unemploymentInsurance = data.unemploymentInsurance ?? 0;
    const personalIncomeTax = data.personalIncomeTax ?? 0;
    const leaveDeduction = data.leaveDeduction ?? 0;

    // Compute kpiDeduction server-side from evaluation (ignore client value)
    let kpiDeduction = 0;
    const periodStr = `${year}-${String(month).padStart(2, '0')}`;
    const evaluation = await prisma.evaluation.findFirst({
      where: {
        employeeId,
        period: periodStr,
        status: { in: ['COMPLETED', 'ACKNOWLEDGED'] },
      },
      include: {
        details: {
          include: { positionResponsibility: true },
        },
      },
    });
    if (evaluation && evaluation.details.length > 0) {
      const supervisorScore2Percentage = computeWeightedScoreForField(
        evaluation.details as any,
        'supervisorScore2'
      );
      kpiDeduction = computeKpiDeduction(kpiBonus, supervisorScore2Percentage);
    }

    // Calculate total deductions
    const totalDeductions =
      socialInsurance +
      healthInsurance +
      unemploymentInsurance +
      personalIncomeTax +
      kpiDeduction +
      leaveDeduction;

    // Calculate net salary (include overtime pay)
    const settings = await prisma.payrollSettings.findFirst();
    const overtimeHours = data.overtimeHours ?? 0;
    const overtimePay = computeOvertimePay(
      overtimeHours,
      baseSalary,
      settings?.otRateWeekday ?? 1.5,
      settings?.standardWorkDays ?? 26,
      settings?.standardHoursPerDay ?? 8,
      settings?.overtimeRate ?? 0
    );
    const netSalary = totalIncome - totalDeductions + overtimePay;

    const payroll = await prisma.payroll.upsert({
      where: {
        employeeId_month_year: {
          employeeId,
          month,
          year,
        },
      },
      update: {
        baseSalary,
        kpiBonus,
        positionAllowance,
        otherAllowances,
        totalIncome,
        socialInsurance,
        healthInsurance,
        unemploymentInsurance,
        personalIncomeTax,
        kpiDeduction,
        leaveDeduction,
        totalDeductions,
        netSalary,
        workDays: data.workDays ?? 0,
        leaveDays: data.leaveDays ?? 0,
        overtimeHours: data.overtimeHours ?? 0,
      },
      create: {
        employeeId,
        month,
        year,
        baseSalary,
        kpiBonus,
        positionAllowance,
        otherAllowances,
        totalIncome,
        socialInsurance,
        healthInsurance,
        unemploymentInsurance,
        personalIncomeTax,
        kpiDeduction,
        leaveDeduction,
        totalDeductions,
        netSalary,
        workDays: data.workDays ?? 0,
        leaveDays: data.leaveDays ?? 0,
        overtimeHours: data.overtimeHours ?? 0,
      },
    });

    return payroll;
  }

  async updatePayroll(payrollId: string, data: any): Promise<any> {
    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        employee: true,
      },
    });

    if (!payroll) {
      throw new NotFoundError('Payroll not found');
    }

    // Validate input data
    if (data.workDays !== undefined && data.workDays < 0) {
      throw new ValidationError('Work days must be non-negative');
    }
    if (data.leaveDays !== undefined && data.leaveDays < 0) {
      throw new ValidationError('Leave days must be non-negative');
    }

    // Calculate totals - fallback to employee.baseSalary if payroll.baseSalary is 0
    const baseSalary = data.baseSalary !== undefined
      ? data.baseSalary
      : (payroll.baseSalary > 0 ? payroll.baseSalary : payroll.employee.baseSalary);
    const kpiBonus = data.kpiBonus !== undefined ? data.kpiBonus : payroll.kpiBonus;
    const positionAllowance =
      data.positionAllowance !== undefined ? data.positionAllowance : payroll.positionAllowance;
    const otherAllowances =
      data.otherAllowances !== undefined ? data.otherAllowances : payroll.otherAllowances;

    const totalIncome = baseSalary + kpiBonus + positionAllowance + otherAllowances;

    const socialInsurance =
      data.socialInsurance !== undefined ? data.socialInsurance : payroll.socialInsurance;
    const healthInsurance =
      data.healthInsurance !== undefined ? data.healthInsurance : payroll.healthInsurance;
    const unemploymentInsurance =
      data.unemploymentInsurance !== undefined
        ? data.unemploymentInsurance
        : payroll.unemploymentInsurance;
    const personalIncomeTax =
      data.personalIncomeTax !== undefined ? data.personalIncomeTax : payroll.personalIncomeTax;
    const leaveDeduction =
      data.leaveDeduction !== undefined ? data.leaveDeduction : payroll.leaveDeduction;

    // Compute kpiDeduction server-side from evaluation (ignore client value)
    let kpiDeduction = 0;
    const updatePeriodStr = `${payroll.year}-${String(payroll.month).padStart(2, '0')}`;
    const updateEvaluation = await prisma.evaluation.findFirst({
      where: {
        employeeId: payroll.employeeId,
        period: updatePeriodStr,
        status: { in: ['COMPLETED', 'ACKNOWLEDGED'] },
      },
      include: {
        details: {
          include: { positionResponsibility: true },
        },
      },
    });
    if (updateEvaluation && updateEvaluation.details.length > 0) {
      const supervisorScore2Percentage = computeWeightedScoreForField(
        updateEvaluation.details as any,
        'supervisorScore2'
      );
      kpiDeduction = computeKpiDeduction(kpiBonus, supervisorScore2Percentage);
    }

    const totalDeductions =
      socialInsurance +
      healthInsurance +
      unemploymentInsurance +
      personalIncomeTax +
      kpiDeduction +
      leaveDeduction;

    // Include overtime pay in net salary
    const settings = await prisma.payrollSettings.findFirst();
    const currentOvertimeHours =
      data.overtimeHours !== undefined ? data.overtimeHours : payroll.overtimeHours;
    const currentOvertimePay = computeOvertimePay(
      currentOvertimeHours,
      baseSalary,
      settings?.otRateWeekday ?? 1.5,
      settings?.standardWorkDays ?? 26,
      settings?.standardHoursPerDay ?? 8,
      settings?.overtimeRate ?? 0
    );
    const netSalary = totalIncome - totalDeductions + currentOvertimePay;

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        baseSalary,
        kpiBonus,
        positionAllowance,
        otherAllowances,
        totalIncome,
        socialInsurance,
        healthInsurance,
        unemploymentInsurance,
        personalIncomeTax,
        kpiDeduction,
        leaveDeduction,
        totalDeductions,
        netSalary,
        workDays: data.workDays !== undefined ? data.workDays : payroll.workDays,
        leaveDays: data.leaveDays !== undefined ? data.leaveDays : payroll.leaveDays,
        overtimeHours:
          data.overtimeHours !== undefined ? data.overtimeHours : payroll.overtimeHours,
      },
    });

    return updated;
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    let data: any[];

    if (filters?.month && filters?.year) {
      // Use same logic as UI - get all active employees with calculated payroll
      data = await this.getPayrollByMonthYear(filters.month, filters.year);

      // Apply search filter if provided
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        data = data.filter(
          (item: any) =>
            item.employeeCode?.toLowerCase().includes(search) ||
            item.employeeName?.toLowerCase().includes(search)
        );
      }
    } else {
      // Fallback: query saved payroll records directly
      const where: any = {};
      if (filters?.search) {
        where.employee = {
          OR: [
            { employeeCode: { contains: filters.search, mode: 'insensitive' } },
            { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
            { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
          ],
        };
      }

      const payrolls = await prisma.payroll.findMany({
        where,
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      data = payrolls.map((payroll) => ({
        employeeCode: payroll.employee.employeeCode,
        employeeName: `${payroll.employee.user.lastName} ${payroll.employee.user.firstName}`,
        month: payroll.month,
        year: payroll.year,
        baseSalary: payroll.baseSalary,
        kpiBonus: payroll.kpiBonus,
        positionAllowance: payroll.positionAllowance,
        otherAllowances: payroll.otherAllowances,
        totalDeductions: payroll.totalDeductions,
        netSalary: payroll.netSalary,
      }));
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bảng lương');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã NV', key: 'employeeCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Vị trí', key: 'positionName', width: 20 },
      { header: 'Lương cơ bản', key: 'baseSalary', width: 18 },
      { header: 'Lương KPI', key: 'kpiBonus', width: 18 },
      { header: 'Phụ cấp khác', key: 'otherAllowances', width: 18 },
      { header: 'Tổng khấu trừ', key: 'deductions', width: 18 },
      { header: 'Thực lĩnh', key: 'netSalary', width: 18 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    let totalBaseSalary = 0;
    let totalKpiBonus = 0;
    let totalOtherAllowances = 0;
    let totalDeductions = 0;
    let totalNetSalary = 0;

    data.forEach((item, index) => {
      const baseSalary = Number(item.baseSalary || 0);
      const kpiBonus = Number(item.kpiBonus || 0);
      const otherAllowances = Number(item.positionAllowance || 0) + Number(item.otherAllowances || 0);
      const deductions = Number(item.totalDeductions || 0);
      const netSalary = Number(item.netSalary || 0);

      totalBaseSalary += baseSalary;
      totalKpiBonus += kpiBonus;
      totalOtherAllowances += otherAllowances;
      totalDeductions += deductions;
      totalNetSalary += netSalary;

      worksheet.addRow({
        stt: index + 1,
        employeeCode: item.employeeCode,
        fullName: item.employeeName,
        positionName: item.positionName || '',
        baseSalary,
        kpiBonus,
        otherAllowances,
        deductions,
        netSalary,
      });
    });

    // Add total row
    const totalRow = worksheet.addRow({
      stt: '',
      employeeCode: '',
      fullName: `Tổng cộng (${data.length} nhân viên)`,
      positionName: '',
      baseSalary: totalBaseSalary,
      kpiBonus: totalKpiBonus,
      otherAllowances: totalOtherAllowances,
      deductions: totalDeductions,
      netSalary: totalNetSalary,
    });
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }

  async getPayrollSettings(): Promise<any> {
    let settings = await prisma.payrollSettings.findFirst();
    if (!settings) {
      settings = await prisma.payrollSettings.create({
        data: {
          standardWorkDays: 26,
          overtimeRate: 0,
          mealAllowancePerDay: 0,
          overtimeMealAllowance: 25000,
          sundayMealAllowance: 0,
          fuelPricePerKm: 0,
          otRateWeekday: 1.5,
          otRateSunday: 2,
          otRateHoliday: 3,
        },
      });
    }
    return settings;
  }

  async updatePayrollSettings(data: {
    standardWorkDays?: number;
    standardHoursPerDay?: number;
    overtimeRate?: number;
    useActualOvertimeHours?: boolean;
    mealAllowancePerDay?: number;
    overtimeMealAllowance?: number;
    sundayMealAllowance?: number;
    fuelPricePerKm?: number;
    otRateWeekday?: number;
    otRateSunday?: number;
    otRateHoliday?: number;
  }): Promise<any> {
    let settings = await prisma.payrollSettings.findFirst();
    if (!settings) {
      // Nếu chưa có settings, tạo mới với values từ data hoặc defaults
      settings = await prisma.payrollSettings.create({
        data: {
          standardWorkDays: data.standardWorkDays ?? 26,
          standardHoursPerDay: data.standardHoursPerDay ?? 8,
          overtimeRate: data.overtimeRate ?? 0,
          useActualOvertimeHours: data.useActualOvertimeHours ?? false,
          mealAllowancePerDay: data.mealAllowancePerDay ?? 0,
          overtimeMealAllowance: data.overtimeMealAllowance ?? 25000,
          sundayMealAllowance: data.sundayMealAllowance ?? 0,
          fuelPricePerKm: data.fuelPricePerKm ?? 0,
          otRateWeekday: data.otRateWeekday ?? 1.5,
          otRateSunday: data.otRateSunday ?? 2,
          otRateHoliday: data.otRateHoliday ?? 3,
        },
      });
    } else {
      // Update chỉ những fields được truyền vào
      const updateData: any = {};
      if (data.standardWorkDays !== undefined) updateData.standardWorkDays = data.standardWorkDays;
      if (data.standardHoursPerDay !== undefined) updateData.standardHoursPerDay = data.standardHoursPerDay;
      if (data.overtimeRate !== undefined) updateData.overtimeRate = data.overtimeRate;
      if (data.useActualOvertimeHours !== undefined) updateData.useActualOvertimeHours = data.useActualOvertimeHours;
      if (data.mealAllowancePerDay !== undefined) updateData.mealAllowancePerDay = data.mealAllowancePerDay;
      if (data.overtimeMealAllowance !== undefined) updateData.overtimeMealAllowance = data.overtimeMealAllowance;
      if (data.sundayMealAllowance !== undefined) updateData.sundayMealAllowance = data.sundayMealAllowance;
      if (data.fuelPricePerKm !== undefined) updateData.fuelPricePerKm = data.fuelPricePerKm;
      if (data.otRateWeekday !== undefined) updateData.otRateWeekday = data.otRateWeekday;
      if (data.otRateSunday !== undefined) updateData.otRateSunday = data.otRateSunday;
      if (data.otRateHoliday !== undefined) updateData.otRateHoliday = data.otRateHoliday;

      settings = await prisma.payrollSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }
    return settings;
  }

  async sendPayrollNotifications(month: number, year: number): Promise<{ count: number }> {
    const payrolls = await prisma.payroll.findMany({
      where: { month, year },
      include: { employee: true },
    });

    if (payrolls.length === 0) {
      throw new ValidationError('Không có bảng lương nào cho tháng/năm này');
    }

    const employeeIds = payrolls.map((p) => p.employeeId);
    const period = `${year}-${String(month).padStart(2, '0')}`;

    await notificationService.notify(NotificationEvent.PAYROLL_PUBLISHED, {
      targetEmployeeIds: employeeIds,
      metadata: { month, year, period },
    });

    return { count: employeeIds.length };
  }

  async getMyPayroll(userId: string, month: number, year: number): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { userId },
    });

    if (!employee) {
      throw new NotFoundError('Không tìm thấy nhân viên');
    }

    const payroll = await prisma.payroll.findFirst({
      where: { employeeId: employee.id, month, year },
    });

    if (!payroll) {
      throw new NotFoundError('Không tìm thấy bảng lương');
    }

    // Calculate workDays, leaveDays, overtimeHours from actual attendance data
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: employee.id,
        attendanceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const workDays = attendances.filter(
      (a) => a.status === 'PRESENT' || a.status === 'LATE'
    ).length;
    const leaveDays = attendances.filter(
      (a) => a.status === 'ABSENT' || a.status === 'ON_LEAVE'
    ).length;
    // Planned hours: the stored overtime rows, exactly as before this change.
    const plannedOvertimeHours = attendances
      .filter((a) => a.status === 'OVERTIME')
      .reduce((sum, a) => sum + (Number(a.workHours) || 0), 0);

    const payrollSettings = await prisma.payrollSettings.findFirst();
    const myStandardWorkDays = payrollSettings?.standardWorkDays ?? 26;
    const myHoursPerDay = payrollSettings?.standardHoursPerDay ?? 8;
    const myOtMultiplier = payrollSettings?.otRateWeekday ?? 1.5;
    const myFlatFallback = payrollSettings?.overtimeRate ?? 0;
    const myUseActual = payrollSettings?.useActualOvertimeHours ?? false;

    // Actual hours: derived from the clock at read time. Flagged participant-days
    // contribute zero via payableActualHours.
    const myOvertimeTotals = await resolveActualOvertimeForPeriod(
      startDate,
      endDate,
      [employee.id]
    );
    const actualOvertimeHours = myOvertimeTotals.actualByEmployee.get(employee.id) ?? 0;

    const overtimeHours = myUseActual ? actualOvertimeHours : plannedOvertimeHours;
    const overtimePay = computeOvertimePay(
      overtimeHours,
      employee.baseSalary,
      myOtMultiplier,
      myStandardWorkDays,
      myHoursPerDay,
      myFlatFallback
    );
    const myOvertimeFlags = (myOvertimeTotals.flagsByEmployee.get(employee.id) ?? []).map(
      (e) => ({
        date: e.dateKey,
        code: e.flag?.code ?? null,
        kind: e.flag?.kind ?? null,
        message: e.flag?.message ?? null,
        plannedHours: e.plannedHours,
        actualHours: e.actualHours,
      })
    );

    // Determine evaluationPending flag
    const myPeriodStr = `${year}-${String(month).padStart(2, '0')}`;
    const myEvaluation = await prisma.evaluation.findFirst({
      where: {
        employeeId: employee.id,
        period: myPeriodStr,
        status: { in: ['COMPLETED', 'ACKNOWLEDGED'] },
      },
    });
    const evaluationPending = !myEvaluation;

    // Get employee with user and position info
    const employeeWithDetails = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: {
        user: true,
        position: true,
      },
    });

    return {
      id: payroll.id,
      employeeId: payroll.employeeId,
      employeeCode: employeeWithDetails?.employeeCode,
      employeeName: employeeWithDetails?.user
        ? `${employeeWithDetails.user.lastName} ${employeeWithDetails.user.firstName}`.trim()
        : '',
      positionName: employeeWithDetails?.position?.name || '',
      month: payroll.month,
      year: payroll.year,
      baseSalary: payroll.baseSalary,
      kpiBonus: payroll.kpiBonus,
      positionAllowance: payroll.positionAllowance,
      otherAllowances: payroll.otherAllowances,
      totalIncome: payroll.totalIncome,
      socialInsurance: payroll.socialInsurance,
      healthInsurance: payroll.healthInsurance,
      unemploymentInsurance: payroll.unemploymentInsurance,
      personalIncomeTax: payroll.personalIncomeTax,
      kpiDeduction: payroll.kpiDeduction,
      leaveDeduction: payroll.leaveDeduction,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
      workDays,
      leaveDays,
      overtimeHours,
      overtimePay,
      // Both figures travel together so the payable one cannot be misread.
      plannedOvertimeHours: Math.round(plannedOvertimeHours * 100) / 100,
      actualOvertimeHours,
      overtimeHoursSource: myUseActual ? 'ACTUAL' : 'PLANNED',
      overtimeFlags: myOvertimeFlags,
      evaluationPending,
    };
  }
}

export default new PayrollService();

