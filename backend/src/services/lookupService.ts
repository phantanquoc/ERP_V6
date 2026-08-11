import prisma from '@config/database';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';
import { slugifyToUpperCode } from '@utils/permissions';
import { cacheGet, cacheSet, cacheDel } from '@utils/cache';
import type { Lookup, LookupChangeLog, Prisma } from '@prisma/client';

/**
 * Cache key for a group's active lookups.
 *
 * Group names are fixed UPPER_SNAKE_CASE identifiers, so they are safe to interpolate.
 */
const lookupCacheKey = (group: string) => `cache:lookups:${group}`;

/**
 * Lookups are reference data — a handful of edits per year — so a long TTL is
 * appropriate. Correctness does not depend on it: every write path calls
 * `invalidateGroup`, and the TTL only bounds staleness if a cache-delete is ever lost
 * (e.g. Redis restarted mid-write).
 */
const LOOKUP_CACHE_TTL = 3600; // 1 hour

/**
 * Shared lookup (classification) service — change: shared-lookup-table.
 *
 * The dangerous operation here is `cascadeRename`, which rewrites a label across
 * up to 21 columns in 20 tables. Invariants that MUST hold:
 *
 *  1. Every write of a cascade — the column updates, the `lookups.label` update and
 *     the `lookup_change_logs` audit row — happens inside ONE `prisma.$transaction`.
 *     A failure anywhere rolls back the data AND the audit trail together, so a
 *     partial rename can never be observed and can never be silently logged.
 *  2. Matching is on `label`, NEVER on `code`. Batch A disambiguated colliding codes
 *     with numeric suffixes (`DON_VI_TINH_KG` / `_KG_2` / `_KG_3` for `Kg` / `kg` / `KG`),
 *     so `code` no longer identifies the stored string. `label` does.
 *  3. WHERE clauses match the label EXACTLY, never trimmed. `LOAI_CHI_PHI` contains a
 *     real value with a trailing space (`'sản xuất '`); trimming would miss that row.
 *  4. Hard delete does not exist. `softDelete` sets `isActive=false` and refuses while
 *     the label is still in use.
 *  5. Only the columns in LOOKUP_COLUMN_MAP are ever written.
 */

/** Lookup group identifiers. Keep in sync with LOOKUP_GROUPS in prisma/seed-data/lookups.ts. */
export const LOOKUP_GROUPS = {
  DON_VI_TINH: 'DON_VI_TINH',
  PHAN_LOAI_VAT_TU: 'PHAN_LOAI_VAT_TU',
  LOAI_CHI_PHI: 'LOAI_CHI_PHI',
  LOAI_CHI_PHI_XUAT_KHAU: 'LOAI_CHI_PHI_XUAT_KHAU',
  KHU_VUC: 'KHU_VUC',
  MUC_DO_LOI: 'MUC_DO_LOI',
  LOAI_LOI: 'LOAI_LOI',
  LOAI_SAN_PHAM: 'LOAI_SAN_PHAM',
  LOAI_KHACH_HANG: 'LOAI_KHACH_HANG',
  VAI_TRO_DU_AN: 'VAI_TRO_DU_AN',
  DON_VI_TIEN: 'DON_VI_TIEN',
} as const;

export type LookupGroup = (typeof LOOKUP_GROUPS)[keyof typeof LOOKUP_GROUPS];

/**
 * One physical column that stores a lookup label as a free string.
 *
 * `model` is the Prisma client delegate key (camelCase) — we go through the Prisma
 * client rather than raw SQL on purpose, so that `@map`ped fields resolve correctly
 * and every column name is checked at build time.
 *
 * `column` is the PRISMA FIELD name. `dbColumn` records the real Postgres column when
 * the two differ, for documentation and for the rollback SQL an admin may need to
 * hand-write from the audit trail.
 */
export interface LookupColumnRef {
  /** Prisma client delegate key, e.g. 'supplyRequestItem'. */
  model: string;
  /** Prisma field name used in where/data clauses, e.g. 'donViTinh'. */
  column: string;
  /** Reported table name, schema-qualified, e.g. 'business.supply_request_items'. */
  table: string;
  /** Real Postgres column, present only when it differs from `column`. */
  dbColumn?: string;
}

