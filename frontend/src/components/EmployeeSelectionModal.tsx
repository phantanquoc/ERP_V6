import React, { useState, useMemo } from 'react';
import { Search, X, Users } from 'lucide-react';
import { ModalForm, ModalFooter } from './ModalForm';
import { useAllEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';

interface EmployeeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onConfirm: (ids: string[]) => void;
}

const EmployeeSelectionModal: React.FC<EmployeeSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  onConfirm,
}) => {
  const { data: employeeData, isLoading } = useAllEmployeesForAssignment();
  const employees = employeeData?.employees ?? [];
  const departments = employeeData?.departments ?? [];

  // Local draft selection — initialized from props when modal opens
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Reset draft when modal opens with new selectedIds
  React.useEffect(() => {
    if (isOpen) {
      setDraft(selectedIds);
      setSearch('');
      setDeptFilter('');
    }
  }, [isOpen]);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (deptFilter) {
      list = list.filter((e) => e.department === deptFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q),
      );
    }
    return list;
  }, [employees, deptFilter, search]);

  const selectedEmployees = useMemo(
    () => employees.filter((e) => draft.includes(e._id)),
    [employees, draft],
  );

  const toggle = (empId: string) => {
    setDraft((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    );
  };

  const removeChip = (empId: string) => {
    setDraft((prev) => prev.filter((id) => id !== empId));
  };

  const handleConfirm = () => {
    onConfirm(draft);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title="Chọn nhân sự tham gia"
      titleIcon={<Users className="w-4 h-4" />}
      maxWidth="3xl"
      footer={
        <ModalFooter
          onClose={handleClose}
          onSubmit={handleConfirm}
          submitLabel="Xác nhận"
        />
      }
    >
      <div className="space-y-4">
        {/* Selected chips */}
        {selectedEmployees.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Đã chọn ({selectedEmployees.length} người):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedEmployees.map((emp) => (
                <span
                  key={emp._id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                >
                  {emp.lastName} {emp.firstName}
                  <button
                    type="button"
                    onClick={() => removeChip(emp._id)}
                    className="ml-0.5 hover:text-blue-600 transition-colors"
                    aria-label={`Bỏ chọn ${emp.lastName} ${emp.firstName}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mã nhân viên..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Employee list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">
            Đang tải danh sách nhân viên...
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-400">
            Không tìm thấy nhân viên phù hợp
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-1">
            {filteredEmployees.map((emp) => {
              const isChecked = draft.includes(emp._id);
              return (
                <label
                  key={emp._id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                    isChecked
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(emp._id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800 truncate block">
                      {emp.lastName} {emp.firstName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {emp.employeeCode} &middot; {emp.department}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Count summary */}
        {!isLoading && (
          <p className="text-xs text-gray-400 text-right">
            Hiển thị {filteredEmployees.length} / {employees.length} nhân viên
          </p>
        )}
      </div>
    </ModalForm>
  );
};

export default EmployeeSelectionModal;
