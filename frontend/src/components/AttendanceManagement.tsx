import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Download, Settings } from 'lucide-react';
import attendanceService from '@services/attendanceService';
import { useEmployees, useAttendanceByDateRange, attendanceKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import DatePicker from './DatePicker';
import WorkShiftSettingsModal from './WorkShiftSettingsModal';
import TableFilter, { FilterField } from './TableFilter';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';

interface AttendanceRecord {
  stt: number;
  id: string;
  ids: string[];
  employeeCode: string;
  employeeName: string;
  positionName: string;
  attendanceDate: string;
  checkInTimes: string[];
  checkOutTimes: string[];
  workHours: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'OVERTIME';
  notes: string | null;
}

// Each individual attendance entry in the edit modal
interface EditEntry {
  id: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'OVERTIME';
  notes: string;
}

const AttendanceManagement: React.FC = () => {
  const { user } = useAuth();
  // /api/employees requires ADMIN | DEPARTMENT_HEAD | TEAM_LEAD
  const canViewEmployees = user?.role === UserRole.ADMIN
    || user?.role === UserRole.DEPARTMENT_HEAD
    || user?.role === UserRole.TEAM_LEAD;

  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', status: '' });
  const filterFields: FilterField[] = [
    {
      key: 'status',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { value: 'PRESENT', label: 'Đúng giờ' },
        { value: 'LATE', label: 'Muộn' },
        { value: 'ABSENT', label: 'Vắng mặt' },
        { value: 'ON_LEAVE', label: 'Nghỉ phép' },
        { value: 'OVERTIME', label: 'Tăng ca' },
      ],
    },
  ];
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [showShiftSettings, setShowShiftSettings] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEntries, setEditEntries] = useState<EditEntry[]>([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeCode: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    status: 'PRESENT' as const,
    notes: '',
  });

  // Use React Query for employees — only fetch if the user's role permits it
  const { data: employeesData } = useEmployees(1, 1000, canViewEmployees);
  const employees = employeesData?.data || [];
  const employeeSearchKeyword = employeeSearch.trim().toLowerCase();
  const filteredEmployees = employees
    .filter((employee) => {
      if (!employeeSearchKeyword) {
        return true;
      }

      const fullName = `${employee.user.firstName} ${employee.user.lastName}`.trim().toLowerCase();
      return fullName.includes(employeeSearchKeyword)
        || employee.employeeCode.toLowerCase().includes(employeeSearchKeyword);
    })
    .slice(0, 8);

  // Use React Query for attendance data
  const queryClient = useQueryClient();
  const { data: attendances = [], isLoading: loading } = useAttendanceByDateRange(startDate, endDate);

  const handleAddNew = () => {
    setEditingId(null);
    setEditEntries([]);
    setSelectedEmployeeName('');
    setEmployeeSearch('');
    setIsEmployeeDropdownOpen(false);
    setFormData({
      employeeCode: '',
      attendanceDate: new Date().toISOString().split('T')[0],
      checkInTime: '',
      checkOutTime: '',
      status: 'PRESENT',
      notes: '',
    });
    setShowModal(true);
  };

  const getEmployeeFullName = (employee: typeof employees[number]) =>
    `${employee.user.firstName} ${employee.user.lastName}`.trim();

  const handleEmployeeSearchChange = (value: string) => {
    setEmployeeSearch(value);
    setIsEmployeeDropdownOpen(true);
    setSelectedEmployeeName('');
    setFormData({ ...formData, employeeCode: '' });
  };

  const handleEmployeeSelect = (employee: typeof employees[number]) => {
    const fullName = getEmployeeFullName(employee);
    setEmployeeSearch(fullName);
    setSelectedEmployeeName(fullName);
    setFormData({ ...formData, employeeCode: employee.employeeCode });
    setIsEmployeeDropdownOpen(false);
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setSelectedEmployeeName(record.employeeName);
    setEmployeeSearch(record.employeeName);
    setIsEmployeeDropdownOpen(false);

    // Convert UTC time to local time for editing
    const getLocalTimeString = (dateTimeString: string | null | undefined) => {
      if (!dateTimeString) return '';
      const date = new Date(dateTimeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    // Build entries for each record id
    const entries: EditEntry[] = record.ids.map((id, index) => ({
      id,
      checkInTime: getLocalTimeString(record.checkInTimes[index] ?? null),
      checkOutTime: getLocalTimeString(record.checkOutTimes[index] ?? null),
      status: record.status,
      notes: '',
    }));

    // Parse notes - the backend joins them with '; '
    if (record.notes) {
      const notesParts = record.notes.split('; ');
      entries.forEach((entry, index) => {
        entry.notes = notesParts[index] || '';
      });
    }

    setEditEntries(entries);

    setFormData({
      employeeCode: record.employeeCode,
      attendanceDate: record.attendanceDate.split('T')[0],
      checkInTime: '',
      checkOutTime: '',
      status: record.status,
      notes: '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      console.log('Form data:', formData);

      if (!formData.employeeCode || !formData.attendanceDate) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
      }

      if (editingId && editEntries.length > 0) {
        // Update each record individually
        for (const entry of editEntries) {
          const updateData = {
            checkInTime: entry.checkInTime ? `${formData.attendanceDate}T${entry.checkInTime}:00` : undefined,
            checkOutTime: entry.checkOutTime ? `${formData.attendanceDate}T${entry.checkOutTime}:00` : undefined,
            status: entry.status,
            notes: entry.notes || undefined,
          };
          console.log('Updating attendance:', entry.id, updateData);
          await attendanceService.updateAttendance(entry.id, updateData);
        }
        alert('Cập nhật điểm danh thành công');
      } else {
        const selectedEmployee = employees.find(emp => emp.employeeCode === formData.employeeCode);

        if (!selectedEmployee) {
          alert('Vui lòng chọn nhân viên hợp lệ từ danh sách');
          return;
        }

        const createData = {
          employeeId: selectedEmployee.id,
          attendanceDate: formData.attendanceDate,
          checkInTime: formData.checkInTime ? `${formData.attendanceDate}T${formData.checkInTime}:00` : undefined,
          checkOutTime: formData.checkOutTime ? `${formData.attendanceDate}T${formData.checkOutTime}:00` : undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        };
        console.log('Creating attendance:', createData);
        await attendanceService.createAttendance(createData);
        alert('Thêm điểm danh thành công');
      }

      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Lỗi khi lưu dữ liệu điểm danh: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) return;

    try {
      await attendanceService.deleteAttendance(id);
      alert('Xóa điểm danh thành công');
      queryClient.invalidateQueries({ queryKey: attendanceKeys.lists() });
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('Lỗi khi xóa dữ liệu điểm danh');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'text-green-700 font-medium';
      case 'LATE':
        return 'text-yellow-700 font-medium';
      case 'ABSENT':
        return 'text-red-700 font-medium';
      case 'ON_LEAVE':
        return 'text-purple-700 font-medium';
      case 'OVERTIME':
        return 'text-blue-700 font-medium';
      default:
        return 'text-gray-700 font-medium';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PRESENT: 'Đúng giờ',
      LATE: 'Muộn',
      ABSENT: 'Vắng mặt',
      ON_LEAVE: 'Nghỉ phép',
      OVERTIME: 'Tăng ca',
    };
    return labels[status] || status;
  };

  const formatTimes = (times: string[]) => {
    if (!times || times.length === 0) return '-';
    return times.map(t => {
      const date = new Date(t);
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }).join(', ');
  };

  const filteredAttendances = attendances.filter(item => {
    const matchesSearch =
      item.employeeCode.toLowerCase().includes(filterValues._search.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(filterValues._search.toLowerCase());
    const matchesStatus = !filterValues.status || item.status === filterValues.status;
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredAttendances.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedAttendances = filteredAttendances.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Bảng Điểm Danh Nhân Viên</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShiftSettings(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            title="Cài đặt ca làm việc"
          >
            <Settings className="w-4 h-4" />
            Cài đặt ca
          </button>
          <button
            onClick={async () => {
              try {
                await attendanceService.exportToExcel({ search: filterValues._search || undefined });
              } catch (err) {
                console.error('Error exporting to Excel:', err);
                alert('Không thể xuất file Excel');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Xuất Excel
          </button>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>
        </div>
      </div>

      {/* Date Filters + Search */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[160px]">
          <DatePicker
            label="Từ ngày"
            value={startDate}
            onChange={(date) => setStartDate(date)}
            maxDate={endDate}
            placeholder="Chọn ngày bắt đầu"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <DatePicker
            label="Đến ngày"
            value={endDate}
            onChange={(date) => setEndDate(date)}
            minDate={startDate}
            placeholder="Chọn ngày kết thúc"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <TableFilter
            filters={filterFields}
            values={filterValues}
            onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
            searchPlaceholder="Tìm theo mã hoặc tên nhân viên..."
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : filteredAttendances.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu điểm danh</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã NV</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên nhân viên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Chức vụ</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày điểm danh</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Giờ vào</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Giờ ra</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số giờ</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ghi chú</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAttendances.map((record, index) => (
                  <tr
                    key={record.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{record.stt}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {record.employeeCode}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {record.employeeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {record.positionName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {new Date(record.attendanceDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {formatTimes(record.checkInTimes)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {formatTimes(record.checkOutTimes)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {record.workHours.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-200">
                      <span className={`text-sm ${getStatusColor(record.status)}`}>
                        {getStatusLabel(record.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {record.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg shadow-xl w-full mx-4 ${editingId && editEntries.length > 0 ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingId ? 'Chỉnh sửa điểm danh' : 'Thêm điểm danh'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editingId ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên</label>
                  <input
                    type="text"
                    value={selectedEmployeeName}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium"
                  />
                </div>
              ) : (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => handleEmployeeSearchChange(e.target.value)}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setIsEmployeeDropdownOpen(false), 150);
                    }}
                    placeholder="Nhập tên hoặc mã nhân viên"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {isEmployeeDropdownOpen && (
                    <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((employee) => {
                          const fullName = getEmployeeFullName(employee);

                          return (
                            <button
                              key={employee.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleEmployeeSelect(employee)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-blue-50"
                            >
                              <span className="font-medium text-gray-900">{fullName}</span>
                              <span className="text-sm text-gray-500">{employee.employeeCode}</span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Không tìm thấy nhân viên phù hợp
                        </div>
                      )}
                    </div>
                  )}
                  {employeeSearch && !formData.employeeCode && (
                    <p className="mt-1 text-sm text-red-600">
                      ✗ Vui lòng chọn nhân viên từ danh sách gợi ý
                    </p>
                  )}
                </div>
              )}

              <div>
                <DatePicker
                  label="Ngày điểm danh"
                  value={formData.attendanceDate}
                  onChange={(date) => setFormData({ ...formData, attendanceDate: date })}
                  placeholder="Chọn ngày điểm danh"
                  required
                  disabled={!!editingId}
                />
              </div>

              {/* Edit mode: show all entries */}
              {editingId && editEntries.length > 0 ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Các lần chấm công ({editEntries.length} lần)
                  </label>
                  <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                    {editEntries.map((entry, index) => (
                      <div key={entry.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-blue-600">Lần {index + 1}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Giờ vào</label>
                            <input
                              type="time"
                              value={entry.checkInTime}
                              onChange={(e) => {
                                const updated = [...editEntries];
                                updated[index] = { ...updated[index], checkInTime: e.target.value };
                                setEditEntries(updated);
                              }}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Giờ ra</label>
                            <input
                              type="time"
                              value={entry.checkOutTime}
                              onChange={(e) => {
                                const updated = [...editEntries];
                                updated[index] = { ...updated[index], checkOutTime: e.target.value };
                                setEditEntries(updated);
                              }}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Trạng thái</label>
                            <select
                              value={entry.status}
                              onChange={(e) => {
                                const updated = [...editEntries];
                                updated[index] = { ...updated[index], status: e.target.value as any };
                                setEditEntries(updated);
                              }}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="PRESENT">Đúng giờ</option>
                              <option value="LATE">Muộn</option>
                              <option value="ABSENT">Vắng mặt</option>
                              <option value="ON_LEAVE">Nghỉ phép</option>
                              <option value="OVERTIME">Tăng ca</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
                            <input
                              type="text"
                              value={entry.notes}
                              onChange={(e) => {
                                const updated = [...editEntries];
                                updated[index] = { ...updated[index], notes: e.target.value };
                                setEditEntries(updated);
                              }}
                              placeholder="Ghi chú"
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Add mode: single entry */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giờ vào</label>
                      <input
                        type="time"
                        value={formData.checkInTime}
                        onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giờ ra</label>
                      <input
                        type="time"
                        value={formData.checkOutTime}
                        onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PRESENT">Đúng giờ</option>
                      <option value="LATE">Muộn</option>
                      <option value="ABSENT">Vắng mặt</option>
                      <option value="ON_LEAVE">Nghỉ phép</option>
                      <option value="OVERTIME">Tăng ca</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Nhập ghi chú (nếu có)"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <WorkShiftSettingsModal
        isOpen={showShiftSettings}
        onClose={() => setShowShiftSettings(false)}
      />
    </div>
  );
};

export default AttendanceManagement;
