import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { MachineSystemCategory, SystemOperationStatus } from '@prisma/client';
import { getProductionDay, productionDayRange, parseLocalDateTimeAsAppTz } from '@utils/productionDay';

export class SystemOperationService {
  async getAllSystemOperations(
    page: number = 1,
    limit: number = 10,
    machineSystemId?: string,
    dateRange?: { thoiGianChienFrom?: string; thoiGianChienTo?: string },
  ) {
    const skip = (page - 1) * limit;

    const where: any = machineSystemId ? { machineSystemId } : {};

    // Filter by thoiGianChien date range.
    // Use parseLocalDateTimeAsAppTz to interpret naive datetime strings as APP_TZ,
    // making the filter TZ-independent (correct regardless of server's TZ env var).
    if (dateRange?.thoiGianChienFrom || dateRange?.thoiGianChienTo) {
      const thoiGianChienFilter: any = {};
      if (dateRange.thoiGianChienFrom) {
        const d = parseLocalDateTimeAsAppTz(dateRange.thoiGianChienFrom);
        if (!isNaN(d.getTime())) thoiGianChienFilter.gte = d;
      }
      if (dateRange.thoiGianChienTo) {
        const d = parseLocalDateTimeAsAppTz(dateRange.thoiGianChienTo);
        if (!isNaN(d.getTime())) thoiGianChienFilter.lt = d;
      }
      if (Object.keys(thoiGianChienFilter).length > 0) {
        where.thoiGianChien = thoiGianChienFilter;
      }
    }

    const [data, total] = await Promise.all([
      prisma.systemOperation.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { maChien: 'desc' },
          { machineSystem: { maHeThong: 'asc' } },
        ],
        include: {
          materialEvaluation: true,
          machineSystem: { select: { id: true, maHeThong: true, tenHeThong: true } },
        },
      }),
      prisma.systemOperation.count({ where }),
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

  async getSystemOperationById(id: string) {
    const operation = await prisma.systemOperation.findUnique({
      where: { id },
      include: {
        materialEvaluation: true,
        machineSystem: { select: { id: true, maHeThong: true, tenHeThong: true } },
      },
    });

    if (!operation) {
      throw new NotFoundError('System operation not found');
    }

    return operation;
  }

