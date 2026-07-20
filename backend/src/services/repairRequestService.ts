import { Prisma, RepairRequestStatus, FaultRecordStatus } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import { NotificationEvent } from '@types';
import notificationService from './notificationService';
import {
  advanceRepairRequestStatus,
} from '@utils/statusTransitions';
import ExcelJS from 'exceljs';
import logger from '@config/logger';

interface RepairRequestItemData {
  machineSystemId?: string;
  machineSystemDetailId?: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  loaiLoi: string;
  noiDungLoi: string;
  /** Optional link to a FaultRecord — must be in DANG_THEO_DOI or TAI_PHAT */
  faultRecordId?: string | null;
}

interface CreateRepairRequestData {
  ngayThang: Date;
  maYeuCau: string;
  // @deprecated — kept for backward compatibility
  tenHeThong?: string;
  // @deprecated — kept for backward compatibility
  tinhTrangThietBi?: string;
  // @deprecated — kept for backward compatibility
  loaiLoi?: string;
  mucDoUuTien: string;
  // @deprecated — kept for backward compatibility
  noiDungLoi?: string;
  ghiChu?: string;
  /** Ignored — status is always seeded as CHO_XU_LY on create */
  trangThai?: string;
  fileDinhKem?: string;
  items?: RepairRequestItemData[];
  userId?: string;
}

interface UpdateRepairRequestData {
  ngayThang?: Date;
  tenHeThong?: string;
  tinhTrangThietBi?: string;
  loaiLoi?: string;
  mucDoUuTien?: string;
  noiDungLoi?: string;
  ghiChu?: string;
  /** Ignored — trangThai can only be changed through business-event endpoints */
  trangThai?: string;
  fileDinhKem?: string;
  items?: RepairRequestItemData[];
}

export interface RepairRequestFilters {
  search?: string;
  trangThai?: RepairRequestStatus;
}

interface ActorContext {
  actorId?: string;
  actorRole?: string;
}

