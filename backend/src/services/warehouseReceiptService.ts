import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere } from '../utils/codeGenerator';
import { suggestAvailableProductCodeFor, UNCLASSIFIED_CATEGORY } from '@utils/productCode';
import { ValidationError, ConflictError, NotFoundError } from '@utils/errors';
import {
  assertSufficientStock,
  computeHeaderTotals,
  computeSequentialSnapshots,
  diffLines,
  type PackageBalance,
} from '@utils/warehouseSlipLines';

/** Prisma client or an interactive-transaction client. */
type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

/** One commodity line of a receipt. */
export interface ReceiptLineInput {
  /** Stored line id — present only when updating an existing line. */
  id?: string | null;
  /** Target package. When absent it is resolved (or created) from `lotId` + `tenSanPham`. */
  lotProductId?: string | null;
  tenSanPham: string;
  donViTinh?: string;
  warehouseId: string;
  tenKho?: string;
  lotId: string;
  tenLo?: string;
  /** Requested quantity; defaults to the actual quantity when the caller has no separate figure. */
  soLuongYeuCau?: number;
  soLuongThucTe: number;
  ghiChu?: string;
  /** Product category used only when a new `InternationalProduct` has to be created. */
  loaiSanPham?: string;
}

export interface CreateReceiptInput {
  /** Slip code. Generated once when omitted — never per line. */
  maPhieuNhap?: string;
  employeeId: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  ngayNhap?: Date | string;
  mucDich?: string;
  ghiChu?: string;
  supplyRequestId?: string;
  items: ReceiptLineInput[];
}

export interface UpdateReceiptInput {
  ngayNhap?: Date | string;
  mucDich?: string;
  ghiChu?: string;
  items: ReceiptLineInput[];
}

/**
 * @deprecated Flat single-commodity payload. Kept so the HTTP layer and
 * `finishedProductService` keep compiling until they are migrated to the nested
 * shape (tasks 7.x and 10.x). New callers must pass `items`.
 */
export interface LegacyFlatReceiptInput {
  maPhieuNhap?: string;
  employeeId?: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  warehouseId: string;
  tenKho?: string;
  lotId: string;
  tenLo?: string;
  lotProductId?: string;
  tenSanPham: string;
  soLuongNhap: number;
  donViTinh?: string;
  ghiChu?: string;
  mucDich?: string;
  supplyRequestId?: string;
  loaiSanPham?: string;
}

type CreateInput = CreateReceiptInput | LegacyFlatReceiptInput;
type UpdateInput = UpdateReceiptInput | LegacyFlatReceiptInput;

/** A line whose package is known, ready for guards and snapshots. */
interface ResolvedLine extends ReceiptLineInput {
  lotProductId: string;
  soLuongYeuCau: number;
  maKien?: string | null;
}

function isNestedInput(input: CreateInput | UpdateInput): input is CreateReceiptInput | UpdateReceiptInput {
  return Array.isArray((input as { items?: unknown }).items);
}

/** Lift a flat single-commodity payload into the header-plus-one-line shape. */
function normalizeInput(input: CreateInput | UpdateInput): CreateReceiptInput & UpdateReceiptInput {
  if (isNestedInput(input)) {
    return input as CreateReceiptInput & UpdateReceiptInput;
  }
  const flat = input as LegacyFlatReceiptInput;
  return {
    maPhieuNhap: flat.maPhieuNhap,
    employeeId: flat.employeeId ?? '',
    maNhanVien: flat.maNhanVien,
    tenNhanVien: flat.tenNhanVien,
    mucDich: flat.mucDich,
    ghiChu: flat.ghiChu,
    supplyRequestId: flat.supplyRequestId,
    items: [
      {
        lotProductId: flat.lotProductId,
        tenSanPham: flat.tenSanPham,
        donViTinh: flat.donViTinh,
        warehouseId: flat.warehouseId,
        tenKho: flat.tenKho,
        lotId: flat.lotId,
        tenLo: flat.tenLo,
        soLuongThucTe: flat.soLuongNhap,
        ghiChu: flat.ghiChu,
        loaiSanPham: flat.loaiSanPham,
      },
    ],
  };
}