  async createBulkSystemOperations(maChien: string, thoiGianChien: string) {
    // Day-scope: derive production day from thoiGianChien and build range filter
    const prodDay = getProductionDay(parseLocalDateTimeAsAppTz(thoiGianChien));
    const dayRange = productionDayRange(prodDay);
    const ngaySanXuat = new Date(prodDay + 'T00:00:00.000Z');

    // Check if maChien already exists for this production day
    const existingOperation = await prisma.systemOperation.findFirst({
      where: { maChien, thoiGianChien: { gte: dayRange.gte, lt: dayRange.lt } },
    });

    if (existingOperation) {
      throw new ValidationError(`Mã chiên "${maChien}" đã tồn tại. Mỗi mã chiên chỉ được tạo thông số vận hành 1 lần duy nhất.`);
    }

    // Get active machine systems that belong to the production category (SAN_XUAT only —
    // SystemOperation stores frying-specific parameters, not meaningful for DONG_GOI/BAO_QUAN)
    const productionCategories: MachineSystemCategory[] = [
      MachineSystemCategory.SAN_XUAT,
    ];
    const machineSystems = await prisma.machineSystem.findMany({
      where: {
        trangThai: 'HOAT_DONG',
        loaiHeThong: { in: productionCategories },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (machineSystems.length === 0) {
      throw new NotFoundError('Không tìm thấy hệ thống máy sản xuất đang hoạt động');
    }

    // Get material evaluation to auto-fill finished product data
    const materialEvaluation = await prisma.materialEvaluation.findFirst({
      where: {
        maChien,
        thoiGianChien,
      },
    });

    // Create system operations and finished products in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete any orphaned quality evaluations with this maChien for this production day
      // Note: QualityEvaluation.thoiGianChien is String, so use ISO string comparison
      await tx.qualityEvaluation.deleteMany({ where: { maChien, thoiGianChien: { gte: dayRange.gte.toISOString(), lt: dayRange.lt.toISOString() } } });

      // Delete any orphaned finished products with this maChien for this production day
      await tx.finishedProduct.deleteMany({ where: { maChien, thoiGianChien: { gte: dayRange.gte, lt: dayRange.lt } } });

      // Create system operations for all machine systems
      const operations = await Promise.all(
        machineSystems.map((ms) =>
          tx.systemOperation.create({
            data: {
              maChien,
              machineSystemId: ms.id,
              thoiGianChien,
              ngaySanXuat,
              giaiDoan1ThoiGian: 0,
              giaiDoan1NhietDo: 0,
              giaiDoan1ApSuat: 0,
              giaiDoan2ThoiGian: 0,
              giaiDoan2NhietDo: 0,
              giaiDoan2ApSuat: 0,
              giaiDoan3ThoiGian: 0,
              giaiDoan3NhietDo: 0,
              giaiDoan3ApSuat: 0,
              giaiDoan4ThoiGian: 0,
              giaiDoan4NhietDo: 0,
              giaiDoan4ApSuat: 0,
              tongThoiGianSay: 0,
              trangThai: SystemOperationStatus.DANG_HOAT_DONG,
              ghiChu: '',
              nguoiThucHien: '',
              materialEvaluationId: materialEvaluation?.id,
            },
          })
        )
      );

      // Create finished products for each machine system
      if (materialEvaluation) {
        const finishedProducts = await Promise.all(
          machineSystems.map((ms) =>
            tx.finishedProduct.create({
              data: {
                maChien: materialEvaluation.maChien,
                thoiGianChien: materialEvaluation.thoiGianChien,
                ngaySanXuat,
                tenHangHoa: materialEvaluation.tenHangHoa,
                maSanPham: materialEvaluation.maSanPham,
                khoiLuong: 0,
                nguoiThucHien: '',
                machineSystemId: ms.id,
                trangThai: SystemOperationStatus.DANG_HOAT_DONG,
                materialEvaluationId: materialEvaluation.id,
              },
            })
          )
        );

        // Create quality evaluations for each machine system, linked to finished products
        await Promise.all(
          finishedProducts.map((fp) =>
            tx.qualityEvaluation.create({
              data: {
                maChien: fp.maChien,
                thoiGianChien: fp.thoiGianChien.toISOString(),
                ngaySanXuat,
                tenHangHoa: fp.tenHangHoa,
                machineSystemId: fp.machineSystemId,
                materialEvaluationId: materialEvaluation.id,
                finishedProductId: fp.id,
                nguoiThucHien: '',
                aTiLe: fp.aTiLe || 0,
                bTiLe: fp.bTiLe || 0,
                bDauTiLe: fp.bDauTiLe || 0,
                cTiLe: fp.cTiLe || 0,
                vunLonTiLe: fp.vunLonTiLe || 0,
                vunNhoTiLe: fp.vunNhoTiLe || 0,
                phePhamTiLe: fp.phePhamTiLe || 0,
                uotTiLe: fp.uotTiLe || 0,
                muiHuong: '',
                huongVi: '',
                doNgot: '',
                doGion: '',
                deXuatDieuChinh: '',
              },
            })
          )
        );
      }

      return operations;
    });

    return result;
  }

  async getSystemOperationsByMaChien(maChien: string, thoiGianChien?: string) {
    // Build day-scoped where clause if thoiGianChien is provided
    const where: any = { maChien };
    if (thoiGianChien) {
      const prodDay = getProductionDay(parseLocalDateTimeAsAppTz(thoiGianChien));
      const dayRange = productionDayRange(prodDay);
      where.thoiGianChien = { gte: dayRange.gte, lt: dayRange.lt };
    }

    const operations = await prisma.systemOperation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        materialEvaluation: true,
        machineSystem: { select: { id: true, maHeThong: true, tenHeThong: true, trangThai: true } },
      },
    });

    return operations;
  }

  async createSystemOperation(data: any) {
    // Derive production day from thoiGianChien for day-scoped composite check
    const thoiGianChienDate = parseLocalDateTimeAsAppTz(data.thoiGianChien);
    const prodDay = getProductionDay(thoiGianChienDate);
    const dayRange = productionDayRange(prodDay);
    const ngaySanXuat = new Date(prodDay + 'T00:00:00.000Z');

    // Check if maChien already exists for this machine system on this production day
    const existingOperation = await prisma.systemOperation.findFirst({
      where: {
        maChien: data.maChien,
        machineSystemId: data.machineSystemId,
        thoiGianChien: { gte: dayRange.gte, lt: dayRange.lt },
      },
    });

    if (existingOperation) {
      throw new ValidationError(`Mã chiên "${data.maChien}" đã tồn tại cho hệ thống máy này. Mỗi mã chiên chỉ được tạo thông số vận hành 1 lần duy nhất.`);
    }

    // Find machine system to validate
    let machineSystem = null;
    if (data.machineSystemId) {
      machineSystem = await prisma.machineSystem.findUnique({
        where: { id: data.machineSystemId },
      });
      if (!machineSystem) {
        throw new NotFoundError(`Không tìm thấy hệ thống máy với id "${data.machineSystemId}"`);
      }
      // D6: Validate active status — single-create cannot bypass inactive machine
      if (machineSystem.trangThai !== 'HOAT_DONG') {
        throw new ValidationError(`Hệ thống máy "${machineSystem.tenHeThong}" không đang hoạt động. Chỉ có thể tạo thông số vận hành cho máy đang hoạt động.`);
      }
    }

    // Get material evaluation to auto-fill finished product data
    let materialEvaluation = null;
    if (data.materialEvaluationId) {
      materialEvaluation = await prisma.materialEvaluation.findUnique({
        where: { id: data.materialEvaluationId },
      });
    }

    // Calculate total drying time
    const tongThoiGianSay =
      Number(data.giaiDoan1ThoiGian || 0) +
      Number(data.giaiDoan2ThoiGian || 0) +
      Number(data.giaiDoan3ThoiGian || 0) +
      Number(data.giaiDoan4ThoiGian || 0);

    // Create system operation and finished product in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const operation = await tx.systemOperation.create({
        data: {
          maChien: data.maChien,
          machineSystemId: data.machineSystemId ?? null,
          thoiGianChien: thoiGianChienDate,
          ngaySanXuat,
          khoiLuongDauVao: data.khoiLuongDauVao ? Number(data.khoiLuongDauVao) : 0,
          giaiDoan1ThoiGian: Number(data.giaiDoan1ThoiGian || 0),
          giaiDoan1NhietDo: Number(data.giaiDoan1NhietDo || 0),
          giaiDoan1ApSuat: Number(data.giaiDoan1ApSuat || 0),
          giaiDoan2ThoiGian: Number(data.giaiDoan2ThoiGian || 0),
          giaiDoan2NhietDo: Number(data.giaiDoan2NhietDo || 0),
          giaiDoan2ApSuat: Number(data.giaiDoan2ApSuat || 0),
          giaiDoan3ThoiGian: Number(data.giaiDoan3ThoiGian || 0),
          giaiDoan3NhietDo: Number(data.giaiDoan3NhietDo || 0),
          giaiDoan3ApSuat: Number(data.giaiDoan3ApSuat || 0),
          giaiDoan4ThoiGian: Number(data.giaiDoan4ThoiGian || 0),
          giaiDoan4NhietDo: Number(data.giaiDoan4NhietDo || 0),
          giaiDoan4ApSuat: Number(data.giaiDoan4ApSuat || 0),
          tongThoiGianSay,
          trangThai: SystemOperationStatus.DANG_HOAT_DONG,
          ghiChu: data.ghiChu,
          nguoiThucHien: data.nguoiThucHien,
          materialEvaluationId: data.materialEvaluationId,
        },
      });

      if (materialEvaluation && data.machineSystemId) {
        await tx.finishedProduct.create({
          data: {
            maChien: materialEvaluation.maChien,
            thoiGianChien: materialEvaluation.thoiGianChien,
            ngaySanXuat,
            tenHangHoa: materialEvaluation.tenHangHoa,
            khoiLuong: 0,
            nguoiThucHien: data.nguoiThucHien,
            machineSystemId: data.machineSystemId,
            trangThai: SystemOperationStatus.DANG_HOAT_DONG,
            materialEvaluationId: materialEvaluation.id,
          },
        });
      }

      return operation;
    });

    return result;
  }

  async updateSystemOperation(id: string, data: any) {
    const existing = await prisma.systemOperation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('System operation not found');
    }

    // Calculate total drying time
    const tongThoiGianSay =
      Number(data.giaiDoan1ThoiGian ?? existing.giaiDoan1ThoiGian) +
      Number(data.giaiDoan2ThoiGian ?? existing.giaiDoan2ThoiGian) +
      Number(data.giaiDoan3ThoiGian ?? existing.giaiDoan3ThoiGian) +
      Number(data.giaiDoan4ThoiGian ?? existing.giaiDoan4ThoiGian);

    const operation = await prisma.systemOperation.update({
      where: { id },
      data: {
        thoiGianChien: data.thoiGianChien ? parseLocalDateTimeAsAppTz(data.thoiGianChien) : undefined,
        khoiLuongDauVao: data.khoiLuongDauVao !== undefined ? parseFloat(data.khoiLuongDauVao) : undefined,
        giaiDoan1ThoiGian: data.giaiDoan1ThoiGian !== undefined ? Number(data.giaiDoan1ThoiGian) : undefined,
        giaiDoan1NhietDo: data.giaiDoan1NhietDo !== undefined ? Number(data.giaiDoan1NhietDo) : undefined,
        giaiDoan1ApSuat: data.giaiDoan1ApSuat !== undefined ? Number(data.giaiDoan1ApSuat) : undefined,
        giaiDoan2ThoiGian: data.giaiDoan2ThoiGian !== undefined ? Number(data.giaiDoan2ThoiGian) : undefined,
        giaiDoan2NhietDo: data.giaiDoan2NhietDo !== undefined ? Number(data.giaiDoan2NhietDo) : undefined,
        giaiDoan2ApSuat: data.giaiDoan2ApSuat !== undefined ? Number(data.giaiDoan2ApSuat) : undefined,
        giaiDoan3ThoiGian: data.giaiDoan3ThoiGian !== undefined ? Number(data.giaiDoan3ThoiGian) : undefined,
        giaiDoan3NhietDo: data.giaiDoan3NhietDo !== undefined ? Number(data.giaiDoan3NhietDo) : undefined,
        giaiDoan3ApSuat: data.giaiDoan3ApSuat !== undefined ? Number(data.giaiDoan3ApSuat) : undefined,
        giaiDoan4ThoiGian: data.giaiDoan4ThoiGian !== undefined ? Number(data.giaiDoan4ThoiGian) : undefined,
        giaiDoan4NhietDo: data.giaiDoan4NhietDo !== undefined ? Number(data.giaiDoan4NhietDo) : undefined,
        giaiDoan4ApSuat: data.giaiDoan4ApSuat !== undefined ? Number(data.giaiDoan4ApSuat) : undefined,
        tongThoiGianSay,
        ghiChu: data.ghiChu,
        nguoiThucHien: data.nguoiThucHien,
      },
    });

    return operation;
  }

  async deleteSystemOperation(id: string) {
    const existing = await prisma.systemOperation.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundError('System operation not found');
    }

    await prisma.systemOperation.delete({ where: { id } });
  }

  async deleteByMaChien(maChien: string, thoiGianChien: string) {
    // CRITICAL: Day-scope all existence checks and deletions to prevent
    // wiping maChien across all history once codes repeat daily.
    const prodDay = getProductionDay(parseLocalDateTimeAsAppTz(thoiGianChien));
    const dayRange = productionDayRange(prodDay);
    const dayFilter = { gte: dayRange.gte, lt: dayRange.lt };
    // QualityEvaluation.thoiGianChien is String, not DateTime — use ISO string comparison
    const dayFilterStr = { gte: dayRange.gte.toISOString(), lt: dayRange.lt.toISOString() };

    const existingOperation = await prisma.systemOperation.findFirst({ where: { maChien, thoiGianChien: dayFilter } });
    const existingFinishedProduct = await prisma.finishedProduct.findFirst({ where: { maChien, thoiGianChien: dayFilter } });
    const existingQualityEvaluation = await prisma.qualityEvaluation.findFirst({ where: { maChien, thoiGianChien: dayFilterStr } });

    if (!existingOperation && !existingFinishedProduct && !existingQualityEvaluation) {
      throw new NotFoundError(`Không tìm thấy dữ liệu với mã chiên "${maChien}"`);
    }

    const result = await prisma.$transaction(async (tx) => {
      const deletedQualityEvaluations = await tx.qualityEvaluation.deleteMany({ where: { maChien, thoiGianChien: dayFilterStr } });
      const deletedFinishedProducts = await tx.finishedProduct.deleteMany({ where: { maChien, thoiGianChien: dayFilter } });
      const deletedSystemOperations = await tx.systemOperation.deleteMany({ where: { maChien, thoiGianChien: dayFilter } });

      return {
        deletedSystemOperations: deletedSystemOperations.count,
        deletedFinishedProducts: deletedFinishedProducts.count,
        deletedQualityEvaluations: deletedQualityEvaluations.count,
      };
    });

    return result;
  }
}

export default new SystemOperationService();
