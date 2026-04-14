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
  AlertTriangle,
  Check,
  X,
  Eye,
  Award,
  FileText
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getDepartmentDisplayName, isAdmin } from "../utils/permissions";
import { useSystemSettings } from "../contexts/SystemSettingsContext";
import { ThemeHeader, getThemePageBackground } from "../components/ThemeHeaders";
import EmployeeDashboard from "./EmployeeDashboard";
import purchaseRequestService from "../services/purchaseRequestService";
import TaskListModal from "../components/TaskListModal";
import FeedbackListModal from "../components/FeedbackListModal";
import DailyWorkReportListModal from "../components/DailyWorkReportListModal";
import PlanCombinedModal from "../components/PlanCombinedModal";
import { overtimePlanService, OvertimePlanStatus } from "../services/overtimePlanService";
import EmployeeSelfEvaluationModal from "../components/EmployeeSelfEvaluationModal";

import notificationService, { Notification } from "../services/notificationService";
import { useTasksCount, usePrivateFeedbackStats } from "../hooks";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderService } from "../services/orderService";
import { quotationService } from "../services/quotationService";
import customerFeedbackService from "../services/customerFeedbackService";
import internationalCustomerService from "../services/internationalCustomerService";
import employeeService from "../services/employeeService";
import processService from "../services/processService";
import internalInspectionService from "../services/internalInspectionService";
import invoiceService from "../services/invoiceService";
import debtService from "../services/debtService";
import generalCostService from "../services/generalCostService";
import machineService from "../services/machineService";
import finishedProductService from "../services/finishedProductService";
import { supplierService } from "../services/supplierService";
import supplyRequestService from "../services/supplyRequestService";
import taxReportService from "../services/taxReportService";
import qualityEvaluationService from "../services/qualityEvaluationService";
import { workPlanService } from "../services/workPlanService";

// Quick Stats for Overview
const getQuickStats = (tasksCount: number = 0, feedbackCount: number = 0, purchaseRequestCount: number = 0, purchaseRequestPendingCount: number = 0, workPlanCount: number = 0, overtimeCount: number = 0, overtimePendingCount: number = 0) => [
  { label: "Mua hàng", value: purchaseRequestCount.toString(), change: `Chờ duyệt: ${purchaseRequestPendingCount}`, icon: <ShoppingCart className="h-4 w-4" />, color: "text-blue-600", bgColor: "bg-blue-50", clickable: true, type: 'purchaseRequests' },
  { label: "Nhiệm vụ", value: tasksCount.toString(), change: `${tasksCount} nhiệm vụ`, icon: <CheckSquare className="h-4 w-4" />, color: "text-green-600", bgColor: "bg-green-50", clickable: true, type: 'tasks' },
  { label: "Kế hoạch", value: (workPlanCount + overtimeCount).toString(), change: `TC chờ duyệt: ${overtimePendingCount}`, icon: <Calendar className="h-4 w-4" />, color: overtimePendingCount > 0 ? "text-red-600" : "text-purple-600", bgColor: overtimePendingCount > 0 ? "bg-red-50" : "bg-purple-50", clickable: true, type: 'plans', hasNotification: overtimePendingCount > 0 },
  { label: "Góp ý & KK", value: feedbackCount.toString(), change: `${feedbackCount} góp ý`, icon: <AlertTriangle className="h-4 w-4" />, color: "text-orange-600", bgColor: "bg-orange-50", clickable: true, type: 'feedbacks' },
  { label: "Đánh giá", value: "Xem", change: "Đánh giá cấp dưới", icon: <Award className="h-4 w-4" />, color: "text-purple-600", bgColor: "bg-purple-50", clickable: true, type: 'evaluation' },
  { label: "Báo cáo", value: "Xem", change: "Hàng ngày", icon: <FileText className="h-4 w-4" />, color: "text-teal-600", bgColor: "bg-teal-50", clickable: true, type: 'dailyReports' }
];

