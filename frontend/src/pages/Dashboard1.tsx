import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  ShieldCheck,
  Clock,
  Target,
  BarChart3,
  Factory,
  Building2,
  Briefcase,
  Calculator,
  Wrench,
  CheckSquare,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getDepartmentDisplayName, isAdmin } from "../utils/permissions";
import EmployeeDashboard from "./EmployeeDashboard";
import { taskService } from "../services/taskService";
import { privateFeedbackService } from "../services/privateFeedbackService";
import TaskListModal from "../components/TaskListModal";
import FeedbackListModal from "../components/FeedbackListModal";

// Department Statistics Data
const departmentStats = {
  general: {
    name: "Bộ phận tổng hợp",
    icon: <Building2 className="h-6 w-6" />,
    color: "from-blue-600 to-blue-800",
    stats: [
      { label: "Đơn hàng", value: "08", trend: "+2", color: "text-blue-600" },
      { label: "Báo giá", value: "12", trend: "+5", color: "text-green-600" },
      { label: "Chăm sóc KH", value: "24", trend: "+3", color: "text-purple-600" },
      { label: "Phàn nàn", value: "02", trend: "-1", color: "text-red-600" }
    ]
  },
  quality: {
    name: "Bộ phận chất lượng",
    icon: <ShieldCheck className="h-6 w-6" />,
    color: "from-green-600 to-green-800",
    stats: [
      { label: "Quy trình", value: "15", trend: "+2", color: "text-blue-600" },
      { label: "Không phù hợp", value: "03", trend: "-1", color: "text-red-600" },
      { label: "Vi phạm", value: "01", trend: "0", color: "text-orange-600" },
      { label: "Nhân viên", value: "48", trend: "+2", color: "text-green-600" }
    ]
  },
  business: {
    name: "Bộ phận kinh doanh",
    icon: <Briefcase className="h-6 w-6" />,
    color: "from-purple-600 to-purple-800",
    stats: [
      { label: "Hợp đồng", value: "25", trend: "+8", color: "text-blue-600" },
      { label: "Khách hàng", value: "156", trend: "+12", color: "text-green-600" },
      { label: "Doanh thu", value: "2.5B", trend: "+15%", color: "text-purple-600" },
      { label: "Mục tiêu", value: "85%", trend: "+5%", color: "text-orange-600" }
    ]
  },
  accounting: {
    name: "Bộ phận kế toán",
    icon: <Calculator className="h-6 w-6" />,
    color: "from-orange-600 to-orange-800",
    stats: [
      { label: "Hóa đơn", value: "142", trend: "+18", color: "text-blue-600" },
      { label: "Thu chi", value: "3.2B", trend: "+12%", color: "text-green-600" },
      { label: "Công nợ", value: "450M", trend: "-8%", color: "text-red-600" },
      { label: "Báo cáo", value: "28", trend: "+4", color: "text-purple-600" }
    ]
  },
  production: {
    name: "Bộ phận sản xuất",
    icon: <Factory className="h-6 w-6" />,
    color: "from-indigo-600 to-indigo-800",
    stats: [
      { label: "Đơn hàng SX", value: "18", trend: "+6", color: "text-blue-600" },
      { label: "Hoàn thành", value: "15", trend: "+4", color: "text-green-600" },
      { label: "Đang SX", value: "03", trend: "+2", color: "text-orange-600" },
      { label: "Hiệu suất", value: "92%", trend: "+3%", color: "text-purple-600" }
    ]
  },
  purchasing: {
    name: "Bộ phận mua hàng",
    icon: <ShoppingCart className="h-6 w-6" />,
    color: "from-teal-600 to-teal-800",
    stats: [
      { label: "Đơn mua", value: "34", trend: "+7", color: "text-blue-600" },
      { label: "Nhà cung cấp", value: "28", trend: "+3", color: "text-green-600" },
      { label: "Tồn kho", value: "1.8B", trend: "+5%", color: "text-purple-600" },
      { label: "Tiết kiệm", value: "120M", trend: "+8%", color: "text-orange-600" }
    ]
  },
  technical: {
    name: "Bộ phận kỹ thuật",
    icon: <Wrench className="h-6 w-6" />,
    color: "from-red-600 to-red-800",
    stats: [
      { label: "Dự án", value: "12", trend: "+3", color: "text-blue-600" },
      { label: "Bảo trì", value: "08", trend: "+1", color: "text-green-600" },
      { label: "Sự cố", value: "02", trend: "-2", color: "text-red-600" },
      { label: "Cải tiến", value: "05", trend: "+2", color: "text-purple-600" }
    ]
  }
};

