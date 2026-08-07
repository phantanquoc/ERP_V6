import React from 'react';
import { X } from 'lucide-react';
import Modal from '../Modal';
import { QuotationFormData } from './types';
import { parseNumberInputStr } from '../../utils/numberInput';

interface CreateQuotationSubModalProps {
  isOpen: boolean;
  loading: boolean;
  quotationFormData: QuotationFormData;
  setQuotationFormData: React.Dispatch<React.SetStateAction<QuotationFormData>>;
  onClose: () => void;
  onSubmit: () => void;
}

const CreateQuotationSubModal: React.FC<CreateQuotationSubModalProps> = ({
  isOpen,
  loading,
  quotationFormData,
  setQuotationFormData,
  onClose,
  onSubmit,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full flex flex-col modal-viewport-h"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-bold text-gray-800">Tạo Báo Giá</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 p-6 overflow-y-auto flex-1">
          {/* Hiệu lực báo giá */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hiệu lực báo giá (ngày) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quotationFormData.hieuLucBaoGia}
              onChange={(e) =>
                setQuotationFormData((prev) => ({
                  ...prev,
                  hieuLucBaoGia: parseNumberInputStr(e.target.value),
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập số ngày"
              required
            />
          </div>

          {/* Trạng thái */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái <span className="text-red-500">*</span>
            </label>
            <select
              value={quotationFormData.tinhTrang}
              onChange={(e) =>
                setQuotationFormData((prev) => ({ ...prev, tinhTrang: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="DANG_CHO_PHAN_HOI">Đang chờ phản hồi</option>
              <option value="DANG_CHO_GUI_DON_HANG">Đang chờ gửi đơn hàng</option>
              <option value="DA_DAT_HANG">Đã đặt hàng</option>
              <option value="KHONG_DAT_HANG">Không đặt hàng</option>
            </select>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea
              value={quotationFormData.ghiChu}
              onChange={(e) =>
                setQuotationFormData((prev) => ({ ...prev, ghiChu: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập ghi chú (nếu có)"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Tạo báo giá'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateQuotationSubModal;
