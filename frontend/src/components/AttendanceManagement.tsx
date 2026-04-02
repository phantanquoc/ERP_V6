import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Search, Settings, Download } from 'lucide-react';
import attendanceService from '@services/attendanceService';
import { useEmployees, useAttendanceByDateRange, attendanceKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import DatePicker from './DatePicker';
import WorkShiftSettingsModal from './WorkShiftSettingsModal';
import { DataTable, Column } from './DataTable';
import { formatDate, formatDateTime, formatTime, formatWorkHours } from '../utils/formatters';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  // Individual record fields (from individual endpoint)
  isOvertime?: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

interface EditEntry {
  id: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'OVERTIME';
  notes: string;
}

type TabValue = 'all' | 'overtime';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PRESENT': return 'text-green-700 bg-green-50';
    case 'LATE':    return 'text-yellow-700 bg-yellow-50';
    case 'ABSENT':  return 'text-red-700 bg-red-50';
    case 'ON_LEAVE':return 'text-purple-700 bg-purple-50';
    case 'OVERTIME':return 'text-blue-700 bg-blue-50';
    default:        return 'text-gray-700 bg-gray-50';
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    PRESENT: 'Đúng giờ',
    LATE:    'Muộn',
    ABSENT:  'Vắng mặt',
    ON_LEAVE:'Nghỉ phép',
    OVERTIME:'Tăng ca',
  };
  return labels[status] || status;
};

const formatTimes = (times: string[]) => {
  if (!times || times.length === 0) return '—';
  return times.map(t => {
    const date = new Date(t);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }).join(', ');
};