/**
 * Hard-coded group → column mapping (design.md Decision 2).
 *
 * VERIFIED 2026-08-03 against backend/prisma/schema/*.prisma: every model delegate and
 * field below exists. Tables `labor_norms`, `cost_standards` and `invoice_items` are
 * deliberately absent — they do not exist in this schema.
 *
 * Excluded on purpose:
 *  - `donViTien` on general_costs / export_costs → belongs to group DON_VI_TIEN.
 *  - `donViDinhMucLaoDong`, `donViNangSuat` → hold compound units (`kg/phút`,
 *    `người/hệ`) and case variants; out of scope for this change.
 */
export const LOOKUP_COLUMN_MAP: Record<LookupGroup, LookupColumnRef[]> = {
  // 21 columns across 20 tables.
  DON_VI_TINH: [
    { model: 'internationalProduct', column: 'donViTinh', table: 'business.international_products' },
    {
      model: 'quotationRequestItem',
      column: 'donViTinh',
      table: 'business.quotation_request_items',
    },
    { model: 'quotation', column: 'donViTinh', table: 'business.quotations' },
    { model: 'generalCost', column: 'donViTinh', table: 'business.general_costs' },
    { model: 'exportCost', column: 'donViTinh', table: 'business.export_costs' },
    {
      model: 'quotationCalculatorProduct',
      column: 'donViTinh',
      table: 'business.quotation_calculator_products',
    },
    {
      model: 'quotationCalculatorGeneralCost',
      column: 'donViTinh',
      table: 'business.quotation_calculator_general_costs',
    },
    {
      model: 'quotationCalculatorExportCost',
      column: 'donViTinh',
      table: 'business.quotation_calculator_export_costs',
    },
    { model: 'supplyRequest', column: 'donViTinh', table: 'business.supply_requests' },
    { model: 'supplyRequestItem', column: 'donViTinh', table: 'business.supply_request_items' },
    { model: 'purchaseRequest', column: 'donViTinh', table: 'business.purchase_requests' },
    { model: 'purchaseRequestItem', column: 'donViTinh', table: 'business.purchase_request_items' },
    { model: 'lotProduct', column: 'donViTinh', table: 'business.lot_products' },
    // Slip units live on the LINE tables now that warehouse slips are header+lines.
    // The header columns still exist but are `@deprecated` mirrors of the first line:
    // targeting them would rename a mirror while leaving every real line stale, and
    // lines 2..N of a multi-line slip would never be renamed at all — zero rows
    // updated, no error raised. Covered by a dedicated test.
    {
      model: 'warehouseReceiptItem',
      column: 'donViTinh',
      table: 'business.warehouse_receipt_items',
    },
    { model: 'warehouseIssueItem', column: 'donViTinh', table: 'business.warehouse_issue_items' },
    { model: 'orderItem', column: 'donVi', table: 'business.order_items' },
    { model: 'sparePart', column: 'donVi', table: 'business.spare_parts' },
    { model: 'projectCost', column: 'donVi', table: 'business.project_costs' },
    { model: 'processFlowchartCost', column: 'donVi', table: 'common.process_flowchart_costs' },
    {
      model: 'productionFlowchartCost',
      column: 'donVi',
      table: 'common.production_flowchart_costs',
    },
    // TaxReport.donViTinh is `@map("donVi")` — the Prisma field name and the real
    // Postgres column drifted apart. Going through the Prisma client means we pass the
    // FIELD name (`donViTinh`) and Prisma emits the real column (`"donVi"`). Passing
    // `donVi` here, or writing raw SQL against `"donViTinh"`, would update ZERO rows
    // without raising an error — a silent no-op. Covered by a dedicated test.
    { model: 'taxReport', column: 'donViTinh', table: 'business.tax_reports', dbColumn: 'donVi' },
  ],

  PHAN_LOAI_VAT_TU: [
    { model: 'supplyRequest', column: 'phanLoai', table: 'business.supply_requests' },
    { model: 'supplyRequestItem', column: 'phanLoai', table: 'business.supply_request_items' },
    { model: 'purchaseRequest', column: 'phanLoai', table: 'business.purchase_requests' },
    { model: 'purchaseRequestItem', column: 'phanLoai', table: 'business.purchase_request_items' },
  ],

  LOAI_CHI_PHI: [
    { model: 'projectCost', column: 'loaiChiPhi', table: 'business.project_costs' },
    { model: 'generalCost', column: 'loaiChiPhi', table: 'business.general_costs' },
    // Shared with LOAI_CHI_PHI_XUAT_KHAU. Each group lists it exactly once, so one
    // cascade touches each row exactly once and usage is never double-counted.
    { model: 'exportCost', column: 'loaiChiPhi', table: 'business.export_costs' },
    { model: 'debt', column: 'loaiChiPhi', table: 'business.debts' },
    {
      model: 'processFlowchartCost',
      column: 'loaiChiPhi',
      table: 'common.process_flowchart_costs',
    },
    {
      model: 'productionFlowchartCost',
      column: 'loaiChiPhi',
      table: 'common.production_flowchart_costs',
    },
  ],

  // Shares business.export_costs.loaiChiPhi with LOAI_CHI_PHI (see spec: overlapping column).
  LOAI_CHI_PHI_XUAT_KHAU: [
    { model: 'exportCost', column: 'loaiChiPhi', table: 'business.export_costs' },
  ],

  KHU_VUC: [{ model: 'machineSystem', column: 'khuVuc', table: 'business.machine_systems' }],

  MUC_DO_LOI: [
    { model: 'faultTemplate', column: 'mucDo', table: 'business.fault_templates' },
    { model: 'faultRecord', column: 'mucDo', table: 'business.fault_records' },
  ],

  LOAI_LOI: [
    { model: 'repairRequest', column: 'loaiLoi', table: 'common.repair_requests' },
    { model: 'repairRequestItem', column: 'loaiLoi', table: 'common.repair_request_items' },
  ],

  LOAI_SAN_PHAM: [
    { model: 'internationalProduct', column: 'loaiSanPham', table: 'business.international_products' },
  ],

  // business.customers is backed by the Prisma model `InternationalCustomer`,
  // NOT a model named `Customer` (which does not exist). Verified against schema.
  LOAI_KHACH_HANG: [
    { model: 'internationalCustomer', column: 'loaiKhachHang', table: 'business.customers' },
  ],

  VAI_TRO_DU_AN: [{ model: 'projectMember', column: 'vaiTro', table: 'business.project_members' }],

  DON_VI_TIEN: [
    { model: 'generalCost', column: 'donViTien', table: 'business.general_costs' },
    { model: 'exportCost', column: 'donViTien', table: 'business.export_costs' },
  ],
};

