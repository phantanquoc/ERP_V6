import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useMonthlyTimesheet, useUpsertTimesheetCell, useUpsertTimesheetOverride } from '../hooks/useMonthlyTimesheet';
import { useAttendanceCodes } from '../hooks/useAttendanceCodes';
import { useDepartments } from '../hooks/useDepartments';
import { TimesheetRow, TimesheetSummary, TimesheetSettings, TimesheetCell } from '../services/timesheetService';
import { ChevronLeft, ChevronRight, ChevronDown, Search, Download, Upload, X } from 'lucide-react';
import attendanceService from '../services/attendanceService';
import HoverTooltip from './HoverTooltip';
import { COLUMN_TOOLTIPS, OVERTIME_COLUMN_TOOLTIPS, ColumnTooltip } from './timesheetColumnTooltips';
import useIsNarrowScreen from '../hooks/useIsNarrowScreen';
import CollapsibleSection from './shared/CollapsibleSection';
import { useQueryClient } from '@tanstack/react-query';

/** Format cell tooltip with note + audit info */
const formatCellTooltip = (cell: TimesheetCell | undefined): string | undefined => {
  if (!cell) return undefined;
  const parts: string[] = [];
  if (cell.note) parts.push(`Ghi chú: ${cell.note}`);
  if (cell.updatedByName) {
    const updatedAt = cell.updatedAt ? new Date(cell.updatedAt).toLocaleString('vi-VN') : '';
    parts.push(`Cập nhật bởi: ${cell.updatedByName}${updatedAt ? ` (${updatedAt})` : ''}`);
  }
  return parts.length > 0 ? parts.join('\n') : undefined;
};

