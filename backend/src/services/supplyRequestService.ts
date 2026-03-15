import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';

interface CreateSupplyRequestRequest {
  employeeId: string;
  maNhanVien: string;
  tenNhanVien: string;
  boPhan: string;
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  mucDichYeuCau: string;
  mucDoUuTien: string;
  ghiChu?: string;
  trangThai?: string;
  fileKemTheo?: string;
}

interface UpdateSupplyRequestRequest {
  phanLoai?: string;
  tenGoi?: string;
  soLuong?: number;
  donViTinh?: string;
  mucDichYeuCau?: string;
  mucDoUuTien?: string;
  ghiChu?: string;
  trangThai?: string;
  fileKemTheo?: string;
}

class SupplyRequestService {
  /**
   * Generate supply request code
   * Format: YC-CC{SEQUENCE}
   * Example: YC-CC001, YC-CC002
   */
  async generateSupplyRequestCode(): Promise<string> {
    const lastRequest = await prisma.supplyRequest.findFirst({
      orderBy: {
        maYeuCau: 'desc',
      },
    });

    let sequence = 1;
    if (lastRequest && lastRequest.maYeuCau) {
      const match = lastRequest.maYeuCau.match(/YC-CC(\d+)/);
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    return `YC-CC${sequence.toString().padStart(3, '0')}`;
  }

  async getAllSupplyRequests(page: number = 1, limit: number = 10, search?: string) {
    const { skip } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maYeuCau: { contains: search, mode: 'insensitive' as const } },
            { tenNhanVien: { contains: search, mode: 'insensitive' as const } },
            { maNhanVien: { contains: search, mode: 'insensitive' as const } },
            { tenGoi: { contains: search, mode: 'insensitive' as const } },
            { phanLoai: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.supplyRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          employee: {
            include: {
              user: true,
              position: true,
            },
          },
          purchaseRequests: true,
          warehouseReceipts: true,
        },
      }),
      prisma.supplyRequest.count({ where }),
    ]);

    return {
      data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    };
  }

  async getSupplyRequestById(id: string) {
    const supplyRequest = await prisma.supplyRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        purchaseRequests: true,
      },
    });

    if (!supplyRequest) {
      throw new NotFoundError('Supply request not found');
    }

    return supplyRequest;
  }

  async createSupplyRequest(data: CreateSupplyRequestRequest) {
    // Validate employeeId exists
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });
    if (!employee) {
      throw new ValidationError('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.');
    }

    const maYeuCau = await this.generateSupplyRequestCode();

    const supplyRequest = await prisma.supplyRequest.create({
      data: {
        maYeuCau,
        employeeId: data.employeeId,
        maNhanVien: data.maNhanVien,
        tenNhanVien: data.tenNhanVien,
        boPhan: data.boPhan,
        phanLoai: data.phanLoai,
        tenGoi: data.tenGoi,
        soLuong: data.soLuong,
        donViTinh: data.donViTinh,
        mucDichYeuCau: data.mucDichYeuCau,
        mucDoUuTien: data.mucDoUuTien,
        ghiChu: data.ghiChu,
        trangThai: data.trangThai || 'Chưa cung cấp',
        fileKemTheo: data.fileKemTheo,
      },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
        purchaseRequests: true,
      },
    });

    return supplyRequest;
  }

  async updateSupplyRequest(id: string, data: UpdateSupplyRequestRequest) {
    const supplyRequest = await prisma.supplyRequest.update({
      where: { id },
      data,
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    return supplyRequest;
  }

  async deleteSupplyRequest(id: string) {
    await prisma.supplyRequest.delete({
      where: { id },
    });
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { maYeuCau: { contains: filters.search, mode: 'insensitive' as const } },
        { tenNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        { maNhanVien: { contains: filters.search, mode: 'insensitive' as const } },
        { tenGoi: { contains: filters.search, mode: 'insensitive' as const } },
        { phanLoai: { contains: filters.search, mode: 'insensitive' as const } },
      ];
    }

    const data = await prisma.supplyRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách yêu cầu cung cấp');

    worksheet.columns = [
      { header: 'Ngày yêu cầu', key: 'ngayYeuCau', width: 15 },
      { header: 'Mã yêu cầu', key: 'maYeuCau', width: 15 },
      { header: 'Nhân viên', key: 'tenNhanVien', width: 25 },
      { header: 'Bộ phận', key: 'boPhan', width: 20 },
      { header: 'Phân loại', key: 'phanLoai', width: 15 },
      { header: 'Tên gọi', key: 'tenGoi', width: 25 },
      { header: 'Số lượng', key: 'soLuong', width: 12 },
      { header: 'Đơn vị tính', key: 'donViTinh', width: 12 },
      { header: 'Mức độ ưu tiên', key: 'mucDoUuTien', width: 15 },
      { header: 'Trạng thái', key: 'trangThai', width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item) => {
      worksheet.addRow({
        ngayYeuCau: new Date(item.createdAt).toLocaleDateString('vi-VN'),
        maYeuCau: item.maYeuCau,
        tenNhanVien: item.tenNhanVien,
        boPhan: item.boPhan,
        phanLoai: item.phanLoai,
        tenGoi: item.tenGoi,
        soLuong: item.soLuong,
        donViTinh: item.donViTinh,
        mucDoUuTien: item.mucDoUuTien,
        trangThai: item.trangThai,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new SupplyRequestService();
