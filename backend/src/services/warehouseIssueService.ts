import { Prisma } from '@prisma/client';
import prisma from '@config/database';
import { nextYearlyCode, yearlyCodeWhere } from '../utils/codeGenerator';
import reorderRuleService from './reorderRuleService';
import { ValidationError, ConflictError, NotFoundError } from '@utils/errors';
import {
  assertLinesFitStock,
  computeHeaderTotals,
  computeSequentialSnapshots,
  diffLines,
  type PackageBalance,
} from '@utils/warehouseSlipLines';

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
  items: IssueLineInput[];
}

export interface UpdateIssueInput {
  ngayXuat?: Date | string;
  ghiChu?: string;
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
  async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await prisma.warehouseIssue.findFirst({
      where: { maPhieuXuat: yearlyCodeWhere('PX', year) },
      orderBy: { maPhieuXuat: 'desc' },
      select: { maPhieuXuat: true },
    });
    return nextYearlyCode(last?.maPhieuXuat ?? null, 'PX', year);
  }

  // ─── Line helpers ───────────────────────────────────────────────────────────

  /** Reject an empty line array, a missing package, and any non-positive quantity — before any write. */
  private assertLinesPresent(items: IssueLineInput[] | undefined): ResolvedLine[] {
    if (!items || items.length === 0) {
      throw new ValidationError('Phiếu xuất kho phải có ít nhất một mặt hàng');
    }
    return items.map((line, index) => {
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
  }

  /**
   * Load current balances for every package the operation touches, inside the
   * transaction. `internationalProductId` rides along so the reorder-rule check
   * can be deduped per product afterwards.
   */
  private async loadBalances(
    client: PrismaClientLike,
    lotProductIds: string[]
  ): Promise<Map<string, PackageBalance & { internationalProductId: string }>> {
    const ids = [...new Set(lotProductIds)];
    if (ids.length === 0) return new Map();

    const rows = await client.lotProduct.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        soLuong: true,
        donViTinh: true,
        internationalProductId: true,
        internationalProduct: { select: { tenSanPham: true } },
      },
    });

    const balances = new Map<string, PackageBalance & { internationalProductId: string }>();
    for (const row of rows) {
      balances.set(row.id, {
        soLuong: row.soLuong,
        donViTinh: row.donViTinh,
        tenSanPham: row.internationalProduct?.tenSanPham,
        internationalProductId: row.internationalProductId,
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
    return {
      stt,
      lotProductId: line.lotProductId,
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

  async getAll() {
    const issues = await prisma.warehouseIssue.findMany({
      orderBy: { ngayXuat: 'desc' },
      include: {
        // Lines are part of the list contract: the list table renders one row per
        // commodity line, so omitting them silently hides every line but the first.
        items: { orderBy: { stt: 'asc' } },
        materialEvaluation: { select: { id: true } },
      },
    });
    return issues.map((issue) => {
      const { materialEvaluation, ...rest } = issue;
      return {
        ...rest,
        // An issue is locked by either link — supply request or material evaluation.
        isLocked: !!issue.supplyRequestId || !!materialEvaluation,
      };
    });
  }

  async getById(id: string) {
    const issue = await prisma.warehouseIssue.findUnique({
      where: { id },
      include: {
        items: { orderBy: { stt: 'asc' } },
        materialEvaluation: { select: { id: true } },
      },
    });
    if (!issue) {
      throw new NotFoundError('Không tìm thấy phiếu xuất kho');
    }
    const { materialEvaluation, ...rest } = issue;
    return {
      ...rest,
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
    const items = this.assertLinesPresent(normalized.items);

    // One code per slip — generated once, outside the per-line path.
    const maPhieuXuat = normalized.maPhieuXuat ?? (await this.generateCode());

    const { issue, balances, lotProductIds } = await prisma.$transaction(async (tx) => {
      const lotProductIds = items.map((line) => line.lotProductId);
      const balances = await this.loadBalances(tx, lotProductIds);

      // Aggregate-by-package guard across every group, before anything is written.
      assertLinesFitStock(items, balances);

      const { lines, closingBalances } = computeSequentialSnapshots(items, balances, 'OUT');
      const totals = computeHeaderTotals(lines);

      const issue = await tx.warehouseIssue.create({
        data: {
          maPhieuXuat,
          employeeId: normalized.employeeId,
          maNhanVien: normalized.maNhanVien ?? '',
          tenNhanVien: normalized.tenNhanVien ?? '',
          ...(normalized.ngayXuat ? { ngayXuat: new Date(normalized.ngayXuat) } : {}),
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

      for (const [lotProductId, soLuong] of closingBalances) {
        await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong } });
      }

      return { issue, balances, lotProductIds };
    });

    this.notifyReorderRules(lotProductIds, balances);

    return { ...issue, isLocked: !!issue.supplyRequestId };
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
    const items = this.assertLinesPresent(normalized.items);
    const stored = existing.items ?? [];

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

      // Reversal credits stock back, so the available balance grows first.
      const afterReversal = new Map<string, PackageBalance & { internationalProductId: string }>();
      for (const [lotProductId, balance] of balances) {
        afterReversal.set(lotProductId, {
          ...balance,
          soLuong: balance.soLuong + (reversals.get(lotProductId) ?? 0),
        });
      }

      // Aggregate guard over the resolved set, before any write.
      assertLinesFitStock(items, afterReversal);

      const { lines, closingBalances } = computeSequentialSnapshots(items, afterReversal, 'OUT');
      const totals = computeHeaderTotals(lines);

      if (diff.removed.length > 0) {
        await tx.warehouseIssueItem.deleteMany({
          where: { id: { in: diff.removed.map((line) => line.id) } },
        });
      }

      const storedIds = new Set(stored.map((line) => line.id));
      for (const [index, line] of lines.entries()) {
        const data = this.lineData(line, index + 1);
        if (line.id && storedIds.has(line.id)) {
          await tx.warehouseIssueItem.update({ where: { id: line.id }, data });
        } else {
          await tx.warehouseIssueItem.create({ data: { ...data, issueId: id } });
        }
      }

      // A package touched only by a reversal settles at its post-reversal balance.
      for (const [lotProductId, balance] of afterReversal) {
        const soLuong = closingBalances.get(lotProductId) ?? balance.soLuong;
        await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong } });
      }

      const updated = await tx.warehouseIssue.update({
        where: { id },
        data: {
          ...(normalized.ngayXuat ? { ngayXuat: new Date(normalized.ngayXuat) } : {}),
          ghiChu: normalized.ghiChu,
          ...totals,
          ...this.mirrorFirstLine(lines[0]),
        },
        include: { items: { orderBy: { stt: 'asc' } } },
      });

      return { updated, balances, lotProductIds: [...afterReversal.keys()] };
    });

    this.notifyReorderRules(lotProductIds, balances);

    return { ...updated, isLocked: !!updated.supplyRequestId };
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
        const balances = await this.loadBalances(
          tx,
          stored.map((line) => line.lotProductId)
        );

        for (const [lotProductId, quantity] of refunds) {
          const balance = balances.get(lotProductId);
          if (!balance) {
            throw new ValidationError(`Không tìm thấy kiện hàng ${lotProductId} trong kho`);
          }
          await tx.lotProduct.update({
            where: { id: lotProductId },
            data: { soLuong: balance.soLuong + quantity },
          });
        }
      }

      // Lines are removed by cascade.
      await tx.warehouseIssue.delete({ where: { id } });

      return { id };
    });
  }
}

export default new WarehouseIssueService();
