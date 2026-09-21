import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere } from '../utils/codeGenerator';
import reorderRuleService from './reorderRuleService';
import { ValidationError, ConflictError, NotFoundError } from '@utils/errors';
import {
  assertLinesFitStock,
  assertSufficientStock,
  computeHeaderTotals,
  computeSequentialSnapshots,
  diffLines,
  type PackageBalance,
} from '@utils/warehouseSlipLines';
import { resolveSlipItems, slipItemInclude } from '@utils/warehouseSlipEnrichment';

/** Prisma client or an interactive-transaction client. */
type PrismaClientLike = typeof prisma | Prisma.TransactionClient;

/** One commodity line of an issue slip. */
export interface IssueLineInput {
  /** Stored line id — present only when updating an existing line. */
  id?: string | null;
  /** Target package. Required: an issue can only draw from a package that exists. */
  lotProductId: string;
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
  soLoKeHoach?: string;
  soLoThucTe?: string;
  soKienKeHoach?: string[] | string;
  soKienThucTe?: string[] | string;
  tinhTrang?: string;
  quyCach?: string;
}

export interface CreateIssueInput {
  /** Slip code. Generated once when omitted — never per line. */
  maPhieuXuat?: string;
  employeeId: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  ngayXuat?: Date | string;
  ghiChu?: string;
  supplyRequestId?: string;
  outboundPlanId?: string | null;
  lyDoChenhLech?: string | null;
  nguoiDeNghi?: string;
  maNguoiDeNghi?: string;
  boPhan?: string;
  boPhanId?: string;
  lyDoXuatKho?: string;
  items: IssueLineInput[];
}

export interface UpdateIssueInput {
  ngayXuat?: Date | string;
  ghiChu?: string;
  lyDoChenhLech?: string | null;
  nguoiDeNghi?: string;
  maNguoiDeNghi?: string;
  boPhan?: string;
  boPhanId?: string;
  lyDoXuatKho?: string;
  items: IssueLineInput[];
}

/**
 * @deprecated Flat single-commodity payload. Kept so the HTTP layer,
 * `supplyRequestService`, and `materialEvaluationService` keep compiling until
 * they are migrated to the nested shape (tasks 6.x, 8.x, 10.x). New callers must
 * pass `items`.
 */
export interface LegacyFlatIssueInput {
  maPhieuXuat?: string;
  employeeId?: string;
  maNhanVien?: string;
  tenNhanVien?: string;
  warehouseId: string;
  tenKho?: string;
  lotId: string;
  tenLo?: string;
  lotProductId: string;
  tenSanPham: string;
  soLuongXuat: number;
  donViTinh?: string;
  ghiChu?: string;
  supplyRequestId?: string;
}

type CreateInput = CreateIssueInput | LegacyFlatIssueInput;
type UpdateInput = UpdateIssueInput | LegacyFlatIssueInput;

/** A validated line, ready for guards and snapshots. */
interface ResolvedLine extends IssueLineInput {
  lotProductId: string;
  soLuongYeuCau: number;
  maKien?: string;
}

function isNestedInput(input: CreateInput | UpdateInput): input is CreateIssueInput | UpdateIssueInput {
  return Array.isArray((input as { items?: unknown }).items);
}

/** Lift a flat single-commodity payload into the header-plus-one-line shape. */
function normalizeInput(input: CreateInput | UpdateInput): CreateIssueInput & UpdateIssueInput {
  if (isNestedInput(input)) {
    return input as CreateIssueInput & UpdateIssueInput;
  }
  const flat = input as LegacyFlatIssueInput;
  return {
    maPhieuXuat: flat.maPhieuXuat,
    employeeId: flat.employeeId ?? '',
    maNhanVien: flat.maNhanVien,
    tenNhanVien: flat.tenNhanVien,
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
        soLuongThucTe: flat.soLuongXuat,
        ghiChu: flat.ghiChu,
      },
    ],
  };
}

class WarehouseIssueService {
  async generateCode(tx?: any): Promise<string> {
    const year = new Date().getFullYear();
    const client = tx ?? prisma;
    const last = await client.warehouseIssue.findFirst({
      where: { maPhieuXuat: yearlyCodeWhere('PX', year) },
      orderBy: { maPhieuXuat: 'desc' },
      select: { maPhieuXuat: true },
    });
    return nextYearlyCode(last?.maPhieuXuat ?? null, 'PX', year);
  }

  // ─── Line helpers ───────────────────────────────────────────────────────────

