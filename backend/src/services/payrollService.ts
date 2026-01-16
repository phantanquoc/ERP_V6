import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

export class PayrollService {
  async getPayrollByMonthYear(month: number, year: number): Promise<any[]> {
    // Get all ACTIVE employees with their payroll data for the specified month/year (if exists)
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
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
      },
      orderBy: {
        employeeCode: 'asc',
      },
    });

    return employees.map((employee, index) => {
      const payroll = employee.payrolls[0];

      // Get kpiSalary from positionLevel or first level of position
      const defaultKpiSalary =
        employee.positionLevel?.kpiSalary ?? employee.position?.levels?.[0]?.kpiSalary ?? 0;

      const baseSalary = payroll?.baseSalary ?? employee.baseSalary;
      const kpiBonus = payroll?.kpiBonus ?? defaultKpiSalary;
      const positionAllowance = payroll?.positionAllowance ?? 0;
      const otherAllowances = payroll?.otherAllowances ?? 0;
      const totalIncome =
        payroll?.totalIncome ?? baseSalary + kpiBonus + positionAllowance + otherAllowances;

      const socialInsurance = payroll?.socialInsurance ?? 0;
      const healthInsurance = payroll?.healthInsurance ?? 0;
      const unemploymentInsurance = payroll?.unemploymentInsurance ?? 0;
      const personalIncomeTax = payroll?.personalIncomeTax ?? 0;
      const kpiDeduction = payroll?.kpiDeduction ?? 0;
      const leaveDeduction = payroll?.leaveDeduction ?? 0;
      const totalDeductions =
        payroll?.totalDeductions ??
        socialInsurance +
          healthInsurance +
          unemploymentInsurance +
          personalIncomeTax +
          kpiDeduction +
          leaveDeduction;

      const netSalary = payroll?.netSalary ?? totalIncome - totalDeductions;

      const fullName = employee.user
        ? `${employee.user.firstName} ${employee.user.lastName}`.trim()
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
        workDays: payroll?.workDays ?? 0,
        leaveDays: payroll?.leaveDays ?? 0,
        overtimeHours: payroll?.overtimeHours ?? 0,
        payrollId: payroll?.id || null,
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

    return {
      id: payroll.id,
      employeeId: payroll.employeeId,
      employeeCode: payroll.employee.employeeCode,
      employeeName: `${payroll.employee.user.firstName} ${payroll.employee.user.lastName}`.trim(),
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
      workDays: payroll.workDays,
      leaveDays: payroll.leaveDays,
      overtimeHours: payroll.overtimeHours,
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
    const kpiDeduction = data.kpiDeduction ?? 0;
    const leaveDeduction = data.leaveDeduction ?? 0;

    // Calculate total deductions
    const totalDeductions =
      socialInsurance +
      healthInsurance +
      unemploymentInsurance +
      personalIncomeTax +
      kpiDeduction +
      leaveDeduction;

    // Calculate net salary
    const netSalary = totalIncome - totalDeductions;

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

    // Calculate totals
    const baseSalary = data.baseSalary !== undefined ? data.baseSalary : payroll.baseSalary;
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
    const kpiDeduction =
      data.kpiDeduction !== undefined ? data.kpiDeduction : payroll.kpiDeduction;
    const leaveDeduction =
      data.leaveDeduction !== undefined ? data.leaveDeduction : payroll.leaveDeduction;

    const totalDeductions =
      socialInsurance +
      healthInsurance +
      unemploymentInsurance +
      personalIncomeTax +
      kpiDeduction +
      leaveDeduction;
    const netSalary = totalIncome - totalDeductions;

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
}

export default new PayrollService();

