import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import supplyRequestService from '../services/supplyRequestService';
import { useAuth } from '../contexts/AuthContext';
import { parseNumberInput } from '../utils/numberInput';
import { internationalProductService, InternationalProduct } from '../services/internationalProductService';

interface SupplyRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupplyRequestModal: React.FC<SupplyRequestModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<InternationalProduct[]>([]);
  const [formData, setFormData] = useState({
    phanLoai: '',
    tenGoi: '',
    soLuong: 0,
    donViTinh: 'Kg',
    mucDichYeuCau: '',
    mucDoUuTien: 'Trung bình',
    ghiChu: '',
  });

  // Fetch products on mount
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  // Filter products when category changes
  useEffect(() => {
    if (formData.phanLoai) {
      const filtered = products.filter(p => p.loaiSanPham === formData.phanLoai);
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [formData.phanLoai, products]);

  const handleCategoryChange = (phanLoai: string) => {
    setFormData(prev => ({ ...prev, phanLoai, tenGoi: '', donViTinh: 'Kg' }));
  };

  const fetchProducts = async () => {
    try {
      const response = await internationalProductService.getAllProducts(1, 10000);
      const allProducts = response.data || [];
      setProducts(allProducts);

      // Extract unique categories
      const uniqueCategories = [...new Set(
        allProducts.map(p => p.loaiSanPham).filter((c): c is string => !!c)
      )].sort();
      setCategories(uniqueCategories);

      // Set default category if available
      if (uniqueCategories.length > 0 && !formData.phanLoai) {
        setFormData(prev => ({ ...prev, phanLoai: uniqueCategories[0] }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleProductChange = (tenSanPham: string) => {
    const selectedProduct = products.find(p => p.tenSanPham === tenSanPham);
    setFormData(prev => ({
      ...prev,
      tenGoi: tenSanPham,
      donViTinh: selectedProduct?.donViTinh || prev.donViTinh,
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !user.employeeId) {
      alert('Không tìm thấy thông tin nhân viên');
      return;
    }

    setLoading(true);
    try {
      await supplyRequestService.createSupplyRequest({
        employeeId: user.employeeId,
        maNhanVien: user.employeeCode || '',
        tenNhanVien: `${user.firstName} ${user.lastName}`,
        boPhan: user.department || '',
        ...formData,
        trangThai: 'Chưa cung cấp',
      });
      alert('Tạo yêu cầu cung cấp thành công!');
      
      // Reset form
      setFormData({
        phanLoai: categories.length > 0 ? categories[0] : '',
        tenGoi: '',
        soLuong: 0,
        donViTinh: 'Kg',
        mucDichYeuCau: '',
        mucDoUuTien: 'Trung bình',
        ghiChu: '',
      });
      
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo yêu cầu cung cấp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên</label>
              <input type="text" value={`${user?.firstName || ''} ${user?.lastName || ''}`} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" readOnly />
            </div>

            {/* Bộ phận */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận</label>
              <input type="text" value={user?.department || 'Chưa xác định'} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50" readOnly />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phân loại */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phân loại <span className="text-red-500">*</span></label>
                <select value={formData.phanLoai} onChange={(e) => handleCategoryChange(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Chọn phân loại --</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Tên gọi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên gọi <span className="text-red-500">*</span></label>
                <select value={formData.tenGoi} onChange={(e) => handleProductChange(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={!formData.phanLoai}>
                  <option value="">-- Chọn hàng hóa --</option>
                  {filteredProducts.map(p => (
                    <option key={p.id} value={p.tenSanPham}>{p.tenSanPham}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Số lượng */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng <span className="text-red-500">*</span></label>
                <input type="number" value={formData.soLuong} onChange={(e) => setFormData({ ...formData, soLuong: parseNumberInput(e.target.value) })} required min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nhập số lượng" />
              </div>

              {/* Đơn vị */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị <span className="text-red-500">*</span></label>
                <select value={formData.donViTinh} onChange={(e) => setFormData({ ...formData, donViTinh: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Kg">Kg</option>
                  <option value="Cái">Cái</option>
                  <option value="Hệ">Hệ</option>
                </select>
              </div>
            </div>

            {/* Mục đích yêu cầu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích yêu cầu <span className="text-red-500">*</span></label>
              <textarea value={formData.mucDichYeuCau} onChange={(e) => setFormData({ ...formData, mucDichYeuCau: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} placeholder="Mô tả mục đích yêu cầu" />
            </div>

            {/* Mức độ ưu tiên */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên <span className="text-red-500">*</span></label>
              <select value={formData.mucDoUuTien} onChange={(e) => setFormData({ ...formData, mucDoUuTien: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Cao">Cao</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Thấp">Thấp</option>
              </select>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea value={formData.ghiChu} onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} placeholder="Ghi chú thêm (nếu có)" />
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
