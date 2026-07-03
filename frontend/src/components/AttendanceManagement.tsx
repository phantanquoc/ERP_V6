import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Download, Settings, Table, Calendar, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import attendanceService from '@services/attendanceService';
import { useEmployees, useAttendanceByDateRange, attendanceKeys } from '../hooks';
import { useDepartments } from '../hooks/useDepartments';
import { usePositions } from '../hooks/usePositions';
import { useWorkShifts } from '../hooks/useWorkShifts';
import { useQueryClient } from '@tanstack/react-query';
import { toAppTzIso, formatTimeInAppTz, formatDateInAppTz, todayInAppTz, APP_TZ } from '../utils/dateUtils';
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
  regularIds?: string[];
  overtimeIds?: string[];
  employeeCode: string;
  employeeName: string;
  positionId: string | null;
  positionName: string;
  departmentId: string | null;
  departmentName: string | null;
  attendanceDate: string;
  checkInTimes: string[];
  checkOutTimes: string[];
  workHours: number;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'OVERTIME';
  notes: string | null;
  // Split fields — new from backend
  regularStatus?: 'PRESENT' | 'LATE' | 'ABSENT' | 'ON_LEAVE' | 'OVERTIME' | null;
  regularHours?: number;
  regularCheckInTimes?: string[];
  regularCheckOutTimes?: string[];
  overtimeHours?: number;
  overtimeCheckInTimes?: string[];
  overtimeCheckOutTimes?: string[];
  hasOvertime?: boolean;
  overtimeNotes?: string | null;
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
  const [selectedPosition, setSelectedPosition] = useState('');
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
    const today = todayInAppTz();
    const [y, m] = today.split('-').map(Number);
    return { year: y, month: m - 1 };
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
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);
  const [calendarModal, setCalendarModal] = useState<CalendarModalData>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEntries, setEditEntries] = useState<EditEntry[]>([]);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    employeeCode: '',
    attendanceDate: todayInAppTz(),
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

  // Positions for filter
  const { data: positionsList = [] } = usePositions();

  // Work shifts for quick-fill in edit modal
  const { data: workShifts = [] } = useWorkShifts();

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

    // Convert UTC time to APP_TZ HH:mm string for time input
    const getLocalTimeString = (dateTimeString: string | null | undefined) => {
      if (!dateTimeString) return '';
      return formatTimeInAppTz(dateTimeString);
    };

    // Build entries by mapping regular IDs to regular times, overtime IDs to overtime times
    const regularIds = record.regularIds || [];
    const overtimeIds = record.overtimeIds || [];
    const regularCheckIns = record.regularCheckInTimes || [];
    const regularCheckOuts = record.regularCheckOutTimes || [];
    const overtimeCheckIns = record.overtimeCheckInTimes || [];
    const overtimeCheckOuts = record.overtimeCheckOutTimes || [];
    const regularNotesParts = record.notes ? record.notes.split('; ') : [];
    const overtimeNotesParts = record.overtimeNotes ? record.overtimeNotes.split('; ') : [];

    const entries: EditEntry[] = [
      ...regularIds.map((id, index) => ({
        id,
        checkInTime: getLocalTimeString(regularCheckIns[index] ?? null),
        checkOutTime: getLocalTimeString(regularCheckOuts[index] ?? null),
        status: (record.regularStatus || 'PRESENT') as EditEntry['status'],
        notes: regularNotesParts[index] || '',
      })),
      ...overtimeIds.map((id, index) => ({
        id,
        checkInTime: getLocalTimeString(overtimeCheckIns[index] ?? null),
        checkOutTime: getLocalTimeString(overtimeCheckOuts[index] ?? null),
        status: 'OVERTIME' as EditEntry['status'],
        notes: overtimeNotesParts[index] || '',
      })),
    ];

    // Fallback: if no split IDs available, use old flat mapping
    if (entries.length === 0 && record.ids.length > 0) {
      record.ids.forEach((id, index) => {
        entries.push({
          id,
          checkInTime: getLocalTimeString(record.checkInTimes[index] ?? null),
          checkOutTime: getLocalTimeString(record.checkOutTimes[index] ?? null),
          status: record.status,
          notes: '',
        });
      });
      if (record.notes) {
        const notesParts = record.notes.split('; ');
        entries.forEach((entry, index) => {
          entry.notes = notesParts[index] || '';
        });
      }
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

  // Nếu checkOut < checkIn (theo "HH:mm") → coi như ca đêm, checkOut rơi vào ngày kế tiếp.
  const resolveCheckOutDate = (baseDate: string, checkIn: string, checkOut: string): string => {
    if (!checkIn || !checkOut) return baseDate;
    if (checkOut >= checkIn) return baseDate;
    const [y, m, d] = baseDate.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
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
          const outDate = resolveCheckOutDate(formData.attendanceDate, entry.checkInTime, entry.checkOutTime);
          const updateData = {
            checkInTime: entry.checkInTime ? toAppTzIso(formData.attendanceDate, entry.checkInTime) : undefined,
            checkOutTime: entry.checkOutTime ? toAppTzIso(outDate, entry.checkOutTime) : undefined,
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

        const outDate = resolveCheckOutDate(formData.attendanceDate, formData.checkInTime, formData.checkOutTime);
        const createData = {
          employeeId: selectedEmployee.id,
          attendanceDate: formData.attendanceDate,
          checkInTime: formData.checkInTime ? toAppTzIso(formData.attendanceDate, formData.checkInTime) : undefined,
          checkOutTime: formData.checkOutTime ? toAppTzIso(outDate, formData.checkOutTime) : undefined,
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
        timeZone: APP_TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }).join(', ');
  };

  // Format từng mốc giờ kèm ngày ngắn "HH:mm (Tx, dd/MM)".
  const formatTimesWithDate = (times: string[]) => {
    if (!times || times.length === 0) return '-';
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return times.map(t => {
      const date = new Date(t);
      const hhmm = date.toLocaleTimeString('vi-VN', {
        timeZone: APP_TZ, hour: '2-digit', minute: '2-digit', hour12: false,
      });
      // Weekday + dd/MM theo APP_TZ (không dùng getDay/getDate = browser TZ)
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: APP_TZ, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(date);
      const weekdayShort = parts.find(p => p.type === 'weekday')?.value || '';
      // Map en-CA short weekday (Sun/Mon/...) → CN/T2...
      const enToVn: Record<string, string> = {
        Sun: 'CN', Mon: 'T2', Tue: 'T3', Wed: 'T4', Thu: 'T5', Fri: 'T6', Sat: 'T7',
      };
      const wd = enToVn[weekdayShort] ?? weekdays[date.getDay()];
      const dd = parts.find(p => p.type === 'day')?.value || '01';
      const mm = parts.find(p => p.type === 'month')?.value || '01';
      return `${hhmm} (${wd}, ${dd}/${mm})`;
    }).join(', ');
  };

  // Kiểm tra ca chấm công có vắt qua đêm không (checkOut > checkIn theo APP_TZ date).
  const isCrossMidnight = (checkIns?: string[], checkOuts?: string[]): boolean => {
    if (!checkIns?.length || !checkOuts?.length) return false;
    return formatDateInAppTz(checkIns[0]) !== formatDateInAppTz(checkOuts[checkOuts.length - 1]);
  };

  // "Quên chấm ra": có giờ vào, KHÔNG có giờ ra, và ngày đã qua (< hôm nay).
  // Kết hợp với marker note "⚠ Quên chấm ra" từ backend (khi verifyAndRecord auto-detect).
  const isIncomplete = (record: {
    attendanceDate?: string;
    regularCheckInTimes?: string[];
    regularCheckOutTimes?: string[];
    checkInTimes?: string[];
    checkOutTimes?: string[];
    notes?: string | null;
  }): boolean => {
    if (record.notes?.includes('⚠ Quên chấm ra')) return true;
    const ins = record.regularCheckInTimes ?? record.checkInTimes ?? [];
    const outs = record.regularCheckOutTimes ?? record.checkOutTimes ?? [];
    if (ins.length === 0 || outs.length > 0) return false;
    if (!record.attendanceDate) return false;
    const dateKey = formatDateInAppTz(record.attendanceDate);
    const todayKey = todayInAppTz();
    return dateKey < todayKey;
  };

  const formatDateWithWeekday = (dateStr: string) => {
    const date = new Date(dateStr);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TZ,
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(date);
    const wdEn = parts.find(p => p.type === 'weekday')?.value || 'Sun';
    const wdIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wdEn);
    const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const weekday = weekdays[wdIdx >= 0 ? wdIdx : 0];
    const dd = parts.find(p => p.type === 'day')?.value || '01';
    const mm = parts.find(p => p.type === 'month')?.value || '01';
    const yyyy = parts.find(p => p.type === 'year')?.value || '1970';
    return `${weekday}, ${dd}/${mm}/${yyyy}`;
  };

  const toLocalDateKey = (date: Date) => {
    return formatDateInAppTz(date);
  };

  const formatDateObj = (date: Date) => {
    return formatDateWithWeekday(date.toISOString());
  };

  const excludedEmployeeCodes = useMemo(() => {
    return new Set(
      employees
        .filter(emp => emp.user?.role === 'ADMIN' || emp.status !== 'ACTIVE')
        .map(emp => emp.employeeCode)
    );
  }, [employees]);

  const filteredAttendances = attendances.filter(item => {
    if (excludedEmployeeCodes.has(item.employeeCode)) return false;
    const matchesSearch =
      item.employeeCode.toLowerCase().includes(filterValues._search.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(filterValues._search.toLowerCase());
    const matchesStatus = !filterValues.status || item.status === filterValues.status;
    const matchesDepartment = !selectedDepartment || item.departmentId === selectedDepartment;
    const matchesPosition = !selectedPosition || item.positionId === selectedPosition;
    return matchesSearch && matchesStatus && matchesDepartment && matchesPosition;
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

    const [sy, sm, sd] = startDate.split('-').map(Number);
    const [ey, em, ed] = endDate.split('-').map(Number);
    const startMs = Date.UTC(sy, sm - 1, sd);
    const endMs = Date.UTC(ey, em - 1, ed);
    const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

    const days: Date[] = [];
    for (let i = 0; i < diffDays; i++) {
      days.push(new Date(startMs + i * 24 * 60 * 60 * 1000));
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
        .filter(emp => emp.user?.role !== 'ADMIN' && emp.status === 'ACTIVE')
        .filter(emp => {
          if (selectedDepartment) {
            const deptViaSubDept = emp.subDepartment?.departmentId || null;
            const deptViaUser = emp.user?.departmentId || null;
            if (deptViaSubDept !== selectedDepartment && deptViaUser !== selectedDepartment) return false;
          }
          if (selectedPosition && emp.positionId !== selectedPosition) return false;
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
  }, [attendances, startDate, endDate, viewMode, employees, selectedDepartment, selectedPosition, filterValues._search]);

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
          <div ref={exportMenuRef} className="relative w-full sm:w-auto">
            <button
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors sm:w-auto"
            >
              <Download size={18} />
              Xuất Excel
              <ChevronDown size={16} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isExportMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  onClick={async () => {
                    setIsExportMenuOpen(false);
                    try {
                      await attendanceService.exportToExcel({ search: filterValues._search || undefined });
                    } catch (err) {
                      console.error('Error exporting to Excel:', err);
                      alert('Không thể xuất file Excel');
                    }
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                >
                  <Table className="w-4 h-4 text-gray-500" />
                  Dạng bảng
                </button>
                <button
                  onClick={async () => {
                    setIsExportMenuOpen(false);
                    try {
                      await attendanceService.exportToExcelCalendar({
                        startDate,
                        endDate,
                        search: filterValues._search || undefined,
                        departmentId: selectedDepartment || undefined,
                        positionId: selectedPosition || undefined,
                      });
                    } catch (err) {
                      console.error('Error exporting calendar Excel:', err);
                      alert('Không thể xuất file Excel');
                    }
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg border-t border-gray-100"
                >
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Dạng lịch
                </button>
              </div>
            )}
          </div>
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
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
          <select
            value={selectedPosition}
            onChange={(e) => { setSelectedPosition(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Tất cả chức vụ</option>
            {positionsList.map((pos) => (
              <option key={pos.id} value={pos.id}>{pos.name}</option>
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
                    {paginatedAttendances.map((record, index) => {
                      const rowIns = record.regularStatus ? (record.regularCheckInTimes ?? record.checkInTimes) : (record.overtimeCheckInTimes ?? []);
                      const rowOuts = record.regularStatus ? (record.regularCheckOutTimes ?? record.checkOutTimes) : (record.overtimeCheckOutTimes ?? []);
                      const rowCrossMidnight = isCrossMidnight(rowIns, rowOuts);
                      const rowIncomplete = record.regularStatus ? isIncomplete({
                        attendanceDate: record.attendanceDate,
                        regularCheckInTimes: record.regularCheckInTimes,
                        regularCheckOutTimes: record.regularCheckOutTimes,
                        checkInTimes: record.checkInTimes,
                        checkOutTimes: record.checkOutTimes,
                        notes: record.notes,
                      }) : false;
                      const outTooltip = rowIncomplete
                        ? 'Quên chấm ra — ca này đã bị đánh dấu, giờ làm tính 0'
                        : rowCrossMidnight && rowOuts.length ? (() => {
                        const lastIso = rowOuts[rowOuts.length - 1];
                        const last = new Date(lastIso);
                        const wds = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                        const parts = new Intl.DateTimeFormat('en-CA', {
                          timeZone: APP_TZ,
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                        }).formatToParts(last);
                        const wdEn = parts.find(p => p.type === 'weekday')?.value || 'Sun';
                        const wdIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wdEn);
                        const wd = wds[wdIdx >= 0 ? wdIdx : 0];
                        const dd = parts.find(p => p.type === 'day')?.value || '01';
                        const mm = parts.find(p => p.type === 'month')?.value || '01';
                        const hhmm = formatTimeInAppTz(lastIso);
                        return `Ra ngày kế: ${wd}, ${dd}/${mm} ${hhmm} (Ca đêm)`;
                      })() : undefined;
                      return (
                      <React.Fragment key={record.id}>
                        <tr
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
                            {formatTimes(rowIns)}
                          </td>
                          <td
                            className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200"
                            title={outTooltip}
                          >
                            <span className="inline-flex items-center gap-1">
                              {rowIncomplete ? <span className="text-red-600 font-medium">—</span> : formatTimes(rowOuts)}
                              {rowIncomplete && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-50 text-red-700 border border-red-200 cursor-help"
                                  aria-label="Quên chấm ra"
                                >
                                  ⚠ Quên ra
                                </span>
                              )}
                              {!rowIncomplete && rowCrossMidnight && (
                                <span
                                  className="inline-flex items-center px-1 py-0.5 text-[10px] font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-help"
                                  aria-label="Ca đêm — ra ngày kế"
                                >
                                  ⁺¹
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200">
                            {(record.regularStatus ? (record.regularHours ?? record.workHours) : (record.overtimeHours ?? record.workHours)).toFixed(2)}
                          </td>
                          <td className="px-3 py-3 sm:px-6 sm:py-4 text-center border-r border-gray-200">
                            {record.regularStatus ? (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[record.regularStatus] || ''}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[record.regularStatus] || ''}`}></span>
                                {getStatusLabel(record.regularStatus)}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[record.status] || ''}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[record.status] || ''}`}></span>
                                {getStatusLabel(record.status)}
                              </span>
                            )}
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
                        {record.hasOvertime && record.regularStatus && (
                          <tr className={`border-b border-gray-200 bg-purple-50/40`}>
                            <td className="px-3 py-2 sm:px-6 border-r border-gray-200 pl-8">
                              <div className="text-xs italic text-purple-700">Tăng ca</div>
                            </td>
                            <td className="px-3 py-2 sm:px-6 text-xs text-gray-500 italic border-r border-gray-200">
                              {formatDateWithWeekday(record.attendanceDate)}
                            </td>
                            <td className="px-3 py-2 sm:px-6 text-xs text-gray-700 italic border-r border-gray-200">
                              {formatTimes(record.overtimeCheckInTimes ?? [])}
                            </td>
                            <td className="px-3 py-2 sm:px-6 text-xs text-gray-700 italic border-r border-gray-200">
                              {formatTimes(record.overtimeCheckOutTimes ?? [])}
                            </td>
                            <td className="px-3 py-2 sm:px-6 text-xs text-gray-700 italic border-r border-gray-200">
                              {(record.overtimeHours ?? 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 sm:px-6 text-center border-r border-gray-200">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                Tăng ca
                              </span>
                            </td>
                            <td className="px-3 py-2 sm:px-6 text-xs text-gray-500 italic border-r border-gray-200">
                              {record.overtimeNotes || '-'}
                            </td>
                            <td className="px-3 py-2 sm:px-6"></td>
                          </tr>
                        )}
                      </React.Fragment>
                      );
                    })}
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
                        const dayNum = day.getUTCDate();
                        const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                        return (
                          <th
                            key={day.toISOString()}
                            className="px-1 py-2 text-center font-medium text-gray-700 border-r border-gray-200 min-w-[32px] cursor-pointer hover:bg-blue-50 transition-colors"
                            onClick={() => setCalendarModal({ type: 'column', day })}
                          >
                            <div>{weekdays[day.getUTCDay()]}</div>
                            <div>{dayNum}</div>
                          </th>
                        );
                      })}
                      <th className="px-3 py-2 text-center font-semibold text-gray-900 min-w-[60px]">Tổng</th>
                      <th className="px-3 py-2 text-center font-semibold text-gray-900 min-w-[80px]">Tổng OT (h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calendarData.employees.map((emp) => {
                      let presentDays = 0;
                      let totalOvertimeHours = 0;
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

                            if (record?.overtimeHours) {
                              totalOvertimeHours += record.overtimeHours;
                            }

                            // Determine what to render for this cell
                            const isSplit = !!(record?.hasOvertime && record?.regularStatus);
                            const cellCrossMidnight = !!(record && isCrossMidnight(
                              record.regularCheckInTimes ?? record.checkInTimes,
                              record.regularCheckOutTimes ?? record.checkOutTimes,
                            ));
                            const cellIncomplete = !!(record && record.regularStatus && isIncomplete({
                              attendanceDate: record.attendanceDate,
                              regularCheckInTimes: record.regularCheckInTimes,
                              regularCheckOutTimes: record.regularCheckOutTimes,
                              checkInTimes: record.checkInTimes,
                              checkOutTimes: record.checkOutTimes,
                              notes: record.notes,
                            }));
                            let letter = '';
                            let cellClass = '';
                            let regularColor = '';
                            let regularTextColor = '';
                            const overtimeColor = '#f3e8ff'; // purple-100

                            if (record) {
                              const effectiveStatus = record.regularStatus ?? record.status;
                              switch (effectiveStatus) {
                                case 'PRESENT':
                                  letter = 'Đ'; cellClass = 'bg-green-100 text-green-700'; regularColor = '#dcfce7'; regularTextColor = '#15803d'; presentDays++; break;
                                case 'LATE':
                                  letter = 'M'; cellClass = 'bg-amber-100 text-amber-700'; regularColor = '#fef3c7'; regularTextColor = '#b45309'; presentDays++; break;
                                case 'ABSENT':
                                  letter = 'V'; cellClass = 'bg-red-100 text-red-700'; regularColor = '#fee2e2'; regularTextColor = '#b91c1c'; break;
                                case 'ON_LEAVE':
                                  letter = 'N'; cellClass = 'bg-blue-100 text-blue-700'; regularColor = '#dbeafe'; regularTextColor = '#1d4ed8'; break;
                                case 'OVERTIME':
                                  letter = 'T'; cellClass = 'bg-purple-100 text-purple-700'; regularColor = '#f3e8ff'; regularTextColor = '#7e22ce'; presentDays++; break;
                              }
                            }
                            // Tooltip: prioritise "quên chấm ra" over cross-midnight if both apply.
                            const cellTitle = (() => {
                              if (cellIncomplete) return 'Quên chấm ra — ca này đã bị đánh dấu, giờ làm tính 0';
                              if (!record || !cellCrossMidnight) return undefined;
                              const ins = record.regularCheckInTimes ?? record.checkInTimes;
                              const outs = record.regularCheckOutTimes ?? record.checkOutTimes;
                              if (!ins?.length || !outs?.length) return 'Ca đêm (vắt qua ngày kế)';
                              return `CA 3 · ${formatTimeInAppTz(ins[0])} → ${formatTimeInAppTz(outs[outs.length - 1])}⁺¹`;
                            })();
                            return (
                              <td
                                key={day.toISOString()}
                                className={`px-1 py-1 text-center border-r border-gray-100 cursor-pointer ${record ? 'hover:bg-gray-100' : 'hover:bg-gray-50'}`}
                                title={cellTitle}
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
                                {record && isSplit ? (
                                  // Split diagonal: top-left = regular color, bottom-right = overtime purple
                                  <span
                                    className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-medium relative overflow-hidden border border-gray-300"
                                    style={{ background: `linear-gradient(to bottom right, ${regularColor} 50%, ${overtimeColor} 50%)` }}
                                  >
                                    <span className="absolute top-0 left-0.5 text-[9px] font-bold leading-none" style={{ color: regularTextColor }}>{letter}</span>
                                    <span className="absolute bottom-0 right-0.5 text-[9px] font-bold leading-none text-purple-700">T</span>
                                    {cellIncomplete ? (
                                      <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold text-white bg-red-600 rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none" aria-label="Quên chấm ra">!</span>
                                    ) : cellCrossMidnight && (
                                      <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-indigo-700 bg-white/80 rounded-full px-0.5 leading-none" aria-label="Ca đêm vắt sang ngày kế">⁺¹</span>
                                    )}
                                  </span>
                                ) : letter ? (
                                  <span className={`relative inline-flex items-center justify-center w-6 h-6 rounded text-xs font-medium ${cellClass}`}>
                                    {letter}
                                    {cellIncomplete ? (
                                      <span className="absolute -top-1 -right-1 text-[9px] font-bold text-white bg-red-600 rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none border border-white" aria-label="Quên chấm ra">!</span>
                                    ) : cellCrossMidnight && (
                                      <span className="absolute -top-1 -right-1 text-[8px] font-bold text-indigo-700 bg-white rounded-full px-0.5 leading-none border border-indigo-200" aria-label="Ca đêm vắt sang ngày kế">⁺¹</span>
                                    )}
                                  </span>
                                ) : null}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-center font-medium text-gray-900">
                            {presentDays}/{totalDays}
                          </td>
                          <td className="px-3 py-2 text-center font-medium text-purple-700">
                            {totalOvertimeHours > 0 ? (Math.round(totalOvertimeHours * 100) / 100).toString() : '—'}
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
                      <div key={entry.id} className={`border rounded-lg p-3 ${entry.status === 'OVERTIME' ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${entry.status === 'OVERTIME' ? 'text-purple-600' : 'text-blue-600'}`}>
                            {entry.status === 'OVERTIME' ? `Tăng ca ${index + 1}` : `Ca ${index + 1}`}
                          </span>
                          {workShifts.length > 0 && entry.status !== 'OVERTIME' && (
                            <select
                              value=""
                              onChange={(e) => {
                                const shift = workShifts.find(s => s.id === e.target.value);
                                if (!shift) return;
                                const updated = [...editEntries];
                                updated[index] = {
                                  ...updated[index],
                                  checkInTime: shift.startTime,
                                  checkOutTime: shift.endTime,
                                };
                                setEditEntries(updated);
                              }}
                              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              title="Chọn ca để tự điền giờ vào/ra"
                            >
                              <option value="">Chọn ca…</option>
                              {workShifts.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.startTime}-{s.endTime})
                                </option>
                              ))}
                            </select>
                          )}
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
                  {workShifts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chọn ca <span className="text-xs text-gray-400 font-normal">(tự động điền giờ vào/ra)</span>
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          const shift = workShifts.find(s => s.id === e.target.value);
                          if (!shift) return;
                          setFormData({
                            ...formData,
                            checkInTime: shift.startTime,
                            checkOutTime: shift.endTime,
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">— Chọn ca để tự điền —</option>
                        {workShifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.startTime} - {s.endTime})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

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
              {/* Section 1: Regular shift */}
              {calendarModal.record.regularStatus && (() => {
                const ins = calendarModal.record.regularCheckInTimes ?? calendarModal.record.checkInTimes;
                const outs = calendarModal.record.regularCheckOutTimes ?? calendarModal.record.checkOutTimes;
                const crossMidnight = isCrossMidnight(ins, outs);
                const incomplete = isIncomplete({
                  attendanceDate: calendarModal.record.attendanceDate,
                  regularCheckInTimes: calendarModal.record.regularCheckInTimes,
                  regularCheckOutTimes: calendarModal.record.regularCheckOutTimes,
                  checkInTimes: calendarModal.record.checkInTimes,
                  checkOutTimes: calendarModal.record.checkOutTimes,
                  notes: calendarModal.record.notes,
                });
                return (
                <div className="space-y-3">
                  {calendarModal.record.hasOvertime && (
                    <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">Ca bình thường</h4>
                  )}
                  {incomplete && (
                    <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
                      <span aria-hidden className="mt-0.5">⚠</span>
                      <div>
                        <div className="font-semibold">Quên chấm ra</div>
                        <div className="text-xs mt-0.5">Nhân viên đã chấm vào nhưng không chấm ra trong ngày này. Số giờ làm tự động tính 0. Vào &quot;Chỉnh sửa&quot; để cập nhật giờ ra thực tế.</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[calendarModal.record.regularStatus] || ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[calendarModal.record.regularStatus] || ''}`}></span>
                      {STATUS_LABELS[calendarModal.record.regularStatus]}
                    </span>
                    {crossMidnight && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span aria-hidden>🌙</span>
                        Ca đêm
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Giờ vào:</span>
                    <span className="ml-2 text-sm text-gray-900">{crossMidnight ? formatTimesWithDate(ins) : formatTimes(ins)}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Giờ ra:</span>
                    <span className="ml-2 text-sm text-gray-900">{crossMidnight ? formatTimesWithDate(outs) : formatTimes(outs)}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Số giờ:</span>
                    <span className="ml-2 text-sm text-gray-900">{(calendarModal.record.regularHours ?? calendarModal.record.workHours).toFixed(2)} giờ</span>
                  </div>
                  {calendarModal.record.notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Ghi chú:</span>
                      <span className="ml-2 text-sm text-gray-900">{calendarModal.record.notes}</span>
                    </div>
                  )}
                </div>
                );
              })()}
              {/* Show plain view for records without regularStatus split (pure overtime or old data) */}
              {!calendarModal.record.regularStatus && !calendarModal.record.hasOvertime && (() => {
                const ins = calendarModal.record.checkInTimes;
                const outs = calendarModal.record.checkOutTimes;
                const crossMidnight = isCrossMidnight(ins, outs);
                return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[calendarModal.record.status] || ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[calendarModal.record.status] || ''}`}></span>
                      {STATUS_LABELS[calendarModal.record.status]}
                    </span>
                    {crossMidnight && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span aria-hidden>🌙</span>
                        Ca đêm
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Giờ vào:</span>
                    <span className="ml-2 text-sm text-gray-900">{crossMidnight ? formatTimesWithDate(ins) : formatTimes(ins)}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Giờ ra:</span>
                    <span className="ml-2 text-sm text-gray-900">{crossMidnight ? formatTimesWithDate(outs) : formatTimes(outs)}</span>
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
                );
              })()}
              {/* Section 2: Overtime */}
              {calendarModal.record.hasOvertime && (
                <div className="space-y-3 border-t pt-3">
                  {!calendarModal.record.regularStatus && (
                    <p className="text-xs text-gray-400 italic">Không có ca bình thường</p>
                  )}
                  <h4 className="text-sm font-semibold text-purple-700 border-b border-purple-100 pb-1">Tăng ca</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                      Tăng ca
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Giờ vào:</span>
                    <span className="ml-2 text-sm text-gray-900">{formatTimes(calendarModal.record.overtimeCheckInTimes ?? [])}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Giờ ra:</span>
                    <span className="ml-2 text-sm text-gray-900">{formatTimes(calendarModal.record.overtimeCheckOutTimes ?? [])}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Số giờ tăng ca:</span>
                    <span className="ml-2 text-sm text-gray-900">{(calendarModal.record.overtimeHours ?? 0).toFixed(2)} giờ</span>
                  </div>
                  {calendarModal.record.overtimeNotes && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Ghi chú:</span>
                      <span className="ml-2 text-sm text-gray-900">{calendarModal.record.overtimeNotes}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  const r = calendarModal.record;
                  setCalendarModal(null);
                  handleEdit(r);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Chỉnh sửa
              </button>
              <button
                onClick={async () => {
                  const id = calendarModal.record.id;
                  await handleDelete(id);
                  setCalendarModal(null);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Xoá
              </button>
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
        let totalOvertimeHours = 0;
        empRecords.forEach(({ record }) => {
          // Count overtime separately from regular status
          if (record.hasOvertime) counts.OVERTIME++;
          if (record.regularStatus && counts[record.regularStatus] !== undefined) {
            counts[record.regularStatus]++;
          } else if (!record.regularStatus && !record.hasOvertime && counts[record.status] !== undefined) {
            // Fallback for records without split fields (old data)
            counts[record.status]++;
          }
          if (record.overtimeHours) totalOvertimeHours += record.overtimeHours;
        });
        const totalWorkingDays = counts.PRESENT + counts.LATE + counts.OVERTIME;
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
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-300 font-medium">Tổng ngày làm việc: {totalWorkingDays}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-300 font-medium">
                    Tổng giờ tăng ca: {totalOvertimeHours > 0 ? (Math.round(totalOvertimeHours * 100) / 100).toString() : '0'}h
                  </span>
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
                          <th className="px-3 py-2 text-right font-semibold text-gray-700">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empRecords.map(({ day, record }) => {
                          // Determine display data based on split fields
                          const isPureOvertime = !record.regularStatus && record.hasOvertime;
                          const hasBoth = !!(record.regularStatus && record.hasOvertime);
                          const displayStatus = record.regularStatus ?? record.status;
                          const displayCheckIn = record.regularCheckInTimes ?? record.checkInTimes;
                          const displayCheckOut = record.regularCheckOutTimes ?? record.checkOutTimes;
                          const displayHours = record.regularHours ?? record.workHours;

                          return (
                            <tr key={day.toISOString()} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-900 whitespace-nowrap">{formatDateObj(day)}</td>
                              <td className="px-3 py-2 text-center">
                                {isPureOvertime ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    Tăng ca
                                  </span>
                                ) : (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE_STYLES[displayStatus] || ''}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_STYLES[displayStatus] || ''}`}></span>
                                    {STATUS_LABELS[displayStatus]}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {isPureOvertime ? formatTimes(record.overtimeCheckInTimes ?? []) : formatTimes(displayCheckIn)}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {isPureOvertime ? formatTimes(record.overtimeCheckOutTimes ?? []) : formatTimes(displayCheckOut)}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-900">
                                {isPureOvertime
                                  ? (record.overtimeHours ?? 0).toFixed(2)
                                  : displayHours.toFixed(2)}
                                {hasBoth && (
                                  <div className="text-xs text-purple-600 italic">
                                    +{(record.overtimeHours ?? 0).toFixed(2)} TC
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {record.notes || '-'}
                                {hasBoth && record.overtimeNotes && (
                                  <div className="text-xs text-purple-600 italic">{record.overtimeNotes}</div>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  onClick={() => {
                                    setCalendarModal(null);
                                    handleEdit(record);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                  title="Chỉnh sửa"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
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
