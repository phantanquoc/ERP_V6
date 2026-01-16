import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

export class ProductionReportService {
  async getAllProductionReports(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.productionReport.findMany({
        skip,
        take: limit,
        orderBy: { ngayThang: 'desc' },
      }),
      prisma.productionReport.count(),
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

  async getProductionReportById(id: string) {
    const report = await prisma.productionReport.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundError('Báo cáo sản lượng không tồn tại');
    }

    return report;
  }

  async createProductionReport(data: any, userId?: string) {
    // Validate required fields
    if (!data.ngayThang) {
      throw new ValidationError('Thiếu thông tin ngày tháng');
    }

    // Get user's full name if userId is provided
    let nguoiThucHien = data.nguoiThucHien || '';
    if (userId && !data.nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.firstName} ${user.lastName}`.trim();
      }
    }

    // Auto-calculate chenhLechKhoiLuong
    const khoiLuongThanhPhamThucTe = data.khoiLuongThanhPhamThucTe || 0;
    const tongKhoiLuongThanhPhamDinhMuc = data.tongKhoiLuongThanhPhamDinhMuc || 0;
    const chenhLechKhoiLuong = khoiLuongThanhPhamThucTe - tongKhoiLuongThanhPhamDinhMuc;

    const report = await prisma.productionReport.create({
      data: {
        ...data,
        nguoiThucHien,
        chenhLechKhoiLuong,
      },
    });

    return report;
  }

  async updateProductionReport(id: string, data: any, userId?: string) {
    await this.getProductionReportById(id);

    // Get user's full name if userId is provided and nguoiThucHien is not in data
    let nguoiThucHien = data.nguoiThucHien;
    if (userId && !data.nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.firstName} ${user.lastName}`.trim();
      }
    }

    // Auto-calculate chenhLechKhoiLuong if related fields are updated
    let chenhLechKhoiLuong = data.chenhLechKhoiLuong;
    if (data.khoiLuongThanhPhamThucTe !== undefined || data.tongKhoiLuongThanhPhamDinhMuc !== undefined) {
      const existing = await this.getProductionReportById(id);
      const khoiLuongThanhPhamThucTe = data.khoiLuongThanhPhamThucTe !== undefined 
        ? data.khoiLuongThanhPhamThucTe 
        : existing.khoiLuongThanhPhamThucTe;
      const tongKhoiLuongThanhPhamDinhMuc = data.tongKhoiLuongThanhPhamDinhMuc !== undefined 
        ? data.tongKhoiLuongThanhPhamDinhMuc 
        : existing.tongKhoiLuongThanhPhamDinhMuc;
      chenhLechKhoiLuong = khoiLuongThanhPhamThucTe - tongKhoiLuongThanhPhamDinhMuc;
    }

    const updateData: any = { ...data };
    if (nguoiThucHien !== undefined) {
      updateData.nguoiThucHien = nguoiThucHien;
    }
    if (chenhLechKhoiLuong !== undefined) {
      updateData.chenhLechKhoiLuong = chenhLechKhoiLuong;
    }

    const report = await prisma.productionReport.update({
      where: { id },
      data: updateData,
    });

    return report;
  }

  async deleteProductionReport(id: string) {
    await this.getProductionReportById(id);

    await prisma.productionReport.delete({
      where: { id },
    });

    return { message: 'Xóa báo cáo sản lượng thành công' };
  }
}

export default new ProductionReportService();

