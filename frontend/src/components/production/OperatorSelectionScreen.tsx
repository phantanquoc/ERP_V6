import React, { useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Search, User, X, UserPlus } from 'lucide-react';
import { useProductionEmployees } from '../../hooks/useProductionEmployees';
import { AttendedOperator } from '../../services/attendedOperatorsService';

interface OperatorSelectionScreenProps {
  onSelect: (selection: { id: string; name: string }) => void;
  onBack?: () => void;
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
  onBack,
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
      <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const hasEmployees = !!employees && employees.length > 0;

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex flex-col">
      {/* Header: nút quay lại + logo ABF căn giữa */}
      <div className="flex-shrink-0 flex items-center py-2">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-base font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-6 h-6" />
            Quay lại
          </button>
        ) : (
          <div className="w-[110px]" aria-hidden />
        )}
        <img src="/abf-logo.png" alt="An Bình Foods" className="h-12 sm:h-16 object-contain mx-auto" />
        {/* Spacer cân đối để logo căn giữa */}
        <div className="w-[110px]" aria-hidden />
      </div>

      <div className="flex-shrink-0 text-center py-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Chọn người thực hiện</h1>
        <p className="text-base text-gray-500 mt-1">
          {isAttendedMode ? 'Nhân viên đã điểm danh ca này' : 'Tất cả nhân viên sản xuất'}
        </p>
      </div>

      {/* Thanh công cụ: tìm người khác + ô tìm kiếm */}
      <div className="flex-shrink-0 w-full max-w-4xl mx-auto flex flex-col sm:flex-row gap-3 py-2">
        {isAttendedMode && (
          <button
            onClick={() => setShowFallback(true)}
            className="flex-shrink-0 min-h-[60px] px-5 py-3 bg-amber-400 hover:bg-amber-500 rounded-2xl shadow-md transition-colors flex items-center justify-center gap-3"
          >
            <UserPlus className="w-6 h-6 text-white" />
            <span className="text-lg font-semibold text-white">Tìm người khác</span>
          </button>
        )}
        {hasEmployees && (
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc mã nhân viên..."
              autoComplete="off"
              className="w-full min-h-[60px] pl-13 pr-13 py-3 bg-white border border-gray-200 rounded-2xl text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              style={{ paddingLeft: '3.25rem', paddingRight: '3.25rem' }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Xóa tìm kiếm"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lưới nút nhân viên — cuộn trong vùng còn lại */}
      <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto overflow-y-auto py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {filteredEmployees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onSelect({ id: emp.id, name: emp.name })}
              className="min-h-[80px] px-5 py-4 bg-white border border-gray-200 rounded-2xl text-left shadow-sm hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
                <User className="w-7 h-7 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-semibold text-gray-800 truncate">{emp.name}</div>
                <div className="text-sm text-gray-400 truncate">
                  {emp.employeeCode}
                  {isAttendedMode && emp.positionName ? ` · ${emp.positionName}` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>

        {!hasEmployees && isAttendedMode && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-3">Chưa có nhân viên nào điểm danh ca này.</p>
            <p className="text-base text-gray-500">Nhấn "Tìm người khác" phía trên để chọn.</p>
          </div>
        )}
        {!hasEmployees && !isAttendedMode && (
          <p className="text-center text-xl text-gray-500 py-12">Không tìm thấy nhân viên sản xuất.</p>
        )}
        {hasEmployees && filteredEmployees.length === 0 && (
          <p className="text-center text-xl text-gray-500 py-12">Không có nhân viên khớp với "{search}".</p>
        )}
      </div>

      {/* Powered by Koola */}
      <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 opacity-60">
        <span className="text-xs text-gray-500">Powered by</span>
        <img src="/koola-logo.png" alt="Koola" className="h-4 object-contain" />
        <span className="text-xs font-semibold text-gray-400">KOOLA</span>
      </div>
    </div>
  );
};

export default OperatorSelectionScreen;
