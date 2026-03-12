import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

export class EmployeeService {
  /**
   * Generate employee code
   * Format: NV{SEQUENCE}
   * Example: NV001, NV002, NV003
   */
  async generateEmployeeCode(): Promise<string> {
    // Get the highest sequence number across all employees
    const lastEmployee = await prisma.employee.findFirst({
      where: {
        employeeCode: {
          startsWith: 'NV',
        },
      },
      orderBy: {
        employeeCode: 'desc',
      },
    });

    let sequence = 1;
    if (lastEmployee) {
      // Extract sequence number from last employee code
      const lastCode = lastEmployee.employeeCode;
      const sequenceStr = lastCode.replace('NV', '');
      if (sequenceStr) {
        sequence = parseInt(sequenceStr, 10) + 1;
      }
    }

    // Format: NV001, NV002, etc.
    return `NV${String(sequence).padStart(3, '0')}`;
  }
  async getAllEmployees(page: number = 1, limit: number = 10, departmentId?: string): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    // Nếu có departmentId thì filter theo department của user
    const where = departmentId
      ? {
          OR: [
            { user: { departmentId } },
            { subDepartment: { departmentId } },
          ],
        }
      : {};

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              departmentId: true,
              subDepartmentId: true,
            },
          },
          position: true,
          positionLevel: true,
          subDepartment: {
            include: {
              department: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employee.count({ where }),
    ]);

    // Transform to include department name
    const transformedEmployees = await Promise.all(
      employees.map(async (emp) => {
        let departmentName = 'Chưa xác định';
        let subDepartmentName = 'Chưa xác định';

        // Try to get department from subDepartment first
        if (emp.subDepartment?.department?.name) {
          departmentName = emp.subDepartment.department.name;
          subDepartmentName = emp.subDepartment.name;
        }
        // If no subDepartment, try to get from user's departmentId
        else if (emp.user.departmentId) {
          const dept = await prisma.department.findUnique({
            where: { id: emp.user.departmentId },
            select: { name: true },
          });
          if (dept) {
            departmentName = dept.name;
          }
        }

        return {
          ...emp,
          departmentName,
          subDepartmentName,
        };
      })
    );

    return {
      data: transformedEmployees,
      total,
      page,
      limit,
      totalPages: calculateTotalPages(total, limit),
    };
  }

  async getEmployeeById(id: string): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            departmentId: true,
          },
        },
        position: true,
        positionLevel: true,
        subDepartment: true,
        responsibilities: true,
        evaluations: true,
        payrolls: true,
        profile: true,
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    return employee;
  }

  async getEmployeeByCode(employeeCode: string): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { employeeCode },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            departmentId: true,
          },
        },
        position: true,
        positionLevel: true,
        subDepartment: true,
      },
    });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    return employee;
  }

  async createEmployee(data: any): Promise<any> {
    const employee = await prisma.employee.create({
      data: {
        employeeCode: data.employeeCode,
        userId: data.userId,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        phoneNumber: data.phoneNumber,
        address: data.address,
        positionId: data.positionId || null,
        positionLevelId: data.positionLevelId,
        subDepartmentId: data.subDepartmentId,
        status: data.status || 'ACTIVE',
        hireDate: new Date(data.hireDate),
        contractType: data.contractType || 'PERMANENT',
        educationLevel: data.educationLevel,
        specialization: data.specialization,
        specialSkills: data.specialSkills,
        baseSalary: data.baseSalary ? parseFloat(data.baseSalary) : 0,
        kpiLevel: data.kpiLevel ? parseFloat(data.kpiLevel) : 0,
        responsibilityCode: data.responsibilityCode,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        height: data.height ? parseFloat(data.height) : undefined,
        shirtSize: data.shirtSize,
        pantSize: data.pantSize,
        shoeSize: data.shoeSize,
        bankAccount: data.bankAccount,
        lockerNumber: data.lockerNumber,
        notes: data.notes,
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            departmentId: true,
          },
        },
        position: true,
        positionLevel: true,
        subDepartment: true,
      },
    });

    return employee;
  }

  async updateEmployee(id: string, data: any): Promise<any> {
    const employee = await prisma.employee.findUnique({ where: { id } });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Allow positionId to be explicitly set to null/empty (optional field)
    if (data.positionId === '') {
      data.positionId = null;
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.gender && { gender: data.gender }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
        ...(data.phoneNumber && { phoneNumber: data.phoneNumber }),
        ...(data.address && { address: data.address }),
        ...(data.positionId && { positionId: data.positionId }),
        ...(data.positionLevelId && { positionLevelId: data.positionLevelId }),
        ...(data.subDepartmentId && { subDepartmentId: data.subDepartmentId }),
        ...(data.status && { status: data.status }),
        ...(data.contractType && { contractType: data.contractType }),
        ...(data.educationLevel && { educationLevel: data.educationLevel }),
        ...(data.specialization && { specialization: data.specialization }),
        ...(data.specialSkills && { specialSkills: data.specialSkills }),
        ...(data.baseSalary !== undefined && { baseSalary: parseFloat(data.baseSalary) }),
        ...(data.kpiLevel !== undefined && { kpiLevel: parseFloat(data.kpiLevel) }),
        ...(data.responsibilityCode && { responsibilityCode: data.responsibilityCode }),
        ...(data.weight && { weight: parseFloat(data.weight) }),
        ...(data.height && { height: parseFloat(data.height) }),
        ...(data.shirtSize && { shirtSize: data.shirtSize }),
        ...(data.pantSize && { pantSize: data.pantSize }),
        ...(data.shoeSize && { shoeSize: data.shoeSize }),
        ...(data.bankAccount && { bankAccount: data.bankAccount }),
        ...(data.lockerNumber && { lockerNumber: data.lockerNumber }),
        ...(data.notes && { notes: data.notes }),
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            departmentId: true,
          },
        },
        position: true,
        positionLevel: true,
        subDepartment: true,
      },
    });

    return updated;
  }

  async deleteEmployee(id: string): Promise<void> {
    const employee = await prisma.employee.findUnique({ where: { id } });

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    await prisma.employee.delete({ where: { id } });
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { lastName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const data = await prisma.employee.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        position: true,
        subDepartment: {
          include: {
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách nhân viên');

    worksheet.columns = [
      { header: 'Mã NV', key: 'employeeCode', width: 15 },
      { header: 'Họ tên', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Vị trí', key: 'position', width: 20 },
      { header: 'Bộ phận', key: 'department', width: 25 },
      { header: 'Ngày vào làm', key: 'hireDate', width: 18 },
      { header: 'Trạng thái', key: 'status', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((emp) => {
      const fullName = `${emp.user.lastName} ${emp.user.firstName}`;
      const departmentName = emp.subDepartment?.department?.name || '';

      worksheet.addRow({
        employeeCode: emp.employeeCode,
        fullName,
        email: emp.user.email,
        position: emp.position?.name || '',
        department: departmentName,
        hireDate: emp.hireDate ? new Date(emp.hireDate).toLocaleDateString('vi-VN') : '',
        status: emp.status === 'ACTIVE' ? 'Đang làm việc' : 'Nghỉ việc',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new EmployeeService();