// Quick Stats for Overview
const getQuickStats = (tasksCount: number = 0, feedbackCount: number = 0) => [
  { label: "Danh sách mục tiêu", value: "2025", change: "Năm: 2025", icon: <Target className="h-5 w-5" />, color: "text-blue-600", clickable: false },
  { label: "Danh sách nhiệm vụ", value: tasksCount.toString(), change: `Nhiệm vụ: ${tasksCount}`, icon: <CheckSquare className="h-5 w-5" />, color: "text-green-600", clickable: true, type: 'tasks' },
  { label: "Danh sách kế hoạch", value: "08", change: "Đã lên kế hoạch: 08", icon: <Calendar className="h-5 w-5" />, color: "text-purple-600", clickable: false },
  { label: "Danh sách khó khăn và góp ý", value: feedbackCount.toString(), change: `Góp ý & Khó khăn: ${feedbackCount}`, icon: <AlertTriangle className="h-5 w-5" />, color: "text-orange-600", clickable: true, type: 'feedbacks' }
];

// Component for Department Card
const DepartmentCard: React.FC<{
  department: any;
  onClick: () => void;
  isFullWidth?: boolean;
}> = ({ department, onClick, isFullWidth = false }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border border-gray-100"
  >
    {/* Header with gradient */}
    <div className={`bg-gradient-to-r ${department.color} p-4 rounded-t-xl`}>
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          {department.icon}
          <h3 className="text-lg font-semibold">{department.name}</h3>
        </div>
        <div className="text-white/80">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="p-4">
      <div className={`grid gap-3 ${isFullWidth ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
        {department.stats.map((stat: any, index: number) => (
          <div key={index} className="text-center">
            <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
            <div className="text-sm text-gray-600 mb-1">{stat.label}</div>
            <div className={`text-xs font-medium ${stat.color}`}>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Component for Quick Stat Card
const QuickStatCard: React.FC<{
  stat: any;
  onClick?: () => void;
}> = ({ stat, onClick }) => (
  <div
    className={`bg-white rounded-lg shadow-md p-6 border border-gray-100 ${stat.clickable ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
    onClick={stat.clickable ? onClick : undefined}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{stat.label}</p>
        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
        <p className={`text-sm font-medium ${stat.color}`}>{stat.change}</p>
      </div>
      <div className={`p-3 rounded-full bg-blue-50 ${stat.color}`}>
        {stat.icon}
      </div>
    </div>
  </div>
);

const Dashboard1: React.FC = () => {
  const { user } = useAuth();
  const [tasksCount, setTasksCount] = useState<number>(0);
  const [feedbackCount, setFeedbackCount] = useState<number>(0);
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [isFeedbackListModalOpen, setIsFeedbackListModalOpen] = useState(false);

  useEffect(() => {
    if (user && isAdmin(user.department)) {
      loadAllTasksCount();
      loadFeedbackStats();
    }
  }, [user]);

  const loadAllTasksCount = async () => {
    try {
      const response = await taskService.getAllTasks({ page: 1, limit: 1 });
      setTasksCount(response.total);
    } catch (error) {
      console.error('Error loading all tasks count:', error);
    }
  };

  const loadFeedbackStats = async () => {
    try {
      const response = await privateFeedbackService.getStats();
      setFeedbackCount(response.data.total);
    } catch (error) {
      console.error('Error loading feedback stats:', error);
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

  const userIsAdmin = isAdmin(user.department);

  // Nếu không phải admin, hiển thị Employee Dashboard
  if (!userIsAdmin) {
    return <EmployeeDashboard />;
  }

  // Nếu là admin, hiển thị Admin Dashboard
  const departmentName = getDepartmentDisplayName(user.department);
  const quickStats = getQuickStats(tasksCount, feedbackCount);

  const handleDepartmentClick = (deptKey: string) => {
    // Navigate to department page
    window.location.href = `/${deptKey}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-xl p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Dashboard ABF
                  </h1>
                  <p className="text-blue-100 text-sm">
                    Chào mừng {user.firstName} {user.lastName} - {user.position}
                  </p>
                </div>
                <div className="hidden md:block text-right text-white">
                  <p className="text-xs opacity-80">Hôm nay</p>
                  <p className="text-lg font-bold">{new Date().toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <div className="flex items-center mt-2 space-x-2">
                <span className="px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium">
                  {departmentName}
                </span>
                {user.subDepartment && (
                  <span className="px-2 py-1 bg-blue-700 text-white rounded-full text-xs">
                    {user.subDepartment.toUpperCase()}
                  </span>
                )}
                {userIsAdmin && (
                  <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold">
                    ADMIN
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <QuickStatCard
              key={index}
              stat={stat}
              onClick={stat.clickable ? () => {
                if (stat.type === 'tasks') {
                  setIsTaskListModalOpen(true);
                } else if (stat.type === 'feedbacks') {
                  setIsFeedbackListModalOpen(true);
                }
              } : undefined}
            />
          ))}
        </div>

        {/* Admin Dashboard - Full Department Overview */}
        {userIsAdmin ? (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Tổng quan các phòng ban</h2>
              <p className="text-gray-600">Quản lý và theo dõi hoạt động của tất cả các bộ phận</p>
            </div>

            {/* All Departments - Full Width Format */}
            <div className="space-y-8">
              {Object.entries(departmentStats).map(([key, department]) => (
                <div key={key} className="mb-8">
                  <DepartmentCard
                    department={department}
                    onClick={() => handleDepartmentClick(key)}
                    isFullWidth={true}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* User Dashboard - Personal Department View */
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Dashboard cá nhân</h2>
              <p className="text-gray-600">Thông tin và nhiệm vụ của bạn trong {departmentName}</p>
            </div>

            {/* Personal Department Card */}
            <div className="max-w-2xl mx-auto">
              {departmentStats[user.department as keyof typeof departmentStats] && (
                <DepartmentCard
                  department={departmentStats[user.department as keyof typeof departmentStats]}
                  onClick={() => handleDepartmentClick(user.department || '')}
                />
              )}
            </div>

            {/* Personal Tasks/Activities */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Target className="h-5 w-5 text-blue-600 mr-2" />
                  Nhiệm vụ của tôi
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-700">Hoàn thành báo cáo tháng</span>
                    <span className="text-blue-600 font-medium">85%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-700">Xem xét đơn hàng mới</span>
                    <span className="text-green-600 font-medium">Hoàn thành</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-gray-700">Họp team hàng tuần</span>
                    <span className="text-orange-600 font-medium">Đang chờ</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Clock className="h-5 w-5 text-purple-600 mr-2" />
                  Hoạt động gần đây
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-gray-700 text-sm">Tạo yêu cầu sửa chữa thiết bị</p>
                      <p className="text-gray-500 text-xs">2 giờ trước</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-gray-700 text-sm">Phê duyệt đơn hàng #DH001</p>
                      <p className="text-gray-500 text-xs">5 giờ trước</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-gray-700 text-sm">Cập nhật báo cáo chất lượng</p>
                      <p className="text-gray-500 text-xs">1 ngày trước</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task List Modal for Admin - Shows ALL tasks */}
      <TaskListModal
        isOpen={isTaskListModalOpen}
        onClose={() => setIsTaskListModalOpen(false)}
        isAdmin={true}
      />

      {/* Feedback List Modal for Admin - Shows ALL feedbacks */}
      <FeedbackListModal
        isOpen={isFeedbackListModalOpen}
        onClose={() => setIsFeedbackListModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard1;
