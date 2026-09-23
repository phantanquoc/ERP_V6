import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { ConflictError, NotFoundError, ValidationError } from '@utils/errors';
import systemOperationService from '@services/systemOperationService';
import warehouseIssueService from '@services/warehouseIssueService';
import { computeHeaderTotals } from '@utils/warehouseSlipLines';
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

  /**
   * Task 6.3 — the slip service owns `PX` code generation. Duplicating the query
   * here let the two implementations drift; a single owner cannot.
   */
  // @ts-ignore TS6133 keep for backwards compat — delegate to warehouseIssueService
  private generateWarehouseIssueCode(): Promise<string> {
    return warehouseIssueService.generateCode();
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

  private resolveLotInputs(data: any, khoiLuong: number): Array<{ lotProductId: string; quantity: number }> | null {
    if (Array.isArray(data.lotProducts) && data.lotProducts.length > 0) {
      return data.lotProducts.map((it: any) => ({
        lotProductId: String(it.lotProductId),
        quantity: Number(it.quantity ?? it.soLuong ?? it.khoiLuong),
      }));
    }
    if (Array.isArray(data.lotProductIds) && data.lotProductIds.length > 0) {
      const ids: string[] = data.lotProductIds.map((v: any) => String(v));
      if (ids.length === 1) return [{ lotProductId: ids[0], quantity: khoiLuong }];
      // Equal split when caller sends only ids without per-lot quantities
      const per = khoiLuong / ids.length;
      return ids.map((id) => ({ lotProductId: id, quantity: per }));
    }
    if (data.lotProductId) {
      return [{ lotProductId: String(data.lotProductId), quantity: khoiLuong }];
    }
    return null;
  }

  private async resolveEmployeeId(data: any, userId?: string, tx?: Prisma.TransactionClient): Promise<string> {
    if (data.employeeId) return String(data.employeeId);
    if (userId) {
      const client: any = tx ?? prisma;
      const emp = await client.employee.findUnique({ where: { userId }, select: { id: true } });
      if (emp?.id) return emp.id;
      // Fallback to userId itself if no Employee row (kiosk path resolves earlier)
      return String(userId);
    }
    throw new ValidationError('Thiếu employeeId — không xác định được người tạo phiếu xuất');
  }

  /** Creates a MaterialEvaluation for an already-selected schedule code. */
  private async createForSelectedCode(data: any, thoiGianChien: Date, userId?: string) {
    const khoiLuong = parseFloat(data.khoiLuong);
    const hasLot = this.resolveLotInputs(data, khoiLuong);
    if (hasLot && hasLot.length > 0) {
      return this.createWithWarehouseLink(data, thoiGianChien, userId);
    }

    // Legacy create without warehouse link
    const evaluation = await prisma.materialEvaluation.create({
      data: {
        maChien: data.maChien,
        thoiGianChien,
        ngaySanXuat: new Date(getProductionDay(thoiGianChien) + 'T00:00:00.000Z'),
        tenHangHoa: data.tenHangHoa,
        maSanPham: data.maSanPham ?? null,
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
    const lotInputs = this.resolveLotInputs(data, khoiLuong);
    if (!lotInputs || lotInputs.length === 0) throw new ValidationError('Thiếu kiện hàng để xuất nguyên liệu');
    // Validate per-lot quantities
    for (const it of lotInputs) {
      if (!it.lotProductId || !Number.isFinite(it.quantity) || it.quantity <= 0) {
        throw new ValidationError(`Số lượng cho kiện ${it.lotProductId ?? '?'} không hợp lệ`);
      }
    }
    const sumQty = lotInputs.reduce((s, it) => s + it.quantity, 0);
    if (Math.abs(sumQty - khoiLuong) > 1e-6 && lotInputs.length > 1) {
      // Allow caller to send explicit per-lot quantities that must sum to khoiLuong
      throw new ValidationError(`Tổng số lượng các kiện (${sumQty}) phải bằng khối lượng mẻ (${khoiLuong})`);
    }

    const createInTx = async (tx: Prisma.TransactionClient) => {
      const maPhieuXuat = await warehouseIssueService.generateCode(tx as any);

      // 1. Load all LotProducts inside tx
      const lotProducts = await tx.lotProduct.findMany({
        where: { id: { in: lotInputs.map((i) => i.lotProductId) } },
        include: { internationalProduct: true, lot: { include: { warehouse: true } } },
      });
      const byId = new Map(lotProducts.map((lp) => [lp.id, lp]));
      for (const it of lotInputs) {
        const lp = byId.get(it.lotProductId);
        if (!lp) throw new NotFoundError(`Không tìm thấy kiện hàng ${it.lotProductId}`);
        if ((lp as any).donViTinh !== 'Kg') {
          throw new ValidationError(`Kiện ${it.lotProductId} phải có đơn vị Kg, hiện tại: ${(lp as any).donViTinh}`);
        }
      }

      // Resolve employeeId correctly (no internationalProductId fallback)
      const employeeId = await this.resolveEmployeeId(data, userId, tx);

      const ngayXuat = thoiGianChien;
      const dd = String(ngayXuat.getDate()).padStart(2, '0');
      const mm = String(ngayXuat.getMonth() + 1).padStart(2, '0');
      const yyyy = ngayXuat.getFullYear();
      const ghiChu = `[TỰ ĐỘNG] Xuất nguyên liệu cho mẻ chiên ${data.maChien} ngày ${dd}/${mm}/${yyyy}`;

      // 2. Atomic decrement per package (TOCTOU-safe)
      for (const it of lotInputs) {
        const res = await tx.lotProduct.updateMany({
          where: { id: it.lotProductId, soLuong: { gte: it.quantity } },
          data: { soLuong: { decrement: it.quantity } },
        });
        if (res.count === 0) {
          const lp = byId.get(it.lotProductId)!;
          throw new ValidationError(`Số lượng tồn kho kiện ${it.lotProductId} không đủ. Tồn ${ (lp as any).soLuong}, cần ${it.quantity}`);
        }
      }
      // Re-read for snapshots
      const after = await tx.lotProduct.findMany({ where: { id: { in: lotInputs.map((i) => i.lotProductId) } } });
      const afterById = new Map(after.map((r) => [r.id, r]));

      const lines = lotInputs.map((it, idx) => {
        const lp = byId.get(it.lotProductId)! as any;
        const cur = afterById.get(it.lotProductId)! as any;
        const soLuongSau = cur.soLuong;
        const soLuongTruoc = soLuongSau + it.quantity;
        return {
          stt: idx + 1,
          lotProductId: it.lotProductId,
          tenSanPham: lp.internationalProduct?.tenSanPham ?? '',
          donViTinh: lp.donViTinh,
          warehouseId: lp.lot.warehouseId,
          tenKho: lp.lot.warehouse?.tenKho ?? '',
          lotId: lp.lotId,
          tenLo: lp.lot.tenLo,
          soLuongYeuCau: it.quantity,
          soLuongThucTe: it.quantity,
          soLuongTruoc,
          soLuongSau,
          ghiChu,
        };
      });

      const first = lines[0];
      let warehouseIssue: any;
      try {
        warehouseIssue = await tx.warehouseIssue.create({
          data: {
            maPhieuXuat,
            employeeId,
            maNhanVien: data.maNhanVien ?? '',
            tenNhanVien: data.tenNhanVien ?? data.nguoiThucHien ?? '',
            ghiChu,
            ...computeHeaderTotals(lines),
            warehouseId: first.warehouseId,
            tenKho: first.tenKho,
            lotId: first.lotId,
            tenLo: first.tenLo,
            lotProductId: first.lotProductId,
            tenSanPham: first.tenSanPham,
            donViTinh: first.donViTinh,
            soLuongTruoc: first.soLuongTruoc,
            soLuongXuat: khoiLuong,
            soLuongSau: first.soLuongSau,
            items: { create: lines },
          },
        });
      } catch (e: any) {
        if (e?.code === 'P2002') throw new ConflictError(`Trùng mã phiếu xuất ${maPhieuXuat}, vui lòng thử lại`);
        throw e;
      }

      const primary = byId.get(lotInputs[0].lotProductId)! as any;
      const tenHangHoa = primary.internationalProduct?.tenSanPham ?? '';
      const maSanPham = primary.internationalProduct?.maSanPham ?? '';
      const soLoKien = lotInputs.length === 1
        ? (primary.maKien ?? `${primary.lot.tenLo}-${primary.id.slice(-4)}`)
        : lotInputs.map((it) => {
            const lp2 = byId.get(it.lotProductId)! as any;
            return lp2.maKien ?? `${lp2.lot.tenLo}-${lp2.id.slice(-4)}`;
          }).join(', ');

      const newEvaluation = await tx.materialEvaluation.create({
        data: {
          maChien: data.maChien,
          thoiGianChien,
          ngaySanXuat: new Date(getProductionDay(thoiGianChien) + 'T00:00:00.000Z'),
          tenHangHoa,
          maSanPham,
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
          lotProductId: lotInputs[0].lotProductId,
          warehouseIssueId: warehouseIssue.id,
          createdById: userId ?? null,
        },
      });
      return newEvaluation;
    };

    // Retry once on P2002 code collision
    let evaluation: any;
    try {
      evaluation = await prisma.$transaction(createInTx);
    } catch (e: any) {
      if (e instanceof ConflictError && String(e.message).includes('Trùng mã phiếu')) {
        evaluation = await prisma.$transaction(createInTx);
      } else throw e;
    }
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
          maSanPham: 'maSanPham' in safeData ? (safeData.maSanPham ?? null) : undefined,
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
          include: { items: true },
        });

        if (warehouseIssue) {
          // Refund stock for ALL packages in the slip (multi-lot support).
          // Aggregate refunds by lotProductId from lines so each package gets correct total.
          const refundsByLot = new Map<string, number>();
          for (const line of (warehouseIssue.items ?? []) as any[]) {
            refundsByLot.set(line.lotProductId, (refundsByLot.get(line.lotProductId) ?? 0) + Number(line.soLuongThucTe));
          }
          if (refundsByLot.size > 0) {
            if ([...refundsByLot.values()].some((v) => !Number.isFinite(v))) {
              throw new ValidationError(`Không xác định được số lượng hoàn kho từ phiếu xuất ${warehouseIssue.maPhieuXuat}`);
            }
            for (const [lotProductId, refund] of refundsByLot) {
              const lotProduct = await tx.lotProduct.findUnique({ where: { id: lotProductId } });
              if (!lotProduct) continue;
              const soLuong = lotProduct.soLuong + refund;
              if (!Number.isFinite(soLuong)) {
                throw new ValidationError(`Số lượng tồn kho sau hoàn không hợp lệ cho kiện hàng ${lotProductId}`);
              }
              await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong } });
            }
          }

          // Delete the WarehouseIssue — its lines go by cascade.
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

