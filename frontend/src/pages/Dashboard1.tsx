import React, { useState } from "react";
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
  AlertTriangle,
  Check,
  X,
  Eye
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getDepartmentDisplayName, isAdmin } from "../utils/permissions";
import EmployeeDashboard from "./EmployeeDashboard";
import purchaseRequestService from "../services/purchaseRequestService";
import TaskListModal from "../components/TaskListModal";
import FeedbackListModal from "../components/FeedbackListModal";
import { useTasksCount, usePrivateFeedbackStats } from "../hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
const getQuickStats = (tasksCount: number = 0, feedbackCount: number = 0, purchaseRequestCount: number = 0, purchaseRequestPendingCount: number = 0) => [
  { label: "Yêu cầu mua hàng", value: purchaseRequestCount.toString(), change: `Chờ duyệt: ${purchaseRequestPendingCount}`, icon: <ShoppingCart className="h-5 w-5" />, color: "text-blue-600", clickable: true, type: 'purchaseRequests' },
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

interface PurchaseRequest {
  id: string;
  stt: number;
  ngayYeuCau: string;
  maYeuCau: string;
  tenNhanVien: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  mucDoUuTien: string;
  trangThai: string;
  nguoiDuyet?: string;
  ngayDuyet?: string;
}

const Dashboard1: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [isFeedbackListModalOpen, setIsFeedbackListModalOpen] = useState(false);
  const [isPurchaseRequestModalOpen, setIsPurchaseRequestModalOpen] = useState(false);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);

  const userIsAdmin = user ? isAdmin(user.department) : false;

  // Use React Query hooks for data fetching with caching
  const { data: tasksCount = 0 } = useTasksCount();
  const { data: feedbackStats } = usePrivateFeedbackStats();
  const feedbackCount = feedbackStats?.data?.total || 0;

  // Purchase requests query
  const { data: purchaseRequestsData } = useQuery({
    queryKey: ['purchaseRequests', 'dashboard'],
    queryFn: () => purchaseRequestService.getAllPurchaseRequests(1, 100),
    enabled: userIsAdmin,
  });

  const purchaseRequests = purchaseRequestsData?.data || [];
  const purchaseRequestCount = purchaseRequests.length;
  const purchaseRequestPendingCount = purchaseRequests.filter(
    (r: PurchaseRequest) => r.trangThai === 'Chờ duyệt'
  ).length;

  // Mutation for approving/rejecting purchase requests
  const approveMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      purchaseRequestService.updatePurchaseRequest(id, {
        trangThai: approve ? 'Đã duyệt' : 'Từ chối',
        nguoiDuyet: user?.fullName || user?.username,
        ngayDuyet: new Date().toISOString(),
      }),
    onSuccess: (_, { approve }) => {
      alert(approve ? 'Đã duyệt yêu cầu!' : 'Đã từ chối yêu cầu!');
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Lỗi khi xử lý yêu cầu');
    },
  });

  const handleApprovePurchaseRequest = (id: string, approve: boolean) => {
    if (!user) return;
    setApproveLoading(id);
    approveMutation.mutate({ id, approve }, {
      onSettled: () => setApproveLoading(null),
    });
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

  // Nếu không phải admin, hiển thị Employee Dashboard
  if (!userIsAdmin) {
    return <EmployeeDashboard />;
  }

  // Nếu là admin, hiển thị Admin Dashboard
  const departmentName = getDepartmentDisplayName(user.department);
  const quickStats = getQuickStats(tasksCount, feedbackCount, purchaseRequestCount, purchaseRequestPendingCount);

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
                } else if (stat.type === 'purchaseRequests') {
                  setIsPurchaseRequestModalOpen(true);
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

      {/* Purchase Request Modal */}
      {isPurchaseRequestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <ShoppingCart className="h-6 w-6 text-blue-600 mr-2" />
                Danh sách yêu cầu mua hàng
              </h2>
              <button
                onClick={() => setIsPurchaseRequestModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-x-auto flex-1">
              {purchaseRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Không có yêu cầu mua hàng nào
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã yêu cầu</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày yêu cầu</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hàng hoá</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ưu tiên</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người duyệt</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseRequests.map((request, index) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">{request.maYeuCau}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(request.ngayYeuCau).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{request.tenNhanVien}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={request.tenHangHoa}>
                          {request.tenHangHoa}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {request.soLuong} {request.donViTinh}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' :
                            request.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {request.mucDoUuTien}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' :
                            request.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' :
                            request.trangThai === 'Từ chối' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {request.trangThai}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {request.nguoiDuyet || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {request.trangThai === 'Chờ duyệt' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleApprovePurchaseRequest(request.id, true)}
                                disabled={approveLoading === request.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                                title="Duyệt"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Duyệt
                              </button>
                              <button
                                onClick={() => handleApprovePurchaseRequest(request.id, false)}
                                disabled={approveLoading === request.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-xs font-medium"
                                title="Từ chối"
                              >
                                <X className="w-3.5 h-3.5" />
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsPurchaseRequestModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard1;
