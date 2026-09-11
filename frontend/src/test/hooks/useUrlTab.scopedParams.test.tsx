/**
 * Tests for `useUrlTab`'s `scopedParams` — tab-scoped query param cleanup.
 *
 * The bug this guards: tab bodies render conditionally, so the component owning a
 * detail param unmounts on a tab switch and nothing is left to clean it up. Since
 * `set` deliberately preserves every unrelated param, `?warehouseId=` used to ride
 * along to tabs where it means nothing — and then re-select that warehouse when the
 * user came back, because the remounting component reads it as a deep-link.
 *
 * Key contract tested:
 * - params declared for OTHER tabs are dropped on switch
 * - params declared for the tab being ENTERED are kept (a pasted deep-link must
 *   survive the very `set` that navigates to its own tab)
 * - params absent from the table are never touched, so page-level state
 *   (`?warehouseMonth=`, `?q=`) survives exactly as before
 * - omitting the table preserves the old behaviour entirely
 * - `extraParams` switches tab and writes a detail param in ONE URL write, which
 *   is the only safe way: two writes clone the same stale snapshot and the second
 *   silently reverts the first
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useUrlTab } from '../../hooks/useUrlState';

type Tab = 'warehouseManagement' | 'products' | 'inbound';
const VALID_TABS: Tab[] = ['warehouseManagement', 'products', 'inbound'];
const isTab = (v: string | null): v is Tab => VALID_TABS.includes(v as Tab);

const SCOPED: Record<Tab, readonly string[]> = {
  warehouseManagement: ['warehouseId', 'lotProductId'],
  products: ['internationalProductId'],
  inbound: ['receiptId'],
};

const hookAt = (url: string, scoped?: Record<Tab, readonly string[]>) =>
  renderHook(() => useUrlTab<Tab>('tab', isTab, 'products', scoped), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    ),
  });

describe('useUrlTab scopedParams', () => {
  it('drops a detail param owned by the tab being left', () => {
    const { result } = hookAt(
      '/production/warehouse?tab=warehouseManagement&warehouseId=ckk1&lotProductId=lp1',
      SCOPED,
    );
    expect(result.current.value).toBe('warehouseManagement');

    act(() => result.current.set('products'));

    // The reported bug: ?tab=products&warehouseId=KHOHH
    expect(result.current.searchParams.get('warehouseId')).toBeNull();
    expect(result.current.searchParams.get('lotProductId')).toBeNull();
    expect(result.current.searchParams.get('tab')).toBe('products');
  });

  it('keeps a param owned by the tab being entered', () => {
    const { result } = hookAt('/production/warehouse?tab=products&receiptId=r1', SCOPED);

    act(() => result.current.set('inbound'));

    // Navigating TO a record's own tab must not eat the deep-link on the way in.
    expect(result.current.searchParams.get('receiptId')).toBe('r1');
  });

  it('leaves params that are not in the table untouched', () => {
    const { result } = hookAt(
      '/production/warehouse?tab=warehouseManagement&warehouseId=ckk1&warehouseMonth=8&warehouseYear=2026&q=abc',
      SCOPED,
    );

    act(() => result.current.set('products'));

    expect(result.current.searchParams.get('warehouseId')).toBeNull();
    // Page-level period filter and search box are not tab-scoped state.
    expect(result.current.searchParams.get('warehouseMonth')).toBe('8');
    expect(result.current.searchParams.get('warehouseYear')).toBe('2026');
    expect(result.current.searchParams.get('q')).toBe('abc');
  });

  it('preserves every param when no table is given (back-compat)', () => {
    const { result } = hookAt('/production/warehouse?tab=warehouseManagement&warehouseId=ckk1');

    act(() => result.current.set('products'));

    // 13 pages call this hook without a table; their behaviour must not change.
    expect(result.current.searchParams.get('warehouseId')).toBe('ckk1');
    expect(result.current.searchParams.get('tab')).toBe('products');
  });

  it('switches tab and writes a detail param in one URL write (no race)', () => {
    // The "Hàng hóa còn tồn" card jumped like this before:
    //   setActiveTab('warehouseManagement'); openWarehouse(warehouseId);
    // but the two writes race on the same stale searchParams snapshot. Using
    // extraParams folds them into one atomic write.
    const { result } = hookAt('/production/warehouse?tab=inventory&warehouseMonth=8', SCOPED);

    act(() => result.current.set('warehouseManagement', { warehouseId: 'ckk1aaa' }));

    // Single history entry: tab + detail, period kept, no race.
    expect(result.current.searchParams.get('tab')).toBe('warehouseManagement');
    expect(result.current.searchParams.get('warehouseId')).toBe('ckk1aaa');
    expect(result.current.searchParams.get('warehouseMonth')).toBe('8');
  });

  it('an extraParams entry for the tab being entered survives its own cleanup', () => {
    // SCOPED keeps lotProductId for inbound too, so the normal cleanup would
    // not delete it. But a switching tab whose list is ['receiptId'] would
    // delete a sibling detail id written alongside it — unless extraParams is
    // applied AFTER that cleanup.
    const { result } = hookAt('/production/warehouse?tab=products&receiptId=r1', SCOPED);

    act(() => result.current.set('warehouseManagement', { warehouseId: 'cuid-1', lotProductId: 'lp-1' }));

    // The old tab's receiptId is gone, but the new tab's extras landed.
    expect(result.current.searchParams.get('receiptId')).toBeNull();
    expect(result.current.searchParams.get('warehouseId')).toBe('cuid-1');
    expect(result.current.searchParams.get('lotProductId')).toBe('lp-1');
    expect(result.current.searchParams.get('tab')).toBe('warehouseManagement');
  });
});