class WarehouseReceiptService {
  async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.warehouseReceipt.findFirst({
      where: { maPhieuNhap: yearlyCodeWhere('PN', year) },
      orderBy: { maPhieuNhap: 'desc' },
      select: { maPhieuNhap: true },
    });
    return nextYearlyCode(last?.maPhieuNhap ?? null, 'PN', year);
  }

  // ─── Line helpers ───────────────────────────────────────────────────────────

  /** Reject an empty line array and any non-positive actual quantity, before any write. */
  private assertLinesPresent(items: ReceiptLineInput[] | undefined): ReceiptLineInput[] {
    if (!items || items.length === 0) {
      throw new ValidationError('Phiếu nhập kho phải có ít nhất một mặt hàng');
    }
    items.forEach((line, index) => {
      const quantity = Number(line.soLuongThucTe);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ValidationError(`Số lượng thực nhập của dòng ${index + 1} phải lớn hơn 0`);
      }
      if (!line.lotId && !line.lotProductId) {
        throw new ValidationError(`Dòng ${index + 1} thiếu thông tin lô hoặc kiện hàng`);
      }
    });
    return items;
  }

  /**
   * Resolve every line's package inside the caller's transaction, creating the
   * package when the line only names a commodity.
   */
  private async resolveLines(client: PrismaClientLike, items: ReceiptLineInput[]): Promise<ResolvedLine[]> {
    const resolved: ResolvedLine[] = [];
    for (const line of items) {
      const quantity = Number(line.soLuongThucTe);
      let lotProductId = line.lotProductId ?? undefined;
      let maKien: string | null | undefined;
      if (!lotProductId) {
        const target = await this.resolveOrCreateLotProduct(
          line.lotId,
          line.tenSanPham,
          line.donViTinh,
          line.loaiSanPham,
          client
        );
        lotProductId = target.id;
        maKien = target.maKien;
      } else {
        const target = await client.lotProduct.findUnique({ where: { id: lotProductId }, select: { maKien: true } });
        maKien = target?.maKien ?? null;
      }
      resolved.push({
        ...line,
        lotProductId,
        soLuongThucTe: quantity,
        soLuongYeuCau: Number(line.soLuongYeuCau ?? quantity),
        maKien: maKien ?? null,
      });
    }
    return resolved;
  }

  /** Load current balances for every package the operation touches, inside the transaction. */
  private async loadBalances(
    client: PrismaClientLike,
    lotProductIds: string[]
  ): Promise<Map<string, PackageBalance>> {
    const ids = [...new Set(lotProductIds)];
    if (ids.length === 0) return new Map();

    const rows = await client.lotProduct.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        soLuong: true,
        donViTinh: true,
        internationalProduct: { select: { tenSanPham: true } },
      },
    });

    const balances = new Map<string, PackageBalance>();
    for (const row of rows) {
      balances.set(row.id, {
        soLuong: row.soLuong,
        donViTinh: row.donViTinh,
        tenSanPham: row.internationalProduct?.tenSanPham,
      });
    }
    return balances;
  }

  /** Sum actual quantity per package across a line set. */
  private sumByPackage(lines: Array<{ lotProductId: string; soLuongThucTe: number }>): Map<string, number> {
    const totals = new Map<string, number>();
    for (const line of lines) {
      totals.set(line.lotProductId, (totals.get(line.lotProductId) ?? 0) + line.soLuongThucTe);
    }
    return totals;
  }

  /**
   * Deprecated header columns mirror the first line so a not-yet-migrated reader
   * degrades to a coherent single-commodity view instead of reading `null`.
   * The header totals carry the truth for multi-line slips.
   */
  private mirrorFirstLine(line: { lotProductId: string; soLuongTruoc: number; soLuongSau: number } & ResolvedLine) {
    return {
      warehouseId: line.warehouseId,
      tenKho: line.tenKho ?? '',
      lotId: line.lotId,
      tenLo: line.tenLo ?? '',
      lotProductId: line.lotProductId,
      tenSanPham: line.tenSanPham,
      donViTinh: line.donViTinh ?? '',
      soLuongTruoc: line.soLuongTruoc,
      soLuongNhap: line.soLuongThucTe,
      soLuongSau: line.soLuongSau,
    };
  }

  private lineData(
    line: ResolvedLine & { soLuongTruoc: number; soLuongSau: number },
    stt: number
  ) {
    return {
      stt,
      lotProductId: line.lotProductId,
      maKien: line.maKien ?? null,
      tenSanPham: line.tenSanPham,
      donViTinh: line.donViTinh ?? '',
      warehouseId: line.warehouseId,
      tenKho: line.tenKho ?? '',
      lotId: line.lotId,
      tenLo: line.tenLo ?? '',
      soLuongYeuCau: line.soLuongYeuCau,
      soLuongThucTe: line.soLuongThucTe,
      soLuongTruoc: line.soLuongTruoc,
      soLuongSau: line.soLuongSau,
      ghiChu: line.ghiChu,
    };
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  async getAll() {
    const receipts = await prisma.warehouseReceipt.findMany({
      orderBy: { createdAt: 'desc' },
      // Lines are part of the list contract: the list table renders one row per
      // commodity line, so omitting them silently hides every line but the first.
      include: { items: { orderBy: { stt: 'asc' } } },
    });
    return receipts.map((r) => ({
      ...r,
      isLocked: !!r.supplyRequestId,
    }));
  }

  async getById(id: string) {
    const receipt = await prisma.warehouseReceipt.findUnique({
      where: { id },
      include: { items: { orderBy: { stt: 'asc' } } },
    });
    if (!receipt) {
      throw new NotFoundError('Không tìm thấy phiếu nhập kho');
    }
    return { ...receipt, isLocked: !!receipt.supplyRequestId };
  }

  async getByLotProduct(lotProductId: string) {
    const lotProduct = await prisma.lotProduct.findUnique({ where: { id: lotProductId } });
    if (!lotProduct) {
      throw new NotFoundError('Không tìm thấy sản phẩm trong lô');
    }

    const lines = await prisma.warehouseReceiptItem.findMany({
      where: { lotProductId },
      orderBy: [{ receipt: { ngayNhap: 'asc' } }, { stt: 'asc' }],
      select: {
        id: true,
        soLuongThucTe: true,
        soLuongTruoc: true,
        soLuongSau: true,
        donViTinh: true,
        ghiChu: true,
        receipt: {
          select: {
            id: true,
            maPhieuNhap: true,
            ngayNhap: true,
            maNhanVien: true,
            tenNhanVien: true,
            mucDich: true,
          },
        },
      },
    });

    return lines.map((line) => ({
      id: line.receipt.id,
      itemId: line.id,
      maPhieuNhap: line.receipt.maPhieuNhap,
      ngayNhap: line.receipt.ngayNhap,
      maNhanVien: line.receipt.maNhanVien,
      tenNhanVien: line.receipt.tenNhanVien,
      mucDich: line.receipt.mucDich,
      soLuongNhap: line.soLuongThucTe,
      soLuongTruoc: line.soLuongTruoc,
      soLuongSau: line.soLuongSau,
      donViTinh: line.donViTinh,
      ghiChu: line.ghiChu,
    }));
  }

  // ─── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Create one slip carrying N commodity lines. Exactly one code is generated
   * regardless of line count; header, lines, and stock updates all land in one
   * transaction, with snapshots chained per package by the shared engine.
   */
  async create(input: CreateInput) {
    const normalized = normalizeInput(input);
    const items = this.assertLinesPresent(normalized.items);

    // One code per slip (D8) — generated once, outside the per-line path.
    const maPhieuNhap = normalized.maPhieuNhap ?? (await this.generateCode());

    return prisma.$transaction(async (tx) => {
      return this.createWithClient(normalized, items, maPhieuNhap, tx);
    });
  }

  /** Internal: create using an existing transaction client (for atomic receiveSplit). */
  async createWithClient(
    normalized: CreateReceiptInput & UpdateReceiptInput & { employeeId: string },
    items: ReceiptLineInput[],
    maPhieuNhap: string,
    tx: Prisma.TransactionClient,
  ) {
    const resolved = await this.resolveLines(tx, items);
    const balances = await this.loadBalances(
      tx,
      resolved.map((line) => line.lotProductId)
    );

    const { lines, closingBalances } = computeSequentialSnapshots(resolved, balances, 'IN');
    const totals = computeHeaderTotals(lines);

    const receipt = await tx.warehouseReceipt.create({
      data: {
        maPhieuNhap,
        employeeId: normalized.employeeId,
        maNhanVien: normalized.maNhanVien ?? '',
        tenNhanVien: normalized.tenNhanVien ?? '',
        ...(normalized.ngayNhap ? { ngayNhap: new Date(normalized.ngayNhap) } : {}),
        mucDich: normalized.mucDich,
        ghiChu: normalized.ghiChu,
        ...(normalized.supplyRequestId ? { supplyRequestId: normalized.supplyRequestId } : {}),
        ...totals,
        ...this.mirrorFirstLine(lines[0]),
        items: {
          create: lines.map((line, index) => this.lineData(line, index + 1)),
        },
      },
      include: { items: { orderBy: { stt: 'asc' } } },
    });

    for (const [id, soLuong] of closingBalances) {
      await tx.lotProduct.update({ where: { id }, data: { soLuong } });
    }

    return { ...receipt, isLocked: !!receipt.supplyRequestId };
  }

  /**
   * Update a slip as a line diff: stored lines are reversed, incoming lines are
   * applied. Every negative-stock guard runs across the fully-resolved diff
   * before the first write, then snapshots recompute sequentially.
   */
  async update(id: string, input: UpdateInput) {
    const existing = await prisma.warehouseReceipt.findUnique({
      where: { id },
      include: { items: { orderBy: { stt: 'asc' } } },
    });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy phiếu nhập kho');
    }

    // Lock lives on the header: a supply-request-linked slip is immutable.
    if (existing.supplyRequestId) {
      throw new ConflictError('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
    }

    const normalized = normalizeInput(input);
    const items = this.assertLinesPresent(normalized.items);
    const stored = existing.items ?? [];

    return prisma.$transaction(async (tx) => {
      const incoming = await this.resolveLines(tx, items);
      const diff = diffLines(stored, incoming);

      // Every stored line is reversed: removed ones permanently, matched ones
      // before their incoming replacement is applied (possibly on another package).
      const reversals = this.sumByPackage(stored);
      const balances = await this.loadBalances(tx, [
        ...stored.map((line) => line.lotProductId),
        ...incoming.map((line) => line.lotProductId),
      ]);

      // Guard the whole resolved diff before writing anything.
      assertSufficientStock(reversals, balances);

      const afterReversal = new Map<string, PackageBalance>();
      for (const [lotProductId, balance] of balances) {
        afterReversal.set(lotProductId, {
          ...balance,
          soLuong: balance.soLuong - (reversals.get(lotProductId) ?? 0),
        });
      }

      const { lines, closingBalances } = computeSequentialSnapshots(incoming, afterReversal, 'IN');
      const totals = computeHeaderTotals(lines);

      if (diff.removed.length > 0) {
        await tx.warehouseReceiptItem.deleteMany({
          where: { id: { in: diff.removed.map((line) => line.id) } },
        });
      }

      const storedIds = new Set(stored.map((line) => line.id));
      for (const [index, line] of lines.entries()) {
        const data = this.lineData(line, index + 1);
        if (line.id && storedIds.has(line.id)) {
          await tx.warehouseReceiptItem.update({ where: { id: line.id }, data });
        } else {
          await tx.warehouseReceiptItem.create({ data: { ...data, receiptId: id } });
        }
      }

      // A package touched only by a reversal settles at its post-reversal balance.
      for (const [lotProductId, balance] of afterReversal) {
        const soLuong = closingBalances.get(lotProductId) ?? balance.soLuong;
        await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong } });
      }

      const updated = await tx.warehouseReceipt.update({
        where: { id },
        data: {
          ...(normalized.ngayNhap ? { ngayNhap: new Date(normalized.ngayNhap) } : {}),
          mucDich: normalized.mucDich,
          ghiChu: normalized.ghiChu,
          ...totals,
          ...this.mirrorFirstLine(lines[0]),
        },
        include: { items: { orderBy: { stt: 'asc' } } },
      });

      return { ...updated, isLocked: !!updated.supplyRequestId };
    });
  }

  /**
   * Delete a slip, reversing every line against its own package. Shared packages
   * are reversed by their aggregate, and all guards run before any write.
   */
  async delete(id: string) {
    const existing = await prisma.warehouseReceipt.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy phiếu nhập kho');
    }

    if (existing.supplyRequestId) {
      throw new ConflictError('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
    }

    const stored = existing.items ?? [];

    return prisma.$transaction(async (tx) => {
      if (stored.length > 0) {
        const reversals = this.sumByPackage(stored);
        const balances = await this.loadBalances(
          tx,
          stored.map((line) => line.lotProductId)
        );

        // Guard every package before the first stock write.
        assertSufficientStock(reversals, balances);

        for (const [lotProductId, quantity] of reversals) {
          const balance = balances.get(lotProductId)!;
          await tx.lotProduct.update({
            where: { id: lotProductId },
            data: { soLuong: balance.soLuong - quantity },
          });
        }
      }

      // Lines are removed by cascade.
      await tx.warehouseReceipt.delete({ where: { id } });

      return { id };
    });
  }

  /**
   * @deprecated Superseded by multi-line `create()`. Kept as a thin compatibility
   * wrapper: flat rows are grouped by the code they carry, so one slip is created
   * per distinct `maPhieuNhap` (rows without a code become a single slip).
   * Callers (`finishedProductService`, `warehouseReceiptController`) are migrated
   * in tasks 7.x and 10.x, after which this method goes away.
   */
  async batchCreate(items: LegacyFlatReceiptInput[], supplyRequestId?: string) {
    const usable = (items ?? []).filter(
      (item) => item.warehouseId && item.lotId && item.tenSanPham && item.soLuongNhap !== undefined
    );
    if (usable.length === 0) return [];

    const groups = new Map<string, LegacyFlatReceiptInput[]>();
    for (const item of usable) {
      const key = item.maPhieuNhap ?? '__generated__';
      const bucket = groups.get(key);
      if (bucket) bucket.push(item);
      else groups.set(key, [item]);
    }

    const results = [];
    for (const [key, rows] of groups) {
      const head = rows[0];
      const created = await this.create({
        maPhieuNhap: key === '__generated__' ? undefined : key,
        employeeId: head.employeeId ?? '',
        maNhanVien: head.maNhanVien,
        tenNhanVien: head.tenNhanVien,
        mucDich: head.mucDich,
        ghiChu: head.ghiChu,
        supplyRequestId: supplyRequestId ?? head.supplyRequestId,
        items: rows.map((row) => ({
          lotProductId: row.lotProductId,
          tenSanPham: row.tenSanPham,
          donViTinh: row.donViTinh,
          warehouseId: row.warehouseId,
          tenKho: row.tenKho,
          lotId: row.lotId,
          tenLo: row.tenLo,
          soLuongThucTe: row.soLuongNhap,
          ghiChu: row.ghiChu,
          loaiSanPham: row.loaiSanPham,
        })),
      });
      results.push(created);
    }

    return results;
  }

  /**
   * Resolve — or create — the package a line targets.
   *
   * `client` lets the caller keep this inside its own transaction; without it the
   * package would be created on the global client and survive a rolled-back slip.
   */
  async resolveOrCreateLotProduct(
    lotId: string,
    tenSanPham: string,
    donViTinh?: string,
    loaiSanPham?: string,
    client: PrismaClientLike = prisma
  ) {
    const db = client;

    let product = await db.internationalProduct.findFirst({
      where: { tenSanPham: { equals: tenSanPham, mode: 'insensitive' } },
    });

    if (!product) {
      // Codes follow LOAI-STT-TENVIETTAT, and the prefix is derived from the category.
      // Both callers pass one, but the parameter is optional — rather than invent a
      // category that is not in the standard list (which is what produced the current
      // Nguyên liệu / Nguyên vật liệu drift), mark it explicitly so it shows up as
      // needing review instead of hiding inside a plausible-looking category.
      const resolvedLoai = loaiSanPham || UNCLASSIFIED_CATEGORY;
      const maSanPham = await suggestAvailableProductCodeFor(db, {
        tenSanPham,
        loaiSanPham: resolvedLoai,
      });
      product = await db.internationalProduct.create({
        data: { maSanPham, tenSanPham, donViTinh, loaiSanPham: resolvedLoai },
      });
    }

    const lot = await db.lot.findUnique({ where: { id: lotId } });

    // Baseline lot (CAD floor plan): fill the first free fixed kiện (product not yet
    // set, soLuong 0), so receipts land in the pre-created pallet (code = slot code).
    if (lot?.zone) {
      const freeKiện = await db.lotProduct.findFirst({
        where: { lotId, slotId: { not: null }, soLuong: 0, internationalProductId: null },
        orderBy: { maKien: 'asc' },
      });
      if (freeKiện) {
        const updated = await db.lotProduct.update({
          where: { id: freeKiện.id },
          data: {
            internationalProductId: product.id,
            donViTinh: donViTinh || product.donViTinh || freeKiện.donViTinh,
          },
        });
        return { id: updated.id, soLuong: updated.soLuong, maKien: updated.maKien };
      }
      // all fixed kiện busy → fall through to create an ad-hoc (overflow) kiện.
    }

    let lotProduct = await db.lotProduct.findFirst({
      where: { lotId, internationalProductId: product.id },
    });

    if (lotProduct) {
      return { id: lotProduct.id, soLuong: lotProduct.soLuong, maKien: lotProduct.maKien };
    }

    lotProduct = await db.lotProduct.create({
      data: {
        lotId,
        internationalProductId: product.id,
        soLuong: 0,
        donViTinh: donViTinh || product.donViTinh || 'Kg',
      },
    });
    // Auto-generate maKien from lot tenLo + last 4 chars of id
    const autoMaKien = `${lot?.tenLo ?? lotId.slice(-4)}-${lotProduct.id.slice(-4)}`;
    lotProduct = await db.lotProduct.update({
      where: { id: lotProduct.id },
      data: { maKien: autoMaKien },
    });
    return { id: lotProduct.id, soLuong: 0, maKien: lotProduct.maKien };
  }
}

export default new WarehouseReceiptService();
