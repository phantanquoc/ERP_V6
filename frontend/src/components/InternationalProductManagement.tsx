import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, X } from 'lucide-react';
import internationalProductService, { InternationalProduct } from '../services/internationalProductService';

const InternationalProductManagement: React.FC = () => {
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
  }, [currentPage, searchTerm]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await internationalProductService.getAllProducts(
        currentPage,
        itemsPerPage,
        searchTerm || undefined
      );
      setProducts(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Lỗi khi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // Validate maSanPham is not empty
    if (!formData.maSanPham.trim()) {
      setMaSanPhamError('Vui lòng nhập mã sản phẩm');
      return;
    }

    // Check if there's an existing error
    if (maSanPhamError) {
      return;
    }

    try {
      await internationalProductService.createProduct(formData);
      alert('Tạo sản phẩm thành công!');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error creating product:', error);
      const errorMessage = error.response?.data?.message || 'Lỗi khi tạo sản phẩm';
      if (errorMessage.toLowerCase().includes('already exists') || errorMessage.toLowerCase().includes('đã tồn tại')) {
        setMaSanPhamError('Mã sản phẩm đã tồn tại. Vui lòng nhập mã khác');
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
      alert('Cập nhật sản phẩm thành công!');
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error updating product:', error);
      alert(error.response?.data?.message || 'Lỗi khi cập nhật sản phẩm');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;

    try {
      await internationalProductService.deleteProduct(id);
      alert('Xóa sản phẩm thành công!');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);

      // Extract error message from different possible locations
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Lỗi khi xóa sản phẩm';

      // Show detailed error message
      alert(`❌ Không thể xóa sản phẩm!\n\n${errorMessage}`);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        setMaSanPhamError('Mã sản phẩm đã tồn tại. Vui lòng nhập mã khác');
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
              placeholder="Tìm kiếm theo mã, tên sản phẩm..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm sản phẩm
          </button>
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                Mã sản phẩm
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                Tên sản phẩm
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">
                Loại sản phẩm
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
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Trang {currentPage} / {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã sản phẩm {!editingProduct && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    name="maSanPham"
                    value={formData.maSanPham}
                    onChange={handleInputChange}
                    onBlur={(e) => !editingProduct && checkProductCodeExists(e.target.value)}
                    disabled={!!editingProduct}
                    placeholder={!editingProduct ? "Nhập mã sản phẩm" : ""}
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
                    <p className="mt-1 text-sm text-gray-500">Đang kiểm tra mã sản phẩm...</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên sản phẩm <span className="text-red-500">*</span>
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
                    Loại sản phẩm
                  </label>
                  <select
                    name="loaiSanPham"
                    value={formData.loaiSanPham}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn loại sản phẩm --</option>
                    <option value="Nguyên liệu tươi">Nguyên liệu tươi</option>
                    <option value="Nguyên liệu đông">Nguyên liệu đông</option>
                    <option value="Phụ liệu">Phụ liệu</option>
                    <option value="Sản phẩm khô">Sản phẩm khô</option>
                    <option value="Sản phẩm đông">Sản phẩm đông</option>
                    <option value="Hệ thống">Hệ thống</option>
                    <option value="Thiết bị">Thiết bị</option>
                    <option value="Vật tư">Vật tư</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mô tả sản phẩm
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
                <h2 className="text-xl font-bold">Chi tiết sản phẩm</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Mã sản phẩm</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.maSanPham}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Tên sản phẩm</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.tenSanPham}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Loại sản phẩm</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedProduct.loaiSanPham || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Mô tả sản phẩm</label>
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
    </div>
  );
};

export default InternationalProductManagement;

