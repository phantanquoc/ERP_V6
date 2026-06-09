import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCcw,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react';
import Modal from './Modal';
import { IndividualAttendanceRecord } from '@services/attendanceService';
import { useEmployeeAttendanceHistory } from '@hooks/useAttendance';

interface AttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  employeeName?: string;
}

type QuickRangePreset = 'last7Days' | 'thisMonth' | 'lastMonth' | 'custom';

interface DateRangeValue {
  startDate: string;
  endDate: string;
}

interface GroupedAttendanceDay {
  date: string;
  records: IndividualAttendanceRecord[];
  totalHours: number;
  overtimeHours: number;
  firstCheckIn: string | null;
  lastCheckOut: string | null;
  lateCount: number;
}

const formatDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildRangeFromPreset = (preset: QuickRangePreset): DateRangeValue => {
  const now = new Date();

  if (preset === 'last7Days') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return {
      startDate: formatDateInputValue(start),
      endDate: formatDateInputValue(now),
    };
  }

  if (preset === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      startDate: formatDateInputValue(start),
      endDate: formatDateInputValue(end),
    };
  }

  if (preset === 'custom') {
    return {
      startDate: formatDateInputValue(now),
      endDate: formatDateInputValue(now),
    };
  }

  return {
    startDate: formatDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: formatDateInputValue(now),
  };
};

const formatDisplayDate = (date: string): string => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN', {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});


