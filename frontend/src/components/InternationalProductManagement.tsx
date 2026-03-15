import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, X, Download, Settings } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';
import { useProducts, productKeys } from '../hooks/useProducts';

const InternationalProductManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InternationalProduct | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<InternationalProduct | null>(null);
  const [maSanPhamError, setMaSanPhamError] = useState<string>('');
  const [checkingCode, setCheckingCode] = useState(false);
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
  const products = productsResponse?.data || [];
  const pagination = productsResponse?.pagination;



  const handleCreate = async () => {
    // Validate maSanPham is not empty
    if (!formData.maSanPham.trim()) {
      setMaSanPhamError('Vui lòng nhập mã hàng hóa');
      return;
    }

    // Check if there's an existing error
    if (maSanPhamError) {
      return;
    }

    try {
      await internationalProductService.createProduct(formData);
      alert('Tạo hàng hóa thành công!');
      setShowModal(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    } catch (error: any) {
      console.error('Error creating product:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi khi tạo hàng hóa';
      if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('đã tồn tại')) {
        setMaSanPhamError('Mã hàng hóa đã tồn tại. Vui lòng nhập mã khác');
      } else {
        alert(errorMessage);
      }
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

  const openCreateModal = () => {
    setFormData({
      maSanPham: '',
      tenSanPham: '',
      moTaSanPham: '',
      loaiSanPham: '',
    });
    setEditingProduct(null);
    setMaSanPhamError('');
    setShowModal(true);
  };

  const openEditModal = (product: InternationalProduct) => {
    setEditingProduct(product);
    setFormData({
      maSanPham: product.maSanPham,
      tenSanPham: product.tenSanPham,
      moTaSanPham: product.moTaSanPham || '',
      loaiSanPham: product.loaiSanPham || '',
    });
    setMaSanPhamError('');
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
    setMaSanPhamError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user types in maSanPham field
    if (name === 'maSanPham') {
      setMaSanPhamError('');
    }
  };

  // Check if product code already exists
  const checkProductCodeExists = async (code: string) => {
    if (!code.trim()) {
      setMaSanPhamError('');
      return;
    }

    setCheckingCode(true);
    try {
      const response = await internationalProductService.getProductByCode(code);
      if (response.data) {
        setMaSanPhamError('Mã hàng hóa đã tồn tại. Vui lòng nhập mã khác');
      } else {
        setMaSanPhamError('');
      }
    } catch (error: any) {
      // If 404, the code doesn't exist (which is good)
      if (error.response?.status === 404) {
        setMaSanPhamError('');
      }
    } finally {
      setCheckingCode(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };


  return (
    <div>
      {/* Table Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Action Bar */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên hàng hóa..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchCategories(); setShowCategoryModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              title="Cài đặt loại hàng hóa"
            >
              <Settings className="w-4 h-4" />
              Cài đặt
            </button>
            <button
              onClick={async () => {
                try {
                  await internationalProductService.exportToExcel({ search: searchTerm || undefined });
                } catch (error) {
                  console.error('Error exporting to Excel:', error);
                  alert('Lỗi khi xuất Excel');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm hàng hóa
            </button>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
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
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {product.maSanPham}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.tenSanPham}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.loaiSanPham || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {product.moTaSanPham || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailModal(product)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-green-600 hover:text-green-800"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, pagination.total)} / {pagination.total} mục
          </span>
          <div className="flex items-center gap-2">
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
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Chỉnh sửa hàng hóa' : 'Thêm hàng hóa mới'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã hàng hóa {!editingProduct && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="maSanPham"
                    value={formData.maSanPham}
                    onChange={handleInputChange}
                    onBlur={(e) => !editingProduct && checkProductCodeExists(e.target.value)}
                    disabled={!!editingProduct}
                    placeholder={!editingProduct ? "Nhập mã hàng hóa" : ""}
                    className={`w-full px-3 py-2 border rounded-lg ${
                      editingProduct
                        ? 'border-gray-300 bg-gray-100'
                        : maSanPhamError
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                  {maSanPhamError && !editingProduct && (
                    <p className="mt-1 text-sm text-red-600">{maSanPhamError}</p>
                  )}
                  {checkingCode && (
                    <p className="mt-1 text-sm text-gray-500">Đang kiểm tra mã hàng hóa...</p>
                  )}
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

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={editingProduct ? handleUpdate : handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingProduct ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Chi tiết hàng hóa</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

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

                <div className="grid grid-cols-2 gap-4">
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
            </div>
          </div>
        </div>
      )}

      {/* Category Settings Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Cài đặt loại hàng hóa</h2>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setNewCategoryName(''); }} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Add new category */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nhập tên loại hàng hóa mới..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => {
                    const name = newCategoryName.trim();
                    if (!name) return;
                    if (categories.includes(name)) {
                      alert('Loại hàng hóa này đã tồn tại!');
                      return;
                    }
                    setCategories(prev => [...prev, name].sort());
                    setNewCategoryName('');
                  }}
                  disabled={!newCategoryName.trim()}
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
        </div>
      )}
    </div>
  );
};

export default InternationalProductManagement;

