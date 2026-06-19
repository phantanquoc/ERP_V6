import prisma from '@config/database';
import logger from '@config/logger';
import { AttendanceStatus } from '@prisma/client';
import {
  CreateOvertimePlanRequest,
  UpdateOvertimePlanRequest,
  OvertimePlanListQuery,
  AcceptOvertimePlanRequest,
  ApproveOvertimePlanRequest,
  UpdateActualTimeRequest,
  OvertimePlanItemInput,
  NotificationEvent,
} from '@types';
import { ApiError, NotFoundError, ValidationError } from '@utils/errors';
import notificationService from './notificationService';

class OvertimePlanService {
  // ─── User mapping helpers ─────────────────────────────────────────────────

  private mapUserDto(user: {
    id: string;
    firstName: string;
    lastName: string;
    departmentId: string | null;
    employees: { employeeCode: string } | null;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeCode: user.employees?.employeeCode || '',
      department: user.departmentId || '',
    };
  }

  // Populate a single plan with nguoiTao and per-item nguoiThamGia arrays
  private async populateWithUsers(plan: any): Promise<any> {
    try {
      const itemUserIds: string[] = (plan.items || []).flatMap((item: any) => item.nguoiThamGiaIds || []);
      const allIds = Array.from(new Set([plan.nguoiTaoId, ...itemUserIds]));
      const users = await prisma.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true, firstName: true, lastName: true, departmentId: true, employees: { select: { employeeCode: true } } },
      });
      const userMap = new Map(users.map(u => [u.id, u]));
      return this.buildPopulated(plan, userMap);
    } catch (error) {
      logger.error('Error populating overtime plan with users:', error);
      return { ...plan, nguoiTao: null, items: (plan.items || []).map((item: any) => ({ ...item, nguoiThamGia: [] })) };
    }
  }

  private async batchPopulateWithUsers(plans: any[]): Promise<any[]> {
    if (plans.length === 0) return [];
    try {
      const itemUserIds: string[] = plans.flatMap((p: any) =>
        (p.items || []).flatMap((item: any) => item.nguoiThamGiaIds || [])
      );
      const allIds = Array.from(new Set(plans.flatMap((p: any) => [p.nguoiTaoId, ...itemUserIds])));
      const users = await prisma.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true, firstName: true, lastName: true, departmentId: true, employees: { select: { employeeCode: true } } },
      });
      const userMap = new Map(users.map(u => [u.id, u]));
      return plans.map(p => this.buildPopulated(p, userMap));
    } catch (error) {
      logger.error('Error batch populating overtime plans:', error);
      return plans.map(p => ({
        ...p,
        nguoiTao: null,
        items: (p.items || []).map((item: any) => ({ ...item, nguoiThamGia: [] })),
      }));
    }
  }

  private buildPopulated(plan: any, userMap: Map<string, any>): any {
    const nguoiTao = userMap.get(plan.nguoiTaoId);
    const populatedItems = (plan.items || [])
      .sort((a: any, b: any) => new Date(a.ngayTangCa).getTime() - new Date(b.ngayTangCa).getTime())
      .map((item: any) => ({
        ...item,
        nguoiThamGia: (item.nguoiThamGiaIds || [])
          .map((uid: string) => userMap.get(uid))
          .filter(Boolean)
          .map((u: any) => this.mapUserDto(u)),
      }));
    return {
      ...plan,
      nguoiTao: nguoiTao ? this.mapUserDto(nguoiTao) : null,
      items: populatedItems,
    };
  }

  // ─── Validate item helper ─────────────────────────────────────────────────

  private async resolveItemData(
    itemInput: OvertimePlanItemInput
  ): Promise<{
    nguoiThamGiaUserIds: string[];
    workShiftName: string | null;
    ngayTangCaDate: Date;
  }> {
    // Validate time range
    if (itemInput.gioBatDau >= itemInput.gioKetThuc) {
      throw new ValidationError(`Giờ kết thúc phải sau giờ bắt đầu (ngày ${itemInput.ngayTangCa})`);
    }

    // Resolve employees → userIds
    if (itemInput.nguoiThamGia.length === 0) {
      throw new ValidationError(`Mỗi dòng kế hoạch phải có ít nhất một người tham gia`);
    }
    const employees = await prisma.employee.findMany({
      where: { id: { in: itemInput.nguoiThamGia } },
      select: { id: true, userId: true },
    });
    if (employees.length !== itemInput.nguoiThamGia.length) {
      throw new NotFoundError('Một hoặc nhiều người tham gia không tồn tại');
    }
    const nguoiThamGiaUserIds = employees.map(emp => emp.userId);

    // Snapshot shift name
    let workShiftName: string | null = null;
    if (itemInput.workShiftId) {
      const shift = await prisma.workShift.findUnique({ where: { id: itemInput.workShiftId } });
      if (!shift) throw new NotFoundError(`Ca làm việc không tồn tại: ${itemInput.workShiftId}`);
      workShiftName = shift.name;
    }

    const ngayTangCaDate = new Date(itemInput.ngayTangCa);

    return { nguoiThamGiaUserIds, workShiftName, ngayTangCaDate };
  }

  // ─── Fetch plan with items ────────────────────────────────────────────────

  private findPlanWithItems(id: string) {
    return prisma.overtimePlan.findUnique({
      where: { id },
      include: { items: { orderBy: { ngayTangCa: 'asc' } } },
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async create(data: CreateOvertimePlanRequest, nguoiTaoId: string, files?: string[]): Promise<any> {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('Kế hoạch tăng ca phải có ít nhất một dòng');
    }

    const nguoiTao = await prisma.user.findUnique({ where: { id: nguoiTaoId }, include: { employees: true } });
    if (!nguoiTao) throw new NotFoundError('Người tạo kế hoạch không tồn tại');

    // Resolve all items before starting transaction
    const resolvedItems = await Promise.all(data.items.map(item => this.resolveItemData(item)));

    const plan = await prisma.$transaction(async (tx) => {
      const parent = await tx.overtimePlan.create({
        data: {
          nguoiTaoId,
          noiDung: data.noiDung,
          ghiChu: data.ghiChu,
          files: files || [],
          mucDoUuTien: data.mucDoUuTien as any,
        },
      });

      await tx.overtimePlanItem.createMany({
        data: data.items.map((item, idx) => {
          const resolved = resolvedItems[idx];
          const trangThaiTiepNhan: Record<string, string> = {};
          resolved.nguoiThamGiaUserIds.forEach(uid => { trangThaiTiepNhan[uid] = 'CHUA_TIEP_NHAN'; });
          return {
            overtimePlanId: parent.id,
            ngayTangCa: resolved.ngayTangCaDate,
            gioBatDau: item.gioBatDau,
            gioKetThuc: item.gioKetThuc,
            workShiftId: item.workShiftId || null,
            workShiftName: resolved.workShiftName,
            nguoiThamGiaIds: resolved.nguoiThamGiaUserIds,
            ghiChuItem: item.ghiChuItem || null,
            trangThaiTiepNhan,
          };
        }),
      });

      return tx.overtimePlan.findUnique({
        where: { id: parent.id },
        include: { items: { orderBy: { ngayTangCa: 'asc' } } },
      });
    });

    try {
      const creatorName = `${nguoiTao.lastName} ${nguoiTao.firstName}`;
      await notificationService.notify(NotificationEvent.OVERTIME_PLAN_SUBMITTED, {
        actorUserId: nguoiTaoId,
        entityId: plan!.id,
        metadata: { creatorName, noiDung: data.noiDung, planId: plan!.id },
      });
    } catch (error) { logger.error('Error sending overtime plan admin notifications:', error); }

    return this.populateWithUsers(plan);
  }

  async getAll(query: OvertimePlanListQuery): Promise<{ plans: any[]; total: number; page: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (query.search) where.noiDung = { contains: query.search, mode: 'insensitive' };
    if (query.mucDoUuTien) where.mucDoUuTien = query.mucDoUuTien;
    if (query.trangThai) where.trangThai = query.trangThai;
    if (query.nguoiTao) where.nguoiTaoId = query.nguoiTao;
    if (query.nguoiThamGia) {
      where.items = { some: { nguoiThamGiaIds: { has: query.nguoiThamGia } } };
    }
    if (query.department) {
      const usersInDept = await prisma.user.findMany({ where: { departmentId: query.department }, select: { id: true } });
      const ids = usersInDept.map(u => u.id);
      where.OR = [
        { nguoiTaoId: { in: ids } },
        { items: { some: { nguoiThamGiaIds: { hasSome: ids } } } },
      ];
    }
    const [total, plans] = await Promise.all([
      prisma.overtimePlan.count({ where }),
      prisma.overtimePlan.findMany({
        where,
        orderBy: { ngayTao: 'desc' },
        skip,
        take: limit,
        include: { items: { orderBy: { ngayTangCa: 'asc' } } },
      }),
    ]);
    return { plans: await this.batchPopulateWithUsers(plans), total, page, totalPages: Math.ceil(total / limit) };
  }

  async getById(id: string): Promise<any> {
    const plan = await this.findPlanWithItems(id);
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    return this.populateWithUsers(plan);
  }

  async update(id: string, data: UpdateOvertimePlanRequest, userId: string, isAdmin: boolean, files?: string[]): Promise<any> {
    const plan = await this.findPlanWithItems(id);
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');

    if (!isAdmin) {
      if (plan.nguoiTaoId !== userId) throw new ApiError(403, 'Chỉ người tạo hoặc admin mới có quyền cập nhật');
      if (plan.trangThai !== 'CHO_DUYET') throw new ApiError(403, 'Chỉ có thể chỉnh sửa kế hoạch khi chưa được duyệt');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const parentUpdateData: any = {};
      if (data.noiDung !== undefined) parentUpdateData.noiDung = data.noiDung;
      if (data.ghiChu !== undefined) parentUpdateData.ghiChu = data.ghiChu;
      if (data.mucDoUuTien !== undefined) parentUpdateData.mucDoUuTien = data.mucDoUuTien;
      if (files && files.length > 0) parentUpdateData.files = [...plan.files, ...files];

      await tx.overtimePlan.update({ where: { id }, data: parentUpdateData });

      if (data.items && data.items.length > 0) {
        const resolvedItems = await Promise.all(data.items.map(item => this.resolveItemData(item)));

        // Delete-then-recreate for child items
        await tx.overtimePlanItem.deleteMany({ where: { overtimePlanId: id } });
        await tx.overtimePlanItem.createMany({
          data: data.items.map((item, idx) => {
            const resolved = resolvedItems[idx];
            const trangThaiTiepNhan: Record<string, string> = {};
            resolved.nguoiThamGiaUserIds.forEach(uid => { trangThaiTiepNhan[uid] = 'CHUA_TIEP_NHAN'; });
            return {
              overtimePlanId: id,
              ngayTangCa: resolved.ngayTangCaDate,
              gioBatDau: item.gioBatDau,
              gioKetThuc: item.gioKetThuc,
              workShiftId: item.workShiftId || null,
              workShiftName: resolved.workShiftName,
              nguoiThamGiaIds: resolved.nguoiThamGiaUserIds,
              ghiChuItem: item.ghiChuItem || null,
              trangThaiTiepNhan,
            };
          }),
        });
      }

      return tx.overtimePlan.findUnique({
        where: { id },
        include: { items: { orderBy: { ngayTangCa: 'asc' } } },
      });
    });

    return this.populateWithUsers(updated);
  }

  async delete(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const plan = await prisma.overtimePlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');

    if (!isAdmin) {
      if (plan.nguoiTaoId !== userId) throw new ApiError(403, 'Chỉ người tạo hoặc admin mới có quyền xóa');
      if (plan.trangThai !== 'CHO_DUYET') throw new ApiError(403, 'Chỉ có thể xóa kế hoạch khi chưa được duyệt');
    }

    // Cascade delete handled by FK onDelete: Cascade on items
    await prisma.overtimePlan.delete({ where: { id } });
  }

  async getMyPlans(userId: string, query: OvertimePlanListQuery): Promise<{ plans: any[]; total: number; page: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const where: any = {
      OR: [
        { nguoiTaoId: userId },
        { items: { some: { nguoiThamGiaIds: { has: userId } } } },
      ],
    };
    const [total, plans] = await Promise.all([
      prisma.overtimePlan.count({ where }),
      prisma.overtimePlan.findMany({
        where,
        orderBy: { ngayTao: 'desc' },
        skip,
        take: limit,
        include: { items: { orderBy: { ngayTangCa: 'asc' } } },
      }),
    ]);
    return { plans: await this.batchPopulateWithUsers(plans), total, page, totalPages: Math.ceil(total / limit) };
  }

  async acceptPlan(planId: string, userId: string, data: AcceptOvertimePlanRequest): Promise<any> {
    const item = await prisma.overtimePlanItem.findUnique({ where: { id: data.itemId } });
    if (!item) throw new NotFoundError('Không tìm thấy dòng kế hoạch tăng ca');
    if (item.overtimePlanId !== planId) throw new ApiError(400, 'Dòng kế hoạch không thuộc kế hoạch này');
    if (!item.nguoiThamGiaIds.includes(userId)) throw new ApiError(403, 'Bạn không phải người tham gia dòng kế hoạch này');

    const currentStatus = ((item.trangThaiTiepNhan as Record<string, string>) || {});
    currentStatus[userId] = data.trangThai;
    await prisma.overtimePlanItem.update({
      where: { id: data.itemId },
      data: { trangThaiTiepNhan: currentStatus },
    });

    const plan = await this.findPlanWithItems(planId);
    return this.populateWithUsers(plan);
  }

  async approvePlan(planId: string, adminUserId: string, data: ApproveOvertimePlanRequest): Promise<any> {
    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || adminUser.role !== 'ADMIN') throw new ApiError(403, 'Chỉ admin mới có quyền phê duyệt kế hoạch tăng ca');

    const plan = await this.findPlanWithItems(planId);
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    if (plan.trangThai !== 'CHO_DUYET') throw new ValidationError('Kế hoạch tăng ca này đã được xử lý');

    const newStatus = data.trangThai === 'DA_DUYET' ? 'DA_DUYET' : 'TU_CHOI';

    // Vietnam timezone offset (UTC+7). Backend container runs UTC, so we
    // construct UTC dates that represent the requested Vietnam local time
    // by subtracting 7h. setHours() would be timezone-dependent and wrong.
    const VN_OFFSET_HOURS = 7;
    const parseHHMM = (timeStr: string): number => {
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };
    const buildVNTime = (baseDate: Date, minutesSinceMidnight: number, dayOffset = 0): Date => {
      const year = baseDate.getUTCFullYear();
      const month = baseDate.getUTCMonth();
      const day = baseDate.getUTCDate() + dayOffset;
      const hours = Math.floor(minutesSinceMidnight / 60);
      const minutes = minutesSinceMidnight % 60;
      return new Date(Date.UTC(year, month, day, hours - VN_OFFSET_HOURS, minutes, 0, 0));
    };

    // Pre-fetch all referenced workShifts once — checkInTime anchors on
    // shift.endTime (clocked-out time of the regular shift) so overtime
    // never overlaps the regular shift even if the user typed an
    // overlapping gioBatDau by accident.
    const workShiftIds = Array.from(
      new Set(plan.items.map((i: any) => i.workShiftId).filter(Boolean))
    ) as string[];
    const workShifts = workShiftIds.length > 0
      ? await prisma.workShift.findMany({ where: { id: { in: workShiftIds } } })
      : [];
    const workShiftMap = new Map(workShifts.map(s => [s.id, s]));

    // Atomic: status update + attendance fan-out in one transaction.
    // If attendance creation fails, the plan status is NOT committed.
    await prisma.$transaction(async (tx) => {
      await tx.overtimePlan.update({ where: { id: planId }, data: { trangThai: newStatus as any } });

      if (newStatus === 'DA_DUYET') {
        for (const item of plan.items) {
          // Overtime duration in minutes — handles overnight ranges (e.g., 22:00→02:00)
          const startMin = parseHHMM(item.gioBatDau);
          const endMin = parseHHMM(item.gioKetThuc);
          let durationMin = endMin - startMin;
          if (durationMin <= 0) durationMin += 24 * 60;

          // checkInTime: prefer end of the assigned shift (then add OT duration);
          // fall back to the raw gioBatDau if no shift is set or the shift is missing.
          let checkInTime: Date;
          const shift = item.workShiftId ? workShiftMap.get(item.workShiftId) : undefined;
          if (shift) {
            const shiftStartMin = parseHHMM(shift.startTime);
            const shiftEndMin = parseHHMM(shift.endTime);
            const shiftCrossesMidnight = shiftEndMin <= shiftStartMin;
            checkInTime = buildVNTime(item.ngayTangCa, shiftEndMin, shiftCrossesMidnight ? 1 : 0);
          } else {
            checkInTime = buildVNTime(item.ngayTangCa, startMin);
          }
          const checkOutTime = new Date(checkInTime.getTime() + durationMin * 60 * 1000);
          const workHours = Math.round((durationMin / 60) * 100) / 100;

          for (const uid of item.nguoiThamGiaIds) {
            const employee = await tx.employee.findFirst({ where: { userId: uid } });
            if (!employee) continue;
            const existing = await tx.attendance.findFirst({
              where: { employeeId: employee.id, attendanceDate: item.ngayTangCa, isOvertime: true },
            });
            if (existing) continue; // idempotency: skip-if-exists
            await tx.attendance.create({
              data: {
                employeeId: employee.id,
                attendanceDate: item.ngayTangCa,
                checkInTime,
                checkOutTime,
                workHours,
                status: AttendanceStatus.OVERTIME,
                isOvertime: true,
                notes: `Tăng ca theo kế hoạch: ${plan.noiDung}`,
              },
            });
          }
        }
      }
    });

    // Notifications are outside the transaction — failures must not roll back the approval.
    try {
      const isApproved = newStatus === 'DA_DUYET';
      const lyDo = data.lyDoTuChoi || '';

      const creatorEmp = await prisma.employee.findUnique({ where: { userId: plan.nguoiTaoId }, select: { id: true } });
      if (creatorEmp) {
        await notificationService.notify(NotificationEvent.OVERTIME_PLAN_RESPONDED, {
          targetEmployeeIds: [creatorEmp.id],
          entityId: plan.id,
          metadata: { status: isApproved ? 'APPROVED' : 'REJECTED', noiDung: plan.noiDung, lyDo, planId: plan.id },
        });
      }

      const allParticipantUserIds = Array.from(new Set(plan.items.flatMap((item: any) => item.nguoiThamGiaIds)));
      const participantEmps = await prisma.employee.findMany({ where: { userId: { in: allParticipantUserIds } }, select: { id: true } });
      if (participantEmps.length > 0) {
        const participantEvent = isApproved
          ? NotificationEvent.OVERTIME_PLAN_APPROVED_PARTICIPANT
          : NotificationEvent.OVERTIME_PLAN_REJECTED_PARTICIPANT;
        await notificationService.notify(participantEvent, {
          targetEmployeeIds: participantEmps.map(e => e.id),
          entityId: plan.id,
          metadata: { noiDung: plan.noiDung, lyDo, planId: plan.id },
        });
      }
    } catch (error) { logger.error('Error sending overtime plan approval notification:', error); }

    const finalPlan = await this.findPlanWithItems(planId);
    return this.populateWithUsers(finalPlan);
  }

  async updateActualTime(planId: string, userId: string, data: UpdateActualTimeRequest): Promise<any> {
    const item = await prisma.overtimePlanItem.findUnique({ where: { id: data.itemId } });
    if (!item) throw new NotFoundError('Không tìm thấy dòng kế hoạch tăng ca');
    if (item.overtimePlanId !== planId) throw new ApiError(400, 'Dòng kế hoạch không thuộc kế hoạch này');

    // Only participants of this item may log actual time — creator-only check is wrong here
    if (!item.nguoiThamGiaIds.includes(userId)) {
      throw new ValidationError('Bạn không phải người tham gia của mục này');
    }

    const current = ((item.gioThucTe as Record<string, any>) || {});
    await prisma.overtimePlanItem.update({
      where: { id: data.itemId },
      data: { gioThucTe: { ...current, ...data.actualTimes } },
    });

    const updatedPlan = await this.findPlanWithItems(planId);
    return this.populateWithUsers(updatedPlan);
  }
}

export default new OvertimePlanService();
