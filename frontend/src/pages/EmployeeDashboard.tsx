import React, { useState, useEffect } from "react";
import {
  Clock,
  Target,
  CheckSquare,
  Calendar,
  AlertTriangle,
  FileText,
  Award,
  Activity,
  User,
  X,
  ScanFace
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import { getDepartmentDisplayName } from "../utils/permissions";
import { ThemeHeader, getThemePageBackground } from "../components/ThemeHeaders";
import PersonalInfoModal from "../components/PersonalInfoModal";
import AttendanceModal from "../components/AttendanceModal";
import LeaveRequestModal from "../components/LeaveRequestModal";
import EmployeeSelfEvaluationModal from "../components/EmployeeSelfEvaluationModal";
import DailyWorkReportListModal from "../components/DailyWorkReportListModal";
import TaskListModal from "../components/TaskListModal";
import WorkPlanListModal from "../components/WorkPlanListModal";
import notificationService, { AppNotification } from "../services/notificationService";
import dailyWorkReportService, { DailyWorkReport } from "../services/dailyWorkReportService";
import { workPlanService } from "../services/workPlanService";
import { useMyTasksCount } from "../hooks";

// Helper function to display gender in Vietnamese
const getGenderDisplay = (gender?: string): string => {
  if (!gender) return 'N/A';
  switch (gender.toUpperCase()) {
    case 'MALE':
      return 'Nam';
    case 'FEMALE':
      return 'Nữ';
    case 'OTHER':
      return 'Khác';
    default:
      return gender; // Return as-is if already in Vietnamese or unknown
  }
};

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
      value: user?.evaluationScore ? user.evaluationScore.toFixed(1) : "Chưa có thông tin",
      total: user?.evaluationScore ? "5.0" : "",
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
const getQuickActions = (department: string) => {
  return [
    {
      title: "Chấm công",
      description: "Chấm công vào/ra ca",
      icon: <Clock className="w-6 h-6" />,
      color: "bg-blue-500",
      action: "attendance",
      disabled: true
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
    }
  ];
};

// Component for Personal Stat Card
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
    className={`bg-white rounded-xl shadow-sm border ${stat.hasNotification ? 'border-red-300 bg-red-50' : 'border-gray-100'} p-6 hover:shadow-md transition-shadow relative ${(stat.label === "Đánh giá" || stat.label === "Nhiệm vụ" || stat.label === "Kế hoạch") ? 'cursor-pointer' : ''}`}
  >
    {stat.hasNotification && (
      <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
        <div className="flex items-baseline space-x-2">
          <p className={`text-lg font-bold ${stat.hasNotification ? 'text-red-600' : 'text-gray-900'}`}>{stat.value}</p>
          {stat.total && (
            <p className="text-sm text-gray-500">/ {stat.total}</p>
          )}
        </div>
        {stat.subtitle && (
          <p className="text-xs text-red-600 mt-2 font-medium">{stat.subtitle}</p>
        )}
      </div>
      <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
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
  onAttendanceDisabledClick?: () => void;
  onLeaveRequestClick?: () => void;
  onDailyReportClick?: () => void;
}> = ({ action, onProfileClick, onAttendanceClick, onAttendanceDisabledClick, onLeaveRequestClick, onDailyReportClick }) => {
  const isDisabled = !!action.disabled;

  const handleClick = () => {
    if (isDisabled) {
      if (action.action === 'attendance' && onAttendanceDisabledClick) onAttendanceDisabledClick();
      return;
    }
    if (action.action === 'profile' && onProfileClick) onProfileClick();
    else if (action.action === 'attendance' && onAttendanceClick) onAttendanceClick();
    else if (action.action === 'leave' && onLeaveRequestClick) onLeaveRequestClick();
    else if (action.action === 'report' && onDailyReportClick) onDailyReportClick();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative bg-white rounded-xl shadow-sm border p-8 transition-all h-full
        ${isDisabled
          ? 'border-gray-200 opacity-60 cursor-pointer grayscale'
          : 'border-gray-100 hover:shadow-md cursor-pointer group'
        }`}
    >
      {isDisabled && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wide">
          Đã ngưng
        </span>
      )}
      <div className="flex items-center space-x-4">
        <div className={`p-4 rounded-lg ${isDisabled ? 'bg-gray-400' : action.color} ${!isDisabled ? 'group-hover:scale-110 transition-transform' : ''}`}>
          <div className="text-white w-8 h-8 flex items-center justify-center">
            {action.icon}
          </div>
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold text-lg transition-colors ${isDisabled ? 'text-gray-400' : 'text-gray-900 group-hover:text-blue-600'}`}>
            {action.title}
          </h3>
          <p className="text-sm text-gray-400 mt-1">{action.description}</p>
        </div>
      </div>
    </div>
  );
};

// Theme headers moved to ../components/ThemeHeaders.tsx

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isAttendanceDeprecatedOpen, setIsAttendanceDeprecatedOpen] = useState(false);
  const [isLeaveRequestModalOpen, setIsLeaveRequestModalOpen] = useState(false);
  const [latestEvaluationNotification, setLatestEvaluationNotification] = useState<AppNotification | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [recentReports, setRecentReports] = useState<DailyWorkReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [isWorkPlanModalOpen, setIsWorkPlanModalOpen] = useState(false);
  const [workPlansCount, setWorkPlansCount] = useState<number>(0);

  const { data: tasksCount = 0 } = useMyTasksCount();
  const { settings } = useSystemSettings();
  const activeTheme = settings?.activeTheme || 'DEFAULT';

  useEffect(() => {
    loadLatestEvaluationNotification();
    loadRecentReports();
    loadWorkPlansCount();
  }, []);

  const loadLatestEvaluationNotification = async () => {
    try {
      setNotificationLoading(true);
      const notification = await notificationService.getLatestEvaluationNotification();
      setLatestEvaluationNotification(notification);
    } catch (error) {
      console.error('Error loading evaluation notification:', error);
    } finally {
      setNotificationLoading(false);
    }
  };

  const loadRecentReports = async () => {
    try {
      setReportsLoading(true);
      const response = await dailyWorkReportService.getMyReports(1, 5);
      setRecentReports(response.data);
    } catch (error) {
      console.error('Error loading recent reports:', error);
    } finally {
      setReportsLoading(false);
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
  const quickActions = getQuickActions(user.department || '');

  return (
    <div className={`min-h-full ${getThemePageBackground(activeTheme)}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Theme Header */}
        <ThemeHeader activeTheme={activeTheme} user={user} departmentName={departmentName} />

        {/* Personal Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <Activity className="w-6 h-6 text-blue-600 mr-2" />
              Thao tác nhanh
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <QuickActionCard
                  key={index}
                  action={action}
                  onProfileClick={() => setIsProfileModalOpen(true)}
                  onAttendanceClick={() => setIsAttendanceModalOpen(true)}
                  onAttendanceDisabledClick={() => setIsAttendanceDeprecatedOpen(true)}
                  onLeaveRequestClick={() => setIsLeaveRequestModalOpen(true)}
                  onDailyReportClick={() => setIsDailyReportModalOpen(true)}
                />
              ))}
            </div>
          </div>

          {/* Right Column - Employee Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <User className="w-6 h-6 text-blue-600 mr-2" />
                Thông tin nhân viên
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Mã nhân viên:</span>
                  <span className="text-sm font-medium text-gray-900">{user.employeeCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Giới tính:</span>
                  <span className="text-sm font-medium text-gray-900">{getGenderDisplay(user.gender)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Chiều cao:</span>
                  <span className="text-sm font-medium text-gray-900">{user.height ? `${user.height} cm` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Cân nặng:</span>
                  <span className="text-sm font-medium text-gray-900">{user.weight ? `${user.weight} kg` : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Size áo:</span>
                  <span className="text-sm font-medium text-gray-900">{user.shirtSize || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Size quần:</span>
                  <span className="text-sm font-medium text-gray-900">{user.pantSize || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Size giày:</span>
                  <span className="text-sm font-medium text-gray-900">{user.shoeSize || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Số điện thoại:</span>
                  <span className="text-sm font-medium text-gray-900">{user.phoneNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Số tài khoản:</span>
                  <span className="text-sm font-medium text-gray-900">{user.bankAccount || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Số tủ khóa:</span>
                  <span className="text-sm font-medium text-gray-900">{user.lockerNumber || 'N/A'}</span>
                </div>
              </div>
          </div>
        </div>

        {/* Personal Info Modal */}
        <PersonalInfoModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />

        {/* Attendance Modal */}
        <AttendanceModal
          isOpen={isAttendanceModalOpen}
          onClose={() => setIsAttendanceModalOpen(false)}
          showBackdrop={true}
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

        {/* Attendance Deprecated Notice */}
        {isAttendanceDeprecatedOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-xl">
                    <ScanFace className="w-6 h-6 text-orange-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Thông báo quan trọng</h2>
                </div>
                <button
                  onClick={() => setIsAttendanceDeprecatedOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                <p>
                  Công ty <strong>An Bình Foods</strong> đã chính thức triển khai hệ thống{' '}
                  <strong className="text-orange-600">chấm công bằng nhận diện khuôn mặt</strong>.
                </p>
                <p>
                  Kể từ ngày <strong className="text-red-600">01/06/2026</strong>, chức năng chấm
                  công thủ công này <strong>không còn được sử dụng</strong>.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mt-2">
                  <p className="font-semibold text-orange-800 text-center">
                    Yêu cầu toàn thể nhân viên nghiêm túc thực hiện chấm công bằng khuôn mặt tại máy kiosk.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <button
                onClick={() => setIsAttendanceDeprecatedOpen(false)}
                className="mt-5 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
