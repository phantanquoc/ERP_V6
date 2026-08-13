import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Package, Download, AlertTriangle } from 'lucide-react';
import TableFilter, { FilterField } from './TableFilter';
import { useInventoryOverview } from '../hooks/useInventory';
import { useWarehouses } from '../hooks/useWarehouses';
import type { InventoryFilters } from '../services/inventoryService';
import internationalProductService from '../services/internationalProductService';

const LOW_STOCK_THRESHOLD = 10;

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

  const { data: warehousesData } = useWarehouses();
  const warehouses = useMemo(() => {
    if (!warehousesData) return [];
    const raw = (warehousesData as any)?.data ?? warehousesData;
    return Array.isArray(raw) ? raw : [];
  }, [warehousesData]);

  const [categories, setCategories] = useState<string[]>([]);
  React.useEffect(() => {
    internationalProductService.getCategories().then((res: any) => {
      setCategories(res?.data?.data ?? res?.data ?? []);
    }).catch(() => {});
  }, []);

  const apiParams: InventoryFilters = useMemo(() => ({
    search: filterValues._search || undefined,
    loaiSanPham: filterValues.loaiSanPham || undefined,
    warehouseId: filterValues.warehouseId || undefined,
    donViTinh: filterValues.donViTinh || undefined,
    hasStock: true,
    page: currentPage,
    limit: itemsPerPage,
  }), [filterValues, currentPage]);

  const { data, isLoading, error } = useInventoryOverview(apiParams);

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
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

  const getStockColor = (qty: number) => {
    if (qty <= 0) return 'text-gray-400';
    if (qty <= LOW_STOCK_THRESHOLD) return 'text-red-600 font-bold';
    return 'text-gray-900';
  };

  const getStockBg = (qty: number) => {
    if (qty > 0 && qty <= LOW_STOCK_THRESHOLD) return 'bg-red-50';
    return '';
  };

  // Summary stats
  const totalProducts = pagination?.total ?? items.length;
  const totalStock = items.reduce((sum, item) => sum + item.tongTonKho, 0);
  const lowStockCount = items.filter((item) => item.tongTonKho > 0 && item.tongTonKho <= LOW_STOCK_THRESHOLD).length;

  const handleExport = () => {
    const headers = ['Mã hàng', 'Tên hàng', 'Loại', 'ĐVT', 'Tổng tồn kho'];
    const rows = items.map((item) => [
      item.maSanPham,
      item.tenSanPham,
      item.loaiSanPham || '',
      item.donViTinh || '',
      String(item.tongTonKho),
    ]);
    // Expand warehouse details
    const detailRows: string[][] = [];
    for (const item of items) {
      if (item.chiTietTheoKho.length > 1) {
        for (const d of item.chiTietTheoKho) {
          detailRows.push(['', `  └ ${d.tenKho}`, '', '', String(d.soLuong)]);
        }
      }
    }
    const csv = [headers, ...rows, ...detailRows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ton-kho-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Tồn kho
        </h2>
        <button
          onClick={handleExport}
          disabled={items.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-gray-500">Sản phẩm có tồn</div>
          <div className="text-xl font-bold text-gray-900">{totalProducts}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-gray-500">Tổng tồn kho</div>
          <div className="text-xl font-bold text-gray-900">{formatNumber(totalStock)}</div>
        </div>
        <div className={`rounded-lg border px-4 py-3 ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            {lowStockCount > 0 && <AlertTriangle className="w-3 h-3 text-red-500" />}
            Tồn thấp (≤{LOW_STOCK_THRESHOLD})
          </div>
          <div className={`text-xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockCount}</div>
        </div>
      </div>

      {/* Filters */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={handleFilterChange}
        searchPlaceholder="Tìm kiếm theo mã hoặc tên sản phẩm..."
      />

      {/* Error */}
      {error && (
        <div className="mt-4 mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Không thể tải dữ liệu tồn kho</span>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 w-8"></th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã hàng</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên hàng</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Loại</th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">ĐVT</th>
                  <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Tồn kho</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Không có sản phẩm nào có tồn kho
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isExpanded = expandedRows.has(item.id);
                    const hasDetails = item.chiTietTheoKho.length > 0;

                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`hover:bg-blue-50 transition-colors cursor-pointer ${getStockBg(item.tongTonKho)} ${isExpanded ? 'bg-blue-50/50' : ''}`}
                          onClick={() => hasDetails && toggleRow(item.id)}
                        >
                          <td className="px-3 py-2.5 text-center border-r border-gray-200">
                            {hasDetails ? (
                              isExpanded
                                ? <ChevronDown className="w-4 h-4 text-gray-500 inline" />
                                : <ChevronRight className="w-4 h-4 text-gray-500 inline" />
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                            {item.maSanPham}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                            {item.tenSanPham}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                            {item.loaiSanPham || '-'}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 border-r border-gray-200">
                            {item.donViTinh || '-'}
                          </td>
                          <td className={`px-4 py-2.5 whitespace-nowrap text-sm text-right ${getStockColor(item.tongTonKho)}`}>
                            {formatNumber(item.tongTonKho)}
                          </td>
                        </tr>
                        {isExpanded && hasDetails && (
                          <tr>
                            <td colSpan={6} className="px-3 py-0">
                              <div className="bg-gray-50 rounded-lg border border-gray-200 my-1.5 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th scope="col" className="px-4 py-1.5 text-left text-xs font-medium text-gray-600">Kho</th>
                                      <th scope="col" className="px-4 py-1.5 text-right text-xs font-medium text-gray-600">Số lượng</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.chiTietTheoKho.map((detail) => (
                                      <tr key={detail.warehouseId} className="border-t border-gray-200">
                                        <td className="px-4 py-1.5 text-gray-700">{detail.tenKho}</td>
                                        <td className="px-4 py-1.5 text-right font-medium text-gray-900">
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
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} sản phẩm
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
