import React, { useState, useEffect } from "react";
import {
  Clock,
  Target,
  CheckSquare,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  Bell,
  Award,
  BarChart3,
  Activity,
  User
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getDepartmentDisplayName } from "../utils/permissions";
import PersonalInfoModal from "../components/PersonalInfoModal";
import AttendanceModal from "../components/AttendanceModal";
import LeaveRequestModal from "../components/LeaveRequestModal";
import EmployeeSelfEvaluationModal from "../components/EmployeeSelfEvaluationModal";
import DailyWorkReportListModal from "../components/DailyWorkReportListModal";
import TaskListModal from "../components/TaskListModal";
import notificationService, { Notification } from "../services/notificationService";
import dailyWorkReportService, { DailyWorkReport } from "../services/dailyWorkReportService";
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
const getPersonalStats = (user: any, evaluationNotification?: Notification | null, tasksCount?: number) => {
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
      value: "Chưa có thông tin",
      total: "",
      icon: <CheckSquare className="w-5 h-5" />,
      color: "from-green-500 to-green-600",
      textColor: "text-green-600"
    },
    {
      label: "Đánh giá",
      value: evaluationNotification ? evaluationNotification.title : (user?.evaluationScore ? user.evaluationScore.toFixed(1) : "Chưa có thông tin"),
      total: evaluationNotification ? "" : (user?.evaluationScore ? "5.0" : ""),
      subtitle: evaluationNotification ? evaluationNotification.message : undefined,
      icon: <Award className="w-5 h-5" />,
      color: evaluationNotification ? "from-red-500 to-red-600" : "from-purple-500 to-purple-600",
      textColor: evaluationNotification ? "text-red-600" : "text-purple-600",
      hasNotification: !!evaluationNotification && !evaluationNotification.isRead
    }
  ];

  return baseStats;
};

// Recent Activities for Employee
const getRecentActivities = (department: string) => {
  const activities = [
    {
      id: 1,
      title: "Hoàn thành báo cáo tuần",
      description: "Báo cáo công việc tuần 47/2024",
      time: "2 giờ trước",
      type: "completed",
      icon: <FileText className="w-4 h-4" />
    },
    {
      id: 2,
      title: "Tham gia họp phòng ban",
      description: "Họp review kết quả tháng 11",
      time: "1 ngày trước",
      type: "meeting",
      icon: <Users className="w-4 h-4" />
    },
    {
      id: 3,
      title: "Cập nhật tiến độ dự án",
      description: "Dự án cải tiến quy trình",
      time: "2 ngày trước",
      type: "update",
      icon: <TrendingUp className="w-4 h-4" />
    },
    {
      id: 4,
      title: "Nhận nhiệm vụ mới",
      description: "Kiểm tra chất lượng sản phẩm",
      time: "3 ngày trước",
      type: "task",
      icon: <CheckSquare className="w-4 h-4" />
    }
  ];

  return activities;
};

// Quick Actions for Employee
const getQuickActions = (department: string) => {
  return [
    {
      title: "Chấm công",
      description: "Chấm công vào/ra ca",
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
    }
  ];
};

