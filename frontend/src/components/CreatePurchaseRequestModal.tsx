import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import purchaseRequestService from '../services/purchaseRequestService';
import { useAuth } from '../contexts/AuthContext';
import { SupplyRequest } from '../services/supplyRequestService';

interface CreatePurchaseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplyRequest?: SupplyRequest | null;
  onSuccess?: () => void;
}

const CreatePurchaseRequestModal: React.FC<CreatePurchaseRequestModalProps> = ({
  isOpen,
  onClose,
  supplyRequest,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    maYeuCau: '',
    ngayYeuCau: new Date().toISOString().split('T')[0],
    phanLoai: '',
    tenHangHoa: '',
    soLuong: 0,
    donViTinh: '',
    mucDichYeuCau: '',
    mucDoUuTien: 'Trung bình',
    ghiChu: '',
    fileKemTheo: '',
  });

  useEffect(() => {
    if (isOpen) {
      generateCode();
      
      // Pre-fill data from supply request if available
      if (supplyRequest) {
        setFormData(prev => ({
          ...prev,
          phanLoai: supplyRequest.phanLoai,
          tenHangHoa: supplyRequest.tenGoi,
          soLuong: supplyRequest.soLuong,
          donViTinh: supplyRequest.donViTinh,
          mucDichYeuCau: supplyRequest.mucDichYeuCau,
          mucDoUuTien: supplyRequest.mucDoUuTien,
          ghiChu: `Yêu cầu mua hàng từ yêu cầu cung cấp ${supplyRequest.maYeuCau}`,
        }));
      }
    }
  }, [isOpen, supplyRequest]);

  const generateCode = async () => {
    try {
      const response = await purchaseRequestService.generateCode();
      setFormData(prev => ({ ...prev, maYeuCau: response.data.code }));
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tenHangHoa || !formData.soLuong) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (!user?.employeeId) {
      alert('Không tìm thấy thông tin nhân viên. Vui lòng đăng nhập lại.');
      return;
    }

    setLoading(true);
    try {
      await purchaseRequestService.createPurchaseRequest({
        employeeId: user.employeeId,
        maNhanVien: user.employeeCode || '',
        tenNhanVien: `${user.firstName} ${user.lastName}`,
        phanLoai: formData.phanLoai,
        tenHangHoa: formData.tenHangHoa,
        soLuong: formData.soLuong,
        donViTinh: formData.donViTinh,
        mucDichYeuCau: formData.mucDichYeuCau,
        mucDoUuTien: formData.mucDoUuTien,
        ghiChu: formData.ghiChu,
        fileKemTheo: formData.fileKemTheo,
        supplyRequestId: supplyRequest?.id,
      });

      alert('Tạo yêu cầu mua hàng thành công!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi tạo yêu cầu mua hàng');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[700px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Tạo yêu cầu mua hàng</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Ngày yêu cầu & Mã yêu cầu */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày yêu cầu</label>
              <input type="date" value={formData.ngayYeuCau} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã yêu cầu</label>
              <input type="text" value={formData.maYeuCau} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
          </div>

          {/* Row 2: Tên nhân viên & Phân loại */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên yêu cầu</label>
              <input type="text" value={`${user?.firstName} ${user?.lastName}`} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phân loại</label>
              <input type="text" value={formData.phanLoai} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
          </div>

          {/* Row 3: Tên hàng hoá */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng hoá</label>
            <input type="text" value={formData.tenHangHoa} disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
          </div>

          {/* Row 4: Số lượng & Đơn vị tính */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
              <input type="number" value={formData.soLuong} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
              <input type="text" value={formData.donViTinh} disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
            </div>
          </div>

          {/* Row 5: Mục đích yêu cầu */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mục đích yêu cầu</label>
            <input type="text" value={formData.mucDichYeuCau} disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
          </div>

          {/* Row 6: Mức độ ưu tiên */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ ưu tiên</label>
            <input type="text" value={formData.mucDoUuTien} disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100" />
          </div>

          {/* Row 7: Ghi chú */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea
              value={formData.ghiChu}
              onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập ghi chú (nếu có)"
            />
          </div>

          {/* Row 8: File đính kèm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.fileKemTheo}
                onChange={(e) => setFormData({ ...formData, fileKemTheo: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Đường dẫn file hoặc URL"
              />
              <button type="button" className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Upload className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Đang xử lý...' : 'Tạo yêu cầu mua hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePurchaseRequestModal;

