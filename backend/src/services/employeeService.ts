import prisma from '@config/database';
import { NotFoundError } from '@utils/errors';
import { getPaginationParams, calculateTotalPages } from '@utils/helpers';
import { nextEmployeeCode } from '@utils/codeGenerator';
import type { PaginatedResponse } from '@types';
import ExcelJS from 'exceljs';

export class EmployeeService {
  async generateEmployeeCode(): Promise<string> {
    const last = await prisma.employee.findFirst({
      where: { employeeCode: { startsWith: 'NV' } },
      orderBy: { employeeCode: 'desc' },
      select: { employeeCode: true },
    });
    return nextEmployeeCode(last?.employeeCode ?? null);
  }
  async getAllEmployees(page: number = 1, limit: number = 10, departmentId?: string, search?: string): Promise<PaginatedResponse<any>> {
    const { skip } = getPaginationParams(page, limit);

    // Build where conditions
    const conditions: any[] = [];

    // Filter theo department
    if (departmentId) {
      conditions.push({
        OR: [
          { user: { departmentId } },
          { subDepartment: { departmentId } },
        ],
      });
    }

    // Filter theo search (tên, mã NV, email, chức vụ, tên bộ phận)
    if (search) {
      // Tìm department IDs matching search (vì User không có relation trực tiếp đến Department)
      const matchingDepts = await prisma.department.findMany({
        where: { name: { contains: search, mode: 'insensitive' } },
        select: { id: true },
      });
      const matchingSubDepts = await prisma.subDepartment.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { department: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
        select: { id: true, departmentId: true },
      });
      const deptIds = matchingDepts.map(d => d.id);
      const subDeptIds = matchingSubDepts.map(sd => sd.id);
      // Merge departmentIds from subDepts
      matchingSubDepts.forEach(sd => {
        if (!deptIds.includes(sd.departmentId)) deptIds.push(sd.departmentId);
      });

      const searchConditions: any[] = [
        { employeeCode: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { position: { name: { contains: search, mode: 'insensitive' } } },
      ];

      // Split search into words for Vietnamese name matching
      // e.g. "Nông Thị L" → firstName="Nông", lastName="Thị L" — each word must match one of them
      const words = search.trim().split(/\s+/);
      if (words.length > 1) {
        searchConditions.push({
          AND: words.map(word => ({
            OR: [
              { user: { firstName: { contains: word, mode: 'insensitive' } } },
              { user: { lastName: { contains: word, mode: 'insensitive' } } },
            ],
          })),
        });
      } else {
        searchConditions.push({ user: { firstName: { contains: search, mode: 'insensitive' } } });
        searchConditions.push({ user: { lastName: { contains: search, mode: 'insensitive' } } });
      }

      // Add department-based search if matching departments found
      if (deptIds.length > 0) {
        searchConditions.push({ user: { departmentId: { in: deptIds } } });
      }
      if (subDeptIds.length > 0) {
        searchConditions.push({ subDepartmentId: { in: subDeptIds } });
      }

      conditions.push({ OR: searchConditions });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

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
      const exportSearchConditions: any[] = [
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
      const exportWords = filters.search.trim().split(/\s+/);
      if (exportWords.length > 1) {
        exportSearchConditions.push({
          AND: exportWords.map((word: string) => ({
            OR: [
              { user: { firstName: { contains: word, mode: 'insensitive' } } },
              { user: { lastName: { contains: word, mode: 'insensitive' } } },
            ],
          })),
        });
      } else {
        exportSearchConditions.push({ user: { firstName: { contains: filters.search, mode: 'insensitive' } } });
        exportSearchConditions.push({ user: { lastName: { contains: filters.search, mode: 'insensitive' } } });
      }
      where.OR = exportSearchConditions;
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

