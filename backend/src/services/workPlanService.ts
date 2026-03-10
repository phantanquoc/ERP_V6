import prisma from '@config/database';
import logger from '@config/logger';
import { WorkPlanStatus, TaskPriority } from '@prisma/client';

class WorkPlanService {
  // Helper function to populate work plan with user information
  private async populateWorkPlanWithUsers(workPlan: any): Promise<any> {
    try {
      // Get người tạo info
      const nguoiTao = await prisma.user.findUnique({
        where: { id: workPlan.nguoiTaoId },
        include: { employees: true },
      });

      // Get người thực hiện info (nguoiThucHienIds contains employee IDs)
      const nguoiThucHienEmployees = await prisma.employee.findMany({
        where: { id: { in: workPlan.nguoiThucHienIds } },
        include: { user: true },
      });

      return {
        ...workPlan,
        nguoiTao: nguoiTao ? {
          id: nguoiTao.id,
          firstName: nguoiTao.firstName,
          lastName: nguoiTao.lastName,
          employeeCode: nguoiTao.employees?.employeeCode || '',
          department: nguoiTao.departmentId || '',
        } : null,
        nguoiThucHien: nguoiThucHienEmployees.map(emp => ({
          id: emp.id,
          userId: emp.userId,
          firstName: emp.user?.firstName || '',
          lastName: emp.user?.lastName || '',
          employeeCode: emp.employeeCode || '',
        })),
      };
    } catch (error) {
      logger.error('❌ Error populating work plan with users:', error);
      return {
        ...workPlan,
        nguoiTao: null,
        nguoiThucHien: [],
      };
    }
  }

  async createWorkPlan(data: any, nguoiTaoId: string, files?: string[]): Promise<any> {
    // Validate người tạo exists
    const nguoiTao = await prisma.user.findUnique({
      where: { id: nguoiTaoId },
    });
    if (!nguoiTao) {
      throw new Error('Người tạo kế hoạch không tồn tại');
    }

    // Validate người thực hiện exists (data.nguoiThucHien contains employee IDs)
    logger.debug('🔍 Received nguoiThucHien IDs:', data.nguoiThucHien);

    const nguoiThucHienEmployees = await prisma.employee.findMany({
      where: { id: { in: data.nguoiThucHien } },
      select: { id: true, userId: true },
    });

    logger.debug('✅ Found employees:', nguoiThucHienEmployees);

    if (nguoiThucHienEmployees.length !== data.nguoiThucHien.length) {
      logger.debug(`❌ Mismatch: Expected ${data.nguoiThucHien.length}, found ${nguoiThucHienEmployees.length}`);
      throw new Error('Một hoặc nhiều người thực hiện không tồn tại');
    }

    // Store employee IDs directly (as per schema: nguoiThucHienIds String[] // Array of employee IDs)
    const nguoiThucHienIds = nguoiThucHienEmployees.map(emp => emp.id);

    const workPlan = await prisma.workPlan.create({
      data: {
        tieuDe: data.tieuDe,
        noiDung: data.noiDung,
        nguoiTaoId,
        nguoiThucHienIds,
        ngayBatDau: new Date(data.ngayBatDau),
        ngayKetThuc: new Date(data.ngayKetThuc),
        mucDoUuTien: data.mucDoUuTien as TaskPriority,
        trangThai: WorkPlanStatus.CHUA_BAT_DAU,
        ghiChu: data.ghiChu,
        files: files || [],
      },
    });

    return workPlan;
  }

  async getAllWorkPlans(page: number = 1, limit: number = 10, search?: string): Promise<any> {
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { tieuDe: { contains: search, mode: 'insensitive' } },
        { noiDung: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, workPlans] = await Promise.all([
      prisma.workPlan.count({ where }),
      prisma.workPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Populate work plans with user information
    const populatedWorkPlans = await Promise.all(
      workPlans.map(wp => this.populateWorkPlanWithUsers(wp))
    );

    return {
      data: populatedWorkPlans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyWorkPlans(userId: string, employeeId: string, page: number = 1, limit: number = 10, search?: string): Promise<any> {
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { nguoiTaoId: userId },
        { nguoiThucHienIds: { hasSome: [employeeId] } },
      ],
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { tieuDe: { contains: search, mode: 'insensitive' } },
            { noiDung: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [total, workPlans] = await Promise.all([
      prisma.workPlan.count({ where }),
      prisma.workPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const populatedWorkPlans = await Promise.all(
      workPlans.map(wp => this.populateWorkPlanWithUsers(wp))
    );

    return {
      data: populatedWorkPlans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  async getWorkPlanById(id: string): Promise<any> {
    const workPlan = await prisma.workPlan.findUnique({
      where: { id },
    });

    if (!workPlan) {
      throw new Error('Không tìm thấy kế hoạch công việc');
    }

    return this.populateWorkPlanWithUsers(workPlan);
  }

  async updateWorkPlan(id: string, data: any): Promise<any> {
    const workPlan = await prisma.workPlan.findUnique({
      where: { id },
    });

    if (!workPlan) {
      throw new Error('Không tìm thấy kế hoạch công việc');
    }

    const updateData: any = {};
    if (data.tieuDe !== undefined) updateData.tieuDe = data.tieuDe;
    if (data.noiDung !== undefined) updateData.noiDung = data.noiDung;
    if (data.ngayBatDau !== undefined) updateData.ngayBatDau = new Date(data.ngayBatDau);
    if (data.ngayKetThuc !== undefined) updateData.ngayKetThuc = new Date(data.ngayKetThuc);
    if (data.mucDoUuTien !== undefined) updateData.mucDoUuTien = data.mucDoUuTien;
    if (data.trangThai !== undefined) updateData.trangThai = data.trangThai;
    if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu;

    if (data.nguoiThucHien) {
      const nguoiThucHienEmployees = await prisma.employee.findMany({
        where: { id: { in: data.nguoiThucHien } },
        select: { id: true },
      });
      updateData.nguoiThucHienIds = nguoiThucHienEmployees.map(emp => emp.id);
    }

    if (data.files && data.files.length > 0) {
      updateData.files = [...workPlan.files, ...data.files];
    }

    const updatedWorkPlan = await prisma.workPlan.update({
      where: { id },
      data: updateData,
    });

    return updatedWorkPlan;
  }

  async deleteWorkPlan(id: string): Promise<void> {
    const workPlan = await prisma.workPlan.findUnique({
      where: { id },
    });

    if (!workPlan) {
      throw new Error('Không tìm thấy kế hoạch công việc');
    }

    await prisma.workPlan.delete({
      where: { id },
    });
  }
}

export default new WorkPlanService();

