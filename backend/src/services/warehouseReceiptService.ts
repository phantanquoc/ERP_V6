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
  soLoKeHoach?: string;
  soLoThucTe?: string;
  soKienKeHoach?: string[] | string;
  soKienThucTe?: string[] | string;
  tinhTrang?: string;
  quyCach?: string;
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
  nguoiDeNghi?: string;
  maNguoiDeNghi?: string;
  boPhan?: string;
  boPhanId?: string;
  items: ReceiptLineInput[];
}

export interface UpdateReceiptInput {
  ngayNhap?: Date | string;
  mucDich?: string;
  ghiChu?: string;
  nguoiDeNghi?: string;
  maNguoiDeNghi?: string;
  boPhan?: string;
  boPhanId?: string;
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
        const target = await client.lotProduct.findUnique({
          where: { id: lotProductId },
          select: {
            maKien: true,
            lotId: true,
            internationalProductId: true,
            donViTinh: true,
            lot: { select: { warehouseId: true } },
          },
        });
        if (!target) {
          throw new ValidationError(`Không tìm thấy kiện hàng của dòng "${line.tenSanPham}"`);
        }
        // Cross-check the declared lot/warehouse against the package's real
        // location — a repointed line must not keep stale lot/warehouse values.
        if (line.lotId && target.lotId !== line.lotId) {
          throw new ValidationError(`Kiện hàng không thuộc lô đã chọn (dòng "${line.tenSanPham}")`);
        }
        if (line.warehouseId && target.lot?.warehouseId && target.lot.warehouseId !== line.warehouseId) {
          throw new ValidationError(`Kiện hàng không thuộc kho đã chọn (dòng "${line.tenSanPham}")`);
        }
        maKien = target.maKien ?? null;
        // A pre-created fixed kiện (CAD layout) carries no product until goods
        // land in it. When a line targets such a kiện by id, link the commodity
        // now — otherwise the pallet holds stock while every view that joins
        // through `internationalProduct` renders it as "?" and issue flows that
        // select by product can never find it (PN-2026-021 regression).
        if (target.internationalProductId == null && line.tenSanPham?.trim()) {
          await this.attachProductToEmptyKien(client, lotProductId, target.donViTinh, line);
        }
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
   * Preserve the informational PLAN fields (soLuongYeuCau, soLoKeHoach, soKienKeHoach)
   * from the stored line when the update payload omits them. Kế hoạch is reference-only
   * ("kế hoạch chỉ để nắm thông tin") — an actual-only edit must not wipe it. Only fills
   * fields the caller left undefined; a value the caller explicitly sends always wins.
   */
  private preserveStoredFields(items: ReceiptLineInput[], stored: Array<Record<string, any>>): void {
    const byId = new Map(stored.map((l) => [l.id, l]));
    for (const line of items) {
      if (!line.id) continue;
      const old = byId.get(line.id);
      if (!old) continue;
      if (line.soLuongYeuCau === undefined) line.soLuongYeuCau = old.soLuongYeuCau ?? undefined;
      if (line.soLoKeHoach === undefined) line.soLoKeHoach = old.soLoKeHoach ?? undefined;
      if (line.soKienKeHoach === undefined) line.soKienKeHoach = old.soKienKeHoach ?? undefined;
    }
  }

  /**
   * `maKien` is a snapshot of `LotProduct.maKien` taken when the line was written.
   * Re-resolving it from the package on every update would silently rewrite that
   * history if the package was relabeled in the meantime. For lines that stay on
   * the same package, keep the stored snapshot; only repointed lines (and rows
   * that never had a snapshot) carry the freshly resolved code.
   */
  private preserveStoredMaKien(incoming: ResolvedLine[], stored: Array<Record<string, any>>): void {
    const byId = new Map(stored.map((l) => [l.id, l]));
    for (const line of incoming) {
      if (!line.id) continue;
      const old = byId.get(line.id);
      if (!old) continue;
      if (old.lotProductId !== line.lotProductId) continue;
      if (old.maKien != null) line.maKien = old.maKien;
    }
  }

