import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import FileUpload from './FileUpload';
import acceptanceHandoverService, { CreateAcceptanceHandoverRequest } from '../services/acceptanceHandoverService';
import { useAuth } from '../contexts/AuthContext';

interface RepairRequest {
  id: number;
  maYeuCau: string;
  tenHeThong: string;
  tinhTrangThietBi: string;
  noiDungLoi: string;
}

interface AcceptanceHandoverFormProps {
  repairRequest: RepairRequest;
  onClose: () => void;
  onSuccess: () => void;
}

const AcceptanceHandoverForm = ({ repairRequest, onClose, onSuccess }: AcceptanceHandoverFormProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState<CreateAcceptanceHandoverRequest>({
    repairRequestId: repairRequest.id,
    maYeuCauSuaChua: repairRequest.maYeuCau,
    tenHeThongThietBi: repairRequest.tenHeThong,
    tinhTrangTruocSuaChua: repairRequest.tinhTrangThietBi || repairRequest.noiDungLoi,
    tinhTrangSauSuaChua: '',
    nguoiBanGiao: user?.fullName || user?.username || '',
    nguoiNhan: '',
    ghiChu: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tinhTrangSauSuaChua.trim()) {
      setError('Vui lòng nhập tình trạng sau khi sửa chữa');
      return;
    }
    
    if (!formData.nguoiBanGiao.trim()) {
      setError('Vui lòng nhập người bàn giao');
      return;
    }
    
    if (!formData.nguoiNhan.trim()) {
      setError('Vui lòng nhập người nhận');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await acceptanceHandoverService.createAcceptanceHandover(formData, selectedFile || undefined);

      // Call onSuccess and wait a bit before closing to ensure parent component updates
      onSuccess();

      // Close form after a short delay to allow parent to refresh
      setTimeout(() => {
        onClose();
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo nghiệm thu bàn giao');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Nghiệm thu bàn giao</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mã yêu cầu sửa chữa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã yêu cầu sửa chữa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.maYeuCauSuaChua}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            {/* Tên hệ thống/thiết bị */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên hệ thống/thiết bị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.tenHeThongThietBi}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            {/* Người bàn giao */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Người bàn giao <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nguoiBanGiao"
                value={formData.nguoiBanGiao}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                placeholder="Tự động lấy từ người đăng nhập"
              />
            </div>

            {/* Người nhận */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Người nhận <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nguoiNhan"
                value={formData.nguoiNhan}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập tên người nhận"
                required
              />
            </div>

            {/* Tình trạng trước khi sửa chữa */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tình trạng trước khi sửa chữa <span className="text-red-500">*</span>
              </label>
              <textarea
                name="tinhTrangTruocSuaChua"
                value={formData.tinhTrangTruocSuaChua}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mô tả tình trạng trước khi sửa chữa"
                required
              />
            </div>

            {/* Tình trạng sau khi sửa chữa */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tình trạng sau khi sửa chữa <span className="text-red-500">*</span>
              </label>
              <textarea
                name="tinhTrangSauSuaChua"
                value={formData.tinhTrangSauSuaChua}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mô tả tình trạng sau khi sửa chữa"
                required
              />
            </div>

            {/* Ghi chú */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ghi chú
              </label>
              <textarea
                name="ghiChu"
                value={formData.ghiChu}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập ghi chú (nếu có)"
              />
            </div>

            {/* File đính kèm */}
            <div className="md:col-span-2">
              <FileUpload
                label="File đính kèm"
                files={selectedFile ? [selectedFile] : []}
                onChange={(files) => setSelectedFile(files[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                helpText="PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP, RAR (Tối đa 100MB)"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : 'Tạo nghiệm thu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AcceptanceHandoverForm;

