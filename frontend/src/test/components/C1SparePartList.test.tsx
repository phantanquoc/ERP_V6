import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SparePartList from '../../components/SparePartList';
import { ApiError } from '../../services/apiClient';

// Package C1: SparePartList detail modal must not crash on null optional fields,
// and a failed list must render an error state (not the empty state).

const mockUser = { id: 'u1', firstName: 'A', lastName: 'B', role: 'EMPLOYEE', department: 'production', secondaryDepartments: [] };
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const listState: { data?: unknown; isError: boolean; error: unknown } = { data: undefined, isError: false, error: null };
const refetch = vi.fn();
vi.mock('../../hooks/useSpareParts', () => ({
  useSpareParts: () => ({
    data: listState.data,
    isLoading: false,
    isError: listState.isError,
    error: listState.error,
    refetch,
    isFetching: false,
  }),
  useCreateSparePart: () => ({ mutateAsync: vi.fn() }),
  useUpdateSparePart: () => ({ mutateAsync: vi.fn() }),
  useDeleteSparePart: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('../../services/sparePartService', () => ({
  default: { getById: vi.fn().mockResolvedValue({}), exportExcel: vi.fn() },
}));

const nullPart = {
  id: 'p1',
  maLinhKien: 'LK-001',
  tenLinhKien: 'Vòng bi',
  loai: 'CK',
  donVi: 'Cái',
  soLuongTon: 0,
  giaNhap: null,
  nhaCungCap: null,
  trangThai: 'Chưa sử dụng',
  ngayMua: null,
  fileDinhKem: null,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const renderList = () => render(<MemoryRouter><SparePartList /></MemoryRouter>);

describe('SparePartList (C1)', () => {
  beforeEach(() => {
    listState.data = undefined;
    listState.isError = false;
    listState.error = null;
    refetch.mockClear();
  });

  it('opens the detail modal for a part with null giaNhap/nhaCungCap/ngayMua without crashing', () => {
    listState.data = { success: true, data: [nullPart], pagination: { total: 1, totalPages: 1 } };
    renderList();
    fireEvent.click(screen.getByText('Vòng bi'));
    expect(screen.getByText('Chi tiết linh kiện')).toBeInTheDocument();
    expect(screen.getByText('Giá nhập:').nextSibling?.textContent).toBe('—');
    expect(screen.getByText('Ngày mua:').nextSibling?.textContent).toBe('—');
  });

  it('shows a retryable error instead of the empty state when the list fails', () => {
    listState.isError = true;
    listState.error = new Error('Lỗi khi lấy danh sách linh kiện');
    renderList();
    expect(screen.getByText('Không tải được danh sách linh kiện')).toBeInTheDocument();
    expect(screen.queryByText('Chưa có linh kiện nào trong danh sách')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows a permission message on 403', () => {
    listState.isError = true;
    listState.error = new ApiError(403, 'Truy cập bị từ chối');
    renderList();
    expect(screen.getByText('Bạn không có quyền xem danh sách này')).toBeInTheDocument();
  });

  it('hides write actions for non-technical users', () => {
    listState.data = { success: true, data: [nullPart], pagination: { total: 1, totalPages: 1 } };
    renderList();
    expect(screen.queryByRole('button', { name: /Thêm linh kiện/ })).not.toBeInTheDocument();
  });
});
