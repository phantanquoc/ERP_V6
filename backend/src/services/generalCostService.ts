import prisma from '@config/database';
import { GeneralCost } from '@prisma/client';
import ExcelJS from 'exceljs';

export interface CreateGeneralCostInput {
  tenChiPhi: string;
  loaiChiPhi: string;
  noiDung?: string;
  donViTinh?: string;
  msnv?: string;
  tenNhanVien?: string;
  giaThanhNgay?: number;
  donViTien?: string;
}

export interface UpdateGeneralCostInput {
  tenChiPhi?: string;
  loaiChiPhi?: string;
  noiDung?: string;
  donViTinh?: string;
  giaThanhNgay?: number;
  donViTien?: string;
}

class GeneralCostService {
  // Generate unique code
  private async generateCode(): Promise<string> {
    const lastCost = await prisma.generalCost.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { maChiPhi: true }
    });

    if (!lastCost) {
      return 'CP-001';
    }

    const lastNumber = parseInt(lastCost.maChiPhi.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `CP-${newNumber.toString().padStart(3, '0')}`;
  }

  // Get all general costs with pagination
  async getAllGeneralCosts(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { maChiPhi: { contains: search, mode: 'insensitive' as any } },
        { tenChiPhi: { contains: search, mode: 'insensitive' as any } },
        { loaiChiPhi: { contains: search, mode: 'insensitive' as any } },
        { tenNhanVien: { contains: search, mode: 'insensitive' as any } }
      ]
    } : {};

    const [data, total] = await Promise.all([
      prisma.generalCost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.generalCost.count({ where })
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get general cost by ID
  async getGeneralCostById(id: string): Promise<GeneralCost | null> {
    return await prisma.generalCost.findUnique({
      where: { id }
    });
  }

  // Create general cost
  async createGeneralCost(input: CreateGeneralCostInput): Promise<GeneralCost> {
    const maChiPhi = await this.generateCode();

    return await prisma.generalCost.create({
      data: {
        maChiPhi,
        ...input
      }
    });
  }

  // Update general cost
  async updateGeneralCost(id: string, input: UpdateGeneralCostInput): Promise<GeneralCost> {
    return await prisma.generalCost.update({
      where: { id },
      data: input
    });
  }

  // Delete general cost
  async deleteGeneralCost(id: string): Promise<GeneralCost> {
    return await prisma.generalCost.delete({
      where: { id }
    });
  }

  // Export to Excel
  async exportToExcel(_filters?: any): Promise<Buffer> {
    const data = await prisma.generalCost.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Chi phí chung');

    worksheet.columns = [
      { header: 'Mã chi phí', key: 'maChiPhi', width: 15 },
      { header: 'Tên chi phí', key: 'tenChiPhi', width: 25 },
      { header: 'Loại chi phí', key: 'loaiChiPhi', width: 20 },
      { header: 'Nội dung', key: 'noiDung', width: 30 },
      { header: 'Đơn vị tính', key: 'donViTinh', width: 15 },
      { header: 'Giá thành/ngày', key: 'giaThanhNgay', width: 20 },
      { header: 'Đơn vị tiền', key: 'donViTien', width: 12 },
      { header: 'MSNV', key: 'msnv', width: 15 },
      { header: 'Người tạo', key: 'tenNhanVien', width: 25 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item) => {
      worksheet.addRow({
        maChiPhi: item.maChiPhi,
        tenChiPhi: item.tenChiPhi,
        loaiChiPhi: item.loaiChiPhi,
        noiDung: item.noiDung || '',
        donViTinh: item.donViTinh || '',
        giaThanhNgay: item.giaThanhNgay || 0,
        donViTien: item.donViTien || 'VND',
        msnv: item.msnv || '',
        tenNhanVien: item.tenNhanVien || '',
        createdAt: new Date(item.createdAt).toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new GeneralCostService();

