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

  /**
   * Get total tongKhoiLuong (total output weight) by date
   * This aggregates all finished products from ALL machines for a specific date based on thoiGianChien
   * Similar to "Tổng các máy" tab calculation - sums all component weights from all machines
   */
  async getTotalWeightByDate(date: string) {
    // Parse the input date (format: YYYY-MM-DD)
    // thoiGianChien is stored as a String in format YYYY-MM-DDTHH:mm
    // We need to find all products where thoiGianChien starts with the date

    console.log('[getTotalWeightByDate] Input date:', date);

    // Get all finished products and filter by date in application code
    // since thoiGianChien is a String field, not DateTime
    const allProducts = await prisma.finishedProduct.findMany({
      select: {
        maChien: true,
        thoiGianChien: true,
        tenHangHoa: true,
        tenMay: true,
        aKhoiLuong: true,
        bKhoiLuong: true,
        bDauKhoiLuong: true,
        cKhoiLuong: true,
        vunLonKhoiLuong: true,
        vunNhoKhoiLuong: true,
        phePhamKhoiLuong: true,
        uotKhoiLuong: true,
      },
    });

    console.log('[getTotalWeightByDate] Total products in DB:', allProducts.length);
    console.log('[getTotalWeightByDate] Sample thoiGianChien values:', allProducts.slice(0, 5).map(p => p.thoiGianChien));

    // Filter products by date (thoiGianChien format: YYYY-MM-DDTHH:mm or ISO string)
    const products = allProducts.filter(product => {
      if (!product.thoiGianChien) return false;

      // Extract date part from thoiGianChien
      // Handle both YYYY-MM-DDTHH:mm and ISO string formats (with timezone)
      // Need to convert to local date for proper comparison
      let productDate: string;

      // Check if it's an ISO string with timezone (contains 'Z' or '+' or has milliseconds)
      if (product.thoiGianChien.includes('Z') || product.thoiGianChien.includes('+') || product.thoiGianChien.includes('.')) {
        // Parse as Date and get local date
        const dateObj = new Date(product.thoiGianChien);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        productDate = `${year}-${month}-${day}`;
      } else {
        // Simple format like YYYY-MM-DDTHH:mm, just split by T
        productDate = product.thoiGianChien.split('T')[0];
      }

      const targetDate = date.split('T')[0]; // In case date includes time

      return productDate === targetDate;
    });

    console.log('[getTotalWeightByDate] Filtered products count:', products.length);
    console.log('[getTotalWeightByDate] Filtered products:', products.map(p => ({ maChien: p.maChien, tenMay: p.tenMay, thoiGianChien: p.thoiGianChien })));

    // Calculate total weight by summing all component weights from all machines
    // This matches the "Tổng các máy" tab calculation logic
    const totalWeight = products.reduce((sum, product) => {
      const productTotal =
        (product.aKhoiLuong || 0) +
        (product.bKhoiLuong || 0) +
        (product.bDauKhoiLuong || 0) +
        (product.cKhoiLuong || 0) +
        (product.vunLonKhoiLuong || 0) +
        (product.vunNhoKhoiLuong || 0) +
        (product.phePhamKhoiLuong || 0) +
        (product.uotKhoiLuong || 0);
      return sum + productTotal;
    }, 0);

    return {
      date,
      totalWeight,
      productCount: products.length,
      machines: [...new Set(products.map(p => p.tenMay).filter(Boolean))], // List of unique machines
    };
  }
}

export default new FinishedProductService();

