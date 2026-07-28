import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { NotFoundError, ValidationError } from '@utils/errors';
import { nextYearlyCode, yearlyCodeWhere } from '@utils/codeGenerator';
import systemOperationService from '@services/systemOperationService';
import { getProductionDay, productionDayRange, parseLocalDateTimeAsAppTz } from '@utils/productionDay';
import { isScheduledCode } from '@utils/dailyFryBatchSchedule';

export class MaterialEvaluationService {
  async getAllMaterialEvaluations(
    page: number = 1,
    limit: number = 10,
    filters?: {
      nguoiThucHien?: string;
      dateFrom?: string;
      dateTo?: string;
      ca?: number;
      thoiGianChienFrom?: string;
      thoiGianChienTo?: string;
    },
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.MaterialEvaluationWhereInput = {};
    if (filters?.nguoiThucHien) {
      where.nguoiThucHien = filters.nguoiThucHien;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (filters.dateFrom) {
        const d = new Date(filters.dateFrom);
        if (!isNaN(d.getTime())) createdAt.gte = d;
      }
      if (filters.dateTo) {
        const d = new Date(filters.dateTo);
        if (!isNaN(d.getTime())) createdAt.lte = d;
      }
      // Only attach createdAt filter if at least one bound parsed successfully;
      // if both are invalid the object is empty and we skip it to avoid Prisma error.
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt;
      }
    }
    // Filter by shift (ca)
    if (filters?.ca != null) {
      where.ca = filters.ca;
    }
    // Filter by thoiGianChien date range (separate from createdAt)
    if (filters?.thoiGianChienFrom || filters?.thoiGianChienTo) {
      const thoiGianChienFilter: Prisma.DateTimeFilter = {};
      if (filters.thoiGianChienFrom) {
        const d = parseLocalDateTimeAsAppTz(filters.thoiGianChienFrom);
        if (!isNaN(d.getTime())) thoiGianChienFilter.gte = d;
      }
      if (filters.thoiGianChienTo) {
        const d = parseLocalDateTimeAsAppTz(filters.thoiGianChienTo);
        if (!isNaN(d.getTime())) thoiGianChienFilter.lte = d;
      }
      if (Object.keys(thoiGianChienFilter).length > 0) {
        where.thoiGianChien = thoiGianChienFilter;
      }
    }

