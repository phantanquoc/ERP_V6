import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import ExcelJS from 'exceljs';

export class MachineService {
  async getAllMachines(page: number = 1, limit: number = 100) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.machine.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      prisma.machine.count(),
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

  async getMachineById(id: string) {
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        systemOperations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!machine) {
      throw new NotFoundError('Machine not found');
    }

    return machine;
  }

  async generateMachineCode(): Promise<string> {
    const lastMachine = await prisma.machine.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!lastMachine) {
      return 'MAY001';
    }

    const lastCode = lastMachine.maMay;
    const numberPart = parseInt(lastCode.replace('MAY', ''));
    const newNumber = numberPart + 1;
    return `MAY${newNumber.toString().padStart(3, '0')}`;
  }

  async createMachine(data: {
    tenMay: string;
    moTa?: string;
    trangThai?: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
    ghiChu?: string;
  }) {
    // Check if machine name already exists
    const existingMachine = await prisma.machine.findUnique({
      where: { tenMay: data.tenMay },
    });

    if (existingMachine) {
      throw new ValidationError('Tên máy đã tồn tại');
    }

    // Generate machine code
    const maMay = await this.generateMachineCode();

    const machine = await prisma.machine.create({
      data: {
        maMay,
        tenMay: data.tenMay,
        moTa: data.moTa,
        trangThai: data.trangThai || 'HOAT_DONG',
        ghiChu: data.ghiChu,
      },
    });

    return machine;
  }

  async updateMachine(
    id: string,
    data: {
      tenMay?: string;
      moTa?: string;
      trangThai?: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
      ghiChu?: string;
    }
  ) {
    const existing = await prisma.machine.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Machine not found');
    }

    // Check if new name already exists (if changing name)
    if (data.tenMay && data.tenMay !== existing.tenMay) {
      const existingName = await prisma.machine.findUnique({
        where: { tenMay: data.tenMay },
      });

      if (existingName) {
        throw new ValidationError('Tên máy đã tồn tại');
      }
    }

    const machine = await prisma.machine.update({
      where: { id },
      data: {
        tenMay: data.tenMay,
        moTa: data.moTa,
        trangThai: data.trangThai,
        ghiChu: data.ghiChu,
      },
    });

    return machine;
  }

  async deleteMachine(id: string) {
    const existing = await prisma.machine.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Machine not found');
    }

    // Xóa tất cả dữ liệu liên quan trong transaction
    await prisma.$transaction(async (tx) => {
      // 1. Xóa quality evaluations (references finished products)
      await tx.qualityEvaluation.deleteMany({
        where: { machineId: id },
      });

      // 2. Xóa finished products
      await tx.finishedProduct.deleteMany({
        where: { machineId: id },
      });

      // 3. Xóa system operations
      await tx.systemOperation.deleteMany({
        where: { machineId: id },
      });

      // 4. Xóa máy
      await tx.machine.delete({
        where: { id },
      });
    });

    return { message: 'Machine deleted successfully' };
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { maMay: { contains: filters.search, mode: 'insensitive' } },
        { tenMay: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const data = await prisma.machine.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách máy móc');

    worksheet.columns = [
      { header: 'Mã máy', key: 'maMay', width: 15 },
      { header: 'Tên máy', key: 'tenMay', width: 25 },
      { header: 'Mô tả', key: 'moTa', width: 30 },
      { header: 'Trạng thái', key: 'trangThai', width: 20 },
      { header: 'Ghi chú', key: 'ghiChu', width: 25 },
      { header: 'Ngày tạo', key: 'createdAt', width: 18 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((machine) => {
      let statusText = '';
      switch (machine.trangThai) {
        case 'HOAT_DONG': statusText = 'Hoạt động'; break;
        case 'BẢO_TRÌ': statusText = 'Bảo trì'; break;
        case 'NGỪNG_HOẠT_ĐỘNG': statusText = 'Ngừng hoạt động'; break;
        default: statusText = machine.trangThai;
      }

      worksheet.addRow({
        maMay: machine.maMay,
        tenMay: machine.tenMay,
        moTa: machine.moTa || '',
        trangThai: statusText,
        ghiChu: machine.ghiChu || '',
        createdAt: new Date(machine.createdAt).toLocaleDateString('vi-VN'),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new MachineService();

