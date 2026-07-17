import React, { useState, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useMonthlyTimesheet, useUpsertTimesheetCell, useUpsertTimesheetOverride } from '../hooks/useMonthlyTimesheet';
import { useAttendanceCodes } from '../hooks/useAttendanceCodes';
import { useDepartments } from '../hooks/useDepartments';
import { TimesheetRow, TimesheetSummary, TimesheetSettings } from '../services/timesheetService';
import { ChevronLeft, ChevronRight, Search, Download, X } from 'lucide-react';
import attendanceService from '../services/attendanceService';

type SubTab = 'attendance' | 'overtime';

interface CellEditorState {
  empId: string;
  date: string;
  code: string;
  note: string;
}

/* ---------- Inline Editable Cell for summary columns ---------- */
type SummaryCellType = 'text' | 'number' | 'money' | 'checkbox' | 'date';

interface EditableSummaryCellProps {
  employeeId: string;
  fieldKey: string;
  computedValue: string;
  overrideValue: string | undefined;
  month: number;
  year: number;
  onSave: (data: { employeeId: string; month: number; year: number; fieldKey: string; value: string }) => void;
  className?: string;
  type?: SummaryCellType;
}

const formatDateDisplay = (v: string) => {
  if (!v) return '';
  const parts = v.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return v;
};

const formatMoneyDisplay = (v: string) => {
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n === 0) return '';
  return Math.round(n).toLocaleString('vi-VN');
};

const normalizeNumericString = (v: string) => v.replace(/[^\d.-]/g, '');

const EditableSummaryCell: React.FC<EditableSummaryCellProps> = ({
  employeeId, fieldKey, computedValue, overrideValue, month, year, onSave, className = '', type = 'text',
}) => {
  const displayValue = overrideValue !== undefined ? overrideValue : computedValue;
  const isOverridden = overrideValue !== undefined;
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Checkbox type: always interactive, no click-to-edit flow ---
  if (type === 'checkbox') {
    const isChecked = overrideValue !== undefined ? overrideValue === 'x' : computedValue === '✓' || computedValue === 'x';
    const handleToggle = () => {
      const newVal = isChecked ? '' : 'x';
      onSave({ employeeId, month, year, fieldKey, value: newVal });
    };
    return (
      <td
        className={`border px-1 py-0.5 text-center ${isOverridden ? 'bg-amber-50/60' : ''} ${className}`}
        title={isOverridden ? `Ghi đè (gốc: ${computedValue || 'trống'})` : undefined}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleToggle}
          className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
        />
      </td>
    );
  }

  // --- Non-checkbox types: click-to-edit flow ---
  const getEditValue = () => {
    if (type === 'money') return normalizeNumericString(displayValue);
    return displayValue;
  };

  const handleClick = () => {
    setLocalValue(getEditValue());
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setEditing(false);
    const trimmed = localValue.trim();
    // Normalize computed value for comparison (money has formatting)
    const computedNorm = type === 'money' ? normalizeNumericString(computedValue) : computedValue;
    const displayNorm = type === 'money' ? normalizeNumericString(displayValue) : displayValue;
    // Only save if value actually changed
    if (trimmed === displayNorm) return;
    if (trimmed === '' && !isOverridden && computedValue === '') return;
    if (trimmed === computedNorm && isOverridden) {
      // User typed the same as computed → remove override
      onSave({ employeeId, month, year, fieldKey, value: '' });
    } else if (trimmed !== computedNorm || isOverridden) {
      onSave({ employeeId, month, year, fieldKey, value: trimmed });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setLocalValue(getEditValue());
      setEditing(false);
    }
  };

  const getInputType = () => {
    if (type === 'number' || type === 'money') return 'number';
    if (type === 'date') return 'date';
    return 'text';
  };

  const getDisplayContent = () => {
    if (type === 'money') return formatMoneyDisplay(displayValue);
    if (type === 'date') return formatDateDisplay(displayValue);
    return displayValue;
  };

  if (editing) {
    return (
      <td className={`border px-0 py-0 ${className}`}>
        <input
          ref={inputRef}
          type={getInputType()}
          value={localValue}
          onChange={e => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full px-1 py-0.5 text-xs text-center border-0 outline-none bg-blue-50 focus:ring-1 focus:ring-blue-400"
          autoFocus
          step={type === 'number' || type === 'money' ? 'any' : undefined}
        />
      </td>
    );
  }

  return (
    <td
      className={`border px-1 py-0.5 text-center cursor-pointer hover:bg-blue-50/40 ${isOverridden ? 'font-semibold bg-amber-50/60' : ''} ${className}`}
      onClick={handleClick}
      title={isOverridden ? `Ghi đè (gốc: ${computedValue || 'trống'})` : undefined}
    >
      {getDisplayContent()}
    </td>
  );
};