const formatTime = (value: string | null): string => {
  if (!value) return '--:--';

  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatHours = (value: number): string => `${value.toFixed(1)} giờ`;

const getStatusLabel = (status: IndividualAttendanceRecord['status']): string => {
  switch (status) {
    case 'PRESENT':
      return 'Đúng giờ';
    case 'LATE':
      return 'Đi muộn';
    case 'ABSENT':
      return 'Vắng mặt';
    case 'ON_LEAVE':
      return 'Nghỉ phép';
    case 'OVERTIME':
      return 'Tăng ca';
    default:
      return status;
  }
};

const getStatusClasses = (status: IndividualAttendanceRecord['status']): string => {
  switch (status) {
    case 'PRESENT':
      return 'bg-emerald-100 text-emerald-700';
    case 'LATE':
      return 'bg-amber-100 text-amber-700';
    case 'ABSENT':
      return 'bg-rose-100 text-rose-700';
    case 'ON_LEAVE':
      return 'bg-violet-100 text-violet-700';
    case 'OVERTIME':
      return 'bg-sky-100 text-sky-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const groupAttendanceByDay = (records: IndividualAttendanceRecord[]): GroupedAttendanceDay[] => {
  const groupedMap = new Map<string, GroupedAttendanceDay>();

  records.forEach((record) => {
    const dateKey = record.attendanceDate.slice(0, 10);
    const existing = groupedMap.get(dateKey);

    if (existing) {
      existing.records.push(record);
      existing.totalHours += record.workHours || 0;
      existing.overtimeHours += record.isOvertime ? record.workHours || 0 : 0;
      existing.lateCount += record.status === 'LATE' ? 1 : 0;

      if (record.checkInTime && (!existing.firstCheckIn || new Date(record.checkInTime) < new Date(existing.firstCheckIn))) {
        existing.firstCheckIn = record.checkInTime;
      }

      if (record.checkOutTime && (!existing.lastCheckOut || new Date(record.checkOutTime) > new Date(existing.lastCheckOut))) {
        existing.lastCheckOut = record.checkOutTime;
      }
      return;
    }

    groupedMap.set(dateKey, {
      date: dateKey,
      records: [record],
      totalHours: record.workHours || 0,
      overtimeHours: record.isOvertime ? record.workHours || 0 : 0,
      firstCheckIn: record.checkInTime,
      lastCheckOut: record.checkOutTime,
      lateCount: record.status === 'LATE' ? 1 : 0,
    });
  });

  return Array.from(groupedMap.values())
    .map((group) => ({
      ...group,
      totalHours: Number(group.totalHours.toFixed(2)),
      overtimeHours: Number(group.overtimeHours.toFixed(2)),
      records: [...group.records].sort((a, b) => {
        const timeA = a.checkInTime || a.checkOutTime || a.attendanceDate;
        const timeB = b.checkInTime || b.checkOutTime || b.attendanceDate;
        return new Date(timeA).getTime() - new Date(timeB).getTime();
      }),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}) => {
  const [preset, setPreset] = useState<QuickRangePreset>('thisMonth');
  const [range, setRange] = useState<DateRangeValue>(() => buildRangeFromPreset('thisMonth'));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Calendar display month: use endDate for presets like "7 ngày" that may cross month boundary
  const calendarRefDate = preset === 'last7Days' ? range.endDate : range.startDate;
  const calendarYear = parseInt(calendarRefDate.slice(0, 4), 10);
  const calendarMonth = parseInt(calendarRefDate.slice(5, 7), 10) - 1;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextRange = buildRangeFromPreset('thisMonth');
    setPreset('thisMonth');
    setRange(nextRange);
    setSelectedDay(null);
  }, [isOpen]);

  const {
    data: records = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useEmployeeAttendanceHistory(employeeId, range.startDate, range.endDate, isOpen);

  const groupedDays = groupAttendanceByDay(records);
  const workedDays = groupedDays.filter((group) =>
    group.records.some((record) => record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'OVERTIME')
  ).length;
  const totalHours = records.reduce((sum, record) => sum + (record.workHours || 0), 0);
  const lateDays = groupedDays.filter((group) => group.lateCount > 0).length;
  const overtimeHours = records
    .filter((record) => record.isOvertime)
    .reduce((sum, record) => sum + (record.workHours || 0), 0);

  const applyPreset = (nextPreset: QuickRangePreset) => {
    setPreset(nextPreset);
    setRange((currentRange) => {
      if (nextPreset === 'custom') {
        return currentRange;
      }

      return buildRangeFromPreset(nextPreset);
    });
    setSelectedDay(null);
  };

  const handleCustomDateChange = (field: keyof DateRangeValue, value: string) => {
    setPreset('custom');
    setRange((currentRange) => ({
      ...currentRange,
      [field]: value,
    }));
    setSelectedDay(null);
  };

  const navigateMonth = (direction: -1 | 1) => {
    const currentYear = parseInt(range.startDate.slice(0, 4), 10);
    const currentMonth = parseInt(range.startDate.slice(5, 7), 10) - 1;
    const targetDate = new Date(currentYear, currentMonth + direction, 1);
    const firstDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
    setPreset('custom');
    setRange({
      startDate: formatDateInputValue(firstDay),
      endDate: formatDateInputValue(lastDay),
    });
    setSelectedDay(null);
  };

  const errorMessage = error instanceof Error ? error.message : 'Không thể tải dữ liệu điểm danh';

  // Build a Map<YYYY-MM-DD, GroupedAttendanceDay> for O(1) calendar lookup
  const dayMap = new Map<string, GroupedAttendanceDay>();
  groupedDays.forEach((g) => dayMap.set(g.date, g));

  // Calendar grid cells (6 rows × 7 cols, Monday-first)
  const firstOfMonth = new Date(calendarYear, calendarMonth, 1);
  // getDay(): 0=Sun,1=Mon,...6=Sat → convert to Mon=0 offset
  const rawDow = firstOfMonth.getDay();
  const startOffset = rawDow === 0 ? 6 : rawDow - 1;
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const totalCells = 42; // 6 rows × 7

  const calendarCells: Array<{ dateStr: string; inMonth: boolean }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - startOffset + 1;
    const cellDate = new Date(calendarYear, calendarMonth, dayNumber);
    calendarCells.push({
      dateStr: formatDateInputValue(cellDate),
      inMonth: dayNumber >= 1 && dayNumber <= daysInMonth,
    });
  }

  const todayStr = formatDateInputValue(new Date());

  // Unique statuses per day for dots
  const getStatusDots = (dateStr: string): IndividualAttendanceRecord['status'][] => {
    const group = dayMap.get(dateStr);
    if (!group) return [];
    const unique = new Set(group.records.map((r) => r.status));
    return Array.from(unique);
  };

  const statusDotColor: Record<string, string> = {
    PRESENT: 'bg-emerald-500',
    LATE: 'bg-amber-500',
    OVERTIME: 'bg-sky-500',
    ON_LEAVE: 'bg-violet-500',
    ABSENT: 'bg-rose-500',
  };

  const legend: Array<{ status: IndividualAttendanceRecord['status']; label: string; color: string }> = [
    { status: 'PRESENT', label: 'Đúng giờ', color: 'bg-emerald-500' },
    { status: 'LATE', label: 'Đi muộn', color: 'bg-amber-500' },
    { status: 'OVERTIME', label: 'Tăng ca', color: 'bg-sky-500' },
    { status: 'ON_LEAVE', label: 'Nghỉ phép', color: 'bg-violet-500' },
    { status: 'ABSENT', label: 'Vắng mặt', color: 'bg-rose-500' },
  ];

  const selectedGroup = selectedDay ? dayMap.get(selectedDay) : null;

  const monthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop closeOnBackdrop={true} className="max-w-none">
      <div
        className="relative flex h-[calc(100vh-2rem)] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-white px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Dữ liệu điểm danh</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {employeeName ? `Theo dõi lịch sử quẹt thẻ của ${employeeName}` : 'Theo dõi lịch sử quẹt thẻ của bạn'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start">
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'last7Days', label: '7 ngày gần đây' },
                { key: 'thisMonth', label: 'Tháng này' },
                { key: 'lastMonth', label: 'Tháng trước' },
                { key: 'custom', label: 'Tùy chọn' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => applyPreset(item.key as QuickRangePreset)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    preset === item.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-600">
                Từ ngày
                <input
                  type="date"
                  value={range.startDate}
                  onChange={(event) => handleCustomDateChange('startDate', event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400"
                />
              </label>
              <label className="flex flex-1 flex-col gap-2 text-sm font-medium text-slate-600">
                Đến ngày
                <input
                  type="date"
                  value={range.endDate}
                  min={range.startDate}
                  onChange={(event) => handleCustomDateChange('endDate', event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition focus:border-blue-400"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Ngày công',
                value: `${workedDays} ngày`,
                icon: <CalendarDays className="h-5 w-5" />,
                tone: 'bg-emerald-100 text-emerald-700',
              },
              {
                label: 'Tổng giờ',
                value: formatHours(totalHours),
                icon: <Clock3 className="h-5 w-5" />,
                tone: 'bg-blue-100 text-blue-700',
              },
              {
                label: 'Đi muộn',
                value: `${lateDays} ngày`,
                icon: <Timer className="h-5 w-5" />,
                tone: 'bg-amber-100 text-amber-700',
              },
              {
                label: 'Tăng ca',
                value: formatHours(overtimeHours),
                icon: <TrendingUp className="h-5 w-5" />,
                tone: 'bg-sky-100 text-sky-700',
              },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${card.tone}`}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Calendar header with month navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tháng trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-base font-semibold capitalize text-slate-900">{monthLabel}</h3>
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tháng sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center px-6 py-12">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                  <p className="mt-4 text-sm text-slate-500">Đang tải dữ liệu điểm danh...</p>
                </div>
              </div>
            ) : isError ? (
              <div className="flex min-h-[320px] items-center justify-center px-6 py-12">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-slate-900">Không thể tải dữ liệu</h4>
                  <p className="mt-2 text-sm text-slate-500">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Thử lại
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-4 sm:px-6">
                {/* Day-of-week headers */}
                <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                    <div key={d} className="py-2">{d}</div>
                  ))}
                </div>

                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map(({ dateStr, inMonth }) => {
                    const dots = inMonth ? getStatusDots(dateStr) : [];
                    const isToday = dateStr === todayStr;
                    const isSelected = dateStr === selectedDay;
                    const hasData = dots.length > 0;
                    const dayNum = parseInt(dateStr.slice(8, 10), 10);

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={!inMonth}
                        onClick={() => {
                          if (inMonth) {
                            setSelectedDay(isSelected ? null : dateStr);
                          }
                        }}
                        className={[
                          'flex min-h-[48px] flex-col items-center justify-start rounded-xl p-1 transition sm:min-h-[64px]',
                          !inMonth ? 'opacity-20' : '',
                          inMonth ? 'cursor-pointer hover:bg-slate-100' : 'cursor-default',
                          isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : '',
                          isToday && !isSelected ? 'ring-2 ring-blue-400 bg-blue-50/30' : '',
                        ].filter(Boolean).join(' ')}
                        aria-label={dateStr}
                      >
                        <span className={`mt-1 text-sm font-medium leading-none ${isToday ? 'text-blue-600 font-bold' : inMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                          {dayNum}
                        </span>
                        {isToday && !isSelected && (
                          <span className="text-[9px] font-semibold text-blue-500 leading-none">nay</span>
                        )}
                        <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                          {dots.map((status) => (
                            <span
                              key={status}
                              className={`h-2.5 w-2.5 rounded-full ${statusDotColor[status] ?? 'bg-slate-400'} sm:h-3 sm:w-3`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4">
                  {legend.map(({ status, label, color }) => (
                    <div key={status} className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${color}`} aria-hidden="true" />
                      <span className="text-xs font-medium text-slate-600">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day detail panel */}
            {selectedDay && (
              <div className="border-t border-slate-200 px-4 py-4 sm:px-6">
                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                  Chi tiết: {formatDisplayDate(selectedDay)}
                </h4>
                {selectedGroup ? (
                  <>
                    <div className="mb-3 flex flex-wrap gap-3 text-xs">
                      <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
                        Tổng giờ: {formatHours(selectedGroup.totalHours)}
                      </span>
                      {selectedGroup.overtimeHours > 0 && (
                        <span className="rounded-lg bg-sky-50 px-3 py-1.5 font-medium text-sky-700">
                          Tăng ca: {formatHours(selectedGroup.overtimeHours)}
                        </span>
                      )}
                      {selectedGroup.lateCount > 0 && (
                        <span className="rounded-lg bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
                          Đi muộn: {selectedGroup.lateCount} lần
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-medium">Lần</th>
                            <th className="px-4 py-3 font-medium">Giờ vào</th>
                            <th className="px-4 py-3 font-medium">Giờ ra</th>
                            <th className="px-4 py-3 font-medium">Số giờ</th>
                            <th className="px-4 py-3 font-medium">Trạng thái</th>
                            <th className="px-4 py-3 font-medium">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {selectedGroup.records.map((record, index) => (
                            <tr key={record.id}>
                              <td className="px-4 py-3 text-slate-600">#{index + 1}</td>
                              <td className="px-4 py-3 text-slate-700">{formatTime(record.checkInTime)}</td>
                              <td className="px-4 py-3 text-slate-700">{formatTime(record.checkOutTime)}</td>
                              <td className="px-4 py-3 font-medium text-slate-900">{formatHours(record.workHours || 0)}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(record.status)}`}>
                                  {getStatusLabel(record.status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {record.notes || (record.isOvertime ? 'Ca tăng ca' : '')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-sm text-slate-500">Chưa có dữ liệu điểm danh cho ngày này</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AttendanceHistoryModal;
