import React from 'react';
import { X } from 'lucide-react';
import Modal from '../Modal';

export interface ProductFormData {
  maSanPham: string;
  tenSanPham: string;
  moTaSanPham: string;
  loaiSanPham: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: ProductFormData;
  categories: string[];
  generatingCode: boolean;
  onClose: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: () => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen, isEditing, formData, categories, generatingCode, onClose, onChange, onSubmit,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
    <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] sm:max-w-2xl sm:w-full flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-start sm:items-center gap-3 border-b px-4 sm:px-6 py-4 shrink-0">
        <h2 className="text-lg sm:text-xl font-bold">{isEditing ? 'Chỉnh sửa hàng hóa' : 'Thêm hàng hóa mới'}</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-4 sm:p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã hàng hóa
              {!isEditing && <span className="ml-2 text-xs text-gray-400 font-normal">(tự động sinh)</span>}
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
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại hàng hóa</label>
            <select
              name="loaiSanPham"
              value={formData.loaiSanPham}
              onChange={onChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Chọn loại hàng hóa --</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả hàng hóa</label>
            <textarea
              name="moTaSanPham"
              value={formData.moTaSanPham}
              onChange={onChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Hủy
            </button>
            <button type="button" onClick={onSubmit} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {isEditing ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Modal>
);

export default ProductFormModal;