const MonthlyTimesheetGrid: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [subTab, setSubTab] = useState<SubTab>('attendance');
  const [editingCell, setEditingCell] = useState<CellEditorState | null>(null);

  const { data: timesheetData, isLoading } = useMonthlyTimesheet(month, year, {
    search: search || undefined,
    departmentId: departmentId || undefined,
  });
  const { data: codes = [] } = useAttendanceCodes();
  const { data: departments = [] } = useDepartments();
  const upsertCell = useUpsertTimesheetCell();
  const upsertOverride = useUpsertTimesheetOverride();

  const activeCodes = useMemo(() => codes.filter(c => c.isActive), [codes]);

  const daysInMonth = timesheetData?.daysInMonth ?? new Date(year, month, 0).getDate();
  const dayHeaders = useMemo(() => {
    const headers: { day: number; weekday: string; isSunday: boolean }[] = [];
    const wdLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(Date.UTC(year, month - 1, d));
      headers.push({ day: d, weekday: wdLabels[dt.getUTCDay()], isSunday: dt.getUTCDay() === 0 });
    }
    return headers;
  }, [daysInMonth, month, year]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleCellClick = (empId: string, date: string, currentCode: string, currentNote: string) => {
    setEditingCell({ empId, date, code: currentCode, note: currentNote });
  };

  const handleCellSave = useCallback(async () => {
    if (!editingCell) return;
    const { empId, date, code, note } = editingCell;
    if (!code) { setEditingCell(null); return; }
    setEditingCell(null);
    try {
      await upsertCell.mutateAsync({ employeeId: empId, date, code, note: note || undefined });
    } catch (err) {
      console.error('Error upserting cell:', err);
    }
  }, [editingCell, upsertCell]);

  const handleExport = async () => {
    try {
      await attendanceService.exportToExcelCalendar({ month, year, search: search || undefined, departmentId: departmentId || undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xuất file Excel');
    }
  };

  const monthLabel = `Tháng ${String(month).padStart(2, '0')}/${year}`;

  const getCellColor = (code?: string) => {
    if (!code) return '';
    if (code === 'x' || code === 'ON' || code === 'N') return 'text-green-700 bg-green-50/60 font-medium';
    if (code === 'O') return 'text-red-600 bg-red-50/60';
    if (['P', 'P/2', 'B', 'TS', 'BU', 'CD'].includes(code)) return 'text-blue-700 bg-blue-50/60';
    if (['KL', 'NCC', 'O/2'].includes(code)) return 'text-amber-700 bg-amber-50/60';
    if (code === 'TV' || code === 'TV/2') return 'text-purple-700 bg-purple-50/60';
    return '';
  };

  const formatMoney = (v: number) => Math.round(v).toLocaleString('vi-VN');
  const formatHours = (v: number) => v ? Number(v.toFixed(1)) : '';

  const settings: TimesheetSettings = timesheetData?.settings ?? {
    standardWorkDays: 26, otRateWeekday: 1.5, otRateWeekdayExtra: 2.1,
    otRateSunday: 2, otRateSundayExtra: 2.7, otRateHoliday: 3,
  };
  const summaries = timesheetData?.summaries ?? {};
  const overrides = timesheetData?.overrides ?? {};

  const handleOverrideSave = useCallback((data: { employeeId: string; month: number; year: number; fieldKey: string; value: string }) => {
    upsertOverride.mutate(data);
  }, [upsertOverride]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100"><ChevronLeft size={20} /></button>
          <span className="text-lg font-semibold min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100"><ChevronRight size={20} /></button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm nhân viên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm w-48"
            />
          </div>
          <select
            value={departmentId}
            onChange={e => setDepartmentId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">Tất cả bộ phận</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
            <Download size={16} /> Xuất Excel
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setSubTab('attendance')}
        >
          Chấm công
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === 'overtime' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          onClick={() => setSubTab('overtime')}
        >
          Tăng ca
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Đang tải...</div>
      ) : subTab === 'attendance' ? (
        <AttendanceTable
          rows={timesheetData?.rows ?? []}
          dayHeaders={dayHeaders}
          summaries={summaries}
          overrides={overrides}
          settings={settings}
          month={month}
          year={year}
          editingCell={editingCell}
          activeCodes={activeCodes}
          getCellColor={getCellColor}
          formatHours={formatHours}
          formatMoney={formatMoney}
          onCellClick={handleCellClick}
          onCellSave={handleCellSave}
          onOverrideSave={handleOverrideSave}
          editingState={editingCell}
          setEditingCell={setEditingCell}
        />
      ) : (
        <OvertimeTable
          rows={timesheetData?.rows ?? []}
          dayHeaders={dayHeaders}
          summaries={summaries}
          overrides={overrides}
          settings={settings}
          month={month}
          year={year}
          formatHours={formatHours}
          formatMoney={formatMoney}
          onOverrideSave={handleOverrideSave}
        />
      )}

      {/* Cell editor modal overlay */}
      {editingCell && (
        <CellEditorModal
          editingCell={editingCell}
          activeCodes={activeCodes}
          onSave={handleCellSave}
          onCancel={() => setEditingCell(null)}
          onChange={setEditingCell}
        />
      )}
    </div>
  );
};

