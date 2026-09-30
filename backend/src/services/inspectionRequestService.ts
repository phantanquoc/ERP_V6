import { InspectionRequestStatus } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import logger from '@config/logger';

interface InspectionRequestItemData {
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  faultRecordId?: string | null;
}

interface CreateInspectionRequestData {
  ngayThang?: Date;
  maYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string | null;
  phongBanId?: string | null;
  fileDinhKem?: string | null;
  items?: InspectionRequestItemData[];
  userId?: string;
}

interface UpdateInspectionRequestData {
  ngayThang?: Date;
  mucDoUuTien?: string;
  ghiChu?: string | null;
  phongBanId?: string | null;
  fileDinhKem?: string | null;
  items?: InspectionRequestItemData[];
}

export interface InspectionRequestFilters {
  search?: string;
  trangThai?: InspectionRequestStatus;
}

interface ActorContext {
  actorId?: string;
  actorRole?: string;
}

const inspectionInclude = {
  items: {
    include: { machineSystem: true, machineSystemDetail: true, faultRecord: true },
    orderBy: { createdAt: 'asc' as const },
  },
  statusLogs: { orderBy: { createdAt: 'asc' as const } },
  repairRequests: { select: { id: true, maYeuCau: true, trangThai: true } },
} as const;

const INSPECTION_ORDER: InspectionRequestStatus[] = [
  InspectionRequestStatus.CHO_XU_LY,
  InspectionRequestStatus.DA_TIEP_NHAN,
  InspectionRequestStatus.DANG_KIEM_TRA,
  InspectionRequestStatus.DA_KIEM_TRA,
  InspectionRequestStatus.HOAN_THANH,
];
const TERMINAL: ReadonlySet<InspectionRequestStatus> = new Set([
  InspectionRequestStatus.HOAN_THANH,
  InspectionRequestStatus.DA_HUY,
  InspectionRequestStatus.TU_CHOI,
]);
const REJECT_ALLOWED_FROM: ReadonlySet<InspectionRequestStatus> = new Set([
  InspectionRequestStatus.CHO_XU_LY,
  InspectionRequestStatus.DA_TIEP_NHAN,
  InspectionRequestStatus.DANG_KIEM_TRA,
]);

function advanceInspection(
  current: InspectionRequestStatus,
  next: InspectionRequestStatus,
  isAdmin: boolean,
): InspectionRequestStatus {
  if (next === current) return current;
  if (isAdmin) {
    if (TERMINAL.has(current)) {
      throw new ValidationError(`Không thể chuyển trạng thái phiếu kiểm tra từ ${current} sang ${next}`);
    }
    return next;
  }
  if (TERMINAL.has(current)) {
    throw new ValidationError(`Không thể chuyển trạng thái phiếu kiểm tra từ ${current} sang ${next}`);
  }
  if (next === InspectionRequestStatus.TU_CHOI) {
    if (!REJECT_ALLOWED_FROM.has(current)) {
      throw new ValidationError(`Không thể từ chối phiếu ở trạng thái ${current}`);
    }
    return next;
  }
  if (next === InspectionRequestStatus.DA_HUY) {
    if (!REJECT_ALLOWED_FROM.has(current)) {
      throw new ValidationError(`Không thể hủy phiếu ở trạng thái ${current}`);
    }
    return next;
  }
  const ci = INSPECTION_ORDER.indexOf(current);
  const ni = INSPECTION_ORDER.indexOf(next);
  if (ci !== -1 && ni === ci + 1) return next;
  throw new ValidationError(`Không thể chuyển trạng thái phiếu kiểm tra từ ${current} sang ${next}`);
}

