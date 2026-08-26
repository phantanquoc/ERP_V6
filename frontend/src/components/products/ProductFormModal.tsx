import React from 'react';
import { X, RefreshCw } from 'lucide-react';
import Modal from '../Modal';
import { useLookups } from '../../hooks/useLookups';
import { LOOKUP_GROUPS } from '../../types/lookup';

export interface ProductFormData {
  maSanPham: string;
  tenSanPham: string;
  moTaSanPham: string;
  loaiSanPham: string;
  donViTinh: string;
  giaThanh: string;
}

/**
 * Unit suggestions, sourced from the shared lookup API — change: shared-lookup-table.
 *
 * This replaced a hardcoded 10-value array that diverged from `constants/units.ts`
 * (13 values). The two lists disagreeing is what broke unit auto-fill in the warehouse
 * forms; both now converge on the same API-managed list.
 *
 * Kept as a datalist rather than a closed <select>: the field is deliberately free text
 * so a brand-new unit does not require an admin round-trip before a product can be saved.
 * A separate component so the parent can stay a pure presentational arrow function.
 */
const UnitSuggestions: React.FC = () => {
  const { data: units } = useLookups(LOOKUP_GROUPS.DON_VI_TINH);
  return (
    <datalist id="product-unit-options">
      {units.map((u) => (
        <option key={u.id} value={u.label} />
      ))}
    </datalist>
  );
};

interface ProductFormModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: ProductFormData;
  categories: string[];
  generatingCode: boolean;
  onClose: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: () => void;
  /** Re-request a suggested code. Omitted renders no suggest button. */
  onSuggestCode?: () => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen, isEditing, formData, categories, generatingCode, onClose, onChange, onSubmit, onSuggestCode,
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
        {/* Name and category come first: the code is derived from them, so filling them
            in order is what lets the suggestion appear. */}
        <div className="space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
              {/* A list of suggestions rather than a closed select: the catalogue already
                  mixes units and a new one should not require a code change. */}
              <input
                type="text"
                name="donViTinh"
                list="product-unit-options"
                value={formData.donViTinh}
                onChange={onChange}
                placeholder="VD: Kg, Thùng, Cái"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <UnitSuggestions />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá thành <span className="text-gray-400 font-normal text-xs">(VND / đơn vị)</span>
            </label>
            <input
              type="number"
              name="giaThanh"
              value={formData.giaThanh}
              onChange={onChange}
              placeholder="VD: 100000 — để trống nếu chưa định giá"
              min={0}
              step={1000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã hàng hóa <span className="text-red-500">*</span>
              <span className="ml-2 text-xs text-gray-400 font-normal">
                LOẠI-STT-TÊNVIẾTTẮT, sửa được
              </span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="maSanPham"
                value={formData.maSanPham}
                onChange={onChange}
                placeholder={generatingCode ? 'Đang gợi ý mã...' : 'VD: NLT-001-MTLB'}
                disabled={generatingCode}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono disabled:bg-gray-100"
              />
              {onSuggestCode && (
                <button
                  type="button"
                  onClick={onSuggestCode}
                  disabled={generatingCode || !formData.loaiSanPham}
                  title={!formData.loaiSanPham ? 'Chọn loại hàng hóa để gợi ý mã' : 'Gợi ý lại mã theo tên và loại'}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${generatingCode ? 'animate-spin' : ''}`} />
                  Gợi ý
                </button>
              )}
            </div>
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
