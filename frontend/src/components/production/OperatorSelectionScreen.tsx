import React, { useMemo, useState } from 'react';
import { Loader2, Search, User, X, UserPlus } from 'lucide-react';
import { useProductionEmployees } from '../../hooks/useProductionEmployees';
import { AttendedOperator } from '../../services/attendedOperatorsService';
import KioskFooter from './KioskFooter';

interface OperatorSelectionScreenProps {
  onSelect: (selection: { id: string; name: string }) => void;
  attendedOperators?: AttendedOperator[];
  isLoadingAttended?: boolean;
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
 * Supports two modes:
 * 1. Attended mode (when attendedOperators is provided): shows only attended operators for the shift
 * 2. Fallback mode (when "Tìm người khác" is clicked): shows full production employee list
 */
const OperatorSelectionScreen: React.FC<OperatorSelectionScreenProps> = ({
  onSelect,
  attendedOperators,
  isLoadingAttended,
}) => {
  const { data: allEmployees, isLoading: isLoadingAll } = useProductionEmployees();
  const [search, setSearch] = useState('');
  const [showFallback, setShowFallback] = useState(false);

  // Determine which list to show
  const isAttendedMode = attendedOperators !== undefined && !showFallback;
  const employees = isAttendedMode ? attendedOperators : allEmployees;
  const isLoading = isAttendedMode ? isLoadingAttended : isLoadingAll;

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
          <p className="text-sm text-gray-500 mt-1">
            {isAttendedMode ? 'Nhân viên đã điểm danh ca này' : 'Tất cả nhân viên sản xuất'}
          </p>
        </div>

        {/* Fallback button (only in attended mode) */}
        {isAttendedMode && (
          <button
            onClick={() => setShowFallback(true)}
            className="w-full mb-4 min-h-[52px] px-4 py-3 bg-yellow-50 border-2 border-yellow-400 rounded-xl text-left hover:bg-yellow-100 transition-colors flex items-center gap-3"
          >
            <UserPlus className="w-5 h-5 text-yellow-700" />
            <span className="text-base font-medium text-yellow-800">Tìm người khác</span>
          </button>
        )}

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
              onClick={() => onSelect({ id: emp.id, name: emp.name })}
              className="w-full min-h-[52px] px-4 py-3 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <span className="text-base font-medium text-gray-800">{emp.name}</span>
              <span className="text-sm text-gray-400 ml-2">({emp.employeeCode})</span>
              {isAttendedMode && emp.positionName && (
                <span className="text-xs text-gray-400 ml-2">- {emp.positionName}</span>
              )}
            </button>
          ))}
          {!hasEmployees && isAttendedMode && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">Chưa có nhân viên nào điểm danh ca này.</p>
              <p className="text-sm text-gray-500">Nhấn "Tìm người khác" phía trên để chọn.</p>
            </div>
          )}
          {!hasEmployees && !isAttendedMode && (
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
