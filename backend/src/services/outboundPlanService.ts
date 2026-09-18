import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';

export interface OutboundPlanFilters {
  trangThai?: string;
  warehouseId?: string;
  overdueOnly?: boolean;
}

const OUTBOUND_INCLUDE = {
  supplyRequest: {
    select: {
      id: true, maYeuCau: true, trangThai: true, tenNhanVien: true, boPhan: true,
      items: { select: { id: true, tenGoi: true, soLuong: true, donViTinh: true, phanLoai: true, fulfilledQty: true, fulfillmentStatus: true } },
    },
  },
  warehouse: { select: { id: true, tenKho: true, maKho: true } },
} as const;

async function getAllOutboundPlans(
  page: number = 1,
  limit: number = 10,
  search?: string,
  filters: OutboundPlanFilters = {},
) {
  const { skip } = getPaginationParams(page, limit);
  const where: Record<string, unknown> = {};

  if (filters.warehouseId) where.warehouseId = filters.warehouseId;
  if (filters.overdueOnly && filters.trangThai) {
    const allowed = ['Chờ xuất', 'Quá hạn'];
    const raw = String(filters.trangThai).split(',').map((s) => s.trim()).filter(Boolean);
    const inter = raw.filter((s) => allowed.includes(s));
    where.ngayDuKien = { lt: new Date() };
    where.trangThai = inter.length > 0 ? ({ in: inter } as any) : ({ in: [] as string[] } as any);
  } else if (filters.overdueOnly) {
    where.ngayDuKien = { lt: new Date() };
    where.trangThai = { in: ['Chờ xuất', 'Quá hạn'] };
  } else if (filters.trangThai) {
    where.trangThai = filters.trangThai;
  }

  if (search) {
    (where as any).OR = [
      { maKeHoach: { contains: search, mode: 'insensitive' as const } },
      { supplyRequest: { maYeuCau: { contains: search, mode: 'insensitive' as const } } },
      { ghiChu: { contains: search, mode: 'insensitive' as const } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.outboundPlan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: OUTBOUND_INCLUDE as any,
    }),
    prisma.outboundPlan.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getOutboundPlanById(id: string) {
  const plan = await prisma.outboundPlan.findUnique({
    where: { id },
    include: OUTBOUND_INCLUDE as any,
  });
  if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch xuất kho');
  return plan;
}

async function updateOutboundPlan(
  id: string,
  data: { ngayDuKien?: string | Date; ghiChu?: string; warehouseId?: string | null },
) {
  const existing = await prisma.outboundPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Không tìm thấy kế hoạch xuất kho');
  if (existing.trangThai === 'Đã xuất' || existing.trangThai === 'Đã hủy') {
    throw new ValidationError(`Không thể đổi ngày hẹn khi kế hoạch đã "${existing.trangThai}"`);
  }

  const updateData: Record<string, unknown> = {};
  if (data.ngayDuKien !== undefined) {
    if (!data.ngayDuKien) throw new ValidationError('Thiếu ngày hẹn mới');
    const ngayMoi = new Date(data.ngayDuKien as string);
    if (isNaN(ngayMoi.getTime())) throw new ValidationError('Ngày hẹn không hợp lệ');
    updateData.ngayDuKien = ngayMoi;
    updateData.ngayDuKienMoi = ngayMoi;
  }
  if (data.ghiChu !== undefined) updateData.ghiChu = data.ghiChu ?? null;
  if (data.warehouseId !== undefined) {
    if (data.warehouseId) {
      const wh = await prisma.warehouses.findUnique({ where: { id: String(data.warehouseId) }, select: { id: true } });
      if (!wh) throw new ValidationError('Kho không tồn tại');
      updateData.warehouseId = String(data.warehouseId);
    } else {
      updateData.warehouseId = null;
    }
  }

  if (Object.keys(updateData).length === 0) throw new ValidationError('Không có dữ liệu cập nhật');

  await prisma.outboundPlan.update({ where: { id }, data: updateData as any });
  return prisma.outboundPlan.findUnique({ where: { id }, include: OUTBOUND_INCLUDE as any });
}

async function cancelOutboundPlan(
  id: string,
  opts: { lyDo?: string },
) {
  const existing = await prisma.outboundPlan.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Không tìm thấy kế hoạch xuất kho');
  if (existing.trangThai === 'Đã xuất' || existing.trangThai === 'Đã hủy') {
    throw new ValidationError(`Không thể hủy kế hoạch ở trạng thái "${existing.trangThai}"`);
  }
  const lyDo = opts.lyDo?.trim();
  if (!lyDo) throw new ValidationError('Vui lòng nhập lý do hủy');

  const claimed = await prisma.outboundPlan.updateMany({
    where: { id, trangThai: { in: ['Chờ xuất', 'Quá hạn'] } },
    data: { trangThai: 'Đã hủy', lyDoChenhLech: lyDo },
  });
  if (claimed.count === 0) {
    const cur = await prisma.outboundPlan.findUnique({ where: { id }, select: { trangThai: true } });
    throw new ValidationError(`Không thể hủy kế hoạch ở trạng thái "${cur?.trangThai ?? existing.trangThai}"`);
  }
  return prisma.outboundPlan.findUnique({ where: { id }, include: OUTBOUND_INCLUDE as any });
}

async function markReceived(
  id: string,
  opts?: { soLuongThucTe?: number; lyDoChenhLech?: string },
) {
  const plan = await prisma.outboundPlan.findUnique({ where: { id } });
  if (!plan) throw new NotFoundError('Không tìm thấy kế hoạch xuất kho');
  if (plan.trangThai === 'Đã xuất' || plan.trangThai === 'Đã hủy') {
    throw new ValidationError(`Kế hoạch đã ở trạng thái "${plan.trangThai}"`);
  }

  const isOverdue = (plan as any).ngayDuKien && new Date((plan as any).ngayDuKien) < new Date();
  const data: Record<string, unknown> = { trangThai: 'Đã xuất' };
  if (opts?.lyDoChenhLech) data.lyDoChenhLech = opts.lyDoChenhLech;
  else if (opts?.soLuongThucTe !== undefined && isOverdue) {
    data.lyDoChenhLech = `SL thực xuất: ${opts.soLuongThucTe} (quá hạn)`;
  } else if (isOverdue) {
    data.lyDoChenhLech = 'Đã xuất (quá hạn)';
  }

  await prisma.outboundPlan.update({ where: { id }, data: data as any });
  return prisma.outboundPlan.findUnique({ where: { id }, include: OUTBOUND_INCLUDE as any });
}

export default {
  getAllOutboundPlans,
  getOutboundPlanById,
  updateOutboundPlan,
  cancelOutboundPlan,
  markReceived,
};
