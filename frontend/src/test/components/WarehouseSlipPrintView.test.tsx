import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('shows a readable notice instead of a blank table for a legacy slip with no lines', () => {
    render(<WarehouseSlipPrintView {...baseProps} items={[]} />);

    expect(screen.getByRole('status')).toHaveTextContent('Không có dòng hàng để in.');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('prints one labelled table per warehouse when a slip spans warehouses', () => {
    const items: WarehouseReceiptLine[] = [
      { lotProductId: 'p1', tenSanPham: 'Mít sấy', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', soLuongThucTe: 3, donViTinh: 'kg' },
      { lotProductId: 'p2', tenSanPham: 'Chuối sấy', warehouseId: 'w2', tenKho: 'Kho B', lotId: 'l2', soLuongThucTe: 5, donViTinh: 'kg' },
    ];

    render(<WarehouseSlipPrintView {...baseProps} items={items} />);

    expect(screen.getByText('Kho: Kho A')).toBeInTheDocument();
    expect(screen.getByText('Kho: Kho B')).toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(2);
  });

  it('renders one table with per-unit totals for a single-warehouse slip', () => {
    const items: WarehouseReceiptLine[] = [
      { lotProductId: 'p1', tenSanPham: 'Mít sấy', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', soLuongThucTe: 1, donViTinh: 'Cái' },
      { lotProductId: 'p2', tenSanPham: 'Dây buộc', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', soLuongThucTe: 1, donViTinh: 'Cuộn' },
    ];

    render(<WarehouseSlipPrintView {...baseProps} items={items} />);

    expect(screen.getByText('Tổng cộng (Cái):')).toBeInTheDocument();
    expect(screen.getByText('Tổng cộng (Cuộn):')).toBeInTheDocument();

    // Cross-unit summing would collapse both lines into one "2" total. Assert on
    // the total rows only — the STT column also contains a literal "2".
    const totalRows = Array.from(document.querySelectorAll('tr.print-total-row'));
    expect(totalRows).toHaveLength(2);
    // Cells: [label colSpan=2] [unit] [requested] [actual] [spacer]
    const totalQuantities = totalRows.map((row) => ({
      unit: row.querySelectorAll('td')[1]?.textContent?.trim(),
      actual: row.querySelectorAll('td')[3]?.textContent?.trim(),
    }));
    expect(totalQuantities).toEqual([
      { unit: 'Cái', actual: '1' },
      { unit: 'Cuộn', actual: '1' },
    ]);
  });

  it('calls window.print when the print action is used, and onClose when dismissed', async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const onClose = vi.fn();

    render(<WarehouseSlipPrintView {...baseProps} onClose={onClose} items={[]} />);

    await user.click(screen.getByRole('button', { name: 'In phiếu' }));
    expect(printSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Đóng bản xem trước' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });
});