class InspectionRequestService {
  async generateInspectionRequestCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.inspectionRequest.findFirst({
      where: { maYeuCau: yearlyCodeWhere('YC-KT', year) },
      orderBy: { maYeuCau: 'desc' },
      select: { maYeuCau: true },
    });
    return nextYearlyCode(last?.maYeuCau ?? null, 'YC-KT', year);
  }

  async getAllInspectionRequests(page = 1, limit = 10, filters?: InspectionRequestFilters) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);
    const where: Record<string, unknown> = {};
    if (filters?.search) {
      (where as { OR: unknown[] }).OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' } },
        { ghiChu: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.trangThai) (where as Record<string, unknown>).trangThai = filters.trangThai;
    const [data, total] = await Promise.all([
      (prisma.inspectionRequest as unknown as { findMany: (a: unknown) => Promise<unknown[]> }).findMany({
        where: where as never,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: inspectionInclude as never,
      }),
      (prisma.inspectionRequest as unknown as { count: (a: unknown) => Promise<number> }).count({ where: where as never }),
    ]);
    return { data, pagination: { page, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) } };
  }

  async getInspectionRequestById(id: number) {
    const row = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<Record<string, unknown> | null> }).findUnique({
      where: { id },
      include: inspectionInclude as never,
    });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    return row;
  }

  private async resolveItems(items: InspectionRequestItemData[] = []) {
    return Promise.all(
      items.map(async (item) => {
        let machineSystem = item.machineSystemId
          ? await (prisma.machineSystem as unknown as { findUnique: (a: unknown) => Promise<{ id: string; tenHeThong: string } | null> }).findUnique({ where: { id: item.machineSystemId } })
          : null;
        let machineSystemDetail = item.machineSystemDetailId
          ? await (prisma.machineSystemDetail as unknown as { findUnique: (a: unknown) => Promise<{ id: string; tenChiTiet: string; machineSystemId: string; machineSystem: { id: string; tenHeThong: string } } | null> }).findUnique({
              where: { id: item.machineSystemDetailId },
              include: { machineSystem: true } as never,
            })
          : null;
        if (item.machineSystemId && !machineSystem) throw new ValidationError('Hệ thống máy không hợp lệ');
        if (item.machineSystemDetailId && !machineSystemDetail) throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
        if (machineSystemDetail) {
          if (machineSystem && machineSystem.id !== machineSystemDetail.machineSystemId) {
            throw new ValidationError('Chi tiết máy không thuộc hệ thống máy đã chọn');
          }
          machineSystem = machineSystemDetail.machineSystem as unknown as typeof machineSystem;
        }
        let faultRecordId: string | null = null;
        if (item.faultRecordId) {
          const fr = await (prisma.faultRecord as unknown as { findUnique: (a: unknown) => Promise<{ id: string } | null> }).findUnique({ where: { id: item.faultRecordId } });
          if (!fr) throw new ValidationError(`Bản ghi lỗi không tồn tại: ${item.faultRecordId}`);
          faultRecordId = fr.id;
        }
        return {
          machineSystemId: machineSystem?.id ?? null,
          machineSystemDetailId: machineSystemDetail?.id ?? null,
          tenHeThong: machineSystem ? machineSystem.tenHeThong : item.tenHeThong,
          tinhTrangThietBi: machineSystemDetail && !item.tinhTrangThietBi ? machineSystemDetail.tenChiTiet : item.tinhTrangThietBi,
          loaiLoi: item.loaiLoi,
          noiDungLoi: item.noiDungLoi,
          faultRecordId,
        };
      }),
    );
  }

  private async resolvePhongBanLabelFromUser(userId: string): Promise<string | null> {
    try {
      const emp = await (prisma.employee as unknown as { findFirst: (a: unknown) => Promise<{ subDepartment?: { name: string; department?: { name: string } | null } | null } | null> }).findFirst({
        where: { userId },
        include: { subDepartment: { include: { department: true } }, position: true } as never,
      });
      if (!emp) return null;
      const sub = (emp as unknown as { subDepartment?: { name?: string; department?: { name?: string } | null } | null }).subDepartment;
      if (sub?.name) return sub.name;
      if (sub?.department?.name) return sub.department.name;
      return null;
    } catch {
      return null;
    }
  }

  async createInspectionRequest(data: CreateInspectionRequestData) {
    if ((data as unknown as Record<string, unknown>).trangThai !== undefined) {
      logger.warn(`Ignored client-supplied trangThai on inspection create (maYeuCau: ${data.maYeuCau})`);
    }
    // Auto-resolve phongBanId -> department name when caller didn't supply it but we have userId
    let resolvedPhongBanId: string | null = data.phongBanId ?? null;
    if ((resolvedPhongBanId === null || resolvedPhongBanId === undefined || String(resolvedPhongBanId).trim() === '') && data.userId) {
      const label = await this.resolvePhongBanLabelFromUser(data.userId);
      if (label) resolvedPhongBanId = label;
      else resolvedPhongBanId = null;
    }
    const resolvedItems = await this.resolveItems(data.items);
    let createdByName: string | null = null;
    if (data.userId) {
      const user = await (prisma.user as unknown as { findUnique: (a: unknown) => Promise<{ firstName: string; lastName: string } | null> }).findUnique({
        where: { id: data.userId },
        select: { firstName: true, lastName: true } as never,
      });
      if (user) createdByName = `${(user as { lastName: string }).lastName} ${(user as { firstName: string }).firstName}`.trim();
    }
    const row = await (prisma.$transaction as unknown as (fn: (tx: typeof prisma) => Promise<unknown>) => Promise<Record<string, unknown>>)(async (tx: typeof prisma) => {
      const t = tx as unknown as {
        inspectionRequest: { create: (a: unknown) => Promise<{ id: number }> };
        inspectionRequestItem: { createMany: (a: unknown) => Promise<unknown> };
        inspectionRequestStatusLog: { create: (a: unknown) => Promise<unknown> };
      };
      const created = await t.inspectionRequest.create({
        data: {
          ngayThang: data.ngayThang ?? new Date(),
          maYeuCau: data.maYeuCau,
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu ?? null,
          phongBanId: resolvedPhongBanId ?? null,
          fileDinhKem: data.fileDinhKem ?? null,
          createdById: data.userId ?? null,
          createdByName,
          trangThai: InspectionRequestStatus.CHO_XU_LY,
        } as never,
      });
      if (resolvedItems.length > 0) {
        await t.inspectionRequestItem.createMany({
          data: resolvedItems.map((it) => ({ inspectionRequestId: created.id, ...it })),
        });
      }
      await t.inspectionRequestStatusLog.create({
        data: {
          inspectionRequestId: created.id,
          oldStatus: null,
          newStatus: InspectionRequestStatus.CHO_XU_LY,
          actorId: data.userId ?? null,
          reason: 'create',
        } as never,
      });
      return (tx as unknown as { inspectionRequest: { findUnique: (a: unknown) => Promise<Record<string, unknown>> } }).inspectionRequest.findUnique({
        where: { id: created.id },
        include: inspectionInclude as never,
      }) as Promise<Record<string, unknown>>;
    });
    return row;
  }

  async updateInspectionRequest(id: number, data: UpdateInspectionRequestData) {
    await this.getInspectionRequestById(id);
    if ((data as unknown as Record<string, unknown>).trangThai !== undefined) {
      logger.warn(`Ignored client-supplied trangThai on inspection update (id: ${id})`);
    }
    const { items, ...scalar } = data as UpdateInspectionRequestData & { trangThai?: string };
    // Strip trangThai if present
    delete (scalar as Record<string, unknown>).trangThai;
    const resolvedItems = items !== undefined ? await this.resolveItems(items) : undefined;
    const updated = await (prisma.$transaction as unknown as (fn: (tx: typeof prisma) => Promise<unknown>) => Promise<Record<string, unknown>>)(async (tx: typeof prisma) => {
      const t = tx as unknown as {
        inspectionRequestItem: { deleteMany: (a: unknown) => Promise<unknown>; createMany: (a: unknown) => Promise<unknown> };
        inspectionRequest: { update: (a: unknown) => Promise<Record<string, unknown>>; findUnique: (a: unknown) => Promise<Record<string, unknown>> };
      };
      if (resolvedItems !== undefined) {
        await t.inspectionRequestItem.deleteMany({ where: { inspectionRequestId: id } });
        if (resolvedItems.length > 0) {
          await t.inspectionRequestItem.createMany({
            data: resolvedItems.map((it) => ({ inspectionRequestId: id, ...it })),
          });
        }
      }
      const out = await t.inspectionRequest.update({
        where: { id },
        data: scalar as never,
        include: inspectionInclude as never,
      });
      return out;
    });
    return updated;
  }

  async deleteInspectionRequest(id: number) {
    await this.getInspectionRequestById(id);
    await (prisma.inspectionRequest as unknown as { delete: (a: unknown) => Promise<unknown> }).delete({ where: { id } });
    return { message: 'Xóa phiếu kiểm tra thành công' };
  }

  private async transition(id: number, next: InspectionRequestStatus, actor: ActorContext, reason: string) {
    const result = await (prisma.$transaction as unknown as (fn: (tx: typeof prisma) => Promise<unknown>) => Promise<Record<string, unknown> | null>)(async (tx: typeof prisma) => {
      const t = tx as unknown as {
        inspectionRequest: { findUnique: (a: unknown) => Promise<{ id: number; trangThai: InspectionRequestStatus; maYeuCau: string } | null>; update: (a: unknown) => Promise<unknown>; findUnique2: (a: unknown) => Promise<Record<string, unknown> | null> };
        inspectionRequestStatusLog: { create: (a: unknown) => Promise<unknown> };
      };
      const row = await (tx as unknown as { inspectionRequest: { findUnique: (a: unknown) => Promise<{ id: number; trangThai: InspectionRequestStatus; maYeuCau: string } | null> } }).inspectionRequest.findUnique({
        where: { id },
        select: { id: true, trangThai: true, maYeuCau: true },
      });
      if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
      const validated = advanceInspection(row.trangThai, next, actor.actorRole === 'ADMIN');
      if (validated === row.trangThai) {
        return (tx as unknown as { inspectionRequest: { findUnique: (a: unknown) => Promise<Record<string, unknown>> } }).inspectionRequest.findUnique({ where: { id }, include: inspectionInclude as never }) as Promise<Record<string, unknown>>;
      }
      await (tx as unknown as { inspectionRequest: { update: (a: unknown) => Promise<unknown> } }).inspectionRequest.update({ where: { id }, data: { trangThai: validated } as never });
      await t.inspectionRequestStatusLog.create({
        data: { inspectionRequestId: id, oldStatus: row.trangThai, newStatus: validated, actorId: actor.actorId ?? null, actorRole: actor.actorRole ?? null, reason } as never,
      });
      return (tx as unknown as { inspectionRequest: { findUnique: (a: unknown) => Promise<Record<string, unknown>> } }).inspectionRequest.findUnique({ where: { id }, include: inspectionInclude as never }) as Promise<Record<string, unknown>>;
    });
    return result;
  }

  async accept(id: number, actor: ActorContext) {
    return this.transition(id, InspectionRequestStatus.DA_TIEP_NHAN, actor, 'accept');
  }
  async startInspection(id: number, actor: ActorContext) {
    const row = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<{ id: number; trangThai: InspectionRequestStatus } | null> }).findUnique({ where: { id }, select: { id: true, trangThai: true } });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    let nguoiKiemTra: string | null = null;
    if (actor.actorId) {
      const user = await (prisma.user as unknown as { findUnique: (a: unknown) => Promise<{ firstName: string; lastName: string } | null> }).findUnique({ where: { id: actor.actorId }, select: { firstName: true, lastName: true } as never });
      if (user) nguoiKiemTra = `${(user as { lastName: string }).lastName} ${(user as { firstName: string }).firstName}`.trim();
    }
    const result = await this.transition(id, InspectionRequestStatus.DANG_KIEM_TRA, actor, 'startInspection');
    // auto-fill thoiGianKiemTra/nguoiKiemTra after transition
    if (result && (result as Record<string, unknown>).trangThai === InspectionRequestStatus.DANG_KIEM_TRA) {
      await (prisma.inspectionRequest as unknown as { update: (a: unknown) => Promise<unknown> }).update({
        where: { id },
        data: { thoiGianKiemTra: new Date(), ...(nguoiKiemTra ? { nguoiKiemTra } : {}) } as never,
      });
      return this.getInspectionRequestById(id);
    }
    return result;
  }
  async updateInspectionDetails(id: number, data: { ketQuaKiemTra?: string | null; mucDoHuHong?: string | null; deXuatXuLy?: string | null; ketLuan?: string | null; anhKiemTra?: string | null; thoiGianKiemTra?: Date | string | null; nguoiKiemTra?: string | null }, _actor: ActorContext) {
    const row = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<{ id: number; trangThai: InspectionRequestStatus } | null> }).findUnique({ where: { id }, select: { id: true, trangThai: true } });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    if (row.trangThai !== InspectionRequestStatus.DANG_KIEM_TRA && row.trangThai !== InspectionRequestStatus.DA_KIEM_TRA) {
      throw new ValidationError('Chỉ được cập nhật chi tiết kiểm tra ở trạng thái Đang kiểm tra / Đã kiểm tra');
    }
    const allowed: Record<string, unknown> = {};
    for (const k of ['ketQuaKiemTra', 'mucDoHuHong', 'deXuatXuLy', 'ketLuan', 'anhKiemTra', 'thoiGianKiemTra', 'nguoiKiemTra'] as const) {
      if (k in data) (allowed as Record<string, unknown>)[k] = (data as Record<string, unknown>)[k];
    }
    if (allowed.thoiGianKiemTra && typeof allowed.thoiGianKiemTra === 'string') allowed.thoiGianKiemTra = new Date(allowed.thoiGianKiemTra as string);
    await (prisma.inspectionRequest as unknown as { update: (a: unknown) => Promise<unknown> }).update({ where: { id }, data: allowed as never });
    // audit log: status unchanged (update_details), never break main update on log failure
    try {
      const snapshot: Record<string, unknown> = {};
      if ('ketQuaKiemTra' in allowed) snapshot.ketQuaKiemTra = allowed.ketQuaKiemTra;
      if ('ketLuan' in allowed) snapshot.ketLuan = allowed.ketLuan;
      const reason = Object.keys(snapshot).length > 0 ? `update_details ${JSON.stringify(snapshot)}` : 'update_details';
      await (prisma.inspectionRequestStatusLog as unknown as { create: (a: unknown) => Promise<unknown> }).create({
        data: {
          inspectionRequestId: id,
          oldStatus: row.trangThai,
          newStatus: row.trangThai,
          actorId: _actor?.actorId ?? null,
          actorRole: _actor?.actorRole ?? null,
          reason,
        } as never,
      });
    } catch (e) {
      logger.warn(`[inspectionRequest] statusLog failed for update_details id=${id}: ${(e as Error).message}`);
    }
    return this.getInspectionRequestById(id);
  }
  async submitInspection(id: number, actor: ActorContext) {
    const row = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<Record<string, unknown> | null> }).findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    if ((row as Record<string, unknown>).trangThai !== InspectionRequestStatus.DANG_KIEM_TRA) {
      throw new ValidationError('Chỉ được hoàn tất kiểm tra khi đang ở trạng thái Đang kiểm tra');
    }
    if (!(row as Record<string, unknown>).ketQuaKiemTra) {
      throw new ValidationError('Vui lòng nhập kết quả kiểm tra thực tế trước khi hoàn tất');
    }
    if (!(row as Record<string, unknown>).ketLuan) {
      throw new ValidationError('Vui lòng chọn kết luận kiểm tra trước khi hoàn tất');
    }
    return this.transition(id, InspectionRequestStatus.DA_KIEM_TRA, actor, 'submitInspection');
  }
  async complete(id: number, actor: ActorContext) {
    const row = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<Record<string, unknown> | null> }).findUnique({ where: { id } });
    if (!row) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    const s = (row as Record<string, unknown>).trangThai as InspectionRequestStatus;
    const ketLuan = (row as Record<string, unknown>).ketLuan as string | null | undefined;
    // Spec: DA_KIEM_TRA -> HOAN_THANH always; DA_TIEP_NHAN -> HOAN_THANH only when KHONG_CAN (and admin can skip)
    if (s === InspectionRequestStatus.DA_TIEP_NHAN) {
      if (ketLuan !== 'KHONG_CAN' && actor.actorRole !== 'ADMIN') {
        throw new ValidationError('Chỉ được hoàn thành trực tiếp từ Đã tiếp nhận khi kết luận là KHÔNG CẦN');
      }
      return this.transition(id, InspectionRequestStatus.HOAN_THANH, actor, 'complete_direct');
    }
    if (s === InspectionRequestStatus.DANG_KIEM_TRA && actor.actorRole === 'ADMIN') {
      return this.transition(id, InspectionRequestStatus.HOAN_THANH, actor, 'complete_admin');
    }
    return this.transition(id, InspectionRequestStatus.HOAN_THANH, actor, 'complete');
  }
  async reject(id: number, actor: ActorContext, reason?: string) {
    return this.transition(id, InspectionRequestStatus.TU_CHOI, actor, reason ?? 'reject');
  }
  async cancel(id: number, actor: ActorContext, reason?: string) {
    return this.transition(id, InspectionRequestStatus.DA_HUY, actor, reason ?? (actor.actorRole === 'ADMIN' ? 'admin_override' : 'user_cancel'));
  }

  async getStats(filters?: { dateFrom?: Date; dateTo?: Date }) {
    const now = new Date();
    const dateTo = filters?.dateTo ?? now;
    const windowMs = filters?.dateFrom ? dateTo.getTime() - filters.dateFrom.getTime() : 90 * 24 * 60 * 60 * 1000;
    const dateFrom = filters?.dateFrom ?? new Date(dateTo.getTime() - windowMs);
    const prevDateTo = new Date(dateFrom.getTime() - 1);
    const prevDateFrom = new Date(prevDateTo.getTime() - windowMs);
    const buildWhere = (from: Date, to: Date): Record<string, unknown> => ({ createdAt: { gte: from, lte: to } });
    const currentWhere = buildWhere(dateFrom, dateTo);
    const prevWhere = buildWhere(prevDateFrom, prevDateTo);
    const countByStatus = async (where: Record<string, unknown>) => {
      const rows = await (prisma.inspectionRequest as unknown as { groupBy: (a: unknown) => Promise<Array<{ trangThai: string; _count: { _all: number } }>> }).groupBy({ by: ['trangThai'], where: where as never, _count: { _all: true } });
      const counts: Record<string, number> = { CHO_XU_LY: 0, DA_TIEP_NHAN: 0, DANG_KIEM_TRA: 0, DA_KIEM_TRA: 0, HOAN_THANH: 0, DA_HUY: 0, TU_CHOI: 0 };
      for (const r of rows) counts[r.trangThai] = r._count._all;
      return counts;
    };
    const [total, byStatus, prevByStatus, prevTotal] = await Promise.all([
      (prisma.inspectionRequest as unknown as { count: (a: unknown) => Promise<number> }).count({ where: currentWhere as never }),
      countByStatus(currentWhere),
      countByStatus(prevWhere),
      (prisma.inspectionRequest as unknown as { count: (a: unknown) => Promise<number> }).count({ where: prevWhere as never }),
    ]);
    const delta: Record<string, unknown> = {
      total: total - prevTotal,
      byStatus: Object.fromEntries(Object.keys(byStatus).map((k) => [k, (byStatus[k] ?? 0) - (prevByStatus[k] ?? 0)])),
    };
    return { total, byStatus, delta, window: { dateFrom, dateTo } };
  }

  async getStatusHistory(id: number) {
    const exists = await (prisma.inspectionRequest as unknown as { findUnique: (a: unknown) => Promise<{ id: number } | null> }).findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundError('Không tìm thấy phiếu kiểm tra');
    const logs = await (prisma.inspectionRequestStatusLog as unknown as { findMany: (a: unknown) => Promise<Array<Record<string, unknown>>> }).findMany({
      where: { inspectionRequestId: id },
      orderBy: { createdAt: 'asc' },
    });
    const actorIds = [...new Set(logs.map((l) => l.actorId as string).filter(Boolean))];
    let actorNames = new Map<string, string>();
    if (actorIds.length > 0) {
      const users = await (prisma.user as unknown as { findMany: (a: unknown) => Promise<Array<{ id: string; firstName: string; lastName: string }>> }).findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true } as never,
      });
      users.forEach((u) => actorNames.set(u.id, `${u.lastName} ${u.firstName}`.trim()));
    }
    return logs.map((l) => ({ ...l, actorName: (l.actorId as string) ? (actorNames.get(l.actorId as string) ?? null) : null }));
  }
}

export default new InspectionRequestService();
