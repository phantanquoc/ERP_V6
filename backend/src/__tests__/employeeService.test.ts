jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import { EmployeeService } from '@services/employeeService';
import { NotFoundError } from '@utils/errors';

const service = new EmployeeService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── generateEmployeeCode ──────────────────────────────────────────

describe('generateEmployeeCode', () => {
  it('should return NV001 when no employees exist', async () => {
    (mockedPrisma.employee.findFirst as jest.Mock).mockResolvedValue(null);

    const code = await service.generateEmployeeCode();

    expect(code).toBe('NV001');
    expect(mockedPrisma.employee.findFirst).toHaveBeenCalledWith({
      where: { employeeCode: { startsWith: 'NV' } },
      orderBy: { employeeCode: 'desc' },
    });
  });

  it('should return NV006 when last employee is NV005', async () => {
    (mockedPrisma.employee.findFirst as jest.Mock).mockResolvedValue({
      employeeCode: 'NV005',
    });

    const code = await service.generateEmployeeCode();

    expect(code).toBe('NV006');
  });

  it('should return NV100 when last employee is NV099', async () => {
    (mockedPrisma.employee.findFirst as jest.Mock).mockResolvedValue({
      employeeCode: 'NV099',
    });

    const code = await service.generateEmployeeCode();

    expect(code).toBe('NV100');
  });

  it('should return NV002 when last employee is NV001', async () => {
    (mockedPrisma.employee.findFirst as jest.Mock).mockResolvedValue({
      employeeCode: 'NV001',
    });

    const code = await service.generateEmployeeCode();

    expect(code).toBe('NV002');
  });
});

// ─── getEmployeeById ───────────────────────────────────────────────

describe('getEmployeeById', () => {
  it('should return employee with all includes when found', async () => {
    const mockEmployee = {
      id: 'emp-1',
      employeeCode: 'NV001',
      user: { email: 'test@example.com', firstName: 'John', lastName: 'Doe', isActive: true, departmentId: 'd1' },
      position: { id: 'p1', name: 'Developer' },
      positionLevel: null,
      subDepartment: null,
      responsibilities: [],
      evaluations: [],
      payrolls: [],
      profile: null,
    };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);

    const result = await service.getEmployeeById('emp-1');

    expect(result).toEqual(mockEmployee);
    expect(mockedPrisma.employee.findUnique).toHaveBeenCalledWith({
      where: { id: 'emp-1' },
      include: {
        user: { select: { email: true, firstName: true, lastName: true, isActive: true, departmentId: true } },
        position: true,
        positionLevel: true,
        subDepartment: true,
        responsibilities: true,
        evaluations: true,
        payrolls: true,
        profile: true,
      },
    });
  });

  it('should throw NotFoundError when employee does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getEmployeeById('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(service.getEmployeeById('nonexistent')).rejects.toThrow('Employee not found');
  });
});

// ─── deleteEmployee ────────────────────────────────────────────────

describe('deleteEmployee', () => {
  it('should delete employee when it exists', async () => {
    const existing = { id: 'emp-1', employeeCode: 'NV001' };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(existing);
    (mockedPrisma.employee.delete as jest.Mock).mockResolvedValue(existing);

    await service.deleteEmployee('emp-1');

    expect(mockedPrisma.employee.delete).toHaveBeenCalledWith({ where: { id: 'emp-1' } });
  });

  it('should throw NotFoundError when deleting non-existent employee', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.deleteEmployee('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(service.deleteEmployee('nonexistent')).rejects.toThrow('Employee not found');
  });
});

// ─── createEmployee ────────────────────────────────────────────────

describe('createEmployee', () => {
  it('should create an employee record with provided data', async () => {
    const input = {
      employeeCode: 'NV001',
      userId: 'user-1',
      gender: 'MALE',
      dateOfBirth: '1990-01-15',
      phoneNumber: '0123456789',
      address: '123 Main St',
      positionId: 'pos-1',
      positionLevelId: 'pl-1',
      subDepartmentId: 'sd-1',
      status: 'ACTIVE',
      hireDate: '2024-01-01',
      contractType: 'PERMANENT',
      baseSalary: '5000000',
      kpiLevel: '3',
    };

    const mockCreated = {
      id: 'emp-new',
      ...input,
      user: { email: 'test@example.com', firstName: 'John', lastName: 'Doe', departmentId: 'd1' },
      position: { id: 'pos-1', name: 'Developer' },
      positionLevel: null,
      subDepartment: null,
    };
    (mockedPrisma.employee.create as jest.Mock).mockResolvedValue(mockCreated);

    const result = await service.createEmployee(input);

    expect(result).toEqual(mockCreated);
    expect(mockedPrisma.employee.create).toHaveBeenCalledTimes(1);

    const createCall = (mockedPrisma.employee.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.employeeCode).toBe('NV001');
    expect(createCall.data.userId).toBe('user-1');
    expect(createCall.data.gender).toBe('MALE');
    expect(createCall.data.positionId).toBe('pos-1');
    expect(createCall.data.status).toBe('ACTIVE');
    expect(createCall.data.contractType).toBe('PERMANENT');
    expect(createCall.data.baseSalary).toBe(5000000);
    expect(createCall.data.kpiLevel).toBe(3);
  });

  it('should use default status ACTIVE when not provided', async () => {
    const input = {
      employeeCode: 'NV002',
      userId: 'user-2',
      hireDate: '2024-06-01',
    };
    const mockCreated = { id: 'emp-2', ...input };
    (mockedPrisma.employee.create as jest.Mock).mockResolvedValue(mockCreated);

    await service.createEmployee(input);

    const createCall = (mockedPrisma.employee.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.status).toBe('ACTIVE');
    expect(createCall.data.contractType).toBe('PERMANENT');
  });
});

