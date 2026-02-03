import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { SystemOperationStatus } from '@prisma/client';

export class SystemOperationService {
  // Map MachineStatus to SystemOperationStatus
  private mapMachineStatusToOperationStatus(machineStatus: string): SystemOperationStatus {
    switch (machineStatus) {
      case 'HOAT_DONG':
        return SystemOperationStatus.DANG_HOAT_DONG;
      case 'BẢO_TRÌ':
        return SystemOperationStatus.BAO_TRI;
      case 'NGỪNG_HOẠT_ĐỘNG':
        return SystemOperationStatus.NGUNG_HOAT_DONG;
      default:
        return SystemOperationStatus.DANG_HOAT_DONG;
    }
  }
  async getAllSystemOperations(page: number = 1, limit: number = 10, tenMay?: string) {
    const skip = (page - 1) * limit;

    const where = tenMay ? { tenMay } : {};

    const [data, total] = await Promise.all([
      prisma.systemOperation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          materialEvaluation: true,
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
      },
    });

    if (!operation) {
      throw new NotFoundError('System operation not found');
    }

    return operation;
  }

  async createBulkSystemOperations(maChien: string, thoiGianChien: string) {
    // Check if maChien already exists
    const existingOperation = await prisma.systemOperation.findFirst({
      where: { maChien },
    });

    if (existingOperation) {
      throw new ValidationError(`Mã chiên "${maChien}" đã tồn tại. Mỗi mã chiên chỉ được tạo thông số vận hành 1 lần duy nhất.`);
    }

    // Get all machines from database (regardless of status)
    const machines = await prisma.machine.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (machines.length === 0) {
      throw new NotFoundError('No machines found');
    }

    // Get material evaluation to auto-fill finished product data
    const materialEvaluation = await prisma.materialEvaluation.findFirst({
      where: {
        maChien,
        thoiGianChien,
      },
    });

    // Create system operations and finished product in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete any orphaned quality evaluations with this maChien (from previous failed/deleted operations)
      await tx.qualityEvaluation.deleteMany({
        where: { maChien },
      });

      // Delete any orphaned finished products with this maChien
      await tx.finishedProduct.deleteMany({
        where: { maChien },
      });

      // Create system operations for all machines
      const operations = await Promise.all(
        machines.map(machine =>
          tx.systemOperation.create({
            data: {
              maChien,
              machineId: machine.id,
              tenMay: machine.tenMay,
              thoiGianChien,
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
              trangThai: this.mapMachineStatusToOperationStatus(machine.trangThai),
              ghiChu: '',
              nguoiThucHien: '',
              materialEvaluationId: materialEvaluation?.id,
            },
          })
        )
      );

      // Create finished products for each machine with auto-filled data from material evaluation
      if (materialEvaluation) {
        const finishedProducts = await Promise.all(
          machines.map(machine =>
            tx.finishedProduct.create({
              data: {
                maChien: materialEvaluation.maChien,
                thoiGianChien: materialEvaluation.thoiGianChien.toISOString(),
                tenHangHoa: materialEvaluation.tenHangHoa,
                khoiLuong: 0, // Will be filled by user later
                nguoiThucHien: '',
                machineId: machine.id,
                tenMay: machine.tenMay,
                trangThai: this.mapMachineStatusToOperationStatus(machine.trangThai),
                materialEvaluationId: materialEvaluation.id,
              },
            })
          )
        );

        // Create quality evaluations for each machine, linked to finished products
        await Promise.all(
          finishedProducts.map((finishedProduct) =>
            tx.qualityEvaluation.create({
              data: {
                maChien: finishedProduct.maChien,
                thoiGianChien: finishedProduct.thoiGianChien,
                tenHangHoa: finishedProduct.tenHangHoa,
                machineId: finishedProduct.machineId,
                tenMay: finishedProduct.tenMay,
                materialEvaluationId: materialEvaluation.id,
                finishedProductId: finishedProduct.id,
                nguoiThucHien: '',
                // Auto-fill percentage fields from finished product
                aTiLe: finishedProduct.aTiLe || 0,
                bTiLe: finishedProduct.bTiLe || 0,
                bDauTiLe: finishedProduct.bDauTiLe || 0,
                cTiLe: finishedProduct.cTiLe || 0,
                vunLonTiLe: finishedProduct.vunLonTiLe || 0,
                vunNhoTiLe: finishedProduct.vunNhoTiLe || 0,
                phePhamTiLe: finishedProduct.phePhamTiLe || 0,
                uotTiLe: finishedProduct.uotTiLe || 0,
                // Quality evaluation fields default to empty
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

  async getSystemOperationsByMaChien(maChien: string) {
    const operations = await prisma.systemOperation.findMany({
      where: { maChien },
      orderBy: { createdAt: 'desc' },
      include: {
        materialEvaluation: true,
      },
    });

    return operations;
  }

  async createSystemOperation(data: any) {
    // Check if maChien already exists for this machine
    const existingOperation = await prisma.systemOperation.findFirst({
      where: {
        maChien: data.maChien,
        tenMay: data.tenMay,
      },
    });

    if (existingOperation) {
      throw new ValidationError(`Mã chiên "${data.maChien}" đã tồn tại cho máy "${data.tenMay}". Mỗi mã chiên chỉ được tạo thông số vận hành 1 lần duy nhất.`);
    }

    // Find machine by tenMay to get machineId
    const machine = await prisma.machine.findUnique({
      where: { tenMay: data.tenMay },
    });

    if (!machine) {
      throw new NotFoundError(`Machine with name ${data.tenMay} not found`);
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
      parseInt(data.giaiDoan1ThoiGian || 0) +
      parseInt(data.giaiDoan2ThoiGian || 0) +
      parseInt(data.giaiDoan3ThoiGian || 0) +
      parseInt(data.giaiDoan4ThoiGian || 0);

    // Create system operation and finished product in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create system operation
      const operation = await tx.systemOperation.create({
        data: {
          maChien: data.maChien,
          machineId: machine.id,
          tenMay: data.tenMay,
          thoiGianChien: new Date(data.thoiGianChien),
          khoiLuongDauVao: data.khoiLuongDauVao ? parseFloat(data.khoiLuongDauVao) : 0,
          giaiDoan1ThoiGian: parseInt(data.giaiDoan1ThoiGian || 0),
          giaiDoan1NhietDo: parseFloat(data.giaiDoan1NhietDo || 0),
          giaiDoan1ApSuat: parseFloat(data.giaiDoan1ApSuat || 0),
          giaiDoan2ThoiGian: parseInt(data.giaiDoan2ThoiGian || 0),
          giaiDoan2NhietDo: parseFloat(data.giaiDoan2NhietDo || 0),
          giaiDoan2ApSuat: parseFloat(data.giaiDoan2ApSuat || 0),
          giaiDoan3ThoiGian: parseInt(data.giaiDoan3ThoiGian || 0),
          giaiDoan3NhietDo: parseFloat(data.giaiDoan3NhietDo || 0),
          giaiDoan3ApSuat: parseFloat(data.giaiDoan3ApSuat || 0),
          giaiDoan4ThoiGian: parseInt(data.giaiDoan4ThoiGian || 0),
          giaiDoan4NhietDo: parseFloat(data.giaiDoan4NhietDo || 0),
          giaiDoan4ApSuat: parseFloat(data.giaiDoan4ApSuat || 0),
          tongThoiGianSay,
          trangThai: this.mapMachineStatusToOperationStatus(machine.trangThai),
          ghiChu: data.ghiChu,
          nguoiThucHien: data.nguoiThucHien,
          materialEvaluationId: data.materialEvaluationId,
        },
      });

      // Create finished product with auto-filled data from material evaluation
      if (materialEvaluation) {
        await tx.finishedProduct.create({
          data: {
            maChien: materialEvaluation.maChien,
            thoiGianChien: materialEvaluation.thoiGianChien.toISOString(),
            tenHangHoa: materialEvaluation.tenHangHoa,
            khoiLuong: 0, // Will be filled by user later
            nguoiThucHien: data.nguoiThucHien,
            machineId: machine.id,
            tenMay: machine.tenMay,
            trangThai: this.mapMachineStatusToOperationStatus(machine.trangThai),
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
      parseInt(data.giaiDoan1ThoiGian ?? existing.giaiDoan1ThoiGian) +
      parseInt(data.giaiDoan2ThoiGian ?? existing.giaiDoan2ThoiGian) +
      parseInt(data.giaiDoan3ThoiGian ?? existing.giaiDoan3ThoiGian) +
      parseInt(data.giaiDoan4ThoiGian ?? existing.giaiDoan4ThoiGian);

    const operation = await prisma.systemOperation.update({
      where: { id },
      data: {
        thoiGianChien: data.thoiGianChien ? new Date(data.thoiGianChien) : undefined,
        khoiLuongDauVao: data.khoiLuongDauVao !== undefined ? parseFloat(data.khoiLuongDauVao) : undefined,
        giaiDoan1ThoiGian: data.giaiDoan1ThoiGian !== undefined ? parseInt(data.giaiDoan1ThoiGian) : undefined,
        giaiDoan1NhietDo: data.giaiDoan1NhietDo !== undefined ? parseFloat(data.giaiDoan1NhietDo) : undefined,
        giaiDoan1ApSuat: data.giaiDoan1ApSuat !== undefined ? parseFloat(data.giaiDoan1ApSuat) : undefined,
        giaiDoan2ThoiGian: data.giaiDoan2ThoiGian !== undefined ? parseInt(data.giaiDoan2ThoiGian) : undefined,
        giaiDoan2NhietDo: data.giaiDoan2NhietDo !== undefined ? parseFloat(data.giaiDoan2NhietDo) : undefined,
        giaiDoan2ApSuat: data.giaiDoan2ApSuat !== undefined ? parseFloat(data.giaiDoan2ApSuat) : undefined,
        giaiDoan3ThoiGian: data.giaiDoan3ThoiGian !== undefined ? parseInt(data.giaiDoan3ThoiGian) : undefined,
        giaiDoan3NhietDo: data.giaiDoan3NhietDo !== undefined ? parseFloat(data.giaiDoan3NhietDo) : undefined,
        giaiDoan3ApSuat: data.giaiDoan3ApSuat !== undefined ? parseFloat(data.giaiDoan3ApSuat) : undefined,
        giaiDoan4ThoiGian: data.giaiDoan4ThoiGian !== undefined ? parseInt(data.giaiDoan4ThoiGian) : undefined,
        giaiDoan4NhietDo: data.giaiDoan4NhietDo !== undefined ? parseFloat(data.giaiDoan4NhietDo) : undefined,
        giaiDoan4ApSuat: data.giaiDoan4ApSuat !== undefined ? parseFloat(data.giaiDoan4ApSuat) : undefined,
        tongThoiGianSay,
        trangThai: data.trangThai,
        ghiChu: data.ghiChu,
        nguoiThucHien: data.nguoiThucHien,
      },
    });

    return operation;
  }

  async deleteSystemOperation(id: string) {
    const existing = await prisma.systemOperation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('System operation not found');
    }

    await prisma.systemOperation.delete({
      where: { id },
    });
  }

  async deleteByMaChien(maChien: string) {
    // Check if maChien exists in any related table
    const existingOperation = await prisma.systemOperation.findFirst({
      where: { maChien },
    });

    const existingFinishedProduct = await prisma.finishedProduct.findFirst({
      where: { maChien },
    });

    const existingQualityEvaluation = await prisma.qualityEvaluation.findFirst({
      where: { maChien },
    });

    if (!existingOperation && !existingFinishedProduct && !existingQualityEvaluation) {
      throw new NotFoundError(`Không tìm thấy dữ liệu với mã chiên "${maChien}"`);
    }

    // Delete all related data in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete quality evaluations first (depends on finished products)
      const deletedQualityEvaluations = await tx.qualityEvaluation.deleteMany({
        where: { maChien },
      });

      // Delete finished products
      const deletedFinishedProducts = await tx.finishedProduct.deleteMany({
        where: { maChien },
      });

      // Delete system operations
      const deletedSystemOperations = await tx.systemOperation.deleteMany({
        where: { maChien },
      });

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

