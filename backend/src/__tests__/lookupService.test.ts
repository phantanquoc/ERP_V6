/**
 * Tests for the shared lookup service (change: shared-lookup-table, group 4).
 *
 * These tests import and exercise the REAL `LookupService`. They deliberately do not
 * re-implement any of its logic: every assertion is about what the service actually
 * does when driven through its public methods.
 *
 * The Prisma mock below is not a bag of `jest.fn()`s — it is a small in-memory
 * database WITH TRANSACTION SEMANTICS. Writes issued against a transaction client are
 * staged in a journal and applied only when the callback returns successfully; if the
 * callback throws, the journal is discarded. That is what makes the rollback test
 * (4.10) meaningful: it proves the service performs every cascade write inside the
 * transaction callback, so a mid-cascade failure leaves the label unchanged and no
 * audit row behind. A mock that applied writes immediately would pass that test even
 * if the service wrote outside the transaction — exactly the bug worth catching.
 */

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {},
}));

import prisma from '@config/database';
import {
  LookupService,
  LOOKUP_COLUMN_MAP,
  CascadeConfirmationRequiredError,
  getUniqueColumnsForGroup,
} from '@services/lookupService';
import { NotFoundError, ValidationError, ConflictError } from '@utils/errors';

type Row = Record<string, unknown>;

interface LookupRow {
  id: string;
  group: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ChangeLogRow extends Row {
  id: string;
  lookupId: string | null;
  group: string;
  action: string;
  oldLabel: string | null;
  newLabel: string | null;
  affectedRecords: number;
  affectedTables: unknown;
  changedByUserId: string | null;
  createdAt: Date;
}

/** Every Prisma delegate key referenced by the column map, plus the lookup tables. */
const MODEL_KEYS: string[] = Array.from(
  new Set(
    Object.values(LOOKUP_COLUMN_MAP)
      .flat()
      .map((ref) => ref.model)
  )
);

interface Store {
  lookups: LookupRow[];
  changeLogs: ChangeLogRow[];
  tables: Record<string, Row[]>;
  /** When set, updateMany against this model throws — used to inject mid-cascade failure. */
  failOnModel?: string;
  /**
   * When set, the audit-log write throws. Injected via the store rather than by
   * patching `prisma.lookupChangeLog`, because the service correctly writes through
   * the TRANSACTION client, which is built fresh per transaction.
   */
  failOnAuditWrite?: boolean;
  /** Records the (model, field) pairs updateMany was invoked with, in order. */
  updateManyCalls: Array<{ model: string; field: string; from: unknown; to: unknown }>;
}

let store: Store;
let idCounter: number;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function matches(row: Row, where: Record<string, unknown>): boolean {
  // Exact equality only — no trimming, no case folding. Mirrors Postgres `=` on text.
  return Object.entries(where).every(([k, v]) => row[k] === v);
}

/**
 * Build a client. When `journal` is provided the client is a transaction client:
 * mutations are appended to the journal instead of being applied.
 */
function buildClient(journal?: Array<() => void>): Record<string, unknown> {
  const stage = (fn: () => void): void => {
    if (journal) journal.push(fn);
    else fn();
  };

  const client: Record<string, unknown> = {};

  for (const model of MODEL_KEYS) {
    client[model] = {
      count: async ({ where }: { where: Record<string, unknown> }) =>
        (store.tables[model] ?? []).filter((r) => matches(r, where)).length,

      updateMany: async ({
        where,
        data,
      }: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => {
        const field = Object.keys(where)[0];
        store.updateManyCalls.push({
          model,
          field,
          from: where[field],
          to: data[field],
        });

        if (store.failOnModel === model) {
          throw new Error(`injected failure updating ${model}`);
        }

        const rows = (store.tables[model] ?? []).filter((r) => matches(r, where));
        stage(() => {
          for (const r of rows) Object.assign(r, data);
        });
        return { count: rows.length };
      },
    };
  }

  client.lookup = {
    findUnique: async ({ where }: { where: { id?: string; group_code?: { group: string; code: string } } }) => {
      if (where.id !== undefined) {
        return store.lookups.find((l) => l.id === where.id) ?? null;
      }
      if (where.group_code) {
        const { group, code } = where.group_code;
        return store.lookups.find((l) => l.group === group && l.code === code) ?? null;
      }
      return null;
    },

    findMany: async ({ where }: { where: Record<string, unknown> }) => {
      let rows = store.lookups.filter((l) => l.group === where.group);
      if (where.isActive === true) {
        rows = rows.filter((l) => l.isActive);
      } else if (Array.isArray(where.OR)) {
        const or = where.OR as Array<Record<string, unknown>>;
        rows = rows.filter((l) =>
          or.some((cond) =>
            Object.entries(cond).every(([k, v]) => (l as unknown as Row)[k] === v)
          )
        );
      }
      return [...rows].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
      );
    },

    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row: LookupRow = {
        id: nextId('lk'),
        group: data.group as string,
        code: data.code as string,
        label: data.label as string,
        sortOrder: (data.sortOrder as number) ?? 0,
        isActive: (data.isActive as boolean) ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      stage(() => {
        store.lookups.push(row);
      });
      return row;
    },

    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = store.lookups.find((l) => l.id === where.id);
      if (!row) throw new Error(`lookup ${where.id} not found`);
      const merged = { ...row, ...data, updatedAt: new Date() } as LookupRow;
      stage(() => {
        Object.assign(row, data, { updatedAt: new Date() });
      });
      return merged;
    },
  };

