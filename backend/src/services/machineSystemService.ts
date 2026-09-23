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
    // Fix H2: fetch all codes with this prefix and find numeric max instead of
    // lexicographic desc sort (which fails for 100 vs 99: "99" > "100" as string).
    // NOTE: race condition remains if two concurrent requests generate the same
    // code — caller (controller) should catch P2002 ConflictError and retry.
    const all = await prisma.machineSystem.findMany({
      where: { maHeThong: { startsWith: `${prefix}-` } },
      select: { maHeThong: true },
    });
    if (all.length === 0) return `${prefix}-001`;
    const maxNum = Math.max(
      ...all.map((s) => parseInt(s.maHeThong.split('-')[1] ?? '0', 10)),
    );
    const nextNum = (isNaN(maxNum) ? 0 : maxNum) + 1;
    return `${prefix}-${String(nextNum).padStart(3, '0')}`;
  }

  async getNextCode(loaiHeThong: MachineSystemCategory): Promise<string> {
    return this.generateCode(loaiHeThong);
  }

  async getDistinctField(field: 'khuVuc' | 'viTri'): Promise<string[]> {
    const allowed: readonly string[] = ['khuVuc', 'viTri'];
    if (!allowed.includes(field)) throw new ValidationError('Field không hợp lệ');
    const col = field === 'khuVuc' ? '"khuVuc"' : '"viTri"';
    const results = await prisma.$queryRawUnsafe<{ value: string }[]>(
      `SELECT DISTINCT ${col} as value FROM "business"."machine_systems" WHERE ${col} IS NOT NULL AND ${col} != '' ORDER BY value ASC`,
    );
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
  async getActiveProductionMachines(categories: MachineSystemCategory[], limit: number = 200) {
    const take = Math.min(Math.max(limit, 1), 500);
    return prisma.machineSystem.findMany({
      where: {
        trangThai: 'HOAT_DONG',
        loaiHeThong: { in: categories },
      },
      orderBy: { maHeThong: 'asc' },
      take,
    });
  }

  async createMachineSystem(data: CreateMachineSystemData) {
    if (!data.maHeThong?.trim() || !data.tenHeThong?.trim()) {
      throw new ValidationError('Mã hệ thống và tên hệ thống là bắt buộc');
    }
    try {
      return await prisma.machineSystem.create({ data });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictError('Mã hệ thống đã tồn tại');
      }
      throw e;
    }
  }

  async updateMachineSystem(id: string, data: UpdateMachineSystemData) {
    await this.getMachineSystemById(id);
    if (data.maHeThong !== undefined && !data.maHeThong.trim()) {
      throw new ValidationError('Mã hệ thống không được để trống');
    }
    if (data.tenHeThong !== undefined && !data.tenHeThong.trim()) {
      throw new ValidationError('Tên hệ thống không được để trống');
    }
    try {
      return await prisma.machineSystem.update({ where: { id }, data });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictError('Mã hệ thống đã tồn tại');
      }
      throw e;
    }
  }

  async deleteMachineSystem(id: string) {
    await this.getMachineSystemById(id);
    const [
      faultCount, repairItemCount, planCount, faultTemplateCount, maintenanceRecordCount,
      statusLogCount, systemOperationCount, finishedProductCount, qualityEvalCount,
      handoverItemCount, planItemCount, detailCount, cloneCount,
    ] = await Promise.all([
      prisma.faultRecord.count({ where: { machineSystemId: id } }),
      prisma.repairRequestItem.count({ where: { machineSystemId: id } }),
      prisma.maintenancePlan.count({ where: { machineSystemId: id } }),
      prisma.faultTemplate.count({ where: { machineSystemId: id } }),
      prisma.maintenanceRecord.count({ where: { machineSystemId: id } }),
      prisma.machineStatusLog.count({ where: { machineSystemId: id } }),
      prisma.systemOperation.count({ where: { machineSystemId: id } }),
      prisma.finishedProduct.count({ where: { machineSystemId: id } }),
      prisma.qualityEvaluation.count({ where: { machineSystemId: id } }),
      prisma.acceptanceHandoverItem.count({ where: { machineSystemId: id } }),
      // MaintenancePlanItem via plan
      prisma.maintenancePlanItem.count({ where: { maintenancePlan: { machineSystemId: id } } }),
      prisma.machineSystemDetail.count({ where: { machineSystemId: id } }),
      prisma.machineSystem.count({ where: { parentSystemId: id } }),
    ]);
    const total = faultCount + repairItemCount + planCount + faultTemplateCount + maintenanceRecordCount
      + statusLogCount + systemOperationCount + finishedProductCount + qualityEvalCount
      + handoverItemCount + planItemCount + detailCount + cloneCount;
    if (total > 0) {
      throw new ConflictError('Không thể xóa hệ thống đang được sử dụng');
    }
    return prisma.machineSystem.delete({ where: { id } });
  }

  /**
   * Clone a machine system and its entire detail tree using top-down BFS.
   * All inserts run inside one prisma.$transaction.
   * maChiTiet codes are generated by prefixing destination maHeThong to original maChiTiet.
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

    try {
      return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Pre-check inside transaction to prevent concurrent duplicate
      const existing = await tx.machineSystem.findUnique({
        where: { maHeThong: overrides.maHeThong },
      });
      if (existing) {
        throw new ConflictError(
          `Mã hệ thống "${overrides.maHeThong}" đã tồn tại, vui lòng chọn mã khác`
        );
      }
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
          // Generate unique maChiTiet by prefixing destination system code
          const newMaChiTiet = `${overrides.maHeThong}-${detail.maChiTiet}`;

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
              fileDinhKem: detail.fileDinhKem,
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
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictError(`Mã hệ thống "${overrides.maHeThong}" đã tồn tại, vui lòng chọn mã khác`);
      }
      throw e;
    }
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

  async exportToExcel(limit: number = 500) {
    const take = Math.min(Math.max(limit, 1), 5000);
    const data = await prisma.machineSystem.findMany({ orderBy: { createdAt: 'desc' }, take });

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