  private async fillHeaderFromSupplyRequest(client: PrismaClientLike, normalized: CreateReceiptInput & UpdateReceiptInput & { employeeId: string }) {
    if (!normalized.supplyRequestId) return;
    if (normalized.nguoiDeNghi && normalized.boPhan) return;
    try {
      const sr = await (client as any).supplyRequest?.findUnique?.({ where: { id: normalized.supplyRequestId }, select: { tenNhanVien: true, boPhan: true } });
      if (sr) {
        if (!normalized.nguoiDeNghi && sr.tenNhanVien) (normalized as any).nguoiDeNghi = sr.tenNhanVien;
        if (!normalized.boPhan && sr.boPhan) (normalized as any).boPhan = sr.boPhan;
      }
    } catch {}
  }

  private async deriveSoLoThucTeFromKien(client: PrismaClientLike, items: ReceiptLineInput[]) {
    for (const line of items) {
      const kienArr = line.soKienThucTe;
      if (!line.soLoThucTe && kienArr && Array.isArray(kienArr) && kienArr.length > 0) {
        try {
          // Scope by lotId: maKien is only unique within a lot (@@unique([lotId, maKien])),
          // baseline lots all reuse K1.1… so a global lookup can join the wrong lot's name.
          const kienRows = await client.lotProduct.findMany({
            where: { ...(line.lotId ? { lotId: line.lotId } : {}), maKien: { in: kienArr } },
            select: { lot: { select: { tenLo: true } } },
          });
          const lots = [...new Set(kienRows.map((r: any) => r.lot?.tenLo).filter(Boolean))];
          if (lots.length > 0) line.soLoThucTe = lots.join(', ');
        } catch {}
      }
    }
  }

