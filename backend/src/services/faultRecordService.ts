import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';
import notificationService from '@services/notificationService';
import { NotificationEvent } from '@types';
import logger from '@config/logger';

// Threshold for recurrence-threshold notification
const RECURRENCE_NOTIFICATION_THRESHOLD = 3;

const SEVERITY_KEYS = ['Nghiêm trọng', 'Trung bình', 'Nhẹ'] as const;
const STATUS_KEYS = ['Đang theo dõi', 'Đã xử lý', 'Tái phát'] as const;

type SeverityKey = typeof SEVERITY_KEYS[number];
type StatusKey = typeof STATUS_KEYS[number];

interface CreateFaultRecordData {
  tenLoi?: string;
  moTa?: string;
  maHeThong?: string;
  machineSystemId?: string;
  machineSystemDetailId?: string;
  faultTemplateId?: string;
  mucDo?: string;
  trangThai?: string;
  nguoiPhatHien: string;
  ngayPhatHien?: Date;
  fileDinhKem?: string;
}

interface UpdateFaultRecordData {
  tenLoi?: string;
  moTa?: string;
  maHeThong?: string;
  machineSystemId?: string | null;
  machineSystemDetailId?: string | null;
  faultTemplateId?: string | null;
  mucDo?: string;
  trangThai?: string;
  nguoiPhatHien?: string;
  ngayPhatHien?: Date;
  fileDinhKem?: string;
}

const faultRecordInclude = {
  machineSystem: true,
  machineSystemDetail: true,
  faultTemplate: true,
} satisfies Prisma.FaultRecordInclude;

const faultRecordListSelect = {
  id: true,
  maLoi: true,
  tenLoi: true,
  moTa: true,
  maHeThong: true,
  machineSystemId: true,
  machineSystemDetailId: true,
  faultTemplateId: true,
  mucDo: true,
  trangThai: true,
  nguoiPhatHien: true,
  ngayPhatHien: true,
  fileDinhKem: true,
  createdAt: true,
  updatedAt: true,
  machineSystem: {
    select: { id: true, maHeThong: true, tenHeThong: true, khuVuc: true, viTri: true },
  },
  machineSystemDetail: {
    select: { id: true, maChiTiet: true, tenChiTiet: true, loaiChiTiet: true },
  },
  faultTemplate: {
    select: { id: true, maMauLoi: true, tenMauLoi: true, mucDo: true },
  },
} satisfies Prisma.FaultRecordSelect;

