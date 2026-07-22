import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ShiftSelectionScreenProps {
  onSelect: (shift: number) => void;
  onBack: () => void;
}

/** Màu nền từng ca — đồng bộ tông với hub. */
const SHIFT_COLORS: Record<number, string> = {
  1: 'bg-blue-500 hover:bg-blue-600',
  2: 'bg-amber-500 hover:bg-amber-600',
  3: 'bg-indigo-500 hover:bg-indigo-600',
};

/**
 * Full-screen kiosk-tablet shift picker (Ca 1 / 2 / 3).
 *
 * Thiết kế đồng bộ với DataEntryHub: nền gradient, logo ABF trên,
 * 3 nút to chiếm trọn màn hình, footer Koola dưới.
 */
const ShiftSelectionScreen: React.FC<ShiftSelectionScreenProps> = ({ onSelect, onBack }) => (
  <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex flex-col">
    {/* Header: logo + nút quay lại */}
    <div className="flex-shrink-0 flex items-center py-2">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-base font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-6 h-6" />
        Quay lại
      </button>
      <img src="/abf-logo.png" alt="An Bình Foods" className="h-12 sm:h-16 object-contain mx-auto" />
      {/* Spacer cân đối với nút quay lại để logo căn giữa */}
      <div className="w-[110px]" aria-hidden />
    </div>

    <h1 className="flex-shrink-0 text-center text-2xl sm:text-3xl font-bold text-gray-800 py-2">
      Chọn ca làm việc
    </h1>

    {/* 3 nút ca — chiếm phần lớn màn hình */}
    <div className="grid flex-1 min-h-0 w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
      {[1, 2, 3].map((shift) => (
        <button
          key={shift}
          onClick={() => onSelect(shift)}
          className={`${SHIFT_COLORS[shift]} h-full w-full text-white rounded-3xl p-8 shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl flex flex-col items-center justify-center text-center`}
        >
          <span className="text-6xl sm:text-8xl font-black mb-3">{shift}</span>
          <span className="text-2xl sm:text-3xl font-bold">Ca {shift}</span>
        </button>
      ))}
    </div>

    {/* Powered by Koola */}
    <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 opacity-60">
      <span className="text-xs text-gray-500">Powered by</span>
      <img src="/koola-logo.png" alt="Koola" className="h-4 object-contain" />
      <span className="text-xs font-semibold text-gray-400">KOOLA</span>
    </div>
  </div>
);

export default ShiftSelectionScreen;
