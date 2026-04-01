// Mock env TRƯỚC mọi import
jest.mock('@config/env', () => ({
  isProduction: false,
  isDevelopment: true,
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-minimum-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    PORT: 5001,
    CORS_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@services/workShiftService', () => ({
  __esModule: true,
  default: { determineShift: jest.fn().mockResolvedValue('Ca sáng') },
}));

// Mock ExcelJS — không tạo file thật trong test
jest.mock('exceljs', () => ({
  Workbook: jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      getRow: jest.fn().mockReturnValue({ font: {}, fill: {}, border: {}, alignment: {}, height: 0, eachCell: jest.fn() }),
      addRow: jest.fn().mockReturnValue({ font: {}, fill: {}, border: {}, alignment: {}, height: 0, eachCell: jest.fn(), getCell: jest.fn() }),
      getCell: jest.fn().mockReturnValue({ value: '', font: {}, fill: {}, border: {}, alignment: {} }),
    }),
    xlsx: { writeBuffer: jest.fn().mockResolvedValue(Buffer.from('test')) },
  })),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    attendance: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import { AttendanceService } from '@services/attendanceService';
import { AttendanceStatus } from '@prisma/client';

const service = new AttendanceService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers — mock data
   ───────────────────────────────────────────────────────────────────────────── */

const makeEmployee = (overrides = {}) => ({
  id: 'emp-1',
  employeeCode: 'NV001',
  user: { firstName: 'An', lastName: 'Binh' },
  position: { name: 'Nhân viên' },
  ...overrides,
});

const makeAttendance = (overrides = {}) => ({
  id: 'att-1',
  employeeId: 'emp-1',
  employee: makeEmployee(),
  attendanceDate: new Date('2026-04-01T00:00:00.000Z'),
  checkInTime: new Date('2026-04-01T08:00:00.000Z'),
  checkOutTime: new Date('2026-04-01T17:00:00.000Z'),
  workHours: 9,
  status: AttendanceStatus.PRESENT,
  notes: null,
  isOvertime: false,
  ...overrides,
});

/* ─────────────────────────────────────────────────────────────────────────────
   getAttendanceByDateRange
   ───────────────────────────────────────────────────────────────────────────── */

describe('AttendanceService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAttendanceByDateRange', () => {
    it('should return empty array when no attendance records exist', async () => {
      (mockedPrisma.attendance.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getAttendanceByDateRange(
        new Date('2026-04-01'),
        new Date('2026-04-07')
      );

      expect(result).toHaveLength(0);
    });

    it('should group multiple records for same employee and date into one row', async () => {
      // 2 records cùng nhân viên, cùng ngày → phải gộp thành 1 row
      const record1 = makeAttendance({
        id: 'att-1',
        checkInTime: new Date('2026-04-01T08:00:00Z'),
        checkOutTime: new Date('2026-04-01T12:00:00Z'),
        workHours: 4,
        status: AttendanceStatus.PRESENT,
      });
      const record2 = makeAttendance({
        id: 'att-2',
        checkInTime: new Date('2026-04-01T13:00:00Z'),
        checkOutTime: new Date('2026-04-01T17:00:00Z'),
        workHours: 4,
        status: AttendanceStatus.OVERTIME,
      });
      (mockedPrisma.attendance.findMany as jest.Mock).mockResolvedValue([record1, record2]);

      const result = await service.getAttendanceByDateRange(
        new Date('2026-04-01'),
        new Date('2026-04-01')
      );

      expect(result).toHaveLength(1);
      expect(result[0].ids).toHaveLength(2);
      expect(result[0].workHours).toBe(8); // 4 + 4
    });

    it('should pick highest priority status when grouping records', async () => {
      // ABSENT (priority 5) > PRESENT (priority 1)
      const record1 = makeAttendance({ id: 'att-1', status: AttendanceStatus.PRESENT, workHours: 8 });
      const record2 = makeAttendance({ id: 'att-2', status: AttendanceStatus.ABSENT, workHours: 0 });
      (mockedPrisma.attendance.findMany as jest.Mock).mockResolvedValue([record1, record2]);

      const result = await service.getAttendanceByDateRange(
        new Date('2026-04-01'),
        new Date('2026-04-01')
      );

      expect(result[0].status).toBe(AttendanceStatus.ABSENT);
    });

    it('should return separate rows for different employees on the same date', async () => {
      const emp1Record = makeAttendance({ id: 'att-1', employeeId: 'emp-1' });
      const emp2Record = makeAttendance({
        id: 'att-2',
        employeeId: 'emp-2',
        employee: makeEmployee({ id: 'emp-2', employeeCode: 'NV002' }),
      });
      (mockedPrisma.attendance.findMany as jest.Mock).mockResolvedValue([emp1Record, emp2Record]);

      const result = await service.getAttendanceByDateRange(
        new Date('2026-04-01'),
        new Date('2026-04-01')
      );

      expect(result).toHaveLength(2);
    });

    it('should pass correct date range filter to prisma', async () => {
      (mockedPrisma.attendance.findMany as jest.Mock).mockResolvedValue([]);
      const start = new Date('2026-04-01');
      const end = new Date('2026-04-30');

      await service.getAttendanceByDateRange(start, end);

      expect(mockedPrisma.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            attendanceDate: { gte: start, lte: end },
          },
        })
      );
    });

    it('should include stt (serial number) starting from 1', async () => {
      const records = [
        makeAttendance({ id: 'att-1', employeeId: 'emp-1' }),
        makeAttendance({ id: 'att-2', employeeId: 'emp-2', employee: makeEmployee({ id: 'emp-2', employeeCode: 'NV002' }) }),
      ];
      (mockedPrisma.attendance.findMany as jest.Mock).mockResolvedValue(records);

      const result = await service.getAttendanceByDateRange(
        new Date('2026-04-01'),
        new Date('2026-04-01')
      );

      expect(result[0].stt).toBe(1);
      expect(result[1].stt).toBe(2);
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
     getEmployeeAttendance
     ───────────────────────────────────────────────────────────────────────── */

  describe('getEmployeeAttendance', () => {
    it('should return attendance records for a specific employee', async () => {
      const records = [makeAttendance(), makeAttendance({ id: 'att-2', attendanceDate: new Date('2026-04-02T00:00:00Z') })];
      (mockedPrisma.attendance.findMany as jest.Mock).mockResolvedValue(records);

      const result = await service.getEmployeeAttendance(
        'emp-1',
        new Date('2026-04-01'),
        new Date('2026-04-07')
      );

      expect(result).toHaveLength(2);
      expect(mockedPrisma.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ employeeId: 'emp-1' }),
        })
      );
    });

    it('should return empty array when employee has no attendance in range', async () => {
      (mockedPrisma.attendance.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getEmployeeAttendance(
        'emp-empty',
        new Date('2026-04-01'),
        new Date('2026-04-07')
      );

      expect(result).toHaveLength(0);
    });
  });
});