  // ĐVT là free-text có kiểm soát — giá trị chuẩn nằm trong common.lookups (DON_VI_TINH).
  // Thêm/sửa trong Cài đặt có hiệu lực ngay. Không chặn cứng ở đây; chỉ warn để
  // operator biết "đây chưa phải ĐVT chính thức" nhưng vẫn cho tạo phiếu.
  private assertKnownUnitForLines(items: IssueLineInput[] | ResolvedLine[]): void {
    for (let i = 0; i < items.length; i++) {
      const dvt = (items[i] as any).donViTinh;
      if (dvt != null && String(dvt).trim() !== '') {
        // Soft-warn only — do not throw. Hard-blocking breaks free-text DVT and
        // makes Settings → add DVT useless until next deploy.
        if (String(dvt).trim().length > 50) {
          throw new ValidationError(`Đơn vị tính dòng ${i + 1} quá dài (tối đa 50 ký tự)`);
        }
      }
    }
  }

  /** Reject an empty line array, a missing package, and any non-positive quantity — before any write. */
  private assertLinesPresent(items: IssueLineInput[] | undefined): ResolvedLine[] {
    if (!items || items.length === 0) {
      throw new ValidationError('Phiếu xuất kho phải có ít nhất một mặt hàng');
    }
    const resolved = items.map((line, index) => {
      const quantity = Number(line.soLuongThucTe);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new ValidationError(`Số lượng thực xuất của dòng ${index + 1} phải lớn hơn 0`);
      }
      if (!line.lotProductId) {
        throw new ValidationError(`Dòng ${index + 1} thiếu thông tin kiện hàng`);
      }
      return {
        ...line,
        lotProductId: line.lotProductId,
        soLuongThucTe: quantity,
        soLuongYeuCau: Number(line.soLuongYeuCau ?? quantity),
      };
    });
    this.assertKnownUnitForLines(resolved);
    return resolved;
  }

  /**
   * Load current balances for every package the operation touches, inside the
   * transaction. `internationalProductId` rides along so the reorder-rule check
   * can be deduped per product afterwards.
   */
  private async loadBalances(
    client: PrismaClientLike,
    lotProductIds: string[]
  ): Promise<Map<string, PackageBalance & { internationalProductId: string; maKien: string | null; lotId: string; warehouseId: string | null }>> {
    const ids = [...new Set(lotProductIds)];
    if (ids.length === 0) return new Map();

    const rows = await client.lotProduct.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        soLuong: true,
        donViTinh: true,
        maKien: true,
        lotId: true,
        lot: { select: { warehouseId: true } },
        internationalProductId: true,
        internationalProduct: { select: { tenSanPham: true } },
      },
    });

    const balances = new Map<string, PackageBalance & { internationalProductId: string; maKien: string | null; lotId: string; warehouseId: string | null }>();
    for (const row of rows) {
      balances.set(row.id, {
        soLuong: row.soLuong,
        donViTinh: row.donViTinh,
        tenSanPham: row.internationalProduct?.tenSanPham ?? '',
        internationalProductId: row.internationalProductId ?? '',
        maKien: row.maKien,
        lotId: row.lotId,
        warehouseId: row.lot?.warehouseId ?? null,
      });
    }
    return balances;
  }

  /**
   * Cross-check each line's declared lot/warehouse against the package's real
   * location. A repointed line must not keep stale lot/warehouse values, and a
   * forged payload must not draw from a package in a different lot/warehouse.
   */
  private assertLinesMatchPackages(
    items: Array<{ lotProductId: string; lotId?: string; warehouseId?: string; tenSanPham?: string }>,
    balances: Map<string, { lotId?: string; warehouseId?: string | null }>
  ): void {
    for (const line of items) {
      const bal = balances.get(line.lotProductId);
      if (!bal) {
        throw new ValidationError(`Không tìm thấy kiện hàng của dòng "${line.tenSanPham ?? line.lotProductId}"`);
      }
      if (line.lotId && bal.lotId && bal.lotId !== line.lotId) {
        throw new ValidationError(`Kiện hàng không thuộc lô đã chọn (dòng "${line.tenSanPham ?? ''}")`);
      }
      if (line.warehouseId && bal.warehouseId && bal.warehouseId !== line.warehouseId) {
        throw new ValidationError(`Kiện hàng không thuộc kho đã chọn (dòng "${line.tenSanPham ?? ''}")`);
      }
    }
  }

  /**
   * Preserve the informational plan fields from the stored line when the update
   * payload omits them, so an actual-only edit does not wipe the plan columns.
   * Only undefined fields are filled; a value the caller sent always wins.
   */
  private preserveStoredFields(items: IssueLineInput[], stored: Array<Record<string, any>>): void {
    const byId = new Map(stored.map((l) => [l.id, l]));
    for (const line of items) {
      if (!line.id) continue;
      const old = byId.get(line.id);
      if (!old) continue;
      if (line.soLuongYeuCau === undefined || line.soLuongYeuCau === null) {
        line.soLuongYeuCau = old.soLuongYeuCau ?? undefined;
      }
      if (line.soLoKeHoach === undefined) line.soLoKeHoach = old.soLoKeHoach ?? undefined;
      if (line.soKienKeHoach === undefined) line.soKienKeHoach = old.soKienKeHoach ?? undefined;
      if (line.soLoThucTe === undefined) line.soLoThucTe = old.soLoThucTe ?? undefined;
      if (line.soKienThucTe === undefined) line.soKienThucTe = old.soKienThucTe ?? undefined;
      if (line.tinhTrang === undefined) line.tinhTrang = old.tinhTrang ?? undefined;
      if (line.quyCach === undefined) line.quyCach = old.quyCach ?? undefined;
    }
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
   * `nguoiDeNghi` / `boPhan` describe WHO ASKED for the goods, never the thủ kho who
   * types the slip. The only authoritative source is `SupplyRequest` (YCCB). Resolution
   * walks either linkage the slip may carry:
   *
   *   supplyRequestId                → SupplyRequest
   *   outboundPlanId  → OutboundPlan.supplyRequest
   *
   * A standalone slip (no SR, no kế hoạch xuất) has no digitized "bộ phận đề nghị" to
   * read — the fields stay EMPTY on purpose rather than falling back to the creator's
   * own department (that fallback is what produced the "Quản lý kho" stamping bug).
   */
  private async fillHeaderFromSupplyRequest(client: PrismaClientLike, normalized: CreateIssueInput & UpdateIssueInput & { employeeId: string }) {
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

  /** Find the YCCB behind an issue slip, following outboundPlanId when direct linkage is absent. */
  private async resolveSupplyRequestId(
    client: PrismaClientLike,
    normalized: CreateIssueInput & UpdateIssueInput,
  ): Promise<string | null> {
    if (normalized.supplyRequestId) return normalized.supplyRequestId;

    const outboundPlanId = (normalized as any).outboundPlanId as string | undefined;
    if (outboundPlanId) {
      const plan = await (client as any).outboundPlan?.findUnique?.({
        where: { id: outboundPlanId },
        select: { supplyRequestId: true },
      });
      if (plan?.supplyRequestId) return plan.supplyRequestId;
    }

    return null;
  }

  private async deriveSoLoThucTeFromKien(client: PrismaClientLike, items: IssueLineInput[]) {
    for (const line of items) {
      const kienArr = line.soKienThucTe;
      if (!line.soLoThucTe && kienArr && Array.isArray(kienArr) && (kienArr as string[]).length > 0) {
        try {
          // Scope by lotId: maKien is only unique within a lot (@@unique([lotId, maKien])),
          // baseline lots all reuse K1.1… so a global lookup can join the wrong lot's name.
          const kienRows = await client.lotProduct.findMany({
            where: { ...(line.lotId ? { lotId: line.lotId } : {}), maKien: { in: kienArr as string[] } },
            select: { lot: { select: { tenLo: true } } },
          });
          const lots = [...new Set(kienRows.map((r: any) => r.lot?.tenLo).filter(Boolean))];
          if (lots.length > 0) line.soLoThucTe = lots.join(', ');
        } catch {}
      }
    }
  }

  /**
   * Deprecated header columns mirror the first line so a not-yet-migrated reader
   * degrades to a coherent single-commodity view instead of reading `null`.
   * The header totals carry the truth for multi-line slips.
   */
  private mirrorFirstLine(line: ResolvedLine & { soLuongTruoc: number; soLuongSau: number }) {
    return {
      warehouseId: line.warehouseId,
      tenKho: line.tenKho ?? '',
      lotId: line.lotId,
      tenLo: line.tenLo ?? '',
      lotProductId: line.lotProductId,
      tenSanPham: line.tenSanPham,
      donViTinh: line.donViTinh ?? '',
      soLuongTruoc: line.soLuongTruoc,
      soLuongXuat: line.soLuongThucTe,
      soLuongSau: line.soLuongSau,
    };
  }

  private lineData(line: ResolvedLine & { soLuongTruoc: number; soLuongSau: number }, stt: number) {
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
      soLoKeHoach: (line as IssueLineInput).soLoKeHoach ?? null,
      soLoThucTe: (line as IssueLineInput).soLoThucTe ?? null,
      soKienKeHoach: toJson((line as IssueLineInput).soKienKeHoach as string[] | string | undefined),
      soKienThucTe: toJson((line as IssueLineInput).soKienThucTe as string[] | string | undefined),
      tinhTrang: (line as IssueLineInput).tinhTrang ?? null,
      quyCach: (line as IssueLineInput).quyCach ?? null,
    };
  }

  /**
   * Task 4.5 — one reorder-rule check per DISTINCT product across the slip's
   * lines, not one per line. Fire-and-forget and error-swallowing: a failed
   * notification must never fail the slip that already committed.
   */
  private notifyReorderRules(
    lotProductIds: string[],
    balances: Map<string, PackageBalance & { internationalProductId: string }>
  ): void {
    const productIds = new Set<string>();
    for (const lotProductId of lotProductIds) {
      const productId = balances.get(lotProductId)?.internationalProductId;
      if (productId) productIds.add(productId);
    }
    for (const productId of productIds) {
      reorderRuleService.checkAndNotify(productId).catch((err) => {
        console.error('reorderRuleService.checkAndNotify failed:', err);
      });
    }
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  private static readonly SORTABLE = ['ngayXuat', 'maPhieuXuat', 'createdAt'] as const;

  private resolveOrderBy(sortBy?: string, sortOrder?: string) {
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';
    const col = (WarehouseIssueService.SORTABLE as readonly string[]).includes(sortBy ?? '') ? sortBy! : 'createdAt';
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

    if (params?.maPhieu?.trim()) {
      (where as any).maPhieuXuat = { contains: params.maPhieu.trim(), mode: 'insensitive' as const };
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
      if (params?.warehouseId) {
        (where as any).AND = [
          { items: { some: { warehouseId: params.warehouseId } } },
          { items: { some: { tinhTrang: tt } } },
        ];
        delete (where as any).items;
      } else {
        (where as any).items = { some: { tinhTrang: tt } };
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
        const d = new Date(params.fromNgay + 'T00:00:00');
        if (!isNaN(d.getTime())) range.gte = d;
      }
      if (params.toNgay) {
        const d = new Date(params.toNgay + 'T23:59:59.999');
        if (!isNaN(d.getTime())) range.lte = d;
      }
      if (Object.keys(range).length > 0) (where as any).ngayXuat = range;
    }

    if (params?.search) {
      const s = params.search.trim();
      if (s) {
        (where as any).OR = [
          { maPhieuXuat: { contains: s, mode: 'insensitive' as const } },
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

    const [issues, total] = await Promise.all([
      prisma.warehouseIssue.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: this.resolveOrderBy(params?.sortBy, params?.sortOrder),
        include: {
          items: slipItemInclude,
          outboundPlan: { select: { lyDoChenhLech: true } },
          materialEvaluation: { select: { id: true } },
        },
      }),
      prisma.warehouseIssue.count({ where }),
    ]);

    const data = issues.map((issue: any) => {
      const { materialEvaluation, outboundPlan, items, ...rest } = issue;
      return {
        ...rest,
        lyDoChenhLech: rest.lyDoChenhLech ?? outboundPlan?.lyDoChenhLech ?? null,
        outboundPlan,
        items: resolveSlipItems(items),
        isLocked: !!issue.supplyRequestId || !!materialEvaluation,
      };
    });

    return {
      data,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getById(id: string) {
    const issue = await prisma.warehouseIssue.findUnique({
      where: { id },
      include: {
        items: slipItemInclude,
        outboundPlan: { select: { lyDoChenhLech: true } },
        materialEvaluation: { select: { id: true } },
      },
    });
    if (!issue) {
      throw new NotFoundError('Không tìm thấy phiếu xuất kho');
    }
    const { materialEvaluation, outboundPlan, items, ...rest } = issue as any;
    return {
      ...rest,
      lyDoChenhLech: rest.lyDoChenhLech ?? outboundPlan?.lyDoChenhLech ?? null,
      outboundPlan,
      items: resolveSlipItems(items),
      materialEvaluation,
      isLocked: !!issue.supplyRequestId || !!materialEvaluation,
    };
  }

  // ─── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Create one slip carrying N commodity lines. Exactly one code is generated
   * regardless of line count.
   *
   * The stock check is an AGGREGATE over lines grouped by package, and it runs to
   * completion before the first write: two lines of 60 against a package holding
   * 100 each pass an independent check but overdraw by 20 together. Snapshots are
   * then chained per package, so a second line on one package opens where the
   * first closed.
   */
  async create(input: CreateInput) {
    const normalized = normalizeInput(input);

    // One code per slip — generated once, outside the per-line path.
    const maPhieuXuat = normalized.maPhieuXuat ?? (await this.generateCode());

    const { issue, balances, lotProductIds } = await prisma.$transaction(async (tx) =>
      this.createWithClient(normalized, normalized.items, maPhieuXuat, tx)
    );

    this.notifyReorderRules(lotProductIds, balances);

    return { ...issue, isLocked: !!issue.supplyRequestId };
  }

  /**
   * Internal: create an issue slip inside an EXISTING transaction client, so callers
   * (partialFulfill / batchFulfill) can make the stock decrement atomic with their own
   * supply-request updates. If the stock check fails, the whole transaction rolls back.
   */
  async createWithClient(
    normalized: CreateIssueInput & UpdateIssueInput & { employeeId: string },
    rawItems: IssueLineInput[],
    maPhieuXuat: string,
    tx: Prisma.TransactionClient,
  ) {
    // A2 outbound: cross-check outboundPlan.supplyRequestId vs supplyRequestId — no swallow
    const outboundPlanIdRaw = (normalized as any).outboundPlanId as string | undefined;
    if (outboundPlanIdRaw && normalized.supplyRequestId) {
      const plan = await (tx as any).outboundPlan.findUnique({ where: { id: outboundPlanIdRaw }, select: { supplyRequestId: true } });
      if (!plan) throw new NotFoundError('Kế hoạch không tồn tại');
      if (plan.supplyRequestId !== normalized.supplyRequestId) {
        throw new ValidationError('Kế hoạch xuất không khớp yêu cầu cung cấp đã chọn');
      }
    } else if (outboundPlanIdRaw && !normalized.supplyRequestId) {
      const plan = await (tx as any).outboundPlan.findUnique({ where: { id: outboundPlanIdRaw }, select: { id: true } });
      if (!plan) throw new NotFoundError('Kế hoạch không tồn tại');
    }
    const items = this.assertLinesPresent(rawItems);
    await this.fillHeaderFromSupplyRequest(tx, normalized);
    await this.deriveSoLoThucTeFromKien(tx, items);
    const lotProductIds = items.map((line) => line.lotProductId);
    const balances = await this.loadBalances(tx, lotProductIds);

    // A line must draw from a package that actually lives in the declared lot/warehouse.
    this.assertLinesMatchPackages(items, balances);

    // Aggregate-by-package guard across every group, before anything is written.
    assertLinesFitStock(items, balances);

    const { lines } = computeSequentialSnapshots(items, balances, 'OUT');
    const totals = computeHeaderTotals(lines);
    const withMaKien = lines.map((l) => ({ ...l, maKien: balances.get(l.lotProductId)?.maKien ?? undefined }));
    {
      const hasDiff = withMaKien.some((l) => {
        const kh = (l as any).soLuongYeuCau;
        if (kh == null) return false;
        return Math.abs(Number(kh) - Number(l.soLuongThucTe)) > 1e-9;
      }) || items.some((l: any) => {
        const kh = l.soLuongYeuCau;
        if (kh == null) return false;
        return Math.abs(Number(kh) - Number(l.soLuongThucTe)) > 1e-9;
      });
      const lyDo = (normalized as any).lyDoChenhLech as string | undefined;
      if (hasDiff && !(lyDo && String(lyDo).trim())) {
        throw new ValidationError('Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch.');
      }
    }

    const issue = await tx.warehouseIssue.create({
      data: {
        maPhieuXuat,
        employeeId: normalized.employeeId,
        maNhanVien: normalized.maNhanVien ?? '',
        tenNhanVien: normalized.tenNhanVien ?? '',
        ...(normalized.ngayXuat ? { ngayXuat: new Date(normalized.ngayXuat) } : {}),
        ghiChu: normalized.ghiChu,
        lyDoChenhLech: (normalized as any).lyDoChenhLech?.trim() || null,
        ...(normalized.supplyRequestId ? { supplyRequestId: normalized.supplyRequestId } : {}),
        ...((normalized as any).outboundPlanId ? { outboundPlanId: (normalized as any).outboundPlanId } : {}),
        ...(normalized.nguoiDeNghi ? { nguoiDeNghi: normalized.nguoiDeNghi } : {}),
        ...(normalized.maNguoiDeNghi ? { maNguoiDeNghi: normalized.maNguoiDeNghi } : {}),
        ...(normalized.boPhan ? { boPhan: normalized.boPhan } : {}),
        ...(normalized.boPhanId ? { boPhanId: normalized.boPhanId } : {}),
        ...(normalized.lyDoXuatKho ? { lyDoXuatKho: normalized.lyDoXuatKho } : {}),
        ...totals,
        ...this.mirrorFirstLine(withMaKien[0]),
        items: {
          create: withMaKien.map((line, index) => this.lineData(line, index + 1)),
        },
      },
      include: { items: { orderBy: { stt: 'asc' } } },
    });

    const outboundPlanId = (normalized as any).outboundPlanId as string | undefined;
    if (outboundPlanId) {
      try {
        const hasDiff = withMaKien.some((l) => Math.abs(Number((l as any).soLuongYeuCau ?? l.soLuongThucTe) - Number(l.soLuongThucTe)) > 1e-9);
        const lyDo = (normalized as any).lyDoChenhLech as string | undefined;
        // Try outboundPlan service first, fallback to inline update
        try {
          const mod = await import('./outboundPlanService');
          const svc: any = (mod as any).default ?? mod;
          if (svc?.markReceived) await svc.markReceived(outboundPlanId, { lyDoChenhLech: lyDo ?? (hasDiff ? 'Chênh lệch SL kế hoạch/thực tế' : undefined) }, tx as any);
          else throw new Error('no markReceived');
        } catch {
          const cur = await (tx as any).outboundPlan?.findUnique?.({ where: { id: outboundPlanId }, select: { trangThai: true, ngayDuKien: true } });
          if (cur && !['Đã xuất', 'Đã hủy'].includes(cur.trangThai)) {
            await (tx as any).outboundPlan.update({ where: { id: outboundPlanId }, data: { trangThai: 'Đã xuất', ...(lyDo ? { lyDoChenhLech: lyDo } : {}) } });
          }
        }
      } catch (e) {
        console.error('[warehouseIssue] mark outboundPlan failed', e);
      }
    }

    // Atomic decrement with affected-rows check; sequential snapshots remain second defence.
    // Throws (and thus rolls back the outer transaction) when stock is insufficient.
    const totalsByPackage = this.sumByPackage(items);
    for (const [lotProductId, qty] of totalsByPackage) {
      const res = await tx.lotProduct.updateMany({
        where: { id: lotProductId, soLuong: { gte: qty } },
        data: { soLuong: { decrement: qty } },
      });
      if (res.count === 0) {
        const bal = balances.get(lotProductId);
        throw new ValidationError(
          `Số lượng tồn kho của ${bal?.tenSanPham ? `"${bal.tenSanPham}"` : `kiện ${lotProductId}`} không đủ. Cần ${qty}, tồn ${bal?.soLuong ?? 0}`
        );
      }
    }

    return { issue, balances, lotProductIds };
  }

  /**
   * Update a slip as a line diff. Reversing a stored issue line ADDS its quantity
   * back, so the balance the incoming lines are validated against is the
   * post-reversal one — validating against the raw stored balance would reject
   * edits that in fact fit. Every guard runs across the fully-resolved diff
   * before the first write; snapshots then recompute sequentially.
   */
  async update(id: string, input: UpdateInput) {
    const existing = await prisma.warehouseIssue.findUnique({
      where: { id },
      include: {
        items: { orderBy: { stt: 'asc' } },
        materialEvaluation: { select: { id: true } },
      },
    });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy phiếu xuất kho');
    }

    // Both locks live on the header: supply-request-linked OR evaluation-generated.
    if (existing.supplyRequestId) {
      throw new ConflictError('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
    }
    if (existing.materialEvaluation) {
      throw new ConflictError('Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo');
    }

    const normalized = normalizeInput(input);
    const stored = existing.items ?? [];
    // Preserve plan/BM fields when the client only edited actuals — an actual-only
    // edit must not wipe the informational plan columns.
    this.preserveStoredFields(normalized.items, stored);
    {
      const hasDiff = (normalized.items ?? []).some((it: any) => {
        const kh = it.soLuongYeuCau ?? (stored.find((s: any) => s.id === it.id) as any)?.soLuongYeuCau;
        if (kh == null) return false;
        return Math.abs(Number(kh) - Number(it.soLuongThucTe)) > 1e-9;
      });
      const lyDo = (normalized as any).lyDoChenhLech as string | null | undefined;
      if (hasDiff && !(lyDo && String(lyDo).trim())) {
        throw new ValidationError('Vui lòng nhập lý do chênh lệch khi thực tế khác kế hoạch.');
      }
    }
    const items = this.assertLinesPresent(normalized.items);

    // Immutable maKien snapshot: a line that stays on the same package keeps the
    // maKien recorded when it was written, even if the package was relabeled since.
    // Only repointed lines (or rows with no stored snapshot) take the fresh code.
    const storedMaKienById = new Map(
      stored.map((l) => [l.id, { lotProductId: l.lotProductId, maKien: l.maKien } as { lotProductId: string; maKien: string | null }])
    );

    const { updated, balances, lotProductIds } = await prisma.$transaction(async (tx) => {
      // `diff` classifies the change set; every stored line is reversed either way
      // (removed permanently, or before its incoming replacement lands — possibly
      // on a different package for a repointed line).
      const diff = diffLines(stored, items);

      const reversals = this.sumByPackage(stored);
      const balances = await this.loadBalances(tx, [
        ...stored.map((line) => line.lotProductId),
        ...items.map((line) => line.lotProductId),
      ]);

      // Cross-check declared lot/warehouse against the package's real location before
      // any guard — a repointed line must not keep stale values.
      this.assertLinesMatchPackages(items, balances);

      // Reversal credits stock back, so the available balance grows first.
      const afterReversal = new Map<string, PackageBalance & { internationalProductId: string; maKien: string | null }>();
      for (const [lotProductId, balance] of balances) {
        afterReversal.set(lotProductId, {
          ...balance,
          soLuong: balance.soLuong + (reversals.get(lotProductId) ?? 0),
        });
      }

      // Aggregate guard over the resolved set, before any write.
      assertLinesFitStock(items, afterReversal);

      const { lines } = computeSequentialSnapshots(items, afterReversal, 'OUT');
      const totals = computeHeaderTotals(lines);
      const withMaKien = lines.map((l) => {
        if (l.id) {
          const snap = storedMaKienById.get(l.id);
          if (snap && snap.lotProductId === l.lotProductId && snap.maKien != null) {
            return { ...l, maKien: snap.maKien };
          }
        }
        return { ...l, maKien: afterReversal.get(l.lotProductId)?.maKien ?? undefined };
      });

      if (diff.removed.length > 0) {
        await tx.warehouseIssueItem.deleteMany({
          where: { id: { in: diff.removed.map((line) => line.id) } },
        });
      }

      const storedIds = new Set(stored.map((line) => line.id));
      for (const [index, line] of withMaKien.entries()) {
        const data = this.lineData(line, index + 1);
        if (line.id && storedIds.has(line.id)) {
          await tx.warehouseIssueItem.update({ where: { id: line.id }, data });
        } else {
          await tx.warehouseIssueItem.create({ data: { ...data, issueId: id } });
        }
      }

      // Atomic net stock delta: incoming vs reversals, with overflow guard as second defence
      // computeSequentialSnapshots already validated soLuongSau >= 0 per line
      const incomingByPackage = this.sumByPackage(items);
      for (const lotProductId of afterReversal.keys()) {
        const incoming = incomingByPackage.get(lotProductId) ?? 0;
        const reversal = reversals.get(lotProductId) ?? 0;
        const netOut = incoming - reversal; // >0 means more taken, <0 means refunded
        if (netOut > 0) {
          const res = await tx.lotProduct.updateMany({
            where: { id: lotProductId, soLuong: { gte: netOut } },
            data: { soLuong: { decrement: netOut } },
          });
          if (res.count === 0) {
            throw new ValidationError(`Số lượng tồn kho của kiện ${lotProductId} không đủ. Cần thêm ${netOut}`);
          }
        } else if (netOut < 0) {
          await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong: { increment: -netOut } } });
        }
        // netOut === 0: no stock change; closingBalances still correct via snapshots
      }
      // Packages appearing only in incoming (not in afterReversal) — newly targeted
      for (const [lotProductId, incoming] of incomingByPackage) {
        if (afterReversal.has(lotProductId)) continue;
        const res = await tx.lotProduct.updateMany({
          where: { id: lotProductId, soLuong: { gte: incoming } },
          data: { soLuong: { decrement: incoming } },
        });
        if (res.count === 0) {
          const bal = balances.get(lotProductId);
          throw new ValidationError(`Số lượng tồn kho của ${bal?.tenSanPham ? `"${bal.tenSanPham}"` : `kiện ${lotProductId}`} không đủ`);
        }
      }

      const updated = await tx.warehouseIssue.update({
        where: { id },
        data: {
          ...(normalized.ngayXuat ? { ngayXuat: new Date(normalized.ngayXuat) } : {}),
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
          ...(normalized.lyDoXuatKho !== undefined ? { lyDoXuatKho: normalized.lyDoXuatKho } : {}),
          ...totals,
          ...this.mirrorFirstLine(withMaKien[0]),
        },
        include: { items: { orderBy: { stt: 'asc' } } },
      });

      // Persist edited reason to linked outbound plan when present (mirrors create path)
      const outboundPlanIdForUpdate = (existing as any).outboundPlanId as string | undefined;
      const editedLyDo = (normalized as any).lyDoChenhLech as string | null | undefined;
      if (outboundPlanIdForUpdate && editedLyDo !== undefined) {
        try {
          await tx.outboundPlan.update({
            where: { id: outboundPlanIdForUpdate },
            data: { lyDoChenhLech: editedLyDo?.trim() ? editedLyDo.trim() : null } as any,
          });
        } catch (e) {
          console.error('[warehouseIssue] outboundPlan lyDoChenhLech update failed', e);
        }
      }

      return { updated, balances, lotProductIds: [...afterReversal.keys()] };
    });

    this.notifyReorderRules(lotProductIds, balances);

    return { ...updated, isLocked: !!updated.supplyRequestId };
  }

  async markPrinted(id: string) {
    const existing = await prisma.warehouseIssue.findUnique({ where: { id }, select: { id: true, daIn: true } });
    if (!existing) throw new NotFoundError('Không tìm thấy phiếu xuất kho');
    if (existing.daIn) return existing;
    return prisma.warehouseIssue.update({ where: { id }, data: { daIn: true, inLanDauAt: new Date() } });
  }

  /**
   * Delete a slip, refunding every line to its own package. Shared packages are
   * refunded by their aggregate, and both header locks are checked before any
   * write.
   */
  async delete(id: string) {
    const existing = await prisma.warehouseIssue.findUnique({
      where: { id },
      include: {
        items: true,
        materialEvaluation: { select: { id: true } },
      },
    });
    if (!existing) {
      throw new NotFoundError('Không tìm thấy phiếu xuất kho');
    }

    if (existing.supplyRequestId) {
      throw new ConflictError('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
    }
    if (existing.materialEvaluation) {
      throw new ConflictError('Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo');
    }

    const stored = existing.items ?? [];

    return prisma.$transaction(async (tx) => {
      if (stored.length > 0) {
        const refunds = this.sumByPackage(stored);
        // Atomic increment — reversal of an issue is always positive refund.
        for (const [lotProductId, quantity] of refunds) {
          await tx.lotProduct.update({
            where: { id: lotProductId },
            data: { soLuong: { increment: quantity } },
          });
        }
      }

      // Lines are removed by cascade.
      await tx.warehouseIssue.delete({ where: { id } });

      return { id };
    });
  }

  // ─── Soft-void ────────────────────────────────────────────────────────────

  async void(id: string, opts: { voidReason: string; userId?: string }) {
    const reason = (opts.voidReason ?? '').trim();
    if (!reason) throw new ValidationError('Lý do vô hiệu là bắt buộc');
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM business.warehouse_issues WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.warehouseIssue.findUnique({ where: { id }, include: { items: true } });
      if (!existing) throw new NotFoundError('Không tìm thấy phiếu xuất kho');
      if ((existing as any).isVoided) throw new ConflictError('Phiếu đã vô hiệu');
      const stored = (existing as any).items ?? [] as any[];
      if (stored.length > 0) {
        const totalsByPackage = this.sumByPackage(stored);
        for (const [lotProductId, qty] of totalsByPackage) {
          await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong: { increment: qty } } });
        }
      }
      const updated = await tx.warehouseIssue.update({
        where: { id },
        data: { isVoided: true, voidReason: reason, voidedAt: new Date(), voidedBy: opts.userId ?? null } as any,
        include: { items: slipItemInclude, outboundPlan: { select: { lyDoChenhLech: true } }, materialEvaluation: { select: { id: true } } },
      });
      const { materialEvaluation, outboundPlan, items, ...rest } = updated as any;
      return { ...rest, outboundPlan, items: resolveSlipItems(items), materialEvaluation, isLocked: !!updated.supplyRequestId || !!materialEvaluation };
    });
  }

  async unvoid(id: string) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM business.warehouse_issues WHERE id = ${id} FOR UPDATE`;
      const existing = await tx.warehouseIssue.findUnique({ where: { id }, include: { items: true } });
      if (!existing) throw new NotFoundError('Không tìm thấy phiếu xuất kho');
      if (!(existing as any).isVoided) throw new ConflictError('Phiếu chưa vô hiệu');
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
      const updated = await tx.warehouseIssue.update({
        where: { id },
        data: { isVoided: false, voidReason: null, voidedAt: null, voidedBy: null } as any,
        include: { items: slipItemInclude, outboundPlan: { select: { lyDoChenhLech: true } }, materialEvaluation: { select: { id: true } } },
      });
      const { materialEvaluation, outboundPlan, items, ...rest } = updated as any;
      return { ...rest, outboundPlan, items: resolveSlipItems(items), materialEvaluation, isLocked: !!updated.supplyRequestId || !!materialEvaluation };
    });
  }
}

export default new WarehouseIssueService();
