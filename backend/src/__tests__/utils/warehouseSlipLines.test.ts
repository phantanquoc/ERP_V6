/**
 * Unit tests for @utils/warehouseSlipLines — the shared warehouse slip line engine.
 *
 * The two cases that matter most are the silent-failure modes this module exists
 * to prevent:
 *   - aggregate overdraw: two lines of 60 against a package holding 100
 *   - contradictory snapshots: two lines on one package must chain, not both
 *     report the pre-transaction balance
 */

import {
  aggregateOutflowByPackage,
  assertLinesFitStock,
  assertSufficientStock,
  computeHeaderTotals,
  computeSequentialSnapshots,
  diffLines,
  groupLinesByPackage,
  type PackageBalance,
} from '../../utils/warehouseSlipLines';
import { ValidationError } from '../../utils/errors';

const PKG_A = 'lp-a';
const PKG_B = 'lp-b';

function balances(entries: Array<[string, number, string?]>): Map<string, PackageBalance> {
  return new Map(
    entries.map(([id, soLuong, tenSanPham]) => [
      id,
      { soLuong, tenSanPham: tenSanPham ?? 'Mít sấy loại A', donViTinh: 'kg' },
    ])
  );
}

describe('groupLinesByPackage', () => {
  it('sums actual quantity within each package group', () => {
    const groups = groupLinesByPackage([
      { lotProductId: PKG_A, soLuongThucTe: 60 },
      { lotProductId: PKG_B, soLuongThucTe: 10 },
      { lotProductId: PKG_A, soLuongThucTe: 60 },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({
      lotProductId: PKG_A,
      tongSoLuongThucTe: 120,
      lineIndexes: [0, 2],
    });
    expect(groups[1]).toEqual({
      lotProductId: PKG_B,
      tongSoLuongThucTe: 10,
      lineIndexes: [1],
    });
  });

  it('preserves first-appearance order so grouping is deterministic', () => {
    const groups = groupLinesByPackage([
      { lotProductId: PKG_B, soLuongThucTe: 1 },
      { lotProductId: PKG_A, soLuongThucTe: 1 },
    ]);
    expect(groups.map((g) => g.lotProductId)).toEqual([PKG_B, PKG_A]);
  });

  it('returns no groups for an empty line array', () => {
    expect(groupLinesByPackage([])).toEqual([]);
  });
});

describe('aggregateOutflowByPackage', () => {
  it('keys total demand per package', () => {
    const totals = aggregateOutflowByPackage([
      { lotProductId: PKG_A, soLuongThucTe: 40 },
      { lotProductId: PKG_A, soLuongThucTe: 40 },
    ]);
    expect(totals.get(PKG_A)).toBe(80);
  });
});

describe('assertLinesFitStock — aggregate validation before any write', () => {
  it('rejects two lines of 60 against a package holding 100', () => {
    const lines = [
      { lotProductId: PKG_A, soLuongThucTe: 60 },
      { lotProductId: PKG_A, soLuongThucTe: 60 },
    ];

    expect(() => assertLinesFitStock(lines, balances([[PKG_A, 100]]))).toThrow(ValidationError);
  });

  it('names the package and its current balance in the error', () => {
    const lines = [
      { lotProductId: PKG_A, soLuongThucTe: 60 },
      { lotProductId: PKG_A, soLuongThucTe: 60 },
    ];

    expect(() => assertLinesFitStock(lines, balances([[PKG_A, 100, 'Chuối sấy loại A']]))).toThrow(
      /Chuối sấy loại A[\s\S]*Cần 120 kg[\s\S]*tồn kho hiện tại 100 kg/
    );
  });

  it('accepts two lines of 40 against a package holding 100', () => {
    const lines = [
      { lotProductId: PKG_A, soLuongThucTe: 40 },
      { lotProductId: PKG_A, soLuongThucTe: 40 },
    ];

    expect(() => assertLinesFitStock(lines, balances([[PKG_A, 100]]))).not.toThrow();
  });

  it('accepts lines that individually equal their package balance', () => {
    const lines = [
      { lotProductId: PKG_A, soLuongThucTe: 100 },
      { lotProductId: PKG_B, soLuongThucTe: 50 },
    ];

    expect(() =>
      assertLinesFitStock(lines, balances([[PKG_A, 100], [PKG_B, 50]]))
    ).not.toThrow();
  });

  it('reports every shortfall, not only the first', () => {
    const lines = [
      { lotProductId: PKG_A, soLuongThucTe: 200 },
      { lotProductId: PKG_B, soLuongThucTe: 300 },
    ];

    let message = '';
    try {
      assertLinesFitStock(lines, balances([[PKG_A, 100, 'Kiện A'], [PKG_B, 100, 'Kiện B']]));
    } catch (err) {
      message = (err as Error).message;
    }

    expect(message).toContain('Kiện A');
    expect(message).toContain('Kiện B');
  });

  it('reports a package the caller failed to load rather than assuming zero', () => {
    expect(() =>
      assertLinesFitStock([{ lotProductId: 'missing', soLuongThucTe: 1 }], balances([[PKG_A, 100]]))
    ).toThrow(/Không tìm thấy kiện hàng missing/);
  });
});

describe('assertSufficientStock — net demand from a resolved diff', () => {
  it('ignores packages with net inflow or zero net movement', () => {
    const demands = new Map([
      [PKG_A, -50],
      [PKG_B, 0],
    ]);
    expect(() => assertSufficientStock(demands, balances([[PKG_A, 10], [PKG_B, 0]]))).not.toThrow();
  });

  it('throws when net outflow exceeds the balance', () => {
    expect(() => assertSufficientStock(new Map([[PKG_A, 30]]), balances([[PKG_A, 20]]))).toThrow(
      ValidationError
    );
  });
});

describe('computeSequentialSnapshots — receipts', () => {
  it('chains snapshots across two lines on one package', () => {
    const { lines, closingBalances } = computeSequentialSnapshots(
      [
        { lotProductId: PKG_A, soLuongThucTe: 30 },
        { lotProductId: PKG_A, soLuongThucTe: 20 },
      ],
      balances([[PKG_A, 100]]),
      'IN'
    );

    expect(lines[0].soLuongTruoc).toBe(100);
    expect(lines[0].soLuongSau).toBe(130);
    // Line 2 opens where line 1 closed — not at the pre-transaction balance.
    expect(lines[1].soLuongTruoc).toBe(130);
    expect(lines[1].soLuongTruoc).toBe(lines[0].soLuongSau);
    expect(lines[1].soLuongSau).toBe(150);
    expect(closingBalances.get(PKG_A)).toBe(150);
  });

  it('keeps distinct packages independent', () => {
    const { lines } = computeSequentialSnapshots(
      [
        { lotProductId: PKG_A, soLuongThucTe: 10 },
        { lotProductId: PKG_B, soLuongThucTe: 5 },
      ],
      balances([[PKG_A, 100], [PKG_B, 7]]),
      'IN'
    );

    expect(lines[0]).toMatchObject({ soLuongTruoc: 100, soLuongSau: 110 });
    expect(lines[1]).toMatchObject({ soLuongTruoc: 7, soLuongSau: 12 });
  });

  it('preserves caller fields and records the input position', () => {
    const { lines } = computeSequentialSnapshots(
      [{ lotProductId: PKG_A, soLuongThucTe: 10, tenSanPham: 'Mít sấy', stt: 1 }],
      balances([[PKG_A, 5]]),
      'IN'
    );

    expect(lines[0].tenSanPham).toBe('Mít sấy');
    expect(lines[0].stt).toBe(1);
    expect(lines[0].lineIndex).toBe(0);
  });
});

describe('computeSequentialSnapshots — issues', () => {
  it('chains snapshots downward across two lines on one package', () => {
    const { lines, closingBalances } = computeSequentialSnapshots(
      [
        { lotProductId: PKG_A, soLuongThucTe: 30 },
        { lotProductId: PKG_A, soLuongThucTe: 20 },
      ],
      balances([[PKG_A, 100]]),
      'OUT'
    );

    expect(lines[0]).toMatchObject({ soLuongTruoc: 100, soLuongSau: 70 });
    expect(lines[1]).toMatchObject({ soLuongTruoc: 70, soLuongSau: 50 });
    expect(closingBalances.get(PKG_A)).toBe(50);
  });

  it('throws before producing a negative running balance', () => {
    expect(() =>
      computeSequentialSnapshots(
        [
          { lotProductId: PKG_A, soLuongThucTe: 60 },
          { lotProductId: PKG_A, soLuongThucTe: 60 },
        ],
        balances([[PKG_A, 100]]),
        'OUT'
      )
    ).toThrow(ValidationError);
  });

  it('allows an issue that drains a package exactly to zero', () => {
    const { lines } = computeSequentialSnapshots(
      [{ lotProductId: PKG_A, soLuongThucTe: 100 }],
      balances([[PKG_A, 100]]),
      'OUT'
    );
    expect(lines[0].soLuongSau).toBe(0);
  });
});

describe('diffLines', () => {
  const stored = [
    { id: 'l1', lotProductId: PKG_A, soLuongThucTe: 10 },
    { id: 'l2', lotProductId: PKG_A, soLuongThucTe: 20 },
    { id: 'l3', lotProductId: PKG_B, soLuongThucTe: 30 },
  ];

  it('partitions removed, added, and modified lines', () => {
    const diff = diffLines(stored, [
      { id: 'l1', lotProductId: PKG_A, soLuongThucTe: 15 },
      { lotProductId: PKG_B, soLuongThucTe: 5 },
    ]);

    expect(diff.modified.map((p) => p.stored.id)).toEqual(['l1']);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed.map((l) => l.id)).toEqual(['l2', 'l3']);
  });

  it('flags a line repointed to a different package', () => {
    const diff = diffLines(stored, [{ id: 'l1', lotProductId: PKG_B, soLuongThucTe: 10 }]);

    expect(diff.modified[0].lotProductChanged).toBe(true);
    expect(diff.repointed).toHaveLength(1);
    expect(diff.repointed[0].stored.lotProductId).toBe(PKG_A);
    expect(diff.repointed[0].incoming.lotProductId).toBe(PKG_B);
  });

  it('does not flag a modified line that kept its package', () => {
    const diff = diffLines(stored, [{ id: 'l1', lotProductId: PKG_A, soLuongThucTe: 99 }]);
    expect(diff.modified[0].lotProductChanged).toBe(false);
    expect(diff.repointed).toHaveLength(0);
  });

  it('treats an unknown id as an addition rather than silently dropping it', () => {
    const diff = diffLines(stored, [{ id: 'ghost', lotProductId: PKG_A, soLuongThucTe: 1 }]);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(3);
  });

  it('rejects two incoming lines claiming the same stored line', () => {
    expect(() =>
      diffLines(stored, [
        { id: 'l1', lotProductId: PKG_A, soLuongThucTe: 1 },
        { id: 'l1', lotProductId: PKG_A, soLuongThucTe: 2 },
      ])
    ).toThrow(ValidationError);
  });

  it('reports every stored line as removed when incoming is empty', () => {
    const diff = diffLines(stored, []);
    expect(diff.removed).toHaveLength(3);
    expect(diff.added).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
  });
});

describe('computeHeaderTotals', () => {
  it('sums actual quantity and counts lines', () => {
    expect(
      computeHeaderTotals([
        { lotProductId: PKG_A, soLuongThucTe: 30 },
        { lotProductId: PKG_A, soLuongThucTe: 20 },
        { lotProductId: PKG_B, soLuongThucTe: 50 },
      ])
    ).toEqual({ tongSoLuongThucTe: 100, soDongHang: 3 });
  });

  it('returns zeroed totals for an empty line set', () => {
    expect(computeHeaderTotals([])).toEqual({ tongSoLuongThucTe: 0, soDongHang: 0 });
  });
});

describe('BM helpers — quantityDeviation / kienSetEquals / threshold / grouping', () => {
  it('quantityDeviation returns 0 when plan is 0 and actual is 0', async () => {
    const { quantityDeviation } = await import('../../utils/warehouseSlipLines');
    expect(quantityDeviation(0, 0)).toBe(0);
  });

  it('quantityDeviation returns 1 when plan is 0 but actual non-zero', async () => {
    const { quantityDeviation } = await import('../../utils/warehouseSlipLines');
    expect(quantityDeviation(0, 5)).toBe(1);
  });

  it('quantityDeviation computes abs(actual-plan)/plan', async () => {
    const { quantityDeviation } = await import('../../utils/warehouseSlipLines');
    expect(quantityDeviation(100, 80)).toBeCloseTo(0.2);
    expect(quantityDeviation(100, 120)).toBeCloseTo(0.2);
  });

  it('kienSetEquals is order-insensitive and strict on size', async () => {
    const { kienSetEquals } = await import('../../utils/warehouseSlipLines');
    expect(kienSetEquals(['K1.1', 'K1.2'], ['K1.2', 'K1.1'])).toBe(true);
    expect(kienSetEquals(['K1.1'], ['K1.1', 'K1.2'])).toBe(false);
    expect(kienSetEquals(['K1.1'], ['K1.2'])).toBe(false);
    expect(kienSetEquals([], [])).toBe(true);
  });

  it('isOverThreshold respects custom threshold', async () => {
    const { isOverThreshold } = await import('../../utils/warehouseSlipLines');
    expect(isOverThreshold(100, 115, 0.1)).toBe(true);
    expect(isOverThreshold(100, 105, 0.1)).toBe(false);
    expect(isOverThreshold(100, 105, 0.05)).toBe(false);
    expect(isOverThreshold(100, 106, 0.05)).toBe(true);
  });

  it('productGroupKey joins tenSanPham__donViTinh__warehouseId', async () => {
    const { productGroupKey, groupLinesByProduct } = await import('../../utils/warehouseSlipLines');
    expect(productGroupKey({ tenSanPham: 'A', donViTinh: 'kg', warehouseId: 'w1' })).toBe('A__kg__w1');
    const lines = [
      { lotProductId: PKG_A, tenSanPham: 'A', donViTinh: 'kg', warehouseId: 'w1', soLuongThucTe: 10, soLuongYeuCau: 10 },
      { lotProductId: PKG_B, tenSanPham: 'A', donViTinh: 'kg', warehouseId: 'w1', soLuongThucTe: 5, soLuongYeuCau: 5 },
      { lotProductId: PKG_A, tenSanPham: 'B', donViTinh: 'kg', warehouseId: 'w1', soLuongThucTe: 7, soLuongYeuCau: 7 },
    ] as any;
    const m = groupLinesByProduct(lines);
    expect(m.size).toBe(2);
    expect(m.get('A__kg__w1')!.length).toBe(2);
    expect(m.get('B__kg__w1')!.length).toBe(1);
  });
});
