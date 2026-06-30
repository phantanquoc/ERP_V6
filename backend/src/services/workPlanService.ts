import prisma from '@config/database';
import logger from '@config/logger';
import { WorkPlanStatus, TaskPriority } from '@prisma/client';
import { NotificationEvent } from '@types';
import notificationService from './notificationService';
import { NotFoundError, ValidationError } from '@utils/errors';

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
      throw new ValidationError('Người tạo kế hoạch không tồn tại');
    }

    // Validate date range
    if (data.ngayBatDau && data.ngayKetThuc) {
      if (new Date(data.ngayKetThuc) < new Date(data.ngayBatDau)) {
        throw new ValidationError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      }
    }

    // Validate người thực hiện exists (data.nguoiThucHien contains employee IDs)
    logger.debug('Received nguoiThucHien IDs:', data.nguoiThucHien);

    const nguoiThucHienEmployees = await prisma.employee.findMany({
      where: { id: { in: data.nguoiThucHien } },
      select: { id: true, userId: true },
    });

    logger.debug('Found employees:', nguoiThucHienEmployees);

    if (nguoiThucHienEmployees.length !== data.nguoiThucHien.length) {
      logger.debug(`Mismatch: Expected ${data.nguoiThucHien.length}, found ${nguoiThucHienEmployees.length}`);
      throw new ValidationError('Một hoặc nhiều người thực hiện không tồn tại');
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

    // Notify supervisors about new work plan
    try {
      const creator = await prisma.user.findUnique({
        where: { id: nguoiTaoId },
        select: { firstName: true, lastName: true, supervisor1Id: true, supervisor2Id: true },
      });

      if (creator) {
        const supervisorIds = [creator.supervisor1Id, creator.supervisor2Id].filter(Boolean) as string[];
        if (supervisorIds.length > 0) {
          // Resolve supervisor userIds → employeeIds
          const supervisorEmployees = await prisma.employee.findMany({
            where: { userId: { in: supervisorIds } },
            select: { id: true },
          });
          await notificationService.notify(NotificationEvent.WORK_PLAN_ASSIGNED, {
            actorUserId: nguoiTaoId,
            targetEmployeeIds: supervisorEmployees.map(e => e.id),
            metadata: { entityId: workPlan.id, tieuDe: data.tieuDe },
          });
        }
      }
    } catch (error) {
      logger.error('Error sending work plan notifications:', error);
    }

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
      throw new NotFoundError('Không tìm thấy kế hoạch công việc');
    }

    return this.populateWorkPlanWithUsers(workPlan);
  }

  async updateWorkPlan(id: string, data: any, userId: string, userRole: string, files?: string[]): Promise<any> {
    const existing = await prisma.workPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Không tìm thấy kế hoạch');
    }

    const isAdmin = userRole === 'ADMIN';
    const isCreator = existing.nguoiTaoId === userId;

    // nguoiThucHienIds stores Employee IDs, but userId is a User ID — resolve first
    const userEmployee = await prisma.employee.findFirst({
      where: { userId },
      select: { id: true },
    });
    const isAssignee = userEmployee
      ? existing.nguoiThucHienIds.includes(userEmployee.id)
      : false;

    // Determine what is being changed
    const contentFields = ['tieuDe', 'noiDung', 'nguoiThucHien', 'ngayBatDau', 'ngayKetThuc', 'mucDoUuTien', 'ghiChu', 'keepFiles'];
    const hasStatusChange = data.trangThai !== undefined && data.trangThai !== existing.trangThai;
    const hasContentChange = contentFields.some(f => data[f] !== undefined);

    if (!isAdmin && !isCreator && !isAssignee) {
      throw new ValidationError('Không có quyền sửa kế hoạch này');
    }

    if (hasStatusChange) {
      if (!isAdmin && !isAssignee) {
        // Creator trying to change status → error
        throw new ValidationError('Người tạo không được đổi trạng thái — chỉ người được giao hoặc admin');
      }
    }

    if (hasContentChange) {
      if (!isAdmin && !isCreator) {
        // Assignee (only) trying to change content → error
        throw new ValidationError('Người được giao chỉ được đổi trạng thái');
      }
    }

    const updateData: any = {};

    if (isAdmin || isCreator) {
      if (data.tieuDe !== undefined) updateData.tieuDe = data.tieuDe;
      if (data.noiDung !== undefined) updateData.noiDung = data.noiDung;
      if (data.mucDoUuTien !== undefined) updateData.mucDoUuTien = data.mucDoUuTien;
      if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu;

      if (data.ngayBatDau !== undefined) updateData.ngayBatDau = new Date(data.ngayBatDau);
      if (data.ngayKetThuc !== undefined) updateData.ngayKetThuc = new Date(data.ngayKetThuc);

      // Validate date range using final values
      const finalStart = updateData.ngayBatDau ?? existing.ngayBatDau;
      const finalEnd = updateData.ngayKetThuc ?? existing.ngayKetThuc;
      if (new Date(finalEnd) < new Date(finalStart)) {
        throw new ValidationError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      }

      if (data.nguoiThucHien) {
        const nguoiThucHienEmployees = await prisma.employee.findMany({
          where: { id: { in: data.nguoiThucHien } },
          select: { id: true },
        });
        updateData.nguoiThucHienIds = nguoiThucHienEmployees.map((emp: { id: string }) => emp.id);
      }

      // File handling: keepFiles removes old ones, new uploads appended
      const newFilePaths = files || [];
      if (data.keepFiles !== undefined) {
        const keepFiles = Array.isArray(data.keepFiles) ? data.keepFiles : [];
        updateData.files = [...keepFiles, ...newFilePaths];
      } else {
        // backward compat: append-only
        if (newFilePaths.length > 0) {
          updateData.files = [...existing.files, ...newFilePaths];
        }
      }
    }

    // Status update (admin or assignee)
    if (data.trangThai !== undefined && (isAdmin || isAssignee)) {
      updateData.trangThai = data.trangThai;
    }

    const updatedWorkPlan = await prisma.workPlan.update({
      where: { id },
      data: updateData,
    });

    return updatedWorkPlan;
  }

  async deleteWorkPlan(id: string, userId: string, userRole: string): Promise<void> {
    const existing = await prisma.workPlan.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Không tìm thấy kế hoạch');
    }

    const isAdmin = userRole === 'ADMIN';
    const isCreator = existing.nguoiTaoId === userId;

    if (!isAdmin) {
      if (!isCreator) {
        throw new ValidationError('Không có quyền xóa kế hoạch này');
      }
      if (existing.trangThai !== WorkPlanStatus.CHUA_BAT_DAU) {
        throw new ValidationError('Chỉ xóa được kế hoạch chưa bắt đầu');
      }
    }

    await prisma.workPlan.delete({
      where: { id },
    });
  }
}

export default new WorkPlanService();

