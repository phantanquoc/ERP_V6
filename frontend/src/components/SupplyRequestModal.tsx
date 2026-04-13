import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import supplyRequestService from '../services/supplyRequestService';
import { useAuth } from '../contexts/AuthContext';
import { parseNumberInput } from '../utils/numberInput';
import { internationalProductService, InternationalProduct } from '../services/internationalProductService';

interface SupplyRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ItemRow {
  phanLoai: string;
  tenGoi: string;
  soLuong: number;
  donViTinh: string;
  customCategory: boolean;
  customProduct: boolean;
}

const emptyRow = (): ItemRow => ({
  phanLoai: '',
  tenGoi: '',
  soLuong: 0,
  donViTinh: 'Kg',
  customCategory: false,
  customProduct: false,
});

const SupplyRequestModal: React.FC<SupplyRequestModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [mucDichYeuCau, setMucDichYeuCau] = useState('');
  const [mucDoUuTien, setMucDoUuTien] = useState('Trung bình');
  const [ghiChu, setGhiChu] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 10000);
      const allProducts = response.data || [];
      setProducts(allProducts);

      const uniqueCategories = [...new Set(
        allProducts.map((p: InternationalProduct) => p.loaiSanPham).filter((c): c is string => !!c)
      )].sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const getFilteredProducts = (phanLoai: string): InternationalProduct[] => {
    if (!phanLoai) return [];
    return products.filter(p => p.loaiSanPham === phanLoai);
  };

  const updateItem = (index: number, updates: Partial<ItemRow>) => {
    setItems(prev => prev.map((row, i) => i === index ? { ...row, ...updates } : row));
  };

  const handleCategoryChange = (index: number, phanLoai: string) => {
    updateItem(index, { phanLoai, tenGoi: '', donViTinh: 'Kg', customProduct: false });
  };

  const handleProductChange = (index: number, tenSanPham: string) => {
    const selectedProduct = products.find(p => p.tenSanPham === tenSanPham);
    updateItem(index, {
      tenGoi: tenSanPham,
      donViTinh: selectedProduct?.donViTinh || items[index].donViTinh,
    });
  };

  const addRow = () => {
    setItems(prev => [...prev, emptyRow()]);
  };

  const removeRow = (index: number) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setItems([emptyRow()]);
    setMucDichYeuCau('');
    setMucDoUuTien('Trung bình');
    setGhiChu('');
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.employeeId) {
      alert('Không tìm thấy thông tin nhân viên');
      return;
    }

    // Validate all rows
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.tenGoi || !row.tenGoi.trim()) {
        alert(`Dòng ${i + 1}: Vui lòng nhập tên gọi sản phẩm`);
        return;
      }
      if (!row.soLuong || row.soLuong <= 0) {
        alert(`Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return;
      }
    }

    setLoading(true);
    try {
      await supplyRequestService.createSupplyRequest({
        employeeId: user.employeeId,
        maNhanVien: user.employeeCode || '',
        tenNhanVien: `${user.firstName} ${user.lastName}`,
        boPhan: user.department || '',
        items: items.map(row => ({
          phanLoai: row.phanLoai,
          tenGoi: row.tenGoi,
          soLuong: row.soLuong,
          donViTinh: row.donViTinh,
        })),
        mucDichYeuCau,
        mucDoUuTien,
        ghiChu,
      });
      alert('Tạo yêu cầu cung cấp thành công!');
      resetForm();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Tạo yêu cầu bổ sung/cung cấp
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tên nhân viên */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên</label>
                <input type="text" value={`${user?.firstName || ''} ${user?.lastName || ''}`} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận</label>
                <input type="text" value={user?.department || 'Chưa xác định'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" readOnly />
              </div>
            </div>

            {/* Items table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Danh sách sản phẩm <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Thêm sản phẩm
                </button>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Phân loại</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên gọi</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Số lượng</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Đơn vị</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((row, index) => (
                      <tr key={index} className="align-top">
                        <td className="px-3 py-2 text-gray-500 text-center">{index + 1}</td>

                        {/* Phân loại */}
                        <td className="px-3 py-2">
                          {row.customCategory ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={row.phanLoai}
                                onChange={(e) => updateItem(index, { phanLoai: e.target.value, tenGoi: '', donViTinh: 'Kg', customProduct: true })}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                                placeholder="Nhập phân loại"
                              />
                              <button type="button" onClick={() => updateItem(index, { customCategory: false, customProduct: false, phanLoai: '', tenGoi: '' })} className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap">DS</button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <select
                                value={row.phanLoai}
                                onChange={(e) => handleCategoryChange(index, e.target.value)}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                              >
                                <option value="">-- Chọn --</option>
                                {categories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <button type="button" onClick={() => updateItem(index, { customCategory: true, customProduct: true, phanLoai: '', tenGoi: '' })} className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 whitespace-nowrap">Tay</button>
                            </div>
                          )}
                        </td>

                        {/* Tên gọi */}
                        <td className="px-3 py-2">
                          {row.customProduct || row.customCategory ? (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={row.tenGoi}
                                onChange={(e) => updateItem(index, { tenGoi: e.target.value })}
                                required
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                                placeholder="Nhập tên hàng hóa"
                              />
                              {!row.customCategory && (
                                <button type="button" onClick={() => updateItem(index, { customProduct: false, tenGoi: '' })} className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 whitespace-nowrap">DS</button>
                              )}
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <select
                                value={row.tenGoi}
                                onChange={(e) => handleProductChange(index, e.target.value)}
                                required
                                disabled={!row.phanLoai}
                                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0 disabled:bg-gray-100"
                              >
                                <option value="">-- Chọn --</option>
                                {getFilteredProducts(row.phanLoai).map(p => (
                                  <option key={p.id} value={p.tenSanPham}>{p.tenSanPham}</option>
                                ))}
                              </select>
                              <button type="button" onClick={() => updateItem(index, { customProduct: true, tenGoi: '' })} className="px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded hover:bg-blue-50 whitespace-nowrap">Tay</button>
                            </div>
                          )}
                        </td>

                        {/* Số lượng */}
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={row.soLuong}
                            onChange={(e) => updateItem(index, { soLuong: parseNumberInput(e.target.value) })}
                            required
                            min="0.01"
                            step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>

                        {/* Đơn vị */}
                        <td className="px-3 py-2">
                          <select
                            value={row.donViTinh}
                            onChange={(e) => updateItem(index, { donViTinh: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="Kg">Kg</option>
                            <option value="Cái">Cái</option>
                            <option value="Hệ">Hệ</option>
                            <option value="Lít">Lít</option>
                            <option value="Thùng">Thùng</option>
                            <option value="Bộ">Bộ</option>
                          </select>
                        </td>

                        {/* Remove */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            disabled={items.length === 1}
                            className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                            title="Xóa dòng"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mục đích yêu cầu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích yêu cầu <span className="text-red-500">*</span></label>
              <textarea
                value={mucDichYeuCau}
                onChange={(e) => setMucDichYeuCau(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Mô tả mục đích yêu cầu"
              />
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên <span className="text-red-500">*</span></label>
              <select
                value={mucDoUuTien}
                onChange={(e) => setMucDoUuTien(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Cao">Cao</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Thấp">Thấp</option>
              </select>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Ghi chú thêm (nếu có)"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors mr-3">Hủy</button>
              <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50">
                {loading ? 'Đang xử lý...' : 'Tạo yêu cầu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupplyRequestModal;
