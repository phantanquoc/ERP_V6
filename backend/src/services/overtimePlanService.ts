import prisma from '@config/database';
import logger from '@config/logger';
import { CreateOvertimePlanRequest, UpdateOvertimePlanRequest, OvertimePlanListQuery, AcceptOvertimePlanRequest, ApproveOvertimePlanRequest, NotificationType } from '@types';
import { ApiError, NotFoundError, ValidationError } from '@utils/errors';
import notificationService from './notificationService';
import { AttendanceStatus } from '@prisma/client';

export class OvertimePlanService {
  private mapUserDto(user: { id: string; firstName: string; lastName: string; departmentId: string | null; employees: { employeeCode: string } | null }) {
    return { id: user.id, firstName: user.firstName, lastName: user.lastName, employeeCode: user.employees?.employeeCode || '', department: user.departmentId || '' };
  }

  private async populateWithUsers(plan: any): Promise<any> {
    try {
      const allIds = Array.from(new Set([plan.nguoiTaoId, ...plan.nguoiThamGiaIds]));
      const users = await prisma.user.findMany({ where: { id: { in: allIds } }, select: { id: true, firstName: true, lastName: true, departmentId: true, employees: { select: { employeeCode: true } } } });
      const userMap = new Map(users.map(u => [u.id, u]));
      return this.buildPopulated(plan, userMap);
    } catch (error) { logger.error('Error populating overtime plan with users:', error); return { ...plan, nguoiTao: null, nguoiThamGia: [] }; }
  }

  private async batchPopulateWithUsers(plans: any[]): Promise<any[]> {
    if (plans.length === 0) return [];
    try {
      const allIds = Array.from(new Set(plans.flatMap((p: any) => [p.nguoiTaoId, ...p.nguoiThamGiaIds])));
      const users = await prisma.user.findMany({ where: { id: { in: allIds } }, select: { id: true, firstName: true, lastName: true, departmentId: true, employees: { select: { employeeCode: true } } } });
      const userMap = new Map(users.map(u => [u.id, u]));
      return plans.map(p => this.buildPopulated(p, userMap));
    } catch (error) { logger.error('Error batch populating overtime plans:', error); return plans.map(p => ({ ...p, nguoiTao: null, nguoiThamGia: [] })); }
  }

  private buildPopulated(plan: any, userMap: Map<string, any>): any {
    const nguoiTao = userMap.get(plan.nguoiTaoId);
    return { ...plan, nguoiTao: nguoiTao ? this.mapUserDto(nguoiTao) : null, nguoiThamGia: plan.nguoiThamGiaIds.map((uid: string) => userMap.get(uid)).filter(Boolean).map((u: any) => this.mapUserDto(u)) };
  }