/** Timeout for the cascade transaction (design.md Q1: synchronous, 30s). */
export const CASCADE_TRANSACTION_TIMEOUT_MS = 30_000;

export interface LookupUsageBreakdownEntry {
  table: string;
  column: string;
  count: number;
}

export interface LookupUsage {
  usageCount: number;
  breakdown: LookupUsageBreakdownEntry[];
}

export interface LookupWithUsage extends Lookup {
  usage: LookupUsage;
}

export interface CreateLookupData {
  group: string;
  label: string;
  sortOrder?: number;
}

export interface UpdateLookupData {
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateLookupOptions {
  /** Required to proceed with a label change that would rewrite existing rows. */
  confirmCascade?: boolean;
  /** Recorded on the audit row. */
  changedByUserId?: string | null;
}

export interface CascadeRequiredDetail {
  oldLabel: string;
  newLabel: string;
  affectedRecords: number;
  requiresConfirmation: true;
}

/**
 * 409 raised when a label change would rewrite business rows and the caller has not
 * yet confirmed. Carries the affected-record detail the UI needs for its dialog.
 */
export class CascadeConfirmationRequiredError extends ConflictError {
  public readonly detail: CascadeRequiredDetail;

  constructor(detail: CascadeRequiredDetail) {
    super(
      `Đổi tên "${detail.oldLabel}" thành "${detail.newLabel}" sẽ cập nhật ${detail.affectedRecords} bản ghi. Vui lòng xác nhận.`
    );
    Object.setPrototypeOf(this, CascadeConfirmationRequiredError.prototype);
    this.detail = detail;
  }
}

/** Minimal shape we need from a Prisma model delegate, for dynamic dispatch. */
interface CountableUpdatableDelegate {
  count(args: { where: Record<string, unknown> }): Promise<number>;
  updateMany(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
}

/** A Prisma client or an interactive-transaction client. */
type PrismaLike = Record<string, unknown>;

function resolveDelegate(client: PrismaLike, ref: LookupColumnRef): CountableUpdatableDelegate {
  const delegate = client[ref.model] as CountableUpdatableDelegate | undefined;
  if (!delegate || typeof delegate.updateMany !== 'function' || typeof delegate.count !== 'function') {
    // A typo in LOOKUP_COLUMN_MAP must fail loudly, never silently skip a table.
    throw new Error(
      `LOOKUP_COLUMN_MAP references unknown Prisma model "${ref.model}" for ${ref.table}.${ref.column}`
    );
  }
  return delegate;
}

/**
 * Return the group's columns with any duplicate (model, column) pair removed.
 * Guarantees a single cascade writes each physical column at most once, and that a
 * usage count can never double-count the same row.
 */
export function getUniqueColumnsForGroup(group: string): LookupColumnRef[] {
  const refs = LOOKUP_COLUMN_MAP[group as LookupGroup];
  if (!refs) return [];

  const seen = new Set<string>();
  const unique: LookupColumnRef[] = [];
  for (const ref of refs) {
    const key = `${ref.model}.${ref.column}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(ref);
  }
  return unique;
}

export class LookupService {
  /**
   * List lookups in a group, ordered by sortOrder then label.
   *
   * Active-only by default. `includeInactive` returns everything (admin view).
   * `includeValue` additionally returns a specific label even when it is inactive —
   * required so an edit form for an existing record can render its stored value
   * instead of silently blanking it (design.md Q2, zero-data-loss).
   */
  async getAll(
    group: string,
    options: { includeInactive?: boolean; includeValue?: string } = {}
  ): Promise<Lookup[]> {
    if (!group || !group.trim()) {
      throw new ValidationError('Nhóm danh mục là bắt buộc');
    }

    const { includeInactive = false, includeValue } = options;

    // Only the plain active-only listing is cached. That is the shape every dropdown in
    // the app requests, it is identical for all users, and lookups change a few times a
    // year at most. The `includeInactive` (admin table) and `includeValue` (edit-form
    // preservation) variants are per-view and comparatively rare — caching them would
    // multiply keys for no real hit rate, so they always read through.
    //
    // `group` must also be a KNOWN group. `group` arrives straight from a query string,
    // so caching arbitrary values would let any caller mint an unbounded number of keys
    // (`?group=aaa`, `?group=aab`, …) — each one an empty array held for an hour. The
    // eviction policy is allkeys-lru, so that would quietly push real cached data out.
    // Unknown groups still return [] as before; they just never reach Redis.
    const isKnownGroup = Object.prototype.hasOwnProperty.call(LOOKUP_COLUMN_MAP, group);
    const cacheable = !includeInactive && !includeValue && isKnownGroup;
    if (cacheable) {
      const cached = await cacheGet<Lookup[]>(lookupCacheKey(group));
      if (cached) return cached;
    }

    const where: Prisma.LookupWhereInput = includeInactive
      ? { group }
      : includeValue
        ? { group, OR: [{ isActive: true }, { label: includeValue }] }
        : { group, isActive: true };

    const rows = await prisma.lookup.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    if (cacheable) {
      await cacheSet(lookupCacheKey(group), rows, LOOKUP_CACHE_TTL);
    }

    return rows;
  }

  /**
   * Drop a group's cached listing after a write.
   *
   * Always called AFTER the transaction commits, never inside it: a rollback would
   * otherwise leave the cache cleared while the data never changed — harmless, but it
   * also means a delete issued inside a doomed transaction is wasted work. Clearing
   * after commit keeps the invariant simple: cache is dropped exactly when data really
   * changed.
   *
   * `cacheDel` swallows its own errors, so a Redis outage degrades to a stale read for
   * at most LOOKUP_CACHE_TTL rather than failing the write the admin just made.
   */
  private async invalidateGroup(group: string): Promise<void> {
    await cacheDel(lookupCacheKey(group));
  }

  /** Get one lookup plus its usage count across every mapped column. */
  async getById(id: string): Promise<LookupWithUsage> {
    const lookup = await prisma.lookup.findUnique({ where: { id } });
    if (!lookup) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }

    const usage = await this.getUsageCount(lookup.id, lookup.group, lookup.label);
    return { ...lookup, usage };
  }

  /**
   * Create a lookup. `code` is auto-generated from the label via slugifyToUpperCode,
   * prefixed with the group name (design.md Decision 5).
   */
  async create(data: CreateLookupData, changedByUserId?: string | null): Promise<Lookup> {
    if (!data.group || !data.group.trim()) {
      throw new ValidationError('Nhóm danh mục là bắt buộc');
    }
    if (!data.label || !data.label.trim()) {
      throw new ValidationError('Tên danh mục là bắt buộc');
    }

    const group = data.group;
    const label = data.label;
    const code = slugifyToUpperCode(label, group);

    const existing = await prisma.lookup.findUnique({
      where: { group_code: { group, code } },
    });
    if (existing) {
      throw new ConflictError('Mã danh mục đã tồn tại trong nhóm này');
    }

    // Audit row is written with the lookup so a create is never unlogged.
    const created = await prisma.$transaction(async (tx) => {
      const created = await tx.lookup.create({
        data: {
          group,
          code,
          label,
          sortOrder: data.sortOrder ?? 0,
          isActive: true,
        },
      });

      await tx.lookupChangeLog.create({
        data: {
          lookupId: created.id,
          group,
          action: 'CREATE',
          oldLabel: null,
          newLabel: created.label,
          affectedRecords: 0,
          affectedTables: [],
          changedByUserId: changedByUserId ?? null,
        },
      });

      return created;
    });

    await this.invalidateGroup(group);
    return created;
  }

  /**
   * Count rows referencing `label` across every column mapped to `group`.
   *
   * Duplicate (model, column) pairs are collapsed first, so a column shared by two
   * groups — `export_costs.loaiChiPhi` is in both LOAI_CHI_PHI and
   * LOAI_CHI_PHI_XUAT_KHAU — contributes its rows once, not twice.
   *
   * The match is exact: no trim, no case folding. `LOAI_CHI_PHI` really does contain
   * `'sản xuất '` with a trailing space, and it must be countable.
   */
  async getUsageCount(lookupId: string, group?: string, label?: string): Promise<LookupUsage> {
    let resolvedGroup = group;
    let resolvedLabel = label;

    if (resolvedGroup === undefined || resolvedLabel === undefined) {
      const lookup = await prisma.lookup.findUnique({ where: { id: lookupId } });
      if (!lookup) {
        throw new NotFoundError('Không tìm thấy danh mục');
      }
      resolvedGroup = lookup.group;
      resolvedLabel = lookup.label;
    }

    const refs = getUniqueColumnsForGroup(resolvedGroup);
    const breakdown: LookupUsageBreakdownEntry[] = [];
    let usageCount = 0;

    for (const ref of refs) {
      const delegate = resolveDelegate(prisma as unknown as PrismaLike, ref);
      const count = await delegate.count({ where: { [ref.column]: resolvedLabel } });
      if (count > 0) {
        breakdown.push({ table: ref.table, column: ref.dbColumn ?? ref.column, count });
        usageCount += count;
      }
    }

    return { usageCount, breakdown };
  }

  /**
   * Update label, sortOrder and/or isActive.
   *
   * A label change with usage > 0 requires `confirmCascade`; without it we raise a 409
   * carrying the affected-record count so the UI can ask the admin first. With it, the
   * work is handed to `cascadeRename`.
   */
  async update(
    id: string,
    data: UpdateLookupData,
    options: UpdateLookupOptions = {}
  ): Promise<Lookup> {
    const lookup = await prisma.lookup.findUnique({ where: { id } });
    if (!lookup) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }

    const changedByUserId = options.changedByUserId ?? null;
    const labelChanged = data.label !== undefined && data.label !== lookup.label;

    if (data.label !== undefined && !data.label.trim()) {
      throw new ValidationError('Tên danh mục là bắt buộc');
    }

    if (labelChanged) {
      const newLabel = data.label as string;
      const { usageCount } = await this.getUsageCount(lookup.id, lookup.group, lookup.label);

      if (usageCount > 0) {
        if (!options.confirmCascade) {
          throw new CascadeConfirmationRequiredError({
            oldLabel: lookup.label,
            newLabel,
            affectedRecords: usageCount,
            requiresConfirmation: true,
          });
        }

        const renamed = await this.cascadeRename(
          lookup.id,
          lookup.label,
          newLabel,
          lookup.group,
          changedByUserId
        );

        // Apply any non-label fields sent alongside the rename.
        const rest = this.buildNonLabelUpdate(data);
        if (Object.keys(rest).length === 0) {
          return renamed;
        }
        return this.applyNonLabelUpdate(lookup, rest, changedByUserId);
      }
    }

    // No cascade needed: plain update plus its audit rows, atomically.
    // The two branches above delegate to cascadeRename / applyNonLabelUpdate, each of
    // which invalidates the group itself — so only this path needs its own call.
    const updated = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.LookupUpdateInput = {};
      if (labelChanged) updateData.label = data.label as string;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      if (Object.keys(updateData).length === 0) {
        return lookup;
      }

      const updated = await tx.lookup.update({ where: { id }, data: updateData });

      if (labelChanged) {
        await tx.lookupChangeLog.create({
          data: {
            lookupId: lookup.id,
            group: lookup.group,
            action: 'UPDATE_LABEL',
            oldLabel: lookup.label,
            newLabel: data.label as string,
            affectedRecords: 0,
            affectedTables: [],
            changedByUserId,
          },
        });
      }

      if (data.sortOrder !== undefined && data.sortOrder !== lookup.sortOrder) {
        await tx.lookupChangeLog.create({
          data: {
            lookupId: lookup.id,
            group: lookup.group,
            action: 'UPDATE_SORT_ORDER',
            oldLabel: lookup.label,
            newLabel: lookup.label,
            affectedRecords: 0,
            affectedTables: [],
            changedByUserId,
          },
        });
      }

      if (data.isActive !== undefined && data.isActive !== lookup.isActive) {
        await tx.lookupChangeLog.create({
          data: {
            lookupId: lookup.id,
            group: lookup.group,
            action: data.isActive ? 'REACTIVATE' : 'SOFT_DELETE',
            oldLabel: lookup.label,
            newLabel: data.isActive ? lookup.label : null,
            affectedRecords: 0,
            affectedTables: [],
            changedByUserId,
          },
        });
      }

      return updated;
    });

    await this.invalidateGroup(lookup.group);
    return updated;
  }

  private buildNonLabelUpdate(data: UpdateLookupData): UpdateLookupData {
    const rest: UpdateLookupData = {};
    if (data.sortOrder !== undefined) rest.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) rest.isActive = data.isActive;
    return rest;
  }

  private async applyNonLabelUpdate(
    lookup: Lookup,
    rest: UpdateLookupData,
    changedByUserId: string | null
  ): Promise<Lookup> {
    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.lookup.update({ where: { id: lookup.id }, data: rest });

      if (rest.sortOrder !== undefined && rest.sortOrder !== lookup.sortOrder) {
        await tx.lookupChangeLog.create({
          data: {
            lookupId: lookup.id,
            group: lookup.group,
            action: 'UPDATE_SORT_ORDER',
            oldLabel: updated.label,
            newLabel: updated.label,
            affectedRecords: 0,
            affectedTables: [],
            changedByUserId,
          },
        });
      }

      if (rest.isActive !== undefined && rest.isActive !== lookup.isActive) {
        await tx.lookupChangeLog.create({
          data: {
            lookupId: lookup.id,
            group: lookup.group,
            action: rest.isActive ? 'REACTIVATE' : 'SOFT_DELETE',
            oldLabel: updated.label,
            newLabel: rest.isActive ? updated.label : null,
            affectedRecords: 0,
            affectedTables: [],
            changedByUserId,
          },
        });
      }

      return updated;
    });

    await this.invalidateGroup(lookup.group);
    return updated;
  }

  /**
   * Rename a label everywhere it is stored, atomically.
   *
   * Everything below runs in ONE interactive transaction: the per-column updateMany
   * calls, the `lookups.label` update, and the audit row. If any single update throws,
   * Prisma rolls the whole transaction back — the label reverts, every touched row
   * reverts, and NO audit row is left behind. There is deliberately no partial-success
   * path and no "log what we managed to do" fallback: a half-applied rename that
   * claims success in the audit trail is worse than a clean failure.
   *
   * Ordering note: the spec lists the audit row first. We write it last, still inside
   * the same transaction, because the real per-table counts only exist after the
   * updates run. Atomicity — the property the requirement exists to guarantee — is
   * identical either way, and this way `affectedRecords` is measured rather than
   * predicted.
   */
  async cascadeRename(
    lookupId: string,
    oldLabel: string,
    newLabel: string,
    group: string,
    changedByUserId?: string | null
  ): Promise<Lookup> {
    if (!newLabel || !newLabel.trim()) {
      throw new ValidationError('Tên danh mục là bắt buộc');
    }
    if (oldLabel === newLabel) {
      throw new ValidationError('Tên mới trùng với tên hiện tại');
    }

    const refs = getUniqueColumnsForGroup(group);

    const renamed = await prisma.$transaction(
      async (tx) => {
        const affectedTables: LookupUsageBreakdownEntry[] = [];
        let affectedRecords = 0;

        for (const ref of refs) {
          const delegate = resolveDelegate(tx as unknown as PrismaLike, ref);
          // Exact match on the old label — never trimmed, never case-folded.
          const result = await delegate.updateMany({
            where: { [ref.column]: oldLabel },
            data: { [ref.column]: newLabel },
          });

          if (result.count > 0) {
            affectedTables.push({
              table: ref.table,
              column: ref.dbColumn ?? ref.column,
              count: result.count,
            });
            affectedRecords += result.count;
          }
        }

        const updated = await tx.lookup.update({
          where: { id: lookupId },
          data: { label: newLabel },
        });

        await tx.lookupChangeLog.create({
          data: {
            lookupId,
            group,
            action: 'CASCADE_RENAME',
            oldLabel,
            newLabel,
            affectedRecords,
            affectedTables: affectedTables as unknown as Prisma.InputJsonValue,
            changedByUserId: changedByUserId ?? null,
          },
        });

        return updated;
      },
      { timeout: CASCADE_TRANSACTION_TIMEOUT_MS, maxWait: 5_000 }
    );

    await this.invalidateGroup(group);
    return renamed;
  }

  /**
   * Soft delete: set isActive=false. Blocked while any row still stores the label.
   * There is no hard-delete method on this service, by design (design.md Decision 4).
   */
  async softDelete(id: string, changedByUserId?: string | null): Promise<Lookup> {
    const lookup = await prisma.lookup.findUnique({ where: { id } });
    if (!lookup) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }

    const { usageCount } = await this.getUsageCount(lookup.id, lookup.group, lookup.label);
    if (usageCount > 0) {
      throw new ConflictError(
        `Không thể xóa — đang được ${usageCount} bản ghi sử dụng. Hãy ẩn thay vì xóa.`
      );
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const updated = await tx.lookup.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.lookupChangeLog.create({
        data: {
          lookupId: lookup.id,
          group: lookup.group,
          action: 'SOFT_DELETE',
          oldLabel: lookup.label,
          newLabel: null,
          affectedRecords: 0,
          affectedTables: [],
          changedByUserId: changedByUserId ?? null,
        },
      });

      return updated;
    });

    await this.invalidateGroup(lookup.group);
    return deleted;
  }

  /** Paginated change history for one lookup or a whole group, newest first. */
  async getHistory(
    filter: { lookupId?: string; group?: string },
    pagination: { page?: number; limit?: number } = {}
  ): Promise<{
    data: LookupChangeLog[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    if (!filter.lookupId && !filter.group) {
      throw new ValidationError('Cần chỉ định danh mục hoặc nhóm danh mục');
    }

    const page = Math.max(1, pagination.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20));

    const where: Prisma.LookupChangeLogWhereInput = {};
    if (filter.lookupId) where.lookupId = filter.lookupId;
    if (filter.group) where.group = filter.group;

    const [data, total] = await Promise.all([
      prisma.lookupChangeLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lookupChangeLog.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

export default new LookupService();