  client.lookupChangeLog = {
    create: async ({ data }: { data: Record<string, unknown> }) => {
      if (store.failOnAuditWrite) {
        throw new Error('audit write failed');
      }
      const row = { id: nextId('log'), createdAt: new Date(), ...data } as ChangeLogRow;
      stage(() => {
        store.changeLogs.push(row);
      });
      return row;
    },

    findMany: async ({
      where,
      skip = 0,
      take = 20,
    }: {
      where: Record<string, unknown>;
      skip?: number;
      take?: number;
    }) =>
      store.changeLogs
        .filter((l) => matches(l, where))
        .slice()
        .reverse()
        .slice(skip, skip + take),

    count: async ({ where }: { where: Record<string, unknown> }) =>
      store.changeLogs.filter((l) => matches(l, where)).length,
  };

  return client;
}

function installPrismaFake(): void {
  const base = buildClient();

  const $transaction = async <T>(
    arg: ((tx: unknown) => Promise<T>) | Array<Promise<T>>
  ): Promise<T | T[]> => {
    if (Array.isArray(arg)) return Promise.all(arg);
    const journal: Array<() => void> = [];
    const tx = buildClient(journal);
    // If the callback throws, we never reach the commit loop — the journal is
    // discarded and the store is left exactly as it was.
    const result = await arg(tx);
    for (const apply of journal) apply();
    return result;
  };

  // Wipe any properties from a previous test, then install fresh ones.
  for (const key of Object.keys(prisma as unknown as Row)) {
    delete (prisma as unknown as Row)[key];
  }
  Object.assign(prisma as unknown as Row, base, { $transaction });
}

