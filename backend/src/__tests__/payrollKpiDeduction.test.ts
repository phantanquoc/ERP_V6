jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    evaluation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    payroll: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    payrollSettings: {
      findFirst: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn() },
}));

jest.mock('../services/notificationService', () => ({
  __esModule: true,
  default: {
    notify: jest.fn().mockResolvedValue(undefined),
    createNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('exceljs', () => ({
  __esModule: true,
  default: { Workbook: jest.fn() },
}));

import prisma from '@config/database';
import { computeWeightedScoreForField } from '@services/employeeEvaluationService';
import { PayrollService } from '@services/payrollService';

const service = new PayrollService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
beforeEach(() => {
  jest.clearAllMocks();
});

// ─── computeWeightedScoreForField ─────────────────────────────────────────────

describe('computeWeightedScoreForField', () => {
  it('tính điểm trọng số cơ bản với nhiều details có weight khác nhau', () => {
    const details = [
      { selfScore: 80, supervisorScore1: 70, supervisorScore2: 90, positionResponsibility: { weight: 60 } },
      { selfScore: 60, supervisorScore1: 50, supervisorScore2: 80, positionResponsibility: { weight: 40 } },
    ];
    // supervisorScore2: (90*60 + 80*40) / (60+40) = (5400+3200)/100 = 86
    expect(computeWeightedScoreForField(details, 'supervisorScore2')).toBeCloseTo(86, 1);
    // selfScore: (80*60 + 60*40) / 100 = (4800+2400)/100 = 72
    expect(computeWeightedScoreForField(details, 'selfScore')).toBeCloseTo(72, 1);
    // supervisorScore1: (70*60 + 50*40) / 100 = (4200+2000)/100 = 62
    expect(computeWeightedScoreForField(details, 'supervisorScore1')).toBeCloseTo(62, 1);
  });

  it('trả về 0 khi tất cả scores đều null', () => {
    const details = [
      { selfScore: null, supervisorScore1: null, supervisorScore2: null, positionResponsibility: { weight: 50 } },
      { selfScore: null, supervisorScore1: null, supervisorScore2: null, positionResponsibility: { weight: 50 } },
    ];
    expect(computeWeightedScoreForField(details, 'supervisorScore2')).toBe(0);
    expect(computeWeightedScoreForField(details, 'selfScore')).toBe(0);
  });

  it('trả về 0 khi một số scores là null (chưa điền hết)', () => {
    const details = [
      { selfScore: 80, supervisorScore1: null, supervisorScore2: 90, positionResponsibility: { weight: 50 } },
      { selfScore: 70, supervisorScore1: null, supervisorScore2: null, positionResponsibility: { weight: 50 } },
    ];
    // supervisorScore2: one is null -> returns 0
    expect(computeWeightedScoreForField(details, 'supervisorScore2')).toBe(0);
    // supervisorScore1: all null -> returns 0
    expect(computeWeightedScoreForField(details, 'supervisorScore1')).toBe(0);
  });

  it('trả về 0 khi details array rỗng', () => {
    expect(computeWeightedScoreForField([], 'supervisorScore2')).toBe(0);
  });

  it('trả về 0 khi totalWeight bằng 0', () => {
    const details = [
      { selfScore: 80, supervisorScore1: 70, supervisorScore2: 90, positionResponsibility: { weight: 0 } },
      { selfScore: 60, supervisorScore1: 50, supervisorScore2: 80, positionResponsibility: { weight: 0 } },
    ];
    expect(computeWeightedScoreForField(details, 'supervisorScore2')).toBe(0);
  });
  it('trả về 100 khi tất cả scores đều 100 (perfect score)', () => {
    const details = [
      { selfScore: 100, supervisorScore1: 100, supervisorScore2: 100, positionResponsibility: { weight: 60 } },
      { selfScore: 100, supervisorScore1: 100, supervisorScore2: 100, positionResponsibility: { weight: 40 } },
    ];
    expect(computeWeightedScoreForField(details, 'supervisorScore2')).toBe(100);
    expect(computeWeightedScoreForField(details, 'selfScore')).toBe(100);
  });

  it('trả về 0 khi tất cả scores bằng 0', () => {
    const details = [
      { selfScore: 0, supervisorScore1: 0, supervisorScore2: 0, positionResponsibility: { weight: 60 } },
      { selfScore: 0, supervisorScore1: 0, supervisorScore2: 0, positionResponsibility: { weight: 40 } },
    ];
    expect(computeWeightedScoreForField(details, 'supervisorScore2')).toBe(0);
    expect(computeWeightedScoreForField(details, 'selfScore')).toBe(0);
  });

  it('tính đúng khi positionResponsibility là null', () => {
    const details = [
      { selfScore: 80, supervisorScore1: 70, supervisorScore2: 90, positionResponsibility: null },
      { selfScore: 60, supervisorScore1: 50, supervisorScore2: 80, positionResponsibility: { weight: 100 } },
    ];
    // totalWeight = 0 + 100 = 100, sum = 90*0 + 80*100 = 8000, result = 8000/100 = 80
    expect(computeWeightedScoreForField(details, 'supervisorScore2')).toBeCloseTo(80, 1);
  });

  it('handles mixed scores with different weights correctly', () => {
    const details = [
      { selfScore: 95, supervisorScore1: 80, supervisorScore2: 75, positionResponsibility: { weight: 30 } },
      { selfScore: 65, supervisorScore1: 90, supervisorScore2: 85, positionResponsibility: { weight: 50 } },
      { selfScore: 70, supervisorScore1: 60, supervisorScore2: 70, positionResponsibility: { weight: 20 } },
    ];
    // supervisorScore2: (75*30 + 85*50 + 70*20) / (30+50+20) = (2250+4250+1400)/100 = 79
    expect(computeWeightedScoreForField(details, 'supervisorScore2')).toBeCloseTo(79, 1);
  });
});

// ─── PayrollService — kpiDeduction in getPayrollByMonthYear ──────────────────

describe('PayrollService — getPayrollByMonthYear kpiDeduction', () => {
  const makeEmployee = (id: string, baseSalary: number, kpiSalary: number) => ({
    id,
    employeeCode: `EMP-${id}`,
    baseSalary,
    user: { firstName: 'Test', lastName: 'User', departmentId: null, subDepartmentId: null },
    position: { name: 'Dev', levels: [{ kpiSalary }] },
    positionLevel: { kpiSalary },
    payrolls: [],
    attendances: [],
  });
  it('khi evaluation COMPLETED tồn tại → tính kpiDeduction đúng, evaluationPending = false', async () => {
    const employee = makeEmployee('emp-1', 10000000, 5000000);
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([
      {
        employeeId: 'emp-1',
        status: 'COMPLETED',
        details: [
          { selfScore: 80, supervisorScore1: 85, supervisorScore2: 90, positionResponsibility: { weight: 60 } },
          { selfScore: 70, supervisorScore1: 75, supervisorScore2: 80, positionResponsibility: { weight: 40 } },
        ],
      },
    ]);

    const result = await service.getPayrollByMonthYear(6, 2026);

    // supervisorScore2: (90*60 + 80*40) / 100 = 86
    // kpiDeduction = 5000000 * (100 - 86) / 100 = 5000000 * 14 / 100 = 700000
    expect(result[0].kpiDeduction).toBe(700000);
    expect(result[0].evaluationPending).toBe(false);
  });

  it('khi không có evaluation → kpiDeduction = 0, evaluationPending = true', async () => {
    const employee = makeEmployee('emp-1', 10000000, 5000000);
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getPayrollByMonthYear(6, 2026);

    expect(result[0].kpiDeduction).toBe(0);
    expect(result[0].evaluationPending).toBe(true);
  });

  it('khi evaluation có status SELF_PENDING → kpiDeduction = 0, evaluationPending = true', async () => {
    const employee = makeEmployee('emp-1', 10000000, 5000000);
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    // Only COMPLETED/ACKNOWLEDGED are queried, so SELF_PENDING won't appear in results
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getPayrollByMonthYear(6, 2026);

    expect(result[0].kpiDeduction).toBe(0);
    expect(result[0].evaluationPending).toBe(true);
  });

  it('formula: kpiDeduction = kpiBonus * (100 - supervisorScore2%) / 100', async () => {
    const employee = makeEmployee('emp-1', 10000000, 3000000);
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([
      {
        employeeId: 'emp-1',
        status: 'COMPLETED',
        details: [
          { selfScore: 80, supervisorScore1: 70, supervisorScore2: 75, positionResponsibility: { weight: 100 } },
        ],
      },
    ]);

    const result = await service.getPayrollByMonthYear(6, 2026);

    // supervisorScore2: 75*100/100 = 75
    // kpiDeduction = 3000000 * (100 - 75) / 100 = 3000000 * 25 / 100 = 750000
    expect(result[0].kpiDeduction).toBe(750000);
  });
  it('khi kpiBonus = 0 → kpiDeduction = 0 bất kể score', async () => {
    const employee = makeEmployee('emp-1', 10000000, 0); // kpiSalary = 0
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([employee]);
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    (mockedPrisma.evaluation.findMany as jest.Mock).mockResolvedValue([
      {
        employeeId: 'emp-1',
        status: 'COMPLETED',
        details: [
          { selfScore: 80, supervisorScore1: 70, supervisorScore2: 50, positionResponsibility: { weight: 100 } },
        ],
      },
    ]);

    const result = await service.getPayrollByMonthYear(6, 2026);

    expect(result[0].kpiDeduction).toBe(0);
  });
});

// ─── PayrollService — createOrUpdatePayroll ignores client kpiDeduction ──────

describe('PayrollService — createOrUpdatePayroll kpiDeduction', () => {
  it('bỏ qua data.kpiDeduction từ client, dùng giá trị tính từ server', async () => {
    const employee = {
      id: 'emp-1',
      baseSalary: 10000000,
      position: { levels: [{ kpiSalary: 5000000 }] },
    };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
    (mockedPrisma.evaluation.findFirst as jest.Mock).mockResolvedValue({
      employeeId: 'emp-1',
      status: 'COMPLETED',
      details: [
        { selfScore: 80, supervisorScore1: 85, supervisorScore2: 90, positionResponsibility: { weight: 60 } },
        { selfScore: 70, supervisorScore1: 75, supervisorScore2: 80, positionResponsibility: { weight: 40 } },
      ],
    });
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    (mockedPrisma.payroll.upsert as jest.Mock).mockResolvedValue({ id: 'payroll-1' });

    await service.createOrUpdatePayroll('emp-1', 6, 2026, {
      baseSalary: 10000000,
      kpiBonus: 5000000,
      kpiDeduction: 9999999, // Client tries to set this — should be ignored
      workDays: 26,
      leaveDays: 0,
    });

    const upsertCall = (mockedPrisma.payroll.upsert as jest.Mock).mock.calls[0][0];
    // Server calculates: supervisorScore2 = 86, kpiDeduction = 5000000*(100-86)/100 = 700000
    expect(upsertCall.create.kpiDeduction).toBe(700000);
    expect(upsertCall.update.kpiDeduction).toBe(700000);
    // NOT the client value 9999999
    expect(upsertCall.create.kpiDeduction).not.toBe(9999999);
  });

  it('kpiDeduction = 0 khi không có evaluation COMPLETED', async () => {
    const employee = {
      id: 'emp-1',
      baseSalary: 10000000,
      position: { levels: [{ kpiSalary: 5000000 }] },
    };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
    (mockedPrisma.evaluation.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    (mockedPrisma.payroll.upsert as jest.Mock).mockResolvedValue({ id: 'payroll-1' });

    await service.createOrUpdatePayroll('emp-1', 6, 2026, {
      baseSalary: 10000000,
      kpiBonus: 5000000,
      kpiDeduction: 500000, // Client value — should be ignored
      workDays: 26,
      leaveDays: 0,
    });

    const upsertCall = (mockedPrisma.payroll.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertCall.create.kpiDeduction).toBe(0);
    expect(upsertCall.update.kpiDeduction).toBe(0);
  });
});
// ─── PayrollService — updatePayroll ignores client kpiDeduction ──────────────

describe('PayrollService — updatePayroll kpiDeduction', () => {
  it('bỏ qua data.kpiDeduction từ client, tính lại từ evaluation', async () => {
    const existingPayroll = {
      id: 'payroll-1',
      employeeId: 'emp-1',
      month: 6,
      year: 2026,
      baseSalary: 10000000,
      kpiBonus: 5000000,
      positionAllowance: 0,
      otherAllowances: 0,
      socialInsurance: 0,
      healthInsurance: 0,
      unemploymentInsurance: 0,
      personalIncomeTax: 0,
      kpiDeduction: 0,
      leaveDeduction: 0,
      totalDeductions: 0,
      netSalary: 15000000,
      workDays: 26,
      leaveDays: 0,
      overtimeHours: 0,
    };
    (mockedPrisma.payroll.findUnique as jest.Mock).mockResolvedValue(existingPayroll);
    (mockedPrisma.evaluation.findFirst as jest.Mock).mockResolvedValue({
      employeeId: 'emp-1',
      status: 'ACKNOWLEDGED',
      details: [
        { selfScore: 80, supervisorScore1: 85, supervisorScore2: 90, positionResponsibility: { weight: 60 } },
        { selfScore: 70, supervisorScore1: 75, supervisorScore2: 80, positionResponsibility: { weight: 40 } },
      ],
    });
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    (mockedPrisma.payroll.update as jest.Mock).mockResolvedValue({ id: 'payroll-1' });

    await service.updatePayroll('payroll-1', {
      kpiDeduction: 9999999, // Client value — should be ignored
    });

    const updateCall = (mockedPrisma.payroll.update as jest.Mock).mock.calls[0][0];
    // supervisorScore2 = 86, kpiDeduction = 5000000*(100-86)/100 = 700000
    expect(updateCall.data.kpiDeduction).toBe(700000);
    expect(updateCall.data.kpiDeduction).not.toBe(9999999);
  });

  it('khi kpiBonus = 0 → kpiDeduction = 0 trong updatePayroll', async () => {
    const existingPayroll = {
      id: 'payroll-1',
      employeeId: 'emp-1',
      month: 6,
      year: 2026,
      baseSalary: 10000000,
      kpiBonus: 0,
      positionAllowance: 0,
      otherAllowances: 0,
      socialInsurance: 0,
      healthInsurance: 0,
      unemploymentInsurance: 0,
      personalIncomeTax: 0,
      kpiDeduction: 0,
      leaveDeduction: 0,
      totalDeductions: 0,
      netSalary: 10000000,
      workDays: 26,
      leaveDays: 0,
      overtimeHours: 0,
    };
    (mockedPrisma.payroll.findUnique as jest.Mock).mockResolvedValue(existingPayroll);
    (mockedPrisma.evaluation.findFirst as jest.Mock).mockResolvedValue({
      employeeId: 'emp-1',
      status: 'COMPLETED',
      details: [
        { selfScore: 80, supervisorScore1: 70, supervisorScore2: 50, positionResponsibility: { weight: 100 } },
      ],
    });
    (mockedPrisma.payrollSettings.findFirst as jest.Mock).mockResolvedValue({
      standardWorkDays: 26,
      overtimeRate: 0,
    });
    (mockedPrisma.payroll.update as jest.Mock).mockResolvedValue({ id: 'payroll-1' });

    await service.updatePayroll('payroll-1', {});

    const updateCall = (mockedPrisma.payroll.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.kpiDeduction).toBe(0);
  });
});

