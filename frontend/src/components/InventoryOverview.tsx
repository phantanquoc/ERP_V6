import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Package } from 'lucide-react';
import TableFilter, { FilterField } from './TableFilter';
import { useInventoryOverview } from '../hooks/useInventory';
import { useWarehouses } from '../hooks/useWarehouses';
import type { InventoryFilters } from '../services/inventoryService';
import internationalProductService from '../services/internationalProductService';

const InventoryOverview: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    loaiSanPham: '',
    warehouseId: '',
    donViTinh: '',
  });

  // Fetch warehouses for the filter dropdown
  const { data: warehousesData } = useWarehouses();
  const warehouses = useMemo(() => {
    if (!warehousesData) return [];
    const raw = (warehousesData as any)?.data ?? warehousesData;
    return Array.isArray(raw) ? raw : [];
  }, [warehousesData]);

  // Fetch categories for filter dropdown
  const [categories, setCategories] = useState<string[]>([]);
  React.useEffect(() => {
    internationalProductService.getCategories().then((res: any) => {
      setCategories(res?.data?.data ?? res?.data ?? []);
    }).catch(() => {});
  }, []);

  // Build API params from filter values
  const apiParams: InventoryFilters = useMemo(() => ({
    search: filterValues._search || undefined,
    loaiSanPham: filterValues.loaiSanPham || undefined,
    warehouseId: filterValues.warehouseId || undefined,
    donViTinh: filterValues.donViTinh || undefined,
    page: currentPage,
    limit: itemsPerPage,
  }), [filterValues, currentPage]);

  const { data, isLoading, error } = useInventoryOverview(apiParams);

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filterFields: FilterField[] = [
    { key: 'loaiSanPham', label: 'Loại hàng', type: 'select', options: categories.map((c) => ({ value: c, label: c })) },
    { key: 'warehouseId', label: 'Kho', type: 'select', options: warehouses.map((w: any) => ({ value: w.id, label: w.tenKho })) },
    { key: 'donViTinh', label: 'Đơn vị tính', type: 'text', placeholder: 'Lọc ĐVT...' },
  ];

  const handleFilterChange = (vals: Record<string, string>) => {
    setFilterValues(vals);
    setCurrentPage(1);
  };

  const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-6 h-6 text-blue-600" />
          Tồn kho
        </h2>
      </div>

      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={handleFilterChange}
        searchPlaceholder="Tìm kiếm theo mã hoặc tên sản phẩm..."
      />

      {error && (
        <div className="mt-4 mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <span>Không thể tải dữ liệu tồn kho</span>
        </div>
      )}

      {isLoading && (
        <p className="mt-4 mb-4 text-sm text-gray-500">Đang tải dữ liệu tồn kho...</p>
      )}

      {/* Inventory Table */}
      <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 w-8"></th>
                <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã hàng</th>
                <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng</th>
                <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Loại</th>
                <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">ĐVT</th>
                <th scope="col" className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Tổng tồn kho</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu tồn kho
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isExpanded = expandedRows.has(item.id);
                  const hasDetails = item.chiTietTheoKho.length > 0;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`hover:bg-blue-50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/50' : ''}`}
                        onClick={() => hasDetails && toggleRow(item.id)}
                      >
                        <td className="px-4 py-3 text-center border-r border-gray-200">
                          {hasDetails ? (
                            isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-500 inline" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500 inline" />
                            )
                          ) : null}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                          {item.maSanPham}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                          {item.tenSanPham}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                          {item.loaiSanPham || '-'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                          {item.donViTinh || '-'}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-right text-gray-900">
                          {formatNumber(item.tongTonKho)}
                        </td>
                      </tr>
                      {isExpanded && hasDetails && (
                        <tr>
                          <td colSpan={6} className="px-4 py-0">
                            <div className="bg-gray-50 rounded-lg border border-gray-200 my-2 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-100">
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-600">Kho</th>
                                    <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-600">Số lượng</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.chiTietTheoKho.map((detail) => (
                                    <tr key={detail.warehouseId} className="border-t border-gray-200">
                                      <td className="px-4 py-2 text-gray-700">{detail.tenKho}</td>
                                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                                        {formatNumber(detail.soLuong)} {item.donViTinh || ''}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} mục
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((page) => page === 1 || page === pagination.totalPages || Math.abs(page - pagination.page) <= 2)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      page === pagination.page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={pagination.page === pagination.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryOverview;
