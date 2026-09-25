import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Package, Download, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import TableFilter, { FilterField } from './TableFilter';
import PaginationBar from './common/PaginationBar';
import { useInventoryOverview } from '../hooks/useInventory';
import { useWarehouses } from '../hooks/useWarehouses';
import { useUnitOptions } from '../hooks/useLookups';
import type { InventoryFilters } from '../services/inventoryService';
import internationalProductService from '../services/internationalProductService';

const LOW_STOCK_THRESHOLD = 10;

type SortField = 'maSanPham' | 'tenSanPham' | 'loaiSanPham' | 'tongTonKho' | 'giaThanhTB' | 'giaTriTon';

const InventoryOverview: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('maSanPham');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchParamsInv, setSearchParamsInv] = useSearchParams();
  const syncingRef = useRef(false);
  const inventoryScrollTo = (searchParamsInv.get('inventoryScrollTo') || '').trim();
  const initialLoai = (searchParamsInv.get('loaiSanPham') || '').trim();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const hasScrolledRef = useRef<string | null>(null);
  // Inventory filters other than loaiSanPham/inventoryScrollTo are intentionally local (ephemeral) — see ProductionWarehouse TAB_SCOPED comment.
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '',
    loaiSanPham: initialLoai,
    warehouseId: '',
    donViTinh: '',
    stockStatus: '',
  });

  const clearInventoryUrlKeys = (keys: string[]) => {
    const hasAny = keys.some((k) => searchParamsInv.has(k));
    if (!hasAny) return;
    syncingRef.current = true;
    setSearchParamsInv((prev) => {
      const next = new URLSearchParams(prev);
      for (const k of keys) next.delete(k);
      return next;
    }, { replace: true });
  };

  const { data: warehousesData } = useWarehouses();
  const warehouses = useMemo(() => {
    if (!warehousesData) return [];
    const raw = (warehousesData as any)?.data ?? warehousesData;
    return Array.isArray(raw) ? raw : [];
  }, [warehousesData]);

  const { units } = useUnitOptions();
  const unitOptions = useMemo(
    () => units.map((u) => ({ value: u.label, label: u.label })),
    [units]
  );

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
    stockStatus: (filterValues.stockStatus as 'all' | 'low' | 'normal') || undefined,
    sortBy: sortField,
    sortOrder,
    page: currentPage,
    limit: pageSize,
  }), [filterValues, currentPage, pageSize, sortField, sortOrder]);

  const { data, isLoading, error, refetch } = useInventoryOverview(apiParams);

  const items = data?.data ?? [];
  const pagination = data?.pagination;

  // Deep-link from Card 3: ?inventoryScrollTo=<maSanPham|productId> → filter to that product so it lands on page 1, then scroll.
  // After user clears the filter (Xóa lọc / Xóa chip), drop the URL param so it does not re-seed on next render.
  const clearInventoryScrollTo = () => {
    if (!searchParamsInv.get('inventoryScrollTo')) return;
    clearInventoryUrlKeys(['inventoryScrollTo']);
    hasScrolledRef.current = null;
  };

  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    if (!inventoryScrollTo) return;
    // Don't overwrite if user already searched for that key
    if (filterValues._search === inventoryScrollTo) return;
    // If current page already contains the product, scrolling effect below handles it — still seed search so paginated results narrow if needed on next fetch.
    // Seed search only once per distinct deep-link value.
    if (hasScrolledRef.current === `seed:${inventoryScrollTo}`) return;
    hasScrolledRef.current = `seed:${inventoryScrollTo}`;
    setFilterValues((prev) => ({ ...prev, _search: inventoryScrollTo }));
    setCurrentPage(1);
  }, [inventoryScrollTo, filterValues._search]);

  // Scroll to + highlight the matching row once it is rendered
  useEffect(() => {
    if (!inventoryScrollTo || isLoading || items.length === 0) return;
    const key = inventoryScrollTo.toLowerCase();
    const target = (items as any[]).find((it) =>
      String(it.maSanPham ?? '').toLowerCase() === key ||
      String(it.id ?? '').toLowerCase() === key ||
      String(it.maSanPham ?? '').toLowerCase().includes(key)
    );
    if (!target) return;
    // Avoid re-scrolling same target
    if (hasScrolledRef.current === `done:${target.id}`) return;
    hasScrolledRef.current = `done:${target.id}`;
    setHighlightedId(target.id);
    // Expand row so detail is visible if needed? Just highlight; user can expand.
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-inventory-row="${target.id}"]`) as HTMLElement | null
        || document.querySelector(`[data-ma-san-pham="${CSS.escape(String(target.maSanPham))}"]`) as HTMLElement | null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const t = window.setTimeout(() => setHighlightedId(null), 2800);
    return () => window.clearTimeout(t);
  }, [inventoryScrollTo, items, isLoading]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-400 inline ml-1" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 text-blue-600 inline ml-1" />
      : <ArrowDown className="w-3 h-3 text-blue-600 inline ml-1" />;
  };

  const filterFields: FilterField[] = [
    { key: 'loaiSanPham', label: 'Loại hàng', type: 'select', options: categories.map((c) => ({ value: c, label: c })) },
    { key: 'warehouseId', label: 'Kho', type: 'select', options: warehouses.map((w: any) => ({ value: w.id, label: w.tenKho })) },
    { key: 'stockStatus', label: 'Tồn kho', type: 'select', options: [
      { value: 'low', label: `Sắp hết (≤${LOW_STOCK_THRESHOLD})` },
      { value: 'normal', label: 'Còn hàng' },
    ]},
    // ĐVT is dirty by design (product form allows units outside the catalog),
    // so the combobox suggests catalog units but still accepts free text.
    {
      key: 'donViTinh',
      label: 'Đơn vị tính',
      type: 'combobox',
      allowFreeValue: true,
      placeholder: 'Lọc ĐVT...',
      options: unitOptions,
    },
  ];

  const handleFilterChange = (vals: Record<string, string>) => {
    const toDelete: string[] = [];
    if ((filterValues._search || '') !== '' && (vals._search || '') === '' && searchParamsInv.get('inventoryScrollTo')) {
      toDelete.push('inventoryScrollTo');
      hasScrolledRef.current = null;
    }
    if ((filterValues.loaiSanPham || '') !== '' && (vals.loaiSanPham || '') === '' && searchParamsInv.get('loaiSanPham')) {
      toDelete.push('loaiSanPham');
    }
    if (toDelete.length) clearInventoryUrlKeys(toDelete);
    // If only one of the above triggered and we used the consolidated helper, clearInventoryScrollTo's hasScrolledRef path is already handled.
    // When _search was cleared but the helper already reset hasScrolledRef, avoid double-clear side-effect is harmless.
    setFilterValues(vals);
    setCurrentPage(1);
  };

  // Sync ?loaiSanPham deep-link from Card 4 while already on inventory tab
  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const live = (searchParamsInv.get('loaiSanPham') || '').trim();
    // Only react to an actual navigation that carries the param (or explicitly cleared it from overview)
    // If InventoryOverview itself mounts fresh, initial state already equals initialLoai; skip.
    // Detect a change vs current filterValues via a ref guard to avoid loop.
    if (live !== (filterValues.loaiSanPham || '')) {
      // When URL has the param, treat it as a card drill-down even if inventory tab stays mounted
      // Check that the change is externally driven (searchParams actually has the key or we cleared intentionally)
      // For "clear" case (Tổng): overview writes loaiSanPham=null which deletes the key → live=''
      const hasKey = searchParamsInv.has('loaiSanPham');
      // Only apply if URL either has the key, or we previously had a loaiSanPham from a drill-down.
      // We track whether the last loaiSanPham came from URL vs user; simplest: apply whenever searchParams changed
      // but avoid clobbering user's manual filter right after they changed it. Use a microtask guard:
      // if live came from overview, it will differ from current filterValues; apply it.
      // To avoid overriding a user pick within the same tick, only apply when live !== filterValues.loaiSanPham
      // and searchParams mutation is the source — which is exactly this condition.
      // For Tổng (clear), hasKey=false and live='' will clear the filter, which is desired.
      if (hasKey || filterValues.loaiSanPham !== '') {
        setFilterValues((prev) => prev.loaiSanPham === live ? prev : { ...prev, loaiSanPham: live });
        setCurrentPage(1);
      }
    }
  }, [searchParamsInv]);

  const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
  const formatMoney = (n: number | null | undefined) =>
    n === null || n === undefined || !Number.isFinite(n) ? '—' : `${new Intl.NumberFormat('vi-VN').format(Math.round(n as number))} đ`;

  const getStockColor = (qty: number) => {
    if (qty <= 0) return 'text-gray-400';
    if (qty <= LOW_STOCK_THRESHOLD) return 'text-red-600 font-bold';
    return 'text-gray-900';
  };

  const getStockBg = (qty: number) => {
    if (qty > 0 && qty <= LOW_STOCK_THRESHOLD) return 'bg-red-50';
    return '';
  };

  const totalProducts = pagination?.total ?? 0;
  const summary = (data as any)?.summary as { lowStockCount: number; tongGiaTriTon: number } | null | undefined;
  const lowStockCount = summary != null
    ? summary.lowStockCount
    : items.filter((item) => item.tongTonKho > 0 && item.tongTonKho <= LOW_STOCK_THRESHOLD).length;
  const tongGiaTriTon = summary != null
    ? summary.tongGiaTriTon
    : items.reduce((s, it: any) => s + ((it.giaTriTon ?? 0) as number), 0);

  const handleExport = () => {
    const headers = ['Mã hàng', 'Tên hàng', 'Loại', 'ĐVT', 'Tồn kho', 'Giá TB (đ)', 'Giá trị tồn (đ)'];
    const rows = items.map((item: any) => [
      item.maSanPham, item.tenSanPham, item.loaiSanPham || '', item.donViTinh || '', String(item.tongTonKho),
      item.giaThanhTB != null ? String(Math.round(item.giaThanhTB)) : '',
      item.giaTriTon != null ? String(Math.round(item.giaTriTon)) : '',
    ]);
    const detailRows: string[][] = [];
    for (const item of items) {
      if (item.chiTietTheoKho.length > 1) {
        for (const d of item.chiTietTheoKho) {
          detailRows.push(['', `  └ ${d.tenKho}`, '', '', String(d.soLuong),
            (d as any).giaThanhTB != null ? String(Math.round((d as any).giaThanhTB)) : '',
            (d as any).giaTriTon != null ? String(Math.round((d as any).giaTriTon)) : '',
          ]);
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-blue-300 text-blue-700 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-gray-500">Hàng hóa có tồn</div>
          <div className="text-xl font-bold text-gray-900">{totalProducts}</div>
        </div>
        <div className={`rounded-lg border px-4 py-3 ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            {lowStockCount > 0 && <AlertTriangle className="w-3 h-3 text-red-500" />}
            Sắp hết hàng (≤{LOW_STOCK_THRESHOLD})
          </div>
          <div className={`text-xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStockCount}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-xs text-gray-500">Tổng giá trị tồn</div>
          <div className="text-lg font-bold text-emerald-700" title={`${tongGiaTriTon.toLocaleString('vi-VN')} đ`}>
            {formatMoney(tongGiaTriTon)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={handleFilterChange}
        searchPlaceholder="Tìm kiếm theo mã, tên hàng hoặc kho..."
      />

      {/* Error / Loading / Empty / Table — unified chain matching InboundPlanTab */}
      {error ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {(error as any)?.message || 'Không thể tải dữ liệu tồn kho'}</span>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700 flex-shrink-0">
            <RefreshCw className="w-3 h-3" /> Thử lại
          </button>
        </div>
      ) : isLoading ? (
        <div className="mt-4 text-sm text-gray-400 py-8 text-center">Đang tải...</div>
      ) : items.length === 0 ? (
        (() => {
          const hasActiveFilter = !!(filterValues._search || filterValues.loaiSanPham || filterValues.warehouseId || filterValues.donViTinh || filterValues.stockStatus);
          return hasActiveFilter ? (
            <div className="mt-4 flex flex-col items-center gap-3 text-sm text-gray-500 py-8 text-center border border-dashed rounded-lg">
              <span>Không khớp bộ lọc</span>
              <button
                onClick={() => {
                  const keys: string[] = [];
                  if (searchParamsInv.get('inventoryScrollTo')) keys.push('inventoryScrollTo');
                  if (searchParamsInv.get('loaiSanPham')) keys.push('loaiSanPham');
                  if (keys.length) clearInventoryUrlKeys(keys);
                  hasScrolledRef.current = null;
                  setFilterValues({ _search: '', loaiSanPham: '', warehouseId: '', donViTinh: '', stockStatus: '' });
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
              >
                Xóa lọc
              </button>
            </div>
          ) : (
            <div className="mt-4 text-sm text-gray-400 py-8 text-center border border-dashed rounded-lg">Chưa có hàng hóa tồn kho</div>
          );
        })()
      ) : (
        <div className="mt-4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th scope="col" className="px-3 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 w-8"></th>
                  <th scope="col" aria-sort={sortField === 'maSanPham' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                    <button type="button" onClick={() => handleSort('maSanPham')} className="inline-flex items-center gap-1">Mã hàng <SortIcon field="maSanPham" /></button>
                  </th>
                  <th scope="col" aria-sort={sortField === 'tenSanPham' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                    <button type="button" onClick={() => handleSort('tenSanPham')} className="inline-flex items-center gap-1">Tên hàng <SortIcon field="tenSanPham" /></button>
                  </th>
                  <th scope="col" aria-sort={sortField === 'loaiSanPham' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                    <button type="button" onClick={() => handleSort('loaiSanPham')} className="inline-flex items-center gap-1">Loại <SortIcon field="loaiSanPham" /></button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">ĐVT</th>
                  <th scope="col" aria-sort={sortField === 'tongTonKho' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">
                    <button type="button" onClick={() => handleSort('tongTonKho')} className="inline-flex items-center gap-1 ml-auto">Tồn kho <SortIcon field="tongTonKho" /></button>
                  </th>
                  <th scope="col" aria-sort={sortField === 'giaThanhTB' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">
                    <button type="button" onClick={() => handleSort('giaThanhTB')} className="inline-flex items-center gap-1 ml-auto">Giá TB <SortIcon field="giaThanhTB" /></button>
                  </th>
                  <th scope="col" aria-sort={sortField === 'giaTriTon' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    <button type="button" onClick={() => handleSort('giaTriTon')} className="inline-flex items-center gap-1 ml-auto">Giá trị tồn <SortIcon field="giaTriTon" /></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                    const isExpanded = expandedRows.has(item.id);
                    const hasDetails = item.chiTietTheoKho.length > 0;

                    const isHighlighted = highlightedId === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          data-inventory-row={item.id}
                          data-ma-san-pham={item.maSanPham}
                          className={`hover:bg-blue-50 transition-colors cursor-pointer ${getStockBg(item.tongTonKho)} ${isExpanded ? 'bg-blue-50/50' : ''} ${isHighlighted ? 'ring-2 ring-amber-400 ring-inset bg-amber-50' : ''}`}
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
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-right tabular-nums text-gray-700">
                            {formatMoney((item as any).giaThanhTB)}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-sm text-right tabular-nums font-medium text-emerald-700">
                            {formatMoney((item as any).giaTriTon)}
                          </td>
                        </tr>
                        {isExpanded && hasDetails && (
                          <tr>
                            <td colSpan={8} className="px-3 py-0">
                              <div className="bg-gray-50 rounded-lg border border-gray-200 my-1.5 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th scope="col" className="px-4 py-1.5 text-left text-xs font-medium text-gray-600">Kho</th>
                                      <th scope="col" className="px-4 py-1.5 text-right text-xs font-medium text-gray-600">Số lượng</th>
                                      <th scope="col" className="px-4 py-1.5 text-right text-xs font-medium text-gray-600">Giá trị tồn</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.chiTietTheoKho.map((detail: any) => (
                                      <tr key={detail.warehouseId} className="border-t border-gray-200">
                                        <td className="px-4 py-1.5 text-gray-700">{detail.tenKho}</td>
                                        <td className="px-4 py-1.5 text-right font-medium text-gray-900">
                                          {formatNumber(detail.soLuong)} {item.donViTinh || ''}
                                        </td>
                                        <td className="px-4 py-1.5 text-right tabular-nums text-emerald-700">
                                          {formatMoney(detail.giaTriTon)}
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
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <PaginationBar
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
          onLimitChange={(limit) => { setPageSize(limit); setCurrentPage(1); }}
          label="hàng hóa"
          ariaLabel="Phân trang tồn kho"
        />
      )}
    </div>
  );
};

export default InventoryOverview;
