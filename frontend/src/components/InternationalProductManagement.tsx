import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Download, Settings } from 'lucide-react';
import Modal from './Modal';
import { useQueryClient } from '@tanstack/react-query';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';
import { useProducts, productKeys } from '../hooks/useProducts';
import TableFilter, { FilterField } from './TableFilter';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';

const InternationalProductManagement: React.FC = () => {
  const { user } = useAuth();
  const canCreateEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD || user?.role === UserRole.TEAM_LEAD;
  const canDelete = user?.role === UserRole.ADMIN;
  const canManageCategories = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD;
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', loaiSanPham: '' });
  const searchTerm = filterValues._search || '';
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InternationalProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<InternationalProduct | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [formData, setFormData] = useState({
    maSanPham: '',
    tenSanPham: '',
    moTaSanPham: '',
    loaiSanPham: '',
  });

  // Category management state
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

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
    limit: 10,
    search: searchTerm || undefined,
  });
  const products = (productsResponse?.data || []).filter(p => {
    if (filterValues.loaiSanPham && p.loaiSanPham !== filterValues.loaiSanPham) return false;
    return true;
  });
  const pagination = productsResponse?.pagination;



  const handleCreate = async () => {
    if (!formData.tenSanPham.trim()) {
      alert('Vui lòng nhập tên hàng hóa');
      return;
    }

    try {
      // Không truyền maSanPham — backend tự sinh để đảm bảo atomic
      await internationalProductService.createProduct({
        tenSanPham: formData.tenSanPham,
        moTaSanPham: formData.moTaSanPham,
        loaiSanPham: formData.loaiSanPham,
      });
      alert('Tạo hàng hóa thành công!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    } catch (error: any) {
      console.error('Error creating product:', error);
      alert(error.response?.data?.message || 'Lỗi khi tạo hàng hóa');
    }
  };

  const handleUpdate = async () => {
    if (!editingProduct) return;

    try {
      await internationalProductService.updateProduct(editingProduct.id, {
        tenSanPham: formData.tenSanPham,
        moTaSanPham: formData.moTaSanPham,
        loaiSanPham: formData.loaiSanPham,
      });
      alert('Cập nhật hàng hóa thành công!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert(error.response?.data?.message || 'Lỗi khi cập nhật hàng hóa');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hàng hóa này?')) return;

    try {
      await internationalProductService.deleteProduct(id);
      alert('Xóa hàng hóa thành công!');
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    } catch (error: any) {
      console.error('Error deleting product:', error);

      // Extract error message from different possible locations
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Lỗi khi xóa hàng hóa';

      // Show detailed error message
      alert(`❌ Không thể xóa hàng hóa!\n\n${errorMessage}`);
    }
  };

  const openCreateModal = async () => {
    setEditingProduct(null);
    setFormData({ maSanPham: '', tenSanPham: '', moTaSanPham: '', loaiSanPham: '' });
    setShowModal(true);
    // Fetch preview code
    setGeneratingCode(true);
    try {
      const res = await internationalProductService.generateProductCode();
      setFormData(prev => ({ ...prev, maSanPham: res.data?.code ?? '' }));
    } catch {
      // Leave blank — backend will still auto-generate on submit
    } finally {
      setGeneratingCode(false);
    }
  };

  const openEditModal = (product: InternationalProduct) => {
    setEditingProduct(product);
    setFormData({
      maSanPham: product.maSanPham,
      tenSanPham: product.tenSanPham,
      moTaSanPham: product.moTaSanPham || '',
      loaiSanPham: product.loaiSanPham || '',
    });
    setShowModal(true);
  };

  const openDetailModal = (product: InternationalProduct) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      maSanPham: '',
      tenSanPham: '',
      moTaSanPham: '',
      loaiSanPham: '',
    });
    setEditingProduct(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Check if product code already exists






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
                await internationalProductService.exportToExcel({ search: searchTerm || undefined });
              } catch (error) {
                console.error('Error exporting to Excel:', error);
                alert('Lỗi khi xuất Excel');
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
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                Mã hàng hóa
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                Tên hàng hóa
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                Loại hàng hóa
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                Mô tả
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              products.map((product, index) => (
                <tr
                  key={product.id}
                  onClick={() => openDetailModal(product)}
                  className={`border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                    {product.maSanPham}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                    {product.tenSanPham}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                    {product.loaiSanPham || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                    {product.moTaSanPham || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      {canDelete && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
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
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, pagination.total)} / {pagination.total} mục
          </span>
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
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-2xl sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start sm:items-center gap-3 border-b px-4 sm:px-6 py-4 shrink-0">
                <h2 className="text-lg sm:text-xl font-bold">
                  {editingProduct ? 'Chỉnh sửa hàng hóa' : 'Thêm hàng hóa mới'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
          <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã hàng hóa
                    {!editingProduct && (
                      <span className="ml-2 text-xs text-gray-400 font-normal">(tự động sinh)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    name="maSanPham"
                    value={generatingCode ? 'Đang sinh mã...' : formData.maSanPham}
                    readOnly
                    placeholder="SP-0001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên hàng hóa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tenSanPham"
                    value={formData.tenSanPham}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại hàng hóa
                  </label>
                  <select
                    name="loaiSanPham"
                    value={formData.loaiSanPham}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn loại hàng hóa --</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả hàng hóa
                  </label>
                  <textarea
                    name="moTaSanPham"
                    value={formData.moTaSanPham}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={editingProduct ? handleUpdate : handleCreate}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingProduct ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

      {/* Detail Modal */}
      <Modal isOpen={showDetailModal && !!selectedProduct} onClose={() => setShowDetailModal(false)} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-2xl sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start sm:items-center gap-3 border-b px-4 sm:px-6 py-4 shrink-0">
                <h2 className="text-lg sm:text-xl font-bold">Chi tiết hàng hóa</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
          <div className="overflow-y-auto flex-1 p-4 sm:p-6">
              {selectedProduct && (<>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Mã hàng hóa</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.maSanPham}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Tên hàng hóa</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.tenSanPham}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Loại hàng hóa</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.loaiSanPham || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Mô tả hàng hóa</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.moTaSanPham || '-'}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ngày tạo</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedProduct.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Ngày cập nhật</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedProduct.updatedAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Đóng
                </button>
                {canCreateEdit && (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openEditModal(selectedProduct);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Chỉnh sửa
                  </button>
                )}
              </div>
              </>)}
            </div>
          </div>
        </Modal>

      {/* Category Settings Modal */}
      <Modal isOpen={showCategoryModal} onClose={() => { setShowCategoryModal(false); setEditingCategory(null); setNewCategoryName(''); }} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-lg sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start sm:items-center gap-3 border-b px-4 sm:px-6 py-4 shrink-0">
                <h2 className="text-lg sm:text-xl font-bold">Cài đặt loại hàng hóa</h2>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setNewCategoryName(''); }} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>
          <div className="overflow-y-auto flex-1 p-4 sm:p-6">

              {/* Add new category */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nhập tên loại hàng hóa mới..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={async () => {
                    const name = newCategoryName.trim();
                    if (!name) return;
                    if (categories.includes(name)) {
                      alert('Loại hàng hóa này đã tồn tại!');
                      return;
                    }
                    setCategoryLoading(true);
                    try {
                      await internationalProductService.addCategory(name);
                      await fetchCategories();
                      setNewCategoryName('');
                    } catch (error: any) {
                      alert(error.response?.data?.message || 'Lỗi khi thêm loại hàng hóa');
                    } finally {
                      setCategoryLoading(false);
                    }
                  }}
                  disabled={!newCategoryName.trim() || categoryLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Category list */}
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Chưa có loại hàng hóa nào</p>
                ) : (
                  categories.map((cat) => (
                    <div key={cat} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      {editingCategory === cat ? (
                        <input
                          type="text"
                          value={editCategoryName}
                          onChange={(e) => setEditCategoryName(e.target.value)}
                          className="flex-1 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none mr-2"
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{cat}</span>
                      )}
                      <div className="flex items-center gap-1">
                        {editingCategory === cat ? (
                          <>
                            <button
                              onClick={async () => {
                                const newName = editCategoryName.trim();
                                if (!newName || newName === cat) {
                                  setEditingCategory(null);
                                  return;
                                }
                                if (categories.includes(newName)) {
                                  alert('Loại hàng hóa này đã tồn tại!');
                                  return;
                                }
                                setCategoryLoading(true);
                                try {
                                  await internationalProductService.renameCategory(cat, newName);
                                  await fetchCategories();
                                  queryClient.invalidateQueries({ queryKey: productKeys.lists() });
                                  setEditingCategory(null);
                                } catch (error: any) {
                                  alert(error.response?.data?.message || 'Lỗi khi đổi tên');
                                } finally {
                                  setCategoryLoading(false);
                                }
                              }}
                              disabled={categoryLoading}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                              title="Lưu"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                              title="Hủy"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => { setEditingCategory(cat); setEditCategoryName(cat); }}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                              title="Sửa"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Xóa loại "${cat}"? Các sản phẩm thuộc loại này sẽ bị bỏ trống loại hàng hóa.`)) return;
                                setCategoryLoading(true);
                                try {
                                  await internationalProductService.deleteCategory(cat);
                                  await fetchCategories();
                                  queryClient.invalidateQueries({ queryKey: productKeys.lists() });
                                } catch (error: any) {
                                  alert(error.response?.data?.message || 'Lỗi khi xóa');
                                } finally {
                                  setCategoryLoading(false);
                                }
                              }}
                              disabled={categoryLoading}
                              className="p-1 text-red-600 hover:bg-red-100 rounded"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Modal>
    </div>
  );
};

export default InternationalProductManagement;