class FaultRecordService {
  async generateFaultCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.faultRecord.findFirst({
      where: { maLoi: yearlyCodeWhere('LI', year) },
      orderBy: { maLoi: 'desc' },
      select: { maLoi: true },
    });
    return nextYearlyCode(last?.maLoi ?? null, 'LI', year);
  }

  async getAllFaultRecords(
    page: number = 1,
    limit: number = 10,
    search?: string,
    trangThai?: string,
    mucDo?: string,
    machineSystemId?: string,
    machineSystemDetailId?: string,
    faultTemplateId?: string,
  ) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: Record<string, unknown> = {};
    if (trangThai) where.trangThai = trangThai;
    if (mucDo) where.mucDo = mucDo;
    if (machineSystemId) where.machineSystemId = machineSystemId;
    if (machineSystemDetailId) where.machineSystemDetailId = machineSystemDetailId;
    if (faultTemplateId) where.faultTemplateId = faultTemplateId;
    if (search) {
      where.OR = [
        { maLoi: { contains: search, mode: 'insensitive' } },
        { tenLoi: { contains: search, mode: 'insensitive' } },
        { maHeThong: { contains: search, mode: 'insensitive' } },
        { nguoiPhatHien: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.faultRecord.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: faultRecordListSelect,
      }),
      prisma.faultRecord.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getFaultRecordById(id: string) {
    const record = await prisma.faultRecord.findUnique({ where: { id }, include: faultRecordInclude });
    if (!record) throw new NotFoundError('Không tìm thấy bản ghi lỗi');
    return record;
  }

  private async resolveMachineContext(data: {
    maHeThong?: string | null;
    machineSystemId?: string | null;
    machineSystemDetailId?: string | null;
    faultTemplateId?: string | null;
  }) {
    if (data.faultTemplateId) {
      const template = await prisma.faultTemplate.findUnique({
        where: { id: data.faultTemplateId },
        include: { machineSystem: true, machineSystemDetail: true },
      });
      if (!template) throw new ValidationError('Mẫu lỗi không hợp lệ');
      if (!template.hoatDong) throw new ValidationError('Mẫu lỗi đã ngừng hoạt động');
      return {
        template,
        machineSystem: template.machineSystem,
        machineSystemDetail: template.machineSystemDetail,
        maHeThong: template.machineSystem?.maHeThong ?? null,
      };
    }

    let machineSystem = data.machineSystemId
      ? await prisma.machineSystem.findUnique({ where: { id: data.machineSystemId } })
      : null;

    if (!machineSystem && data.maHeThong) {
      machineSystem = await prisma.machineSystem.findUnique({ where: { maHeThong: data.maHeThong } });
    }

    if (!machineSystem && data.machineSystemDetailId) {
      const detail = await prisma.machineSystemDetail.findUnique({
        where: { id: data.machineSystemDetailId },
        include: { machineSystem: true },
      });
      if (!detail) throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
      machineSystem = detail.machineSystem;
    }

    if (data.machineSystemId && !machineSystem) {
      throw new ValidationError('Hệ thống máy không hợp lệ');
    }

    let machineSystemDetail = null;
    if (data.machineSystemDetailId) {
      machineSystemDetail = await prisma.machineSystemDetail.findUnique({
        where: { id: data.machineSystemDetailId },
      });
      if (!machineSystemDetail) throw new ValidationError('Chi tiết hệ thống máy không hợp lệ');
      if (machineSystem && machineSystemDetail.machineSystemId !== machineSystem.id) {
        throw new ValidationError('Chi tiết máy không thuộc hệ thống máy đã chọn');
      }
    }

    if (data.maHeThong && machineSystem && data.maHeThong !== machineSystem.maHeThong) {
      throw new ValidationError('Mã hệ thống không khớp với hệ thống máy đã chọn');
    }

    return {
      template: null,
      machineSystem,
      machineSystemDetail,
      maHeThong: machineSystem?.maHeThong ?? data.maHeThong ?? null,
    };
  }

  async createFaultRecord(data: CreateFaultRecordData) {
    const maLoi = await this.generateFaultCode();
    const context = await this.resolveMachineContext(data);
    const tenLoi = data.tenLoi ?? context.template?.tenMauLoi;
    const mucDo = data.mucDo ?? context.template?.mucDo;
    if (!tenLoi) throw new ValidationError('Tên lỗi là bắt buộc');
    if (!mucDo) throw new ValidationError('Mức độ lỗi là bắt buộc');

    const record = await prisma.faultRecord.create({
      data: {
        maLoi,
        tenLoi,
        moTa: data.moTa ?? context.template?.moTa ?? '',
        maHeThong: context.maHeThong,
        machineSystemId: context.machineSystem?.id,
        machineSystemDetailId: context.machineSystemDetail?.id,
        faultTemplateId: context.template?.id,
        mucDo,
        trangThai: data.trangThai ?? 'Đang theo dõi',
        nguoiPhatHien: data.nguoiPhatHien,
        ngayPhatHien: data.ngayPhatHien ?? new Date(),
        fileDinhKem: data.fileDinhKem,
      },
      include: faultRecordInclude,
    });

    // C4: Notify when recurrence threshold is reached for template+detail pair
    const faultTemplateId = record.faultTemplateId;
    const machineSystemDetailId = record.machineSystemDetailId;
    if (faultTemplateId && machineSystemDetailId) {
      try {
        const recurrenceCount = await prisma.faultRecord.count({
          where: { faultTemplateId, machineSystemDetailId },
        });
        if (recurrenceCount >= RECURRENCE_NOTIFICATION_THRESHOLD) {
          await notificationService.notify(NotificationEvent.FAULT_RECURRENCE_THRESHOLD, {
            entityId: record.id,
            metadata: {
              faultRecordId: record.id,
              faultTemplateId,
              machineSystemDetailId,
              tenLoi: record.tenLoi,
              count: recurrenceCount,
            },
          });
        }
      } catch (err) {
        logger.error('[FaultRecordService] Recurrence notification failed', err);
      }
    }

    return record;
  }

  async updateFaultRecord(id: string, data: UpdateFaultRecordData) {
    const existing = await this.getFaultRecordById(id);
    const needsContext =
      data.faultTemplateId !== undefined ||
      data.machineSystemId !== undefined ||
      data.machineSystemDetailId !== undefined ||
      data.maHeThong !== undefined;

    const context = needsContext
      ? await this.resolveMachineContext({
          faultTemplateId: data.faultTemplateId,
          machineSystemId: data.machineSystemId,
          machineSystemDetailId: data.machineSystemDetailId,
          maHeThong: data.maHeThong,
        })
      : null;

    // D8: ngayXuLy side-effect on status transition
    let ngayXuLyUpdate: { ngayXuLy: Date | null } | Record<string, never> = {};
    if (data.trangThai !== undefined && data.trangThai !== existing.trangThai) {
      if (data.trangThai === 'Đã xử lý' && existing.trangThai !== 'Đã xử lý') {
        ngayXuLyUpdate = { ngayXuLy: new Date() };
      } else if (data.trangThai !== 'Đã xử lý' && existing.trangThai === 'Đã xử lý') {
        ngayXuLyUpdate = { ngayXuLy: null };
      }
    }

    return prisma.faultRecord.update({
      where: { id },
      data: {
        tenLoi: data.tenLoi ?? (context?.template ? context.template.tenMauLoi : undefined),
        moTa: data.moTa ?? (context?.template ? context.template.moTa : undefined),
        maHeThong: context ? context.maHeThong : data.maHeThong,
        machineSystemId: needsContext ? context?.machineSystem?.id ?? null : undefined,
        machineSystemDetailId: needsContext ? context?.machineSystemDetail?.id ?? null : undefined,
        faultTemplateId: needsContext ? context?.template?.id ?? null : undefined,
        mucDo: data.mucDo ?? (context?.template ? context.template.mucDo : undefined),
        trangThai: data.trangThai,
        nguoiPhatHien: data.nguoiPhatHien,
        ngayPhatHien: data.ngayPhatHien,
        fileDinhKem: data.fileDinhKem,
        ...ngayXuLyUpdate,
      },
      include: faultRecordInclude,
    });
  }

  async deleteFaultRecord(id: string) {
    await this.getFaultRecordById(id);
    return prisma.faultRecord.delete({ where: { id } });
  }

  async checkRecurrence(params: {
    faultTemplateId?: string;
    machineSystemDetailId?: string;
    tenLoi?: string;
  }) {
    const { faultTemplateId, machineSystemDetailId, tenLoi } = params;

    if (!faultTemplateId && !tenLoi) {
      throw new ValidationError('Cần cung cấp faultTemplateId hoặc tenLoi');
    }
    if (faultTemplateId && !machineSystemDetailId) {
      throw new ValidationError('machineSystemDetailId là bắt buộc khi dùng faultTemplateId');
    }

    // Exact-match branch: template + detail
    if (faultTemplateId && machineSystemDetailId) {
      const [count, records] = await Promise.all([
        prisma.faultRecord.count({
          where: { faultTemplateId, machineSystemDetailId },
        }),
        prisma.faultRecord.findMany({
          where: { faultTemplateId, machineSystemDetailId },
          orderBy: { ngayPhatHien: 'desc' },
          take: 5,
          select: {
            id: true,
            maLoi: true,
            ngayPhatHien: true,
            trangThai: true,
            mucDo: true,
            nguoiPhatHien: true,
          },
        }),
      ]);
      return { count, records, mode: 'template' as const };
    }

    // Free-text similarity branch (pg_trgm)
    const similarityThreshold = 0.3;
    type RecurrenceRow = {
      id: string;
      maLoi: string;
      ngayPhatHien: Date;
      trangThai: string;
      mucDo: string;
      nguoiPhatHien: string;
    };

    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM "business"."fault_records"
      WHERE similarity("tenLoi", ${tenLoi!}) > ${similarityThreshold}
    `;
    const records = await prisma.$queryRaw<RecurrenceRow[]>`
      SELECT id, "maLoi", "ngayPhatHien", "trangThai", "mucDo", "nguoiPhatHien"
      FROM "business"."fault_records"
      WHERE similarity("tenLoi", ${tenLoi!}) > ${similarityThreshold}
      ORDER BY similarity("tenLoi", ${tenLoi!}) DESC, "ngayPhatHien" DESC
      LIMIT 5
    `;
    const count = Number(countResult[0]?.count ?? 0);
    // Normalize Date -> string for consistent response shape
    const normalizedRecords = records.map((r) => ({
      ...r,
      ngayPhatHien: r.ngayPhatHien instanceof Date ? r.ngayPhatHien.toISOString() : r.ngayPhatHien,
    }));
    return { count, records: normalizedRecords, mode: 'text' as const };
  }

  async getStats(options?: { machineSystemId?: string }) {
    const machineSystemId = options?.machineSystemId;
    const baseWhere = machineSystemId ? { machineSystemId } : {};

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday.getTime() + 86400000);

    // ISO week: Monday-based
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon ...
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);

    const startOf7DaysAgo = new Date(now.getTime() - 7 * 86400000);
    const startOf30DaysAgo = new Date(now.getTime() - 30 * 86400000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOf12MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [
      total,
      severityGroups,
      statusGroups,
      severityByStatusGroups,
      machineGroups,
      recurringGroups,
      last7Days,
      last30Days,
      thisMonth,
      prevMonth,
      recentToday,
      recentThisWeek,
      mttrResult,
    ] = await Promise.all([
      prisma.faultRecord.count({ where: baseWhere }),
      prisma.faultRecord.groupBy({
        by: ['mucDo'],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.faultRecord.groupBy({
        by: ['trangThai'],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.faultRecord.groupBy({
        by: ['trangThai', 'mucDo'],
        where: baseWhere,
        _count: { _all: true },
      }),
      prisma.faultRecord.groupBy({
        by: ['machineSystemId'],
        where: { ...baseWhere, machineSystemId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.faultRecord.groupBy({
        by: ['faultTemplateId', 'machineSystemDetailId'],
        where: {
          ...baseWhere,
          faultTemplateId: { not: null },
          machineSystemDetailId: { not: null },
        },
        _count: { _all: true },
        _max: { ngayPhatHien: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.faultRecord.count({ where: { ...baseWhere, ngayPhatHien: { gte: startOf7DaysAgo } } }),
      prisma.faultRecord.count({ where: { ...baseWhere, ngayPhatHien: { gte: startOf30DaysAgo } } }),
      prisma.faultRecord.count({ where: { ...baseWhere, ngayPhatHien: { gte: startOfThisMonth } } }),
      prisma.faultRecord.count({ where: { ...baseWhere, ngayPhatHien: { gte: startOfPrevMonth, lt: startOfThisMonth } } }),
      prisma.faultRecord.findMany({
        where: { ...baseWhere, ngayPhatHien: { gte: startOfToday, lt: startOfTomorrow } },
        orderBy: { ngayPhatHien: 'desc' },
        take: 5,
        select: faultRecordListSelect,
      }),
      prisma.faultRecord.findMany({
        where: { ...baseWhere, ngayPhatHien: { gte: startOfWeek } },
        orderBy: { ngayPhatHien: 'desc' },
        take: 5,
        select: faultRecordListSelect,
      }),
      machineSystemId
        ? prisma.$queryRaw<[{ mttr: number | null }]>`
            SELECT ROUND(AVG(EXTRACT(EPOCH FROM ("ngayXuLy" - "ngayPhatHien")) / 86400)::numeric, 1)::float AS mttr
            FROM "business"."fault_records"
            WHERE "ngayXuLy" IS NOT NULL AND "trangThai" = 'Đã xử lý' AND "machineSystemId" = ${machineSystemId}
          `
        : prisma.$queryRaw<[{ mttr: number | null }]>`
            SELECT ROUND(AVG(EXTRACT(EPOCH FROM ("ngayXuLy" - "ngayPhatHien")) / 86400)::numeric, 1)::float AS mttr
            FROM "business"."fault_records"
            WHERE "ngayXuLy" IS NOT NULL AND "trangThai" = 'Đã xử lý'
          `,
    ]);

    // Build bySeverity with all canonical keys
    const bySeverity: Record<string, number> = Object.fromEntries(SEVERITY_KEYS.map((k) => [k, 0]));
    for (const row of severityGroups) {
      if (row.mucDo in bySeverity) bySeverity[row.mucDo] = row._count._all;
    }

    // Build byStatus with all canonical keys
    const byStatus: Record<string, number> = Object.fromEntries(STATUS_KEYS.map((k) => [k, 0]));
    for (const row of statusGroups) {
      if (row.trangThai in byStatus) byStatus[row.trangThai] = row._count._all;
    }

    // Build bySeverityByStatus 3x3 matrix
    const bySeverityByStatus: Record<string, Record<string, number>> = Object.fromEntries(
      STATUS_KEYS.map((s) => [s, Object.fromEntries(SEVERITY_KEYS.map((sv) => [sv, 0]))])
    );
    for (const row of severityByStatusGroups) {
      const s = row.trangThai as StatusKey;
      const sv = row.mucDo as SeverityKey;
      if (bySeverityByStatus[s] && sv in bySeverityByStatus[s]) {
        bySeverityByStatus[s][sv] = row._count._all;
      }
    }

    // Monthly trend for last 12 months
    type MonthlyRow = { month: string; count: bigint };
    let monthlyRaw: MonthlyRow[] = [];
    if (machineSystemId) {
      monthlyRaw = await prisma.$queryRaw<MonthlyRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "ngayPhatHien"), 'YYYY-MM') AS month,
               COUNT(*)::bigint AS count
        FROM "business"."fault_records"
        WHERE "ngayPhatHien" >= ${startOf12MonthsAgo} AND "machineSystemId" = ${machineSystemId}
        GROUP BY DATE_TRUNC('month', "ngayPhatHien")
        ORDER BY DATE_TRUNC('month', "ngayPhatHien") ASC
      `;
    } else {
      monthlyRaw = await prisma.$queryRaw<MonthlyRow[]>`
        SELECT TO_CHAR(DATE_TRUNC('month', "ngayPhatHien"), 'YYYY-MM') AS month,
               COUNT(*)::bigint AS count
        FROM "business"."fault_records"
        WHERE "ngayPhatHien" >= ${startOf12MonthsAgo}
        GROUP BY DATE_TRUNC('month', "ngayPhatHien")
        ORDER BY DATE_TRUNC('month', "ngayPhatHien") ASC
      `;
    }

    // Build all 12 month slots
    const monthlyMap = new Map(monthlyRaw.map((r) => [r.month, Number(r.count)]));
    const monthlyTrend: Array<{ month: string; count: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyTrend.push({ month: key, count: monthlyMap.get(key) ?? 0 });
    }

    // Hydrate top machines
    const machineIds = machineGroups
      .map((row) => row.machineSystemId)
      .filter((id): id is string => Boolean(id));

    const machines = machineIds.length
      ? await prisma.machineSystem.findMany({
          where: { id: { in: machineIds } },
          select: { id: true, tenHeThong: true, maHeThong: true },
        })
      : [];

    const machineMap = new Map(machines.map((m) => [m.id, m]));
    const topMachines = machineGroups
      .filter((row) => row.machineSystemId && machineMap.has(row.machineSystemId))
      .map((row) => ({
        machineSystemId: row.machineSystemId as string,
        tenHeThong: machineMap.get(row.machineSystemId as string)!.tenHeThong,
        maHeThong: machineMap.get(row.machineSystemId as string)!.maHeThong,
        count: row._count._all,
      }));

    // Hydrate top recurring template+detail combos with lastSeenAt
    const templateIds = [
      ...new Set(recurringGroups.map((r) => r.faultTemplateId).filter((id): id is string => Boolean(id))),
    ];
    const detailIds = [
      ...new Set(recurringGroups.map((r) => r.machineSystemDetailId).filter((id): id is string => Boolean(id))),
    ];

    const [templates, detailItems] = await Promise.all([
      templateIds.length
        ? prisma.faultTemplate.findMany({
            where: { id: { in: templateIds } },
            select: { id: true, tenMauLoi: true },
          })
        : Promise.resolve([]),
      detailIds.length
        ? prisma.machineSystemDetail.findMany({
            where: { id: { in: detailIds } },
            select: { id: true, tenChiTiet: true },
          })
        : Promise.resolve([]),
    ]);

    const templateMap = new Map(templates.map((t) => [t.id, t]));
    const detailMap = new Map(detailItems.map((d) => [d.id, d]));

    const topRecurring = recurringGroups
      .filter(
        (row) =>
          row.faultTemplateId &&
          row.machineSystemDetailId &&
          templateMap.has(row.faultTemplateId) &&
          detailMap.has(row.machineSystemDetailId)
      )
      .map((row) => ({
        faultTemplateId: row.faultTemplateId as string,
        tenMauLoi: templateMap.get(row.faultTemplateId as string)!.tenMauLoi,
        machineSystemDetailId: row.machineSystemDetailId as string,
        tenChiTiet: detailMap.get(row.machineSystemDetailId as string)!.tenChiTiet,
        count: row._count._all,
        lastSeenAt: row._max.ngayPhatHien?.toISOString() ?? null,
      }));

    const mttrDays = mttrResult[0]?.mttr != null ? Number(mttrResult[0].mttr) : null;

    return {
      total,
      bySeverity,
      byStatus,
      bySeverityByStatus,
      last7Days,
      last30Days,
      thisMonth,
      prevMonth,
      monthlyTrend,
      recent: { today: recentToday, thisWeek: recentThisWeek },
      topMachines,
      topRecurring,
      mttrDays,
    };
  }

  async getHeatmap(options?: { machineSystemId?: string }) {
    const machineSystemId = options?.machineSystemId;
    const baseWhere = {
      machineSystemId: { not: null as string | null },
      faultTemplateId: { not: null as string | null },
      ...(machineSystemId ? { machineSystemId } : {}),
    };

    // Get top-10 machineSystemIds by count
    const topMachineGroups = await prisma.faultRecord.groupBy({
      by: ['machineSystemId'],
      where: baseWhere,
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    const topMachineIds = topMachineGroups
      .map((r) => r.machineSystemId)
      .filter((id): id is string => Boolean(id));

    // Get top-10 faultTemplateIds by count
    const topTemplateGroups = await prisma.faultRecord.groupBy({
      by: ['faultTemplateId'],
      where: baseWhere,
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });
    const topTemplateIds = topTemplateGroups
      .map((r) => r.faultTemplateId)
      .filter((id): id is string => Boolean(id));

    if (topMachineIds.length === 0 || topTemplateIds.length === 0) return [];

    // Intersection counts
    const intersectionGroups = await prisma.faultRecord.groupBy({
      by: ['machineSystemId', 'faultTemplateId'],
      where: {
        machineSystemId: { in: topMachineIds },
        faultTemplateId: { in: topTemplateIds },
      },
      _count: { _all: true },
    });

    // Hydrate names
    const [machineRows, templateRows] = await Promise.all([
      prisma.machineSystem.findMany({
        where: { id: { in: topMachineIds } },
        select: { id: true, tenHeThong: true },
      }),
      prisma.faultTemplate.findMany({
        where: { id: { in: topTemplateIds } },
        select: { id: true, tenMauLoi: true },
      }),
    ]);
    const machineNameMap = new Map(machineRows.map((m) => [m.id, m.tenHeThong]));
    const templateNameMap = new Map(templateRows.map((t) => [t.id, t.tenMauLoi]));

    return intersectionGroups
      .filter((row) => row.machineSystemId && row.faultTemplateId)
      .map((row) => ({
        machineSystemId: row.machineSystemId as string,
        tenHeThong: machineNameMap.get(row.machineSystemId as string) ?? '',
        faultTemplateId: row.faultTemplateId as string,
        tenMauLoi: templateNameMap.get(row.faultTemplateId as string) ?? '',
        count: row._count._all,
      }));
  }

  async exportToExcel(filters?: { search?: string; trangThai?: string; mucDo?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.trangThai) where.trangThai = filters.trangThai;
    if (filters?.mucDo) where.mucDo = filters.mucDo;
    if (filters?.search) {
      where.OR = [
        { maLoi: { contains: filters.search, mode: 'insensitive' } },
        { tenLoi: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.faultRecord.findMany({ where, orderBy: { createdAt: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách lỗi');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Mã lỗi', key: 'maLoi', width: 15 },
      { header: 'Tên lỗi', key: 'tenLoi', width: 30 },
      { header: 'Mô tả', key: 'moTa', width: 40 },
      { header: 'Mã hệ thống', key: 'maHeThong', width: 15 },
      { header: 'Mức độ', key: 'mucDo', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
      { header: 'Người phát hiện', key: 'nguoiPhatHien', width: 20 },
      { header: 'Ngày phát hiện', key: 'ngayPhatHien', width: 15 },
    ];

    data.forEach((item: (typeof data)[0], index: number) => {
      sheet.addRow({
        stt: index + 1,
        maLoi: item.maLoi,
        tenLoi: item.tenLoi,
        moTa: item.moTa,
        maHeThong: item.maHeThong ?? '',
        mucDo: item.mucDo,
        trangThai: item.trangThai,
        nguoiPhatHien: item.nguoiPhatHien,
        ngayPhatHien: item.ngayPhatHien.toLocaleDateString('vi-VN'),
      });
    });

    return workbook;
  }
}

export default new FaultRecordService();
