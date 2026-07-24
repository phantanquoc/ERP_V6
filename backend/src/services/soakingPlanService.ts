import { Prisma, SoakingPlanStatus } from '@prisma/client';
import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

interface CreateSoakingPlanInput {
  orderId: string;
  orderItemId: string;
  productId: string;
  soLanNgam: number;
  nhietDoNuocTruocNgam: number;
  nhietDoNuocSauVot: number;
  thoiGianNgam: number;
  brixNuocNgam: number;
  khoiLuong: number;
}

interface UpdateSoakingPlanInput {
  soLanNgam?: number;
  nhietDoNuocTruocNgam?: number;
  nhietDoNuocSauVot?: number;
  thoiGianNgam?: number;
  brixNuocNgam?: number;
  khoiLuong?: number;
}

interface ListFilters {
  orderId?: string;
  productId?: string;
  trangThai?: SoakingPlanStatus;
}

export class SoakingPlanService {
  async createSoakingPlan(data: CreateSoakingPlanInput, userId?: string) {
    // Validate order exists and is in correct status
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      select: { id: true, trangThaiSanXuat: true },
    });

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng');
    }

    if (order.trangThaiSanXuat !== 'CHO_LEN_KE_HOACH') {
      throw new ValidationError('Chỉ được tạo kế hoạch ngâm cho đơn hàng ở trạng thái Chờ lên kế hoạch');
    }

    // Validate required fields
    if (
      data.soLanNgam == null ||
      data.nhietDoNuocTruocNgam == null ||
      data.nhietDoNuocSauVot == null ||
      data.thoiGianNgam == null ||
      data.brixNuocNgam == null ||
      data.khoiLuong == null
    ) {
      throw new ValidationError('Thiếu thông số ngâm bắt buộc');
    }

    // Get product info for denormalization
    const product = await prisma.internationalProduct.findUnique({
      where: { id: data.productId },
      select: { maSanPham: true, tenSanPham: true },
    });

    if (!product) {
      throw new NotFoundError('Không tìm thấy sản phẩm');
    }

    const soakingPlan = await prisma.soakingPlan.create({
      data: {
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        productId: data.productId,
        maSanPham: product.maSanPham,
        tenSanPham: product.tenSanPham,
        soLanNgam: data.soLanNgam,
        nhietDoNuocTruocNgam: data.nhietDoNuocTruocNgam,
        nhietDoNuocSauVot: data.nhietDoNuocSauVot,
        thoiGianNgam: data.thoiGianNgam,
        brixNuocNgam: data.brixNuocNgam,
        khoiLuong: data.khoiLuong,
        trangThai: 'HIEU_LUC',
        createdById: userId,
      },
      include: {
        order: { select: { maDonHang: true, tenKhachHang: true } },
      },
    });

    return soakingPlan;
  }

  async updateSoakingPlan(id: string, data: UpdateSoakingPlanInput) {
    const existing = await prisma.soakingPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy kế hoạch ngâm');
    }
    if (existing.trangThai === 'HUY') {
      throw new ValidationError('Không thể cập nhật kế hoạch đã huỷ');
    }

    const soakingPlan = await prisma.soakingPlan.update({
      where: { id },
      data: {
        ...(data.soLanNgam !== undefined && { soLanNgam: data.soLanNgam }),
        ...(data.nhietDoNuocTruocNgam !== undefined && { nhietDoNuocTruocNgam: data.nhietDoNuocTruocNgam }),
        ...(data.nhietDoNuocSauVot !== undefined && { nhietDoNuocSauVot: data.nhietDoNuocSauVot }),
        ...(data.thoiGianNgam !== undefined && { thoiGianNgam: data.thoiGianNgam }),
        ...(data.brixNuocNgam !== undefined && { brixNuocNgam: data.brixNuocNgam }),
        ...(data.khoiLuong !== undefined && { khoiLuong: data.khoiLuong }),
      },
      include: {
        order: { select: { maDonHang: true, tenKhachHang: true } },
      },
    });

    return soakingPlan;
  }

  async cancelSoakingPlan(id: string) {
    const existing = await prisma.soakingPlan.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy kế hoạch ngâm');
    }
    if (existing.trangThai === 'HUY') {
      throw new ValidationError('Kế hoạch đã được huỷ trước đó');
    }

    const soakingPlan = await prisma.soakingPlan.update({
      where: { id },
      data: { trangThai: 'HUY' },
      include: {
        order: { select: { maDonHang: true, tenKhachHang: true } },
      },
    });

    return soakingPlan;
  }

  async listSoakingPlans(page: number = 1, limit: number = 10, filters?: ListFilters) {
    const skip = (page - 1) * limit;
    const where: Prisma.SoakingPlanWhereInput = {};

    if (filters?.orderId) where.orderId = filters.orderId;
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.trangThai) where.trangThai = filters.trangThai;

    const [data, total] = await Promise.all([
      prisma.soakingPlan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { maDonHang: true, tenKhachHang: true } },
        },
      }),
      prisma.soakingPlan.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getActiveByProductId(productId: string) {
    const plans = await prisma.soakingPlan.findMany({
      where: {
        productId,
        trangThai: 'HIEU_LUC',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: { select: { maDonHang: true, tenKhachHang: true } },
      },
    });

    return plans;
  }

  async listPlannableOrders(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      trangThaiSanXuat: 'CHO_LEN_KE_HOACH',
    };

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          maDonHang: true,
          tenKhachHang: true,
          ngayDatHang: true,
          trangThaiSanXuat: true,
          items: {
            select: {
              id: true,
              productId: true,
              maSanPham: true,
              tenHangHoa: true,
              soLuong: true,
              donVi: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

const soakingPlanService = new SoakingPlanService();
export default soakingPlanService;
