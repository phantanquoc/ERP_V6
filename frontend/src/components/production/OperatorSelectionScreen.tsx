import React from 'react';
import { Loader2, User } from 'lucide-react';
import { useProductionEmployees } from '../../hooks/useProductionEmployees';

interface OperatorSelectionScreenProps {
  onSelect: (name: string) => void;
}

/**
 * Full-screen kiosk-tablet operator picker.
 *
 * Extracted từ `ProductionDataEntry.tsx` để dùng chung cho các trang
 * nhập liệu tablet (sản lượng, đánh giá nguyên liệu, ...).
 */
const OperatorSelectionScreen: React.FC<OperatorSelectionScreenProps> = ({ onSelect }) => {
  const { data: employees, isLoading } = useProductionEmployees();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <User className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-gray-800">Chọn người thực hiện</h1>
          <p className="text-sm text-gray-500 mt-1">Chọn tên của bạn trước khi nhập liệu</p>
        </div>
        <div className="space-y-2">
          {employees?.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onSelect(emp.name)}
              className="w-full min-h-[52px] px-4 py-3 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <span className="text-base font-medium text-gray-800">{emp.name}</span>
              <span className="text-sm text-gray-400 ml-2">({emp.employeeCode})</span>
            </button>
          ))}
          {(!employees || employees.length === 0) && (
            <p className="text-center text-gray-500 py-8">Không tìm thấy nhân viên sản xuất.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OperatorSelectionScreen;