/** Renders header text wrapped in a hover tooltip when a tooltip entry exists. */
const HeaderLabel: React.FC<{ tip?: ColumnTooltip; children: React.ReactNode }> = ({ tip, children }) => {
  if (!tip) return <>{children}</>;
  return (
    <HoverTooltip title={tip.title} description={tip.description} className="cursor-help underline decoration-dotted decoration-gray-400 underline-offset-2">
      {children}
    </HoverTooltip>
  );
};

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
  const [isImporting, setIsImporting] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ empIndex: number; dayIndex: number } | null>(null);
  const [selectedRange, setSelectedRange] = useState<{ start: { empIndex: number; dayIndex: number }; end: { empIndex: number; dayIndex: number } } | null>(null);
  const isNarrow = useIsNarrowScreen();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

    setEditingCell(null);
    try {
      // Allow empty code to delete the cell (backend will handle it)
      await upsertCell.mutateAsync({ employeeId: empId, date, code: code || '', note: note || undefined });
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
      return;
    }

    setIsImporting(true);
    try {
      const result = await attendanceService.importFromExcelCalendar(file, month, year);

      // Show result
      if (result.errors.length > 0) {
        toast.error(
          <div>
            <div className="font-semibold">Import thành công {result.imported} ô, bỏ qua {result.skipped} ô</div>
            <div className="text-xs mt-1 max-h-32 overflow-y-auto">
              {result.errors.slice(0, 5).map((err, i) => (
                <div key={i}>Dòng {err.row} ({err.employee}): {err.message}</div>
              ))}
              {result.errors.length > 5 && <div>...và {result.errors.length - 5} lỗi khác</div>}
            </div>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.success(`Import thành công ${result.imported} ô chấm công`);
      }

      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ['monthlyTimesheet', month, year] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể import file Excel');
    } finally {
      setIsImporting(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    standardWorkDays: 26, otRateWeekday: 1.5,
    otRateSunday: 2, otRateHoliday: 3,
  };
  const summaries = timesheetData?.summaries ?? {};
  const overrides = timesheetData?.overrides ?? {};

  const handleOverrideSave = useCallback((data: { employeeId: string; month: number; year: number; fieldKey: string; value: string }) => {
    upsertOverride.mutate(data);
  }, [upsertOverride]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!focusedCell || editingCell || !timesheetData?.rows) return;

    const rows = timesheetData.rows;
    const { empIndex, dayIndex } = focusedCell;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (empIndex > 0) setFocusedCell({ empIndex: empIndex - 1, dayIndex });
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (empIndex < rows.length - 1) setFocusedCell({ empIndex: empIndex + 1, dayIndex });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (dayIndex > 0) setFocusedCell({ empIndex, dayIndex: dayIndex - 1 });
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (dayIndex < daysInMonth - 1) setFocusedCell({ empIndex, dayIndex: dayIndex + 1 });
        break;
      case 'Enter':
        e.preventDefault();
        // Open edit modal for focused cell
        const emp = rows[empIndex];
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayIndex + 1).padStart(2, '0')}`;
        const cell = emp.cells.find(c => c.date === dateStr);
        handleCellClick(emp.employeeId, dateStr, cell?.code || '', cell?.note || '');
        break;
      case 'd':
        // Ctrl+D or Cmd+D: Fill-down
        if ((e.ctrlKey || e.metaKey) && selectedRange) {
          e.preventDefault();
          handleFillDown();
        }
        break;
    }
  }, [focusedCell, editingCell, timesheetData, daysInMonth, month, year, selectedRange]);

  // Paste from clipboard
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!focusedCell || editingCell || !timesheetData?.rows) return;

    e.preventDefault();
    const text = e.clipboardData.getData('text');
    if (!text) return;

    // Parse TSV (Tab-separated values) — Excel/Sheets copy format
    const lines = text.split('\n').filter(l => l.trim());
    const grid = lines.map(line => line.split('\t'));

    const rows = timesheetData.rows;
    const { empIndex, dayIndex } = focusedCell;

    const cellsToUpdate: Array<{ employeeId: string; date: string; code: string; note?: string }> = [];

    for (let r = 0; r < grid.length; r++) {
      const targetEmpIndex = empIndex + r;
      if (targetEmpIndex >= rows.length) break;

      const emp = rows[targetEmpIndex];

      for (let c = 0; c < grid[r].length; c++) {
        const targetDayIndex = dayIndex + c;
        if (targetDayIndex >= daysInMonth) break;

        const code = grid[r][c].trim();
        if (!code) continue;

        // Validate code
        if (!activeCodes.some(ac => ac.code === code)) {
          toast.error(`Mã "${code}" không hợp lệ tại hàng ${targetEmpIndex + 1}, cột ${targetDayIndex + 1}`);
          return;
        }

        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(targetDayIndex + 1).padStart(2, '0')}`;
        cellsToUpdate.push({ employeeId: emp.employeeId, date: dateStr, code });
      }
    }

    // Batch upsert
    if (cellsToUpdate.length === 0) return;

    try {
      await Promise.all(cellsToUpdate.map(c => upsertCell.mutateAsync(c)));
      toast.success(`Đã paste ${cellsToUpdate.length} ô`);
    } catch (err) {
      toast.error('Lỗi khi paste dữ liệu');
    }
  }, [focusedCell, editingCell, timesheetData, daysInMonth, month, year, activeCodes, upsertCell]);

  // Fill-down: fill selected range with focused cell's value
  const handleFillDown = useCallback(async () => {
    if (!focusedCell || !selectedRange || !timesheetData?.rows) return;

    const rows = timesheetData.rows;
    const { start, end } = selectedRange;

    // Get source cell value
    const sourceEmp = rows[focusedCell.empIndex];
    const sourceDateStr = `${year}-${String(month).padStart(2, '0')}-${String(focusedCell.dayIndex + 1).padStart(2, '0')}`;
    const sourceCell = sourceEmp.cells.find(c => c.date === sourceDateStr);
    const sourceCode = sourceCell?.code;

    if (!sourceCode) {
      toast.error('Ô nguồn không có giá trị');
      return;
    }

    const cellsToUpdate: Array<{ employeeId: string; date: string; code: string }> = [];

    for (let ei = Math.min(start.empIndex, end.empIndex); ei <= Math.max(start.empIndex, end.empIndex); ei++) {
      for (let di = Math.min(start.dayIndex, end.dayIndex); di <= Math.max(start.dayIndex, end.dayIndex); di++) {
        // Skip source cell
        if (ei === focusedCell.empIndex && di === focusedCell.dayIndex) continue;

        const emp = rows[ei];
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(di + 1).padStart(2, '0')}`;
        cellsToUpdate.push({ employeeId: emp.employeeId, date: dateStr, code: sourceCode });
      }
    }

    if (cellsToUpdate.length === 0) return;

    try {
      await Promise.all(cellsToUpdate.map(c => upsertCell.mutateAsync(c)));
      toast.success(`Đã fill ${cellsToUpdate.length} ô`);
    } catch (err) {
      toast.error('Lỗi khi fill dữ liệu');
    }
  }, [focusedCell, selectedRange, timesheetData, month, year, upsertCell]);

  return (
    <div className="p-4 space-y-4">
      {/* Header — layout driven by isNarrow so it matches the grid's own breakpoint */}
      <div className={isNarrow ? 'flex flex-col gap-3' : 'flex flex-row flex-wrap items-center justify-between gap-3'}>
        <div className={`flex items-center gap-2 ${isNarrow ? 'justify-center' : 'justify-start'}`}>
          <button onClick={prevMonth} className={`p-1.5 rounded hover:bg-gray-100 flex items-center justify-center ${isNarrow ? 'min-h-[44px] min-w-[44px]' : ''}`}><ChevronLeft size={20} /></button>
          <span className="text-lg font-semibold min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className={`p-1.5 rounded hover:bg-gray-100 flex items-center justify-center ${isNarrow ? 'min-h-[44px] min-w-[44px]' : ''}`}><ChevronRight size={20} /></button>
        </div>
        <div className={isNarrow ? 'flex flex-col gap-2' : 'flex flex-row items-center gap-2'}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Tìm nhân viên..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm ${isNarrow ? 'w-full min-h-[44px]' : 'w-48'}`}
            />
          </div>
          <select
            value={departmentId}
            onChange={e => setDepartmentId(e.target.value)}
            className={`px-3 py-2 border border-gray-300 rounded-md text-sm ${isNarrow ? 'w-full min-h-[44px]' : 'w-auto'}`}
          >
            <option value="">Tất cả bộ phận</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm ${isNarrow ? 'w-full min-h-[44px]' : 'w-auto'}`}
          >
            <Upload size={16} /> {isImporting ? 'Đang import...' : 'Import Excel'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <button onClick={handleExport} className={`flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm ${isNarrow ? 'w-full min-h-[44px]' : 'w-auto'}`}>
            <Download size={16} /> Xuất Excel
          </button>
          <div className="relative group">
            <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600" title="Phím tắt">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-lg shadow-lg p-3 text-xs hidden group-hover:block z-50">
              <div className="font-semibold mb-2">Phím tắt:</div>
              <ul className="space-y-1 text-gray-700">
                <li><kbd className="px-1 py-0.5 bg-gray-100 border rounded">↑ ↓ ← →</kbd> Di chuyển giữa các ô</li>
                <li><kbd className="px-1 py-0.5 bg-gray-100 border rounded">Enter</kbd> Mở modal chỉnh sửa ô đang chọn</li>
                <li><kbd className="px-1 py-0.5 bg-gray-100 border rounded">Shift + Click</kbd> Chọn vùng (range selection)</li>
                <li><kbd className="px-1 py-0.5 bg-gray-100 border rounded">Ctrl/Cmd + D</kbd> Fill-down (điền giá trị ô nguồn vào vùng đã chọn)</li>
                <li><kbd className="px-1 py-0.5 bg-gray-100 border rounded">Ctrl/Cmd + V</kbd> Paste từ clipboard (Excel/Sheets format)</li>
              </ul>
              <div className="mt-2 pt-2 border-t text-gray-500">
                Tip: Click vào grid để focus trước khi dùng phím tắt
              </div>
            </div>
          </div>
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
      ) : isNarrow ? (
        <TimesheetMobileList
          rows={timesheetData?.rows ?? []}
          dayHeaders={dayHeaders}
          summaries={summaries}
          overrides={overrides}
          settings={settings}
          month={month}
          year={year}
          subTab={subTab}
          getCellColor={getCellColor}
          formatHours={formatHours}
          formatMoney={formatMoney}
          onCellClick={handleCellClick}
          onOverrideSave={handleOverrideSave}
        />
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
          gridRef={gridRef}
          handleKeyDown={handleKeyDown}
          handlePaste={handlePaste}
          focusedCell={focusedCell}
          selectedRange={selectedRange}
          setFocusedCell={setFocusedCell}
          setSelectedRange={setSelectedRange}
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
  activeCodes: { id: string; code: string; label?: string; description?: string }[];
  onSave: () => void;
  onCancel: () => void;
  onChange: (s: CellEditorState) => void;
}

/* ---------- Custom attendance-code dropdown (mã - tên, not native <select>) ---------- */
interface CodeSelectProps {
  value: string;
  options: { id: string; code: string; label?: string; description?: string }[];
  onChange: (code: string) => void;
}

const CodeSelect: React.FC<CodeSelectProps> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const selected = options.find(o => o.code === value);
  const selectedName = selected?.label || selected?.description;
  const label = value
    ? `${value}${selectedName ? ` - ${selectedName}` : ''}`
    : 'Chọn mã chấm công';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-300 rounded px-2 py-1.5 text-sm text-left hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{label}</span>
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg py-1">
          <li>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${value === '' ? 'bg-blue-50 font-medium' : 'text-gray-500'}`}
            >
              — Bỏ trống —
            </button>
          </li>
          {options.map(ac => (
            <li key={ac.id}>
              <button
                type="button"
                onClick={() => { onChange(ac.code); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 ${ac.code === value ? 'bg-blue-50 font-medium' : ''}`}
              >
                <span className="font-semibold">{ac.code}</span>
                {(ac.label || ac.description) ? <span className="text-gray-500"> - {ac.label || ac.description}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CellEditorModal: React.FC<CellEditorModalProps> = ({ editingCell, activeCodes, onSave, onCancel, onChange }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onCancel}>
    <div className="bg-white rounded-lg shadow-xl p-4 w-72 space-y-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Chỉnh sửa ô chấm công</h4>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Mã chấm công</label>
        <CodeSelect
          value={editingCell.code}
          options={activeCodes}
          onChange={code => onChange({ ...editingCell, code })}
        />
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

/* ---------- Mobile list (narrow screens) ---------- */

type OverrideSaver = (data: { employeeId: string; month: number; year: number; fieldKey: string; value: string }) => void;

interface MobileOverrideFieldProps {
  label: string;
  employeeId: string;
  fieldKey: string;
  computedValue: string;
  overrideValue: string | undefined;
  month: number;
  year: number;
  onSave: OverrideSaver;
  type?: SummaryCellType;
}

/** Label-above-input override editor. Mirrors EditableSummaryCell's save semantics
 *  (empty or equal-to-computed clears the override) without the <td> wrapper. */
const MobileOverrideField: React.FC<MobileOverrideFieldProps> = ({
  label, employeeId, fieldKey, computedValue, overrideValue, month, year, onSave, type = 'text',
}) => {
  const displayValue = overrideValue !== undefined ? overrideValue : computedValue;
  const isOverridden = overrideValue !== undefined;
  const editValue = type === 'money' ? normalizeNumericString(displayValue) : displayValue;

  const [localValue, setLocalValue] = useState(editValue);
  const isFocusedRef = useRef(false);

  // Saving refetches the timesheet, which pushes a new editValue down. Adopting it
  // mid-typing would discard the keystrokes not yet committed, so only sync when
  // the field is not focused.
  useEffect(() => {
    if (!isFocusedRef.current) setLocalValue(editValue);
  }, [editValue]);

  if (type === 'checkbox') {
    const isChecked = overrideValue !== undefined ? overrideValue === 'x' : computedValue === '✓' || computedValue === 'x';
    return (
      <label className="flex items-center justify-between gap-3 min-h-[44px] px-2 rounded border border-gray-200">
        <span className="text-xs text-gray-600">{label}</span>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onSave({ employeeId, month, year, fieldKey, value: isChecked ? '' : 'x' })}
          className="w-5 h-5 accent-blue-600"
        />
      </label>
    );
  }

  const inputType = type === 'number' || type === 'money' ? 'number' : type === 'date' ? 'date' : 'text';

  const handleBlur = (raw: string) => {
    isFocusedRef.current = false;
    const trimmed = raw.trim();
    const computedNorm = type === 'money' ? normalizeNumericString(computedValue) : computedValue;
    const displayNorm = type === 'money' ? normalizeNumericString(displayValue) : displayValue;
    if (trimmed === displayNorm) return;
    if (trimmed === '' && !isOverridden && computedValue === '') return;
    if (trimmed === computedNorm && isOverridden) {
      onSave({ employeeId, month, year, fieldKey, value: '' });
    } else if (trimmed !== computedNorm || isOverridden) {
      onSave({ employeeId, month, year, fieldKey, value: trimmed });
    }
  };

  return (
    <label className="block">
      <span className="block text-xs text-gray-500 mb-1">{label}</span>
      <input
        type={inputType}
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        onFocus={() => { isFocusedRef.current = true; }}
        onBlur={e => handleBlur(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        step={type === 'number' || type === 'money' ? 'any' : undefined}
        className={`w-full min-h-[44px] px-2 border rounded text-sm ${isOverridden ? 'border-amber-300 bg-amber-50/60 font-medium' : 'border-gray-300'}`}
      />
    </label>
  );
};

interface TimesheetMobileListProps {
  rows: TimesheetRow[];
  dayHeaders: { day: number; weekday: string; isSunday: boolean }[];
  summaries: Record<string, TimesheetSummary>;
  overrides: Record<string, Record<string, string>>;
  settings: TimesheetSettings;
  month: number;
  year: number;
  subTab: SubTab;
  getCellColor: (code?: string) => string;
  formatHours: (v: number) => number | string;
  formatMoney: (v: number) => string;
  onCellClick: (empId: string, date: string, code: string, note: string) => void;
  onOverrideSave: OverrideSaver;
}

const WEEKDAY_HEADS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const TimesheetMobileList: React.FC<TimesheetMobileListProps> = ({
  rows, dayHeaders, summaries, overrides, settings, month, year, subTab,
  getCellColor, formatHours, formatMoney, onCellClick, onOverrideSave,
}) => {
  // Calendar-aligned grid: pad the first week so column N always means weekday N.
  const leadingBlanks = dayHeaders.length ? WEEKDAY_HEADS.indexOf(dayHeaders[0].weekday) : 0;

  if (rows.length === 0) {
    return <div className="text-center py-10 text-gray-500 text-sm">Không có nhân viên nào</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map(row => {
        const s = summaries[row.employeeId];
        const empOvr = overrides[row.employeeId] as Record<string, string> | undefined;
        const mealAllowanceMoney = (s?.mealAllowanceDays ?? 0) * (settings.mealAllowancePerDay ?? 0);
        const overtimeMealMoney = (s?.overtimeMealDays ?? 0) * (settings.overtimeMealAllowance ?? 25000);
        const hourlyRate = Math.round((row.baseSalary || 0) / ((settings.standardWorkDays || 26) * 8));

        return (
          <div key={row.employeeId} className="rounded-lg border border-gray-200 bg-white">
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="font-semibold text-sm text-gray-900">{row.fullName}</div>
              <div className="text-xs text-gray-500">
                {row.employeeCode}
                {row.positionName ? ` · ${row.positionName}` : ''}
                {row.departmentName ? ` · ${row.departmentName}` : ''}
              </div>
            </div>

            <div className="px-3 py-2">
              <div className="grid grid-cols-7 gap-0.5 text-[10px] text-gray-400 mb-0.5">
                {WEEKDAY_HEADS.map(w => <div key={w} className="text-center">{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} className="min-h-[44px]" />)}
                {dayHeaders.map(h => {
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
                  const cell = row.cells.find(c => c.date === dateStr);
                  if (subTab === 'overtime') {
                    const ot = cell?.overtimeHours ?? 0;
                    return (
                      <div
                        key={h.day}
                        className={`min-h-[44px] rounded border flex flex-col items-center justify-center leading-tight ${h.isSunday ? 'border-red-200 bg-red-50/50' : 'border-gray-200'} ${ot > 0 ? 'text-orange-700 font-medium' : 'text-gray-300'}`}
                      >
                        <span className="text-[10px] text-gray-400">{h.day}</span>
                        <span className="text-xs">{ot > 0 ? ot : ''}</span>
                      </div>
                    );
                  }
                  return (
                    <button
                      key={h.day}
                      type="button"
                      onClick={() => onCellClick(row.employeeId, dateStr, cell?.code || '', cell?.note || '')}
                      title={formatCellTooltip(cell)}
                      className={`relative min-h-[44px] rounded border flex flex-col items-center justify-center leading-tight active:bg-blue-50 ${h.isSunday ? 'border-red-200' : 'border-gray-200'} ${getCellColor(cell?.code)}`}
                    >
                      <span className="text-[10px] text-gray-400">{h.day}</span>
                      <span className="text-xs">{cell?.code || ''}</span>
                      {cell?.note && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-3 pb-3 space-y-2">
              {subTab === 'attendance' ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <MobileOverrideField label="Giờ lương" employeeId={row.employeeId} fieldKey="payableHours" computedValue={String(formatHours(s?.payableHours ?? 0))} overrideValue={empOvr?.payableHours} month={month} year={year} onSave={onOverrideSave} type="number" />
                    <MobileOverrideField label="Làm CT" employeeId={row.employeeId} fieldKey="officialWorkDays" computedValue={String(formatHours(s?.officialWorkDays ?? 0))} overrideValue={empOvr?.officialWorkDays} month={month} year={year} onSave={onOverrideSave} type="number" />
                    <MobileOverrideField label="Nghỉ tính lương" employeeId={row.employeeId} fieldKey="leaveHoursPayable" computedValue={String(formatHours(s?.leaveHoursPayable ?? 0))} overrideValue={empOvr?.leaveHoursPayable} month={month} year={year} onSave={onOverrideSave} type="number" />
                    <MobileOverrideField label="Nghỉ lễ/CĐ" employeeId={row.employeeId} fieldKey="leaveHoursHolidayRegime" computedValue={String(formatHours(s?.leaveHoursHolidayRegime ?? 0))} overrideValue={empOvr?.leaveHoursHolidayRegime} month={month} year={year} onSave={onOverrideSave} type="number" />
                    <MobileOverrideField label="Nghỉ không lương" employeeId={row.employeeId} fieldKey="leaveHoursUnpaid" computedValue={String(formatHours(s?.leaveHoursUnpaid ?? 0))} overrideValue={empOvr?.leaveHoursUnpaid} month={month} year={year} onSave={onOverrideSave} type="number" />
                    <MobileOverrideField label="Trễ/Sớm" employeeId={row.employeeId} fieldKey="lateEarlyHours" computedValue={String(formatHours(s?.lateEarlyHours ?? 0))} overrideValue={empOvr?.lateEarlyHours} month={month} year={year} onSave={onOverrideSave} type="number" />
                  </div>
                  <MobileOverrideField label="Chuyên cần" employeeId={row.employeeId} fieldKey="diligence" computedValue={s?.diligence ? '✓' : ''} overrideValue={empOvr?.diligence} month={month} year={year} onSave={onOverrideSave} type="checkbox" />
                  <CollapsibleSection title="Chỉ tiêu khác">
                    <div className="grid grid-cols-2 gap-2">
                      <MobileOverrideField label="Thử việc" employeeId={row.employeeId} fieldKey="probationDays" computedValue={String(formatHours(s?.probationDays ?? 0))} overrideValue={empOvr?.probationDays} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Ký nhận" employeeId={row.employeeId} fieldKey="signature" computedValue="" overrideValue={empOvr?.signature} month={month} year={year} onSave={onOverrideSave} type="text" />
                      <MobileOverrideField label="Cơm NC" employeeId={row.employeeId} fieldKey="mealAllowanceMoney" computedValue={mealAllowanceMoney ? formatMoney(mealAllowanceMoney) : ''} overrideValue={empOvr?.mealAllowanceMoney} month={month} year={year} onSave={onOverrideSave} type="money" />
                      <MobileOverrideField label="NT 150%" employeeId={row.employeeId} fieldKey="otWeekday" computedValue={String(formatHours(s?.otWeekday ?? 0))} overrideValue={empOvr?.otWeekday} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="CN 200%" employeeId={row.employeeId} fieldKey="otSunday" computedValue={String(formatHours(s?.otSunday ?? 0))} overrideValue={empOvr?.otSunday} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Lễ 300%" employeeId={row.employeeId} fieldKey="otHoliday" computedValue={String(formatHours(s?.otHoliday ?? 0))} overrideValue={empOvr?.otHoliday} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Số KM" employeeId={row.employeeId} fieldKey="kmDistance" computedValue={String(row.kmDistance || '')} overrideValue={empOvr?.kmDistance} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Xăng xe" employeeId={row.employeeId} fieldKey="fuelAmount" computedValue={s?.fuelAmount ? formatMoney(s.fuelAmount) : ''} overrideValue={empOvr?.fuelAmount} month={month} year={year} onSave={onOverrideSave} type="money" />
                      <MobileOverrideField label="Cơm TC" employeeId={row.employeeId} fieldKey="overtimeMealMoney" computedValue={overtimeMealMoney ? formatMoney(overtimeMealMoney) : ''} overrideValue={empOvr?.overtimeMealMoney} month={month} year={year} onSave={onOverrideSave} type="money" />
                      <MobileOverrideField label="Phép TT" employeeId={row.employeeId} fieldKey="leaveBalanceCarryOver" computedValue={String(row.leaveBalanceCarryOver ?? '')} overrideValue={empOvr?.leaveBalanceCarryOver} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Phép HT" employeeId={row.employeeId} fieldKey="leaveCurrentBalance" computedValue={s?.leaveCurrentBalance != null ? String(s.leaveCurrentBalance) : ''} overrideValue={empOvr?.leaveCurrentBalance} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Tính cơm" employeeId={row.employeeId} fieldKey="mealCount" computedValue={s?.mealCount != null ? String(s.mealCount) : ''} overrideValue={empOvr?.mealCount} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Giờ CC KL" employeeId={row.employeeId} fieldKey="unpaidDeductHours" computedValue="" overrideValue={empOvr?.unpaidDeductHours} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Truy thu ứng phép" employeeId={row.employeeId} fieldKey="leaveAdvanceRecovery" computedValue="" overrideValue={empOvr?.leaveAdvanceRecovery} month={month} year={year} onSave={onOverrideSave} type="money" />
                      <MobileOverrideField label="Phép bù" employeeId={row.employeeId} fieldKey="leaveCompensatory" computedValue={s?.leaveCompensatory != null ? String(s.leaveCompensatory) : ''} overrideValue={empOvr?.leaveCompensatory} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Cơm CN" employeeId={row.employeeId} fieldKey="sundayMeal" computedValue={s?.sundayMeal != null ? String(s.sundayMeal) : ''} overrideValue={empOvr?.sundayMeal} month={month} year={year} onSave={onOverrideSave} type="number" />
                      <MobileOverrideField label="Ngày nghỉ việc" employeeId={row.employeeId} fieldKey="resignDate" computedValue="" overrideValue={empOvr?.resignDate} month={month} year={year} onSave={onOverrideSave} type="date" />
                      <MobileOverrideField label="Ghi chú" employeeId={row.employeeId} fieldKey="note" computedValue="" overrideValue={empOvr?.note} month={month} year={year} onSave={onOverrideSave} type="text" />
                    </div>
                  </CollapsibleSection>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <MobileOverrideField label={`TC ngày thường (${settings.otRateWeekday * 100}%)`} employeeId={row.employeeId} fieldKey="otWeekday" computedValue={String(formatHours(s?.otWeekday ?? 0))} overrideValue={empOvr?.otWeekday} month={month} year={year} onSave={onOverrideSave} type="number" />
                    <MobileOverrideField label={`TC Chủ nhật (${settings.otRateSunday * 100}%)`} employeeId={row.employeeId} fieldKey="otSunday" computedValue={String(formatHours(s?.otSunday ?? 0))} overrideValue={empOvr?.otSunday} month={month} year={year} onSave={onOverrideSave} type="number" />
                    <MobileOverrideField label={`TC ngày Lễ (${settings.otRateHoliday * 100}%)`} employeeId={row.employeeId} fieldKey="otHoliday" computedValue={String(formatHours(s?.otHoliday ?? 0))} overrideValue={empOvr?.otHoliday} month={month} year={year} onSave={onOverrideSave} type="number" />
                    <MobileOverrideField label="Ngày công tăng ca" employeeId={row.employeeId} fieldKey="otDaysCount" computedValue="" overrideValue={empOvr?.otDaysCount} month={month} year={year} onSave={onOverrideSave} type="number" />
                  </div>
                  <CollapsibleSection title="Chỉ tiêu khác">
                    <div className="grid grid-cols-2 gap-2">
                      <MobileOverrideField label="TC tháng trước" employeeId={row.employeeId} fieldKey="otCarryOver" computedValue="" overrideValue={empOvr?.otCarryOver} month={month} year={year} onSave={onOverrideSave} type="text" />
                      <MobileOverrideField label="Lương tính tăng ca" employeeId={row.employeeId} fieldKey="otSalary" computedValue={s?.otSalary ? formatMoney(s.otSalary) : ''} overrideValue={empOvr?.otSalary} month={month} year={year} onSave={onOverrideSave} type="money" />
                      <MobileOverrideField label="Mức lương theo giờ" employeeId={row.employeeId} fieldKey="hourlyRate" computedValue={hourlyRate ? formatMoney(hourlyRate) : ''} overrideValue={empOvr?.hourlyRate} month={month} year={year} onSave={onOverrideSave} type="money" />
                      <MobileOverrideField label="Tổng thu nhập ngoài giờ" employeeId={row.employeeId} fieldKey="otTotalIncome" computedValue={s?.otTotalIncome ? formatMoney(s.otTotalIncome) : ''} overrideValue={empOvr?.otTotalIncome} month={month} year={year} onSave={onOverrideSave} type="money" />
                      <MobileOverrideField label="Tổng tiền cơm TC" employeeId={row.employeeId} fieldKey="overtimeMealMoney" computedValue={overtimeMealMoney ? formatMoney(overtimeMealMoney) : ''} overrideValue={empOvr?.overtimeMealMoney} month={month} year={year} onSave={onOverrideSave} type="money" />
                    </div>
                  </CollapsibleSection>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

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
  activeCodes: { id: string; code: string; label?: string; description?: string }[];
  getCellColor: (code?: string) => string;
  formatHours: (v: number) => number | string;
  formatMoney: (v: number) => string;
  onCellClick: (empId: string, date: string, code: string, note: string) => void;
  onCellSave: () => void;
  onOverrideSave: (data: { employeeId: string; month: number; year: number; fieldKey: string; value: string }) => void;
  editingState: CellEditorState | null;
  setEditingCell: (s: CellEditorState | null) => void;
  gridRef: React.RefObject<HTMLDivElement>;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  focusedCell: { empIndex: number; dayIndex: number } | null;
  selectedRange: { start: { empIndex: number; dayIndex: number }; end: { empIndex: number; dayIndex: number } } | null;
  setFocusedCell: (cell: { empIndex: number; dayIndex: number } | null) => void;
  setSelectedRange: (range: { start: { empIndex: number; dayIndex: number }; end: { empIndex: number; dayIndex: number } } | null) => void;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  rows, dayHeaders, summaries, overrides, settings, month, year, getCellColor, formatHours, formatMoney, onCellClick, onOverrideSave,
  gridRef, handleKeyDown, handlePaste, focusedCell, selectedRange, setFocusedCell, setSelectedRange,
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
    <div
      ref={gridRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className="overflow-auto border rounded-lg max-h-[calc(100vh-260px)] focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <table className="text-xs border-collapse min-w-max">
        <thead className="sticky top-0 z-20 bg-gray-50">
          {/* Group header row */}
          <tr>
            <th colSpan={6} className="border px-1 py-0.5 bg-gray-100 text-center text-[10px] sticky left-0 z-30" style={{ width: idTotalW, minWidth: idTotalW }}>Thông tin nhân viên</th>
            <th colSpan={dayHeaders.length} className="border px-1 py-0.5 bg-gray-100 text-center text-[10px]">Ngày trong tháng</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.payableHours}>Giờ lương</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.officialWorkDays}>Làm CT</HeaderLabel></th>
            <th colSpan={3} className="border px-1 py-0.5 bg-yellow-50 text-center text-[10px]">Số giờ nghỉ</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.probationDays}>Thử việc</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.lateEarlyHours}>Trễ/Sớm</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.signature}>Ký nhận</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.mealAllowanceMoney}>Cơm NC</HeaderLabel></th>
            <th colSpan={5} className="border px-1 py-0.5 bg-orange-50 text-center text-[10px]">Tăng ca</th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.kmDistance}>Số KM</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.fuelAmount}>Xăng xe</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.overtimeMealMoney}>Cơm TC</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.leaveBalanceCarryOver}>Phép TT</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.leaveCurrentBalance}>Phép HT</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.note}>Ghi chú</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.diligence}>Chuyên cần</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.mealCount}>Tính cơm</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.unpaidDeductHours}>Giờ CC KL</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.leaveAdvanceRecovery}>Truy thu ứng phép</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.leaveCompensatory}>Phép bù</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.sundayMeal}>Cơm CN</HeaderLabel></th>
            <th rowSpan={2} className="border px-1 py-1 bg-gray-50 text-center text-[10px] whitespace-nowrap"><HeaderLabel tip={COLUMN_TOOLTIPS.resignDate}>Ngày nghỉ việc</HeaderLabel></th>
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
            <th className="border px-1 py-1 min-w-[44px] text-center bg-yellow-50"><HeaderLabel tip={COLUMN_TOOLTIPS.leaveHoursPayable}>Tính lương</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-yellow-50"><HeaderLabel tip={COLUMN_TOOLTIPS.leaveHoursHolidayRegime}>Lễ/CĐ</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-yellow-50"><HeaderLabel tip={COLUMN_TOOLTIPS.leaveHoursUnpaid}>Không lương</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-orange-50"><HeaderLabel tip={COLUMN_TOOLTIPS.otWeekday}>NT 150%</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-orange-50"><HeaderLabel tip={COLUMN_TOOLTIPS.otSunday}>CN 200%</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[44px] text-center bg-orange-50"><HeaderLabel tip={COLUMN_TOOLTIPS.otHoliday}>Lễ 300%</HeaderLabel></th>
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
                {dayHeaders.map((h, dayIdx) => {
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
                  const cell = row.cells.find(c => c.date === dateStr);
                  const isFocused = focusedCell?.empIndex === idx && focusedCell?.dayIndex === dayIdx;
                  const isInSelection = selectedRange &&
                    idx >= Math.min(selectedRange.start.empIndex, selectedRange.end.empIndex) &&
                    idx <= Math.max(selectedRange.start.empIndex, selectedRange.end.empIndex) &&
                    dayIdx >= Math.min(selectedRange.start.dayIndex, selectedRange.end.dayIndex) &&
                    dayIdx <= Math.max(selectedRange.start.dayIndex, selectedRange.end.dayIndex);

                  return (
                    <td
                      key={h.day}
                      className={`border px-0.5 py-0.5 text-center cursor-pointer relative ${h.isSunday ? 'bg-red-50/50' : ''} ${getCellColor(cell?.code)} ${isFocused ? 'ring-2 ring-blue-600 ring-inset' : ''} ${isInSelection ? 'bg-blue-100/50' : ''}`}
                      onClick={() => {
                        setFocusedCell({ empIndex: idx, dayIndex: dayIdx });
                        onCellClick(row.employeeId, dateStr, cell?.code || '', cell?.note || '');
                      }}
                      onMouseDown={(e) => {
                        if (e.shiftKey && focusedCell) {
                          // Shift+click: extend selection
                          e.preventDefault();
                          setSelectedRange({
                            start: focusedCell,
                            end: { empIndex: idx, dayIndex: dayIdx },
                          });
                        } else {
                          // Regular click: set focus
                          setFocusedCell({ empIndex: idx, dayIndex: dayIdx });
                          setSelectedRange(null);
                        }
                      }}
                      title={formatCellTooltip(cell)}
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
                <EditableSummaryCell employeeId={row.employeeId} fieldKey="otSunday" computedValue={String(formatHours(s?.otSunday ?? 0))} overrideValue={empOvr?.otSunday} month={month} year={year} onSave={onOverrideSave} type="number" className="bg-orange-50/50" />
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
    acc.otSalary += val('otSalary', s?.otSalary ?? 0);
    acc.otTotalIncome += val('otTotalIncome', s?.otTotalIncome ?? 0);
    acc.otDaysCount += val('otDaysCount', 0);
    acc.overtimeMealMoney += val('overtimeMealMoney', (s?.overtimeMealDays ?? 0) * (settings.overtimeMealAllowance ?? 25000));
    return acc;
  }, { otWeekday: 0, otSunday: 0, otHoliday: 0, otSalary: 0, otTotalIncome: 0, otDaysCount: 0, overtimeMealMoney: 0 });

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
            <th className="border px-1 py-1 min-w-[60px] bg-gray-50"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.otCarryOver}>TC tháng trước</HeaderLabel></th>
            {dayHeaders.map(h => (
              <th key={h.day} className={`border px-0.5 py-1 min-w-[28px] text-center ${h.isSunday ? 'bg-red-50 text-red-600' : 'bg-gray-50'}`}>
                <div>{h.day}</div>
                <div className="font-normal text-[10px]">{h.weekday}</div>
              </th>
            ))}
            <th className="border px-1 py-1 min-w-[70px] text-center align-bottom"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.otWeekday}>Số giờ tăng ca ngày thường</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[60px] text-center align-bottom"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.otSunday}>Số giờ tăng ca CN</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[60px] text-center align-bottom"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.otHoliday}>Số giờ tăng ca Lễ</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[80px] text-center align-bottom"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.otSalary}>Lương tính tăng ca</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[80px] text-center align-bottom"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.hourlyRate}>Mức lương theo giờ</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[85px] text-center align-bottom"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.otTotalIncome}>Tổng Thu nhập ngoài giờ</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[60px] text-center align-bottom"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.otDaysCount}>Ngày công tăng ca</HeaderLabel></th>
            <th className="border px-1 py-1 min-w-[75px] text-center align-bottom"><HeaderLabel tip={OVERTIME_COLUMN_TOOLTIPS.overtimeMealMoney}>Tổng Tiền cơm TC</HeaderLabel></th>
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