    const [data, total] = await Promise.all([
      prisma.materialEvaluation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.materialEvaluation.count({ where }),
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

  async getMaterialEvaluationById(id: string) {
    const evaluation = await prisma.materialEvaluation.findUnique({
      where: { id },
      include: {
        systemOperations: true,
      },
    });

    if (!evaluation) {
      throw new NotFoundError('Material evaluation not found');
    }

    return evaluation;
  }

  async getMaterialEvaluationByMaChien(maChien: string, thoiGianChien?: string) {
    // Day-scope: when thoiGianChien is provided, scope lookup to that production day
    let evaluation;
    if (thoiGianChien) {
      const prodDay = getProductionDay(parseLocalDateTimeAsAppTz(thoiGianChien));
      const dayRange = productionDayRange(prodDay);
      evaluation = await prisma.materialEvaluation.findFirst({
        where: { maChien, thoiGianChien: { gte: dayRange.gte, lt: dayRange.lt } },
        include: {
          systemOperations: true,
        },
      });
    } else {
      // Fallback: when thoiGianChien not provided (legacy callers), use findFirst
      evaluation = await prisma.materialEvaluation.findFirst({
        where: { maChien },
        include: {
          systemOperations: true,
        },
      });
    }

    if (!evaluation) {
      throw new NotFoundError('Material evaluation not found');
    }

    return evaluation;
  }

  private async generateWarehouseIssueCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.warehouseIssue.findFirst({
      where: { maPhieuXuat: yearlyCodeWhere('PX', year) },
      orderBy: { maPhieuXuat: 'desc' },
      select: { maPhieuXuat: true },
    });
    return nextYearlyCode(last?.maPhieuXuat ?? null, 'PX', year);
  }

  async createMaterialEvaluation(data: any, userId?: string) {
    // Parse datetime from frontend
    let thoiGianChien: Date;
    if (data.thoiGianChien) {
      thoiGianChien = parseLocalDateTimeAsAppTz(data.thoiGianChien);
    } else {
      thoiGianChien = new Date();
    }

    // maChien must be provided by the caller (selected from the schedule).
    // Legacy three-digit codes (MC-001) are allowed for backward compat but new
    // entries must use the two-digit scheduled codes (MC-01 through MC-16).
    if (!data.maChien) {
      throw new ValidationError('Mã chiên là bắt buộc. Vui lòng chọn từ lịch trình sản xuất.');
    }

    // Validate that the code is a valid scheduled code (two-digit format)
    if (!isScheduledCode(data.maChien)) {
      throw new ValidationError(
        `Mã chiên "${data.maChien}" không hợp lệ. Chỉ chấp nhận mã MC-01 đến MC-16.`
      );
    }

    return this.createForSelectedCode(data, thoiGianChien, userId);
  }

  /** Creates a MaterialEvaluation for an already-selected schedule code. */
  private async createForSelectedCode(data: any, thoiGianChien: Date, userId?: string) {
    // If lotProductId is provided, run the transactional create with WarehouseIssue
    if (data.lotProductId) {
      return this.createWithWarehouseLink(data, thoiGianChien, userId);
    }

    // Legacy create without warehouse link
    const evaluation = await prisma.materialEvaluation.create({
      data: {
        maChien: data.maChien,
        thoiGianChien,
        ngaySanXuat: new Date(getProductionDay(thoiGianChien) + 'T00:00:00.000Z'),
        tenHangHoa: data.tenHangHoa,
        soLoKien: data.soLoKien,
        khoiLuong: parseFloat(data.khoiLuong),
        soLanNgam: parseInt(data.soLanNgam),
        nhietDoNuocTruocNgam: parseFloat(data.nhietDoNuocTruocNgam),
        nhietDoNuocSauVot: parseFloat(data.nhietDoNuocSauVot),
        thoiGianNgam: parseInt(data.thoiGianNgam),
        brixNuocNgam: parseFloat(data.brixNuocNgam),
        danhGiaTruocNgam: data.danhGiaTruocNgam,
        danhGiaSauNgam: data.danhGiaSauNgam,
        ghiChu: data.ghiChu ?? null,
        fileDinhKem: data.fileDinhKem,
        nguoiThucHien: data.nguoiThucHien,
        ca: data.ca != null ? parseInt(data.ca) : null,
        createdById: userId ?? null,
      },
    });

    // Non-fatal side effect: auto-generate child rows (SystemOperation / FinishedProduct /
    // QualityEvaluation) for every active production machine. Failure must not fail the
    // primary create (AGENTS.md: side effects never bubble errors that fail the main op).
    await this.seedProductionChildRows(evaluation.maChien, evaluation.thoiGianChien);

    return evaluation;
  }

  /**
   * Non-fatal wrapper around SystemOperationService.createBulkSystemOperations.
   * Never rethrows — logs on failure so the calling MaterialEvaluation create still succeeds.
   */
  private async seedProductionChildRows(maChien: string, thoiGianChien: Date): Promise<void> {
    try {
      // createBulkSystemOperations queries MaterialEvaluation by { maChien, thoiGianChien }.
      // Prisma accepts an ISO string for a DateTime field; pass the ISO string of the stored
      // Date so the seeder finds the just-created parent evaluation.
      await systemOperationService.createBulkSystemOperations(
        maChien,
        thoiGianChien.toISOString(),
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[materialEvaluationService] Auto-seed production child rows failed for maChien="${maChien}":`,
        err,
      );
    }
  }

  private async createWithWarehouseLink(data: any, thoiGianChien: Date, userId?: string) {
    const khoiLuong = parseFloat(data.khoiLuong);

    // Generate WarehouseIssue code BEFORE the transaction (uses a query)
    const maPhieuXuat = await this.generateWarehouseIssueCode();

    const evaluation = await prisma.$transaction(async (tx) => {
      // 1. Read LotProduct inside the transaction for consistency
      const lotProduct = await tx.lotProduct.findUnique({
        where: { id: data.lotProductId },
        include: {
          internationalProduct: true,
          lot: { include: { warehouse: true } },
        },
      });

      if (!lotProduct) {
        throw new NotFoundError('Không tìm thấy kiện hàng trong kho');
      }

      // Guard: only Kg units are allowed for material evaluation
      if (lotProduct.donViTinh !== 'Kg') {
        throw new ValidationError(
          `Kiện hàng phải có đơn vị tính Kg để dùng cho đánh giá nguyên liệu. Đơn vị hiện tại: ${lotProduct.donViTinh}`
        );
      }

      // 2. Validate stock
      if (lotProduct.soLuong < khoiLuong) {
        throw new ValidationError(
          `Số lượng tồn kho không đủ. Tồn hiện tại: ${lotProduct.soLuong} ${lotProduct.donViTinh}`
        );
      }

      const soLuongTruoc = lotProduct.soLuong;
      const soLuongSau = soLuongTruoc - khoiLuong;

      // 3. Build ghiChu with required prefix
      const ngayXuat = thoiGianChien;
      const dd = String(ngayXuat.getDate()).padStart(2, '0');
      const mm = String(ngayXuat.getMonth() + 1).padStart(2, '0');
      const yyyy = ngayXuat.getFullYear();
      const ghiChu = `[TỰ ĐỘNG] Xuất nguyên liệu cho mẻ chiên ${data.maChien} ngày ${dd}/${mm}/${yyyy}`;

      // 4. Create WarehouseIssue
      const warehouseIssue = await tx.warehouseIssue.create({
        data: {
          maPhieuXuat,
          employeeId: data.employeeId ?? lotProduct.internationalProductId, // fallback
          maNhanVien: data.maNhanVien ?? '',
          tenNhanVien: data.tenNhanVien ?? data.nguoiThucHien ?? '',
          warehouseId: lotProduct.lot.warehouseId,
          tenKho: lotProduct.lot.warehouse?.tenKho ?? '',
          lotId: lotProduct.lotId,
          tenLo: lotProduct.lot.tenLo,
          lotProductId: lotProduct.id,
          tenSanPham: lotProduct.internationalProduct.tenSanPham,
          soLuongTruoc,
          soLuongXuat: khoiLuong,
          soLuongSau,
          donViTinh: lotProduct.donViTinh,
          ghiChu,
        },
      });

      // 5. Decrement LotProduct.soLuong
      await tx.lotProduct.update({
        where: { id: lotProduct.id },
        data: { soLuong: soLuongSau },
      });

      // 6. Build snapshot fields
      const tenHangHoa = lotProduct.internationalProduct.tenSanPham;
      const soLoKien = `${lotProduct.lot.tenLo}-${lotProduct.id.slice(-4)}`;

      // 7. Create MaterialEvaluation with both FKs
      const newEvaluation = await tx.materialEvaluation.create({
        data: {
          maChien: data.maChien,
          thoiGianChien,
          ngaySanXuat: new Date(getProductionDay(thoiGianChien) + 'T00:00:00.000Z'),
          tenHangHoa,
          soLoKien,
          khoiLuong,
          soLanNgam: parseInt(data.soLanNgam),
          nhietDoNuocTruocNgam: parseFloat(data.nhietDoNuocTruocNgam),
          nhietDoNuocSauVot: parseFloat(data.nhietDoNuocSauVot),
          thoiGianNgam: parseInt(data.thoiGianNgam),
          brixNuocNgam: parseFloat(data.brixNuocNgam),
          danhGiaTruocNgam: data.danhGiaTruocNgam,
          danhGiaSauNgam: data.danhGiaSauNgam,
          ghiChu: data.ghiChu ?? null,
          fileDinhKem: data.fileDinhKem,
          nguoiThucHien: data.nguoiThucHien,
          ca: data.ca != null ? parseInt(data.ca) : null,
          lotProductId: lotProduct.id,
          warehouseIssueId: warehouseIssue.id,
          createdById: userId ?? null,
        },
      });

      return newEvaluation;
    });

    // Non-fatal side effect (post-transaction): seed production child rows for every
    // active machine. Kept outside the transaction to isolate seeding from the warehouse
    // issue — a seeder failure must not roll back a valid stock issue.
    await this.seedProductionChildRows(evaluation.maChien, evaluation.thoiGianChien);

    return evaluation;
  }

  async updateMaterialEvaluation(id: string, data: any) {
    const existing = await prisma.materialEvaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Material evaluation not found');
    }

    // Strip immutable fields — khoiLuong, lotProductId, warehouseIssueId must never change
    const { khoiLuong: _khoiLuong, lotProductId: _lotProductId, warehouseIssueId: _warehouseIssueId, ...safeData } = data;

    // Parse datetime from frontend
    let thoiGianChien: Date | undefined;
    if (safeData.thoiGianChien) {
      thoiGianChien = parseLocalDateTimeAsAppTz(safeData.thoiGianChien);
    }

    // Use transaction to update MaterialEvaluation and sync to related tables
    const evaluation = await prisma.$transaction(async (tx) => {
      // Update MaterialEvaluation
      const updatedEvaluation = await tx.materialEvaluation.update({
        where: { id },
        data: {
          thoiGianChien,
          tenHangHoa: safeData.tenHangHoa,
          soLoKien: safeData.soLoKien,
          soLanNgam: safeData.soLanNgam != null ? parseInt(safeData.soLanNgam) : undefined,
          nhietDoNuocTruocNgam: safeData.nhietDoNuocTruocNgam != null ? parseFloat(safeData.nhietDoNuocTruocNgam) : undefined,
          nhietDoNuocSauVot: safeData.nhietDoNuocSauVot != null ? parseFloat(safeData.nhietDoNuocSauVot) : undefined,
          thoiGianNgam: safeData.thoiGianNgam != null ? parseInt(safeData.thoiGianNgam) : undefined,
          brixNuocNgam: safeData.brixNuocNgam != null ? parseFloat(safeData.brixNuocNgam) : undefined,
          danhGiaTruocNgam: safeData.danhGiaTruocNgam,
          danhGiaSauNgam: safeData.danhGiaSauNgam,
          ghiChu: 'ghiChu' in safeData ? (safeData.ghiChu ?? null) : undefined,
          fileDinhKem: safeData.fileDinhKem,
          nguoiThucHien: safeData.nguoiThucHien,
          ca: 'ca' in safeData ? (safeData.ca != null ? parseInt(safeData.ca) : null) : undefined,
        },
      });

      // If thoiGianChien was updated, sync to related tables
      if (thoiGianChien) {
        const thoiGianChienString = thoiGianChien.toISOString();

        // Sync to SystemOperation (thoiGianChien is DateTime type)
        await tx.systemOperation.updateMany({
          where: { materialEvaluationId: id },
          data: { thoiGianChien: thoiGianChien },
        });

        // Sync to FinishedProduct (thoiGianChien is DateTime type)
        await tx.finishedProduct.updateMany({
          where: { materialEvaluationId: id },
          data: { thoiGianChien: thoiGianChien },
        });

        // Sync to QualityEvaluation (thoiGianChien is String type)
        await tx.qualityEvaluation.updateMany({
          where: { materialEvaluationId: id },
          data: { thoiGianChien: thoiGianChienString },
        });
      }

      return updatedEvaluation;
    });

    return evaluation;
  }

  async getMaterialEvaluationDeleteInfo(id: string): Promise<{
    qualityEvaluationCount: number;
    finishedProductCount: number;
    systemOperationCount: number;
  }> {
    const existing = await prisma.materialEvaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Material evaluation not found');
    }

    const [qualityEvaluationCount, finishedProductCount, systemOperationCount] = await Promise.all([
      prisma.qualityEvaluation.count({ where: { materialEvaluationId: id } }),
      prisma.finishedProduct.count({ where: { materialEvaluationId: id } }),
      prisma.systemOperation.count({ where: { materialEvaluationId: id } }),
    ]);

    return { qualityEvaluationCount, finishedProductCount, systemOperationCount };
  }

  async deleteMaterialEvaluation(id: string): Promise<{
    deletedQualityEvaluations: number;
    deletedFinishedProducts: number;
    deletedSystemOperations: number;
  }> {
    const existing = await prisma.materialEvaluation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError('Material evaluation not found');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Delete dependent production rows
      const [deletedQualityEvaluations, deletedFinishedProducts, deletedSystemOperations] = await Promise.all([
        tx.qualityEvaluation.deleteMany({ where: { materialEvaluationId: id } }),
        tx.finishedProduct.deleteMany({ where: { materialEvaluationId: id } }),
        tx.systemOperation.deleteMany({ where: { materialEvaluationId: id } }),
      ]);

      // 2. Handle warehouse refund if warehouseIssueId is set
      if (existing.warehouseIssueId) {
        const warehouseIssue = await tx.warehouseIssue.findUnique({
          where: { id: existing.warehouseIssueId },
        });

        if (warehouseIssue) {
          // Refund stock only if LotProduct still exists
          if (existing.lotProductId) {
            const lotProduct = await tx.lotProduct.findUnique({
              where: { id: existing.lotProductId },
            });

            if (lotProduct) {
              await tx.lotProduct.update({
                where: { id: existing.lotProductId },
                data: { soLuong: lotProduct.soLuong + warehouseIssue.soLuongXuat },
              });
            }
          }

          // Delete the WarehouseIssue
          await tx.warehouseIssue.delete({ where: { id: existing.warehouseIssueId } });
        }
      }

      // 3. Delete the MaterialEvaluation
      await tx.materialEvaluation.delete({ where: { id } });

      return {
        deletedQualityEvaluations: deletedQualityEvaluations.count,
        deletedFinishedProducts: deletedFinishedProducts.count,
        deletedSystemOperations: deletedSystemOperations.count,
      };
    });

    return result;
  }
}

export default new MaterialEvaluationService();