const repairRequestInclude = {
  acceptanceHandovers: {
    include: {
      items: {
        include: {
          repairRequestItem: true,
          machineSystem: true,
          machineSystemDetail: true,
        },
      },
    },
  },
  items: {
    include: {
      machineSystem: true,
      machineSystemDetail: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.RepairRequestInclude;

type ResolvedRepairRequestItemData = Omit<RepairRequestItemData, 'machineSystemId' | 'machineSystemDetailId'> & {
  machineSystemId: string | null;
  machineSystemDetailId: string | null;
  faultRecordId?: string | null;
};

class RepairRequestService {
  async generateRepairRequestCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.repairRequest.findFirst({
      where: { maYeuCau: yearlyCodeWhere('YC-SC', year) },
      orderBy: { maYeuCau: 'desc' },
      select: { maYeuCau: true },
    });
    return nextYearlyCode(last?.maYeuCau ?? null, 'YC-SC', year);
  }

  /**
   * Get all repair requests with pagination and optional filters
   */
  async getAllRepairRequests(page: number = 1, limit: number = 10, filters?: RepairRequestFilters) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: Prisma.RepairRequestWhereInput = {};
    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThong: { contains: filters.search, mode: 'insensitive' } },
        { noiDungLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.trangThai) {
      where.trangThai = filters.trangThai;
    }

    const [data, total] = await Promise.all([
      prisma.repairRequest.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: repairRequestInclude,
      }),
      prisma.repairRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get repair request by ID
   */
  async getRepairRequestById(id: number) {
    const request = await prisma.repairRequest.findUnique({
      where: { id },
      include: repairRequestInclude,
    });

    if (!request) {
      throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');
    }

    return request;
  }

  private async resolveRepairItems(items: RepairRequestItemData[] = []): Promise<ResolvedRepairRequestItemData[]> {
    return Promise.all(items.map(async (item) => {
      let machineSystem = item.machineSystemId
        ? await prisma.machineSystem.findUnique({ where: { id: item.machineSystemId } })
        : null;

      let machineSystemDetail = item.machineSystemDetailId
        ? await prisma.machineSystemDetail.findUnique({
            where: { id: item.machineSystemDetailId },
            include: { machineSystem: true },
          })
        : null;

      if (item.machineSystemId && !machineSystem) {
        throw new ValidationError('Hệ thống máy không hợp lệ');
      }

      if (item.machineSystemDetailId && !machineSystemDetail) {
        throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
      }

      if (machineSystemDetail) {
        if (machineSystem && machineSystem.id !== machineSystemDetail.machineSystemId) {
          throw new ValidationError('Chi tiết máy không thuộc hệ thống máy đã chọn');
        }
        machineSystem = machineSystemDetail.machineSystem;
      }

      // Task 5.4: validate faultRecordId — must exist and be in DANG_THEO_DOI or TAI_PHAT
      let resolvedFaultRecordId: string | null = null;
      if (item.faultRecordId) {
        const fr = await prisma.faultRecord.findUnique({
          where: { id: item.faultRecordId },
          select: { id: true, trangThai: true },
        });
        if (!fr) {
          throw new ValidationError(`Bản ghi lỗi không tồn tại: ${item.faultRecordId}`);
        }
        const allowedStatuses: FaultRecordStatus[] = [FaultRecordStatus.DANG_THEO_DOI, FaultRecordStatus.TAI_PHAT];
        if (!allowedStatuses.includes(fr.trangThai)) {
          throw new ValidationError(`Bản ghi lỗi phải ở trạng thái Đang theo dõi hoặc Tái phát để liên kết`);
        }
        resolvedFaultRecordId = fr.id;
      }

      return {
        ...item,
        machineSystemId: machineSystem?.id ?? null,
        machineSystemDetailId: machineSystemDetail?.id ?? null,
        tenHeThong: machineSystem ? machineSystem.tenHeThong : item.tenHeThong,
        tinhTrangThietBi: machineSystemDetail && !item.tinhTrangThietBi
          ? machineSystemDetail.tenChiTiet
          : item.tinhTrangThietBi,
        faultRecordId: resolvedFaultRecordId,
      };
    }));
  }

  /**
   * Create new repair request.
   * Always seeds trangThai = CHO_XU_LY regardless of client input.
   */
  async createRepairRequest(data: CreateRepairRequestData) {
    if (data.trangThai !== undefined) {
      logger.warn(`Ignored client-supplied trangThai on repair-request create (maYeuCau: ${data.maYeuCau})`);
    }

    const resolvedItems = await this.resolveRepairItems(data.items);
    const firstItem = resolvedItems.length > 0 ? resolvedItems[0] : null;

    // Fetch user fullName if userId is provided
    let createdByName: string | null = null;
    if (data.userId) {
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        createdByName = `${user.lastName} ${user.firstName}`.trim();
      }
    }

    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.repairRequest.create({
        data: {
          ngayThang: data.ngayThang,
          maYeuCau: data.maYeuCau,
          tenHeThong: firstItem ? firstItem.tenHeThong : (data.tenHeThong ?? null),
          tinhTrangThietBi: firstItem ? firstItem.tinhTrangThietBi : (data.tinhTrangThietBi ?? null),
          loaiLoi: firstItem ? firstItem.loaiLoi : (data.loaiLoi ?? null),
          noiDungLoi: firstItem ? firstItem.noiDungLoi : (data.noiDungLoi ?? null),
          mucDoUuTien: data.mucDoUuTien,
          ghiChu: data.ghiChu,
          trangThai: RepairRequestStatus.CHO_XU_LY,
          fileDinhKem: data.fileDinhKem,
          createdById: data.userId ?? null,
          createdByName,
        },
      });

      if (data.items && data.items.length > 0) {
        await tx.repairRequestItem.createMany({
          data: resolvedItems.map((item) => ({
            repairRequestId: created.id,
            machineSystemId: item.machineSystemId,
            machineSystemDetailId: item.machineSystemDetailId,
            tenHeThong: item.tenHeThong,
            tinhTrangThietBi: item.tinhTrangThietBi,
            loaiLoi: item.loaiLoi,
            noiDungLoi: item.noiDungLoi,
            faultRecordId: item.faultRecordId ?? null,
          })),
        });
      }

      return tx.repairRequest.findUnique({
        where: { id: created.id },
        include: repairRequestInclude,
      });
    });

    // Notify quality personnel + admin
    notificationService.notify(NotificationEvent.REPAIR_REQUEST_CREATED, {
      entityId: String(request!.id),
      metadata: {
        maYeuCau: request!.maYeuCau,
        tenHeThong: request!.tenHeThong,
      },
    }).catch(() => {});

    return request;
  }

  /**
   * Update repair request — trangThai field is silently dropped with a warning.
   */
  async updateRepairRequest(id: number, data: UpdateRepairRequestData) {
    const existing = await this.getRepairRequestById(id);

    if ('trangThai' in data && data.trangThai !== undefined) {
      logger.warn(`Ignored client-supplied trangThai on repair-request update (id: ${id})`);
    }

    // Strip trangThai from update payload — status is controlled by business-event endpoints only
    const { items, trangThai: _dropped, ...scalarData } = data;
    const resolvedItems = items !== undefined ? await this.resolveRepairItems(items) : undefined;

    const updated = await prisma.$transaction(async (tx) => {
      if (resolvedItems !== undefined) {
        await tx.repairRequestItem.deleteMany({ where: { repairRequestId: id } });

        if (resolvedItems.length > 0) {
          await tx.repairRequestItem.createMany({
            data: resolvedItems.map((item) => ({
              repairRequestId: id,
              machineSystemId: item.machineSystemId,
              machineSystemDetailId: item.machineSystemDetailId,
              tenHeThong: item.tenHeThong,
              tinhTrangThietBi: item.tinhTrangThietBi,
              loaiLoi: item.loaiLoi,
              noiDungLoi: item.noiDungLoi,
              faultRecordId: item.faultRecordId ?? null,
            })),
          });

          const firstItem = resolvedItems[0];
          scalarData.tenHeThong = firstItem.tenHeThong;
          scalarData.tinhTrangThietBi = firstItem.tinhTrangThietBi;
          scalarData.loaiLoi = firstItem.loaiLoi;
          scalarData.noiDungLoi = firstItem.noiDungLoi;
        }
      }

      return tx.repairRequest.update({
        where: { id },
        data: scalarData,
        include: repairRequestInclude,
      });
    });

    // Notify update (non-status edit)
    notificationService.notify(NotificationEvent.REPAIR_REQUEST_UPDATED, {
      entityId: String(updated.id),
      metadata: {
        maYeuCau: updated.maYeuCau,
        tenHeThong: updated.tenHeThong,
        status: updated.trangThai,
      },
    }).catch(() => {});

    // suppress unused variable warning
    void existing;

    return updated;
  }

  /**
   * Start repair: CHO_XU_LY → DANG_SUA_CHUA
   */
  async startRepair(id: number, actor: ActorContext) {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.repairRequest.findUnique({
        where: { id },
        select: { id: true, trangThai: true, maYeuCau: true },
      });
      if (!request) throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');

      const nextStatus = advanceRepairRequestStatus(
        request.trangThai,
        RepairRequestStatus.DANG_SUA_CHUA,
        { bypass: actor.actorRole === 'ADMIN' }
      );

      // No-op: already at target status — return unchanged without log row
      if (nextStatus === request.trangThai) {
        return tx.repairRequest.findUnique({
          where: { id },
          include: repairRequestInclude,
        });
      }

      await tx.repairRequest.update({
        where: { id },
        data: { trangThai: nextStatus },
      });

      await tx.repairRequestStatusLog.create({
        data: {
          repairRequestId: id,
          oldStatus: request.trangThai,
          newStatus: nextStatus,
          actorId: actor.actorId ?? null,
          actorRole: actor.actorRole ?? null,
          reason: 'start_repair',
        },
      });

      return tx.repairRequest.findUnique({
        where: { id },
        include: repairRequestInclude,
      });
    });

    // Emit update notification after commit
    notificationService.notify(NotificationEvent.REPAIR_REQUEST_UPDATED, {
      entityId: String(id),
      metadata: {
        maYeuCau: result?.maYeuCau,
        status: result?.trangThai,
      },
    }).catch(() => {});

    return result;
  }

  /**
   * Cancel: any non-terminal → DA_HUY
   */
  async cancel(id: number, actor: ActorContext, opts?: { reason?: string }) {
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.repairRequest.findUnique({
        where: { id },
        select: { id: true, trangThai: true, maYeuCau: true },
      });
      if (!request) throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');

      const nextStatus = advanceRepairRequestStatus(
        request.trangThai,
        RepairRequestStatus.DA_HUY,
        { bypass: actor.actorRole === 'ADMIN' }
      );

      await tx.repairRequest.update({
        where: { id },
        data: { trangThai: nextStatus },
      });

      const reason = opts?.reason ?? (actor.actorRole === 'ADMIN' ? 'admin_override' : 'user_cancel');
      await tx.repairRequestStatusLog.create({
        data: {
          repairRequestId: id,
          oldStatus: request.trangThai,
          newStatus: nextStatus,
          actorId: actor.actorId ?? null,
          actorRole: actor.actorRole ?? null,
          reason,
        },
      });

      return tx.repairRequest.findUnique({
        where: { id },
        include: repairRequestInclude,
      });
    });

    // Emit update notification after commit
    notificationService.notify(NotificationEvent.REPAIR_REQUEST_UPDATED, {
      entityId: String(id),
      metadata: {
        maYeuCau: result?.maYeuCau,
        status: result?.trangThai,
      },
    }).catch(() => {});

    return result;
  }

  /**
   * Get status history for a repair request
   */
  async getStatusHistory(id: number) {
    // Verify the request exists
    const exists = await prisma.repairRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundError('Không tìm thấy yêu cầu sửa chữa');

    const logs = await prisma.repairRequestStatusLog.findMany({
      where: { repairRequestId: id },
      orderBy: { createdAt: 'asc' },
    });

    // Hydrate actor display names
    const actorIds = [...new Set(logs.map((log) => log.actorId).filter(Boolean))] as string[];
    let actorNames: Map<string, string> = new Map();

    if (actorIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true },
      });
      users.forEach((user) => {
        actorNames.set(user.id, `${user.lastName} ${user.firstName}`.trim());
      });
    }

    return logs.map((log) => ({
      ...log,
      actorName: log.actorId ? (actorNames.get(log.actorId) ?? null) : null,
    }));
  }

  /**
   * Get stats aggregates for the RepairRequest dashboard.
   * D5: default window [now-90d, now]; delta against preceding equal-length window.
   */
  async getStats(filters?: { dateFrom?: Date; dateTo?: Date; machineSystemId?: string }) {
    const now = new Date();
    const dateTo = filters?.dateTo ?? now;
    const windowMs = filters?.dateFrom
      ? dateTo.getTime() - filters.dateFrom.getTime()
      : 90 * 24 * 60 * 60 * 1000;
    const dateFrom = filters?.dateFrom ?? new Date(dateTo.getTime() - windowMs);

    // Previous window for delta
    const prevDateTo = new Date(dateFrom.getTime() - 1); // 1ms before dateFrom
    const prevDateFrom = new Date(prevDateTo.getTime() - windowMs);

    // Base where for current window
    const buildWhere = (from: Date, to: Date): Prisma.RepairRequestWhereInput => {
      const where: Prisma.RepairRequestWhereInput = {
        createdAt: { gte: from, lte: to },
      };
      if (filters?.machineSystemId) {
        where.items = { some: { machineSystemId: filters.machineSystemId } };
      }
      return where;
    };

    const currentWhere = buildWhere(dateFrom, dateTo);
    const prevWhere = buildWhere(prevDateFrom, prevDateTo);

    // ── Helper: count by status ───────────────────────────────────────────────
    const countByStatus = async (where: Prisma.RepairRequestWhereInput) => {
      const results = await prisma.repairRequest.groupBy({
        by: ['trangThai'],
        where,
        _count: { _all: true },
      });
      const counts: Record<string, number> = {
        CHO_XU_LY: 0,
        DANG_SUA_CHUA: 0,
        HOAN_THANH: 0,
        DA_HUY: 0,
      };
      for (const r of results) {
        counts[r.trangThai] = r._count._all;
      }
      return counts;
    };

    // ── Helper: avg completion hours ──────────────────────────────────────────
    const avgCompletionHours = async (where: Prisma.RepairRequestWhereInput): Promise<number | null> => {
      // Join with repairRequestStatusLogs to find HOAN_THANH transition time
      const completedLogs = await prisma.repairRequestStatusLog.findMany({
        where: {
          newStatus: RepairRequestStatus.HOAN_THANH,
          repairRequest: where,
        },
        select: {
          repairRequestId: true,
          createdAt: true,
          repairRequest: { select: { createdAt: true } },
        },
      });

      if (completedLogs.length === 0) return null;

      const totalHours = completedLogs.reduce((sum, log) => {
        const diffMs = log.createdAt.getTime() - log.repairRequest.createdAt.getTime();
        return sum + diffMs / (1000 * 60 * 60);
      }, 0);

      return totalHours / completedLogs.length;
    };

    // Run current window aggregates in parallel
    const [total, byStatus, avgHours, prevByStatus, prevAvgHours, prevTotal] = await Promise.all([
      prisma.repairRequest.count({ where: currentWhere }),
      countByStatus(currentWhere),
      avgCompletionHours(currentWhere),
      countByStatus(prevWhere),
      avgCompletionHours(prevWhere),
      prisma.repairRequest.count({ where: prevWhere }),
    ]);

    // ── Delta ─────────────────────────────────────────────────────────────────
    const delta = {
      total: total - prevTotal,
      byStatus: {
        CHO_XU_LY: byStatus.CHO_XU_LY - prevByStatus.CHO_XU_LY,
        DANG_SUA_CHUA: byStatus.DANG_SUA_CHUA - prevByStatus.DANG_SUA_CHUA,
        HOAN_THANH: byStatus.HOAN_THANH - prevByStatus.HOAN_THANH,
        DA_HUY: byStatus.DA_HUY - prevByStatus.DA_HUY,
      },
      avgCompletionHours: avgHours !== null && prevAvgHours !== null
        ? avgHours - prevAvgHours
        : null,
    };

    // ── Top machines (top 5 by RepairRequest count in window) ─────────────────
    const topMachinesRaw = await prisma.repairRequestItem.groupBy({
      by: ['machineSystemId'],
      where: {
        repairRequest: currentWhere,
        machineSystemId: { not: null },
      },
      _count: { _all: true },
      orderBy: { _count: { machineSystemId: 'desc' } },
      take: 5,
    });

    const topMachineIds = topMachinesRaw.map((r) => r.machineSystemId!).filter(Boolean);
    const machineSystemsMap = new Map<string, string>();
    if (topMachineIds.length > 0) {
      const machineSystems = await prisma.machineSystem.findMany({
        where: { id: { in: topMachineIds } },
        select: { id: true, tenHeThong: true },
      });
      for (const ms of machineSystems) {
        machineSystemsMap.set(ms.id, ms.tenHeThong);
      }
    }

    const topMachines = topMachinesRaw.map((r) => ({
      machineSystemId: r.machineSystemId,
      tenHeThong: r.machineSystemId ? (machineSystemsMap.get(r.machineSystemId) ?? null) : null,
      count: r._count._all,
    }));

    // ── Recurring items (180-day trailing window from dateTo) ─────────────────
    const recurringWindowFrom = new Date(dateTo.getTime() - 180 * 24 * 60 * 60 * 1000);
    const recurringRaw = await prisma.repairRequestItem.groupBy({
      by: ['machineSystemDetailId'],
      where: {
        repairRequest: {
          createdAt: { gte: recurringWindowFrom, lte: dateTo },
          ...(filters?.machineSystemId ? { items: { some: { machineSystemId: filters.machineSystemId } } } : {}),
        },
        machineSystemDetailId: { not: null },
      },
      _count: { repairRequestId: true },
      having: { repairRequestId: { _count: { gt: 2 } } },
      orderBy: { _count: { repairRequestId: 'desc' } },
      take: 10,
    });

    const recurringDetailIds = recurringRaw.map((r) => r.machineSystemDetailId!).filter(Boolean);
    const machineDetailMap = new Map<string, string>();
    if (recurringDetailIds.length > 0) {
      const details = await prisma.machineSystemDetail.findMany({
        where: { id: { in: recurringDetailIds } },
        select: { id: true, tenChiTiet: true },
      });
      for (const d of details) {
        machineDetailMap.set(d.id, d.tenChiTiet);
      }
    }

    // Get the latest maYeuCau for each recurring machineSystemDetailId
    const recurringItems = await Promise.all(
      recurringRaw.map(async (r) => {
        const latest = await prisma.repairRequest.findFirst({
          where: {
            createdAt: { gte: recurringWindowFrom, lte: dateTo },
            items: { some: { machineSystemDetailId: r.machineSystemDetailId! } },
          },
          orderBy: { createdAt: 'desc' },
          select: { maYeuCau: true },
        });
        return {
          machineSystemDetailId: r.machineSystemDetailId,
          tenChiTiet: r.machineSystemDetailId ? (machineDetailMap.get(r.machineSystemDetailId) ?? null) : null,
          count: r._count.repairRequestId,
          latestMaYeuCau: latest?.maYeuCau ?? null,
        };
      })
    );

    // ── Monthly trend (12 buckets ending at dateTo) ───────────────────────────
    // Build 12 month buckets oldest-first
    const monthlyTrend: Array<{ month: string; total: number; hoanThanh: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const bucketEnd = new Date(dateTo);
      bucketEnd.setDate(1);
      bucketEnd.setMonth(bucketEnd.getMonth() - i + 1);
      bucketEnd.setDate(0); // last day of target month
      bucketEnd.setHours(23, 59, 59, 999);

      const bucketStart = new Date(dateTo);
      bucketStart.setDate(1);
      bucketStart.setMonth(bucketStart.getMonth() - i);
      bucketStart.setHours(0, 0, 0, 0);

      const monthKey = `${bucketStart.getFullYear()}-${String(bucketStart.getMonth() + 1).padStart(2, '0')}`;
      const bucketWhere: Prisma.RepairRequestWhereInput = {
        createdAt: { gte: bucketStart, lte: bucketEnd },
        ...(filters?.machineSystemId ? { items: { some: { machineSystemId: filters.machineSystemId } } } : {}),
      };

      const [bucketTotal, bucketHoanThanh] = await Promise.all([
        prisma.repairRequest.count({ where: bucketWhere }),
        prisma.repairRequest.count({ where: { ...bucketWhere, trangThai: RepairRequestStatus.HOAN_THANH } }),
      ]);

      monthlyTrend.push({ month: monthKey, total: bucketTotal, hoanThanh: bucketHoanThanh });
    }

    // ── Recently created in CHO_XU_LY or DANG_SUA_CHUA ───────────────────────
    const recentlyCreatedRaw = await prisma.repairRequest.findMany({
      where: {
        trangThai: { in: [RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.DANG_SUA_CHUA] },
        ...(filters?.machineSystemId ? { items: { some: { machineSystemId: filters.machineSystemId } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        maYeuCau: true,
        tenHeThong: true,
        trangThai: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    });

    const recentlyCreated = recentlyCreatedRaw.map((r) => ({
      id: r.id,
      maYeuCau: r.maYeuCau,
      tenHeThongThietBi: r.tenHeThong,
      trangThai: r.trangThai,
      createdAt: r.createdAt,
      itemCount: r._count.items,
    }));

    return {
      total,
      byStatus,
      avgCompletionHours: avgHours,
      delta,
      topMachines,
      recurringItems,
      monthlyTrend,
      recentlyCreated,
    };
  }

  /**
   * Delete repair request
   */
  async deleteRepairRequest(id: number) {
    await this.getRepairRequestById(id);

    await prisma.repairRequest.delete({
      where: { id },
    });

    return { message: 'Xóa yêu cầu sửa chữa thành công' };
  }

  /**
   * Export repair requests to Excel
   */
  async exportToExcel(filters?: RepairRequestFilters): Promise<Buffer> {
    const where: Prisma.RepairRequestWhereInput = {};
    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThong: { contains: filters.search, mode: 'insensitive' } },
        { noiDungLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.trangThai) {
      where.trangThai = filters.trangThai;
    }

    const data = await prisma.repairRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu sửa chữa');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Ngày tháng', key: 'ngayThang', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 20 },
      { header: 'Tên hệ thống/thiết bị', key: 'tenHeThong', width: 25 },
      { header: 'Tình trạng thiết bị', key: 'tinhTrangThietBi', width: 20 },
      { header: 'Loại lỗi', key: 'loaiLoi', width: 15 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'Nội dung lỗi', key: 'noiDungLoi', width: 30 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    let rowIndex = 1;
    data.forEach((request) => {
      const ngayThangStr = request.ngayThang ? new Date(request.ngayThang).toLocaleDateString('vi-VN') : '';
      if (request.items && request.items.length > 0) {
        request.items.forEach((item) => {
          worksheet.addRow({
            stt: rowIndex++,
            ngayThang: ngayThangStr,
            maYeuCau: request.maYeuCau,
            tenHeThong: item.tenHeThong,
            tinhTrangThietBi: item.tinhTrangThietBi,
            loaiLoi: item.loaiLoi,
            mucDoUuTien: request.mucDoUuTien,
            noiDungLoi: item.noiDungLoi,
            trangThai: request.trangThai,
            ghiChu: request.ghiChu || '',
          });
        });
      } else {
        worksheet.addRow({
          stt: rowIndex++,
          ngayThang: ngayThangStr,
          maYeuCau: request.maYeuCau,
          tenHeThong: request.tenHeThong,
          tinhTrangThietBi: request.tinhTrangThietBi,
          loaiLoi: request.loaiLoi,
          mucDoUuTien: request.mucDoUuTien,
          noiDungLoi: request.noiDungLoi,
          trangThai: request.trangThai,
          ghiChu: request.ghiChu || '',
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new RepairRequestService();
