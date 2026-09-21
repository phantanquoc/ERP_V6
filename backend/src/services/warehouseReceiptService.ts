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
import { resolveSlipItems, slipItemInclude } from '@utils/warehouseSlipEnrichment';

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
  /**
   * Links the slip to the YCMH (PurchaseRequest) being received, so the received
   * quantities can be reconciled against what was actually purchased (and the SR
   * handoff can be inherited from the PR when the caller only knows the YCMH).
   */
  purchaseRequestId?: string;
  inboundPlanId?: string | null;
  /** Reason for discrepancy when actual receipt differs from inbound plan. Forwarded to InboundPlan.lyDoChenhLech; also merged into ghiChu as fallback. */
  lyDoChenhLech?: string | null;
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
  lyDoChenhLech?: string | null;
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
  lyDoChenhLech?: string | null;
  mucDich?: string;
  supplyRequestId?: string;
  purchaseRequestId?: string;
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
    purchaseRequestId: flat.purchaseRequestId,
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
   * D2: Soft validation for free-text DVT / boPhan fields (W11).
   * donViTinh / phanLoai canonically come from `common.lookups`, but older
   * slips and quick-purchase flows write new labels freely. Hard-blocking would
   * break N+2 writes, so we WARN and allow the write; callers that want a strict
   * gate can set `strict: true` to receive a ValidationError instead.
   * The lookup hit is best-effort — a cache/DB failure degrades to a warning.
   */
  private async warnIfUnknownUnit(
    client: PrismaClientLike,
    field: string,
    group: string,
    raw: string | undefined | null,
    opts: { strict?: boolean } = {}
  ): Promise<void> {
    const label = (raw ?? '').trim();
    if (!label) return;
    try {
      const hit = await (client as any).lookup?.findFirst?.({
        where: { group, label, isActive: true },
        select: { id: true },
      });
      // Fallback to global prisma if tx delegate has no lookup (older delegate shape)
      const resolved =
        hit ??
        (client !== prisma
          ? await (prisma as any).lookup.findFirst({
              where: { group, label, isActive: true },
              select: { id: true },
            })
          : null);
      if (!resolved) {
        const msg = `"${label}" chưa có trong danh mục ${group} — sẽ ghi tự do, hãy bổ sung Lookup nếu đây là ĐVT chính thức (${field})`;
        if (opts.strict) throw new ValidationError(msg);
        console.warn(`[warehouseReceipt][lookup-warn] ${msg}`);
      }
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      console.warn(`[warehouseReceipt][lookup-warn] lookup check failed for ${group}/${label}:`, e);
    }
  }

  // ĐVT là free-text có kiểm soát — giá trị chuẩn nằm trong common.lookups (DON_VI_TINH).
  // Thêm/sửa trong Cài đặt có hiệu lực ngay; không chặn cứng ở đây.
  private assertKnownUnitForLines(items: ReceiptLineInput[]): void {
    for (let i = 0; i < items.length; i++) {
      const dvt = items[i].donViTinh;
      if (dvt != null && String(dvt).trim() !== '' && String(dvt).trim().length > 50) {
        throw new ValidationError(`Đơn vị tính dòng ${i + 1} quá dài (tối đa 50 ký tự)`);
      }
    }
  }

  private async validateFreeTextFields(client: PrismaClientLike, items: ReceiptLineInput[], boPhan?: string | null): Promise<void> {
    this.assertKnownUnitForLines(items);
    for (let i = 0; i < items.length; i++) {
      const dvt = (items[i].donViTinh ?? '').trim();
      if (dvt) await this.warnIfUnknownUnit(client, `items[${i}].donViTinh`, 'DON_VI_TINH', dvt);
    }
    if (boPhan?.trim()) {
      // boPhan is sourced from SupplyRequest.boPhan — no dedicated Lookup group today,
      // so only warn on egregiously long/freeform values rather than blocking.
      if (boPhan.trim().length > 100) {
        console.warn(`[warehouseReceipt][lookup-warn] boPhan value unusually long (${boPhan.length} chars): "${boPhan.slice(0, 80)}..."`);
      }
    }
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

  private parseLyDoChenhLech(ghiChu: string | null | undefined): string | null {
    if (!ghiChu) return null;
    const m = String(ghiChu).match(/\|\s*LyDoChenhLech:\s*(.*)\s*$/);
    return m ? m[1].trim() || null : null;
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
      if (line.soLuongYeuCau === undefined || line.soLuongYeuCau === null) line.soLuongYeuCau = old.soLuongYeuCau ?? undefined;
      if (line.soLoKeHoach === undefined || line.soLoKeHoach === null) line.soLoKeHoach = old.soLoKeHoach ?? undefined;
      if (line.soKienKeHoach === undefined || line.soKienKeHoach === null) line.soKienKeHoach = old.soKienKeHoach ?? undefined;
      if ((line as any).soLoThucTe === undefined || (line as any).soLoThucTe === null) (line as any).soLoThucTe = old.soLoThucTe ?? undefined;
      if ((line as any).soKienThucTe === undefined || (line as any).soKienThucTe === null) (line as any).soKienThucTe = old.soKienThucTe ?? undefined;
      if ((line as any).tinhTrang === undefined || (line as any).tinhTrang === null) (line as any).tinhTrang = old.tinhTrang ?? undefined;
      if ((line as any).quyCach === undefined || (line as any).quyCach === null) (line as any).quyCach = old.quyCach ?? undefined;
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

  /**
   * `nguoiDeNghi` / `boPhan` describe WHO ASKED for the goods, never the thủ kho who
   * types the slip. The only authoritative source is `SupplyRequest` (YCCB) — the
   * request that started the flow. Resolution walks every linkage the slip may carry:
   *
   *   supplyRequestId                                   → SupplyRequest
   *   purchaseRequestId    → PurchaseRequest.supplyRequest
   *   inboundPlanId        → InboundPlan.purchaseRequest.supplyRequest
   *
   * A YCMH created directly by thu mua (`sourceType: REORDER/MANUAL`) has no
   * SupplyRequest, and a standalone slip has no linkage at all. In both cases the
   * fields stay EMPTY on purpose: there is no digitized "bộ phận đề nghị" to read, and
   * writing the creator's own department here is exactly the bug this guards against
   * (that is how 44 receipts ended up stamped "Quản lý kho").
   */
  private async fillHeaderFromSupplyRequest(client: PrismaClientLike, normalized: CreateReceiptInput & UpdateReceiptInput & { employeeId: string }) {
    if (normalized.nguoiDeNghi && normalized.boPhan) return;
    try {
      const srId = await this.resolveSupplyRequestId(client, normalized);
      if (!srId) return;
      const sr = await (client as any).supplyRequest?.findUnique?.({ where: { id: srId }, select: { tenNhanVien: true, boPhan: true } });
      if (sr) {
        if (!normalized.nguoiDeNghi && sr.tenNhanVien) (normalized as any).nguoiDeNghi = sr.tenNhanVien;
        if (!normalized.boPhan && sr.boPhan) (normalized as any).boPhan = sr.boPhan;
      }
    } catch {}
  }

  /**
   * Find the YCCB behind a receipt, following the YCMH / kế hoạch nhập chain when the
   * slip does not carry `supplyRequestId` directly. Read-only: it never writes the id
   * back onto the slip, because the SR linkage also acts as an edit lock and must only
   * be set after the YCMH quantity guard has passed.
   */
  private async resolveSupplyRequestId(
    client: PrismaClientLike,
    normalized: CreateReceiptInput & UpdateReceiptInput,
  ): Promise<string | null> {
    if (normalized.supplyRequestId) return normalized.supplyRequestId;

    const purchaseRequestId = (normalized as CreateReceiptInput).purchaseRequestId;
    if (purchaseRequestId) {
      const pr = await (client as any).purchaseRequest?.findUnique?.({
        where: { id: purchaseRequestId },
        select: { supplyRequestId: true },
      });
      if (pr?.supplyRequestId) return pr.supplyRequestId;
    }

    const inboundPlanId = (normalized as any).inboundPlanId as string | undefined;
    if (inboundPlanId) {
      const plan = await (client as any).inboundPlan?.findUnique?.({
        where: { id: inboundPlanId },
        select: { purchaseRequest: { select: { supplyRequestId: true } } },
      });
      if (plan?.purchaseRequest?.supplyRequestId) return plan.purchaseRequest.supplyRequestId;
    }

    return null;
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

  private static readonly SORTABLE = ['ngayNhap', 'maPhieuNhap', 'createdAt'] as const;

  private resolveOrderBy(sortBy?: string, sortOrder?: string) {
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';
    const col = (WarehouseReceiptService.SORTABLE as readonly string[]).includes(sortBy ?? '') ? sortBy! : 'createdAt';
    return { [col]: dir } as Record<string, 'asc' | 'desc'>;
  }

  async getAll(params?: {
    page?: number | string;
    limit?: number | string;
    search?: string;
    warehouseId?: string;
    fromNgay?: string;
    toNgay?: string;
    sortBy?: string;
    sortOrder?: string;
    maPhieu?: string;
    tenNhanVien?: string;
    nguoiDeNghi?: string;
    boPhan?: string;
    tinhTrang?: string;
    daIn?: string | boolean;
    includeVoided?: string | boolean;
  }) {
    const pageNum = Math.max(1, parseInt(String(params?.page ?? 1), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(params?.limit ?? 10), 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    const where: Record<string, unknown> = {};

    if (params?.warehouseId) {
      (where as any).items = { some: { warehouseId: params.warehouseId } };
    }

    // B1: server-side column filters so pagination total reflects them (FE was filtering client-side on 10 rows)
    if (params?.maPhieu?.trim()) {
      (where as any).maPhieuNhap = { contains: params.maPhieu.trim(), mode: 'insensitive' as const };
    }
    if (params?.tenNhanVien?.trim()) {
      (where as any).tenNhanVien = { contains: params.tenNhanVien.trim(), mode: 'insensitive' as const };
    }
    if (params?.nguoiDeNghi?.trim()) {
      (where as any).nguoiDeNghi = { contains: params.nguoiDeNghi.trim(), mode: 'insensitive' as const };
    }
    if (params?.boPhan?.trim()) {
      (where as any).boPhan = { contains: params.boPhan.trim(), mode: 'insensitive' as const };
    }
    if (params?.tinhTrang?.trim()) {
      const tt = params.tinhTrang.trim();
      (where as any).items = { ...(where as any).items, some: { ...(where as any).items?.some ?? {}, tinhTrang: tt } };
      // If warehouseId + tinhTrang both filter items, merge into AND so both must match (different lines may satisfy each alone)
      if (params?.warehouseId && params?.tinhTrang?.trim()) {
        (where as any).AND = [
          { items: { some: { warehouseId: params.warehouseId } } },
          { items: { some: { tinhTrang: tt } } },
        ];
        delete (where as any).items;
      }
    }
    if (params?.daIn !== undefined && params?.daIn !== null && String(params.daIn).trim() !== '') {
      const v = String(params.daIn).toLowerCase().trim();
      if (v === 'true' || v === '1') (where as any).daIn = true;
      else if (v === 'false' || v === '0') (where as any).daIn = false;
    }

    if (params?.fromNgay || params?.toNgay) {
      const range: Record<string, Date> = {};
      if (params.fromNgay) {
        const d = new Date(params.fromNgay + 'T00:00:00+07:00');
        if (!isNaN(d.getTime())) range.gte = d;
      }
      if (params.toNgay) {
        const d = new Date(params.toNgay + 'T23:59:59.999+07:00');
        if (!isNaN(d.getTime())) range.lte = d;
      }
      if (Object.keys(range).length > 0) (where as any).ngayNhap = range;
    }

    if (params?.search) {
      const s = params.search.trim();
      if (s) {
        (where as any).OR = [
          { maPhieuNhap: { contains: s, mode: 'insensitive' as const } },
          { tenNhanVien: { contains: s, mode: 'insensitive' as const } },
          { maNhanVien: { contains: s, mode: 'insensitive' as const } },
          { nguoiDeNghi: { contains: s, mode: 'insensitive' as const } },
          { boPhan: { contains: s, mode: 'insensitive' as const } },
          { items: { some: { tenSanPham: { contains: s, mode: 'insensitive' as const } } } },
          { items: { some: { maKien: { contains: s, mode: 'insensitive' as const } } } },
          { items: { some: { tenKho: { contains: s, mode: 'insensitive' as const } } } },
          { items: { some: { tenLo: { contains: s, mode: 'insensitive' as const } } } },
        ];
      }
    }

    // Soft-void filter: default show all (including voided); filter only when isVoided explicitly set
    if (params && 'isVoided' in params && (params as any).isVoided !== undefined && String((params as any).isVoided).trim() !== '') {
      const v = String((params as any).isVoided).toLowerCase().trim();
      if (v === 'true' || v === '1') (where as any).isVoided = true;
      else if (v === 'false' || v === '0') (where as any).isVoided = false;
    }

    const [receipts, total] = await Promise.all([
      prisma.warehouseReceipt.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: this.resolveOrderBy(params?.sortBy, params?.sortOrder),
        include: { items: slipItemInclude, inboundPlan: { select: { lyDoChenhLech: true } } },
      }),
      prisma.warehouseReceipt.count({ where }),
    ]);

    const data = receipts.map((r: any) => ({
      ...r,
      lyDoChenhLech: r.lyDoChenhLech ?? r.inboundPlan?.lyDoChenhLech ?? this.parseLyDoChenhLech(r.ghiChu),
      items: resolveSlipItems(r.items),
      isLocked: !!r.supplyRequestId,
    }));

    return {
      data,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getById(id: string) {
    const receipt = await prisma.warehouseReceipt.findUnique({
      where: { id },
      include: { items: slipItemInclude, inboundPlan: { select: { lyDoChenhLech: true } } },
    });
    if (!receipt) {
      throw new NotFoundError('Không tìm thấy phiếu nhập kho');
    }
    return { ...(receipt as any), lyDoChenhLech: (receipt as any).lyDoChenhLech ?? (receipt as any).inboundPlan?.lyDoChenhLech ?? this.parseLyDoChenhLech((receipt as any).ghiChu), items: resolveSlipItems((receipt as any).items), isLocked: !!receipt.supplyRequestId };
  }

  async getByLotProduct(lotProductId: string) {
    const lotProduct = await prisma.lotProduct.findUnique({ where: { id: lotProductId } });
    if (!lotProduct) {
      throw new NotFoundError('Không tìm thấy hàng hóa trong lô');
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

  /**
   * Reconcile a receipt against the YCMH (PurchaseRequest) it is receiving.
   *
   * Without this, a slip could book in goods nobody ever approved for purchase, or
   * more of a line than was bought — both silently inflate tồn kho. Comparison is by
   * normalized commodity name because PR lines store `tenHangHoa` while receipt lines
   * store `tenSanPham`, and neither is keyed to a catalog id at input time.
   */
  private async assertMatchesPurchaseRequest(
    client: PrismaClientLike,
    purchaseRequestId: string,
    normalized: CreateReceiptInput,
    effectiveItems: ReceiptLineInput[],
  ): Promise<void> {
    const pr = await client.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      select: {
        id: true,
        maYeuCau: true,
        trangThai: true,
        supplyRequestId: true,
        items: { select: { tenHangHoa: true, soLuong: true, donViTinh: true } },
      },
    });
    if (!pr) throw new NotFoundError('Không tìm thấy yêu cầu mua hàng để nhập');
    if (pr.trangThai !== 'Hoàn thành') {
      throw new ValidationError(
        `Chỉ được nhập kho cho yêu cầu mua hàng ở trạng thái "Hoàn thành" (hiện tại: ${pr.trangThai})`
      );
    }
    if (normalized.supplyRequestId && pr.supplyRequestId && normalized.supplyRequestId !== pr.supplyRequestId) {
      throw new ValidationError(
        'Yêu cầu cung cấp trên phiếu không khớp với yêu cầu cung cấp của yêu cầu mua hàng'
      );
    }

    const norm = (s: string | null | undefined): string => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

    const purchased = new Map<string, { qty: number; tenHangHoa: string; donViTinh: string }>();
    for (const line of pr.items ?? []) {
      const key = norm(line.tenHangHoa);
      if (!key) continue;
      const prev = purchased.get(key);
      purchased.set(key, {
        qty: (prev?.qty ?? 0) + Number(line.soLuong ?? 0),
        tenHangHoa: line.tenHangHoa,
        donViTinh: line.donViTinh ?? prev?.donViTinh ?? '',
      });
    }

    const received = new Map<string, { qty: number; donViTinh: string }>();
    for (const line of effectiveItems) {
      const key = norm(line.tenSanPham);
      if (!key) continue;
      const prev = received.get(key);
      received.set(key, {
        qty: (prev?.qty ?? 0) + Number(line.soLuongThucTe ?? 0),
        // Keep the first unit seen and detect a mismatch across lines of the same
        // commodity below — summing 10 Kg + 10 Tấn as "20" would be meaningless.
        donViTinh: prev?.donViTinh || line.donViTinh || '',
      });
    }

    const unknown = [...received.keys()].filter((k) => !purchased.has(k));
    if (unknown.length > 0) {
      throw new ValidationError(
        `Hàng hóa không có trong yêu cầu mua hàng ${pr.maYeuCau}: ${unknown.join(', ')}`
      );
    }

    // Unit reconciliation — quantity is only comparable in the same unit. A slip that
    // books 10 "Tấn" against a purchase of 10 "Kg" would inflate tồn kho ~1000x while
    // passing a quantity-only check, so an unknown name and a wrong unit are both fatal.
    const unitMismatch: string[] = [];
    for (const [key, rec] of received) {
      const bought = purchased.get(key);
      if (!bought) continue;
      if (rec.donViTinh && bought.donViTinh && norm(rec.donViTinh) !== norm(bought.donViTinh)) {
        unitMismatch.push(`${bought.tenHangHoa} (nhập ${rec.donViTinh}, mua ${bought.donViTinh})`);
      }
    }
    if (unitMismatch.length > 0) {
      throw new ValidationError(
        `Đơn vị tính không khớp yêu cầu mua hàng ${pr.maYeuCau}: ${unitMismatch.join('; ')}`
      );
    }

    const exceeded: string[] = [];
    for (const [key, rec] of received) {
      const bought = purchased.get(key);
      if (!bought) continue;
      if (rec.qty - bought.qty > 1e-9) {
        exceeded.push(`${bought.tenHangHoa} (nhập ${rec.qty} ${bought.donViTinh}, mua ${bought.qty} ${bought.donViTinh})`);
      }
    }
    if (exceeded.length > 0) {
      throw new ValidationError(
        `Số lượng nhập vượt số lượng đã mua của yêu cầu mua hàng ${pr.maYeuCau}: ${exceeded.join('; ')}`
      );
    }
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

    // Reconcile against the YCMH before any write, and BEFORE resolveLines: package
    // resolution can create catalog rows and kiện, so a slip that fails the quantity
    // guard must not leave that scaffolding behind. The supplyRequestId backfill runs
    // after the guard so an over-receipt can never inherit the SR linkage it was rejected for.
    // A2: cross-check inboundPlan.purchaseRequestId vs purchaseRequestId — no swallow
    const inboundPlanIdRaw = (normalized as any).inboundPlanId as string | undefined;
    if (inboundPlanIdRaw && normalized.purchaseRequestId) {
      const plan = await (tx as any).inboundPlan.findUnique({ where: { id: inboundPlanIdRaw }, select: { purchaseRequestId: true } });
      if (!plan) throw new NotFoundError('Kế hoạch không tồn tại');
      if (plan.purchaseRequestId !== normalized.purchaseRequestId) {
        throw new ValidationError('Kế hoạch nhập không khớp yêu cầu mua hàng đã chọn');
      }
    } else if (inboundPlanIdRaw && !normalized.purchaseRequestId) {
      // inboundPlan linked but no PR on slip — still verify plan exists so stale id fails fast
      const plan = await (tx as any).inboundPlan.findUnique({ where: { id: inboundPlanIdRaw }, select: { id: true } });
      if (!plan) throw new NotFoundError('Kế hoạch không tồn tại');
    }
    if (normalized.purchaseRequestId) {
      await this.assertMatchesPurchaseRequest(tx, normalized.purchaseRequestId, normalized, effective);
      if (!normalized.supplyRequestId) {
        try {
          const pr = await tx.purchaseRequest.findUnique({
            where: { id: normalized.purchaseRequestId },
            select: { supplyRequestId: true },
          });
          if (pr?.supplyRequestId) normalized.supplyRequestId = pr.supplyRequestId;
        } catch (err) {
          console.error('Error inheriting supplyRequestId from purchaseRequest:', err);
        }
      }
    }

    await this.validateFreeTextFields(tx, effective, normalized.boPhan as string | undefined);

    const resolved = await this.resolveLines(tx, effective);
    const balances = await this.loadBalances(
      tx,
      resolved.map((line) => line.lotProductId)
    );

    const { lines } = computeSequentialSnapshots(resolved, balances, 'IN');
    const totals = computeHeaderTotals(lines);

    const lyDoChenhLech = (normalized as any).lyDoChenhLech as string | null | undefined;
    {
      const hasDiff = effective.some((l: any) => {
        const kh = (l as any).soLuongYeuCau;
        if (kh == null) return false;
        return Math.abs(Number(kh) - Number(l.soLuongThucTe)) > 1e-9;
      }) || lines.some((l: any) => {
        const kh = (l as any).soLuongYeuCau;
        if (kh == null) return false;
        return Math.abs(Number(kh) - Number(l.soLuongThucTe)) > 1e-9;
      });
      if (hasDiff && !(lyDoChenhLech && String(lyDoChenhLech).trim())) {
        throw new ValidationError('Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch.');
      }
    }
    const effectiveGhiChu = normalized.ghiChu;

    const receipt = await tx.warehouseReceipt.create({
      data: {
        maPhieuNhap,
        employeeId: normalized.employeeId,
        maNhanVien: normalized.maNhanVien ?? '',
        tenNhanVien: normalized.tenNhanVien ?? '',
        ...(normalized.ngayNhap ? { ngayNhap: new Date(normalized.ngayNhap) } : {}),
        mucDich: normalized.mucDich,
        ghiChu: effectiveGhiChu,
        lyDoChenhLech: lyDoChenhLech?.trim() || null,
        ...(normalized.supplyRequestId ? { supplyRequestId: normalized.supplyRequestId } : {}),
        ...((normalized as CreateReceiptInput).purchaseRequestId ? { purchaseRequestId: (normalized as CreateReceiptInput).purchaseRequestId } : {}),
        ...((normalized as any).inboundPlanId ? { inboundPlanId: (normalized as any).inboundPlanId } : {}),
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

    // If linked to an inbound plan, accumulate actual quantities: when total >= planned, mark plan Đã nhập
    const inboundPlanId = (normalized as any).inboundPlanId as string | undefined;
    if (inboundPlanId) {
      // Persist discrepancy reason on the plan when FE sent one (plan owns lyDoChenhLech column)
      if (lyDoChenhLech) {
        try {
          await tx.inboundPlan.update({ where: { id: inboundPlanId }, data: { lyDoChenhLech } as any });
        } catch (e) {
          console.error('[warehouseReceipt] inboundPlan lyDoChenhLech persist failed', e);
        }
      }
      try {
        const mod = await import('./inboundPlanService');
        const svc: any = (mod as any).default ?? mod;
        if (svc?.onReceiptCreated) await svc.onReceiptCreated(inboundPlanId, tx as any);
        else console.error('[warehouseReceipt] inboundPlanService.onReceiptCreated missing');
      } catch (e) {
        console.error('[warehouseReceipt] onReceiptCreated failed', e);
      }
    }

    // Goods that arrived from a purchase must carry their cost, otherwise the slip
    // books stock at no value and tồn kho keeps pricing itself off the old catalog
    // price. Runs after the increment so the receipt lines exist.
    if (normalized.purchaseRequestId) {
      await this.applyPurchaseUnitCost(
        tx,
        normalized.purchaseRequestId,
        receipt.items.map((item) => ({
          id: item.id,
          tenSanPham: item.tenSanPham,
          lotProductId: item.lotProductId,
          soLuongThucTe: item.soLuongThucTe,
        })),
      );
    }

    return { ...receipt, isLocked: !!receipt.supplyRequestId };
  }

  /**
   * Stamp the purchase cost onto the receipt lines that received it, and onto the
   * kiện that took the stock.
   *
   * Unit cost per commodity is the quantity-weighted average of the YCMH lines that
   * name it (a purchase can carry two lines of the same goods at different prices);
   * the confirmed actual price wins and the estimate is the fallback, so a slip is
   * never priced at zero just because purchasing skipped the confirmation step.
   *
   * LotProduct.giaThanh takes the incoming cost of the goods that landed in that kiện
   * — deliberately not averaged per kiện. InventoryOverview already blends across
   * kiện when it computes giaThanhTB, so keeping each kiện at its own acquisition
   * cost preserves the audit trail of which lot cost what.
   */
  private async applyPurchaseUnitCost(
    tx: Prisma.TransactionClient,
    purchaseRequestId: string,
    lines: Array<{ id: string; tenSanPham: string; lotProductId: string; soLuongThucTe: number }>,
  ): Promise<void> {
    if (lines.length === 0) return;

    const pr = await tx.purchaseRequest.findUnique({
      where: { id: purchaseRequestId },
      select: { items: { select: { tenHangHoa: true, soLuong: true, giaDuKien: true, giaThucTe: true } } },
    });
    if (!pr) return;

    const norm = (s: string | null | undefined): string => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const qtyByCommodity = new Map<string, number>();
    const valueByCommodity = new Map<string, number>();
    for (const item of pr.items ?? []) {
      const key = norm(item.tenHangHoa);
      const qty = Number(item.soLuong ?? 0);
      const price = item.giaThucTe ?? item.giaDuKien ?? 0;
      if (!key || qty <= 0 || price <= 0) continue;
      qtyByCommodity.set(key, (qtyByCommodity.get(key) ?? 0) + qty);
      valueByCommodity.set(key, (valueByCommodity.get(key) ?? 0) + price * qty);
    }

    const costOf = (tenSanPham: string): number | null => {
      const key = norm(tenSanPham);
      const qty = qtyByCommodity.get(key);
      const value = valueByCommodity.get(key);
      if (!qty || !value) return null;
      return Number((value / qty).toFixed(2));
    };

    // Accumulate per kiện so several receipt lines landing on one package agree on a
    // single unit cost instead of the last write silently winning.
    const packageQty = new Map<string, number>();
    const packageValue = new Map<string, number>();

    for (const line of lines) {
      const donGia = costOf(line.tenSanPham);
      if (!donGia) continue;
      const thanhTien = Number((donGia * line.soLuongThucTe).toFixed(2));
      await tx.warehouseReceiptItem.update({
        where: { id: line.id },
        data: { donGia, thanhTien },
      });
      packageQty.set(line.lotProductId, (packageQty.get(line.lotProductId) ?? 0) + line.soLuongThucTe);
      packageValue.set(line.lotProductId, (packageValue.get(line.lotProductId) ?? 0) + thanhTien);
    }

    for (const [lotProductId, qty] of packageQty) {
      const value = packageValue.get(lotProductId) ?? 0;
      if (qty <= 0 || value <= 0) continue;
      await tx.lotProduct.update({
        where: { id: lotProductId },
        data: { giaThanh: Number((value / qty).toFixed(2)) },
      });
    }
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

      // A slip linked only to a YCMH (no supply request) reaches here, and editing
      // its lines could raise a received quantity above what was bought — the exact
      // over-receipt the create path guards against. Re-apply the same reconciliation
      // against the stored purchaseRequestId before any write.
      if (existing.purchaseRequestId) {
        await this.assertMatchesPurchaseRequest(
          tx,
          existing.purchaseRequestId,
          { employeeId: existing.employeeId, items } as CreateReceiptInput,
          items,
        );
      }

      const stored = existing.items ?? [];
      // An actual-only edit must not wipe the informational plan columns.
      this.preserveStoredFields(items, stored);
      // Require lyDoChenhLech when edited actuals diverge from plan (includes inherited soLuongYeuCau)
      {
        const hasDiff = items.some((it: any) => {
          const kh = it.soLuongYeuCau;
          if (kh == null) return false;
          return Math.abs(Number(kh) - Number(it.soLuongThucTe)) > 1e-9;
        });
        const lyDo = (normalized as any).lyDoChenhLech as string | null | undefined;
        if (hasDiff && !(lyDo && String(lyDo).trim())) {
          throw new ValidationError('Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch.');
        }
      }
      await this.validateFreeTextFields(tx, items, (normalized.boPhan as string | undefined) ?? existing.boPhan ?? undefined);

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
          lyDoChenhLech: (() => {
            const lyDo = (normalized as any).lyDoChenhLech as string | null | undefined;
            if (lyDo !== undefined) return lyDo?.trim() ? lyDo.trim() : null;
            return undefined;
          })() as any,
          ...(normalized.nguoiDeNghi !== undefined ? { nguoiDeNghi: normalized.nguoiDeNghi } : {}),
          ...(normalized.maNguoiDeNghi !== undefined ? { maNguoiDeNghi: normalized.maNguoiDeNghi } : {}),
          ...(normalized.boPhan !== undefined ? { boPhan: normalized.boPhan } : {}),
          ...(normalized.boPhanId !== undefined ? { boPhanId: normalized.boPhanId } : {}),
          ...totals,
          ...this.mirrorFirstLine(lines[0]),
        },
        include: { items: { orderBy: { stt: 'asc' } } },
      });

      const inboundPlanIdForUpdate = (existing as any).inboundPlanId as string | undefined;
      const editedLyDoReceipt = (normalized as any).lyDoChenhLech as string | null | undefined;
      if (inboundPlanIdForUpdate && editedLyDoReceipt !== undefined) {
        try {
          await tx.inboundPlan.update({
            where: { id: inboundPlanIdForUpdate },
            data: { lyDoChenhLech: editedLyDoReceipt?.trim() ? editedLyDoReceipt.trim() : null } as any,
          });
        } catch (e) {
          console.error('[warehouseReceipt] inboundPlan lyDoChenhLech update failed', e);
        }
      }

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

  // ─── Soft-void ────────────────────────────────────────────────────────────

  async void(id: string, opts: { voidReason: string; userId?: string }) {
    const reason = (opts.voidReason ?? '').trim();
    if (!reason) throw new ValidationError('Lý do vô hiệu là bắt buộc');
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM business.warehouse_receipts WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.warehouseReceipt.findUnique({ where: { id }, include: { items: true } });
      if (!existing) throw new NotFoundError('Không tìm thấy phiếu nhập kho');
      if ((existing as any).isVoided) throw new ConflictError('Phiếu đã vô hiệu');
      const stored = (existing as any).items ?? [] as any[];
      if (stored.length > 0) {
        const reversals = this.sumByPackage(stored);
        const balances = await this.loadBalances(tx, stored.map((l: any) => l.lotProductId));
        assertSufficientStock(reversals, balances);
        for (const [lotProductId, qty] of reversals) {
          const res = await tx.lotProduct.updateMany({ where: { id: lotProductId, soLuong: { gte: qty } }, data: { soLuong: { decrement: qty } } });
          if (res.count === 0) {
            const bal = balances.get(lotProductId);
            throw new ValidationError(`Số lượng tồn kho của ${bal?.tenSanPham ? `"${bal.tenSanPham}"` : `kiện ${lotProductId}`} không đủ. Cần ${qty}, còn ${bal?.soLuong ?? 0}`);
          }
        }
      }
      const updated = await tx.warehouseReceipt.update({
        where: { id },
        data: { isVoided: true, voidReason: reason, voidedAt: new Date(), voidedBy: opts.userId ?? null } as any,
        include: { items: slipItemInclude, inboundPlan: { select: { lyDoChenhLech: true } } },
      });
      return { ...(updated as any), items: resolveSlipItems((updated as any).items), isLocked: !!updated.supplyRequestId };
    });
  }

  async unvoid(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM business.warehouse_receipts WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.warehouseReceipt.findUnique({ where: { id }, include: { items: true } });
      if (!existing) throw new NotFoundError('Không tìm thấy phiếu nhập kho');
      if (!(existing as any).isVoided) throw new ConflictError('Phiếu chưa vô hiệu');
      const stored = (existing as any).items ?? [] as any[];
      if (stored.length > 0) {
        const totalsByPackage = this.sumByPackage(stored);
        for (const [lotProductId, qty] of totalsByPackage) {
          await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong: { increment: qty } } });
        }
      }
      const updated = await tx.warehouseReceipt.update({
        where: { id },
        data: { isVoided: false, voidReason: null, voidedAt: null, voidedBy: null } as any,
        include: { items: slipItemInclude, inboundPlan: { select: { lyDoChenhLech: true } } },
      });
      return { ...(updated as any), items: resolveSlipItems((updated as any).items), isLocked: !!updated.supplyRequestId };
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
