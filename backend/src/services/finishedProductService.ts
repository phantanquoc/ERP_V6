import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

export class FinishedProductService {
  async getAllFinishedProducts(page: number = 1, limit: number = 10, tenMay?: string) {
    const skip = (page - 1) * limit;

    // Filter by machine name directly
    const whereClause = tenMay ? { tenMay } : {};

    const [data, total] = await Promise.all([
      prisma.finishedProduct.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          materialEvaluation: {
            select: {
              maChien: true,
              tenHangHoa: true,
              thoiGianChien: true,
            },
          },
          machine: {
            select: {
              id: true,
              tenMay: true,
              maMay: true,
            },
          },
        },
      }),
      prisma.finishedProduct.count({ where: whereClause }),
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

  async getFinishedProductById(id: string) {
    const product = await prisma.finishedProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Thành phẩm không tồn tại');
    }

    return product;
  }

  async createFinishedProduct(data: any, userId?: string) {
    // Validate required fields
    if (!data.maChien || !data.thoiGianChien || !data.tenHangHoa || data.khoiLuong === undefined) {
      throw new ValidationError('Thiếu thông tin bắt buộc');
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

    // Calculate total output weight
    const tongKhoiLuong =
      (data.aKhoiLuong || 0) +
      (data.bKhoiLuong || 0) +
      (data.bDauKhoiLuong || 0) +
      (data.cKhoiLuong || 0) +
      (data.vunLonKhoiLuong || 0) +
      (data.vunNhoKhoiLuong || 0) +
      (data.phePhamKhoiLuong || 0) +
      (data.uotKhoiLuong || 0);

    // Calculate percentages (tỉ lệ %)
    const calculatePercentage = (value: number) => {
      return tongKhoiLuong > 0 ? (value / tongKhoiLuong) * 100 : 0;
    };

    const product = await prisma.finishedProduct.create({
      data: {
        ...data,
        nguoiThucHien,
        tongKhoiLuong,
        aTiLe: calculatePercentage(data.aKhoiLuong || 0),
        bTiLe: calculatePercentage(data.bKhoiLuong || 0),
        bDauTiLe: calculatePercentage(data.bDauKhoiLuong || 0),
        cTiLe: calculatePercentage(data.cKhoiLuong || 0),
        vunLonTiLe: calculatePercentage(data.vunLonKhoiLuong || 0),
        vunNhoTiLe: calculatePercentage(data.vunNhoKhoiLuong || 0),
        phePhamTiLe: calculatePercentage(data.phePhamKhoiLuong || 0),
        uotTiLe: calculatePercentage(data.uotKhoiLuong || 0),
      },
    });

    return product;
  }

  async updateFinishedProduct(id: string, data: any, userId?: string) {
    const existing = await this.getFinishedProductById(id);

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

    // Get final values for each weight field
    const aKhoiLuong = data.aKhoiLuong !== undefined ? data.aKhoiLuong : existing.aKhoiLuong;
    const bKhoiLuong = data.bKhoiLuong !== undefined ? data.bKhoiLuong : existing.bKhoiLuong;
    const bDauKhoiLuong = data.bDauKhoiLuong !== undefined ? data.bDauKhoiLuong : existing.bDauKhoiLuong;
    const cKhoiLuong = data.cKhoiLuong !== undefined ? data.cKhoiLuong : existing.cKhoiLuong;
    const vunLonKhoiLuong = data.vunLonKhoiLuong !== undefined ? data.vunLonKhoiLuong : existing.vunLonKhoiLuong;
    const vunNhoKhoiLuong = data.vunNhoKhoiLuong !== undefined ? data.vunNhoKhoiLuong : existing.vunNhoKhoiLuong;
    const phePhamKhoiLuong = data.phePhamKhoiLuong !== undefined ? data.phePhamKhoiLuong : existing.phePhamKhoiLuong;
    const uotKhoiLuong = data.uotKhoiLuong !== undefined ? data.uotKhoiLuong : existing.uotKhoiLuong;

    // Calculate total output weight
    const tongKhoiLuong =
      aKhoiLuong +
      bKhoiLuong +
      bDauKhoiLuong +
      cKhoiLuong +
      vunLonKhoiLuong +
      vunNhoKhoiLuong +
      phePhamKhoiLuong +
      uotKhoiLuong;

    // Calculate percentages (tỉ lệ %)
    const calculatePercentage = (value: number) => {
      return tongKhoiLuong > 0 ? (value / tongKhoiLuong) * 100 : 0;
    };

    const updateData: any = {
      ...data,
      tongKhoiLuong,
      aTiLe: calculatePercentage(aKhoiLuong),
      bTiLe: calculatePercentage(bKhoiLuong),
      bDauTiLe: calculatePercentage(bDauKhoiLuong),
      cTiLe: calculatePercentage(cKhoiLuong),
      vunLonTiLe: calculatePercentage(vunLonKhoiLuong),
      vunNhoTiLe: calculatePercentage(vunNhoKhoiLuong),
      phePhamTiLe: calculatePercentage(phePhamKhoiLuong),
      uotTiLe: calculatePercentage(uotKhoiLuong),
    };

    // Only update nguoiThucHien if it's provided
    if (nguoiThucHien !== undefined) {
      updateData.nguoiThucHien = nguoiThucHien;
    }

    const product = await prisma.finishedProduct.update({
      where: { id },
      data: updateData,
    });

    // Auto-sync percentages to related quality evaluation
    await prisma.qualityEvaluation.updateMany({
      where: { finishedProductId: id },
      data: {
        aTiLe: updateData.aTiLe,
        bTiLe: updateData.bTiLe,
        bDauTiLe: updateData.bDauTiLe,
        cTiLe: updateData.cTiLe,
        vunLonTiLe: updateData.vunLonTiLe,
        vunNhoTiLe: updateData.vunNhoTiLe,
        phePhamTiLe: updateData.phePhamTiLe,
        uotTiLe: updateData.uotTiLe,
      },
    });

    return product;
  }

  async deleteFinishedProduct(id: string) {
    await this.getFinishedProductById(id);

    await prisma.finishedProduct.delete({
      where: { id },
    });

    return { message: 'Xóa thành phẩm thành công' };
  }
}

export default new FinishedProductService();

