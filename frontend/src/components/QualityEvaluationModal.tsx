import React from 'react';
import { X } from 'lucide-react';

interface QualityEvaluationModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: any;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (field: string, value: any) => void;
}

const QualityEvaluationModal: React.FC<QualityEvaluationModalProps> = ({
  isOpen,
  isEditing,
  formData,
  onClose,
  onSubmit,
  onChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Chỉnh sửa Đánh giá Chất lượng' : 'Tạo Đánh giá Chất lượng mới'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6">
          {/* Basic Info */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã chiên</label>
                <input
                  type="text"
                  value={formData.maChien || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian chiên</label>
                <input
                  type="datetime-local"
                  value={formData.thoiGianChien || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên hàng hóa</label>
                <input
                  type="text"
                  value={formData.tenHangHoa || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Màu sắc</label>
                <select
                  value={formData.mauSac || ''}
                  onChange={(e) => onChange('mauSac', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn màu sắc --</option>
                  <option value="Vàng đậm">Vàng đậm</option>
                  <option value="Vàng nhạt">Vàng nhạt</option>
                  <option value="Nâu đậm">Nâu đậm</option>
                  <option value="Nâu nhạt">Nâu nhạt</option>
                  <option value="Trắng">Trắng</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tỉ lệ thành phẩm đầu ra */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Tỉ lệ thành phẩm đầu ra (%)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">A (%)</label>
                <input type="number" value={Number(formData.aTiLe) || 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">B (%)</label>
                <input type="number" value={Number(formData.bTiLe) || 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">B Dầu (%)</label>
                <input type="number" value={Number(formData.bDauTiLe) || 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">C (%)</label>
                <input type="number" value={Number(formData.cTiLe) || 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vụn lớn (%)</label>
                <input type="number" value={Number(formData.vunLonTiLe) || 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vụn nhỏ (%)</label>
                <input type="number" value={Number(formData.vunNhoTiLe) || 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phế phẩm (%)</label>
                <input type="number" value={Number(formData.phePhamTiLe) || 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ướt (%)</label>
                <input type="number" value={Number(formData.uotTiLe) || 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readOnly />
              </div>
            </div>
          </div>

          {/* Đánh giá chất lượng */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Đánh giá chất lượng thành phẩm đầu ra</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mùi hương</label>
                <select
                  value={formData.muiHuong || ''}
                  onChange={(e) => onChange('muiHuong', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn đánh giá --</option>
                  <option value="Rất tốt">Rất tốt</option>
                  <option value="Tốt">Tốt</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Kém">Kém</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hương vị</label>
                <select
                  value={formData.huongVi || ''}
                  onChange={(e) => onChange('huongVi', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn đánh giá --</option>
                  <option value="Rất tốt">Rất tốt</option>
                  <option value="Tốt">Tốt</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Kém">Kém</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Độ ngọt</label>
                <select
                  value={formData.doNgot || ''}
                  onChange={(e) => onChange('doNgot', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn đánh giá --</option>
                  <option value="Rất ngọt">Rất ngọt</option>
                  <option value="Vừa phải">Vừa phải</option>
                  <option value="Ít ngọt">Ít ngọt</option>
                  <option value="Không ngọt">Không ngọt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Độ giòn</label>
                <select
                  value={formData.doGion || ''}
                  onChange={(e) => onChange('doGion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn đánh giá --</option>
                  <option value="Rất giòn">Rất giòn</option>
                  <option value="Giòn">Giòn</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Mềm">Mềm</option>
                </select>
              </div>
            </div>
          </div>

          {/* Đề xuất điều chỉnh cải tiến */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Đề xuất điều chỉnh cải tiến</h4>
            <textarea
              value={formData.deXuatDieuChinh || ''}
              onChange={(e) => onChange('deXuatDieuChinh', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập đề xuất điều chỉnh cải tiến..."
            />
          </div>

          {/* File đính kèm */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
            <input
              type="text"
              value={formData.fileDinhKem || ''}
              onChange={(e) => onChange('fileDinhKem', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="URL file đính kèm"
            />
          </div>

          {/* Người thực hiện */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Người thực hiện</label>
            <input
              type="text"
              value={formData.nguoiThucHien || '(Tự động điền từ tài khoản đăng nhập)'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              placeholder="Tự động điền từ tài khoản đăng nhập"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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
              {isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QualityEvaluationModal;
