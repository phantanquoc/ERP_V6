/**
 * History of this file — read before "fixing" an assertion back to its old shape.
 *
 * These four tests were written on 2026-08-11 (commit 16201fe) against the layout
 * WarehouseSlipPrintView had at that time: one table PER WAREHOUSE, a
 * `role="status"` notice for an empty slip, a `tr.print-total-row` class, and a
 * close button labelled "Đóng bản xem trước".
 *
 * Commit 5c2799a (2026-08-19, "align slips to official BM01/BM03 template")
 * replaced all of that with the single 14-column BM01/BM03 grid, and every
 * assertion here silently went stale. The suite never flagged it: the component
 * imports `@assets/abf-logo.png`, `vitest.config.ts` had no `@assets` alias (only
 * `vite.config.ts` did), so the file died at import with
 * "Failed to resolve import @assets/abf-logo.png" and reported 0 tests instead of
 * going red. That alias is now in place, so these assertions are live again and
 * have been rewritten against the markup that actually renders:
 *   - the table is ALWAYS present, empty slips get a placeholder row inside it
 *   - one table per slip, not per warehouse; the warehouse name is the "Loại Kho" column
 *   - totals rows are `td[colSpan=11]` + requested + actual + spacer, no class hook
 *   - the buttons are "In phiếu" and "Đóng"
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WarehouseSlipPrintView from '../../components/WarehouseSlipPrintView';
import type { WarehouseReceiptLine } from '../../services/warehouseReceiptService';

const baseProps = {
  type: 'receipt' as const,
  maPhieu: 'PN-001',
  ngay: '11/08/2026',
  tenNhanVien: 'Nguyễn Văn A',
  maNhanVien: 'NV-001',
  onClose: vi.fn(),
};

describe('WarehouseSlipPrintView user behavior', () => {
  it('shows a placeholder row inside the table for a slip with no lines', () => {
    render(<WarehouseSlipPrintView {...baseProps} items={[]} />);

    // The BM01/BM03 grid keeps its header even with nothing to print, so the table
    // is always rendered and the notice is a row within it — not a standalone status.
    const table = screen.getByRole('table');
    expect(within(table).getByText('Không có dòng hàng')).toBeInTheDocument();
    expect(within(table).getByText('Không có dòng hàng').closest('td')).toHaveAttribute('colSpan', '14');
  });

  it('prints one table with a Loại Kho column when a slip spans warehouses', () => {
    const items: WarehouseReceiptLine[] = [
      { lotProductId: 'p1', tenSanPham: 'Mít sấy', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', soLuongThucTe: 3, donViTinh: 'kg' },
      { lotProductId: 'p2', tenSanPham: 'Chuối sấy', warehouseId: 'w2', tenKho: 'Kho B', lotId: 'l2', soLuongThucTe: 5, donViTinh: 'kg' },
    ];

    render(<WarehouseSlipPrintView {...baseProps} items={items} />);

    expect(screen.getAllByRole('table')).toHaveLength(1);

    // Each warehouse reads from its own row's "Loại Kho" cell (column index 2).
    const rows = screen.getAllByRole('row');
    const lineRows = rows
      .map((row) => Array.from(row.querySelectorAll('td')))
      .filter((cells) => cells.length === 14);
    expect(lineRows).toHaveLength(2);
    expect(lineRows[0][2].textContent).toBe('Kho A');
    expect(lineRows[1][2].textContent).toBe('Kho B');
  });

  it('renders one total row per unit, keeping requested and actual in their own columns', () => {
    // Requested and actual deliberately differ per unit, and by different amounts,
    // so swapping the two columns — or summing across units — cannot pass.
    const items: WarehouseReceiptLine[] = [
      { lotProductId: 'p1', tenSanPham: 'Mít sấy', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', soLuongYeuCau: 7, soLuongThucTe: 3, donViTinh: 'Cái' },
      { lotProductId: 'p2', tenSanPham: 'Dây buộc', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', soLuongYeuCau: 11, soLuongThucTe: 5, donViTinh: 'Cuộn' },
    ];

    render(<WarehouseSlipPrintView {...baseProps} items={items} />);

    // Layout: [label colSpan=11] [requested] [actual] [spacer]
    const readTotals = (unit: string) => {
      const label = screen.getByText(`Tổng cộng (${unit}):`);
      expect(label.closest('td')).toHaveAttribute('colSpan', '11');
      const cells = Array.from(label.closest('tr')!.querySelectorAll('td'));
      return { requested: cells[1]?.textContent?.trim(), actual: cells[2]?.textContent?.trim() };
    };

    expect(readTotals('Cái')).toEqual({ requested: '7', actual: '3' });
    expect(readTotals('Cuộn')).toEqual({ requested: '11', actual: '5' });
  });

  it('calls window.print when the print action is used, and onClose when dismissed', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const onClose = vi.fn();

    render(<WarehouseSlipPrintView {...baseProps} onClose={onClose} items={[]} />);

    await user.click(screen.getByRole('button', { name: 'In phiếu' }));
    expect(printSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });
});
