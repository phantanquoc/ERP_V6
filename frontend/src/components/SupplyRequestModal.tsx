import React, { useState } from 'react';
import { X } from 'lucide-react';
import supplyRequestService from '../services/supplyRequestService';
import { useAuth } from '../contexts/AuthContext';

interface SupplyRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SupplyRequestModal: React.FC<SupplyRequestModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phanLoai: 'Nguyên liệu',
    tenGoi: '',
    soLuong: 0,
    donViTinh: 'Kg',
    mucDichYeuCau: '',
    mucDoUuTien: 'Trung bình',
    ghiChu: '',
  });

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
        phanLoai: 'Nguyên liệu',
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
          {/* Header with company logo */}
          <div className="flex items-center justify-center mb-6 p-4 border-2 border-gray-300 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src="/logo.png" alt="Company Logo" className="w-16 h-16 object-contain" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 border-2 border-gray-400 px-6 py-2">
                  TẠO YÊU CẦU BỔ SUNG/CUNG
                </h2>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-0">
            {/* Tên nhân viên */}
            <div className="grid grid-cols-3 border border-gray-300">
              <div className="bg-gray-100 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Tên nhân viên:</label>
              </div>
              <div className="col-span-2 p-3">
                <span>{user?.firstName} {user?.lastName}</span>
              </div>
            </div>

            {/* Bộ phận */}
            <div className="grid grid-cols-3 border border-gray-300 border-t-0">
              <div className="bg-blue-100 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Bộ phận:</label>
              </div>
              <div className="col-span-2 p-3 bg-blue-50">
                <span>{user?.department || 'Chưa xác định'}</span>
              </div>
            </div>

            {/* Phân loại */}
            <div className="grid grid-cols-3 border border-gray-300 border-t-0">
              <div className="bg-yellow-100 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Phân loại:</label>
              </div>
              <div className="col-span-2 p-3 bg-yellow-50">
                <select
                  value={formData.phanLoai}
                  onChange={(e) => setFormData({ ...formData, phanLoai: e.target.value })}
                  required
                  className="w-full border-none outline-none bg-transparent"
                >
                  <option value="Nguyên liệu">Nguyên liệu</option>
                  <option value="Phụ liệu">Phụ liệu</option>
                  <option value="Hệ thống">Hệ thống</option>
                  <option value="Thiết bị">Thiết bị</option>
                  <option value="Vật tư">Vật tư</option>
                </select>
              </div>
            </div>

            {/* Tên gọi */}
            <div className="grid grid-cols-3 border border-gray-300 border-t-0">
              <div className="bg-yellow-100 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Tên gọi:</label>
              </div>
              <div className="col-span-2 p-3 bg-yellow-50">
                <input
                  type="text"
                  value={formData.tenGoi}
                  onChange={(e) => setFormData({ ...formData, tenGoi: e.target.value })}
                  required
                  className="w-full border-none outline-none bg-transparent"
                  placeholder="Nhập tên gọi"
                />
              </div>
            </div>

            {/* Số lượng */}
            <div className="grid grid-cols-3 border border-gray-300 border-t-0">
              <div className="bg-gray-200 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Số lượng:</label>
              </div>
              <div className="col-span-2 p-3 bg-gray-100">
                <input
                  type="number"
                  value={formData.soLuong}
                  onChange={(e) => setFormData({ ...formData, soLuong: parseFloat(e.target.value) })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full border-none outline-none bg-transparent"
                  placeholder="Nhập số lượng"
                />
              </div>
            </div>

            {/* Đơn vị */}
            <div className="grid grid-cols-3 border border-gray-300 border-t-0">
              <div className="bg-gray-200 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Đơn vị:</label>
              </div>
              <div className="col-span-2 p-3 bg-gray-100">
                <select
                  value={formData.donViTinh}
                  onChange={(e) => setFormData({ ...formData, donViTinh: e.target.value })}
                  required
                  className="w-full border-none outline-none bg-transparent"
                >
                  <option value="Kg">Kg</option>
                  <option value="Cái">Cái</option>
                  <option value="Hệ">Hệ</option>
                </select>
              </div>
            </div>

            {/* Mục đích yêu cầu */}
            <div className="grid grid-cols-3 border border-gray-300 border-t-0">
              <div className="bg-gray-200 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Mục đích yêu cầu:</label>
              </div>
              <div className="col-span-2 p-3 bg-gray-100">
                <textarea
                  value={formData.mucDichYeuCau}
                  onChange={(e) => setFormData({ ...formData, mucDichYeuCau: e.target.value })}
                  required
                  className="w-full border-none outline-none bg-transparent resize-none"
                  rows={2}
                  placeholder="Mô tả mục đích yêu cầu"
                />
              </div>
            </div>

            {/* Mức độ ưu tiên */}
            <div className="grid grid-cols-3 border border-gray-300 border-t-0">
              <div className="bg-gray-200 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Mức độ ưu tiên:</label>
              </div>
              <div className="col-span-2 p-3 bg-gray-100">
                <select
                  value={formData.mucDoUuTien}
                  onChange={(e) => setFormData({ ...formData, mucDoUuTien: e.target.value })}
                  required
                  className="w-full border-none outline-none bg-transparent"
                >
                  <option value="Cao">Cao</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Thấp">Thấp</option>
                </select>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="grid grid-cols-3 border border-gray-300 border-t-0">
              <div className="bg-gray-200 p-3 border-r border-gray-300">
                <label className="text-sm font-medium text-gray-700">Ghi chú:</label>
              </div>
              <div className="col-span-2 p-3 bg-gray-100">
                <textarea
                  value={formData.ghiChu}
                  onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
                  className="w-full border-none outline-none bg-transparent resize-none"
                  rows={3}
                  placeholder="Ghi chú thêm (nếu có)"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center mt-6">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors font-medium disabled:opacity-50"
              >
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