// Component for Department Card
const DepartmentCard: React.FC<{
  department: any;
  onClick: () => void;
  isFullWidth?: boolean;
}> = ({ department, onClick, isFullWidth = false }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200"
  >
    {/* Header with accent bar */}
    <div className="p-4 rounded-t-xl relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-3 ${department.color}`}></div>
      <div className="flex items-center justify-between text-gray-700">
        <div className="flex items-center space-x-3">
          <div className="text-gray-500">{department.icon}</div>
          <h3 className="text-lg font-semibold text-gray-800">{department.name}</h3>
        </div>
        <div className="text-gray-400">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="p-4 pt-2">
      <div className={`grid gap-3 ${isFullWidth ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
        {department.stats.map((stat: any, index: number) => (
          <div
            key={index}
            className={`text-center p-2 rounded-lg bg-gray-50 ${stat.link ? 'hover:bg-blue-50 hover:shadow-sm transition-all' : ''}`}
            onClick={stat.link ? (e: React.MouseEvent) => {
              e.stopPropagation();
              window.location.href = stat.link;
            } : undefined}
          >
            <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
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
  notifCount?: number;
}> = ({ stat, onClick, notifCount = 0 }) => (
  <div
    className={`bg-white rounded-lg shadow-sm px-3 py-4 border ${stat.hasNotification ? 'border-red-300 bg-red-50' : 'border-gray-100'} ${stat.clickable ? 'cursor-pointer hover:shadow-md hover:border-gray-200 transition-all' : ''} relative`}
    onClick={stat.clickable ? onClick : undefined}
  >
    {stat.hasNotification && (
      <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
    )}
    {notifCount > 0 && !stat.hasNotification && (
      <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">{notifCount > 99 ? '99+' : notifCount}</span>
      </div>
    )}
    <div className="flex items-center gap-2.5">
      <div className={`p-2 rounded-lg ${stat.bgColor || 'bg-blue-50'} ${stat.color} shrink-0`}>
        {stat.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">{stat.label}</span>
          <span className={`text-xl font-bold leading-none ${stat.hasNotification ? 'text-red-600' : 'text-gray-900'}`}>{stat.value}</span>
        </div>
        <p className={`text-[11px] font-medium ${stat.color} truncate mt-0.5`}>{stat.change}</p>
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
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);
  const [unreadByType, setUnreadByType] = useState<Record<string, number>>({});
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState<any | null>(null);

  const userIsAdmin = user ? isAdmin(user.department) : false;
  const { settings } = useSystemSettings();
  const activeTheme = settings?.activeTheme || 'DEFAULT';

  // Load unread notification counts by type
  useEffect(() => {
    const loadUnreadByType = async () => {
      const counts = await notificationService.getUnreadCountByType();
      setUnreadByType(counts);
    };
    loadUnreadByType();
    const interval = setInterval(loadUnreadByType, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Dashboard stats queries
  const { data: ordersData } = useQuery({
    queryKey: ['dashboard', 'orders'],
    queryFn: () => orderService.getAllOrders(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: quotationsData } = useQuery({
    queryKey: ['dashboard', 'quotations'],
    queryFn: () => quotationService.getAllQuotations(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: customersData } = useQuery({
    queryKey: ['dashboard', 'customers'],
    queryFn: () => internationalCustomerService.getAllCustomers(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: feedbacksData } = useQuery({
    queryKey: ['dashboard', 'feedbacks'],
    queryFn: () => customerFeedbackService.getAllFeedbacks(),
    enabled: userIsAdmin,
  });

  const { data: processesData } = useQuery({
    queryKey: ['dashboard', 'processes'],
    queryFn: () => processService.getAllProcesses(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: inspectionsData } = useQuery({
    queryKey: ['dashboard', 'inspections'],
    queryFn: () => internalInspectionService.getAllInspections(),
    enabled: userIsAdmin,
  });

  const { data: qualityEvalData } = useQuery({
    queryKey: ['dashboard', 'qualityEvaluations'],
    queryFn: () => qualityEvaluationService.getAllQualityEvaluations(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['dashboard', 'employees'],
    queryFn: () => employeeService.getAllEmployees(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['dashboard', 'invoices'],
    queryFn: () => invoiceService.getAllInvoices(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: costsData } = useQuery({
    queryKey: ['dashboard', 'costs'],
    queryFn: () => generalCostService.getAllGeneralCosts(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: debtSummaryData } = useQuery({
    queryKey: ['dashboard', 'debtSummary'],
    queryFn: () => debtService.getDebtSummary(),
    enabled: userIsAdmin,
  });

  const { data: taxReportsData } = useQuery({
    queryKey: ['dashboard', 'taxReports'],
    queryFn: () => taxReportService.getAllTaxReports(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: machinesData } = useQuery({
    queryKey: ['dashboard', 'machines'],
    queryFn: () => machineService.getAllMachines(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: finishedProductsData } = useQuery({
    queryKey: ['dashboard', 'finishedProducts'],
    queryFn: () => finishedProductService.getAllFinishedProducts(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['dashboard', 'suppliers'],
    queryFn: () => supplierService.getAllSuppliers(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: supplyRequestsData } = useQuery({
    queryKey: ['dashboard', 'supplyRequests'],
    queryFn: () => supplyRequestService.getAllSupplyRequests(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: workPlansData } = useQuery({
    queryKey: ['dashboard', 'workPlans'],
    queryFn: () => workPlanService.getAllWorkPlans(1, 10000),
    enabled: userIsAdmin,
  });

  const { data: overtimePlansData } = useQuery({
    queryKey: ['dashboard', 'overtimePlans'],
    queryFn: () => overtimePlanService.getAll({ page: 1, limit: 1 }),
    enabled: userIsAdmin,
  });

  const { data: overtimePlansPendingData } = useQuery({
    queryKey: ['dashboard', 'overtimePlansPending'],
    queryFn: () => overtimePlanService.getAll({ page: 1, limit: 1, trangThai: OvertimePlanStatus.CHO_DUYET }),
    enabled: userIsAdmin,
  });

  // Compute department stats from real data
  const orders = ordersData?.data || [];
  const quotations = quotationsData?.data || [];
  const customers = customersData?.data || [];
  const feedbacks = Array.isArray(feedbacksData) ? feedbacksData : (feedbacksData?.data || []);
  const processes = processesData?.data || [];
  const inspections = Array.isArray(inspectionsData) ? inspectionsData : (inspectionsData?.data || []);
  const qualityEvals = qualityEvalData?.data || [];
  const employees = employeesData?.data || [];
  const invoices = invoicesData?.data || [];
  const costs = costsData?.data || [];
  const debtSummary = debtSummaryData?.data?.data || debtSummaryData?.data || {};
  const taxReports = taxReportsData?.data || [];
  const machines = machinesData?.data || [];
  const finishedProducts = finishedProductsData?.data || [];
  const suppliers = suppliersData?.data || [];
  const supplyRequests = supplyRequestsData?.data || [];
  const workPlans = workPlansData?.data || [];
  const workPlanCount = workPlans.length;
  const overtimeCount = overtimePlansData?.total ?? 0;
  const overtimePendingCount = overtimePlansPendingData?.total ?? 0;

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
  const quickStats = getQuickStats(tasksCount, feedbackCount, purchaseRequestCount, purchaseRequestPendingCount, workPlanCount, overtimeCount, overtimePendingCount);

  // Map stat type to unread notification count
  const getNotifCount = (type: string): number => {
    switch (type) {
      case 'tasks': return unreadByType['TASK'] || 0;
      case 'plans': return (unreadByType['OVERTIME_PLAN'] || 0) + (unreadByType['OVERTIME_PLAN_APPROVAL'] || 0);
      case 'evaluation': return (unreadByType['EVALUATION'] || 0) + (unreadByType['EVALUATION_SUPERVISOR1'] || 0) + (unreadByType['EVALUATION_SUPERVISOR2'] || 0) + (unreadByType['EVALUATION_COMPLETED'] || 0);
      case 'purchaseRequests': return (unreadByType['SUPPLY_REQUEST'] || 0) + (unreadByType['SUPPLY_REQUEST_PROCESSING'] || 0) + (unreadByType['SUPPLY_REQUEST_APPROVED'] || 0) + (unreadByType['SUPPLY_REQUEST_FULFILLED'] || 0);
      default: return 0;
    }
  };

  const departmentStats = {
    general: {
      name: "Bộ phận tổng hợp",
      icon: <Building2 className="h-6 w-6" />,
      color: "bg-slate-400",
      stats: [
        { label: "Đơn hàng", value: orders.length.toString(), link: "/general/pricing?tab=orders" },
        { label: "Báo giá", value: quotations.length.toString(), link: "/general/pricing?tab=requests" },
        { label: "Khách hàng", value: customers.length.toString(), link: "/general/partners" },
        { label: "Phản hồi KH", value: feedbacks.length.toString(), link: "/general/partners" }
      ]
    },
    quality: {
      name: "Bộ phận chất lượng",
      icon: <ShieldCheck className="h-6 w-6" />,
      color: "bg-emerald-400",
      stats: [
        { label: "Quy trình", value: processes.length.toString(), link: "/quality/process" },
        { label: "Kiểm tra NB", value: inspections.length.toString(), link: "/quality/office" },
        { label: "Đánh giá CL", value: qualityEvals.length.toString(), link: "/quality" },
        { label: "Nhân viên", value: employees.length.toString(), link: "/quality/personnel" }
      ]
    },
    business: {
      name: "Bộ phận kinh doanh",
      icon: <Briefcase className="h-6 w-6" />,
      color: "bg-blue-400",
      stats: [
        { label: "Đơn hàng", value: orders.length.toString(), link: "/business/management" },
        { label: "Khách hàng", value: customers.length.toString(), link: "/business/international" },
        { label: "Báo giá", value: quotations.length.toString(), link: "/business/management" },
        { label: "Phản hồi", value: feedbacks.length.toString(), link: "/business/domestic" }
      ]
    },
    accounting: {
      name: "Bộ phận kế toán",
      icon: <Calculator className="h-6 w-6" />,
      color: "bg-amber-400",
      stats: [
        { label: "Hóa đơn", value: invoices.length.toString(), link: "/accounting" },
        { label: "Chi phí", value: costs.length.toString(), link: "/accounting/admin" },
        { label: "Công nợ", value: (debtSummary?.soLuongCongNo || 0).toString(), link: "/accounting" },
        { label: "Báo cáo thuế", value: taxReports.length.toString(), link: "/accounting/tax" }
      ]
    },
    production: {
      name: "Bộ phận sản xuất",
      icon: <Factory className="h-6 w-6" />,
      color: "bg-indigo-400",
      stats: [
        { label: "Máy móc", value: machines.length.toString(), link: "/production/management" },
        { label: "Đang SX", value: orders.filter((o: any) => o.trangThaiSanXuat === 'DANG_SAN_XUAT').length.toString(), link: "/production/management" },
        { label: "Thành phẩm", value: finishedProducts.length.toString(), link: "/production/warehouse" },
        { label: "Đã giao", value: orders.filter((o: any) => o.trangThaiSanXuat === 'DA_GIAO_CHO_KHACH_HANG').length.toString(), link: "/production/management" }
      ]
    },
    purchasing: {
      name: "Bộ phận mua hàng",
      icon: <ShoppingCart className="h-6 w-6" />,
      color: "bg-teal-400",
      stats: [
        { label: "Yêu cầu mua", value: purchaseRequestCount.toString(), link: "/purchasing" },
        { label: "Nhà cung cấp", value: suppliers.length.toString(), link: "/purchasing/materials" },
        { label: "Yêu cầu cung ứng", value: supplyRequests.length.toString(), link: "/purchasing/equipment" },
        { label: "Chờ duyệt", value: purchaseRequestPendingCount.toString(), link: "/purchasing" }
      ]
    },
    technical: {
      name: "Bộ phận kỹ thuật",
      icon: <Wrench className="h-6 w-6" />,
      color: "bg-rose-400",
      stats: [
        { label: "Máy móc", value: machines.length.toString(), link: "/technical" },
        { label: "Bảo trì", value: machines.filter((m: any) => m.trangThai === 'BẢO_TRÌ').length.toString(), link: "/technical/mechanical" },
        { label: "Hoạt động", value: machines.filter((m: any) => m.trangThai === 'HOAT_DONG').length.toString(), link: "/technical" },
        { label: "Ngừng", value: machines.filter((m: any) => m.trangThai === 'NGỪNG_HOẠT_ĐỘNG').length.toString(), link: "/technical" }
      ]
    }
  };

  const handleDepartmentClick = (deptKey: string) => {
    // Navigate to department page
    window.location.href = `/${deptKey}`;
  };

  return (
    <div className={`min-h-screen ${getThemePageBackground(activeTheme)}`}>
      <div className="max-w-[95%] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section — same theme as employee dashboard */}
        <ThemeHeader activeTheme={activeTheme} user={user} departmentName={departmentName} />

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {quickStats.map((stat, index) => (
            <QuickStatCard
              key={index}
              stat={stat}
              notifCount={getNotifCount(stat.type)}
              onClick={stat.clickable ? () => {
                if (stat.type === 'tasks') {
                  setIsTaskListModalOpen(true);
                } else if (stat.type === 'feedbacks') {
                  setIsFeedbackListModalOpen(true);
                } else if (stat.type === 'purchaseRequests') {
                  setIsPurchaseRequestModalOpen(true);
                } else if (stat.type === 'plans') {
                  setIsPlanModalOpen(true);
                } else if (stat.type === 'evaluation') {
                  setIsEvaluationModalOpen(true);
                } else if (stat.type === 'dailyReports') {
                  setIsDailyReportModalOpen(true);
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
            <div className="space-y-4">
              {Object.entries(departmentStats).map(([key, department]) => (
                <div key={key}>
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

      {/* Combined Plan Modal (Kế hoạch công việc + Tăng ca) */}
      <PlanCombinedModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        isAdmin={userIsAdmin}
      />

      {/* Admin Evaluation Modal — opens on subordinate tab */}
      <EmployeeSelfEvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => setIsEvaluationModalOpen(false)}
        evaluationId={null}
        initialTab="subordinate"
      />

      {/* Daily Work Report List Modal */}
      <DailyWorkReportListModal
        isOpen={isDailyReportModalOpen}
        onClose={() => setIsDailyReportModalOpen(false)}
        isAdmin={true}
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
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã yêu cầu</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày yêu cầu</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ưu tiên</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Người duyệt</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseRequests.map((request: any, index: number) => {
                      const items = request.items || [];
                      const productNames = items.map((item: any) => item.tenHangHoa).filter(Boolean);
                      const productDisplay = productNames.length <= 3
                        ? productNames.join(', ')
                        : `${productNames.slice(0, 3).join(', ')}...`;
                      const totalAmount = items.reduce((sum: number, item: any) => sum + ((Number(item.giaDuKien) || 0) * (Number(item.soLuong) || 0)), 0);
                      return (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-blue-600">{request.maYeuCau}</td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {new Date(request.ngayYeuCau).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{request.tenNhanVien}</td>
                          <td className="px-3 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={productNames.join(', ')}>
                            {productDisplay || '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                            {totalAmount > 0 ? `${totalAmount.toLocaleString('vi-VN')}đ` : '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              request.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' :
                              request.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {request.mucDoUuTien}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              request.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' :
                              request.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' :
                              request.trangThai === 'Từ chối' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {request.trangThai}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">
                            {request.nguoiDuyet || '-'}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setSelectedPurchaseRequest(request)}
                                className="inline-flex items-center gap-1 px-2 py-1.5 text-blue-600 hover:bg-blue-50 rounded-md text-xs font-medium"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {request.trangThai === 'Chờ duyệt' && (
                                <>
                                  <button
                                    onClick={() => handleApprovePurchaseRequest(request.id, true)}
                                    disabled={approveLoading === request.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-xs font-medium"
                                    title="Duyệt"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleApprovePurchaseRequest(request.id, false)}
                                    disabled={approveLoading === request.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-xs font-medium"
                                    title="Từ chối"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              {request.trangThai !== 'Chờ duyệt' && (
                                <span className="text-gray-400 text-xs">Đã xử lý</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* Purchase Request Detail Modal */}
      {selectedPurchaseRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Eye className="h-5 w-5 text-blue-600 mr-2" />
                Chi tiết yêu cầu: {selectedPurchaseRequest.maYeuCau}
              </h2>
              <button
                onClick={() => setSelectedPurchaseRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* General Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mã yêu cầu</p>
                  <p className="text-sm font-semibold text-blue-600">{selectedPurchaseRequest.maYeuCau}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ngày yêu cầu</p>
                  <p className="text-sm font-medium">{new Date(selectedPurchaseRequest.ngayYeuCau).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Nhân viên</p>
                  <p className="text-sm font-medium">{selectedPurchaseRequest.tenNhanVien}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mã nhân viên</p>
                  <p className="text-sm font-medium">{selectedPurchaseRequest.maNhanVien || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mức độ ưu tiên</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedPurchaseRequest.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' :
                    selectedPurchaseRequest.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {selectedPurchaseRequest.mucDoUuTien}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Trạng thái</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedPurchaseRequest.trangThai === 'Chờ duyệt' ? 'bg-yellow-100 text-yellow-800' :
                    selectedPurchaseRequest.trangThai === 'Đã duyệt' ? 'bg-green-100 text-green-800' :
                    selectedPurchaseRequest.trangThai === 'Từ chối' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedPurchaseRequest.trangThai}
                  </span>
                </div>
                {selectedPurchaseRequest.nguoiDuyet && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Người duyệt</p>
                    <p className="text-sm font-medium">{selectedPurchaseRequest.nguoiDuyet}</p>
                  </div>
                )}
                {selectedPurchaseRequest.ngayDuyet && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ngày duyệt</p>
                    <p className="text-sm font-medium">{new Date(selectedPurchaseRequest.ngayDuyet).toLocaleDateString('vi-VN')}</p>
                  </div>
                )}
              </div>

              {/* Purpose */}
              {selectedPurchaseRequest.mucDichYeuCau && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mục đích yêu cầu</p>
                  <p className="text-sm bg-gray-50 rounded-lg p-3">{selectedPurchaseRequest.mucDichYeuCau}</p>
                </div>
              )}

              {/* Notes */}
              {selectedPurchaseRequest.ghiChu && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ghi chú</p>
                  <p className="text-sm bg-gray-50 rounded-lg p-3">{selectedPurchaseRequest.ghiChu}</p>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Danh sách sản phẩm</p>
                {selectedPurchaseRequest.items && selectedPurchaseRequest.items.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Phân loại</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tên hàng hóa</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">SL</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">ĐVT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nhà cung cấp</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Đơn giá</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedPurchaseRequest.items.map((item: any, i: number) => {
                        const donGia = Number(item.giaDuKien) || 0;
                        const soLuong = Number(item.soLuong) || 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-sm text-gray-600">{i + 1}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.phanLoai || '-'}</td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-900">{item.tenHangHoa}</td>
                            <td className="px-3 py-2 text-sm text-right text-gray-900">{soLuong}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.donViTinh}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{item.supplier?.tenNhaCungCap || item.supplier?.tenNCC || '-'}</td>
                            <td className="px-3 py-2 text-sm text-right text-gray-900">{donGia > 0 ? `${donGia.toLocaleString('vi-VN')}đ` : '-'}</td>
                            <td className="px-3 py-2 text-sm text-right font-medium text-gray-900">{donGia > 0 ? `${(donGia * soLuong).toLocaleString('vi-VN')}đ` : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={7} className="px-3 py-2 text-sm font-bold text-gray-700 text-right">Tổng cộng:</td>
                        <td className="px-3 py-2 text-sm font-bold text-right text-blue-700">
                          {selectedPurchaseRequest.items.reduce((sum: number, item: any) => sum + ((Number(item.giaDuKien) || 0) * (Number(item.soLuong) || 0)), 0).toLocaleString('vi-VN')}đ
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <p className="text-sm text-gray-400">Không có sản phẩm</p>
                )}
              </div>

              {/* Purchase notes */}
              {selectedPurchaseRequest.ghiChuMuaHang && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Ghi chú mua hàng</p>
                  <p className="text-sm bg-gray-50 rounded-lg p-3">{selectedPurchaseRequest.ghiChuMuaHang}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedPurchaseRequest(null)}
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
