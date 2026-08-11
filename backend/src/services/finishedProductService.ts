import prisma from '@config/database';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import warehouseReceiptService from '@services/warehouseReceiptService';
import { suggestAvailableProductCodeFor } from '@utils/productCode';
import { getProductionDay, productionDayRange, parseLocalDateTimeAsAppTz } from '@utils/productionDay';
import ExcelJS from 'exceljs';

// ─── Grade → SKU label mapping ────────────────────────────────────────────────
// Each grade field on FinishedProduct maps to a fixed human-readable label
// used as the suffix in the warehouse SKU name: "{base tenHangHoa} - {label}"
export const GRADE_LABELS: Record<string, string> = {
  aKhoiLuong: 'Loại A',
  bKhoiLuong: 'Loại B',
  bDauKhoiLuong: 'Loại B Dầu',
  cKhoiLuong: 'Loại C',
  vunLonKhoiLuong: 'Vụn lớn',
  vunNhoKhoiLuong: 'Vụn nhỏ',
  phePhamKhoiLuong: 'Phế phẩm',
  uotKhoiLuong: 'Ướt',
};

// Ordered grade field list (determines row order in receipts)
const GRADE_FIELDS = [
  'aKhoiLuong',
  'bKhoiLuong',
  'bDauKhoiLuong',
  'cKhoiLuong',
  'vunLonKhoiLuong',
  'vunNhoKhoiLuong',
  'phePhamKhoiLuong',
  'uotKhoiLuong',
] as const;

// ─── Receipt row type (mirrors warehouseReceiptService.CreateReceiptInput) ────
export interface ReceiptRowInput {
  tenSanPham: string;
  soLuongNhap: number;
  donViTinh?: string;
  warehouseId: string;
  lotId: string;
}