/* ---------- Cell Editor Modal ---------- */
interface CellEditorModalProps {
  editingCell: CellEditorState;
  activeCodes: { id: string; code: string; description?: string }[];
  onSave: () => void;
  onCancel: () => void;
  onChange: (s: CellEditorState) => void;
}

const CellEditorModal: React.FC<CellEditorModalProps> = ({ editingCell, activeCodes, onSave, onCancel, onChange }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
    <div className="bg-white rounded-lg shadow-xl p-4 w-72 space-y-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Chỉnh sửa ô chấm công</h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Mã chấm công</label>
        <select
          value={editingCell.code}
          onChange={e => onChange({ ...editingCell, code: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          <option value=""></option>
          {activeCodes.map(ac => <option key={ac.id} value={ac.code}>{ac.code}{ac.description ? ` - ${ac.description}` : ''}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Ghi chú</label>
        <input
          type="text"
          value={editingCell.note}
          onChange={e => onChange({ ...editingCell, note: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          placeholder="Ghi chú (tùy chọn)"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Hủy</button>
        <button onClick={onSave} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Lưu</button>
      </div>
    </div>
  </div>
);

/* ---------- Attendance Table (Cham cong) ---------- */
interface AttendanceTableProps {
  rows: TimesheetRow[];
  dayHeaders: { day: number; weekday: string; isSunday: boolean }[];
  summaries: Record<string, TimesheetSummary>;
  overrides: Record<string, Record<string, string>>;
  settings: TimesheetSettings;
  month: number;
  year: number;
  editingCell: CellEditorState | null;
  activeCodes: { id: string; code: string; description?: string }[];
  getCellColor: (code?: string) => string;
  formatHours: (v: number) => number | string;
  formatMoney: (v: number) => string;
  onCellClick: (empId: string, date: string, code: string, note: string) => void;
  onCellSave: () => void;
  onOverrideSave: (data: { employeeId: string; month: number; year: number; fieldKey: string; value: string }) => void;
  editingState: CellEditorState | null;
  setEditingCell: (s: CellEditorState | null) => void;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  rows, dayHeaders, summaries, overrides, settings, month, year, getCellColor, formatHours, formatMoney, onCellClick, onOverrideSave,
}) => {
  // Fixed widths for sticky identity columns — header AND body must use the same
  // width/left so the frozen columns line up exactly when scrolling horizontally.
  const idW = [40, 72, 150, 100, 110, 88]; // STT, MSNV, Name, Position, Dept, HireDate
  const idLeft: number[] = [];
  idW.reduce((acc, w, i) => { idLeft[i] = acc; return acc + w; }, 0);
  const idTotalW = idW.reduce((a, b) => a + b, 0);
  const idStyle = (i: number): React.CSSProperties => ({ left: idLeft[i], width: idW[i], minWidth: idW[i], maxWidth: idW[i] });
  // z-30 corner (frozen col + frozen header) > z-20 header row > z-10 frozen body col
  const headThCell = 'border px-1 py-1 sticky bg-gray-50 z-30 overflow-hidden text-ellipsis whitespace-nowrap';
  const bodyThCell = 'border px-1 py-0.5 sticky bg-white z-10 overflow-hidden text-ellipsis whitespace-nowrap';

  return (
    <div className="overflow-auto border rounded-lg max-h-[calc(100vh-260px)]">
      <table className="text-xs border-collapse min-w-max">
        <thead className="sticky top-0 z-20 bg-gray-50">
          {/* Group header row */}
          <tr>
            <th colSpan={6} className="border px-1 py-0.5 bg-gray-100 text-center text-[10px] sticky left-0 z-30" style={{ width: idTotalW, minWidth: idTotalW }}>Thông tin nhân viên</th>
            <th colSpan={dayHeaders.length} className="border px-1 py-0.5 bg-gray-100 text-center text-[10px]">Ngày trong tháng</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Giờ lương</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Làm CT</th>
            <th colSpan={3} className="border px-1 py-0.5 bg-yellow-50 text-center text-[10px]">Số giờ nghỉ</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Thử việc</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Trễ/Sớm</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Ký nhận</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Cơm NC</th>
            <th colSpan={5} className="border px-1 py-0.5 bg-orange-50 text-center text-[10px]">Tăng ca</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Số KM</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Xăng xe</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Cơm TC</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Phép TT</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Phép HT</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Ghi chú</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Chuyên cần</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Tính cơm</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Giờ CC KL</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Truy thu ứng phép</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Phép bù</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Cơm CN</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap">Ngày nghỉ việc</th>
          </tr>
          {/* Column header row */}
          <tr>
            <th className={headThCell} style={idStyle(0)}>STT</th>
            <th className={headThCell} style={idStyle(1)}>MSNV</th>
            <th className={headThCell} style={idStyle(2)}>Họ và Tên</th>
            <th className={headThCell} style={idStyle(3)}>Chức vụ</th>
            <th className={headThCell} style={idStyle(4)}>Bộ phận</th>
            <th className={headThCell} style={idStyle(5)}>Ngày vào</th>
            {dayHeaders.map(h => (
              <th key={h.day} className={`border px-0.5 py-1 min-w-[28px] text-center ${h.isSunday ? 'bg-red-50 text-red-600' : 'bg-gray-50'}`}>
                <div>{h.day}</div>
                <div className="font-normal text-[10px]">{h.weekday}</div>
              </th>
            ))}
            <th className="border px-1 py-1 min-w-[44px] text-center bg-yellow-50">Tính lương</th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-yellow-50">Lễ/CĐ</th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-yellow-50">Không lương</th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-orange-50">NT 150%</th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-orange-50">NT 210%</th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-orange-50">CN 200%</th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-orange-50">CN 270%</th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-orange-50">Lễ 300%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const s = summaries[row.employeeId];
            const empOvr = overrides[row.employeeId] as Record<string, string> | undefined;
            const mealAllowanceMoney = (s?.mealAllowanceDays ?? 0) * (settings.mealAllowancePerDay ?? 0);
            const overtimeMealMoney = (s?.overtimeMealDays ?? 0) * (settings.overtimeMealAllowance ?? 25000);
            const hireFormatted = row.hireDate ? new Date(row.hireDate).toLocaleDateString('vi-VN') : '';
            return (
              <tr key={row.employeeId} className="hover:bg-blue-50/30">
                <td className={`${bodyThCell} text-center`} style={idStyle(0)}>{idx + 1}</td>
                <td className={bodyThCell} style={idStyle(1)}>{row.employeeCode}</td>
                <td className={bodyThCell} style={idStyle(2)} title={row.fullName}>{row.fullName}</td>
                <td className={bodyThCell} style={idStyle(3)} title={row.positionName}>{row.positionName}</td>
                <td className={bodyThCell} style={idStyle(4)} title={row.departmentName}>{row.departmentName}</td>
                <td className={`${bodyThCell} text-center`} style={idStyle(5)}>{hireFormatted}</td>
                {dayHeaders.map(h => {
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
                  const cell = row.cells.find(c => c.date === dateStr);
                  return (
                    <td
                      key={h.day}
                      className={`border px-0.5 py-0.5 text-center cursor-pointer relative ${h.isSunday ? 'bg-red-50/50' : ''} ${getCellColor(cell?.code)}`}
                      onClick={() => onCellClick(row.employeeId, dateStr, cell?.code || '', cell?.note || '')}
                      title={cell?.note || undefined}
                    >
                      <span>{cell?.code || ''}</span>
                      {cell?.note && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                    </td>
                  );
                })}
                {/* Summary cells - all editable inline */}
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="payableHours" computedValue={String(formatHours(s?.payableHours ?? 0))} overrideValue={empOvr?.payableHours} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="officialWorkDays" computedValue={String(formatHours(s?.officialWorkDays ?? 0))} overrideValue={empOvr?.officialWorkDays} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="leaveHoursPayable" computedValue={String(formatHours(s?.leaveHoursPayable ?? 0))} overrideValue={empOvr?.leaveHoursPayable} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-yellow-50/50" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="leaveHoursHolidayRegime" computedValue={String(formatHours(s?.leaveHoursHolidayRegime ?? 0))} overrideValue={empOvr?.leaveHoursHolidayRegime} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-yellow-50/50" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="leaveHoursUnpaid" computedValue={String(formatHours(s?.leaveHoursUnpaid ?? 0))} overrideValue={empOvr?.leaveHoursUnpaid} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-yellow-50/50" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="probationDays" computedValue={String(formatHours(s?.probationDays ?? 0))} overrideValue={empOvr?.probationDays} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="lateEarlyHours" computedValue={String(formatHours(s?.lateEarlyHours ?? 0))} overrideValue={empOvr?.lateEarlyHours} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="signature" computedValue="" overrideValue={empOvr?.signature} month={month} year={year} onSave={onOverrideSave} type="text" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="mealAllowanceMoney" computedValue={mealAllowanceMoney ? formatMoney(mealAllowanceMoney) : ''} overrideValue={empOvr?.mealAllowanceMoney} month={month} year={year} onSave={onOverrideSave} type="money" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otWeekday" computedValue={String(formatHours(s?.otWeekday ?? 0))} overrideValue={empOvr?.otWeekday} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-orange-50/50" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otWeekdayExtra" computedValue={String(formatHours(s?.otWeekdayExtra ?? 0))} overrideValue={empOvr?.otWeekdayExtra} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-orange-50/50" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otSunday" computedValue={String(formatHours(s?.otSunday ?? 0))} overrideValue={empOvr?.otSunday} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-orange-50/50" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otSundayExtra" computedValue={String(formatHours(s?.otSundayExtra ?? 0))} overrideValue={empOvr?.otSundayExtra} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-orange-50/50" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otHoliday" computedValue={String(formatHours(s?.otHoliday ?? 0))} overrideValue={empOvr?.otHoliday} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-orange-50/50" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="kmDistance" computedValue={String(row.kmDistance || '')} overrideValue={empOvr?.kmDistance} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="fuelAmount" computedValue={s?.fuelAmount ? formatMoney(s.fuelAmount) : ''} overrideValue={empOvr?.fuelAmount} month={month} year={year} onSave={onOverrideSave} type="money" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="overtimeMealMoney" computedValue={overtimeMealMoney ? formatMoney(overtimeMealMoney) : ''} overrideValue={empOvr?.overtimeMealMoney} month={month} year={year} onSave={onOverrideSave} type="money" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="leaveBalanceCarryOver" computedValue={String(row.leaveBalanceCarryOver ?? '')} overrideValue={empOvr?.leaveBalanceCarryOver} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="leaveCurrentBalance" computedValue={s?.leaveCurrentBalance != null ? String(s.leaveCurrentBalance) : ''} overrideValue={empOvr?.leaveCurrentBalance} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="note" computedValue="" overrideValue={empOvr?.note} month={month} year={year} onSave={onOverrideSave} type="text" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="diligence" computedValue={s?.diligence ? '✓' : ''} overrideValue={empOvr?.diligence} month={month} year={year} onSave={onOverrideSave} type="checkbox" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="mealCount" computedValue={s?.mealCount != null ? String(s.mealCount) : ''} overrideValue={empOvr?.mealCount} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="unpaidDeductHours" computedValue="" overrideValue={empOvr?.unpaidDeductHours} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="leaveAdvanceRecovery" computedValue="" overrideValue={empOvr?.leaveAdvanceRecovery} month={month} year={year} onSave={onOverrideSave} type="money" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="leaveCompensatory" computedValue={s?.leaveCompensatory != null ? String(s.leaveCompensatory) : ''} overrideValue={empOvr?.leaveCompensatory} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="sundayMeal" computedValue={s?.sundayMeal != null ? String(s.sundayMeal) : ''} overrideValue={empOvr?.sundayMeal} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="resignDate" computedValue="" overrideValue={empOvr?.resignDate} month={month} year={year} onSave={onOverrideSave} type="date" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ---------- Overtime Table (Tang ca) ---------- */
interface OvertimeTableProps {
  rows: TimesheetRow[];
  dayHeaders: { day: number; weekday: string; isSunday: boolean }[];
  summaries: Record<string, TimesheetSummary>;
  overrides: Record<string, Record<string, string>>;
  settings: TimesheetSettings;
  month: number;
  year: number;
  formatHours: (v: number) => number | string;
  formatMoney: (v: number) => string;
  onOverrideSave: (data: { employeeId: string; month: number; year: number; fieldKey: string; value: string }) => void;
}

const OvertimeTable: React.FC<OvertimeTableProps> = ({
  rows, dayHeaders, summaries, overrides, settings, month, year, formatHours, formatMoney, onOverrideSave,
}) => {
  // Fixed widths for the 3 sticky identity columns (STT, Ma NV, Ho va Ten)
  const idW = [40, 72, 150];
  const idLeft = [0, idW[0], idW[0] + idW[1]];
  const idStyle = (i: number): React.CSSProperties => ({ left: idLeft[i], width: idW[i], minWidth: idW[i], maxWidth: idW[i] });
  const headThCell = 'border px-1 py-1 sticky bg-gray-50 z-30 overflow-hidden text-ellipsis whitespace-nowrap';
  const bodyThCell = 'border px-1 py-0.5 sticky bg-white z-10 overflow-hidden text-ellipsis whitespace-nowrap';

  // Column totals across all displayed employees (override wins over computed).
  const num = (v: unknown) => { const n = parseFloat(String(v ?? '').replace(/[^\d.-]/g, '')); return Number.isFinite(n) ? n : 0; };
  const totals = rows.reduce((acc, row) => {
    const s = summaries[row.employeeId];
    const ovr = overrides[row.employeeId] as Record<string, string> | undefined;
    const val = (key: string, computed: number) => (ovr && ovr[key] !== undefined ? num(ovr[key]) : computed);
    acc.otWeekday += val('otWeekday', s?.otWeekday ?? 0);
    acc.otSunday += val('otSunday', s?.otSunday ?? 0);
    acc.otHoliday += val('otHoliday', s?.otHoliday ?? 0);
    acc.otWeekdayExtra += val('otWeekdayExtra', s?.otWeekdayExtra ?? 0);
    acc.otSundayExtra += val('otSundayExtra', s?.otSundayExtra ?? 0);
    acc.otSalary += val('otSalary', s?.otSalary ?? 0);
    acc.otTotalIncome += val('otTotalIncome', s?.otTotalIncome ?? 0);
    acc.otDaysCount += val('otDaysCount', 0);
    acc.overtimeMealMoney += val('overtimeMealMoney', (s?.overtimeMealDays ?? 0) * (settings.overtimeMealAllowance ?? 25000));
    return acc;
  }, { otWeekday: 0, otSunday: 0, otHoliday: 0, otWeekdayExtra: 0, otSundayExtra: 0, otSalary: 0, otTotalIncome: 0, otDaysCount: 0, overtimeMealMoney: 0 });

  return (
    <div className="overflow-auto border rounded-lg max-h-[calc(100vh-260px)]">
      <table className="text-xs border-collapse min-w-max">
        <thead className="sticky top-0 z-20 bg-gray-50">
          <tr>
            <th className={headThCell} style={idStyle(0)}>STT</th>
            <th className={headThCell} style={idStyle(1)}>Mã NV</th>
            <th className={headThCell} style={idStyle(2)}>Họ và Tên</th>
            <th className="border px-1 py-1 min-w-[80px] bg-gray-50">Chức vụ</th>
            <th className="border px-1 py-1 min-w-[90px] bg-gray-50">Bộ phận</th>
            <th className="border px-1 py-1 min-w-[60px] bg-gray-50">TC tháng trước</th>
            {dayHeaders.map(h => (
              <th key={h.day} className={`border px-0.5 py-1 min-w-[28px] text-center ${h.isSunday ? 'bg-red-50 text-red-600' : 'bg-gray-50'}`}>
                <div>{h.day}</div>
                <div className="font-normal text-[10px]">{h.weekday}</div>
              </th>
            ))}
            <th className="border px-1 py-1 min-w-[70px] text-center align-bottom">Số giờ tăng ca ngày thường</th>
            <th className="border px-1 py-1 min-w-[60px] text-center align-bottom">Số giờ tăng ca CN</th>
            <th className="border px-1 py-1 min-w-[60px] text-center align-bottom">Số giờ tăng ca Lễ</th>
            <th className="border px-1 py-1 min-w-[70px] text-center align-bottom">Tăng ca ngoài giờ ngày thường</th>
            <th className="border px-1 py-1 min-w-[70px] text-center align-bottom">Tăng ca ngoài giờ ngày nghỉ</th>
            <th className="border px-1 py-1 min-w-[80px] text-center align-bottom">Lương tính tăng ca</th>
            <th className="border px-1 py-1 min-w-[80px] text-center align-bottom">Mức lương theo giờ</th>
            <th className="border px-1 py-1 min-w-[85px] text-center align-bottom">Tổng Thu nhập ngoài giờ</th>
            <th className="border px-1 py-1 min-w-[60px] text-center align-bottom">Ngày công tăng ca</th>
            <th className="border px-1 py-1 min-w-[75px] text-center align-bottom">Tổng Tiền cơm TC</th>
          </tr>
          {/* Multiplier / rate row */}
          <tr className="text-[10px] text-gray-500">
            <th className="border px-1 py-0.5 sticky left-0 bg-gray-50 z-30" style={{ width: idW[0], minWidth: idW[0] }}></th>
            <th className="border px-1 py-0.5 sticky bg-gray-50 z-30" style={{ left: idLeft[1], width: idW[1], minWidth: idW[1] }}></th>
            <th className="border px-1 py-0.5 sticky bg-gray-50 z-30" style={{ left: idLeft[2], width: idW[2], minWidth: idW[2] }}></th>
            <th className="border px-1 py-0.5 bg-gray-50"></th>
            <th className="border px-1 py-0.5 bg-gray-50"></th>
            <th className="border px-1 py-0.5 bg-gray-50"></th>
            {dayHeaders.map(h => <th key={h.day} className="border px-0.5 py-0.5 bg-gray-50"></th>)}
            <th className="border px-1 py-0.5 text-center bg-gray-50">{settings.otRateWeekday * 100}%</th>
            <th className="border px-1 py-0.5 text-center bg-gray-50">{settings.otRateSunday * 100}%</th>
            <th className="border px-1 py-0.5 text-center bg-gray-50">{settings.otRateHoliday * 100}%</th>
            <th className="border px-1 py-0.5 text-center bg-gray-50">{settings.otRateWeekdayExtra * 100}%</th>
            <th className="border px-1 py-0.5 text-center bg-gray-50">{settings.otRateSundayExtra * 100}%</th>
            <th className="border px-1 py-0.5 bg-gray-50"></th>
            <th className="border px-1 py-0.5 bg-gray-50"></th>
            <th className="border px-1 py-0.5 bg-gray-50"></th>
            <th className="border px-1 py-0.5 bg-gray-50"></th>
            <th className="border px-1 py-0.5 text-center bg-gray-50">{(settings.overtimeMealAllowance ?? 25000).toLocaleString('vi-VN')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const s = summaries[row.employeeId];
            const empOvr = overrides[row.employeeId] as Record<string, string> | undefined;
            const hourlyRate = Math.round((row.baseSalary || 0) / ((settings.standardWorkDays || 26) * 8));
            const overtimeMealMoney = (s?.overtimeMealDays ?? 0) * (settings.overtimeMealAllowance ?? 25000);
            return (
              <tr key={row.employeeId} className="hover:bg-blue-50/30">
                <td className={`${bodyThCell} text-center`} style={idStyle(0)}>{idx + 1}</td>
                <td className={bodyThCell} style={idStyle(1)}>{row.employeeCode}</td>
                <td className={bodyThCell} style={idStyle(2)} title={row.fullName}>{row.fullName}</td>
                <td className="border px-1 py-0.5 whitespace-nowrap">{row.positionName}</td>
                <td className="border px-1 py-0.5 whitespace-nowrap">{row.departmentName}</td>
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otCarryOver" computedValue="" overrideValue={empOvr?.otCarryOver} month={month} year={year} onSave={onOverrideSave} type="text" />
                {dayHeaders.map(h => {
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
                  const cell = row.cells.find(c => c.date === dateStr);
                  const ot = cell?.overtimeHours ?? 0;
                  return (
                    <td
                      key={h.day}
                      className={`border px-0.5 py-0.5 text-center ${h.isSunday ? 'bg-red-50/50' : ''} ${ot > 0 ? 'text-orange-700 font-medium' : 'text-gray-300'}`}
                    >
                      {ot > 0 ? ot : ''}
                    </td>
                  );
                })}
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otWeekday" computedValue={String(formatHours(s?.otWeekday ?? 0))} overrideValue={empOvr?.otWeekday} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otSunday" computedValue={String(formatHours(s?.otSunday ?? 0))} overrideValue={empOvr?.otSunday} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otHoliday" computedValue={String(formatHours(s?.otHoliday ?? 0))} overrideValue={empOvr?.otHoliday} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otWeekdayExtra" computedValue={String(formatHours(s?.otWeekdayExtra ?? 0))} overrideValue={empOvr?.otWeekdayExtra} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otSundayExtra" computedValue={String(formatHours(s?.otSundayExtra ?? 0))} overrideValue={empOvr?.otSundayExtra} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otSalary" computedValue={s?.otSalary ? formatMoney(s.otSalary) : ''} overrideValue={empOvr?.otSalary} month={month} year={year} onSave={onOverrideSave} type="money" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="hourlyRate" computedValue={hourlyRate ? formatMoney(hourlyRate) : ''} overrideValue={empOvr?.hourlyRate} month={month} year={year} onSave={onOverrideSave} type="money" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otTotalIncome" computedValue={s?.otTotalIncome ? formatMoney(s.otTotalIncome) : ''} overrideValue={empOvr?.otTotalIncome} month={month} year={year} onSave={onOverrideSave} type="money" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otDaysCount" computedValue="" overrideValue={empOvr?.otDaysCount} month={month} year={year} onSave={onOverrideSave} type="number" />
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="overtimeMealMoney" computedValue={overtimeMealMoney ? formatMoney(overtimeMealMoney) : ''} overrideValue={empOvr?.overtimeMealMoney} month={month} year={year} onSave={onOverrideSave} type="money" />
              </tr>
            );
          })}
        </tbody>
        <tfoot className="sticky bottom-0 z-20 bg-gray-100 font-semibold">
          <tr>
            <td className="border px-1 py-1 sticky left-0 bg-gray-100 z-30" style={{ left: idLeft[0], width: idW[0], minWidth: idW[0] }}></td>
            <td className="border px-1 py-1 sticky bg-gray-100 z-30 text-center" colSpan={2} style={{ left: idLeft[1] }}>TỔNG CỘNG</td>
            <td className="border px-1 py-1 bg-gray-100"></td>
            <td className="border px-1 py-1 bg-gray-100"></td>
            <td className="border px-1 py-1 bg-gray-100"></td>
            {dayHeaders.map(h => <td key={h.day} className="border px-0.5 py-1 bg-gray-100"></td>)}
            <td className="border px-1 py-1 text-center">{formatHours(totals.otWeekday) || 0}</td>
            <td className="border px-1 py-1 text-center">{formatHours(totals.otSunday) || 0}</td>
            <td className="border px-1 py-1 text-center">{formatHours(totals.otHoliday) || 0}</td>
            <td className="border px-1 py-1 text-center">{formatHours(totals.otWeekdayExtra) || 0}</td>
            <td className="border px-1 py-1 text-center">{formatHours(totals.otSundayExtra) || 0}</td>
            <td className="border px-1 py-1 text-center">{formatMoney(totals.otSalary)}</td>
            <td className="border px-1 py-1 bg-gray-100"></td>
            <td className="border px-1 py-1 text-center">{formatMoney(totals.otTotalIncome)}</td>
            <td className="border px-1 py-1 text-center">{formatHours(totals.otDaysCount) || 0}</td>
            <td className="border px-1 py-1 text-center">{formatMoney(totals.overtimeMealMoney)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default MonthlyTimesheetGrid;
