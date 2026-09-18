import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';

export interface InboundPlanFilters {
  trangThai?: string;
  warehouseId?: string;
  overdueOnly?: boolean;
}

const INBOUND_INCLUDE = {
  purchaseRequest: {
    include: {
      items: true,
      supplyRequest: { select: { id: true, maYeuCau: true, trangThai: true } },
      warehouse: { select: { id: true, tenKho: true, maKho: true } },
    },
  },
  warehouse: { select: { id: true, tenKho: true, maKho: true } },
  logs: { orderBy: { createdAt: 'desc' } as const },
  receipts: { select: { id: true, maPhieuNhap: true, ngayNhap: true, tongSoLuongThucTe: true } },
} as const;

async function getAllInboundPlans(
  page: number = 1,
  limit: number = 10,
  search?: string,
  filters: InboundPlanFilters = {},
) {
  const { skip } = getPaginationParams(page, limit);
  const where: Record<string, unknown> = {};

  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.overdueOnly && filters.trangThai) {
    const allowed = ['Chờ nhập', 'Quá hạn'];
    const raw = String(filters.trangThai).split(',').map((s) => s.trim()).filter(Boolean);
    const inter = raw.filter((s) => allowed.includes(s));
    where.ngayDuKien = { lt: new Date() };
    where.trangThai = inter.length > 0 ? { in: inter } : ({ in: [] as string[] } as any);
  } else if (filters.overdueOnly) {
    where.ngayDuKien = { lt: new Date() };
    where.trangThai = { in: ['Chờ nhập', 'Quá hạn'] };
  } else if (filters.trangThai) {
    where.trangThai = filters.trangThai;
  }

  if (search) {
    (where as any).OR = [
      { maKeHoach: { contains: search, mode: 'insensitive' as const } },
      { purchaseRequest: { maYeuCau: { contains: search, mode: 'insensitive' as const } } },
      { purchaseRequest: { tenNhanVien: { contains: search, mode: 'insensitive' as const } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.inboundPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: INBOUND_INCLUDE as any,
    }),
    prisma.inboundPlan.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getInboundPlanById(id: string) {
  const plan = await prisma.inboundPlan.findUnique({
    where: { id },
    include: INBOUND_INCLUDE as any,
  });
  if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch nhập kho');
  return plan;
}

async function updateInboundPlan(
  id: string,
  data: { ngayDuKien?: string | Date; lyDo?: string; nguoiThucHien?: string },
) {
  const existing = await prisma.inboundPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Không tìm thấy kế hoạch nhập kho');
  if (existing.trangThai === 'Đã nhập' || existing.trangThai === 'Đã hủy') {
    throw new ValidationError(`Không thể đổi ngày hẹn khi kế hoạch đã "${existing.trangThai}"`);
  }
  if (!data.ngayDuKien) throw new ValidationError('Thiếu ngày hẹn mới');

  const ngayMoi = new Date(data.ngayDuKien as string);
  if (isNaN(ngayMoi.getTime())) throw new ValidationError('Ngày hẹn không hợp lệ');

  const ngayCu = existing.ngayDuKien;

  const updated = await prisma.$transaction(async (tx) => {
    const plan = await tx.inboundPlan.update({
      where: { id },
      data: { ngayDuKien: ngayMoi, ngayDuKienMoi: ngayMoi },
    });
    await tx.inboundPlanLog.create({
      data: {
        inboundPlanId: id,
        hanhDong: 'Đổi ngày hẹn',
        ngayCu,
        ngayMoi,
        lyDo: data.lyDo ?? null,
        nguoiThucHien: data.nguoiThucHien ?? null,
      },
    });
    return plan;
  });

  return prisma.inboundPlan.findUnique({ where: { id: updated.id }, include: INBOUND_INCLUDE as any });
}

async function cancelInboundPlan(
  id: string,
  opts: { lyDo?: string; nguoiThucHien?: string },
) {
  const existing = await prisma.inboundPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Không tìm thấy kế hoạch nhập kho');
  if (existing.trangThai === 'Đã nhập' || existing.trangThai === 'Đã hủy') {
    throw new ValidationError(`Không thể hủy kế hoạch ở trạng thái "${existing.trangThai}"`);
  }
  const lyDo = opts.lyDo?.trim();
  if (!lyDo) throw new ValidationError('Vui lòng nhập lý do hủy');

  const claimed = await prisma.inboundPlan.updateMany({
    where: { id, trangThai: { in: ['Chờ nhập', 'Quá hạn'] } },
    data: { trangThai: 'Đã hủy', lyDoChenhLech: lyDo },
  });
  if (claimed.count === 0) {
    const cur = await prisma.inboundPlan.findUnique({ where: { id }, select: { trangThai: true } });
    throw new ValidationError(`Không thể hủy kế hoạch ở trạng thái "${cur?.trangThai ?? existing.trangThai}"`);
  }
  await prisma.inboundPlanLog.create({
    data: { inboundPlanId: id, hanhDong: 'Hủy kế hoạch', lyDo, nguoiThucHien: opts.nguoiThucHien ?? null },
  });
  return prisma.inboundPlan.findUnique({ where: { id }, include: INBOUND_INCLUDE as any });
}

async function markReceived(
  id: string,
  opts?: { soLuongThucTe?: number; lyDoChenhLech?: string; nguoiThucHien?: string },
) {
  const plan = await prisma.inboundPlan.findUnique({
    where: { id },
    include: { purchaseRequest: { include: { items: true } }, receipts: true } as any,
  });
  if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch nhập kho');
  if ((plan as any).trangThai === 'Đã nhập' || (plan as any).trangThai === 'Đã hủy') {
    throw new ValidationError(`Kế hoạch đã ở trạng thái "${(plan as any).trangThai}"`);
  }

  const isOverdue = (plan as any).ngayDuKien && new Date((plan as any).ngayDuKien) < new Date();

  const data: Record<string, unknown> = { trangThai: 'Đã nhập' };
  if (opts?.soLuongThucTe !== undefined && opts.soLuongThucTe !== null) {
    (data as any).lyDoChenhLech = opts.lyDoChenhLech ?? (plan as any).lyDoChenhLech ?? null;
  } else if (opts?.lyDoChenhLech) {
    (data as any).lyDoChenhLech = opts.lyDoChenhLech;
  }
  if (isOverdue && opts?.lyDoChenhLech) {
    (data as any).lyDoChenhLech = opts.lyDoChenhLech;
  }

  await prisma.inboundPlan.update({ where: { id }, data: data as any });

  const logLyDo = isOverdue
    ? `Đánh dấu đã nhập (quá hạn)${opts?.lyDoChenhLech ? `: ${opts.lyDoChenhLech}` : ''}`
    : opts?.lyDoChenhLech ?? (opts?.soLuongThucTe !== undefined ? `SL thực tế: ${opts.soLuongThucTe}` : null);

  await prisma.inboundPlanLog.create({
    data: {
      inboundPlanId: id,
      hanhDong: isOverdue ? 'Đã nhập (quá hạn)' : 'Đã nhập',
      lyDo: logLyDo,
      nguoiThucHien: opts?.nguoiThucHien ?? null,
    },
  });

  return prisma.inboundPlan.findUnique({ where: { id }, include: INBOUND_INCLUDE as any });
}

/**
 * Called after a WarehouseReceipt linked to an InboundPlan is created.
 * Sums actual received quantities across all receipts of the plan; if >= planned
 * quantity then mark plan as Đã nhập. Overdue plans still transition but log as Nhập quá hạn.
 * Supports running inside an existing transaction via optional tx client.
 */
async function onReceiptCreated(inboundPlanId: string, tx?: any) {
  const db: any = tx ?? prisma;
  const plan = await db.inboundPlan.findUnique({
    where: { id: inboundPlanId },
    include: {
      purchaseRequest: { include: { items: true } },
      receipts: { include: { items: true } },
    } as any,
  });
  if (!plan) return;
  if ((plan as any).trangThai === 'Đã nhập' || (plan as any).trangThai === 'Đã hủy') return;

  const plannedQty = ((plan as any).purchaseRequest?.items ?? []).reduce(
    (sum: number, it: any) => sum + Number(it.soLuong ?? 0),
    0,
  );
  let receivedQty = 0;
  for (const r of (plan as any).receipts ?? []) {
    if (r.tongSoLuongThucTe && Number(r.tongSoLuongThucTe) > 0) receivedQty += Number(r.tongSoLuongThucTe);
    else if (r.items) receivedQty += (r.items as any[]).reduce((s: number, li: any) => s + Number(li.soLuongThucTe ?? 0), 0);
  }

  const isOverdue = (plan as any).ngayDuKien && new Date((plan as any).ngayDuKien) < new Date();

  if (plannedQty > 0 && receivedQty + 1e-9 >= plannedQty) {
    await db.inboundPlan.update({ where: { id: inboundPlanId }, data: { trangThai: 'Đã nhập' } });
    await db.inboundPlanLog.create({
      data: {
        inboundPlanId,
        hanhDong: isOverdue ? 'Nhập quá hạn' : 'Đã nhập — đủ SL',
        lyDo: isOverdue
          ? `Quá hạn nhưng đã nhận đủ ${receivedQty}/${plannedQty}`
          : `Đã nhận đủ ${receivedQty}/${plannedQty}`,
      },
    });
  } else if (isOverdue && (plan as any).trangThai === 'Chờ nhập') {
    await db.inboundPlan.update({ where: { id: inboundPlanId }, data: { trangThai: 'Quá hạn' } });
    await db.inboundPlanLog.create({
      data: {
        inboundPlanId,
        hanhDong: 'Quá hạn — chưa đủ SL',
        lyDo: `Đã nhận ${receivedQty}/${plannedQty}, quá hạn ${new Date((plan as any).ngayDuKien).toLocaleDateString('vi-VN')}`,
      },
    });
  }
}

export default {
  getAllInboundPlans,
  getInboundPlanById,
  updateInboundPlan,
  cancelInboundPlan,
  markReceived,
  onReceiptCreated,
};