export class FinishedProductService {
  async getAllFinishedProducts(
    page: number = 1,
    limit: number = 10,
    machineSystemId?: string,
    dateRange?: { thoiGianChienFrom?: string; thoiGianChienTo?: string },
  ) {
    const skip = (page - 1) * limit;

    // Filter by machine system
    const whereClause: any = machineSystemId ? { machineSystemId } : {};

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
        whereClause.thoiGianChien = thoiGianChienFilter;
      }
    }

    const [data, total] = await Promise.all([
      prisma.finishedProduct.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [
          { maChien: 'desc' },
          { machineSystem: { maHeThong: 'asc' } },
        ],
        include: {
          materialEvaluation: {
            select: {
              maChien: true,
              tenHangHoa: true,
              thoiGianChien: true,
            },
          },
          machineSystem: {
            select: {
              id: true,
              tenHeThong: true,
              maHeThong: true,
              trangThai: true,
            },
          },
        },
      }),
      prisma.finishedProduct.count({ where: whereClause }),
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

  async getFinishedProductById(id: string) {
    const product = await prisma.finishedProduct.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Thành phẩm không tồn tại');
    }

    return product;
  }

  async createFinishedProduct(data: any, userId?: string) {
    // Validate required fields
    if (!data.maChien || !data.thoiGianChien || !data.tenHangHoa || data.khoiLuong === undefined) {
      throw new ValidationError('Thiếu thông tin bắt buộc');
    }

    // Get user's full name if userId is provided
    let nguoiThucHien = data.nguoiThucHien || '';
    if (userId && !data.nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.lastName} ${user.firstName}`.trim();
      }
    }

    // Calculate total output weight
    const tongKhoiLuong =
      (data.aKhoiLuong || 0) +
      (data.bKhoiLuong || 0) +
      (data.bDauKhoiLuong || 0) +
      (data.cKhoiLuong || 0) +
      (data.vunLonKhoiLuong || 0) +
      (data.vunNhoKhoiLuong || 0) +
      (data.phePhamKhoiLuong || 0) +
      (data.uotKhoiLuong || 0);

    // Calculate percentages (tỉ lệ %)
    const calculatePercentage = (value: number) => {
      return tongKhoiLuong > 0 ? (value / tongKhoiLuong) * 100 : 0;
    };

    const product = await prisma.finishedProduct.create({
      data: {
        maChien: data.maChien,
        thoiGianChien: parseLocalDateTimeAsAppTz(data.thoiGianChien),
        tenHangHoa: data.tenHangHoa,
        maSanPham: data.maSanPham ?? null,
        khoiLuong: data.khoiLuong,
        machineSystemId: data.machineSystemId ?? null,
        materialEvaluationId: data.materialEvaluationId,
        aKhoiLuong: data.aKhoiLuong || 0,
        bKhoiLuong: data.bKhoiLuong || 0,
        bDauKhoiLuong: data.bDauKhoiLuong || 0,
        cKhoiLuong: data.cKhoiLuong || 0,
        vunLonKhoiLuong: data.vunLonKhoiLuong || 0,
        vunNhoKhoiLuong: data.vunNhoKhoiLuong || 0,
        phePhamKhoiLuong: data.phePhamKhoiLuong || 0,
        uotKhoiLuong: data.uotKhoiLuong || 0,
        fileDinhKem: data.fileDinhKem,
        nguoiThucHien,
        tongKhoiLuong,
        aTiLe: calculatePercentage(data.aKhoiLuong || 0),
        bTiLe: calculatePercentage(data.bKhoiLuong || 0),
        bDauTiLe: calculatePercentage(data.bDauKhoiLuong || 0),
        cTiLe: calculatePercentage(data.cKhoiLuong || 0),
        vunLonTiLe: calculatePercentage(data.vunLonKhoiLuong || 0),
        vunNhoTiLe: calculatePercentage(data.vunNhoKhoiLuong || 0),
        phePhamTiLe: calculatePercentage(data.phePhamKhoiLuong || 0),
        uotTiLe: calculatePercentage(data.uotKhoiLuong || 0),
        createdById: userId ?? null,
      },
    });

    return product;
  }

  async updateFinishedProduct(id: string, data: any, userId?: string) {
    const existing = await this.getFinishedProductById(id);

    // Get user's full name if userId is provided and nguoiThucHien is not in data
    let nguoiThucHien = data.nguoiThucHien;
    if (userId && !data.nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.lastName} ${user.firstName}`.trim();
      }
    }

    // Get final values for each weight field
    const aKhoiLuong = data.aKhoiLuong !== undefined ? data.aKhoiLuong : existing.aKhoiLuong;
    const bKhoiLuong = data.bKhoiLuong !== undefined ? data.bKhoiLuong : existing.bKhoiLuong;
    const bDauKhoiLuong = data.bDauKhoiLuong !== undefined ? data.bDauKhoiLuong : existing.bDauKhoiLuong;
    const cKhoiLuong = data.cKhoiLuong !== undefined ? data.cKhoiLuong : existing.cKhoiLuong;
    const vunLonKhoiLuong = data.vunLonKhoiLuong !== undefined ? data.vunLonKhoiLuong : existing.vunLonKhoiLuong;
    const vunNhoKhoiLuong = data.vunNhoKhoiLuong !== undefined ? data.vunNhoKhoiLuong : existing.vunNhoKhoiLuong;
    const phePhamKhoiLuong = data.phePhamKhoiLuong !== undefined ? data.phePhamKhoiLuong : existing.phePhamKhoiLuong;
    const uotKhoiLuong = data.uotKhoiLuong !== undefined ? data.uotKhoiLuong : existing.uotKhoiLuong;

    // Calculate total output weight
    const tongKhoiLuong =
      aKhoiLuong +
      bKhoiLuong +
      bDauKhoiLuong +
      cKhoiLuong +
      vunLonKhoiLuong +
      vunNhoKhoiLuong +
      phePhamKhoiLuong +
      uotKhoiLuong;

    // Calculate percentages (tỉ lệ %)
    const calculatePercentage = (value: number) => {
      return tongKhoiLuong > 0 ? (value / tongKhoiLuong) * 100 : 0;
    };

    const updateData: any = {
      ...data,
      tongKhoiLuong,
      aTiLe: calculatePercentage(aKhoiLuong),
      bTiLe: calculatePercentage(bKhoiLuong),
      bDauTiLe: calculatePercentage(bDauKhoiLuong),
      cTiLe: calculatePercentage(cKhoiLuong),
      vunLonTiLe: calculatePercentage(vunLonKhoiLuong),
      vunNhoTiLe: calculatePercentage(vunNhoKhoiLuong),
      phePhamTiLe: calculatePercentage(phePhamKhoiLuong),
      uotTiLe: calculatePercentage(uotKhoiLuong),
    };

    // Only update nguoiThucHien if it's provided
    if (nguoiThucHien !== undefined) {
      updateData.nguoiThucHien = nguoiThucHien;
    }

    const product = await prisma.finishedProduct.update({
      where: { id },
      data: updateData,
    });

    // Auto-sync percentages to related quality evaluation
    await prisma.qualityEvaluation.updateMany({
      where: { finishedProductId: id },
      data: {
        aTiLe: updateData.aTiLe,
        bTiLe: updateData.bTiLe,
        bDauTiLe: updateData.bDauTiLe,
        cTiLe: updateData.cTiLe,
        vunLonTiLe: updateData.vunLonTiLe,
        vunNhoTiLe: updateData.vunNhoTiLe,
        phePhamTiLe: updateData.phePhamTiLe,
        uotTiLe: updateData.uotTiLe,
      },
    });

    return product;
  }

  async deleteFinishedProduct(id: string) {
    await this.getFinishedProductById(id);

    await prisma.finishedProduct.delete({
      where: { id },
    });

    return { message: 'Xóa thành phẩm thành công' };
  }

  /**
   * Upsert a FinishedProduct by (maChien, ngaySanXuat, machineSystemId).
   * Creates if not exists, updates if exists. Used by kiosk tablet grid.
   * Accepts optional `entryHistory` array for per-grade attribution.
   */
  async upsertByBatchMachine(data: any, userId?: string) {
    const { maChien, machineSystemId, entryHistory, ...rest } = data;
    if (!maChien || !machineSystemId) {
      throw new ValidationError('Mã chiên và máy là bắt buộc');
    }

    // Determine if the client explicitly sent nguoiThucHien
    const clientSentOperator = 'nguoiThucHien' in rest && !!rest.nguoiThucHien;

    // Resolve operator name for the create branch (always needed)
    let nguoiThucHien = rest.nguoiThucHien || '';
    if (userId && !nguoiThucHien) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        nguoiThucHien = `${user.lastName} ${user.firstName}`.trim();
      }
    }

    // Derive ngaySanXuat from thoiGianChien using the 06:30 production-day boundary
    const thoiGianChienDate = rest.thoiGianChien ? parseLocalDateTimeAsAppTz(rest.thoiGianChien) : new Date();
    const prodDayStr = getProductionDay(thoiGianChienDate);
    const ngaySanXuat = new Date(prodDayStr + 'T00:00:00.000Z');

    // Compute tongKhoiLuong and tiLe
    const aKhoiLuong = rest.aKhoiLuong || 0;
    const bKhoiLuong = rest.bKhoiLuong || 0;
    const bDauKhoiLuong = rest.bDauKhoiLuong || 0;
    const cKhoiLuong = rest.cKhoiLuong || 0;
    const vunLonKhoiLuong = rest.vunLonKhoiLuong || 0;
    const vunNhoKhoiLuong = rest.vunNhoKhoiLuong || 0;
    const phePhamKhoiLuong = rest.phePhamKhoiLuong || 0;
    const uotKhoiLuong = rest.uotKhoiLuong || 0;

    const tongKhoiLuong = aKhoiLuong + bKhoiLuong + bDauKhoiLuong + cKhoiLuong + vunLonKhoiLuong + vunNhoKhoiLuong + phePhamKhoiLuong + uotKhoiLuong;
    const calcPercent = (v: number) => tongKhoiLuong > 0 ? (v / tongKhoiLuong) * 100 : 0;

    // Resolve materialEvaluationId from maChien (for create case)
    // Day-scope when thoiGianChien is available in the request
    let materialEvalWhere: any = { maChien };
    if (rest.thoiGianChien) {
      const dayRange = productionDayRange(prodDayStr);
      materialEvalWhere = { maChien, thoiGianChien: { gte: dayRange.gte, lt: dayRange.lt } };
    }
    const materialEval = await prisma.materialEvaluation.findFirst({
      where: materialEvalWhere,
      select: { id: true, thoiGianChien: true, tenHangHoa: true, maSanPham: true },
    });

    const upsertData = {
      aKhoiLuong,
      bKhoiLuong,
      bDauKhoiLuong,
      cKhoiLuong,
      vunLonKhoiLuong,
      vunNhoKhoiLuong,
      phePhamKhoiLuong,
      uotKhoiLuong,
      tongKhoiLuong,
      aTiLe: calcPercent(aKhoiLuong),
      bTiLe: calcPercent(bKhoiLuong),
      bDauTiLe: calcPercent(bDauKhoiLuong),
      cTiLe: calcPercent(cKhoiLuong),
      vunLonTiLe: calcPercent(vunLonKhoiLuong),
      vunNhoTiLe: calcPercent(vunNhoKhoiLuong),
      phePhamTiLe: calcPercent(phePhamKhoiLuong),
      uotTiLe: calcPercent(uotKhoiLuong),
      ...(rest.khoiLuong !== undefined ? { khoiLuong: rest.khoiLuong } : {}),
      ...('ghiChu' in rest ? { ghiChu: rest.ghiChu ?? null } : {}),
    };

    // Update branch: only stamp nguoiThucHien when client explicitly sent it
    const updateData = {
      ...upsertData,
      ...(clientSentOperator ? { nguoiThucHien } : {}),
    };

    // Create branch: always stamp nguoiThucHien (required field)
    const createData = {
      ...upsertData,
      nguoiThucHien,
    };

    const product = await prisma.finishedProduct.upsert({
      where: { maChien_ngaySanXuat_machineSystemId: { maChien, ngaySanXuat, machineSystemId } },
      update: updateData,
      create: {
        maChien,
        machineSystemId,
        ngaySanXuat,
        thoiGianChien: materialEval?.thoiGianChien ?? thoiGianChienDate,
        tenHangHoa: rest.tenHangHoa || materialEval?.tenHangHoa || '',
        maSanPham: rest.maSanPham ?? materialEval?.maSanPham ?? null,
        khoiLuong: rest.khoiLuong ?? 0,
        materialEvaluationId: materialEval?.id ?? null,
        ...createData,
        createdById: userId ?? null,
      },
    });

    // Persist per-grade entry-history rows (non-fatal: attribution failure must not fail save)
    if (Array.isArray(entryHistory) && entryHistory.length > 0) {
      try {
        for (const entry of entryHistory) {
          if (!entry.grade || entry.khoiLuong == null) continue;
          // Replace semantics: delete existing record for this FP+grade, then create new
          await prisma.finishedProductEntryHistory.deleteMany({
            where: {
              finishedProductId: product.id,
              grade: entry.grade,
            },
          });
          await prisma.finishedProductEntryHistory.create({
            data: {
              finishedProductId: product.id,
              maChien,
              ngaySanXuat,
              machineSystemId,
              grade: entry.grade,
              khoiLuong: typeof entry.khoiLuong === 'number' ? entry.khoiLuong : parseFloat(entry.khoiLuong),
              employeeId: entry.employeeId ?? null,
              employeeName: entry.employeeName ?? null,
              enteredAt: new Date(),
            },
          });
        }
      } catch (err) {
        // Attribution failure must not fail the main save
        console.error('[finishedProductService] Entry history write failed:', err);
      }
    }

    return product;
  }

  /**
   * Build warehouse receipt input rows from a FinishedProduct's 8 grade weights.
   * Grades with weight 0 are skipped. Returns up to 8 rows.
   * Each row tenSanPham = "{base tenHangHoa} - {GRADE_LABELS[field]}"
   */
  async buildReceiptRowsForFinishedProduct(finishedProductId: string): Promise<Array<{ tenSanPham: string; soLuongNhap: number }>> {
    const fp = await prisma.finishedProduct.findUnique({
      where: { id: finishedProductId },
    });

    if (!fp) {
      throw new NotFoundError('Thành phẩm không tồn tại');
    }

    const rows: Array<{ tenSanPham: string; soLuongNhap: number }> = [];
    for (const field of GRADE_FIELDS) {
      const weight = (fp as any)[field] as number;
      if (weight && weight > 0) {
        rows.push({
          tenSanPham: `${fp.tenHangHoa} - ${GRADE_LABELS[field]}`,
          soLuongNhap: weight,
        });
      }
    }

    return rows;
  }

  /**
   * Confirm warehouse receipt for a finished product:
   * accepts user-confirmed rows (with possibly edited quantities), warehouseId, lotId,
   * generates receipt codes, then delegates to warehouseReceiptService.batchCreate.
   */
  async confirmFinishedProductWarehouseReceipt(
    finishedProductId: string,
    warehouseId: string,
    lotId: string,
    rows: Array<{ tenSanPham: string; soLuongNhap: number; donViTinh?: string }>,
    userId: string,
  ) {
    if (!warehouseId) {
      throw new ValidationError('Vui lòng chọn kho nhập hàng');
    }
    if (!lotId) {
      throw new ValidationError('Vui lòng chọn lô hàng');
    }
    if (!rows || rows.length === 0) {
      throw new ValidationError('Không có dòng sản phẩm nào để nhập kho');
    }

    // Validate that the finished product exists
    const fp = await prisma.finishedProduct.findUnique({ where: { id: finishedProductId } });
    if (!fp) {
      throw new NotFoundError('Thành phẩm không tồn tại');
    }

    // Check idempotency: reject if already received
    if (fp.daNhapKho) {
      throw new ConflictError('Thành phẩm này đã được nhập kho, không thể nhập kho lại');
    }

    // Validate warehouse and lot exist
    const warehouse = await prisma.warehouses.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      throw new NotFoundError('Kho hàng không tồn tại');
    }
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) {
      throw new NotFoundError('Lô hàng không tồn tại');
    }

    // Look up employee info
    let maNhanVien = '';
    let tenNhanVien = '';
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, employees: { select: { employeeCode: true } } },
      });
      if (user) {
        tenNhanVien = `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim();
        maNhanVien = user.employees?.employeeCode ?? '';
      }
    }

    // Build receipt items — one header with multiple lines (task 7.4)
    const items: Array<{ lotProductId: string; tenSanPham: string; donViTinh: string; warehouseId: string; tenKho: string; lotId: string; tenLo: string; soLuongThucTe: number; ghiChu: string; loaiSanPham: string }> = [];

    for (const row of rows) {
      // Resolve product and lot product
      let product = await prisma.internationalProduct.findFirst({
        where: { tenSanPham: { equals: row.tenSanPham, mode: 'insensitive' } },
      });
      if (!product) {
        const maSanPham = await suggestAvailableProductCodeFor(prisma, {
          tenSanPham: row.tenSanPham,
          loaiSanPham: 'Thành phẩm sấy',
        });
        product = await prisma.internationalProduct.create({
          data: { maSanPham, tenSanPham: row.tenSanPham, donViTinh: row.donViTinh || 'Kg', loaiSanPham: 'Thành phẩm sấy' },
        });
      }

      let lpRecord = await prisma.lotProduct.findFirst({
        where: { lotId, internationalProductId: product.id },
      });
      if (!lpRecord) {
        lpRecord = await prisma.lotProduct.create({
          data: { lotId, internationalProductId: product.id, soLuong: 0, donViTinh: row.donViTinh || 'Kg' },
        });
        const autoMaKien = `${lot.tenLo}-${lpRecord.id.slice(-4)}`;
        lpRecord = await prisma.lotProduct.update({
          where: { id: lpRecord.id },
          data: { maKien: autoMaKien },
        });
      }

      items.push({
        lotProductId: lpRecord.id,
        tenSanPham: row.tenSanPham,
        donViTinh: row.donViTinh || 'Kg',
        warehouseId,
        tenKho: warehouse.tenKho,
        lotId,
        tenLo: lot.tenLo,
        soLuongThucTe: row.soLuongNhap,
        ghiChu: 'Nhập kho thành phẩm từ mẻ sản xuất',
        loaiSanPham: 'Thành phẩm sấy',
      });
    }

    await prisma.finishedProduct.update({
      where: { id: finishedProductId },
      data: { daNhapKho: true },
    });

    const receipt = await warehouseReceiptService.create({
      employeeId: userId,
      maNhanVien,
      tenNhanVien,
      ghiChu: 'Nhập kho thành phẩm từ mẻ sản xuất',
      items,
    });

    return [receipt];
  }

  /**
   * Bulk warehouse receipt for multiple fry-batches (maChien).
   * Accepts maChienList + a single warehouseId + lotId.
   * For each maChien, sums 8 grade weights across all machines, skips grade=0,
   * generates sequential maPhieuNhap codes, calls warehouseReceiptService.batchCreate,
   * and marks all affected FinishedProduct rows daNhapKho=true.
   * All operations run in one prisma.$transaction.
   */
  async confirmBulkFinishedProductWarehouseReceipt(
    maChienList: string[],
    warehouseId: string,
    lotId: string,
    userId: string,
    thoiGianChien?: string,
  ) {
    // Input validation
    if (!maChienList || maChienList.length === 0) {
      throw new ValidationError('Danh sách mã chiên không được để trống');
    }
    if (!warehouseId) {
      throw new ValidationError('Vui lòng chọn kho nhập hàng');
    }
    if (!lotId) {
      throw new ValidationError('Vui lòng chọn lô hàng');
    }

    // Validate warehouse and lot exist
    const warehouse = await prisma.warehouses.findUnique({ where: { id: warehouseId } });
    if (!warehouse) {
      throw new NotFoundError('Kho hàng không tồn tại');
    }
    const lot = await prisma.lot.findUnique({ where: { id: lotId } });
    if (!lot) {
      throw new NotFoundError('Lô hàng không tồn tại');
    }

    // Look up employee info
    let maNhanVien = '';
    let tenNhanVien = '';
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, employees: { select: { employeeCode: true } } },
      });
      if (user) {
        tenNhanVien = `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim();
        maNhanVien = user.employees?.employeeCode ?? '';
      }
    }

    // Fetch all FinishedProduct rows for all listed maChien in one query
    // Day-scope: only fetch rows for the same production day when thoiGianChien is provided
    let fpWhere: any = { maChien: { in: maChienList } };
    if (thoiGianChien) {
      const prodDay = getProductionDay(parseLocalDateTimeAsAppTz(thoiGianChien));
      const dayRange = productionDayRange(prodDay);
      fpWhere = { maChien: { in: maChienList }, thoiGianChien: { gte: dayRange.gte, lt: dayRange.lt } };
    }
    const allFPs = await prisma.finishedProduct.findMany({
      where: fpWhere,
    });

    // Validate: every maChien must have at least one FP row
    for (const maChien of maChienList) {
      const hasFPs = allFPs.some((fp) => fp.maChien === maChien);
      if (!hasFPs) {
        throw new NotFoundError(`Không tìm thấy thành phẩm cho mẻ chiên: ${maChien}`);
      }
    }

    // Validate: no FP in any selected maChien may already be received
    const alreadyReceived = allFPs.filter((fp) => fp.daNhapKho);
    if (alreadyReceived.length > 0) {
      const maChienSet = [...new Set(alreadyReceived.map((fp) => fp.maChien))].join(', ');
      throw new ConflictError(`Các mẻ chiên sau đã được nhập kho, không thể nhập kho lại: ${maChienSet}`);
    }

    // Task 7.1-7.3: Inside the transaction, resolve products and lot products,
    // then mark FP as received. Receipt headers are created after commit via
    // warehouseReceiptService.create(), which handles code generation, snapshot
    // chaining, and stock updates in its own atomic transaction.
    const receiptInputs: Array<{
      maChien: string;
      employeeId: string;
      maNhanVien: string;
      tenNhanVien: string;
      items: Array<{
        lotProductId: string;
        tenSanPham: string;
        donViTinh: string;
        warehouseId: string;
        tenKho: string;
        lotId: string;
        tenLo: string;
        soLuongThucTe: number;
        ghiChu: string;
        loaiSanPham: string;
      }>;
    }> = [];

    await prisma.$transaction(async (tx) => {
      // Cache base product loaiSanPham by tenHangHoa
      const loaiSanPhamCache = new Map<string, string | null>();

      for (const maChien of maChienList) {
        const fps = allFPs.filter((fp) => fp.maChien === maChien);

        // Sum 8 grades across all machines for this maChien
        const sums: Record<string, number> = {};
        for (const field of GRADE_FIELDS) {
          sums[field] = fps.reduce((acc, fp) => acc + ((fp as any)[field] as number || 0), 0);
        }

        const tenHangHoa = fps[0].tenHangHoa;

        if (!loaiSanPhamCache.has(tenHangHoa)) {
          const baseProduct = await tx.internationalProduct.findFirst({
            where: { tenSanPham: { equals: tenHangHoa, mode: 'insensitive' } },
            select: { loaiSanPham: true },
          });
          loaiSanPhamCache.set(tenHangHoa, baseProduct?.loaiSanPham ?? null);
        }

        const items: Array<{
          lotProductId: string;
          tenSanPham: string;
          donViTinh: string;
          warehouseId: string;
          tenKho: string;
          lotId: string;
          tenLo: string;
          soLuongThucTe: number;
          ghiChu: string;
          loaiSanPham: string;
        }> = [];

        for (const field of GRADE_FIELDS) {
          const weight = sums[field];
          if (!weight || weight <= 0) continue;

          const tenSanPham = `${tenHangHoa} - ${GRADE_LABELS[field]}`;

          let product = await tx.internationalProduct.findFirst({
            where: { tenSanPham: { equals: tenSanPham, mode: 'insensitive' } },
          });
          if (!product) {
            const cachedLoai = loaiSanPhamCache.get(tenHangHoa);
            const loaiSanPham = cachedLoai ? cachedLoai : 'Thành phẩm sấy';
            const maSanPham = await suggestAvailableProductCodeFor(tx, {
              tenSanPham,
              loaiSanPham,
            });
            product = await tx.internationalProduct.create({
              data: { maSanPham, tenSanPham, donViTinh: 'Kg', loaiSanPham },
            });
          }

          let lpRecord = await tx.lotProduct.findFirst({
            where: { lotId, internationalProductId: product.id },
          });
          if (!lpRecord) {
            lpRecord = await tx.lotProduct.create({
              data: { lotId, internationalProductId: product.id, soLuong: 0, donViTinh: 'Kg' },
            });
            const autoMaKien = `${lot.tenLo}-${lpRecord.id.slice(-4)}`;
            lpRecord = await tx.lotProduct.update({
              where: { id: lpRecord.id },
              data: { maKien: autoMaKien },
            });
          }

          items.push({
            lotProductId: lpRecord.id,
            tenSanPham,
            donViTinh: 'Kg',
            warehouseId,
            tenKho: warehouse.tenKho,
            lotId,
            tenLo: lot.tenLo,
            soLuongThucTe: weight,
            ghiChu: `Nhập kho thành phẩm từ mẻ chiên ${maChien} (tổng các máy)`,
            loaiSanPham: loaiSanPhamCache.get(tenHangHoa) ?? 'Thành phẩm sấy',
          });
        }

        if (items.length > 0) {
          receiptInputs.push({
            maChien,
            employeeId: userId,
            maNhanVien,
            tenNhanVien,
            items,
          });
        }
      }

      // Mark all FinishedProduct rows of selected maChien as received (day-scoped)
      await tx.finishedProduct.updateMany({
        where: fpWhere,
        data: { daNhapKho: true },
      });
    });

    // Create one receipt header per maChien AFTER the transaction commits.
    // warehouseReceiptService.create() handles code generation, sequential
    // snapshot chaining (D5), and stock updates in its own atomic transaction.
    for (const input of receiptInputs) {
      await warehouseReceiptService.create({
        employeeId: input.employeeId,
        maNhanVien: input.maNhanVien,
        tenNhanVien: input.tenNhanVien,
        ghiChu: `Nhập kho thành phẩm từ mẻ chiên ${input.maChien} (tổng các máy)`,
        items: input.items,
      });
    }

    return { success: true };
  }

  /**
   * Get multi-dimensional output statistics grouped by date, product, grade, and machine.
   * Required: dateFrom, dateTo (YYYY-MM-DD)
   * Optional: machineSystemId, tenHangHoa
   * Computes good output (A+B+BDầu+C+vụn lớn+vụn nhỏ) vs scrap (phế phẩm+ướt).
   */
  async getOutputStatistics(filters: {
    dateFrom: string;
    dateTo: string;
    machineSystemId?: string;
    tenHangHoa?: string;
  }) {
    if (!filters.dateFrom || !filters.dateTo) {
      throw new ValidationError('Ngày bắt đầu và ngày kết thúc là bắt buộc');
    }

    const startDate = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    const endDate = new Date(`${filters.dateTo}T23:59:59.999Z`);

    const where: any = {
      thoiGianChien: { gte: startDate, lte: endDate },
    };

    if (filters.machineSystemId) {
      where.machineSystemId = filters.machineSystemId;
    }

    if (filters.tenHangHoa) {
      where.tenHangHoa = { contains: filters.tenHangHoa, mode: 'insensitive' };
    }

    const products = await prisma.finishedProduct.findMany({
      where,
      orderBy: [{ thoiGianChien: 'asc' }, { tenHangHoa: 'asc' }],
      include: {
        machineSystem: {
          select: { id: true, maHeThong: true, tenHeThong: true },
        },
      },
    });

    const rows = products.map((p) => {
      const date = p.thoiGianChien.toISOString().split('T')[0];
      const goodOutput =
        (p.aKhoiLuong || 0) +
        (p.bKhoiLuong || 0) +
        (p.bDauKhoiLuong || 0) +
        (p.cKhoiLuong || 0) +
        (p.vunLonKhoiLuong || 0) +
        (p.vunNhoKhoiLuong || 0);
      const scrap = (p.phePhamKhoiLuong || 0) + (p.uotKhoiLuong || 0);

      return {
        id: p.id,
        date,
        maChien: p.maChien,
        tenHangHoa: p.tenHangHoa,
        machineSystemId: p.machineSystemId,
        maHeThong: p.machineSystem?.maHeThong ?? null,
        tenHeThong: p.machineSystem?.tenHeThong ?? null,
        aKhoiLuong: p.aKhoiLuong,
        bKhoiLuong: p.bKhoiLuong,
        bDauKhoiLuong: p.bDauKhoiLuong,
        cKhoiLuong: p.cKhoiLuong,
        vunLonKhoiLuong: p.vunLonKhoiLuong,
        vunNhoKhoiLuong: p.vunNhoKhoiLuong,
        phePhamKhoiLuong: p.phePhamKhoiLuong,
        uotKhoiLuong: p.uotKhoiLuong,
        tongKhoiLuong: p.tongKhoiLuong,
        goodOutput,
        scrap,
      };
    });

    return rows;
  }

  async exportToExcel(filters?: any): Promise<Buffer> {
    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { maChien: { contains: filters.search, mode: 'insensitive' } },
        { tenHangHoa: { contains: filters.search, mode: 'insensitive' } },
        { nguoiThucHien: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters?.machineSystemId) {
      where.machineSystemId = filters.machineSystemId;
    }

    const data = await prisma.finishedProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        entryHistory: {
          orderBy: { enteredAt: 'desc' },
        },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách thành phẩm');

    worksheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã chiên', key: 'maChien', width: 15 },
      { header: 'Thời gian chiên', key: 'thoiGianChien', width: 20 },
      { header: 'Tên hàng hóa', key: 'tenHangHoa', width: 20 },
      { header: 'Hệ thống máy', key: 'machineSystemId', width: 20 },
      { header: 'KL đầu vào (kg)', key: 'khoiLuong', width: 15 },
      { header: 'A (kg)', key: 'aKhoiLuong', width: 12 },
      { header: 'Người nhập A', key: 'aEnteredBy', width: 18 },
      { header: 'A (%)', key: 'aTiLe', width: 10 },
      { header: 'B (kg)', key: 'bKhoiLuong', width: 12 },
      { header: 'Người nhập B', key: 'bEnteredBy', width: 18 },
      { header: 'B (%)', key: 'bTiLe', width: 10 },
      { header: 'B Dầu (kg)', key: 'bDauKhoiLuong', width: 12 },
      { header: 'Người nhập B Dầu', key: 'bDauEnteredBy', width: 18 },
      { header: 'C (kg)', key: 'cKhoiLuong', width: 12 },
      { header: 'Người nhập C', key: 'cEnteredBy', width: 18 },
      { header: 'Vụn lớn (kg)', key: 'vunLonKhoiLuong', width: 12 },
      { header: 'Vụn nhỏ (kg)', key: 'vunNhoKhoiLuong', width: 12 },
      { header: 'Phế phẩm (kg)', key: 'phePhamKhoiLuong', width: 12 },
      { header: 'Ướt (kg)', key: 'uotKhoiLuong', width: 12 },
      { header: 'Người nhập Ướt', key: 'uotEnteredBy', width: 18 },
      { header: 'Tổng KL (kg)', key: 'tongKhoiLuong', width: 15 },
      { header: 'Người thực hiện', key: 'nguoiThucHien', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((item, index) => {
      // Build per-grade attribution lookup from entryHistory
      // For pre-cut-over records with no history, these remain empty (no invented attribution)
      const historyByGrade: Record<string, string> = {};
      if (item.entryHistory && item.entryHistory.length > 0) {
        for (const h of item.entryHistory) {
          // Most recent entry per grade (already ordered by enteredAt desc)
          if (!historyByGrade[h.grade]) {
            historyByGrade[h.grade] = h.employeeName || '';
          }
        }
      }

      worksheet.addRow({
        stt: index + 1,
        maChien: item.maChien,
        thoiGianChien: item.thoiGianChien || '',
        tenHangHoa: item.tenHangHoa,
        machineSystemId: item.machineSystemId || '',
        khoiLuong: item.khoiLuong,
        aKhoiLuong: item.aKhoiLuong,
        aEnteredBy: historyByGrade['aKhoiLuong'] || '',
        aTiLe: item.aTiLe,
        bKhoiLuong: item.bKhoiLuong,
        bEnteredBy: historyByGrade['bKhoiLuong'] || '',
        bTiLe: item.bTiLe,
        bDauKhoiLuong: item.bDauKhoiLuong,
        bDauEnteredBy: historyByGrade['bDauKhoiLuong'] || '',
        cKhoiLuong: item.cKhoiLuong,
        cEnteredBy: historyByGrade['cKhoiLuong'] || '',
        vunLonKhoiLuong: item.vunLonKhoiLuong,
        vunNhoKhoiLuong: item.vunNhoKhoiLuong,
        phePhamKhoiLuong: item.phePhamKhoiLuong,
        uotKhoiLuong: item.uotKhoiLuong,
        uotEnteredBy: historyByGrade['uotKhoiLuong'] || '',
        tongKhoiLuong: item.tongKhoiLuong,
        nguoiThucHien: item.nguoiThucHien || '',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as any;
  }
}

export default new FinishedProductService();

