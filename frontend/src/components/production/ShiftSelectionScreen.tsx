import React from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import KioskFooter from './KioskFooter';

interface ShiftSelectionScreenProps {
  onSelect: (shift: number) => void;
  onBack: () => void;
  operatorName: string;
}

/**
 * Full-screen kiosk-tablet shift picker (Ca 1 / 2 / 3).
 *
 * Extracted từ `ProductionDataEntry.tsx` để tái sử dụng cho nhiều trang
 * nhập liệu tablet.
 */
const ShiftSelectionScreen: React.FC<ShiftSelectionScreenProps> = ({ onSelect, onBack, operatorName }) => (
  <div className="min-h-screen bg-gray-50 flex flex-col">
    <div className="max-w-lg w-full mx-auto px-4 py-8 flex-1">
      <div className="text-center mb-6">
        <img src="/abf-logo.png" alt="An Bình Foods" className="h-12 object-contain mx-auto mb-4" />
        <Calendar className="w-10 h-10 text-blue-600 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-800">Chọn ca làm việc</h1>
        <p className="text-sm text-gray-500 mt-1">Người thực hiện: {operatorName}</p>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((shift) => (
          <button
            key={shift}
            onClick={() => onSelect(shift)}
            className="w-full min-h-[64px] px-6 py-4 bg-white border border-gray-200 rounded-xl text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="text-lg font-semibold text-gray-800">Ca {shift}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        className="mt-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại chọn người
      </button>
    </div>
    <KioskFooter />
  </div>
);

export default ShiftSelectionScreen;
