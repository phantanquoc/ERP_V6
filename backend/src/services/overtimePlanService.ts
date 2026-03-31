import prisma from '@config/database';
import logger from '@config/logger';
import { CreateOvertimePlanRequest, UpdateOvertimePlanRequest, OvertimePlanListQuery, AcceptOvertimePlanRequest, ApproveOvertimePlanRequest, NotificationType } from '@types';
import { ApiError, NotFoundError, ValidationError } from '@utils/errors';
import notificationService from './notificationService';

class OvertimePlanService {
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
    const employees = await prisma.employee.findMany({ where: { id: { in: data.nguoiThamGia } }, select: { id: true, userId: true } });
    if (employees.length !== data.nguoiThamGia.length) throw new NotFoundError('Một hoặc nhiều người tham gia không tồn tại');
    const nguoiThamGiaUserIds = employees.map(emp => emp.userId);
    const ngayTangCa = new Date(data.ngayTangCa);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (ngayTangCa < today) throw new ValidationError('Ngày tăng ca phải từ ngày hôm nay trở đi');
    if (data.gioBatDau >= data.gioKetThuc) throw new ValidationError('Giờ kết thúc phải sau giờ bắt đầu');
    const trangThaiTiepNhan: Record<string, string> = {};
    nguoiThamGiaUserIds.forEach(uid => { trangThaiTiepNhan[uid] = 'CHUA_TIEP_NHAN'; });
    const plan = await (prisma.overtimePlan as any).create({ data: { nguoiTaoId, nguoiThamGiaIds: nguoiThamGiaUserIds, noiDung: data.noiDung, ngayTangCa, gioBatDau: data.gioBatDau, gioKetThuc: data.gioKetThuc, ghiChu: data.ghiChu, files: files || [], mucDoUuTien: data.mucDoUuTien as any, trangThaiTiepNhan, gioThucTe: {} } });
    try {
      const creatorName = `${nguoiTao.firstName} ${nguoiTao.lastName}`;
      const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
      for (const admin of adminUsers) { await notificationService.createNotification({ userId: admin.id, type: NotificationType.OVERTIME_PLAN_APPROVAL, title: 'Kế hoạch tăng ca cần phê duyệt', message: `${creatorName} đã tạo kế hoạch tăng ca cần phê duyệt: ${data.noiDung}` }); }
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
    if (!adminUser || adminUser.role !== 'ADMIN') throw new ApiError(403, 'Chỉ admin mới có quyền phê duyệt kế hoạch tăng ca');
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
      }
    } catch (error) { logger.error('Error sending overtime plan approval notification:', error); }
    return this.populateWithUsers(updated);
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

