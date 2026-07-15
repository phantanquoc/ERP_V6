import React, { useMemo, useState } from 'react';
import { Loader2, Search, User, X } from 'lucide-react';
import { useProductionEmployees } from '../../hooks/useProductionEmployees';
import KioskFooter from './KioskFooter';

interface OperatorSelectionScreenProps {
  onSelect: (name: string) => void;
}

/** Bỏ dấu tiếng Việt + lowercase để tìm kiếm không phân biệt dấu. */
const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/**
 * Full-screen kiosk-tablet operator picker.
 *
 * Extracted từ `ProductionDataEntry.tsx` để dùng chung cho các trang
 * nhập liệu tablet (sản lượng, đánh giá nguyên liệu, ...).
 */
const OperatorSelectionScreen: React.FC<OperatorSelectionScreenProps> = ({ onSelect }) => {
  const { data: employees, isLoading } = useProductionEmployees();
  const [search, setSearch] = useState('');

  const filteredEmployees = useMemo(() => {
    const keyword = normalizeSearchText(search);
    if (!keyword) return employees ?? [];
    return (employees ?? []).filter((emp) =>
      normalizeSearchText(`${emp.name} ${emp.employeeCode}`).includes(keyword),
    );
  }, [employees, search]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const hasEmployees = !!employees && employees.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-lg w-full mx-auto px-4 py-8 flex-1">
        <div className="text-center mb-6">
          <img src="/abf-logo.png" alt="An Bình Foods" className="h-12 object-contain mx-auto mb-4" />
          <User className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-gray-800">Chọn người thực hiện</h1>
          <p className="text-sm text-gray-500 mt-1">Chọn tên của bạn trước khi nhập liệu</p>
        </div>

        {/* Ô tìm kiếm — lọc real-time, không cần nhấn nút */}
        {hasEmployees && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc mã nhân viên..."
              autoComplete="off"
              className="w-full min-h-[52px] pl-11 pr-11 py-3 bg-white border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          {filteredEmployees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onSelect(emp.name)}
              className="w-full min-h-[52px] px-4 py-3 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <span className="text-base font-medium text-gray-800">{emp.name}</span>
              <span className="text-sm text-gray-400 ml-2">({emp.employeeCode})</span>
            </button>
          ))}
          {!hasEmployees && (
            <p className="text-center text-gray-500 py-8">Không tìm thấy nhân viên sản xuất.</p>
          )}
          {hasEmployees && filteredEmployees.length === 0 && (
            <p className="text-center text-gray-500 py-8">Không có nhân viên khớp với "{search}".</p>
          )}
        </div>
      </div>
      <KioskFooter />
    </div>
  );
};

export default OperatorSelectionScreen;