// Component for Personal Stat Card
const PersonalStatCard: React.FC<{ stat: any; onEvaluationClick?: () => void; onTaskClick?: () => void }> = ({ stat, onEvaluationClick, onTaskClick }) => (
  <div
    onClick={() => {
      if (stat.label === "Đánh giá" && onEvaluationClick) {
        onEvaluationClick();
      } else if (stat.label === "Nhiệm vụ" && onTaskClick) {
        onTaskClick();
      }
    }}
    className={`bg-white rounded-xl shadow-sm border ${stat.hasNotification ? 'border-red-300 bg-red-50' : 'border-gray-100'} p-6 hover:shadow-md transition-shadow relative ${(stat.label === "Đánh giá" || stat.label === "Nhiệm vụ") ? 'cursor-pointer' : ''}`}
  >
    {stat.hasNotification && (
      <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
    )}
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
        <div className="flex items-baseline space-x-2">
          <p className={`text-2xl font-bold ${stat.hasNotification ? 'text-red-600' : 'text-gray-900'}`}>{stat.value}</p>
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
  onLeaveRequestClick?: () => void;
  onDailyReportClick?: () => void;
}> = ({ action, onProfileClick, onAttendanceClick, onLeaveRequestClick, onDailyReportClick }) => (
  <div
    onClick={() => {
      if (action.action === 'profile' && onProfileClick) {
        onProfileClick();
      } else if (action.action === 'attendance' && onAttendanceClick) {
        onAttendanceClick();
      } else if (action.action === 'leave' && onLeaveRequestClick) {
        onLeaveRequestClick();
      } else if (action.action === 'report' && onDailyReportClick) {
        onDailyReportClick();
      }
    }}
    className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 hover:shadow-md transition-all cursor-pointer group h-full"
  >
    <div className="flex items-center space-x-4">
      <div className={`p-4 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
        <div className="text-white w-8 h-8 flex items-center justify-center">
          {action.icon}
        </div>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
          {action.title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{action.description}</p>
      </div>
    </div>
  </div>
);

// Component for Activity Item
const ActivityItem: React.FC<{ activity: any }> = ({ activity }) => (
  <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
    <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
      <div className="text-blue-600">
        {activity.icon}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
      <p className="text-sm text-gray-600">{activity.description}</p>
      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
    </div>
  </div>
);

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isLeaveRequestModalOpen, setIsLeaveRequestModalOpen] = useState(false);
  const [latestEvaluationNotification, setLatestEvaluationNotification] = useState<Notification | null>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [recentReports, setRecentReports] = useState<DailyWorkReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);

  const { data: tasksCount = 0 } = useMyTasksCount();

  useEffect(() => {
    loadLatestEvaluationNotification();
    loadRecentReports();
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
  const personalStats = getPersonalStats(user, latestEvaluationNotification, tasksCount);
  const recentActivities = getRecentActivities(user.department || '');
  const quickActions = getQuickActions(user.department || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Lunar New Year Theme Header */}
        <div className="relative bg-gradient-to-r from-red-700 via-red-600 to-red-700 rounded-2xl shadow-xl p-6 mb-8 overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,215,0,0.1) 10px, rgba(255,215,0,0.1) 20px)`
            }}></div>
          </div>

          {/* Animated styles */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-8px) rotate(5deg); }
            }
            @keyframes sway {
              0%, 100% { transform: rotate(-5deg); }
              50% { transform: rotate(5deg); }
            }
            @keyframes falling-petal {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(150px) rotate(360deg); opacity: 0; }
            }
            @keyframes glow {
              0%, 100% { filter: brightness(1); }
              50% { filter: brightness(1.3); }
            }
            .branch-sway { animation: sway 4s ease-in-out infinite; transform-origin: left center; }
            .flower-float { animation: float 3s ease-in-out infinite; }
            .petal-fall { animation: falling-petal 5s linear infinite; position: absolute; }
            .glow-effect { animation: glow 2s ease-in-out infinite; }
          `}</style>

          {/* Mai branch (right side) - SVG style */}
          <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden">
            {/* Main branch with Mai flowers */}
            <svg className="absolute right-0 top-0 h-full w-full branch-sway" viewBox="0 0 250 150" preserveAspectRatio="xMaxYMid slice">
              {/* Branch */}
              <path d="M260 75 Q200 60 160 45 Q130 35 100 50 Q70 65 40 60"
                    stroke="#5D4037" strokeWidth="6" fill="none" strokeLinecap="round"/>
              <path d="M160 45 Q145 25 120 20"
                    stroke="#5D4037" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <path d="M100 50 Q85 35 65 30"
                    stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M130 48 Q125 70 115 85"
                    stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>
              <path d="M180 55 Q175 75 165 90"
                    stroke="#5D4037" strokeWidth="3" fill="none" strokeLinecap="round"/>

              {/* Mai flower component - 5 petals */}
              <defs>
                <g id="mai-flower">
                  <ellipse cx="0" cy="-8" rx="4" ry="8" fill="#FFD700"/>
                  <ellipse cx="7.6" cy="-2.5" rx="4" ry="8" fill="#FFD700" transform="rotate(72)"/>
                  <ellipse cx="4.7" cy="6.5" rx="4" ry="8" fill="#FFD700" transform="rotate(144)"/>
                  <ellipse cx="-4.7" cy="6.5" rx="4" ry="8" fill="#FFD700" transform="rotate(216)"/>
                  <ellipse cx="-7.6" cy="-2.5" rx="4" ry="8" fill="#FFD700" transform="rotate(288)"/>
                  <circle cx="0" cy="0" r="3" fill="#FF8C00"/>
                  <circle cx="-1" cy="-1" r="0.8" fill="#8B4513"/>
                  <circle cx="1" cy="0" r="0.8" fill="#8B4513"/>
                  <circle cx="0" cy="1" r="0.8" fill="#8B4513"/>
                </g>
                <g id="mai-flower-small">
                  <ellipse cx="0" cy="-6" rx="3" ry="6" fill="#FFD700"/>
                  <ellipse cx="5.7" cy="-1.9" rx="3" ry="6" fill="#FFD700" transform="rotate(72)"/>
                  <ellipse cx="3.5" cy="4.9" rx="3" ry="6" fill="#FFD700" transform="rotate(144)"/>
                  <ellipse cx="-3.5" cy="4.9" rx="3" ry="6" fill="#FFD700" transform="rotate(216)"/>
                  <ellipse cx="-5.7" cy="-1.9" rx="3" ry="6" fill="#FFD700" transform="rotate(288)"/>
                  <circle cx="0" cy="0" r="2" fill="#FF8C00"/>
                </g>
                <g id="mai-bud">
                  <ellipse cx="0" cy="0" rx="3" ry="5" fill="#FFD700"/>
                  <path d="M-2 2 Q0 -3 2 2" stroke="#5D4037" strokeWidth="0.5" fill="none"/>
                </g>
              </defs>

              {/* Flowers on branch */}
              <use href="#mai-flower" x="120" y="22" className="flower-float"/>
              <use href="#mai-flower" x="155" y="40" className="flower-float" style={{animationDelay: '0.5s'}}/>
              <use href="#mai-flower" x="95" y="48" className="flower-float" style={{animationDelay: '1s'}}/>
              <use href="#mai-flower" x="180" y="55" className="flower-float" style={{animationDelay: '0.3s'}}/>
              <use href="#mai-flower-small" x="65" y="32" className="flower-float" style={{animationDelay: '0.8s'}}/>
              <use href="#mai-flower-small" x="130" y="50" className="flower-float" style={{animationDelay: '1.2s'}}/>
              <use href="#mai-flower" x="115" y="82" className="flower-float" style={{animationDelay: '0.6s'}}/>
              <use href="#mai-flower-small" x="165" y="88" className="flower-float" style={{animationDelay: '1.5s'}}/>
              <use href="#mai-flower" x="200" y="65" className="flower-float" style={{animationDelay: '0.2s'}}/>
              <use href="#mai-bud" x="75" y="55" />
              <use href="#mai-bud" x="145" y="30" />
              <use href="#mai-bud" x="190" y="78" />
            </svg>
          </div>

          {/* Falling petals */}
          <div className="petal-fall text-lg" style={{left: '60%', animationDelay: '0s'}}>🌸</div>
          <div className="petal-fall text-xl" style={{left: '70%', animationDelay: '1s'}}>🌸</div>
          <div className="petal-fall text-lg" style={{left: '80%', animationDelay: '2s'}}>🌸</div>
          <div className="petal-fall text-xl" style={{left: '75%', animationDelay: '3s'}}>🌸</div>
          <div className="petal-fall text-lg" style={{left: '65%', animationDelay: '4s'}}>🌸</div>

          {/* Content */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <div>
                <p className="text-yellow-300 text-sm font-medium tracking-wider mb-1">🧧 CHÚC MỪNG NĂM MỚI - XUÂN BÍNH NGỌ 2026 ✨</p>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">
                  Chào mừng, {user.firstName}!
                </h1>
                <p className="text-red-100 text-lg mt-1">
                  {user.position} - {departmentName}
                </p>
              </div>
              <div className="flex items-center mt-3 space-x-2">
                <span className="px-3 py-1 bg-yellow-500 text-red-800 rounded-full text-sm font-bold shadow-lg">
                  🏷️ {user.employeeCode}
                </span>
                {user.subDepartment && (
                  <span className="px-3 py-1 bg-red-500 border border-yellow-400 text-white rounded-full text-sm shadow-lg">
                    {user.subDepartment.toUpperCase()}
                  </span>
                )}
                <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium shadow-lg">
                  🌟 {user.employeeStatus || 'Đang làm việc'}
                </span>
              </div>
            </div>
          </div>

          {/* Date/Time section - bottom right */}
          <div className="absolute bottom-3 right-4 text-right text-white z-10">
            <p className="text-2xl font-bold drop-shadow-lg">{new Date().toLocaleDateString('vi-VN')}</p>
            <p className="text-sm text-red-100">{new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          {/* Decorative corners */}
          <div className="absolute top-2 left-2 text-2xl">🏮</div>
        </div>

        {/* Personal Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {personalStats.map((stat, index) => (
            <PersonalStatCard
              key={index}
              stat={stat}
              onEvaluationClick={() => setIsEvaluationModalOpen(true)}
              onTaskClick={() => setIsTaskListModalOpen(true)}
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
                  <span className="text-sm font-medium text-gray-900">{user.personalPhone || 'N/A'}</span>
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
      </div>
    </div>
  );
};

export default EmployeeDashboard;
