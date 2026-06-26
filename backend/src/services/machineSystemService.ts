import { MachineStatus, MachineSystemCategory, Prisma } from '@prisma/client';
import prisma from '@config/database';
import { getPaginationParams } from '@utils/helpers';
import { ConflictError, NotFoundError, ValidationError } from '@utils/errors';
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

interface CloneOverrides {
  maHeThong: string;
  tenHeThong: string;
  khuVuc?: string;
  viTri?: string;
}

interface MachineSystemFilters {
  search?: string;
  hoatDong?: boolean;
  trangThai?: MachineStatus;
  loaiHeThong?: MachineSystemCategory;
  maHeThongPrefix?: string;
  sortBy?: 'maHeThong' | 'tenHeThong' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

interface SummaryLimits {
  faultRecords?: number;
  repairItems?: number;
  handoverItems?: number;
  operations?: number;
  maintenanceRecords?: number;
  statusLogs?: number;
  maintenancePlans?: number;
  finishedProducts?: number;
  qualityEvaluations?: number;
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

  async getAllMachineSystems(page: number = 1, limit: number = 10, filters: MachineSystemFilters = {}) {
    const { skip, limit: limitNum } = getPaginationParams(page, limit);

    const where: Prisma.MachineSystemWhereInput = {};

    if (filters.search) {
      where.OR = [
        { maHeThong: { contains: filters.search, mode: 'insensitive' } },
        { tenHeThong: { contains: filters.search, mode: 'insensitive' } },
        { khuVuc: { contains: filters.search, mode: 'insensitive' } },
        { viTri: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.hoatDong !== undefined) where.hoatDong = filters.hoatDong;
    if (filters.trangThai) where.trangThai = filters.trangThai;
    if (filters.loaiHeThong) where.loaiHeThong = filters.loaiHeThong;
    if (filters.maHeThongPrefix) where.maHeThong = { startsWith: filters.maHeThongPrefix };

    const orderBy = { [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc' } as Prisma.MachineSystemOrderByWithRelationInput;

    const [data, total] = await Promise.all([
      prisma.machineSystem.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
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

  /**
   * Returns active production machines: loaiHeThong ∈ categories, trangThai = HOAT_DONG.
   * This is the single source of truth used by createBulkSystemOperations and the frontend.
   */
  async getActiveProductionMachines(categories: MachineSystemCategory[]) {
    return prisma.machineSystem.findMany({
      where: {
        trangThai: 'HOAT_DONG',
        loaiHeThong: { in: categories },
      },
      orderBy: { maHeThong: 'asc' },
    });
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

  /**
   * Clone a machine system and its entire detail tree using top-down BFS.
   * All inserts run inside one prisma.$transaction.
   * maChiTiet codes are regenerated by suffixing the destination machine's identifier.
   * parentSystemId is set on the new row to record lineage.
   */
  async clone(sourceId: string, overrides: CloneOverrides) {
    const source = await prisma.machineSystem.findUnique({
      where: { id: sourceId },
      include: {
        details: {
          orderBy: { thuTu: 'asc' },
        },
      },
    });
    if (!source) throw new NotFoundError('Không tìm thấy hệ thống máy nguồn');

    // Derive a short identifier from destination maHeThong for maChiTiet suffix.
    // e.g. "HT-CCK-01" → last segment "01"
    const parts = overrides.maHeThong.split('-');
    const suffix = parts[parts.length - 1] ?? overrides.maHeThong;

    // Build a map: old detail id → new maChiTiet
    // maChiTiet pattern: replace source identifier portion with destination suffix
    const sourceIdentifier = source.maHeThong.split('-').pop() ?? source.maHeThong;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Create the new machine system
      const newSystem = await tx.machineSystem.create({
        data: {
          khuVuc: overrides.khuVuc ?? source.khuVuc,
          viTri: overrides.viTri ?? source.viTri,
          maHeThong: overrides.maHeThong,
          tenHeThong: overrides.tenHeThong,
          chucNang: source.chucNang,
          loaiHeThong: source.loaiHeThong,
          maThietBi: source.maThietBi,
          tenThietBi: source.tenThietBi,
          nhiemVu: source.nhiemVu,
          maNguoiThucHien: source.maNguoiThucHien,
          nguoiThucHien: source.nguoiThucHien,
          hoatDong: source.hoatDong,
          trangThai: MachineStatus.HOAT_DONG,
          parentSystemId: sourceId,
        },
      });

      if (source.details.length === 0) {
        return newSystem;
      }

      // BFS: process details level by level
      // oldId → newId map, used to remap parentDetailId
      const oldToNew = new Map<string, string>();

      // Separate root details (no parent) from child details
      const rootDetails = source.details.filter((d) => d.parentDetailId === null);
      let queue = [...rootDetails];

      while (queue.length > 0) {
        const nextQueue: typeof queue = [];

        for (const detail of queue) {
          // Regenerate maChiTiet: replace source identifier segment with destination suffix
          const newMaChiTiet = detail.maChiTiet.replace(sourceIdentifier, suffix);

          // Check for collision
          const collision = await tx.machineSystemDetail.findUnique({
            where: { maChiTiet: newMaChiTiet },
          });
          if (collision) {
            throw new ConflictError(
              `Mã chi tiết "${newMaChiTiet}" đã tồn tại. Không thể nhân bản hệ thống máy.`
            );
          }

          const newParentDetailId = detail.parentDetailId
            ? (oldToNew.get(detail.parentDetailId) ?? null)
            : null;

          const created = await tx.machineSystemDetail.create({
            data: {
              machineSystemId: newSystem.id,
              parentDetailId: newParentDetailId,
              loaiChiTiet: detail.loaiChiTiet,
              maChiTiet: newMaChiTiet,
              tenChiTiet: detail.tenChiTiet,
              viTri: detail.viTri,
              moTa: detail.moTa,
              maNguoiPhuTrach: detail.maNguoiPhuTrach,
              nguoiPhuTrach: detail.nguoiPhuTrach,
              thuTu: detail.thuTu,
              hoatDong: detail.hoatDong,
              trangThai: detail.trangThai,
            },
          });

          oldToNew.set(detail.id, created.id);

          // Queue children of this detail
          const children = source.details.filter((d) => d.parentDetailId === detail.id);
          nextQueue.push(...children);
        }

        queue = nextQueue;
      }

      return tx.machineSystem.findUnique({
        where: { id: newSystem.id },
        include: { details: { orderBy: { thuTu: 'asc' } } },
      });
    });
  }

  /**
   * Return recent activity summary for a single physical machine.
   */
  async getSummary(systemId: string, limits: SummaryLimits = {}) {
    const machine = await this.getMachineSystemById(systemId);

    const faultLimit = limits.faultRecords ?? 5;
    const repairLimit = limits.repairItems ?? 5;
    const handoverLimit = limits.handoverItems ?? 5;
    const opLimit = limits.operations ?? 5;
    const maintenanceLimit = limits.maintenanceRecords ?? 5;
    const statusLimit = limits.statusLogs ?? 10;
    const maintenancePlanLimit = limits.maintenancePlans ?? 5;
    const finishedProductLimit = limits.finishedProducts ?? 5;
    const qualityEvalLimit = limits.qualityEvaluations ?? 5;

    const [
      faultRecords,
      repairItems,
      handoverItems,
      systemOperations,
      maintenanceRecords,
      statusLogs,
      machineWithLineage,
      maintenancePlans,
      finishedProducts,
      qualityEvaluations,
    ] = await Promise.all([
      prisma.faultRecord.findMany({
        where: { machineSystemId: systemId },
        orderBy: { createdAt: 'desc' },
        take: faultLimit,
        select: { id: true, maLoi: true, tenLoi: true, mucDo: true, trangThai: true, ngayPhatHien: true },
      }),
      prisma.repairRequestItem.findMany({
        where: { machineSystemId: systemId },
        orderBy: { createdAt: 'desc' },
        take: repairLimit,
        select: {
          id: true,
          tenHeThong: true,
          loaiLoi: true,
          noiDungLoi: true,
          createdAt: true,
          repairRequest: { select: { id: true, maYeuCau: true, trangThai: true } },
        },
      }),
      prisma.acceptanceHandoverItem.findMany({
        where: { machineSystemId: systemId },
        orderBy: { createdAt: 'desc' },
        take: handoverLimit,
        select: {
          id: true,
          tenHeThong: true,
          tinhTrangTruocSuaChua: true,
          tinhTrangSauSuaChua: true,
          createdAt: true,
          acceptanceHandover: { select: { id: true, maNghiemThu: true, ngayNghiemThu: true, createdAt: true } },
        },
      }),
      prisma.systemOperation.findMany({
        where: { machineSystemId: systemId },
        orderBy: { createdAt: 'desc' },
        take: opLimit,
        select: { id: true, maChien: true, thoiGianChien: true, trangThai: true, nguoiThucHien: true },
      }),
      prisma.maintenanceRecord.findMany({
        where: { machineSystemId: systemId },
        orderBy: { ngayThucHien: 'desc' },
        take: maintenanceLimit,
        select: { id: true, maBienBan: true, loai: true, ngayThucHien: true, nguoiThucHien: true },
      }),
      prisma.machineStatusLog.findMany({
        where: { machineSystemId: systemId },
        orderBy: { thoiDiem: 'desc' },
        take: statusLimit,
        select: {
          id: true,
          trangThaiCu: true,
          trangThaiMoi: true,
          nguyenNhan: true,
          nguoiCapNhat: true,
          thoiDiem: true,
        },
      }),
      prisma.machineSystem.findUnique({
        where: { id: systemId },
        select: {
          parentSystem: { select: { id: true, maHeThong: true, tenHeThong: true } },
          _count: { select: { clonedSystems: true } },
        },
      }),
      prisma.maintenancePlan.findMany({
        where: { machineSystemId: systemId },
        orderBy: { nam: 'desc' },
        take: maintenancePlanLimit,
        select: { id: true, maKeHoach: true, nam: true, nguoiLap: true, trangThai: true, ngayLap: true },
      }),
      prisma.finishedProduct.findMany({
        where: { machineSystemId: systemId },
        orderBy: { createdAt: 'desc' },
        take: finishedProductLimit,
        select: { id: true, maChien: true, thoiGianChien: true, tenHangHoa: true, khoiLuong: true, trangThai: true },
      }),
      prisma.qualityEvaluation.findMany({
        where: { machineSystemId: systemId },
        orderBy: { createdAt: 'desc' },
        take: qualityEvalLimit,
        select: { id: true, maChien: true, createdAt: true },
      }),
    ]);

    const parentSystem = machineWithLineage?.parentSystem ?? null;
    const clonedSystemsCount = machineWithLineage?._count?.clonedSystems ?? 0;

    return {
      machine,
      faultRecords,
      repairItems,
      handoverItems,
      systemOperations,
      maintenanceRecords,
      statusLogs,
      maintenancePlans,
      finishedProducts,
      qualityEvaluations,
      parentSystem,
      clonedSystemsCount,
    };
  }

  /**
   * Update the status of a physical machine and record the transition.
   * Rejects same-value transitions and empty nguyenNhan.
   */
  async updateStatus(
    systemId: string,
    newStatus: MachineStatus,
    nguyenNhan: string,
    nguoiCapNhat: string,
    ghiChu?: string,
  ) {
    const system = await this.getMachineSystemById(systemId);

    if (system.trangThai === newStatus) {
      throw new ValidationError('Trạng thái mới phải khác trạng thái hiện tại');
    }
    if (!nguyenNhan.trim()) {
      throw new ValidationError('Nguyên nhân thay đổi trạng thái không được để trống');
    }

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.machineSystem.update({
        where: { id: systemId },
        data: { trangThai: newStatus },
      });

      await tx.machineStatusLog.create({
        data: {
          machineSystemId: systemId,
          trangThaiCu: system.trangThai,
          trangThaiMoi: newStatus,
          nguyenNhan,
          nguoiCapNhat,
          ghiChu,
        },
      });

      return updated;
    });
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
      { header: 'Trạng thái', key: 'trangThai', width: 18 },
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
        trangThai: item.trangThai,
        createdAt: item.createdAt.toLocaleDateString('vi-VN'),
      });
    });

    return workbook;
  }
}

export default new MachineSystemService();
