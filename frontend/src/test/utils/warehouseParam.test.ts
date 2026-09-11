/**
 * Tests for the `?warehouseId=` deep-link resolver.
 *
 * Key contract tested:
 * - a cuid (`Warehouse.id`) resolves as-is and needs no URL rewrite
 * - a `maKho` (what people paste, e.g. `?warehouseId=KHOHH`) resolves too, and
 *   is flagged so the caller can normalize the URL to the cuid
 * - an EMPTY list means "not loaded yet", never "no match" — treating it as a
 *   miss would let a slow first fetch delete a perfectly valid deep-link
 * - a genuinely unknown value on a loaded list is the only case reported as dead
 */

import { describe, it, expect } from 'vitest';
import { resolveWarehouseParam, isDeadWarehouseParam } from '../../utils/warehouseParam';
import type { Warehouse } from '../../services/warehouseService';

const makeWarehouse = (id: string, maKho: string, tenKho: string): Warehouse =>
  ({
    id,
    maKho,
    tenKho,
    trangThai: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  }) as Warehouse;

const warehouses = [
  makeWarehouse('ckk1aaa000000000000000001', 'KHOHH', 'Kho hàng hóa'),
  makeWarehouse('ckk1aaa000000000000000002', 'KHOTP', 'Kho thành phẩm'),
];

describe('resolveWarehouseParam', () => {
  it('resolves a cuid without asking for a URL rewrite', () => {
    const res = resolveWarehouseParam(warehouses, 'ckk1aaa000000000000000002');
    expect(res.warehouse?.tenKho).toBe('Kho thành phẩm');
    expect(res.canonicalId).toBe('ckk1aaa000000000000000002');
    expect(res.needsNormalize).toBe(false);
  });

  it('resolves a legacy maKho link and flags it for normalization', () => {
    const res = resolveWarehouseParam(warehouses, 'KHOHH');
    expect(res.warehouse?.tenKho).toBe('Kho hàng hóa');
    expect(res.canonicalId).toBe('ckk1aaa000000000000000001');
    expect(res.needsNormalize).toBe(true);
  });

  it('prefers an id match over a maKho match', () => {
    // A cuid that happens to equal some other warehouse's maKho must not be
    // reinterpreted — id is the canonical form and wins.
    const list = [makeWarehouse('KHOTP', 'A', 'Warehouse keyed by code'), warehouses[1]];
    expect(resolveWarehouseParam(list, 'KHOTP').warehouse?.tenKho).toBe('Warehouse keyed by code');
  });

  it('treats an unloaded list as "unknown", not as a miss', () => {
    for (const empty of [undefined, []]) {
      const res = resolveWarehouseParam(empty, 'KHOHH');
      expect(res.warehouse).toBeNull();
      expect(res.canonicalId).toBeNull();
      // The important half: callers must NOT delete the param on this basis.
      expect(isDeadWarehouseParam(empty, 'KHOHH')).toBe(false);
    }
  });

  it('reports nothing to resolve when the param is absent', () => {
    for (const missing of [null, undefined, '']) {
      expect(resolveWarehouseParam(warehouses, missing).warehouse).toBeNull();
      expect(isDeadWarehouseParam(warehouses, missing)).toBe(false);
    }
  });
});

describe('isDeadWarehouseParam', () => {
  it('is true only for a loaded list that matches neither id nor maKho', () => {
    expect(isDeadWarehouseParam(warehouses, 'KHOXX')).toBe(true);
    expect(isDeadWarehouseParam(warehouses, 'ckk1aaa000000000000000001')).toBe(false);
    expect(isDeadWarehouseParam(warehouses, 'KHOHH')).toBe(false);
  });
});
