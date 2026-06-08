import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { NotFoundError } from '@utils/errors';
import { MachineSystemCategory } from '@prisma/client';
import ExcelJS from 'exceljs';

interface CreateMachineSystemData {
  khuVuc: string;
  viTri: string;
  maHeThong: string;
  tenHeThong: string;
  chucNang: string;
  loaiHeThong: MachineSystemCategory;
  maThietBi?: string;
  tenThietBi?: string;
  nhiemVu?: string;
  maNguoiThucHien?: string;
  nguoiThucHien?: string;
  fileDinhKem?: string;
  hoatDong?: boolean;
}

interface UpdateMachineSystemData {
  khuVuc?: string;
  viTri?: string;
  maHeThong?: string;
  tenHeThong?: string;
  chucNang?: string;
  loaiHeThong?: MachineSystemCategory;
  maThietBi?: string;
  tenThietBi?: string;
  nhiemVu?: string;
  maNguoiThucHien?: string;
  nguoiThucHien?: string;
  fileDinhKem?: string;
  hoatDong?: boolean;
}

const CATEGORY_PREFIX_MAP: Record<MachineSystemCategory, string> = {
  SAN_XUAT: 'SX',
  DONG_GOI: 'DG',
  BAO_QUAN: 'BQ',
  DIEN: 'DT',
  NUOC: 'NU',
  HOI: 'HI',
  KHI_NEN: 'KN',
  LAM_NONG: 'LM',
  VAN_CHUYEN: 'VC',
  PCCC: 'PC',
  CHAT_THAI: 'CT',
  KIEM_TRA_CL: 'KT',
  AN_TOAN: 'AT',
  KHAC: 'KH',
};

class MachineSystemService {
  async generateCode(loaiHeThong: MachineSystemCategory): Promise<string> {
    const prefix = CATEGORY_PREFIX_MAP[loaiHeThong];
    const lastSystem = await prisma.machineSystem.findFirst({
      where: { maHeThong: { startsWith: `${prefix}-` } },
      orderBy: { maHeThong: 'desc' },
      select: { maHeThong: true },
    });

    if (!lastSystem) {
      return `${prefix}-001`;
    }

    const parts = lastSystem.maHeThong.split('-');
    const lastNum = parseInt(parts[1] ?? '0', 10);
    const nextNum = lastNum + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }

  async getNextCode(loaiHeThong: MachineSystemCategory): Promise<string> {
    return this.generateCode(loaiHeThong);
  }

  async getDistinctField(field: 'khuVuc' | 'viTri'): Promise<string[]> {
    const results = await prisma.$queryRaw<{ value: string }[]>`
      SELECT DISTINCT ${field} as value
      FROM business.machine_systems
      WHERE ${field} IS NOT NULL AND ${field} != ''
      ORDER BY value ASC
    `;
    return results.map((r) => r.value).filter((v) => v.length > 0);
  }

  async getAllMachineSystems(page: number = 1, limit: number = 10, search?: string) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where = search
      ? {
          OR: [
            { maHeThong: { contains: search, mode: 'insensitive' as const } },
            { tenHeThong: { contains: search, mode: 'insensitive' as const } },
            { khuVuc: { contains: search, mode: 'insensitive' as const } },
            { viTri: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.machineSystem.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.machineSystem.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getMachineSystemById(id: string) {
    const system = await prisma.machineSystem.findUnique({ where: { id } });
    if (!system) throw new NotFoundError('Không tìm thấy hệ thống máy');
    return system;
  }

  async createMachineSystem(data: CreateMachineSystemData) {
    return prisma.machineSystem.create({ data });
  }

  async updateMachineSystem(id: string, data: UpdateMachineSystemData) {
    await this.getMachineSystemById(id);
    return prisma.machineSystem.update({ where: { id }, data });
  }

  async deleteMachineSystem(id: string) {
    await this.getMachineSystemById(id);
    return prisma.machineSystem.delete({ where: { id } });
  }

  async getMachinesForSystem(systemId: string) {
    await this.getMachineSystemById(systemId);
    const machines = await prisma.machine.findMany({
      where: { machineSystemId: systemId },
      orderBy: { maMay: 'asc' },
      include: {
        _count: {
          select: {
            faultRecords: { where: { trangThai: { not: 'Đã xử lý' } } },
            repairRequestItems: true,
          },
        },
      },
    });
    return machines;
  }

  async exportToExcel() {
    const data = await prisma.machineSystem.findMany({ orderBy: { createdAt: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hệ thống máy');

    sheet.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Khu vực', key: 'khuVuc', width: 15 },
      { header: 'Vị trí', key: 'viTri', width: 15 },
      { header: 'Mã hệ thống', key: 'maHeThong', width: 15 },
      { header: 'Tên hệ thống', key: 'tenHeThong', width: 25 },
      { header: 'Loại hệ thống', key: 'loaiHeThong', width: 18 },
      { header: 'Chức năng', key: 'chucNang', width: 30 },
      { header: 'Mã thiết bị', key: 'maThietBi', width: 15 },
      { header: 'Tên thiết bị', key: 'tenThietBi', width: 25 },
      { header: 'Nhiệm vụ', key: 'nhiemVu', width: 30 },
      { header: 'Mã NTH', key: 'maNguoiThucHien', width: 12 },
      { header: 'Người thực hiện', key: 'nguoiThucHien', width: 20 },
      { header: 'Hoạt động', key: 'hoatDong', width: 12 },
      { header: 'Ngày tạo', key: 'createdAt', width: 15 },
    ];

    data.forEach((item, index) => {
      sheet.addRow({
        stt: index + 1,
        khuVuc: item.khuVuc,
        viTri: item.viTri,
        maHeThong: item.maHeThong,
        tenHeThong: item.tenHeThong,
        loaiHeThong: item.loaiHeThong,
        chucNang: item.chucNang,
        maThietBi: item.maThietBi ?? '',
        tenThietBi: item.tenThietBi ?? '',
        nhiemVu: item.nhiemVu ?? '',
        maNguoiThucHien: item.maNguoiThucHien ?? '',
        nguoiThucHien: item.nguoiThucHien ?? '',
        hoatDong: item.hoatDong ? 'Có' : 'Không',
        createdAt: item.createdAt.toLocaleDateString('vi-VN'),
      });
    });

    return workbook;
  }
}

export default new MachineSystemService();
