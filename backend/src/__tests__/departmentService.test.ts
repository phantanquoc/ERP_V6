jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    department: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import { DepartmentService } from '@services/departmentService';
import { NotFoundError } from '@utils/errors';

const service = new DepartmentService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getAllDepartments ──────────────────────────────────────────────

describe('getAllDepartments', () => {
  it('should return all departments with subDepartments', async () => {
    const mockDepartments = [
      { id: '1', code: 'DEP01', name: 'Engineering', description: 'Eng dept', subDepartments: [{ id: 's1', name: 'Frontend' }] },
      { id: '2', code: 'DEP02', name: 'HR', description: 'HR dept', subDepartments: [] },
    ];
    (mockedPrisma.department.findMany as jest.Mock).mockResolvedValue(mockDepartments);

    const result = await service.getAllDepartments();

    expect(result).toEqual(mockDepartments);
    expect(mockedPrisma.department.findMany).toHaveBeenCalledWith({
      include: { subDepartments: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('should return empty array when no departments exist', async () => {
    (mockedPrisma.department.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getAllDepartments();

    expect(result).toEqual([]);
  });
});

// ─── getDepartmentById ─────────────────────────────────────────────

describe('getDepartmentById', () => {
  it('should return department when found', async () => {
    const mockDept = { id: '1', code: 'DEP01', name: 'Engineering', subDepartments: [] };
    (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(mockDept);

    const result = await service.getDepartmentById('1');

    expect(result).toEqual(mockDept);
    expect(mockedPrisma.department.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
      include: { subDepartments: true },
    });
  });

  it('should throw NotFoundError when department does not exist', async () => {
    (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getDepartmentById('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(service.getDepartmentById('nonexistent')).rejects.toThrow('Department not found');
  });
});

// ─── createDepartment ──────────────────────────────────────────────

describe('createDepartment', () => {
  it('should create a department with code, name, and description', async () => {
    const input = { code: 'DEP03', name: 'Finance', description: 'Finance dept' };
    const mockCreated = { id: '3', ...input, subDepartments: [] };
    (mockedPrisma.department.create as jest.Mock).mockResolvedValue(mockCreated);

    const result = await service.createDepartment(input);

    expect(result).toEqual(mockCreated);
    expect(mockedPrisma.department.create).toHaveBeenCalledWith({
      data: { code: 'DEP03', name: 'Finance', description: 'Finance dept' },
      include: { subDepartments: true },
    });
  });

  it('should handle missing optional description', async () => {
    const input = { code: 'DEP04', name: 'Marketing', description: undefined };
    const mockCreated = { id: '4', ...input, subDepartments: [] };
    (mockedPrisma.department.create as jest.Mock).mockResolvedValue(mockCreated);

    const result = await service.createDepartment(input);

    expect(result).toEqual(mockCreated);
  });
});

// ─── updateDepartment ──────────────────────────────────────────────

describe('updateDepartment', () => {
  it('should update department when it exists', async () => {
    const existing = { id: '1', code: 'DEP01', name: 'Engineering' };
    const updated = { id: '1', code: 'DEP01', name: 'Eng Updated', subDepartments: [] };
    (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(existing);
    (mockedPrisma.department.update as jest.Mock).mockResolvedValue(updated);

    const result = await service.updateDepartment('1', { name: 'Eng Updated' });

    expect(result).toEqual(updated);
    expect(mockedPrisma.department.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { name: 'Eng Updated' },
      include: { subDepartments: true },
    });
  });

  it('should throw NotFoundError when updating non-existent department', async () => {
    (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.updateDepartment('nonexistent', { name: 'X' })).rejects.toThrow(NotFoundError);
  });
});

// ─── deleteDepartment ──────────────────────────────────────────────

describe('deleteDepartment', () => {
  it('should delete department when it exists', async () => {
    const existing = { id: '1', code: 'DEP01', name: 'Engineering' };
    (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(existing);
    (mockedPrisma.department.delete as jest.Mock).mockResolvedValue(existing);

    await service.deleteDepartment('1');

    expect(mockedPrisma.department.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should throw NotFoundError when deleting non-existent department', async () => {
    (mockedPrisma.department.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.deleteDepartment('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(service.deleteDepartment('nonexistent')).rejects.toThrow('Department not found');
  });
});