  async create(data: CreateOvertimePlanRequest, nguoiTaoId: string, files?: string[]): Promise<any> {
    const nguoiTao = await prisma.user.findUnique({ where: { id: nguoiTaoId }, include: { employees: true } });
    if (!nguoiTao) throw new NotFoundError('Người tạo kế hoạch không tồn tại');

    let nguoiThamGiaUserIds: string[];
    // If no participants specified, auto-register the creator themselves
    if (!data.nguoiThamGia || data.nguoiThamGia.length === 0) {
      nguoiThamGiaUserIds = [nguoiTaoId];
    } else {
      const employees = await prisma.employee.findMany({ where: { id: { in: data.nguoiThamGia } }, select: { id: true, userId: true } });
      if (employees.length !== data.nguoiThamGia.length) throw new NotFoundError('Một hoặc nhiều người tham gia không tồn tại');
      nguoiThamGiaUserIds = employees.map(emp => emp.userId);
    }
    const ngayTangCa = new Date(data.ngayTangCa);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (ngayTangCa < today) throw new ValidationError('Ngày tăng ca phải từ ngày hôm nay trở đi');
    if (data.gioBatDau >= data.gioKetThuc) throw new ValidationError('Giờ kết thúc phải sau giờ bắt đầu');
    const trangThaiTiepNhan: Record<string, string> = {};
    nguoiThamGiaUserIds.forEach(uid => { trangThaiTiepNhan[uid] = 'CHUA_TIEP_NHAN'; });
    const plan = await (prisma.overtimePlan as any).create({ data: { nguoiTaoId, nguoiThamGiaIds: nguoiThamGiaUserIds, noiDung: data.noiDung, ngayTangCa, gioBatDau: data.gioBatDau, gioKetThuc: data.gioKetThuc, ghiChu: data.ghiChu, files: files || [], mucDoUuTien: data.mucDoUuTien as any, trangThaiTiepNhan, gioThucTe: undefined } });
    try {
      const creatorName = `${nguoiTao.firstName} ${nguoiTao.lastName}`;
      // Notify creator so their WebSocket listener refreshes the list immediately
      await notificationService.createNotification({
        userId: nguoiTaoId,
        type: NotificationType.OVERTIME_PLAN,
        title: 'Đăng ký tăng ca thành công',
        message: `Yêu cầu tăng ca "${data.noiDung}" đã được gửi và đang chờ phê duyệt.`,
      });
      // Notify all users who can approve (ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)
      const approvers = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'] as any }, isActive: true, id: { not: nguoiTaoId } },
        select: { id: true },
      });
      for (const approver of approvers) {
        await notificationService.createNotification({
          userId: approver.id,
          type: NotificationType.OVERTIME_PLAN_APPROVAL,
          title: 'Kế hoạch tăng ca cần phê duyệt',
          message: `${creatorName} đã tạo kế hoạch tăng ca cần phê duyệt: ${data.noiDung}`,
        });
      }
    } catch (error) { logger.error('Error sending overtime plan admin notifications:', error); }
    return plan;
  }

  async getAll(query: OvertimePlanListQuery): Promise<{ plans: any[]; total: number; page: number; totalPages: number }> {
    const page = query.page || 1; const limit = query.limit || 10; const skip = (page - 1) * limit;
    const where: any = {};
    if (query.search) where.noiDung = { contains: query.search, mode: 'insensitive' };
    if (query.mucDoUuTien) where.mucDoUuTien = query.mucDoUuTien;
    if (query.trangThai) where.trangThai = query.trangThai;
    if (query.nguoiTao) where.nguoiTaoId = query.nguoiTao;
    if (query.nguoiThamGia) where.nguoiThamGiaIds = { has: query.nguoiThamGia };
    if (query.department) {
      const usersInDept = await prisma.user.findMany({ where: { departmentId: query.department }, select: { id: true } });
      where.OR = [{ nguoiTaoId: { in: usersInDept.map(u => u.id) } }, { nguoiThamGiaIds: { hasSome: usersInDept.map(u => u.id) } }];
    }
    const [total, plans] = await Promise.all([prisma.overtimePlan.count({ where }), prisma.overtimePlan.findMany({ where, orderBy: { ngayTao: 'desc' }, skip, take: limit })]);
    return { plans: await this.batchPopulateWithUsers(plans), total, page, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string): Promise<any> {
    const plan = await prisma.overtimePlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    return this.populateWithUsers(plan);
  }

  async update(id: string, data: UpdateOvertimePlanRequest, userId: string, files?: string[]): Promise<any> {
    const plan = await prisma.overtimePlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    if (plan.nguoiTaoId !== userId) throw new ApiError(403, 'Chỉ người tạo mới có quyền cập nhật');
    if (plan.trangThai !== 'CHO_DUYET') throw new ApiError(403, 'Chỉ có thể chỉnh sửa kế hoạch khi chưa được duyệt');
    const updateData: any = {};
    if (data.nguoiThamGia) {
      const emps = await prisma.employee.findMany({ where: { id: { in: data.nguoiThamGia } }, select: { id: true, userId: true } });
      updateData.nguoiThamGiaIds = emps.map(emp => emp.userId);
    }
    if (data.noiDung) updateData.noiDung = data.noiDung;
    if (data.ngayTangCa) updateData.ngayTangCa = new Date(data.ngayTangCa);
    if (data.gioBatDau) updateData.gioBatDau = data.gioBatDau;
    if (data.gioKetThuc) updateData.gioKetThuc = data.gioKetThuc;
    if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu;
    if (data.mucDoUuTien) updateData.mucDoUuTien = data.mucDoUuTien;
    if (files && files.length > 0) updateData.files = [...plan.files, ...files];
    return prisma.overtimePlan.update({ where: { id }, data: updateData });
  }

  async delete(id: string, userId: string): Promise<void> {
    const plan = await prisma.overtimePlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    if (plan.nguoiTaoId !== userId) throw new ApiError(403, 'Chỉ người tạo mới có quyền xóa');
    if (plan.trangThai !== 'CHO_DUYET') throw new ApiError(403, 'Chỉ có thể xóa kế hoạch khi chưa được duyệt');
    await prisma.overtimePlan.delete({ where: { id } });
  }

  async getMyPlans(userId: string, query: OvertimePlanListQuery): Promise<{ plans: any[]; total: number; page: number; totalPages: number }> {
    const page = query.page || 1; const limit = query.limit || 10; const skip = (page - 1) * limit;
    const where: any = { OR: [{ nguoiTaoId: userId }, { nguoiThamGiaIds: { has: userId } }] };
    const [total, plans] = await Promise.all([prisma.overtimePlan.count({ where }), prisma.overtimePlan.findMany({ where, orderBy: { ngayTao: 'desc' }, skip, take: limit })]);
    return { plans: await this.batchPopulateWithUsers(plans), total, page, totalPages: Math.ceil(total / limit) };
  }

  async acceptPlan(planId: string, userId: string, data: AcceptOvertimePlanRequest): Promise<any> {
    const plan = await prisma.overtimePlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    if (!plan.nguoiThamGiaIds.includes(userId)) throw new ApiError(403, 'Bạn không phải người tham gia kế hoạch này');
    const currentStatus = (plan.trangThaiTiepNhan as Record<string, string>) || {};
    currentStatus[userId] = data.trangThai;
    return this.populateWithUsers(await prisma.overtimePlan.update({ where: { id: planId }, data: { trangThaiTiepNhan: currentStatus } }));
  }

  async approvePlan(planId: string, adminUserId: string, data: ApproveOvertimePlanRequest): Promise<any> {
    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
    const canApprove = adminUser && (
      adminUser.role === 'ADMIN' ||
      adminUser.role === 'DEPARTMENT_HEAD' ||
      adminUser.role === 'TEAM_LEAD'
    );
    if (!canApprove) throw new ApiError(403, 'Chỉ Admin, Trưởng bộ phận hoặc Trưởng nhóm mới có quyền phê duyệt kế hoạch tăng ca');
    const plan = await prisma.overtimePlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    if (plan.trangThai !== 'CHO_DUYET') throw new ValidationError('Kế hoạch tăng ca này đã được xử lý');
    const newStatus = data.trangThai === 'DA_DUYET' ? 'DA_DUYET' : 'TU_CHOI';
    const updated = await prisma.overtimePlan.update({ where: { id: planId }, data: { trangThai: newStatus as any } });
    try {
      const adminName = `${adminUser.firstName} ${adminUser.lastName}`;
      const isApproved = newStatus === 'DA_DUYET';
      await notificationService.createNotification({ userId: plan.nguoiTaoId, type: NotificationType.OVERTIME_PLAN, title: isApproved ? 'Kế hoạch tăng ca đã được duyệt' : 'Kế hoạch tăng ca bị từ chối', message: isApproved ? `${adminName} đã phê duyệt kế hoạch tăng ca: ${plan.noiDung}` : `${adminName} đã từ chối: ${plan.noiDung}${data.lyDoTuChoi ? `. Lý do: ${data.lyDoTuChoi}` : ''}` });
      if (isApproved) {
        for (const uid of plan.nguoiThamGiaIds) {
          if (uid !== plan.nguoiTaoId) { await notificationService.createNotification({ userId: uid, type: NotificationType.OVERTIME_PLAN, title: 'Kế hoạch tăng ca đã được duyệt', message: `Kế hoạch tăng ca "${plan.noiDung}" đã được ${adminName} phê duyệt.` }); }
        }
        // Auto-create attendance records for all participants
        await this.createOvertimeAttendances(plan);
      }
    } catch (error) { logger.error('Error sending overtime plan approval notification:', error); }
    return this.populateWithUsers(updated);
  }

  /**
   * Parses an "HH:mm" time string and applies it to a given base date.
   * Returns a new Date object with the time set (UTC-safe: uses local date parts).
   */
  parseTimeToDate(baseDate: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Auto-creates (or extends) Attendance records for all overtime plan participants.
   * - If the employee already has attendance on the overtime date, extend checkOutTime.
   * - Otherwise, create a new OVERTIME attendance record linked to this plan.
   */
  async createOvertimeAttendances(plan: {
    id: string;
    nguoiTaoId: string;
    nguoiThamGiaIds: string[];
    ngayTangCa: Date;
    gioBatDau: string;
    gioKetThuc: string;
    noiDung: string;
  }): Promise<void> {
    // All unique userIds (creator + participants)
    const allUserIds = Array.from(new Set([plan.nguoiTaoId, ...plan.nguoiThamGiaIds]));

    // Resolve userId → Employee
    const employees = await prisma.employee.findMany({
      where: { userId: { in: allUserIds } },
      select: { id: true, userId: true },
    });

    const checkInTime = this.parseTimeToDate(plan.ngayTangCa, plan.gioBatDau);
    const checkOutTime = this.parseTimeToDate(plan.ngayTangCa, plan.gioKetThuc);

    // Start-of-day and end-of-day for querying existing attendance
    const dayStart = new Date(plan.ngayTangCa);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(plan.ngayTangCa);
    dayEnd.setHours(23, 59, 59, 999);

    for (const employee of employees) {
      try {
        // Check if an attendance record already exists for this date
        const existing = await prisma.attendance.findFirst({
          where: {
            employeeId: employee.id,
            attendanceDate: { gte: dayStart, lte: dayEnd },
          },
        });

        if (existing) {
          // Extend checkOutTime if the overtime end is later
          const existingCheckOut = existing.checkOutTime;
          if (!existingCheckOut || checkOutTime > existingCheckOut) {
            await prisma.attendance.update({
              where: { id: existing.id },
              data: {
                checkOutTime,
                isOvertime: true,
                overtimePlanId: plan.id,
                notes: existing.notes
                  ? `${existing.notes}; Tăng ca: ${plan.noiDung}`
                  : `Tăng ca: ${plan.noiDung}`,
              },
            });
          }
        } else {
          // Create new attendance record for overtime
          await prisma.attendance.create({
            data: {
              employeeId: employee.id,
              attendanceDate: plan.ngayTangCa,
              checkInTime,
              checkOutTime,
              status: AttendanceStatus.OVERTIME,
              isOvertime: true,
              overtimePlanId: plan.id,
              notes: `Tăng ca: ${plan.noiDung}`,
            },
          });
        }
      } catch (error) {
        logger.error(`Error creating overtime attendance for employee ${employee.id}:`, error);
      }
    }
  }

  async updateActualTime(planId: string, userId: string, actualTimes: Record<string, { gioVao: string; gioRa: string }>, isUserAdmin: boolean): Promise<any> {
    const plan = await (prisma.overtimePlan as any).findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    if (plan.nguoiTaoId !== userId && !isUserAdmin) throw new ApiError(403, 'Bạn không có quyền cập nhật giờ thực tế');
    const current = (plan.gioThucTe as Record<string, any>) || {};
    const updated = await (prisma.overtimePlan as any).update({ where: { id: planId }, data: { gioThucTe: { ...current, ...actualTimes } } });
    return this.populateWithUsers(updated);
  }
}

export default new OvertimePlanService();

