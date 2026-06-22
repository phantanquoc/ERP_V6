import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Download, Settings, Table, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import attendanceService from '@services/attendanceService';
import { useEmployees, useAttendanceByDateRange, attendanceKeys } from '../hooks';
import { useDepartments } from '../hooks/useDepartments';
import { useQueryClient } from '@tanstack/react-query';
import DatePicker from './DatePicker';
import WorkShiftSettingsModal from './WorkShiftSettingsModal';
import TableFilter, { FilterField } from './TableFilter';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import Modal from './Modal';

interface AttendanceRecord {
  stt: number;
  id: string;
  ids: string[];
  employeeCode: string;
  employeeName: string;
  positionName: string;
  departmentId: string | null;
  departmentName: string | null;
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

type ViewMode = 'table' | 'calendar';

type CalendarModalData = {
  type: 'cell';
  employee: { name: string; code: string };
  day: Date;
  record: AttendanceRecord;
} | {
  type: 'row';
  employee: { name: string; code: string };
} | {
  type: 'column';
  day: Date;
} | null;

const STATUS_BADGE_STYLES: Record<string, string> = {
  PRESENT: 'bg-green-50 text-green-700 border border-green-200',
  LATE: 'bg-amber-50 text-amber-700 border border-amber-200',
  ABSENT: 'bg-red-50 text-red-700 border border-red-200',
  ON_LEAVE: 'bg-blue-50 text-blue-700 border border-blue-200',
  OVERTIME: 'bg-purple-50 text-purple-700 border border-purple-200',
};

const STATUS_DOT_STYLES: Record<string, string> = {
  PRESENT: 'bg-green-500',
  LATE: 'bg-amber-500',
  ABSENT: 'bg-red-500',
  ON_LEAVE: 'bg-blue-500',
  OVERTIME: 'bg-purple-500',
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Đúng giờ',
  LATE: 'Muộn',
  ABSENT: 'Vắng mặt',
  ON_LEAVE: 'Nghỉ phép',
  OVERTIME: 'Tăng ca',
};

const AttendanceManagement: React.FC = () => {
  const { user } = useAuth();
  // /api/employees requires ADMIN | DEPARTMENT_HEAD | TEAM_LEAD
  const canViewEmployees = user?.role === UserRole.ADMIN
    || user?.role === UserRole.DEPARTMENT_HEAD
    || user?.role === UserRole.TEAM_LEAD;

  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', status: '' });
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const startDate = useMemo(() => {
    const d = new Date(selectedMonth.year, selectedMonth.month, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }, [selectedMonth]);
  const endDate = useMemo(() => {
    const d = new Date(selectedMonth.year, selectedMonth.month + 1, 0);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [selectedMonth]);
  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev.year, prev.month - 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      const d = new Date(prev.year, prev.month + 1, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const monthLabel = useMemo(() => {
    const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    return `${months[selectedMonth.month]} / ${selectedMonth.year}`;
  }, [selectedMonth]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showModal, setShowModal] = useState(false);
  const [showShiftSettings, setShowShiftSettings] = useState(false);
  const [calendarModal, setCalendarModal] = useState<CalendarModalData>(null);
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
  const employees = (employeesData?.data || []).filter((emp) => emp.status === 'ACTIVE');
  const employeeSearchKeyword = employeeSearch.trim().toLowerCase();
  const filteredEmployees = employees
    .filter((employee) => {
      if (!employeeSearchKeyword) {
        return true;
      }

      const fullName = `${employee.user.lastName} ${employee.user.firstName}`.trim().toLowerCase();
      return fullName.includes(employeeSearchKeyword)
        || employee.employeeCode.toLowerCase().includes(employeeSearchKeyword);
    })
    .slice(0, 8);

  // Departments for filter
  const { data: departments = [] } = useDepartments();

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
    `${employee.user.lastName} ${employee.user.firstName}`.trim();

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

  const getStatusLabel = (status: string) => {
    return STATUS_LABELS[status] || status;
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

  const formatDateWithWeekday = (dateStr: string) => {
    const date = new Date(dateStr);
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const weekday = weekdays[date.getDay()];
    const formatted = date.toLocaleDateString('vi-VN');
    return `${weekday}, ${formatted}`;
  };

  const toLocalDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDateObj = (date: Date) => {
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const weekday = weekdays[date.getDay()];
    const dd = date.getDate().toString().padStart(2, '0');
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
  };

  const filteredAttendances = attendances.filter(item => {
    const matchesSearch =
      item.employeeCode.toLowerCase().includes(filterValues._search.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(filterValues._search.toLowerCase());
    const matchesStatus = !filterValues.status || item.status === filterValues.status;
    const matchesDepartment = !selectedDepartment || item.departmentId === selectedDepartment;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  // KPI counts computed from ALL filtered records (not just current page)
  const kpiCounts = useMemo(() => {
    const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, ON_LEAVE: 0, OVERTIME: 0 };
    filteredAttendances.forEach(item => {
      if (counts[item.status] !== undefined) {
        counts[item.status]++;
      }
    });
    const total = filteredAttendances.length;
    const attendanceRate = total > 0
      ? Math.round((counts.PRESENT + counts.LATE + counts.OVERTIME) / total * 100)
      : 0;
    return { ...counts, total, attendanceRate };
  }, [filteredAttendances]);

  // Calendar view data — show ALL employees, not just those with records
  const calendarData = useMemo(() => {
    if (viewMode !== 'calendar') return { employees: [], days: [], records: new Map() };

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const days: Date[] = [];
    for (let i = 0; i < diffDays; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    // Build record lookup from ALL attendance data (not department-filtered)
    // Calendar employees are already filtered by department, so records just need date+employee match
    const recordMap = new Map<string, AttendanceRecord>();
    attendances.forEach(record => {
      const dateKey = toLocalDateKey(new Date(record.attendanceDate));
      recordMap.set(`${record.employeeCode}_${dateKey}`, record);
    });

    // Build employee list from full employees list (all employees, not just those with records)
    let calendarEmployees: { name: string; code: string; departmentId: string | null }[];

    if (employees.length > 0) {
      calendarEmployees = employees
        .filter(emp => {
          if (selectedDepartment) {
            const deptViaSubDept = emp.subDepartment?.departmentId || null;
            const deptViaUser = emp.user?.departmentId || null;
            if (deptViaSubDept !== selectedDepartment && deptViaUser !== selectedDepartment) return false;
          }
          if (filterValues._search) {
            const fullName = `${emp.user?.lastName || ''} ${emp.user?.firstName || ''}`.trim().toLowerCase();
            return fullName.includes(filterValues._search.toLowerCase())
              || emp.employeeCode.toLowerCase().includes(filterValues._search.toLowerCase());
          }
          return true;
        })
        .map(emp => ({
          name: `${emp.user?.lastName || ''} ${emp.user?.firstName || ''}`.trim(),
          code: emp.employeeCode,
          departmentId: emp.subDepartment?.departmentId || emp.user?.departmentId || null,
        }));
    } else {
      // Fallback: use employees from attendance records if employee list unavailable
      const employeeMap = new Map<string, { name: string; code: string; departmentId: string | null }>();
      filteredAttendances.forEach(record => {
        if (!employeeMap.has(record.employeeCode)) {
          employeeMap.set(record.employeeCode, {
            name: record.employeeName,
            code: record.employeeCode,
            departmentId: record.departmentId,
          });
        }
      });
      calendarEmployees = Array.from(employeeMap.values());
    }

    return {
      employees: calendarEmployees,
      days,
      records: recordMap,
    };
  }, [attendances, startDate, endDate, viewMode, employees, selectedDepartment, filterValues._search]);

  const totalItems = filteredAttendances.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedAttendances = filteredAttendances.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-2xl font-bold text-gray-800">Bảng Điểm Danh Nhân Viên</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            onClick={() => setShowShiftSettings(true)}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 sm:w-auto"
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
            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors sm:w-auto"
          >
            <Download size={18} />
            Xuất Excel
          </button>
          <button
            onClick={handleAddNew}
            className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600">Đúng giờ</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{kpiCounts.PRESENT}</p>
        </div>
        <div className="bg-white rounded-lg border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <span className="text-sm text-gray-600">Muộn</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{kpiCounts.LATE}</p>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-600">Vắng mặt</span>
          </div>
          <p className="text-2xl font-bold text-red-700">{kpiCounts.ABSENT}</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600">Nghỉ phép</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{kpiCounts.ON_LEAVE}</p>
        </div>
        <div className="bg-white rounded-lg border border-indigo-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
            <span className="text-sm text-gray-600">Tỷ lệ chuyên cần</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700">{kpiCounts.attendanceRate}%</p>
        </div>
      </div>

      {/* Month Selector + Department + Search */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="px-4 py-2 border border-gray-300 rounded-lg bg-white min-w-[160px] text-center font-medium text-gray-800 text-sm">
            {monthLabel}
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
          <select
            value={selectedDepartment}
            onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
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

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            viewMode === 'table'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Table className="w-4 h-4" />
          Bảng
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
            viewMode === 'calendar'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Lịch
        </button>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
            ) : filteredAttendances.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Không có dữ liệu điểm danh</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Nhân viên</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ngày</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Giờ vào</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Giờ ra</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Số giờ</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Ghi chú</th>
                      <th className="px-3 py-3 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
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
                        <td className="px-3 py-3 sm:px-6 sm:py-4 border-r border-gray-200">
                          <div className="text-sm font-medium text-gray-900">{record.employeeName}</div>
                          <div className="text-xs text-gray-500">{record.employeeCode} &middot; {record.positionName}</div>
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200">
                          {formatDateWithWeekday(record.attendanceDate)}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200">
                          {formatTimes(record.checkInTimes)}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200">
                          {formatTimes(record.checkOutTimes)}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200">
                          {record.workHours.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-center border-r border-gray-200">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[record.status] || ''}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[record.status] || ''}`}></span>
                            {getStatusLabel(record.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-700 border-r border-gray-200">
                          {record.notes || '-'}
                        </td>
                        <td className="px-3 py-3 sm:px-6 sm:py-4">
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
        </>
      )}

      {/* Calendar/Muster View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : calendarData.employees.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Không có dữ liệu điểm danh</div>
          ) : (
            <>
              {/* Legend */}
              <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-green-100 text-green-700 font-medium">Đ</span> Đúng giờ</span>
                <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-amber-100 text-amber-700 font-medium">M</span> Muộn</span>
                <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-red-100 text-red-700 font-medium">V</span> Vắng</span>
                <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-blue-100 text-blue-700 font-medium">N</span> Nghỉ phép</span>
                <span className="inline-flex items-center gap-1"><span className="w-5 h-5 rounded flex items-center justify-center bg-purple-100 text-purple-700 font-medium">T</span> Tăng ca</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold text-gray-900 border-r border-gray-200 min-w-[150px]">Nhân viên</th>
                      {calendarData.days.map((day) => {
                        const dayNum = day.getDate();
                        const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                        return (
                          <th
                            key={day.toISOString()}
                            className="px-1 py-2 text-center font-medium text-gray-700 border-r border-gray-200 min-w-[32px] cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => setCalendarModal({ type: 'column', day })}
                          >
                            <div>{weekdays[day.getDay()]}</div>
                            <div>{dayNum}</div>
                          </th>
                        );
                      })}
                      <th className="px-3 py-2 text-center font-semibold text-gray-900 min-w-[60px]">Tổng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendarData.employees.map((emp) => {
                      let presentDays = 0;
                      const totalDays = calendarData.days.length;
                      return (
                        <tr key={emp.code} className="border-b border-gray-100 hover:bg-gray-50">
                          <td
                            className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-900 border-r border-gray-200 whitespace-nowrap cursor-pointer hover:text-blue-600 hover:underline"
                            onClick={() => setCalendarModal({ type: 'row', employee: emp })}
                          >
                            {emp.name}
                          </td>
                          {calendarData.days.map((day) => {
                            const dateKey = toLocalDateKey(day);
                            const record = calendarData.records.get(`${emp.code}_${dateKey}`);
                            let letter = '';
                            let cellClass = '';
                            if (record) {
                              switch (record.status) {
                                case 'PRESENT':
                                  letter = 'Đ'; cellClass = 'bg-green-100 text-green-700'; presentDays++; break;
                                case 'LATE':
                                  letter = 'M'; cellClass = 'bg-amber-100 text-amber-700'; presentDays++; break;
                                case 'ABSENT':
                                  letter = 'V'; cellClass = 'bg-red-100 text-red-700'; break;
                                case 'ON_LEAVE':
                                  letter = 'N'; cellClass = 'bg-blue-100 text-blue-700'; break;
                                case 'OVERTIME':
                                  letter = 'T'; cellClass = 'bg-purple-100 text-purple-700'; presentDays++; break;
                              }
                            }
                            return (
                              <td
                                key={day.toISOString()}
                                className={`px-1 py-1 text-center border-r border-gray-100 cursor-pointer ${record ? 'hover:bg-gray-100' : 'hover:bg-gray-50'}`}
                                onClick={() => {
                                  if (record) {
                                    setCalendarModal({ type: 'cell', employee: emp, day, record });
                                  } else {
                                    setEditingId(null);
                                    setEditEntries([]);
                                    setSelectedEmployeeName(emp.name);
                                    setEmployeeSearch(emp.name);
                                    setIsEmployeeDropdownOpen(false);
                                    setFormData({
                                      employeeCode: emp.code,
                                      attendanceDate: toLocalDateKey(day),
                                      checkInTime: '',
                                      checkOutTime: '',
                                      status: 'PRESENT',
                                      notes: '',
                                    });
                                    setShowModal(true);
                                  }
                                }}
                              >
                                {letter && (
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${cellClass}`}>
                                    {letter}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-medium text-gray-900">
                            {presentDays}/{totalDays}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} showBackdrop>
        <div className={`bg-white rounded-lg shadow-xl w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)] ${editingId && editEntries.length > 0 ? 'max-w-2xl' : 'max-w-md'}`} onClick={(e) => e.stopPropagation()}>
          <div className="bg-blue-600 px-3 py-3 sm:px-6 sm:py-4 flex justify-between items-center shrink-0">
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

          <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
        </Modal>
      <WorkShiftSettingsModal
        isOpen={showShiftSettings}
        onClose={() => setShowShiftSettings(false)}
      />

      {/* Calendar Cell Detail Modal */}
      {calendarModal?.type === 'cell' && (
        <Modal isOpen onClose={() => setCalendarModal(null)} showBackdrop closeOnBackdrop>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 px-3 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">
                {calendarModal.employee.name} &mdash; {formatDateObj(calendarModal.day)}
              </h3>
              <button onClick={() => setCalendarModal(null)} className="text-white hover:text-gray-200">&#10005;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[calendarModal.record.status] || ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[calendarModal.record.status] || ''}`}></span>
                  {STATUS_LABELS[calendarModal.record.status]}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Giờ vào:</span>
                <span className="ml-2 text-sm text-gray-900">{formatTimes(calendarModal.record.checkInTimes)}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Giờ ra:</span>
                <span className="ml-2 text-sm text-gray-900">{formatTimes(calendarModal.record.checkOutTimes)}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Tổng giờ làm:</span>
                <span className="ml-2 text-sm text-gray-900">{calendarModal.record.workHours.toFixed(2)} giờ</span>
              </div>
              {calendarModal.record.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Ghi chú:</span>
                  <span className="ml-2 text-sm text-gray-900">{calendarModal.record.notes}</span>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Calendar Row Summary Modal */}
      {calendarModal?.type === 'row' && (() => {
        const emp = calendarModal.employee;
        const empRecords = calendarData.days
          .map((day) => {
            const dateKey = toLocalDateKey(day);
            return { day, record: calendarData.records.get(`${emp.code}_${dateKey}`) || null };
          })
          .filter((item): item is { day: Date; record: AttendanceRecord } => item.record !== null);
        const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, ON_LEAVE: 0, OVERTIME: 0 };
        empRecords.forEach(({ record }) => {
          if (counts[record.status] !== undefined) counts[record.status]++;
        });
        return (
          <Modal isOpen onClose={() => setCalendarModal(null)} showBackdrop closeOnBackdrop>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
              <div className="bg-blue-600 px-3 py-3 sm:px-6 sm:py-4 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-white">
                  Tổng hợp &mdash; {emp.name} &mdash; {monthLabel}
                </h3>
                <button onClick={() => setCalendarModal(null)} className="text-white hover:text-gray-200">&#10005;</button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Đúng giờ: {counts.PRESENT}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Muộn: {counts.LATE}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">Vắng: {counts.ABSENT}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Nghỉ phép: {counts.ON_LEAVE}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">Tăng ca: {counts.OVERTIME}</span>
                </div>
                {empRecords.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">Không có dữ liệu điểm danh</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Ngày</th>
                          <th className="px-3 py-2 text-center font-semibold text-gray-700">Trạng thái</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Giờ vào</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Giờ ra</th>
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Số giờ</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-700">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empRecords.map(({ day, record }) => (
                          <tr key={day.toISOString()} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{formatDateObj(day)}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[record.status] || ''}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[record.status] || ''}`}></span>
                                {STATUS_LABELS[record.status]}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-900">{formatTimes(record.checkInTimes)}</td>
                            <td className="px-3 py-2 text-gray-900">{formatTimes(record.checkOutTimes)}</td>
                            <td className="px-3 py-2 text-right text-gray-900">{record.workHours.toFixed(2)}</td>
                            <td className="px-3 py-2 text-gray-700">{record.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Calendar Column Summary Modal */}
      {calendarModal?.type === 'column' && (() => {
        const day = calendarModal.day;
        const dateKey = toLocalDateKey(day);
        const dayEmployees = calendarData.employees
          .map((emp) => ({
            emp,
            record: calendarData.records.get(`${emp.code}_${dateKey}`) || null,
          }))
          .sort((a, b) => a.emp.name.localeCompare(b.emp.name, 'vi'));
        const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, ON_LEAVE: 0, OVERTIME: 0 };
        dayEmployees.forEach(({ record }) => {
          if (record && counts[record.status] !== undefined) counts[record.status]++;
        });
        return (
          <Modal isOpen onClose={() => setCalendarModal(null)} showBackdrop closeOnBackdrop>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
              <div className="bg-blue-600 px-3 py-3 sm:px-6 sm:py-4 flex justify-between items-center shrink-0">
                <h3 className="text-lg font-bold text-white">
                  {formatDateObj(day)} &mdash; Danh sách điểm danh
                </h3>
                <button onClick={() => setCalendarModal(null)} className="text-white hover:text-gray-200">&#10005;</button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">Đúng giờ: {counts.PRESENT}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Muộn: {counts.LATE}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">Vắng: {counts.ABSENT}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Nghỉ phép: {counts.ON_LEAVE}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">Tăng ca: {counts.OVERTIME}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Nhân viên</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Giờ vào</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Giờ ra</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Số giờ</th>
                        <th className="px-3 py-2 text-center font-semibold text-gray-700">Trạng thái</th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEmployees.map(({ emp, record }) => (
                        <tr key={emp.code} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900 font-medium whitespace-nowrap">{emp.name}</td>
                          <td className="px-3 py-2 text-gray-900">{record ? formatTimes(record.checkInTimes) : '—'}</td>
                          <td className="px-3 py-2 text-gray-900">{record ? formatTimes(record.checkOutTimes) : '—'}</td>
                          <td className="px-3 py-2 text-right text-gray-900">{record ? record.workHours.toFixed(2) : '—'}</td>
                          <td className="px-3 py-2 text-center">
                            {record ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[record.status] || ''}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[record.status] || ''}`}></span>
                                {STATUS_LABELS[record.status]}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Chưa ghi nhận</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-700">{record ? (record.notes || '-') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};

export default AttendanceManagement;
