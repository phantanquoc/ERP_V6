import React from 'react';
import { X } from 'lucide-react';
import { FinishedProduct } from '../services/finishedProductService';

interface FinishedProductModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: any;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (field: string, value: any) => void;
}

const FinishedProductModal: React.FC<FinishedProductModalProps> = ({
  isOpen,
  isEditing,
  formData,
  onClose,
  onSubmit,
  onChange,
}) => {
  if (!isOpen) return null;

  const handleInputChange = (field: string, value: any) => {
    onChange(field, value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Sửa thành phẩm' : 'Thêm thành phẩm mới'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Thông tin cơ bản */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã chiên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.maChien}
                onChange={(e) => handleInputChange('maChien', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian chiên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.thoiGianChien}
                onChange={(e) => handleInputChange('thoiGianChien', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên hàng hóa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.tenHangHoa}
                onChange={(e) => handleInputChange('tenHangHoa', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khối lượng (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.khoiLuong}
                onChange={(e) => handleInputChange('khoiLuong', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Người thực hiện
              </label>
              <input
                type="text"
                value={formData.nguoiThucHien || '(Tự động điền từ tài khoản đăng nhập)'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Tự động điền từ tài khoản đăng nhập"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File đính kèm
              </label>
              <input
                type="text"
                value={formData.fileDinhKem}
                onChange={(e) => handleInputChange('fileDinhKem', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="URL file đính kèm"
              />
            </div>
          </div>

          {/* Thành phẩm A */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Thành phẩm A</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.aKhoiLuong}
                  onChange={(e) => handleInputChange('aKhoiLuong', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.aTiLe}
                  onChange={(e) => handleInputChange('aTiLe', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Thành phẩm B */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Thành phẩm B</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bKhoiLuong}
                  onChange={(e) => handleInputChange('bKhoiLuong', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bTiLe}
                  onChange={(e) => handleInputChange('bTiLe', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Thành phẩm B Dầu */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Thành phẩm B Dầu</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bDauKhoiLuong}
                  onChange={(e) => handleInputChange('bDauKhoiLuong', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.bDauTiLe}
                  onChange={(e) => handleInputChange('bDauTiLe', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Thành phẩm C */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Thành phẩm C</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cKhoiLuong}
                  onChange={(e) => handleInputChange('cKhoiLuong', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cTiLe}
                  onChange={(e) => handleInputChange('cTiLe', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Vụn lớn */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Vụn lớn</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.vunLonKhoiLuong}
                  onChange={(e) => handleInputChange('vunLonKhoiLuong', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.vunLonTiLe}
                  onChange={(e) => handleInputChange('vunLonTiLe', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Vụn nhỏ */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Vụn nhỏ</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.vunNhoKhoiLuong}
                  onChange={(e) => handleInputChange('vunNhoKhoiLuong', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.vunNhoTiLe}
                  onChange={(e) => handleInputChange('vunNhoTiLe', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Phế phẩm */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Phế phẩm</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.phePhamKhoiLuong}
                  onChange={(e) => handleInputChange('phePhamKhoiLuong', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.phePhamTiLe}
                  onChange={(e) => handleInputChange('phePhamTiLe', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Ướt */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Ướt</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Khối lượng (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.uotKhoiLuong}
                  onChange={(e) => handleInputChange('uotKhoiLuong', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tỉ lệ (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.uotTiLe}
                  onChange={(e) => handleInputChange('uotTiLe', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinishedProductModal;