const formatTimeFromDateTime = (dt: string | null | undefined): string => {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// ─── Component ───────────────────────────────────────────────────────────────

const AttendanceManagement: React.FC = () => {
  const queryClient = useQueryClient();

  // ── Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // ── UI state
  const [currentTab, setCurrentTab] = useState<TabValue>('all');
  const [showModal, setShowModal] = useState(false);
  const [showShiftSettings, setShowShiftSettings] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEntries, setEditEntries] = useState<EditEntry[]>([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');

  // ── Form state
  const [formData, setFormData] = useState({
    employeeCode: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    checkInTime: '',
    checkOutTime: '',
    status: 'PRESENT' as const,
    notes: '',
  });

  // ── Pagination (managed outside DataTable for search/filter)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ── Search text (mirrored to DataTable filter)
  const [searchText, setSearchText] = useState('');

  // ── React Query: employees
  const { data: employeesData } = useEmployees(1, 1000);
  const employees = employeesData?.data || [];

  // ── React Query: attendance
  const { data: attendances = [], isLoading, refetch } = useAttendanceByDateRange(startDate, endDate);

  // ── Realtime: ATTENDANCE_CHANGED + OVERTIME_PLAN_CHANGED (overtime approval auto-creates attendance)
  useEffect(() => {
    const handler = () => { refetch(); };
    window.addEventListener('ATTENDANCE_CHANGED', handler);
    window.addEventListener('OVERTIME_PLAN_CHANGED', handler);
    return () => {
      window.removeEventListener('ATTENDANCE_CHANGED', handler);
      window.removeEventListener('OVERTIME_PLAN_CHANGED', handler);
    };
  }, [refetch]);

  // ── Add / Edit handlers
  const handleAddNew = () => {
    setEditingId(null);
    setEditEntries([]);
    setSelectedEmployeeName('');
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

  const handleEmployeeCodeChange = (code: string) => {
    setFormData(prev => ({ ...prev, employeeCode: code }));
    const emp = employees.find(e => e.employeeCode === code);
    setSelectedEmployeeName(emp ? `${emp.user.firstName} ${emp.user.lastName}` : '');
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingId(record.id);
    setSelectedEmployeeName(record.employeeName);

    const getLocalTimeString = (dateTimeString: string | null | undefined) => {
      if (!dateTimeString) return '';
      const date = new Date(dateTimeString);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const entries: EditEntry[] = record.ids.map((id, index) => ({
      id,
      checkInTime:  getLocalTimeString(record.checkInTimes[index] ?? null),
      checkOutTime: getLocalTimeString(record.checkOutTimes[index] ?? null),
      status: record.status,
      notes: record.notes ? record.notes.split('; ')[index] || '' : '',
    }));

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
      if (!formData.employeeCode || !formData.attendanceDate) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
      }

      if (editingId && editEntries.length > 0) {
        for (const entry of editEntries) {
          await attendanceService.updateAttendance(entry.id, {
            checkInTime:  entry.checkInTime  ? `${formData.attendanceDate}T${entry.checkInTime}:00`  : undefined,
            checkOutTime: entry.checkOutTime ? `${formData.attendanceDate}T${entry.checkOutTime}:00` : undefined,
            status: entry.status,
            notes: entry.notes || undefined,
          });
        }
        alert('Cập nhật điểm danh thành công');
      } else {
        await attendanceService.createAttendance({
          employeeCode: formData.employeeCode,
          attendanceDate: formData.attendanceDate,
          checkInTime:  formData.checkInTime  ? `${formData.attendanceDate}T${formData.checkInTime}:00`  : undefined,
          checkOutTime: formData.checkOutTime ? `${formData.attendanceDate}T${formData.checkOutTime}:00` : undefined,
          status: formData.status,
          notes: formData.notes || undefined,
        });
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

  // ── DataTable columns ───────────────────────────────────────────────────────

  const columns: Column<AttendanceRecord>[] = [
    {
      key: 'stt',
      label: 'STT',
      width: '60px',
      render: (row) => <span className="font-semibold text-gray-500">{row.stt}</span>,
    },
    {
      key: 'employeeCode',
      label: 'Mã NV',
      width: '100px',
      filterable: true,
      filterType: 'text',
      render: (row) => <span className="font-semibold text-blue-600">{row.employeeCode}</span>,
    },
    {
      key: 'employeeName',
      label: 'Nhân viên',
      filterable: true,
      filterType: 'text',
      render: (row) => <span className="font-medium">{row.employeeName}</span>,
    },
    {
      key: 'positionName',
      label: 'Chức vụ',
      width: '140px',
    },
    {
      key: 'attendanceDate',
      label: 'Ngày',
      width: '120px',
      filterable: true,
      filterType: 'date-range',
      render: (row) => formatDate(row.attendanceDate),
    },
    {
      key: 'checkInTimes',
      label: 'Giờ vào',
      width: '120px',
      render: (row) => formatTimes(row.checkInTimes),
    },
    {
      key: 'checkOutTimes',
      label: 'Giờ ra',
      width: '120px',
      render: (row) => formatTimes(row.checkOutTimes),
    },
    {
      key: 'workHours',
      label: 'Số giờ',
      width: '90px',
      render: (row) => formatWorkHours(row.workHours),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      width: '130px',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'PRESENT',  label: 'Đúng giờ' },
        { value: 'LATE',     label: 'Muộn' },
        { value: 'ABSENT',   label: 'Vắng mặt' },
        { value: 'ON_LEAVE', label: 'Nghỉ phép' },
        { value: 'OVERTIME', label: 'Tăng ca' },
      ],
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status)}`}>
          {getStatusLabel(row.status)}
        </span>
      ),
    },
    {
      key: 'notes',
      label: 'Ghi chú',
      width: '140px',
      render: (row) => <span className="text-gray-600 text-sm">{row.notes || '—'}</span>,
    },
    {
      key: 'actions',
      label: 'Hành động',
      width: '120px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
            title="Chỉnh sửa"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
            title="Xóa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Overtime columns (separate tab)
  const overtimeColumns: Column<AttendanceRecord>[] = [
    {
      key: 'stt',
      label: 'STT',
      width: '60px',
      render: (row) => <span className="font-semibold text-gray-500">{row.stt}</span>,
    },
    {
      key: 'employeeName',
      label: 'Nhân viên',
      filterable: true,
      filterType: 'text',
      render: (row) => (
        <div>
          <div className="font-medium">{row.employeeName}</div>
          <div className="text-xs text-gray-500">{row.employeeCode}</div>
        </div>
      ),
    },
    {
      key: 'attendanceDate',
      label: 'Ngày',
      width: '120px',
      filterable: true,
      filterType: 'date-range',
      render: (row) => formatDate(row.attendanceDate),
    },
    {
      key: 'checkInTime',
      label: 'Giờ vào',
      width: '110px',
      render: (row) => (
        <span className="font-medium text-blue-700">
          {row.checkInTime ? formatTimeFromDateTime(row.checkInTime) : '—'}
        </span>
      ),
    },
    {
      key: 'checkOutTime',
      label: 'Giờ ra',
      width: '110px',
      render: (row) => (
        <span className="font-medium text-green-700">
          {row.checkOutTime ? formatTimeFromDateTime(row.checkOutTime) : '—'}
        </span>
      ),
    },
    {
      key: 'workHours',
      label: 'Giờ tăng ca',
      width: '110px',
      render: (row) => (
        <span className="font-semibold text-purple-700">{formatWorkHours(row.workHours)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      width: '130px',
      render: (row) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(row.status)}`}>
          {getStatusLabel(row.status)}
        </span>
      ),
    },
    {
      key: 'notes',
      label: 'Ghi chú',
      width: '140px',
      render: (row) => <span className="text-gray-600 text-sm">{row.notes || '—'}</span>,
    },
  ];

  // ── Filtering: apply search + tab filter
  const filteredAll = attendances.filter(item =>
    currentTab === 'overtime' ? false : (
      item.employeeCode.toLowerCase().includes(searchText.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(searchText.toLowerCase())
    )
  );

  const filteredOvertime = attendances.filter(
    item => item.status === 'OVERTIME' &&
      (item.employeeCode.toLowerCase().includes(searchText.toLowerCase()) ||
        item.employeeName.toLowerCase().includes(searchText.toLowerCase()))
  );

  const activeData = currentTab === 'overtime' ? filteredOvertime : filteredAll;
  const total = activeData.length;

  // ── onFilterChange handler for DataTable
  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    setCurrentPage(1);
    // Extract text search from filters (if employeeName or employeeCode filter applied)
    // DataTable's built-in text filters handle inline — no extra state needed here
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* ── Header ── */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
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
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Thêm mới
            </button>
          </div>
        </div>

        {/* ── Tabs + Filters ── */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              ['all',      'Tất cả'],
              ['overtime', 'Tăng ca'],
            ] as [TabValue, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => { setCurrentTab(val); setCurrentPage(1); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentTab === val
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div>
            <DatePicker
              label="Từ ngày"
              value={startDate}
              onChange={(date) => { setStartDate(date); setCurrentPage(1); }}
              maxDate={endDate}
              placeholder="Chọn ngày bắt đầu"
            />
          </div>
          <div>
            <DatePicker
              label="Đến ngày"
              value={endDate}
              onChange={(date) => { setEndDate(date); setCurrentPage(1); }}
              minDate={startDate}
              placeholder="Chọn ngày kết thúc"
            />
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Tìm theo mã hoặc tên nhân viên..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Export */}
          <button
            onClick={async () => {
              try {
                await attendanceService.exportToExcel({ search: searchText || undefined });
              } catch {
                alert('Không thể xuất file Excel');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={18} />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* ── DataTable ── */}
      <DataTable
        columns={currentTab === 'overtime' ? overtimeColumns : columns}
        data={activeData}
        isLoading={isLoading}
        total={total}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onFilterChange={handleFilterChange}
        emptyMessage={currentTab === 'overtime' ? 'Không có bản ghi tăng ca nào' : 'Không có dữ liệu điểm danh'}
        rowKey="id"
      />

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg shadow-xl w-full mx-4 ${editingId && editEntries.length > 0 ? 'max-w-2xl' : 'max-w-md'}`}>
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">
                {editingId ? 'Chỉnh sửa điểm danh' : 'Thêm điểm danh'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200 text-xl leading-none">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Employee code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã nhân viên</label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => handleEmployeeCodeChange(e.target.value)}
                  placeholder="Nhập mã nhân viên"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!!editingId}
                />
                {formData.employeeCode && !selectedEmployeeName && !editingId && (
                  <p className="mt-1 text-sm text-red-600">✗ Không tìm thấy nhân viên</p>
                )}
              </div>

              {/* Employee name (auto-filled) */}
              {selectedEmployeeName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên nhân viên</label>
                  <input
                    type="text"
                    value={selectedEmployeeName}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium"
                  />
                </div>
              )}

              {/* Date */}
              <div>
                <DatePicker
                  label="Ngày điểm danh"
                  value={formData.attendanceDate}
                  onChange={(date) => setFormData(prev => ({ ...prev, attendanceDate: date }))}
                  placeholder="Chọn ngày điểm danh"
                  required
                  disabled={!!editingId}
                />
              </div>

              {/* Edit mode: multiple entries */}
              {editingId && editEntries.length > 0 ? (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Các lần chấm công ({editEntries.length} lần)
                  </label>
                  <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                    {editEntries.map((entry, index) => (
                      <div key={entry.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                        <div className="mb-2">
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
                                updated[index] = { ...updated[index], status: e.target.value as EditEntry['status'] };
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
                <>
                  {/* Add mode: single entry */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giờ vào</label>
                      <input
                        type="time"
                        value={formData.checkInTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giờ ra</label>
                      <input
                        type="time"
                        value={formData.checkOutTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as AttendanceRecord['status'] }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Nhập ghi chú (nếu có)"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Modal actions */}
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

      {/* ── Work Shift Settings Modal ── */}
      <WorkShiftSettingsModal
        isOpen={showShiftSettings}
        onClose={() => setShowShiftSettings(false)}
      />
    </div>
  );
};

export default AttendanceManagement;
