import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Download, Settings } from 'lucide-react';
import ConfirmDialog from './common/ConfirmDialog';
import { useQueryClient } from '@tanstack/react-query';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';
import { useProducts, productKeys } from '../hooks/useProducts';
import type { ProductSortField } from '../hooks/useProducts';
import SortableColumnHeader from './common/SortableColumnHeader';
import { useDebounce } from '../hooks/useDebounce';
import TableFilter, { FilterField } from './TableFilter';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import ProductFormModal from './products/ProductFormModal';
import ProductDetailModal from './products/ProductDetailModal';
import CategorySettingsModal from './products/CategorySettingsModal';

const InternationalProductManagement: React.FC = () => {
  const { user } = useAuth();
  const canCreateEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD || user?.role === UserRole.TEAM_LEAD;
  const canDelete = user?.role === UserRole.ADMIN;
  const canManageCategories = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD;
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    _search: '', loaiSanPham: '', maSanPham: '', tenSanPham: '', donViTinh: '',
  });
  const searchTerm = filterValues._search || '';
  const debouncedSearch = useDebounce(searchTerm, 300);
  const loaiSanPhamFilter = filterValues.loaiSanPham || '';
  // Column filters go through the same debounce as the search box: they are free text and
  // each change would otherwise fire a request per keystroke.
  const debouncedMaSanPham = useDebounce(filterValues.maSanPham || '', 300);
  const debouncedTenSanPham = useDebounce(filterValues.tenSanPham || '', 300);
  const donViTinhFilter = filterValues.donViTinh || '';
  // Default: highest STT first (newest product code on top).
  const [sortBy, setSortBy] = useState<ProductSortField>('maSanPham');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InternationalProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<InternationalProduct | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InternationalProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    maSanPham: '',
    tenSanPham: '',
    moTaSanPham: '',
    loaiSanPham: '',
    donViTinh: '',
    giaThanh: '',
  });
  /**
   * True once the user edits the code by hand. Auto-suggestion then stops, so typing a
   * code and going back to fix a typo in the name does not silently discard it.
   */
  const [codeTouched, setCodeTouched] = useState(false);

  // Category management state
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await internationalProductService.getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const queryClient = useQueryClient();
  const { data: productsResponse, isLoading: loading } = useProducts({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch || undefined,
    loaiSanPham: loaiSanPhamFilter || undefined,
    maSanPham: debouncedMaSanPham || undefined,
    tenSanPham: debouncedTenSanPham || undefined,
    donViTinh: donViTinhFilter || undefined,
    sortBy,
    sortOrder,
  });
  // Backend paginates, filters AND sorts — nothing is filtered or reordered here, since
  // this only holds one page of rows.
  const products = productsResponse?.data || [];
  const pagination = productsResponse?.pagination;
  const hasActiveFilter = !!(
    debouncedSearch || loaiSanPhamFilter || debouncedMaSanPham || debouncedTenSanPham || donViTinhFilter
  );

  /** Units offered in the ĐVT column filter, taken from the rows in view. */
  const unitOptions = useMemo(
    () => [...new Set(products.map((p) => p.donViTinh).filter((u): u is string => !!u))].sort(
      (a, b) => a.localeCompare(b, 'vi')
    ),
    [products]
  );

  // Reset to page 1 whenever filters, sort or page size change so we never land on an
  // out-of-range page. Sort is included because it changes which rows fall on page 1.
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, loaiSanPhamFilter, debouncedMaSanPham, debouncedTenSanPham, donViTinhFilter, sortBy, sortOrder, pageSize]);

  /**
   * Clicking a column header sorts by it. Clicking the active column flips the direction;
   * switching column starts ascending, which reads more naturally for text and codes.
   */
  const handleSort = (key: string) => {
    const field = key as ProductSortField;
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleColumnFilter = (key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };



  const handleCreate = async () => {
    if (!formData.tenSanPham.trim()) {
      toast.error('Vui lòng nhập tên hàng hóa');
      return;
    }

    try {
      const parsedGiaThanh = formData.giaThanh.trim() === '' ? null : Number(formData.giaThanh);
      if (parsedGiaThanh !== null && (!Number.isFinite(parsedGiaThanh) || parsedGiaThanh < 0)) {
        toast.error('Giá thành phải là số không âm');
        return;
      }
      // The code is user-editable now, so send whatever is in the field. Left empty,
      // the backend falls back to its own suggestion.
      await internationalProductService.createProduct({
        maSanPham: formData.maSanPham.trim(),
        tenSanPham: formData.tenSanPham,
        moTaSanPham: formData.moTaSanPham,
        loaiSanPham: formData.loaiSanPham,
        donViTinh: formData.donViTinh,
        ...(parsedGiaThanh !== null ? { giaThanh: parsedGiaThanh } : {}),
      });
      toast.success('Tạo hàng hóa thành công');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi tạo hàng hóa');
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;
    if (!formData.tenSanPham.trim()) {
      toast.error('Vui lòng nhập tên hàng hóa');
      return;
    }
    if (!formData.maSanPham.trim()) {
      toast.error('Vui lòng nhập mã hàng hóa');
      return;
    }

    try {
      const parsedGiaThanh = formData.giaThanh.trim() === '' ? null : Number(formData.giaThanh);
      if (parsedGiaThanh !== null && (!Number.isFinite(parsedGiaThanh) || parsedGiaThanh < 0)) {
        toast.error('Giá thành phải là số không âm');
        return;
      }
      await internationalProductService.updateProduct(editingProduct.id, {
        maSanPham: formData.maSanPham.trim(),
        tenSanPham: formData.tenSanPham,
        moTaSanPham: formData.moTaSanPham,
        loaiSanPham: formData.loaiSanPham,
        donViTinh: formData.donViTinh,
        giaThanh: parsedGiaThanh,
      });
      toast.success('Cập nhật hàng hóa thành công');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật hàng hóa');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await internationalProductService.deleteProduct(deleteTarget.id);
      toast.success('Xóa hàng hóa thành công');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    } catch (error: any) {
      console.error('Error deleting product:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Lỗi khi xóa hàng hóa';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({ maSanPham: '', tenSanPham: '', moTaSanPham: '', loaiSanPham: '', donViTinh: '', giaThanh: '' });
    // The code is derived from name + category, so there is nothing to suggest until the
    // user has entered them — no fetch on open.
    setCodeTouched(false);
    setShowModal(true);
  };

  const openEditModal = (product: InternationalProduct) => {
    setEditingProduct(product);
    setFormData({
      maSanPham: product.maSanPham,
      tenSanPham: product.tenSanPham,
      moTaSanPham: product.moTaSanPham || '',
      loaiSanPham: product.loaiSanPham || '',
      donViTinh: product.donViTinh || '',
      giaThanh: product.giaThanh != null ? String(product.giaThanh) : '',
    });
    // An existing code is the user's, never auto-replaced.
    setCodeTouched(true);
    setShowModal(true);
  };

  /**
   * Fetch a suggested code for the current name + category.
   *
   * `force` is set by the explicit "Gợi ý" button and overwrites whatever is in the
   * field; the automatic path never overwrites a code the user typed.
   */
  const suggestCode = async (force: boolean) => {
    if (!formData.loaiSanPham) return;
    if (!force && codeTouched) return;

    setGeneratingCode(true);
    try {
      const res = await internationalProductService.generateProductCode(
        formData.tenSanPham,
        formData.loaiSanPham,
      );
      const code = res.data?.code ?? '';
      if (code) {
        setFormData(prev => ({ ...prev, maSanPham: code }));
        if (force) setCodeTouched(false);
      }
    } catch {
      // Suggestion is best-effort; the user can always type a code by hand.
    } finally {
      setGeneratingCode(false);
    }
  };

  const openDetailModal = (product: InternationalProduct) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setCodeTouched(false);
    setFormData({
      maSanPham: '',
      tenSanPham: '',
      moTaSanPham: '',
      loaiSanPham: '',
      donViTinh: '',
      giaThanh: '',
    });
    setEditingProduct(null);
  };

  /**
   * Suggest a code once the user has entered a name and picked a category.
   *
   * Debounced because the name changes on every keystroke. Skipped while editing an
   * existing product and once the user has touched the code (codeTouched is checked
   * inside suggestCode).
   */
  useEffect(() => {
    if (!showModal || editingProduct || codeTouched) return;
    if (!formData.tenSanPham.trim() || !formData.loaiSanPham) return;

    const timer = setTimeout(() => { void suggestCode(false); }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, editingProduct, codeTouched, formData.tenSanPham, formData.loaiSanPham]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Editing the code by hand takes it out of auto-suggestion.
    if (name === 'maSanPham') setCodeTouched(true);
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const productFilterFields: FilterField[] = [
    { key: 'loaiSanPham', label: 'Loại hàng hóa', type: 'select', options: categories.map(cat => ({ value: cat, label: cat })) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Danh sách hàng hóa</h2>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {canManageCategories && (
            <button
              onClick={() => { fetchCategories(); setShowCategoryModal(true); }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              title="Cài đặt loại hàng hóa"
            >
              <Settings className="w-4 h-4" />
              Cài đặt
            </button>
          )}
          <button
            onClick={async () => {
              try {
                // Export what is on screen: same filters and sort as the table.
                await internationalProductService.exportToExcel({
                  search: debouncedSearch || undefined,
                  loaiSanPham: loaiSanPhamFilter || undefined,
                  maSanPham: debouncedMaSanPham || undefined,
                  tenSanPham: debouncedTenSanPham || undefined,
                  donViTinh: donViTinhFilter || undefined,
                  sortBy,
                  sortOrder,
                });
              } catch (error) {
                console.error('Error exporting to Excel:', error);
                toast.error('Lỗi khi xuất Excel');
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          {canCreateEdit && (
            <button
              onClick={openCreateModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm hàng hóa
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <TableFilter
        filters={productFilterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm theo mã, tên hàng hóa..."
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300">
              {/* STT is a running row number, not a column of data, so it is neither
                  sortable nor filterable. */}
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 w-12">
                STT
              </th>
              <SortableColumnHeader
                label="Mã hàng hóa"
                sortKey="maSanPham"
                activeSortKey={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
                filterKey="maSanPham"
                filterValue={filterValues.maSanPham || ''}
                onFilterChange={handleColumnFilter}
                filterPlaceholder="VD: NLT"
                className="w-32"
              />
              <SortableColumnHeader
                label="Tên hàng hóa"
                sortKey="tenSanPham"
                activeSortKey={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
                filterKey="tenSanPham"
                filterValue={filterValues.tenSanPham || ''}
                onFilterChange={handleColumnFilter}
                filterPlaceholder="VD: mít sấy"
              />
              <SortableColumnHeader
                label="Loại hàng hóa"
                sortKey="loaiSanPham"
                activeSortKey={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
                filterKey="loaiSanPham"
                filterValue={filterValues.loaiSanPham || ''}
                onFilterChange={handleColumnFilter}
                // Categories are a known set, so a dropdown avoids typos and matches the
                // exact-match filter the server applies to this column.
                filterOptions={categories}
                className="w-40"
              />
              <SortableColumnHeader
                label="ĐVT"
                sortKey="donViTinh"
                activeSortKey={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
                filterKey="donViTinh"
                filterValue={filterValues.donViTinh || ''}
                onFilterChange={handleColumnFilter}
                filterOptions={unitOptions}
                className="w-20"
              />
              {/* Giá thành chuẩn (VND) — giá vốn mặc định của hàng hóa; kiện thực tế
                  có thể khác và sửa trong modal "Sửa kiện" của kho. */}
              <SortableColumnHeader
                label="Giá thành"
                sortKey="giaThanh"
                activeSortKey={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
                className="w-32"
              />
              <SortableColumnHeader
                label="Mô tả"
                sortKey="moTaSanPham"
                activeSortKey={sortBy}
                activeSortOrder={sortOrder}
                onSort={handleSort}
              />
              <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 w-24">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                  {hasActiveFilter ? (
                    <div className="flex flex-col items-center gap-2">
                      <span>Không tìm thấy hàng hóa khớp bộ lọc</span>
                      <button
                        onClick={() => setFilterValues({
                          _search: '', loaiSanPham: '', maSanPham: '', tenSanPham: '', donViTinh: '',
                        })}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Xóa bộ lọc
                      </button>
                    </div>
                  ) : (
                    'Chưa có hàng hóa nào'
                  )}
                </td>
              </tr>
            ) : (
              products.map((product, index) => (
                <tr
                  key={product.id}
                  onClick={() => openDetailModal(product)}
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 text-sm text-gray-500 tabular-nums">
                    {(currentPage - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-blue-600 whitespace-nowrap">
                    {product.maSanPham}
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    {product.tenSanPham}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {product.loaiSanPham || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                    {product.donViTinh || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-sm text-right tabular-nums text-gray-900" title={product.giaThanh != null ? `${product.giaThanh.toLocaleString('vi-VN')} đ` : 'Chưa định giá'}>
                    {product.giaThanh != null && Number.isFinite(product.giaThanh)
                      ? `${new Intl.NumberFormat('vi-VN').format(product.giaThanh)} đ`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate" title={product.moTaSanPham || ''}>
                    {product.moTaSanPham || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {canCreateEdit && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(product); }}
                          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Sửa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(product); }}
                          className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {!canCreateEdit && !canDelete && (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, pagination.total)} / {pagination.total} mục
            </span>
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <span>Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
              >
                {[20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </label>
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trước
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === pagination.totalPages || Math.abs(page - currentPage) <= 2)
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-sm rounded-md ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <ProductFormModal
        isOpen={showModal}
        isEditing={!!editingProduct}
        formData={formData}
        categories={categories}
        generatingCode={generatingCode}
        onClose={() => setShowModal(false)}
        onChange={handleInputChange}
        onSubmit={editingProduct ? handleUpdate : handleCreate}
        onSuggestCode={() => { void suggestCode(true); }}
      />

      {/* Detail Modal */}
      <ProductDetailModal
        isOpen={showDetailModal}
        product={selectedProduct}
        canEdit={canCreateEdit}
        onClose={() => setShowDetailModal(false)}
        onEdit={openEditModal}
      />

      {/* Category Settings Modal */}
      <CategorySettingsModal
        isOpen={showCategoryModal}
        categories={categories}
        onClose={() => setShowCategoryModal(false)}
        onChanged={() => {
          fetchCategories();
          queryClient.invalidateQueries({ queryKey: productKeys.lists() });
        }}
      />

      {/* Confirm Delete Product */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Xóa hàng hóa"
        message={deleteTarget ? `Bạn có chắc chắn muốn xóa hàng hóa "${deleteTarget.tenSanPham}"?` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default InternationalProductManagement;

