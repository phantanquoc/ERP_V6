import React, { useState, useEffect } from "react";
import {
  Clock,
  Target,
  CheckSquare,
  Calendar,
  FileText,
  Award,
  Activity,
  User,
  Megaphone,
  X,
  ChevronLeft,
  ChevronRight,
  History,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import { getDepartmentDisplayName } from "../utils/permissions";
import { ThemeHeader } from "../components/ThemeHeaders";
import PersonalInfoModal from "../components/PersonalInfoModal";
import AttendanceHistoryModal from "../components/AttendanceHistoryModal";
import LeaveRequestModal from "../components/LeaveRequestModal";
import EmployeeSelfEvaluationModal from "../components/EmployeeSelfEvaluationModal";
import DailyWorkReportListModal from "../components/DailyWorkReportListModal";
import TaskListModal from "../components/TaskListModal";
import WorkPlanListModal from "../components/WorkPlanListModal";
import notificationService, { AppNotification } from "../services/notificationService";
import dailyWorkReportService from "../services/dailyWorkReportService";
import { workPlanService } from "../services/workPlanService";
import leaveRequestService, { LeaveRequest } from "../services/leaveRequestService";
import { useMyTasksCount } from "../hooks";
import { useEmployeeAttendanceHistory } from "../hooks/useAttendance";

// Personal Stats for Employee
const getPersonalStats = (user: any, evaluationNotification?: AppNotification | null, tasksCount?: number, workPlansCount?: number) => {
  const baseStats = [
    {
      label: "Nhiệm vụ",
      value: tasksCount !== undefined ? tasksCount.toString() : "0",
      total: "",
      icon: <Target className="w-5 h-5" />,
      color: "from-blue-500 to-blue-600",
      textColor: "text-blue-600"
    },
    {
      label: "Kế hoạch",
      value: workPlansCount !== undefined ? workPlansCount.toString() : "0",
      total: "",
      icon: <CheckSquare className="w-5 h-5" />,
      color: "from-green-500 to-green-600",
      textColor: "text-green-600"
    },
    {
      label: "Đánh giá",
      value: user?.evaluationScore != null ? `${user.evaluationScore.toFixed(1)}%` : "Chưa có thông tin",
      total: "",
      subtitle: evaluationNotification?.period ? `Đánh giá tháng ${new Date(evaluationNotification.period + '-01').toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' })}` : undefined,
      icon: <Award className="w-5 h-5" />,
      color: evaluationNotification ? "from-red-500 to-red-600" : "from-purple-500 to-purple-600",
      textColor: evaluationNotification ? "text-red-600" : "text-purple-600",
      hasNotification: !!evaluationNotification && !evaluationNotification.isRead
    }
  ];

  return baseStats;
};

// Quick Actions for Employee
const getQuickActions = () => {
  return [
    {
      title: "Dữ liệu điểm danh",
      description: "Xem lịch sử quẹt và thống kê công",
      icon: <Clock className="w-6 h-6" />,
      color: "bg-blue-500",
      action: "attendance"
    },
    {
      title: "Báo cáo công việc",
      description: "Gửi báo cáo hàng ngày",
      icon: <FileText className="w-6 h-6" />,
      color: "bg-green-500",
      action: "report"
    },
    {
      title: "Xin nghỉ phép",
      description: "Đăng ký nghỉ phép",
      icon: <Calendar className="w-6 h-6" />,
      color: "bg-orange-500",
      action: "leave"
    },
    {
      title: "Thông tin cá nhân",
      description: "Xem hồ sơ chi tiết",
      icon: <User className="w-6 h-6" />,
      color: "bg-purple-500",
      action: "profile"
    },
    {
      title: "Lịch sử của tôi",
      description: "Xem lịch sử hoạt động cá nhân",
      icon: <History className="w-6 h-6" />,
      color: "bg-teal-500",
      action: "history"
    }
  ];
};

// Component for Personal Stat Card — neutral shell (grid-cols-3 ~111px on 375px)
const PersonalStatCard: React.FC<{ stat: any; onEvaluationClick?: () => void; onTaskClick?: () => void; onWorkPlanClick?: () => void }> = ({ stat, onEvaluationClick, onTaskClick, onWorkPlanClick }) => (
  <div
    onClick={() => {
      if (stat.label === "Đánh giá" && onEvaluationClick) {
        onEvaluationClick();
      } else if (stat.label === "Nhiệm vụ" && onTaskClick) {
        onTaskClick();
      } else if (stat.label === "Kế hoạch" && onWorkPlanClick) {
        onWorkPlanClick();
      }
    }}
    className={`bg-white rounded-lg shadow-sm border ${stat.hasNotification ? 'border-red-300 bg-red-50' : 'border-gray-200'} p-4 sm:p-5 hover:border-gray-300 hover:shadow-md transition-all duration-200 relative min-w-0 overflow-hidden ${(stat.label === "Đánh giá" || stat.label === "Nhiệm vụ" || stat.label === "Kế hoạch") ? 'cursor-pointer' : ''}`}
  >
    {stat.hasNotification && (
      <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate" title={stat.label}>{stat.label}</p>
        <div className="flex items-baseline space-x-1 sm:space-x-2 min-w-0">
          <p className={`text-sm sm:text-lg font-bold ${stat.hasNotification ? 'text-red-600' : 'text-gray-900'} break-words line-clamp-2 leading-tight`} title={String(stat.value)}>{stat.value}</p>
          {stat.total && (
            <p className="text-sm text-gray-500 flex-shrink-0">/ {stat.total}</p>
          )}
        </div>
        {stat.subtitle && (
          <p className="text-xs text-red-600 mt-1 sm:mt-2 font-medium leading-tight break-words line-clamp-2" title={stat.subtitle}>{stat.subtitle}</p>
        )}
        {stat.hasNotification && stat.label === "Đánh giá" && (
          <button
            onClick={(e) => { e.stopPropagation(); onEvaluationClick?.(); }}
            className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline"
          >
            Làm ngay →
          </button>
        )}
      </div>
      <div className={`hidden sm:flex p-3 rounded-lg bg-gradient-to-r ${stat.color} flex-shrink-0 ml-2`}>
        <div className="text-white">
          {stat.icon}
        </div>
      </div>
    </div>
  </div>
);

// Component for Quick Action Card
const QuickActionCard: React.FC<{
  action: any;
  onProfileClick?: () => void;
  onAttendanceClick?: () => void;
  onLeaveRequestClick?: () => void;
  onDailyReportClick?: () => void;
  onHistoryClick?: () => void;
}> = ({ action, onProfileClick, onAttendanceClick, onLeaveRequestClick, onDailyReportClick, onHistoryClick }) => {
  const handleClick = () => {
    if (action.action === 'profile' && onProfileClick) onProfileClick();
    else if (action.action === 'attendance' && onAttendanceClick) onAttendanceClick();
    else if (action.action === 'leave' && onLeaveRequestClick) onLeaveRequestClick();
    else if (action.action === 'report' && onDailyReportClick) onDailyReportClick();
    else if (action.action === 'history' && onHistoryClick) onHistoryClick();
  };

  return (
    <div
      onClick={handleClick}
      className="relative h-full cursor-pointer rounded-lg border border-gray-200 bg-white p-3 sm:p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md group"
    >
      <div className="flex items-center space-x-3">
        <div className={`rounded-lg p-2 sm:p-3 ${action.color} transition-transform group-hover:scale-110 flex-shrink-0`}>
          <div className="text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
            {action.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold text-gray-900 transition-colors group-hover:text-blue-600 leading-tight">
            {action.title}
          </h3>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-500 leading-tight">{action.description}</p>
        </div>
      </div>
    </div>
  );
};

// Company announcement banner — static UI, dismissible
const CompanyAnnouncementBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="relative bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 flex items-start gap-3">
      <div className="flex-shrink-0 p-2 bg-amber-100 rounded-lg">
        <Megaphone className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0 pr-6">
        <h3 className="text-sm sm:text-base font-semibold text-amber-900">Thông báo từ công ty</h3>
        <p className="text-xs sm:text-sm text-amber-700 mt-0.5">Hiện chưa có thông báo mới</p>
        {/* TODO: integrate with backend announcement API when ready */}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-amber-600 hover:text-amber-900 hover:bg-amber-100 rounded transition-colors"
        aria-label="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Helper to build YYYY-MM-DD string from a Date
const toDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

interface AttendanceMiniCalendarProps {
  employeeId: string;
  onDayClick: (date: Date) => void;
}

// Mini attendance calendar — shows current month with per-day status dots
const AttendanceMiniCalendar: React.FC<AttendanceMiniCalendarProps> = ({ employeeId, onDayClick }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // First and last day of displayed month
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const startDate = toDateString(firstDay);
  const endDate = toDateString(lastDay);

  const { data: records, isLoading } = useEmployeeAttendanceHistory(employeeId, startDate, endDate);

  // Fetch approved leave requests for the current month
  useEffect(() => {
    if (!employeeId) return;
    leaveRequestService.getAllLeaveRequests({ employeeId, status: 'APPROVED', limit: 100 })
      .then(res => {
        // Filter to only leaves overlapping with current month
        const startOfMonth = new Date(firstDay);
        const endOfMonth = new Date(lastDay);
        const filtered = res.data.filter(lv => {
          const lvStart = new Date(lv.startDate.substring(0, 10));
          const lvEnd = new Date(lv.endDate.substring(0, 10));
          return lvStart <= endOfMonth && lvEnd >= startOfMonth;
        });
        setLeaves(filtered);
      })
      .catch(() => {
        // Leave fetch errors are non-critical; keep previous state
      });
  }, [employeeId, currentMonth]);

  // Build set of leave dates for O(1) lookup
  const leaveDateSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const lv of leaves) {
      const start = new Date(lv.startDate.substring(0, 10));
      const end = new Date(lv.endDate.substring(0, 10));
      const cur = new Date(start);
      while (cur <= end) {
        set.add(toDateString(cur));
        cur.setDate(cur.getDate() + 1);
      }
    }
    return set;
  }, [leaves]);

  // Build a map of date-string -> record for quick lookup
  const recordMap = React.useMemo(() => {
    const map: Record<string, typeof records extends (infer T)[] | undefined ? T : never> = {};
    if (records) {
      for (const rec of records) {
        // attendanceDate is a date string like "2026-06-15T..."
        const dateKey = rec.attendanceDate.substring(0, 10);
        // Keep the record with the latest status (LATE > PRESENT priority for dot color)
        if (!map[dateKey] || rec.status === 'LATE') {
          map[dateKey] = rec;
        }
      }
    }
    return map;
  }, [records]);

  // Build calendar grid: weeks starting Monday (ISO)
  // Vietnamese week header: T2 T3 T4 T5 T6 T7 CN
  const weekDayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  // Day-of-week offset: getDay() returns 0=Sun..6=Sat; we want Mon=0..Sun=6
  const dayOfWeekMon = (d: Date) => (d.getDay() + 6) % 7;

  // Build array of cells: leading blanks + days of month
  const leadingBlanks = dayOfWeekMon(firstDay);
  const daysInMonth = lastDay.getDate();
  const totalCells = leadingBlanks + daysInMonth;
  const trailingBlanks = (7 - (totalCells % 7)) % 7;

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = currentMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  // Capitalize first letter
  const monthLabelDisplay = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const todayStr = toDateString(today);

  const getDotColor = (dayDate: Date, isSunday: boolean): string | null => {
    if (isSunday) return null;
    const dateStr = toDateString(dayDate);
    if (dateStr > todayStr) return null; // future
    if (leaveDateSet.has(dateStr)) return 'bg-blue-400'; // approved leave
    const rec = recordMap[dateStr];
    if (!rec) return null; // no record — not marked absent anymore
    if (rec.status === 'LATE') return 'bg-yellow-400'; // late
    if (rec.checkInTime && rec.checkOutTime) return 'bg-green-400'; // complete
    if (rec.checkInTime && !rec.checkOutTime) return 'bg-yellow-400'; // partial
    return null; // default — no dot
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Lịch điểm danh
        </h2>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[110px] text-center">{monthLabelDisplay}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDayHeaders.map(h => (
          <div key={h} className="text-center text-xs font-medium text-gray-500 py-1">
            {h}
          </div>
        ))}
      </div>

      {/* Day cells — swipe affordance: month navigation via 44px nav buttons; future: add touch swipe handlers */}
      <div
        className="grid grid-cols-7 gap-0.5"
        onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStartX === null) return;
          const delta = e.changedTouches[0].clientX - touchStartX;
          if (Math.abs(delta) > 50) {
            if (delta < 0) nextMonth();
            else prevMonth();
          }
          setTouchStartX(null);
        }}
      >
        {/* Leading blanks */}
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div key={`lead-${i}`} className="aspect-square" />
        ))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
          const dateStr = toDateString(dayDate);
          const isSunday = dayDate.getDay() === 0;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;
          const dotColor = getDotColor(dayDate, isSunday);
          const isClickable = !isFuture && !isSunday;

          if (isLoading) {
            return (
              <div
                key={dayNum}
                className="aspect-square flex flex-col items-center justify-center rounded-lg bg-gray-100 animate-pulse"
              />
            );
          }

          return (
            <div
              key={dayNum}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : -1}
              aria-label={isClickable ? `Xem điểm danh ngày ${dateStr}` : undefined}
              onClick={() => isClickable && onDayClick(dayDate)}
              onKeyDown={(e) => {
                if (!isClickable) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDayClick(dayDate);
                }
              }}
              className={[
                'aspect-square flex flex-col items-center justify-center rounded-lg transition-colors min-h-[44px]',
                isToday ? 'ring-2 ring-blue-500' : '',
                isClickable ? 'cursor-pointer hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none' : '',
                isSunday ? 'text-gray-400' : isFuture ? 'text-gray-400' : 'text-gray-800',
              ].join(' ')}
            >
              <span className="text-xs sm:text-sm font-medium leading-none">{dayNum}</span>
              {dotColor && (
                <span className={`w-2 h-2 rounded-full mt-0.5 ${dotColor}`} aria-hidden="true" />
              )}
            </div>
          );
        })}

        {/* Trailing blanks */}
        {Array.from({ length: trailingBlanks }).map((_, i) => (
          <div key={`trail-${i}`} className="aspect-square" />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
          <span className="text-xs text-gray-500">Đủ công</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
          <span className="text-xs text-gray-500">Thiếu/Muộn</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
          <span className="text-xs text-gray-500">Nghỉ phép</span>
        </div>
      </div>
    </div>
  );
};

// Theme headers moved to ../components/ThemeHeaders.tsx

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAttendanceHistoryModalOpen, setIsAttendanceHistoryModalOpen] = useState(false);
  const [isLeaveRequestModalOpen, setIsLeaveRequestModalOpen] = useState(false);
  const [latestEvaluationNotification, setLatestEvaluationNotification] = useState<AppNotification | null>(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [isWorkPlanModalOpen, setIsWorkPlanModalOpen] = useState(false);
  const [workPlansCount, setWorkPlansCount] = useState<number>(0);

  const { data: tasksCount = 0 } = useMyTasksCount();
  const { settings } = useSystemSettings();
  const activeTheme = settings?.activeTheme || 'DEFAULT';

  useEffect(() => {
    if (!user) return;
    loadLatestEvaluationNotification();
    loadRecentReports();
    loadWorkPlansCount();
  }, [user?.id]);

  const loadLatestEvaluationNotification = async () => {
    try {
      const notification = await notificationService.getLatestEvaluationNotification();
      setLatestEvaluationNotification(notification);
    } catch (error) {
      console.error('Error loading evaluation notification:', error);
    }
  };

  const loadRecentReports = async () => {
    try {
      await dailyWorkReportService.getMyReports(1, 5);
    } catch (error) {
      console.error('Error loading recent reports:', error);
    }
  };

  const loadWorkPlansCount = async () => {
    try {
      const response = await workPlanService.getMyWorkPlans(1, 1);
      setWorkPlansCount(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error loading work plans count:', error);
    }
  };

  // Open attendance modal when a calendar day is clicked
  const handleCalendarDayClick = (_date: Date) => {
    setIsAttendanceHistoryModalOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  const departmentName = getDepartmentDisplayName(user.department);
  const personalStats = getPersonalStats(user, latestEvaluationNotification, tasksCount, workPlansCount);
  const quickActions = getQuickActions();

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6">
        {/* Theme Header */}
        <ThemeHeader activeTheme={activeTheme} user={user} departmentName={departmentName} />

        {/* Company Announcement Banner */}
        <CompanyAnnouncementBanner />

        {/* Today hero strip — compact date + quick status, no new API */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 flex items-center gap-3 mb-4 sm:mb-6">
          <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-gray-900">
              Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="text-gray-400 hidden sm:inline">·</span>
            <span className="text-gray-600">{tasksCount} nhiệm vụ · {workPlansCount} kế hoạch</span>
          </div>
        </div>

        {/* Personal Stats — 1 col on mobile, 3 cols from sm to avoid 111px squeeze */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {personalStats.map((stat, index) => (
            <PersonalStatCard
              key={index}
              stat={stat}
              onEvaluationClick={() => setIsEvaluationModalOpen(true)}
              onTaskClick={() => setIsTaskListModalOpen(true)}
              onWorkPlanClick={() => setIsWorkPlanModalOpen(true)}
            />
          ))}
        </div>

        {/* Main Content — vertical stack */}
        <div className="space-y-4 sm:space-y-8">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
              <Activity className="w-6 h-6 text-blue-600 mr-2" />
              Thao tác nhanh
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {quickActions.map((action, index) => (
                <QuickActionCard
                  key={index}
                  action={action}
                  onProfileClick={() => setIsProfileModalOpen(true)}
                  onAttendanceClick={() => setIsAttendanceHistoryModalOpen(true)}
                  onLeaveRequestClick={() => setIsLeaveRequestModalOpen(true)}
                  onDailyReportClick={() => setIsDailyReportModalOpen(true)}
                  onHistoryClick={() => navigate('/my-history')}
                />
              ))}
            </div>
          </div>

          {/* Mini Attendance Calendar */}
          {user.employeeId && (
            <AttendanceMiniCalendar
              employeeId={user.employeeId}
              onDayClick={handleCalendarDayClick}
            />
          )}
        </div>

        {/* Personal Info Modal */}
        <PersonalInfoModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />

        <AttendanceHistoryModal
          isOpen={isAttendanceHistoryModalOpen}
          onClose={() => setIsAttendanceHistoryModalOpen(false)}
          employeeId={user.employeeId}
          employeeName={`${user.lastName} ${user.firstName}`.trim()}
        />

        {/* Leave Request Modal */}
        <LeaveRequestModal
          isOpen={isLeaveRequestModalOpen}
          onClose={() => setIsLeaveRequestModalOpen(false)}
          showBackdrop={true}
        />

        {/* Employee Self Evaluation Modal */}
        <EmployeeSelfEvaluationModal
          isOpen={isEvaluationModalOpen}
          onClose={() => setIsEvaluationModalOpen(false)}
          evaluationId={latestEvaluationNotification?.evaluationId || null}
          notificationId={latestEvaluationNotification?.id}
          evaluationPeriod={latestEvaluationNotification?.period || null}
          employeeId={user?.employeeId || null}
          month={new Date().getMonth() + 1}
          year={new Date().getFullYear()}
          onEvaluationCreated={(newId) => {
            setLatestEvaluationNotification(prev => prev ? { ...prev, evaluationId: newId } : null);
          }}
        />

        {/* Daily Work Report List Modal */}
        <DailyWorkReportListModal
          isOpen={isDailyReportModalOpen}
          onClose={() => {
            setIsDailyReportModalOpen(false);
            loadRecentReports();
          }}
        />

        {/* Task List Modal */}
        <TaskListModal
          isOpen={isTaskListModalOpen}
          onClose={() => setIsTaskListModalOpen(false)}
        />

        {/* Work Plan List Modal */}
        <WorkPlanListModal
          isOpen={isWorkPlanModalOpen}
          onClose={() => setIsWorkPlanModalOpen(false)}
        />
      </div>
  );
};

export default EmployeeDashboard;
