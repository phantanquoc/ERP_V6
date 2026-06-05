import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
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

const formatShortDate = (date: string): string => new Date(`${date}T00:00:00`).toLocaleDateString('vi-VN');

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
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextRange = buildRangeFromPreset('thisMonth');
    setPreset('thisMonth');
    setRange(nextRange);
    setExpandedDays({});
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
    setExpandedDays({});
  };

  const handleCustomDateChange = (field: keyof DateRangeValue, value: string) => {
    setPreset('custom');
    setRange((currentRange) => ({
      ...currentRange,
      [field]: value,
    }));
    setExpandedDays({});
  };

  const toggleDay = (date: string) => {
    setExpandedDays((current) => ({
      ...current,
      [date]: !current[date],
    }));
  };

  const errorMessage = error instanceof Error ? error.message : 'Không thể tải dữ liệu điểm danh';

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
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Lịch sử quẹt trong ngày</h3>
              <p className="mt-1 text-sm text-slate-500">
                Nhóm theo ngày, nhấn mở rộng để xem từng lần quẹt vào và ra.
              </p>
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
            ) : groupedDays.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center px-6 py-12">
                <div className="max-w-md text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <CalendarDays className="h-7 w-7" />
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-slate-900">Chưa có dữ liệu điểm danh</h4>
                  <p className="mt-2 text-sm text-slate-500">
                    Không tìm thấy bản ghi nào trong khoảng {formatShortDate(range.startDate)} - {formatShortDate(range.endDate)}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50 text-left text-sm text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">Ngày</th>
                      <th className="px-6 py-4 font-medium">Lần quẹt</th>
                      <th className="px-6 py-4 font-medium">Giờ vào đầu</th>
                      <th className="px-6 py-4 font-medium">Giờ ra cuối</th>
                      <th className="px-6 py-4 font-medium">Tổng giờ</th>
                      <th className="px-6 py-4 font-medium">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {groupedDays.map((group) => {
                      const isExpanded = !!expandedDays[group.date];

                      return (
                        <React.Fragment key={group.date}>
                          <tr className="bg-white align-top">
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => toggleDay(group.date)}
                                className="flex items-start gap-3 text-left"
                              >
                                <span className="mt-1 rounded-full bg-slate-100 p-1 text-slate-500">
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </span>
                                <div>
                                  <p className="font-semibold text-slate-900">{formatDisplayDate(group.date)}</p>
                                  <p className="mt-1 text-xs text-slate-500">Nhấn để xem chi tiết từng lần quẹt</p>
                                </div>
                              </button>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-700">{group.records.length} bản ghi</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{formatTime(group.firstCheckIn)}</td>
                            <td className="px-6 py-4 text-sm text-slate-700">{formatTime(group.lastCheckOut)}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">{formatHours(group.totalHours)}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {group.lateCount > 0 && (
                                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                                    {group.lateCount} lần đi muộn
                                  </span>
                                )}
                                {group.overtimeHours > 0 && (
                                  <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                                    Tăng ca {formatHours(group.overtimeHours)}
                                  </span>
                                )}
                                {group.lateCount === 0 && group.overtimeHours === 0 && (
                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                                    Điểm danh bình thường
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50">
                              <td colSpan={6} className="px-6 py-4">
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                  <table className="min-w-full">
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
                                    <tbody className="divide-y divide-slate-100">
                                      {group.records.map((record, index) => (
                                        <tr key={record.id}>
                                          <td className="px-4 py-3 text-sm text-slate-600">#{index + 1}</td>
                                          <td className="px-4 py-3 text-sm text-slate-700">{formatTime(record.checkInTime)}</td>
                                          <td className="px-4 py-3 text-sm text-slate-700">{formatTime(record.checkOutTime)}</td>
                                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatHours(record.workHours || 0)}</td>
                                          <td className="px-4 py-3">
                                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(record.status)}`}>
                                              {getStatusLabel(record.status)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm text-slate-600">
                                            {record.notes || (record.isOvertime ? 'Ca tăng ca' : 'Không có ghi chú')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
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
        </div>
      </div>
    </Modal>
  );
};

export default AttendanceHistoryModal;