  private async expandGroupedLines(client: PrismaClientLike, items: ReceiptLineInput[]): Promise<ReceiptLineInput[]> {
    const expanded: ReceiptLineInput[] = [];
    for (const line of items) {
      const kienThucTe = line.soKienThucTe;
      if (!Array.isArray(kienThucTe) || kienThucTe.length <= 1) {
        expanded.push(line);
        continue;
      }
      // Grouped payload: one logical row with many kien -> expand to per-kien rows.
      // Kien lookup is scoped by lotId (maKien repeats across baseline lots).
      const kienRows = await client.lotProduct.findMany({
        where: { ...(line.lotId ? { lotId: line.lotId } : {}), maKien: { in: kienThucTe } },
        select: { id: true, maKien: true, lotId: true, lot: { select: { tenLo: true } } },
      });
      const byMaKien = new Map(kienRows.map((r: any) => [r.maKien, r]));
      const missing = kienThucTe.filter((m) => !byMaKien.has(m));
      if (missing.length > 0) {
        // Never fall back to pushing the original line here: mixing per-kien
        // sub-lines with the full-quantity original double-counts stock.
        throw new ValidationError(
          `Không tìm thấy kiện "${missing.join(', ')}" trong lô — kiểm tra lại mã kiện`
        );
      }
      const n = kienThucTe.length;
      const perKienQty = line.soLuongThucTe / n;
      // Split the plan quantity too, otherwise report totals multiply it by N.
      const planQty = line.soLuongYeuCau != null ? Number(line.soLuongYeuCau) / n : undefined;
      for (const maKien of kienThucTe) {
        const lp = byMaKien.get(maKien)!;
        expanded.push({
          ...line,
          lotProductId: lp.id,
          lotId: lp.lotId,
          tenLo: (lp as any).lot?.tenLo ?? line.tenLo,
          soKienThucTe: [maKien],
          soLuongThucTe: perKienQty,
          ...(planQty !== undefined ? { soLuongYeuCau: planQty } : {}),
        });
      }
    }
    return expanded;
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
    const toJson = (v: string[] | string | undefined): string | null => {
      if (v === undefined || v === null) return null;
      if (Array.isArray(v)) return JSON.stringify(v);
      return v;
    };
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
      soLoKeHoach: (line as ReceiptLineInput).soLoKeHoach ?? null,
      soLoThucTe: (line as ReceiptLineInput).soLoThucTe ?? null,
      soKienKeHoach: toJson((line as ReceiptLineInput).soKienKeHoach as string[] | string | undefined),
      soKienThucTe: toJson((line as ReceiptLineInput).soKienThucTe as string[] | string | undefined),
      tinhTrang: (line as ReceiptLineInput).tinhTrang ?? null,
      quyCach: (line as ReceiptLineInput).quyCach ?? null,
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
    await this.fillHeaderFromSupplyRequest(tx, normalized);
    await this.deriveSoLoThucTeFromKien(tx, items);
    const expandedItems = await this.expandGroupedLines(tx, items);
    const effective = expandedItems.length !== items.length ? expandedItems : items;
    const resolved = await this.resolveLines(tx, effective);
    const balances = await this.loadBalances(
      tx,
      resolved.map((line) => line.lotProductId)
    );

    const { lines } = computeSequentialSnapshots(resolved, balances, 'IN');
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
        ...(normalized.nguoiDeNghi ? { nguoiDeNghi: normalized.nguoiDeNghi } : {}),
        ...(normalized.maNguoiDeNghi ? { maNguoiDeNghi: normalized.maNguoiDeNghi } : {}),
        ...(normalized.boPhan ? { boPhan: normalized.boPhan } : {}),
        ...(normalized.boPhanId ? { boPhanId: normalized.boPhanId } : {}),
        ...totals,
        ...this.mirrorFirstLine(lines[0]),
        items: {
          create: lines.map((line, index) => this.lineData(line, index + 1)),
        },
      },
      include: { items: { orderBy: { stt: 'asc' } } },
    });

    // 2.1 atomic increment per package; overflow guard remains via computeSequentialSnapshots
    const totalsByPackage = this.sumByPackage(resolved);
    for (const [lotProductId, qty] of totalsByPackage) {
      await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong: { increment: qty } } });
    }

    return { ...receipt, isLocked: !!receipt.supplyRequestId };
  }

  /**
   * Update a slip as a line diff: stored lines are reversed, incoming lines are
   * applied. Every negative-stock guard runs across the fully-resolved diff
   * before the first write, then snapshots recompute sequentially.
   */
  async update(id: string, input: UpdateInput) {
    const normalized = normalizeInput(input);
    const items = this.assertLinesPresent(normalized.items);

    return prisma.$transaction(async (tx) => {
      // Serialize concurrent update/delete on this slip: the row lock stops a
      // lost-update where two sessions both reverse the same stored lines from a
      // stale snapshot. `existing` is re-read inside the transaction so reversals
      // always reflect the latest committed state.
      await tx.$queryRaw`SELECT id FROM business.warehouse_receipts WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.warehouseReceipt.findUnique({
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

      const stored = existing.items ?? [];
      // An actual-only edit must not wipe the informational plan columns.
      this.preserveStoredFields(items, stored);

      const incoming = await this.resolveLines(tx, items);
      // Preserve the stored maKien snapshot: the same-lot re-resolve above may have
      // refetched a changed master code, but the line's history must stay immutable
      // unless the line was truly repointed to a different package.
      this.preserveStoredMaKien(incoming, stored);
      const diff = diffLines(stored, incoming);

      // Every stored line is reversed: removed ones permanently, matched ones
      // before their incoming replacement is applied (possibly on another package).
      const reversals = this.sumByPackage(stored);
      const balances = await this.loadBalances(tx, [
        ...stored.map((line) => line.lotProductId),
        ...incoming.map((line) => line.lotProductId),
      ]);

      // Guard the NET delta before writing anything. A package only needs enough
      // stock to cover a NET removal — part of the reversed stock may already have
      // flowed out through later issues, so demanding the full reversal would reject
      // a legitimate down-edit. The affected-rows check in the write loop below is
      // the DB-level second defence.
      const incomingByPackage = this.sumByPackage(incoming);
      for (const [lotProductId, reversal] of reversals) {
        const netIn = (incomingByPackage.get(lotProductId) ?? 0) - reversal;
        if (netIn >= 0) continue;
        const balance = balances.get(lotProductId);
        if (!balance) {
          throw new ValidationError(`Không tìm thấy kiện hàng ${lotProductId} trong kho`);
        }
        if (balance.soLuong + netIn < 0) {
          throw new ValidationError(
            `Số lượng tồn kho của ${balance.tenSanPham ? `"${balance.tenSanPham}"` : `kiện ${lotProductId}`} không đủ để điều chỉnh`
          );
        }
      }

      const afterReversal = new Map<string, PackageBalance>();
      for (const [lotProductId, balance] of balances) {
        afterReversal.set(lotProductId, {
          ...balance,
          soLuong: balance.soLuong - (reversals.get(lotProductId) ?? 0),
        });
      }

      const { lines } = computeSequentialSnapshots(incoming, afterReversal, 'IN');
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

      // Atomic net stock delta per package: incoming increments, reversals decrement.
      // The net-delta guard above plus the affected-rows check below keep stock >= 0.
      for (const [lotProductId, balance] of afterReversal) {
        const incoming = incomingByPackage.get(lotProductId) ?? 0;
        const reversal = reversals.get(lotProductId) ?? 0;
        const netIn = incoming - reversal; // >0 adds stock, <0 removes stock
        if (netIn > 0) {
          await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong: { increment: netIn } } });
        } else if (netIn < 0) {
          const res = await tx.lotProduct.updateMany({
            where: { id: lotProductId, soLuong: { gte: -netIn } },
            data: { soLuong: { decrement: -netIn } },
          });
          if (res.count === 0) {
            throw new ValidationError(
              `Số lượng tồn kho của ${balance.tenSanPham ? `"${balance.tenSanPham}"` : `kiện ${lotProductId}`} không đủ`
            );
          }
        }
      }
      // Packages appearing only in incoming (not covered by afterReversal map).
      for (const [lotProductId, incoming] of incomingByPackage) {
        if (afterReversal.has(lotProductId)) continue;
        await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong: { increment: incoming } } });
      }

      const updated = await tx.warehouseReceipt.update({
        where: { id },
        data: {
          ...(normalized.ngayNhap ? { ngayNhap: new Date(normalized.ngayNhap) } : {}),
          mucDich: normalized.mucDich,
          ghiChu: normalized.ghiChu,
          ...(normalized.nguoiDeNghi !== undefined ? { nguoiDeNghi: normalized.nguoiDeNghi } : {}),
          ...(normalized.maNguoiDeNghi !== undefined ? { maNguoiDeNghi: normalized.maNguoiDeNghi } : {}),
          ...(normalized.boPhan !== undefined ? { boPhan: normalized.boPhan } : {}),
          ...(normalized.boPhanId !== undefined ? { boPhanId: normalized.boPhanId } : {}),
          ...totals,
          ...this.mirrorFirstLine(lines[0]),
        },
        include: { items: { orderBy: { stt: 'asc' } } },
      });

      return { ...updated, isLocked: !!updated.supplyRequestId };
    });
  }

  async markPrinted(id: string) {
    const existing = await prisma.warehouseReceipt.findUnique({ where: { id }, select: { id: true, daIn: true } });
    if (!existing) throw new NotFoundError('Không tìm thấy phiếu nhập kho');
    if (existing.daIn) return existing;
    return prisma.warehouseReceipt.update({ where: { id }, data: { daIn: true, inLanDauAt: new Date() } });
  }

  /**
   * Delete a slip, reversing every line against its own package. Shared packages
   * are reversed by their aggregate, and all guards run before any write.
   */
  async delete(id: string) {
    return prisma.$transaction(async (tx) => {
      // Serialize with concurrent update/delete on this slip (see update()).
      await tx.$queryRaw`SELECT id FROM business.warehouse_receipts WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.warehouseReceipt.findUnique({
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

      if (stored.length > 0) {
        const reversals = this.sumByPackage(stored);
        const balances = await this.loadBalances(
          tx,
          stored.map((line) => line.lotProductId)
        );

        // Guard every package before the first stock write.
        assertSufficientStock(reversals, balances);

        // Atomic decrement with affected-rows check; guards above are the second defence.
        for (const [lotProductId, quantity] of reversals) {
          const res = await tx.lotProduct.updateMany({
            where: { id: lotProductId, soLuong: { gte: quantity } },
            data: { soLuong: { decrement: quantity } },
          });
          if (res.count === 0) {
            const balance = balances.get(lotProductId);
            throw new ValidationError(
              `Số lượng tồn kho của ${balance?.tenSanPham ? `"${balance.tenSanPham}"` : `kiện ${lotProductId}`} không đủ`
            );
          }
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
   *
   * Idempotence (task 2.2): both creates are upsert-or-catch-P2002-retry —
   * concurrent receipts carrying the same new `tenSanPham` race to `create`,
   * the loser catches the unique violation (`P2002`) and re-reads the winner's
   * row instead of duplicating catalog rows. The app-level `findFirst` by
   * case-insensitive name remains the fast path.
   */
  async resolveOrCreateLotProduct(
    lotId: string,
    tenSanPham: string,
    donViTinh?: string,
    loaiSanPham?: string,
    client: PrismaClientLike = prisma
  ) {
    const db = client;

    const product = await this.resolveOrCreateProduct(db, tenSanPham, donViTinh, loaiSanPham);

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

    try {
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
    } catch (err) {
      // P2002 on the ad-hoc partial unique index (lotId, internationalProductId
      // WHERE slotId IS NULL): a concurrent resolver created the same package.
      // Re-read the winner's row and use it.
      if (isUniqueViolation(err)) {
        lotProduct = await db.lotProduct.findFirst({
          where: { lotId, internationalProductId: product.id },
        });
        if (lotProduct) {
          return { id: lotProduct.id, soLuong: lotProduct.soLuong, maKien: lotProduct.maKien };
        }
      }
      throw err;
    }
  }

  /**
   * Find an `InternationalProduct` by name (case-insensitive) or create it with
   * a generated code. Shared by `resolveOrCreateLotProduct` and the empty-kiện
   * link so both commodity-attach paths resolve the catalog row identically.
   */
  private async resolveOrCreateProduct(
    db: PrismaClientLike,
    tenSanPham: string,
    donViTinh?: string,
    loaiSanPham?: string
  ) {
    const product = await db.internationalProduct.findFirst({
      where: { tenSanPham: { equals: tenSanPham, mode: 'insensitive' } },
    });
    if (product) return product;

    // Codes follow LOAI-STT-TENVIETTAT, and the prefix is derived from the category.
    // Rather than invent a category that is not in the standard list (which is what
    // produced the current Nguyên liệu / Nguyên vật liệu drift), mark it explicitly
    // so it shows up as needing review instead of hiding inside a plausible one.
    const resolvedLoai = loaiSanPham || UNCLASSIFIED_CATEGORY;
    const maSanPham = await suggestAvailableProductCodeFor(db, { tenSanPham, loaiSanPham: resolvedLoai });
    try {
      return await db.internationalProduct.create({
        data: { maSanPham, tenSanPham, donViTinh, loaiSanPham: resolvedLoai },
      });
    } catch (err) {
      // P2002: a concurrent transaction inserted the same product first — re-read
      // the winner's row, which is the canonical one.
      if (isUniqueViolation(err)) {
        const winner = await db.internationalProduct.findFirst({
          where: { tenSanPham: { equals: tenSanPham, mode: 'insensitive' } },
        });
        if (winner) return winner;
      }
      throw err;
    }
  }

  /**
   * Link the line's commodity onto an empty fixed kiện the caller selected by id.
   * Mirrors the fill step `resolveOrCreateLotProduct` runs when it picks a free
   * kiện itself, so both entry points end with the pallet carrying its product,
   * unit, and standard cost. Runs inside the caller's transaction.
   */
  private async attachProductToEmptyKien(
    client: PrismaClientLike,
    lotProductId: string,
    kienDonViTinh: string,
    line: ReceiptLineInput
  ): Promise<void> {
    const product = await this.resolveOrCreateProduct(client, line.tenSanPham, line.donViTinh, line.loaiSanPham);
    await client.lotProduct.update({
      where: { id: lotProductId },
      data: {
        internationalProductId: product.id,
        donViTinh: line.donViTinh || product.donViTinh || kienDonViTinh || '',
        // Kiện mới nhận giá chuẩn của hàng hóa thay vì giữ default DB (100000đ).
        ...(product.giaThanh != null ? { giaThanh: product.giaThanh } : {}),
      },
    });
  }
}

/** Prisma unique-constraint violation (P2002). */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === 'P2002'
  );
}

export default new WarehouseReceiptService();
