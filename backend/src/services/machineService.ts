import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextStaticCode, staticCodeWhere } from '@utils/codeGenerator';
import ExcelJS from 'exceljs';

export class MachineService {
  async getAllMachines(
    page: number = 1,
    limit: number = 100,
    filters?: { search?: string; machineSystemId?: string; trangThai?: string },
  ) {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (filters?.machineSystemId) where.machineSystemId = filters.machineSystemId;
    if (filters?.trangThai) where.trangThai = filters.trangThai;
    if (filters?.search) {
      where.OR = [
        { maMay: { contains: filters.search, mode: 'insensitive' } },
        { tenMay: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.machine.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: { machineSystem: true },
      }),
      prisma.machine.count({ where }),
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
        machineSystem: true,
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

  async getMachineSummary(id: string) {
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: {
        machineSystem: true,
        faultRecords: {
          orderBy: { ngayPhatHien: 'desc' },
          take: 3,
          include: { machineSystem: true },
        },
        repairRequestItems: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            repairRequest: { select: { id: true, maYeuCau: true, trangThai: true } },
          },
        },
        systemOperations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!machine) {
      throw new NotFoundError('Không tìm thấy máy');
    }

    return machine;
  }

  async generateMachineCode(): Promise<string> {
    const last = await prisma.machine.findFirst({
      where: { maMay: staticCodeWhere('MAY') },
      orderBy: { maMay: 'desc' },
      select: { maMay: true },
    });
    return nextStaticCode(last?.maMay ?? null, 'MAY');
  }

  async createMachine(data: {
    tenMay: string;
    moTa?: string;
    trangThai?: 'HOAT_DONG' | 'BẢO_TRÌ' | 'NGỪNG_HOẠT_ĐỘNG';
    ghiChu?: string;
    machineSystemId?: string;
  }) {
    // Check if machine name already exists
    const existingMachine = await prisma.machine.findUnique({
      where: { tenMay: data.tenMay },
    });

    if (existingMachine) {
      throw new ValidationError('Tên máy đã tồn tại');
    }

    // Validate machineSystemId if provided
    if (data.machineSystemId) {
      const machineSystem = await prisma.machineSystem.findUnique({
        where: { id: data.machineSystemId },
      });
      if (!machineSystem) {
        throw new ValidationError('Không tìm thấy hệ thống máy');
      }
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
        machineSystemId: data.machineSystemId || null,
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
      machineSystemId?: string | null;
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

    // Validate machineSystemId if provided
    if (data.machineSystemId) {
      const machineSystem = await prisma.machineSystem.findUnique({
        where: { id: data.machineSystemId },
      });
      if (!machineSystem) {
        throw new ValidationError('Không tìm thấy hệ thống máy');
      }
    }

    const machine = await prisma.machine.update({
      where: { id },
      data: {
        tenMay: data.tenMay,
        moTa: data.moTa,
        trangThai: data.trangThai,
        ghiChu: data.ghiChu,
        machineSystemId: data.machineSystemId,
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

