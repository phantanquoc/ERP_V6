import type { ReactElement } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import WarehouseReceiptTab from '../../components/WarehouseReceiptTab';
import WarehouseIssueTab from '../../components/WarehouseIssueTab';
import warehouseReceiptService from '../../services/warehouseReceiptService';
import warehouseIssueService from '../../services/warehouseIssueService';
import type { WarehouseReceipt } from '../../services/warehouseReceiptService';
import type { WarehouseIssue } from '../../services/warehouseIssueService';

vi.mock('../../services/warehouseReceiptService', () => ({
  default: {
    getAllWarehouseReceipts: vi.fn(),
    deleteWarehouseReceipt: vi.fn(),
  },
}));

vi.mock('../../services/warehouseIssueService', () => ({
  default: {
    getAllWarehouseIssues: vi.fn(),
    deleteWarehouseIssue: vi.fn(),
  },
}));

vi.mock('../../hooks', () => ({
  warehouseKeys: {
    all: ['warehouses'],
    lists: () => ['warehouses', 'list'],
    lotProducts: () => ['warehouses', 'lotProducts'],
    receiptHistories: () => ['warehouses', 'receiptHistory'],
  },
}));

vi.mock('../../components/CreateWarehouseReceiptModal', () => ({
  default: () => null,
}));
vi.mock('../../components/EditWarehouseReceiptModal', () => ({
  default: () => null,
}));
vi.mock('../../components/CreateWarehouseIssueModal', () => ({
  default: () => null,
}));
vi.mock('../../components/EditWarehouseIssueModal', () => ({
  default: () => null,
}));
vi.mock('../../components/WarehouseSlipPrintView', () => ({
  default: () => null,
}));

const receiptService = vi.mocked(warehouseReceiptService);
const issueService = vi.mocked(warehouseIssueService);

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const receipt = (overrides: Partial<WarehouseReceipt> = {}): WarehouseReceipt => ({
  id: 'receipt-1',
  maPhieuNhap: 'PN-001',
  ngayNhap: '2026-08-11',
  employeeId: 'employee-1',
  maNhanVien: 'NV-001',
  tenNhanVien: 'Nguyễn Văn A',
  createdAt: '2026-08-11T08:00:00Z',
  updatedAt: '2026-08-11T08:00:00Z',
  ...overrides,
});

const issue = (overrides: Partial<WarehouseIssue> = {}): WarehouseIssue => ({
  id: 'issue-1',
  maPhieuXuat: 'PX-001',
  ngayXuat: '2026-08-11',
  employeeId: 'employee-1',
  maNhanVien: 'NV-001',
  tenNhanVien: 'Nguyễn Văn A',
  createdAt: '2026-08-11T08:00:00Z',
  updatedAt: '2026-08-11T08:00:00Z',
  ...overrides,
});

describe('warehouse slip tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters a receipt by a product that exists only on its second line', async () => {
    receiptService.getAllWarehouseReceipts.mockResolvedValue({
      data: {
        data: [receipt({
          items: [
            { id: 'line-1', lotProductId: 'package-1', tenSanPham: 'Mít sấy', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', tenLo: 'Lô 1', soLuongThucTe: 3 },
            { id: 'line-2', lotProductId: 'package-2', tenSanPham: 'Chuối sấy', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l2', tenLo: 'Lô 2', soLuongThucTe: 4 },
          ],
        }), receipt({
          id: 'receipt-2',
          maPhieuNhap: 'PN-002',
          items: [{ id: 'line-3', lotProductId: 'package-3', tenSanPham: 'Không khớp', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l3', tenLo: 'Lô 3', soLuongThucTe: 1 }],
        })],
      },
    } as never);

    renderWithQuery(<WarehouseReceiptTab />);
    expect(await screen.findByText('Chuối sấy')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Tìm kiếm phiếu nhập...'), {
      target: { value: 'Chuối sấy' },
    });

    // Filtering is slip-level: finding line 2 keeps the whole matching slip,
    // while unrelated slips are removed.
    expect(screen.getByText('PN-001')).toBeInTheDocument();
    expect(screen.getByText('Chuối sấy')).toBeInTheDocument();
    expect(screen.getByText('Mít sấy')).toBeInTheDocument();
    expect(screen.queryByText('PN-002')).not.toBeInTheDocument();
  });

  it('keeps a legacy receipt visible through the header fallback line', async () => {
    receiptService.getAllWarehouseReceipts.mockResolvedValue({
      data: [receipt({
        tenSanPham: 'Hàng legacy',
        warehouseId: 'w1',
        tenKho: 'Kho cũ',
        lotId: 'l1',
        tenLo: 'Lô cũ',
        soLuongNhap: 8,
      })],
    } as never);

    renderWithQuery(<WarehouseReceiptTab />);

    expect(await screen.findByText('Hàng legacy')).toBeInTheDocument();
    expect(screen.getByText('Kho cũ')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('does not offer edit or delete actions for a locked issue', async () => {
    issueService.getAllWarehouseIssues.mockResolvedValue({
      data: [issue({
        isLocked: true,
        items: [{ id: 'line-1', lotProductId: 'package-1', tenSanPham: 'Vật tư khóa', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', tenLo: 'Lô 1', soLuongThucTe: 2 }],
      })],
    } as never);

    renderWithQuery(<WarehouseIssueTab />);

    expect(await screen.findByText('Vật tư khóa')).toBeInTheDocument();
    expect(screen.getByText('Đã khóa — chỉ xem/in')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xem chi tiết phiếu xuất' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In phiếu xuất' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chỉnh sửa phiếu xuất' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa phiếu xuất' })).not.toBeInTheDocument();
  });

  it('shows the issue retry action after a refresh failure, then recovers on retry', async () => {
    issueService.getAllWarehouseIssues
      .mockRejectedValueOnce({ response: { data: { message: 'API tạm thời lỗi' } } })
      .mockResolvedValueOnce({ data: [issue({ tenSanPham: 'Dữ liệu sau retry' })] } as never);

    renderWithQuery(<WarehouseIssueTab />);
    expect(await screen.findByRole('alert')).toHaveTextContent('API tạm thời lỗi');

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findByText('Dữ liệu sau retry')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
