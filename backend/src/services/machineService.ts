import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';

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
      include: {
        systemOperations: true,
      },
    });

    if (!existing) {
      throw new NotFoundError('Machine not found');
    }

    if (existing.systemOperations.length > 0) {
      throw new ValidationError('Không thể xóa máy đã có thông số vận hành');
    }

    await prisma.machine.delete({
      where: { id },
    });

    return { message: 'Machine deleted successfully' };
  }
}

export default new MachineService();