function seedLookup(overrides: Partial<LookupRow> = {}): LookupRow {
  const row: LookupRow = {
    id: overrides.id ?? nextId('lk'),
    group: overrides.group ?? 'DON_VI_TINH',
    code: overrides.code ?? 'DON_VI_TINH_KG',
    label: overrides.label ?? 'Kg',
    sortOrder: overrides.sortOrder ?? 0,
    isActive: overrides.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  store.lookups.push(row);
  return row;
}

function seedRows(model: string, rows: Row[]): void {
  store.tables[model] = [...(store.tables[model] ?? []), ...rows];
}

const service = new LookupService();

beforeEach(() => {
  idCounter = 0;
  store = {
    lookups: [],
    changeLogs: [],
    tables: {},
    updateManyCalls: [],
  };
  for (const model of MODEL_KEYS) store.tables[model] = [];
  installPrismaFake();
});

// ---------------------------------------------------------------------------
// Column map integrity — guards the map itself before any behaviour is tested.
// ---------------------------------------------------------------------------

describe('LOOKUP_COLUMN_MAP', () => {
  it('maps DON_VI_TINH to exactly 21 columns', () => {
    expect(LOOKUP_COLUMN_MAP.DON_VI_TINH).toHaveLength(21);
  });

  it('maps each remaining group to the exact column count from the spec', () => {
    expect(LOOKUP_COLUMN_MAP.PHAN_LOAI_VAT_TU).toHaveLength(4);
    expect(LOOKUP_COLUMN_MAP.LOAI_CHI_PHI).toHaveLength(6);
    expect(LOOKUP_COLUMN_MAP.MUC_DO_LOI).toHaveLength(2);
    expect(LOOKUP_COLUMN_MAP.LOAI_LOI).toHaveLength(2);
    expect(LOOKUP_COLUMN_MAP.DON_VI_TIEN).toHaveLength(2);
    expect(LOOKUP_COLUMN_MAP.KHU_VUC).toHaveLength(1);
    expect(LOOKUP_COLUMN_MAP.LOAI_SAN_PHAM).toHaveLength(1);
    expect(LOOKUP_COLUMN_MAP.LOAI_KHACH_HANG).toHaveLength(1);
    expect(LOOKUP_COLUMN_MAP.VAI_TRO_DU_AN).toHaveLength(1);
    expect(LOOKUP_COLUMN_MAP.LOAI_CHI_PHI_XUAT_KHAU).toHaveLength(1);
  });

  it('never maps a group to the same (model, column) pair twice', () => {
    for (const group of Object.keys(LOOKUP_COLUMN_MAP)) {
      const refs = LOOKUP_COLUMN_MAP[group as keyof typeof LOOKUP_COLUMN_MAP];
      const keys = refs.map((r) => `${r.model}.${r.column}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('excludes donViTien and the compound-unit columns from DON_VI_TINH', () => {
    const cols = LOOKUP_COLUMN_MAP.DON_VI_TINH.map((r) => r.column);
    expect(cols).not.toContain('donViTien');
    expect(cols).not.toContain('donViDinhMucLaoDong');
    expect(cols).not.toContain('donViNangSuat');
  });

  it('records the real Postgres column for tax_reports, whose Prisma field is @map("donVi")', () => {
    const ref = LOOKUP_COLUMN_MAP.DON_VI_TINH.find((r) => r.model === 'taxReport');
    // The Prisma field name must be used in queries; the physical column differs.
    expect(ref?.column).toBe('donViTinh');
    expect(ref?.dbColumn).toBe('donVi');
  });
});

// ---------------------------------------------------------------------------
// 4.2 / 4.3 — create
// ---------------------------------------------------------------------------

describe('create', () => {
  it('4.2 creates a lookup with an auto-generated code from the label', async () => {
    const created = await service.create({ group: 'DON_VI_TINH', label: 'Chai' });

    expect(created.code).toBe('DON_VI_TINH_CHAI');
    expect(created.label).toBe('Chai');
    expect(created.sortOrder).toBe(0);
    expect(created.isActive).toBe(true);
    expect(store.lookups).toHaveLength(1);
  });

  it('4.2 strips Vietnamese diacritics when generating the code', async () => {
    const created = await service.create({ group: 'DON_VI_TINH', label: 'Đôi' });
    expect(created.code).toBe('DON_VI_TINH_DOI');
  });

  it('4.2 writes a CREATE audit row in the same transaction', async () => {
    const created = await service.create({ group: 'DON_VI_TINH', label: 'Chai' }, 'user-1');

    expect(store.changeLogs).toHaveLength(1);
    expect(store.changeLogs[0]).toMatchObject({
      lookupId: created.id,
      group: 'DON_VI_TINH',
      action: 'CREATE',
      oldLabel: null,
      newLabel: 'Chai',
      affectedRecords: 0,
      changedByUserId: 'user-1',
    });
  });

  it('4.3 throws ConflictError when the generated code already exists in the group', async () => {
    seedLookup({ group: 'DON_VI_TINH', code: 'DON_VI_TINH_CHAI', label: 'Chai' });

    await expect(service.create({ group: 'DON_VI_TINH', label: 'Chai' })).rejects.toThrow(
      ConflictError
    );
    expect(store.lookups).toHaveLength(1);
    expect(store.changeLogs).toHaveLength(0);
  });

  it('4.3 allows the same code in a different group', async () => {
    seedLookup({ group: 'DON_VI_TINH', code: 'DON_VI_TINH_KHAC', label: 'Khác' });

    const created = await service.create({ group: 'LOAI_CHI_PHI', label: 'Khác' });
    expect(created.code).toBe('LOAI_CHI_PHI_KHAC');
  });

  it('rejects a blank label', async () => {
    await expect(service.create({ group: 'DON_VI_TINH', label: '   ' })).rejects.toThrow(
      ValidationError
    );
  });
});

// ---------------------------------------------------------------------------
// 4.4 / 4.5 — usage counting
// ---------------------------------------------------------------------------

describe('getUsageCount', () => {
  it('4.4 returns 0 with an empty breakdown for an unused lookup', async () => {
    const lk = seedLookup({ label: 'Mét' });

    const usage = await service.getUsageCount(lk.id);

    expect(usage.usageCount).toBe(0);
    expect(usage.breakdown).toEqual([]);
  });

  it('4.5 counts across DON_VI_TINH columns in five different tables', async () => {
    const lk = seedLookup({ label: 'Kg' });

    seedRows('supplyRequestItem', [{ donViTinh: 'Kg' }, { donViTinh: 'Kg' }, { donViTinh: 'Tấn' }]);
    seedRows('purchaseRequestItem', [{ donViTinh: 'Kg' }]);
    seedRows('lotProduct', [{ donViTinh: 'Kg' }, { donViTinh: 'Kg' }]);
    seedRows('orderItem', [{ donVi: 'Kg' }]);
    seedRows('processFlowchartCost', [{ donVi: 'Kg' }, { donVi: 'Cái' }]);

    const usage = await service.getUsageCount(lk.id);

    expect(usage.usageCount).toBe(7);
    expect(usage.breakdown).toEqual(
      expect.arrayContaining([
        { table: 'business.supply_request_items', column: 'donViTinh', count: 2 },
        { table: 'business.purchase_request_items', column: 'donViTinh', count: 1 },
        { table: 'business.lot_products', column: 'donViTinh', count: 2 },
        { table: 'business.order_items', column: 'donVi', count: 1 },
        { table: 'common.process_flowchart_costs', column: 'donVi', count: 1 },
      ])
    );
    // Tables with no matching rows are omitted, not reported as zero.
    expect(usage.breakdown).toHaveLength(5);
  });

  it('4.5 queries every one of the 21 DON_VI_TINH columns', async () => {
    const lk = seedLookup({ label: 'Kg' });
    const counted: Array<{ model: string; field: string }> = [];

    for (const ref of LOOKUP_COLUMN_MAP.DON_VI_TINH) {
      const delegate = (prisma as unknown as Record<string, { count: unknown }>)[ref.model];
      const original = delegate.count as (a: { where: Record<string, unknown> }) => Promise<number>;
      delegate.count = async (args: { where: Record<string, unknown> }) => {
        counted.push({ model: ref.model, field: Object.keys(args.where)[0] });
        return original(args);
      };
    }

    await service.getUsageCount(lk.id);

    expect(counted).toHaveLength(21);
    expect(counted).toEqual(
      expect.arrayContaining(
        LOOKUP_COLUMN_MAP.DON_VI_TINH.map((r) => ({ model: r.model, field: r.column }))
      )
    );
  });

  it('counts a label with a trailing space exactly, without trimming', async () => {
    // LOAI_CHI_PHI genuinely contains 'sản xuất ' (trailing space) in production.
    const lk = seedLookup({
      group: 'LOAI_CHI_PHI',
      code: 'LOAI_CHI_PHI_SAN_XUAT_2',
      label: 'sản xuất ',
    });

    seedRows('generalCost', [
      { loaiChiPhi: 'sản xuất ' },
      { loaiChiPhi: 'sản xuất' }, // the trimmed variant is a DIFFERENT value
    ]);

    const usage = await service.getUsageCount(lk.id);

    expect(usage.usageCount).toBe(1);
    expect(usage.breakdown).toEqual([
      { table: 'business.general_costs', column: 'loaiChiPhi', count: 1 },
    ]);
  });

  it('does not double-count export_costs.loaiChiPhi, shared by two groups', async () => {
    seedRows('exportCost', [
      { loaiChiPhi: 'Chi phí xuất khẩu' },
      { loaiChiPhi: 'Chi phí xuất khẩu' },
      { loaiChiPhi: 'Chi phí xuất khẩu' },
    ]);

    const viaExportGroup = seedLookup({
      group: 'LOAI_CHI_PHI_XUAT_KHAU',
      code: 'LOAI_CHI_PHI_XUAT_KHAU_CHI_PHI_XUAT_KHAU',
      label: 'Chi phí xuất khẩu',
    });
    const viaCostGroup = seedLookup({
      group: 'LOAI_CHI_PHI',
      code: 'LOAI_CHI_PHI_CHI_PHI_XUAT_KHAU',
      label: 'Chi phí xuất khẩu',
    });

    // Each group sees the 3 rows once — never 6.
    await expect(service.getUsageCount(viaExportGroup.id)).resolves.toMatchObject({
      usageCount: 3,
    });
    await expect(service.getUsageCount(viaCostGroup.id)).resolves.toMatchObject({
      usageCount: 3,
    });
  });

  it('throws NotFoundError for an unknown lookup id', async () => {
    await expect(service.getUsageCount('nope')).rejects.toThrow(NotFoundError);
  });

  it('returns 0 for a group with no mapped columns', async () => {
    const lk = seedLookup({ group: 'UNMAPPED_GROUP', code: 'X', label: 'X' });
    await expect(service.getUsageCount(lk.id)).resolves.toEqual({
      usageCount: 0,
      breakdown: [],
    });
  });
});

// ---------------------------------------------------------------------------
// 4.6 / 4.7 — update and cascade gating
// ---------------------------------------------------------------------------

describe('update', () => {
  it('4.6 updates the label directly when usageCount is 0', async () => {
    const lk = seedLookup({ label: 'Kg' });

    const updated = await service.update(lk.id, { label: 'Kilogram' });

    expect(updated.label).toBe('Kilogram');
    expect(store.lookups[0].label).toBe('Kilogram');
    expect(store.changeLogs).toHaveLength(1);
    expect(store.changeLogs[0]).toMatchObject({
      action: 'UPDATE_LABEL',
      oldLabel: 'Kg',
      newLabel: 'Kilogram',
      affectedRecords: 0,
    });
    // No business table was touched.
    expect(store.updateManyCalls).toHaveLength(0);
  });

  it('4.7 throws a 409 with the affected count when usageCount > 0 and confirmCascade is absent', async () => {
    const lk = seedLookup({ label: 'Kg' });
    seedRows('supplyRequestItem', [{ donViTinh: 'Kg' }, { donViTinh: 'Kg' }]);
    seedRows('lotProduct', [{ donViTinh: 'Kg' }]);

    const err = await service.update(lk.id, { label: 'kg' }).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(CascadeConfirmationRequiredError);
    const cascadeErr = err as CascadeConfirmationRequiredError;
    expect(cascadeErr.statusCode).toBe(409);
    expect(cascadeErr.detail).toEqual({
      oldLabel: 'Kg',
      newLabel: 'kg',
      affectedRecords: 3,
      requiresConfirmation: true,
    });
    expect(cascadeErr.message).toContain('3 bản ghi');

    // Nothing changed.
    expect(store.lookups[0].label).toBe('Kg');
    expect(store.changeLogs).toHaveLength(0);
    expect(store.tables.supplyRequestItem.every((r) => r.donViTinh === 'Kg')).toBe(true);
  });

  it('4.7 proceeds with the cascade when confirmCascade is set', async () => {
    const lk = seedLookup({ label: 'Kg' });
    seedRows('supplyRequestItem', [{ donViTinh: 'Kg' }]);

    const updated = await service.update(lk.id, { label: 'kg' }, { confirmCascade: true });

    expect(updated.label).toBe('kg');
    expect(store.tables.supplyRequestItem[0].donViTinh).toBe('kg');
  });

  it('updates sortOrder and logs UPDATE_SORT_ORDER', async () => {
    const lk = seedLookup({ label: 'Kg', sortOrder: 0 });

    const updated = await service.update(lk.id, { sortOrder: 10 });

    expect(updated.sortOrder).toBe(10);
    expect(store.changeLogs.map((l) => l.action)).toEqual(['UPDATE_SORT_ORDER']);
  });

  it('logs SOFT_DELETE when isActive is toggled off and REACTIVATE when back on', async () => {
    const lk = seedLookup({ label: 'Kg' });

    await service.update(lk.id, { isActive: false });
    expect(store.changeLogs.map((l) => l.action)).toEqual(['SOFT_DELETE']);
    expect(store.lookups[0].isActive).toBe(false);

    await service.update(lk.id, { isActive: true });
    expect(store.changeLogs.map((l) => l.action)).toEqual(['SOFT_DELETE', 'REACTIVATE']);
    expect(store.lookups[0].isActive).toBe(true);
  });

  it('throws NotFoundError for an unknown id', async () => {
    await expect(service.update('nope', { label: 'x' })).rejects.toThrow(NotFoundError);
  });

  it('rejects a blank label', async () => {
    const lk = seedLookup({ label: 'Kg' });
    await expect(service.update(lk.id, { label: '  ' })).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// 4.8 / 4.9 / 4.10 — cascade rename
// ---------------------------------------------------------------------------

describe('cascadeRename', () => {
  it('4.8 updates the lookup and every mapped column atomically across 4 tables', async () => {
    const lk = seedLookup({ label: 'Kg' });

    seedRows('supplyRequestItem', [{ donViTinh: 'Kg' }, { donViTinh: 'Kg' }, { donViTinh: 'Tấn' }]);
    seedRows('purchaseRequestItem', [{ donViTinh: 'Kg' }]);
    seedRows('lotProduct', [{ donViTinh: 'Kg' }]);
    seedRows('orderItem', [{ donVi: 'Kg' }, { donVi: 'Cái' }]);

    const updated = await service.cascadeRename(lk.id, 'Kg', 'kg', 'DON_VI_TINH', 'user-9');

    expect(updated.label).toBe('kg');
    expect(store.lookups[0].label).toBe('kg');

    expect(store.tables.supplyRequestItem.map((r) => r.donViTinh)).toEqual(['kg', 'kg', 'Tấn']);
    expect(store.tables.purchaseRequestItem.map((r) => r.donViTinh)).toEqual(['kg']);
    expect(store.tables.lotProduct.map((r) => r.donViTinh)).toEqual(['kg']);
    // Non-matching values are left completely alone.
    expect(store.tables.orderItem.map((r) => r.donVi)).toEqual(['kg', 'Cái']);
  });

  it('4.8 matches on label, never on code', async () => {
    // Kg / kg / KG are distinct labels whose codes were disambiguated in Batch A.
    const kgUpper = seedLookup({ code: 'DON_VI_TINH_KG', label: 'Kg' });
    seedLookup({ id: 'lk-lower', code: 'DON_VI_TINH_KG_2', label: 'kg' });

    seedRows('lotProduct', [{ donViTinh: 'Kg' }, { donViTinh: 'kg' }, { donViTinh: 'KG' }]);

    await service.cascadeRename(kgUpper.id, 'Kg', 'Kilôgam', 'DON_VI_TINH');

    // Only the exact 'Kg' rows moved; the 'kg' and 'KG' rows are untouched.
    expect(store.tables.lotProduct.map((r) => r.donViTinh)).toEqual(['Kilôgam', 'kg', 'KG']);
  });

  it('4.8 passes the Prisma FIELD name for tax_reports, whose real column is "donVi"', async () => {
    const lk = seedLookup({ label: 'Kg' });
    seedRows('taxReport', [{ donViTinh: 'Kg' }]);

    await service.cascadeRename(lk.id, 'Kg', 'kg', 'DON_VI_TINH');

    const taxCall = store.updateManyCalls.find((c) => c.model === 'taxReport');
    // Must be the Prisma field `donViTinh`; Prisma maps it to the physical "donVi".
    // Using `donVi` here would update zero rows with no error — a silent no-op.
    expect(taxCall).toBeDefined();
    expect(taxCall?.field).toBe('donViTinh');
    expect(store.tables.taxReport[0].donViTinh).toBe('kg');

    // ...while the audit trail reports the real column, for hand-written rollback SQL.
    const log = store.changeLogs[0];
    const tables = log.affectedTables as Array<{ table: string; column: string }>;
    expect(tables).toEqual(
      expect.arrayContaining([{ table: 'business.tax_reports', column: 'donVi', count: 1 }])
    );
  });

  it('4.8 renames a label with a trailing space exactly', async () => {
    const lk = seedLookup({
      group: 'LOAI_CHI_PHI',
      code: 'LOAI_CHI_PHI_SAN_XUAT_2',
      label: 'sản xuất ',
    });

    seedRows('generalCost', [{ loaiChiPhi: 'sản xuất ' }, { loaiChiPhi: 'sản xuất' }]);
    seedRows('projectCost', [{ loaiChiPhi: 'sản xuất ' }]);

    const updated = await service.cascadeRename(
      lk.id,
      'sản xuất ',
      'Sản xuất',
      'LOAI_CHI_PHI'
    );

    expect(updated.label).toBe('Sản xuất');
    // The trailing-space row is found and renamed; the already-trimmed row is NOT
    // swept up with it.
    expect(store.tables.generalCost.map((r) => r.loaiChiPhi)).toEqual(['Sản xuất', 'sản xuất']);
    expect(store.tables.projectCost.map((r) => r.loaiChiPhi)).toEqual(['Sản xuất']);
    expect(store.changeLogs[0].affectedRecords).toBe(2);
  });

  it('updates the overlapping export_costs.loaiChiPhi row exactly once', async () => {
    const lk = seedLookup({
      group: 'LOAI_CHI_PHI',
      code: 'LOAI_CHI_PHI_CHI_PHI_XUAT_KHAU',
      label: 'Chi phí xuất khẩu',
    });

    seedRows('exportCost', [
      { loaiChiPhi: 'Chi phí xuất khẩu' },
      { loaiChiPhi: 'Chi phí xuất khẩu' },
    ]);

    await service.cascadeRename(lk.id, 'Chi phí xuất khẩu', 'CP xuất khẩu', 'LOAI_CHI_PHI');

    // updateMany issued once for that model+field, not twice.
    const exportCalls = store.updateManyCalls.filter(
      (c) => c.model === 'exportCost' && c.field === 'loaiChiPhi'
    );
    expect(exportCalls).toHaveLength(1);

    expect(store.tables.exportCost.map((r) => r.loaiChiPhi)).toEqual([
      'CP xuất khẩu',
      'CP xuất khẩu',
    ]);
    // Counted once: 2 rows, not 4.
    expect(store.changeLogs[0].affectedRecords).toBe(2);

    expect(getUniqueColumnsForGroup('LOAI_CHI_PHI').filter((r) => r.model === 'exportCost')).toHaveLength(1);
  });

  it('4.9 writes a CASCADE_RENAME audit row with the per-table breakdown', async () => {
    const lk = seedLookup({ label: 'Kg' });

    seedRows('supplyRequestItem', [
      { donViTinh: 'Kg' },
      { donViTinh: 'Kg' },
      { donViTinh: 'Kg' },
    ]);
    seedRows('purchaseRequestItem', [{ donViTinh: 'Kg' }, { donViTinh: 'Kg' }]);
    seedRows('lotProduct', [{ donViTinh: 'Kg' }]);

    await service.cascadeRename(lk.id, 'Kg', 'kg', 'DON_VI_TINH', 'user-7');

    expect(store.changeLogs).toHaveLength(1);
    const log = store.changeLogs[0];
    expect(log).toMatchObject({
      lookupId: lk.id,
      group: 'DON_VI_TINH',
      action: 'CASCADE_RENAME',
      oldLabel: 'Kg',
      newLabel: 'kg',
      affectedRecords: 6,
      changedByUserId: 'user-7',
    });

    expect(log.affectedTables).toEqual([
      { table: 'business.supply_request_items', column: 'donViTinh', count: 3 },
      { table: 'business.purchase_request_items', column: 'donViTinh', count: 2 },
      { table: 'business.lot_products', column: 'donViTinh', count: 1 },
    ]);
  });

  it('4.9 records affectedRecords 0 and an empty breakdown when nothing referenced the label', async () => {
    const lk = seedLookup({ label: 'Mét' });

    await service.cascadeRename(lk.id, 'Mét', 'Met', 'DON_VI_TINH');

    expect(store.changeLogs[0]).toMatchObject({ affectedRecords: 0, affectedTables: [] });
    expect(store.lookups[0].label).toBe('Met');
  });

  it('4.10 rolls back everything when a column update fails mid-transaction', async () => {
    const lk = seedLookup({ label: 'Kg' });

    seedRows('supplyRequestItem', [{ donViTinh: 'Kg' }, { donViTinh: 'Kg' }]);
    seedRows('purchaseRequestItem', [{ donViTinh: 'Kg' }]);
    seedRows('lotProduct', [{ donViTinh: 'Kg' }]);
    seedRows('orderItem', [{ donVi: 'Kg' }]);

    // lotProduct sits in the middle of the DON_VI_TINH map, so earlier tables have
    // already been written to inside the transaction when this throws.
    store.failOnModel = 'lotProduct';

    await expect(
      service.cascadeRename(lk.id, 'Kg', 'kg', 'DON_VI_TINH')
    ).rejects.toThrow('injected failure updating lotProduct');

    // The label is unchanged...
    expect(store.lookups[0].label).toBe('Kg');
    // ...no audit row persisted...
    expect(store.changeLogs).toHaveLength(0);
    // ...and not one business row was left rewritten, including the tables the
    // cascade had already issued updates against before the failure.
    expect(store.tables.supplyRequestItem.map((r) => r.donViTinh)).toEqual(['Kg', 'Kg']);
    expect(store.tables.purchaseRequestItem.map((r) => r.donViTinh)).toEqual(['Kg']);
    expect(store.tables.lotProduct.map((r) => r.donViTinh)).toEqual(['Kg']);
    expect(store.tables.orderItem.map((r) => r.donVi)).toEqual(['Kg']);

    // Proof the failure really was mid-cascade rather than before it started.
    const attempted = store.updateManyCalls.map((c) => c.model);
    expect(attempted).toContain('supplyRequestItem');
    expect(attempted).toContain('lotProduct');
  });

  it('4.10 rolls back when the audit-log write itself fails', async () => {
    const lk = seedLookup({ label: 'Kg' });
    seedRows('supplyRequestItem', [{ donViTinh: 'Kg' }]);

    store.failOnAuditWrite = true;

    await expect(service.cascadeRename(lk.id, 'Kg', 'kg', 'DON_VI_TINH')).rejects.toThrow(
      'audit write failed'
    );

    // Data and audit roll back together — no renamed rows without a log entry.
    expect(store.lookups[0].label).toBe('Kg');
    expect(store.tables.supplyRequestItem[0].donViTinh).toBe('Kg');
    expect(store.changeLogs).toHaveLength(0);
  });

  it('rejects renaming to the identical label', async () => {
    const lk = seedLookup({ label: 'Kg' });
    await expect(service.cascadeRename(lk.id, 'Kg', 'Kg', 'DON_VI_TINH')).rejects.toThrow(
      ValidationError
    );
  });

  it('rejects a blank new label', async () => {
    const lk = seedLookup({ label: 'Kg' });
    await expect(service.cascadeRename(lk.id, 'Kg', '   ', 'DON_VI_TINH')).rejects.toThrow(
      ValidationError
    );
  });
});

// ---------------------------------------------------------------------------
// 4.11 / 4.12 — soft delete
// ---------------------------------------------------------------------------

describe('softDelete', () => {
  it('4.11 blocks the delete when the label is still in use, naming the count', async () => {
    const lk = seedLookup({ label: 'Kg' });
    seedRows('supplyRequestItem', [{ donViTinh: 'Kg' }, { donViTinh: 'Kg' }]);
    seedRows('lotProduct', [{ donViTinh: 'Kg' }]);

    const err = await service.softDelete(lk.id).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ConflictError);
    expect((err as ConflictError).statusCode).toBe(409);
    expect((err as ConflictError).message).toContain('3 bản ghi');

    // Still active, and no audit row written for the refused operation.
    expect(store.lookups[0].isActive).toBe(true);
    expect(store.changeLogs).toHaveLength(0);
  });

  it('4.12 sets isActive=false and logs SOFT_DELETE when usage is 0', async () => {
    const lk = seedLookup({ label: 'Mét' });

    const result = await service.softDelete(lk.id, 'user-3');

    expect(result.isActive).toBe(false);
    expect(store.lookups[0].isActive).toBe(false);
    // The row itself survives — soft delete never removes data.
    expect(store.lookups).toHaveLength(1);

    expect(store.changeLogs).toHaveLength(1);
    expect(store.changeLogs[0]).toMatchObject({
      lookupId: lk.id,
      action: 'SOFT_DELETE',
      oldLabel: 'Mét',
      newLabel: null,
      changedByUserId: 'user-3',
    });
  });

  it('exposes no hard-delete method', () => {
    const svc = service as unknown as Record<string, unknown>;
    expect(svc.delete).toBeUndefined();
    expect(svc.hardDelete).toBeUndefined();
    expect(svc.destroy).toBeUndefined();
  });

  it('throws NotFoundError for an unknown id', async () => {
    await expect(service.softDelete('nope')).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// getAll / getById / getHistory
// ---------------------------------------------------------------------------

describe('getAll', () => {
  it('returns only active entries by default, ordered by sortOrder', async () => {
    seedLookup({ code: 'A', label: 'Bao', sortOrder: 2 });
    seedLookup({ code: 'B', label: 'Kg', sortOrder: 1 });
    seedLookup({ code: 'C', label: 'Ẩn', sortOrder: 0, isActive: false });

    const rows = await service.getAll('DON_VI_TINH');

    expect(rows.map((r) => r.label)).toEqual(['Kg', 'Bao']);
  });

  it('returns inactive entries too when includeInactive is set', async () => {
    seedLookup({ code: 'A', label: 'Kg', sortOrder: 0 });
    seedLookup({ code: 'C', label: 'Ẩn', sortOrder: 1, isActive: false });

    const rows = await service.getAll('DON_VI_TINH', { includeInactive: true });

    expect(rows.map((r) => r.label)).toEqual(['Kg', 'Ẩn']);
  });

  it('includes a specific inactive label when includeValue names it (edit-mode, design.md Q2)', async () => {
    seedLookup({ code: 'A', label: 'Kg', sortOrder: 0 });
    seedLookup({ code: 'B', label: 'Bịch', sortOrder: 1, isActive: false });
    seedLookup({ code: 'C', label: 'Xô', sortOrder: 2, isActive: false });

    const rows = await service.getAll('DON_VI_TINH', { includeValue: 'Bịch' });

    // The stored value is preserved so saving an existing record cannot blank it,
    // while other hidden values stay out of the list.
    expect(rows.map((r) => r.label)).toEqual(['Kg', 'Bịch']);
  });

  it('returns an empty array for an unknown group', async () => {
    await expect(service.getAll('NOPE')).resolves.toEqual([]);
  });

  it('rejects a blank group', async () => {
    await expect(service.getAll('  ')).rejects.toThrow(ValidationError);
  });
});

describe('getById', () => {
  it('returns the lookup with its usage attached', async () => {
    const lk = seedLookup({ label: 'Kg' });
    seedRows('lotProduct', [{ donViTinh: 'Kg' }, { donViTinh: 'Kg' }]);

    const result = await service.getById(lk.id);

    expect(result.id).toBe(lk.id);
    expect(result.usage.usageCount).toBe(2);
    expect(result.usage.breakdown).toEqual([
      { table: 'business.lot_products', column: 'donViTinh', count: 2 },
    ]);
  });

  it('throws NotFoundError for an unknown id', async () => {
    await expect(service.getById('nope')).rejects.toThrow(NotFoundError);
  });
});

describe('getHistory', () => {
  it('returns a lookup history newest-first with pagination metadata', async () => {
    const lk = seedLookup({ label: 'Kg' });

    await service.update(lk.id, { sortOrder: 5 });
    await service.update(lk.id, { label: 'kg' });

    const history = await service.getHistory({ lookupId: lk.id }, { page: 1, limit: 10 });

    expect(history.pagination).toEqual({ page: 1, limit: 10, total: 2, totalPages: 1 });
    expect(history.data.map((l) => l.action)).toEqual(['UPDATE_LABEL', 'UPDATE_SORT_ORDER']);
  });

  it('filters by group', async () => {
    const a = seedLookup({ group: 'DON_VI_TINH', code: 'A', label: 'Kg' });
    const b = seedLookup({ group: 'LOAI_CHI_PHI', code: 'B', label: 'Vật tư' });

    await service.update(a.id, { sortOrder: 1 });
    await service.update(b.id, { sortOrder: 1 });

    const history = await service.getHistory({ group: 'LOAI_CHI_PHI' });

    expect(history.pagination.total).toBe(1);
    expect(history.data[0].group).toBe('LOAI_CHI_PHI');
  });

  it('requires either a lookupId or a group', async () => {
    await expect(service.getHistory({})).rejects.toThrow(ValidationError);
  });
});
