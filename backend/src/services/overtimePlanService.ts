import prisma from '@config/database';
import logger from '@config/logger';
import { AttendanceStatus, Prisma } from '@prisma/client';
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

/** Statuses in which a plan may no longer be edited by anyone, including ADMIN. */
const NON_EDITABLE_STATUSES = ['TU_CHOI', 'HOAN_THANH', 'HUY'] as const;

const STATUS_LABELS: Record<string, string> = {
  TU_CHOI: 'đã bị từ chối',
  HOAN_THANH: 'đã hoàn thành',
  HUY: 'đã bị hủy',
};

/** Minimal item shape the attendance materialization needs. */
interface MaterializableItem {
  ngayTangCa: Date;
  gioBatDau: string;
  gioKetThuc: string;
  workShiftId: string | null;
  nguoiThamGiaIds: string[];
}

class OvertimePlanService {
  // ─── User mapping helpers ─────────────────────────────────────────────────

  private mapUserDto(user: {
    id: string;
    firstName: string;
    lastName: string;
    employees: { employeeCode: string } | null;
    departmentName?: string;
    subDepartmentName?: string;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      employeeCode: user.employees?.employeeCode || '',
      department: user.subDepartmentName || user.departmentName || '',
    };
  }

  private async enrichUsersWithDepartmentNames(users: any[]): Promise<any[]> {
    const deptIds = [...new Set(users.map(u => u.departmentId).filter(Boolean))] as string[];
    const subDeptIds = [...new Set(users.map(u => u.subDepartmentId).filter(Boolean))] as string[];
    const [depts, subDepts] = await Promise.all([
      deptIds.length ? prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } }) : Promise.resolve([] as any[]),
      subDeptIds.length ? prisma.subDepartment.findMany({ where: { id: { in: subDeptIds } }, select: { id: true, name: true } }) : Promise.resolve([] as any[]),
    ]);
    const deptMap = new Map(depts.map((d: any) => [d.id, d.name]));
    const subDeptMap = new Map(subDepts.map((d: any) => [d.id, d.name]));
    return users.map(u => ({
      ...u,
      departmentName: u.departmentId ? deptMap.get(u.departmentId) ?? '' : '',
      subDepartmentName: u.subDepartmentId ? subDeptMap.get(u.subDepartmentId) ?? '' : '',
    }));
  }

  // Populate a single plan with nguoiTao (+nguoiDuyet) and per-item nguoiThamGia arrays
  private async populateWithUsers(plan: any): Promise<any> {
    try {
      const itemUserIds: string[] = (plan.items || []).flatMap((item: any) => item.nguoiThamGiaIds || []);
      const extraIds: string[] = plan.nguoiDuyetId ? [plan.nguoiDuyetId] : [];
      const allIds = Array.from(new Set([plan.nguoiTaoId, ...itemUserIds, ...extraIds]));
      const usersRaw = await prisma.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true, firstName: true, lastName: true, departmentId: true, subDepartmentId: true, employees: { select: { employeeCode: true } } },
      });
      const users = await this.enrichUsersWithDepartmentNames(usersRaw);
      const userMap = new Map(users.map(u => [u.id, u]));
      return this.buildPopulated(plan, userMap);
    } catch (error) {
      logger.error('Error populating overtime plan with users:', error);
      return { ...plan, nguoiTao: null, nguoiDuyet: null, items: (plan.items || []).map((item: any) => ({ ...item, nguoiThamGia: [] })) };
    }
  }

  private async batchPopulateWithUsers(plans: any[]): Promise<any[]> {
    if (plans.length === 0) return [];
    try {
      const itemUserIds: string[] = plans.flatMap((p: any) =>
        (p.items || []).flatMap((item: any) => item.nguoiThamGiaIds || [])
      );
      const extraIds: string[] = plans.map((p: any) => p.nguoiDuyetId).filter(Boolean);
      const allIds = Array.from(new Set(plans.flatMap((p: any) => [p.nguoiTaoId, ...itemUserIds, ...extraIds])));
      const usersRaw = await prisma.user.findMany({
        where: { id: { in: allIds } },
        select: { id: true, firstName: true, lastName: true, departmentId: true, subDepartmentId: true, employees: { select: { employeeCode: true } } },
      });
      const users = await this.enrichUsersWithDepartmentNames(usersRaw);
      const userMap = new Map(users.map(u => [u.id, u]));
      return plans.map(p => this.buildPopulated(p, userMap));
    } catch (error) {
      logger.error('Error batch populating overtime plans:', error);
      return plans.map(p => ({
        ...p,
        nguoiTao: null,
        nguoiDuyet: null,
        items: (p.items || []).map((item: any) => ({ ...item, nguoiThamGia: [] })),
      }));
    }
  }

  private buildPopulated(plan: any, userMap: Map<string, any>): any {
    const nguoiTao = userMap.get(plan.nguoiTaoId);
    const nguoiDuyet = plan.nguoiDuyetId ? userMap.get(plan.nguoiDuyetId) : null;
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
      nguoiDuyet: nguoiDuyet ? this.mapUserDto(nguoiDuyet) : null,
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

  // ─── Item identity ────────────────────────────────────────────────────────

  /**
   * Value identity of a plan item. Items are deleted and recreated on every
   * update, so "same item" must be reconstructed from its date and hours.
   * ngayTangCa is a DateTime — normalize it rather than comparing objects.
   */
  private itemIdentityKey(ngayTangCa: Date, gioBatDau: string, gioKetThuc: string): string {
    return `${new Date(ngayTangCa).getTime()}|${gioBatDau}|${gioKetThuc}`;
  }

  // ─── Fetch plan with items ────────────────────────────────────────────────────────

  private findPlanWithItems(id: string) {
    return prisma.overtimePlan.findUnique({
      where: { id },
      include: { items: { orderBy: { ngayTangCa: 'asc' } } },
    });
  }

  // ─── No-department caller detection ──────────────────────────────────────
  //
  // Mirrors requireRule's departmentIds resolution: primary departmentId plus
  // UserSecondaryDepartment rows. A caller with none of these is "no-department"
  // and gets participant-scoped visibility for overtime plans (change
  // no-dept-self-service-access, spec REQ no-dept-self-service).

  private async callerHasDepartment(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { departmentId: true },
    });
    if (user?.departmentId) return true;
    const secondary = await prisma.userSecondaryDepartment.findMany({
      where: { userId },
      select: { departmentId: true },
    });
    return secondary.some((s) => !!s.departmentId);
  }

  /** Participant-or-creator scope applied to every query for no-department callers. */
  private participantScope(userId: string) {
    return {
      OR: [
        { nguoiTaoId: userId },
        { items: { some: { nguoiThamGiaIds: { has: userId } } } },
      ],
    };
  }

  // ─── Attendance materialization ───────────────────────────────────────────

  /**
   * Create the overtime Attendance rows for a plan's items, one per
   * (item × participant). Shared by the approval path and the update path so
   * both derive checkInTime, checkOutTime and workHours identically.
   *
   * @param skipIfExists when true, a *pre-existing* row matching
   *   (employeeId, attendanceDate, isOvertime: true) is left alone — keeps
   *   re-approval idempotent. Note the `isOvertime` part of the key: a regular
   *   (non-overtime) row on the same date does *not* block the write.
   *   The update path disables this because it deletes the plan's rows first.
   *
   * Independently of `skipIfExists`, at most one row is written per
   * (employeeId, attendanceDate) *within a single run*. When a participant
   * appears on several items sharing a date, the first item in
   * `ngayTangCa asc, gioBatDau asc, gioKetThuc asc` order wins. The secondary
   * and tertiary keys matter: the approval path receives items ordered by
   * Postgres `ORDER BY ngayTangCa ASC` (no defined order among ties) while the
   * update path receives them in form-payload order, so sorting on the date
   * alone would let the two paths pick *different* items for the same day.
   * This keeps the update path at the same
   * one-row-per-day shape the approval path has always produced — without it,
   * an edit would multiply rows and inflate payroll hours (payrollService sums
   * workHours across rows).
   */
  private async materializeAttendance(
    tx: Prisma.TransactionClient,
    plan: { id: string; noiDung: string },
    items: MaterializableItem[],
    options: { skipIfExists: boolean }
  ): Promise<void> {
    // Pre-fetch all referenced workShifts once — checkInTime anchors on
    // shift.endTime (clocked-out time of the regular shift) so overtime
    // never overlaps the regular shift even if the user typed an
    // overlapping gioBatDau by accident.
    const workShiftIds = Array.from(
      new Set(items.map(i => i.workShiftId).filter(Boolean))
    ) as string[];
    const workShifts = workShiftIds.length > 0
      ? await tx.workShift.findMany({ where: { id: { in: workShiftIds } } })
      : [];
    const workShiftMap = new Map(workShifts.map(s => [s.id, s]));

    // Iterate in (ngayTangCa, gioBatDau, gioKetThuc) asc order so the
    // "first item wins" tiebreak below is identical on both paths. The
    // approval path gets items ordered only by ngayTangCa (Postgres leaves
    // ties unordered) and the update path gets them in payload order, so the
    // time keys are what make the choice deterministic across both. Times are
    // "HH:mm" strings — lexicographic compare is chronological.
    const orderedItems = [...items].sort((a, b) => {
      const byDate = a.ngayTangCa.getTime() - b.ngayTangCa.getTime();
      if (byDate !== 0) return byDate;
      const byStart = a.gioBatDau.localeCompare(b.gioBatDau);
      if (byStart !== 0) return byStart;
      return a.gioKetThuc.localeCompare(b.gioKetThuc);
    });

    // (employeeId, attendanceDate) pairs already written during this run.
    const writtenKeys = new Set<string>();

    for (const item of orderedItems) {
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

        // One row per (employee, date) per run — see the doc comment above.
        const runKey = `${employee.id}|${item.ngayTangCa.getTime()}`;
        if (writtenKeys.has(runKey)) continue;

        if (options.skipIfExists) {
          const existing = await tx.attendance.findFirst({
            where: { employeeId: employee.id, attendanceDate: item.ngayTangCa, isOvertime: true },
          });
          if (existing) continue; // idempotency: skip-if-exists
        }
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
            overtimePlanId: plan.id,
          },
        });
        writtenKeys.add(runKey);
      }
    }
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

  async getAll(query: OvertimePlanListQuery, callerUserId?: string): Promise<{ plans: any[]; total: number; page: number; totalPages: number }> {
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
    // No-department callers: restrict to participant-or-creator visibility (change no-dept-self-service-access)
    if (callerUserId && !(await this.callerHasDepartment(callerUserId))) {
      const scope = this.participantScope(callerUserId);
      // Intersect the participant scope with any existing where. Where may already have
      // an OR from `query.department`; wrap both as AND conditions so neither is lost.
      if (where.OR) {
        const existingOR = where.OR;
        delete where.OR;
        where.AND = [{ OR: existingOR }, scope];
      } else {
        where.AND = [scope];
      }
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

  async getById(id: string, callerUserId?: string): Promise<any> {
    const plan = await this.findPlanWithItems(id);
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    // No-department callers: deny plans that don't include them as creator or participant
    if (callerUserId && !(await this.callerHasDepartment(callerUserId))) {
      const isCreator = plan.nguoiTaoId === callerUserId;
      const isParticipant = (plan.items || []).some((item: any) =>
        Array.isArray((item as any).nguoiThamGiaIds) && (item as any).nguoiThamGiaIds.includes(callerUserId)
      );
      if (!isCreator && !isParticipant) {
        throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
      }
    }
    return this.populateWithUsers(plan);
  }

  async update(id: string, data: UpdateOvertimePlanRequest, userId: string, isAdmin: boolean, files?: string[]): Promise<any> {
    const plan = await this.findPlanWithItems(id);
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');

    // Terminal statuses are closed to everyone, ADMIN included: editing them
    // would silently rewrite payroll figures for an already-closed period.
    if ((NON_EDITABLE_STATUSES as readonly string[]).includes(plan.trangThai)) {
      throw new ApiError(
        403,
        `Không thể chỉnh sửa kế hoạch ${STATUS_LABELS[plan.trangThai]}`
      );
    }

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

        // Snapshot participant-supplied state before the items are dropped, keyed
        // by value identity (ngayTangCa + gioBatDau + gioKetThuc) — items are
        // recreated on every update, so identity cannot rely on row IDs.
        const priorStateByKey = new Map<
          string,
          { trangThaiTiepNhan: Record<string, string>; gioThucTe: Record<string, any> }
        >();
        for (const prior of plan.items) {
          priorStateByKey.set(
            this.itemIdentityKey(prior.ngayTangCa, prior.gioBatDau, prior.gioKetThuc),
            {
              trangThaiTiepNhan: (prior.trangThaiTiepNhan as Record<string, string>) || {},
              gioThucTe: (prior.gioThucTe as Record<string, any>) || {},
            }
          );
        }

        // Delete-then-recreate for child items
        await tx.overtimePlanItem.deleteMany({ where: { overtimePlanId: id } });
        await tx.overtimePlanItem.createMany({
          data: data.items.map((item, idx) => {
            const resolved = resolvedItems[idx];
            const prior = priorStateByKey.get(
              this.itemIdentityKey(resolved.ngayTangCaDate, item.gioBatDau, item.gioKetThuc)
            );

            // Unchanged item: carry acceptance and actual time over, but only for
            // participants still on the item — a removed participant leaves no
            // orphan entry, and a newly added one defaults to CHUA_TIEP_NHAN.
            const trangThaiTiepNhan: Record<string, string> = {};
            const gioThucTe: Record<string, any> = {};
            resolved.nguoiThamGiaUserIds.forEach(uid => {
              trangThaiTiepNhan[uid] = prior?.trangThaiTiepNhan[uid] ?? 'CHUA_TIEP_NHAN';
              if (prior && prior.gioThucTe[uid] !== undefined) {
                gioThucTe[uid] = prior.gioThucTe[uid];
              }
            });

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
              gioThucTe,
            };
          }),
        });

        // Attendance sync — only for plans already materialized. A CHO_DUYET plan
        // has no attendance yet, so it is left entirely alone. Deletion is scoped
        // by overtimePlanId, so kiosk rows (null link) and other plans' rows are
        // out of scope by construction. Same transaction as the plan/item writes:
        // a regeneration failure rolls the whole edit back.
        if (plan.trangThai === 'DA_DUYET') {
          await tx.attendance.deleteMany({ where: { overtimePlanId: id } });
          await this.materializeAttendance(
            tx,
            { id, noiDung: parentUpdateData.noiDung ?? plan.noiDung },
            data.items.map((item, idx) => ({
              ngayTangCa: resolvedItems[idx].ngayTangCaDate,
              gioBatDau: item.gioBatDau,
              gioKetThuc: item.gioKetThuc,
              workShiftId: item.workShiftId || null,
              nguoiThamGiaIds: resolvedItems[idx].nguoiThamGiaUserIds,
            })),
            { skipIfExists: false }
          );
        }
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

  async approvePlan(planId: string, approverUserId: string, data: ApproveOvertimePlanRequest): Promise<any> {
    const approverUser = await prisma.user.findUnique({ where: { id: approverUserId } });
    if (!approverUser) throw new ApiError(403, 'Không có quyền phê duyệt kế hoạch tăng ca');
    if (approverUser.role !== 'ADMIN') {
      const { isPricingApprover } = await import('@utils/isPricingApprover');
      const approverPayload: any = {
        id: approverUser.id,
        role: approverUser.role,
        departmentId: approverUser.departmentId,
        subDepartmentId: approverUser.subDepartmentId,
        secondaryDepartments: await prisma.userSecondaryDepartment.findMany({ where: { userId: approverUser.id } }).then((rows: any[]) => rows.map(r => ({ departmentId: r.departmentId, subDepartmentId: r.subDepartmentId, role: r.role }))),
      };
      if (!(await isPricingApprover(approverPayload))) {
        throw new ApiError(403, 'Chỉ admin hoặc phòng giá thành mới có quyền phê duyệt kế hoạch tăng ca');
      }
    }

    const plan = await this.findPlanWithItems(planId);
    if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch tăng ca');
    if (plan.trangThai !== 'CHO_DUYET') throw new ValidationError('Kế hoạch tăng ca này đã được xử lý');

    const newStatus = data.trangThai === 'DA_DUYET' ? 'DA_DUYET' : 'TU_CHOI';

    // Atomic: status update + audit fields + attendance fan-out in one transaction.
    // If attendance creation fails, the plan status is NOT committed.
    await prisma.$transaction(async (tx) => {
      await tx.overtimePlan.update({
        where: { id: planId },
        data: {
          trangThai: newStatus as any,
          nguoiDuyetId: approverUserId,
          ngayDuyet: new Date(),
          lyDoTuChoi: newStatus === 'TU_CHOI' ? (data.lyDoTuChoi ?? null) : null,
        },
      });

      if (newStatus === 'DA_DUYET') {
        await this.materializeAttendance(tx, plan, plan.items, { skipIfExists: true });
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

      if (isApproved) {
        await notificationService.notify(NotificationEvent.OVERTIME_PLAN_APPROVED_DEPT, {
          actorUserId: approverUserId,
          entityId: plan.id,
          metadata: { noiDung: plan.noiDung, planId: plan.id },
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
