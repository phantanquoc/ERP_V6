import React, { useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  ShieldCheck,
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
  FileText,
  TrendingUp,
  TrendingDown
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
import machineSystemService from "../services/machineSystemService";
import repairRequestService from "../services/repairRequestService";
import faultRecordService from "../services/faultRecordService";
import sparePartService from "../services/sparePartService";
import projectService from "../services/projectService";
import finishedProductService from "../services/finishedProductService";
import { supplierService } from "../services/supplierService";
import supplyRequestService from "../services/supplyRequestService";
import taxReportService from "../services/taxReportService";
import qualityEvaluationService from "../services/qualityEvaluationService";
import { workPlanService } from "../services/workPlanService";
import employeeEvaluationService from "../services/employeeEvaluationService";
import dailyWorkReportService from "../services/dailyWorkReportService";
import { taskService } from "../services/taskService";
import DatePicker from "../components/DatePicker";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartCard from '../design-system/ChartCard';

// ── Time-period filter helpers ────────────────────────────────────────────────
type PeriodFilter = 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

const PRESET_PERIODS = ['week', 'month', 'quarter', 'year', 'all'] as const;

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  week: 'Tuần này',
  month: 'Tháng này',
  quarter: 'Quý này',
  year: 'Năm này',
  all: 'Tất cả',
  custom: 'Tùy chọn',
};

function getPresetStart(period: Exclude<PeriodFilter, 'custom'>): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (period === 'week') {
    const day = now.getDay();
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  } else if (period === 'month') {
    start.setDate(1);
  } else if (period === 'quarter') {
    start.setMonth(Math.floor(now.getMonth() / 3) * 3, 1);
  } else if (period === 'year') {
    start.setMonth(0, 1);
  }
  return start;
}

/** Filters items by an explicit [start, end] window. Pass null to skip that bound. */
function filterByDateRange<T extends Record<string, any>>(
  items: T[],
  start: Date | null,
  end: Date | null,
  dateField = 'createdAt',
  fallbackField?: string,
): T[] {
  if (!start && !end) return items;
  return items.filter(item => {
    const raw = item[dateField] ?? (fallbackField ? item[fallbackField] : undefined);
    if (!raw) return false;
    const d = new Date(raw);
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// Quick Stats for Overview
type DeltaInfo = { delta: number; pct: number; show: boolean } | null;
const getQuickStats = (
  tasksCount: number = 0,
  feedbackCount: number = 0,
  purchaseRequestCount: number = 0,
  purchaseRequestPendingCount: number = 0,
  workPlanCount: number = 0,
  overtimeCount: number = 0,
  overtimePendingCount: number = 0,
  evaluationPendingCount: number = 0,
  reportUnreadCount: number = 0,
  purchaseDelta: DeltaInfo = null,
  tasksDelta: DeltaInfo = null,
) => [
  { label: "Mua hàng", value: purchaseRequestCount.toString(), change: `Chờ duyệt: ${purchaseRequestPendingCount}`, icon: <ShoppingCart className="h-4 w-4" />, color: "text-blue-600", bgColor: "bg-blue-50", clickable: true, type: 'purchaseRequests', delta: purchaseDelta },
  { label: "Nhiệm vụ", value: tasksCount.toString(), change: `${tasksCount} nhiệm vụ`, icon: <CheckSquare className="h-4 w-4" />, color: "text-green-600", bgColor: "bg-green-50", clickable: true, type: 'tasks', delta: tasksDelta },
  { label: "Kế hoạch", value: (workPlanCount + overtimeCount).toString(), change: `TC chờ duyệt: ${overtimePendingCount}`, icon: <Calendar className="h-4 w-4" />, color: overtimePendingCount > 0 ? "text-red-600" : "text-purple-600", bgColor: overtimePendingCount > 0 ? "bg-red-50" : "bg-purple-50", clickable: true, type: 'plans' },
  { label: "Góp ý & KK", value: feedbackCount.toString(), change: `${feedbackCount} góp ý`, icon: <AlertTriangle className="h-4 w-4" />, color: "text-orange-600", bgColor: "bg-orange-50", clickable: true, type: 'feedbacks' },
  { label: "Đánh giá", value: "", change: `${evaluationPendingCount} chưa đánh giá`, icon: <Award className="h-4 w-4" />, color: "text-purple-600", bgColor: "bg-purple-50", clickable: true, type: 'evaluation' },
  { label: "Báo cáo", value: "", change: `${reportUnreadCount} chưa xem`, icon: <FileText className="h-4 w-4" />, color: "text-teal-600", bgColor: "bg-teal-50", clickable: true, type: 'dailyReports' }
];

// Component for Department Card — neutral shell, accent bar + icon only
const DepartmentCard: React.FC<{
  department: any;
  onClick: () => void;
  onStatClick: (link: string) => void;
  isFullWidth?: boolean;
}> = React.memo(({ department, onClick, onStatClick, isFullWidth = false }) => (
  <div
    role="button"
    tabIndex={0}
    aria-label={department.name}
    onClick={onClick}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    className="bg-white rounded-lg shadow-sm border border-gray-200 hover:border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
  >
    {/* Header with accent bar */}
    <div className="p-3 rounded-t-lg relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-1 ${department.color}`}></div>
      <div className="flex items-center justify-between text-gray-700 pt-1">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${department.color} bg-opacity-10`}>
            <div className="text-gray-600">{department.icon}</div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700">{department.name}</h3>
            <p className="text-xs text-gray-400 font-medium">{department.stats.length} chỉ tiêu</p>
          </div>
        </div>
        <div className="text-gray-300 hover:text-gray-500 transition-colors">
          <BarChart3 className="h-5 w-5" />
        </div>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="p-3 pt-1">
      <div className={`grid gap-3 ${isFullWidth ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {department.stats.map((stat: any, index: number) => (
          <div
            key={index}
            role={stat.link ? 'button' : undefined}
            tabIndex={stat.link ? 0 : undefined}
            aria-label={stat.link ? stat.label : undefined}
            onClick={stat.link ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onStatClick(stat.link);
            } : undefined}
            onKeyDown={stat.link ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onStatClick(stat.link); } } : undefined}
            className={`text-center p-2 rounded-lg bg-gray-50 border border-transparent ${stat.link ? 'cursor-pointer hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1' : ''}`}
          >
            <div className="text-lg font-bold text-gray-800 tabular-nums leading-none">{stat.value}</div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mt-1.5">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
));
DepartmentCard.displayName = 'DepartmentCard';

// Component for Quick Stat Card — neutral shell, uniform height
const QuickStatCard: React.FC<{
  stat: any;
  onClick?: () => void;
}> = React.memo(({ stat, onClick }) => (
  <div
    role={stat.clickable ? 'button' : undefined}
    tabIndex={stat.clickable ? 0 : undefined}
    aria-label={stat.clickable ? stat.label : undefined}
    onKeyDown={stat.clickable ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
    className={`bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full p-3 sm:p-3.5 ${stat.clickable ? 'cursor-pointer hover:border-gray-300 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2' : ''} relative`}
    onClick={stat.clickable ? onClick : undefined}
  >
    <div className="flex items-center gap-2.5 flex-1 min-h-0">
      <div className={`p-2 rounded-lg ${stat.bgColor || 'bg-blue-50'} ${stat.color} shrink-0`}>
        {stat.icon}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide leading-none truncate">{stat.label}</span>
        <span className={`text-lg sm:text-xl font-bold leading-none tabular-nums mt-1 truncate ${stat.hasNotification ? 'text-red-600' : 'text-gray-900'}`}>{stat.value || '—'}</span>
      </div>
    </div>
    <p className={`text-xs font-medium truncate mt-2 leading-none ${stat.color}`}>{stat.change}</p>
    {stat.delta?.show && stat.delta.delta !== 0 && (
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold mt-1 ${stat.delta.delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
        {stat.delta.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {stat.delta.delta > 0 ? `↑${stat.delta.pct}%` : `↓${Math.abs(stat.delta.pct)}%`} vs kỳ trước
      </span>
    )}
  </div>
));
QuickStatCard.displayName = 'QuickStatCard';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [isFeedbackListModalOpen, setIsFeedbackListModalOpen] = useState(false);
  const [isPurchaseRequestModalOpen, setIsPurchaseRequestModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [approveLoading, setApproveLoading] = useState<string | null>(null);
  const [selectedPurchaseRequest, setSelectedPurchaseRequest] = useState<any | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('month');
  // Custom date range (YYYY-MM-DD strings for <input type="date">)
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const userIsAdmin = user ? isAdmin(user.department) : false;
  const canSeeStats = userIsAdmin;
  const { settings } = useSystemSettings();
  const activeTheme = settings?.activeTheme || 'DEFAULT';

  // Use React Query hooks for data fetching with caching
  const { data: tasksCount = 0 } = useTasksCount();
  const { data: feedbackStats } = usePrivateFeedbackStats();
  const feedbackCount = feedbackStats?.data?.total || 0;

  // Purchase requests query
  const { data: purchaseRequestsData } = useQuery({
    queryKey: ['purchaseRequests', 'dashboard'],
    queryFn: () => purchaseRequestService.getAllPurchaseRequests(1, 10000),
    enabled: canSeeStats,
  });

  const purchaseRequests = (purchaseRequestsData as any)?.data || [];

  // Dashboard stats queries
  const { data: ordersData } = useQuery({
    queryKey: ['dashboard', 'orders'],
    queryFn: () => orderService.getAllOrders(1, 10000),
    enabled: canSeeStats,
  });

  const { data: quotationsData } = useQuery({
    queryKey: ['dashboard', 'quotations'],
    queryFn: () => quotationService.getAllQuotations(1, 10000),
    enabled: canSeeStats,
  });

  const { data: customersData } = useQuery({
    queryKey: ['dashboard', 'customers'],
    queryFn: () => internationalCustomerService.getAllCustomers(1, 10000),
    enabled: canSeeStats,
  });

  const { data: feedbacksData } = useQuery({
    queryKey: ['dashboard', 'feedbacks'],
    queryFn: () => customerFeedbackService.getAllFeedbacks(),
    enabled: canSeeStats,
  });

  const { data: processesData } = useQuery({
    queryKey: ['dashboard', 'processes'],
    queryFn: () => processService.getAllProcesses(1, 10000),
    enabled: canSeeStats,
  });

  const { data: inspectionsData } = useQuery({
    queryKey: ['dashboard', 'inspections'],
    queryFn: () => internalInspectionService.getAllInspections(),
    enabled: canSeeStats,
  });

  const { data: qualityEvalData } = useQuery({
    queryKey: ['dashboard', 'qualityEvaluations'],
    queryFn: () => qualityEvaluationService.getAllQualityEvaluations(1, 10000),
    enabled: canSeeStats,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['dashboard', 'employees'],
    queryFn: () => employeeService.getAllEmployees(1, 10000),
    enabled: canSeeStats,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['dashboard', 'invoices'],
    queryFn: () => invoiceService.getAllInvoices(1, 10000),
    enabled: canSeeStats,
  });

  const { data: costsData } = useQuery({
    queryKey: ['dashboard', 'costs'],
    queryFn: () => generalCostService.getAllGeneralCosts(1, 10000),
    enabled: canSeeStats,
  });

  const { data: debtSummaryData } = useQuery({
    queryKey: ['dashboard', 'debtSummary'],
    queryFn: () => debtService.getDebtSummary(),
    enabled: canSeeStats,
  });

  const { data: taxReportsData } = useQuery({
    queryKey: ['dashboard', 'taxReports'],
    queryFn: () => taxReportService.getAllTaxReports(1, 10000),
    enabled: canSeeStats,
  });

  const { data: machineSystemsData } = useQuery({
    queryKey: ['dashboard', 'machineSystems'],
    queryFn: () => machineSystemService.getMachineSystems({ page: 1, limit: 10000 }),
    enabled: canSeeStats,
  });

  const { data: repairRequestsData } = useQuery({
    queryKey: ['dashboard', 'repairRequests'],
    queryFn: () => repairRequestService.getAll({ page: 1, limit: 10000 }),
    enabled: canSeeStats,
  });

  const { data: faultRecordsData } = useQuery({
    queryKey: ['dashboard', 'faultRecords'],
    queryFn: () => faultRecordService.getAll({ page: 1, limit: 10000 }),
    enabled: canSeeStats,
  });

  const { data: sparePartsData } = useQuery({
    queryKey: ['dashboard', 'spareParts'],
    queryFn: () => sparePartService.getAll({ page: 1, limit: 10000 }),
    enabled: canSeeStats,
  });

  const { data: projectsData } = useQuery({
    queryKey: ['dashboard', 'projects'],
    queryFn: () => projectService.getAll({ page: 1, limit: 10000 }),
    enabled: canSeeStats,
  });

  const { data: finishedProductsData } = useQuery({
    queryKey: ['dashboard', 'finishedProducts'],
    queryFn: () => finishedProductService.getAllFinishedProducts(1, 10000),
    enabled: canSeeStats,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['dashboard', 'suppliers'],
    queryFn: () => supplierService.getAllSuppliers(1, 10000),
    enabled: canSeeStats,
  });

  const { data: supplyRequestsData } = useQuery({
    queryKey: ['dashboard', 'supplyRequests'],
    queryFn: () => supplyRequestService.getAllSupplyRequests(1, 10000),
    enabled: canSeeStats,
  });

  const { data: workPlansData } = useQuery({
    queryKey: ['dashboard', 'workPlans'],
    queryFn: () => workPlanService.getAllWorkPlans(1, 10000),
    enabled: canSeeStats,
  });

  const { data: overtimePlansData } = useQuery({
    queryKey: ['dashboard', 'overtimePlans'],
    queryFn: () => overtimePlanService.getAll({ page: 1, limit: 1 }),
    enabled: canSeeStats,
  });

  const { data: overtimePlansPendingData } = useQuery({
    queryKey: ['dashboard', 'overtimePlansPending'],
    queryFn: () => overtimePlanService.getAll({ page: 1, limit: 1, trangThai: OvertimePlanStatus.CHO_DUYET }),
    enabled: canSeeStats,
  });

  const { data: evaluationPendingCountRaw = 0 } = useQuery({
    queryKey: ['dashboard', 'evaluationPendingCount'],
    queryFn: () => employeeEvaluationService.getPendingCount(),
    enabled: canSeeStats,
    staleTime: 2 * 60 * 1000,
  });
  // Đảm bảo luôn là number (tránh [object Object] nếu API trả về object)
  const evaluationPendingCount = typeof evaluationPendingCountRaw === 'object'
    ? ((evaluationPendingCountRaw as any)?.count ?? 0)
    : Number(evaluationPendingCountRaw);

  const { data: reportUnreadCount = 0 } = useQuery({
    queryKey: ['dashboard', 'reportSubmittedCount'],
    queryFn: () => dailyWorkReportService.getSubmittedCount(),
    enabled: canSeeStats,
    staleTime: 2 * 60 * 1000,
  });

  // Compute department stats from real data
  const orders = (ordersData as any)?.data || [];
  const quotations = (quotationsData as any)?.data || [];
  const customers = (customersData as any)?.data || [];
  const feedbacks = Array.isArray(feedbacksData) ? feedbacksData : ((feedbacksData as any)?.data || []);
  const processes = (processesData as any)?.data || [];
  const inspections = Array.isArray(inspectionsData) ? inspectionsData : ((inspectionsData as any)?.data || []);
  const qualityEvals = (qualityEvalData as any)?.data || [];
  const employees = (employeesData as any)?.data || [];
  const invoices = (invoicesData as any)?.data || [];
  const costs = (costsData as any)?.data || [];
  const debtSummary = (debtSummaryData as any)?.data?.data || (debtSummaryData as any)?.data || {};
  const taxReports = (taxReportsData as any)?.data || [];
  const machines = (machineSystemsData as any)?.data || [];
  const machineSystems = (machineSystemsData as any)?.data || [];
  const repairRequests = (repairRequestsData as any)?.data || [];
  const faultRecords = (faultRecordsData as any)?.data || [];
  const spareParts = (sparePartsData as any)?.data || [];
  const projects = (projectsData as any)?.data || [];
  const finishedProducts = (finishedProductsData as any)?.data || [];
  const suppliers = (suppliersData as any)?.data || [];
  const supplyRequests = (supplyRequestsData as any)?.data || [];
  const workPlans = (workPlansData as any)?.data || [];
  const overtimeCount = overtimePlansData?.total ?? 0;
  const overtimePendingCount = overtimePlansPendingData?.total ?? 0;

  // ── Resolve active date window ─────────────────────────────────────────────
  const filterStart: Date | null = useMemo(() =>
    selectedPeriod === 'custom'
      ? (customStart ? new Date(customStart + 'T00:00:00') : null)
      : getPresetStart(selectedPeriod as Exclude<PeriodFilter, 'custom'>),
    [selectedPeriod, customStart]
  );

  const filterEnd: Date | null = useMemo(() =>
    selectedPeriod === 'custom'
      ? (customEnd ? new Date(customEnd + 'T23:59:59') : null)
      : null, // preset periods: no upper bound (up to now)
    [selectedPeriod, customEnd]
  );

  // ── Apply filter to transactional data ─────────────────────────────────────
  // Static metrics (employees, machines, processes, suppliers, customers, debt)
  // are intentionally NOT filtered — they represent current totals.
  const filteredOrders           = useMemo(() => filterByDateRange(orders,           filterStart, filterEnd), [orders, filterStart, filterEnd]);
  const filteredQuotations       = useMemo(() => filterByDateRange(quotations,       filterStart, filterEnd), [quotations, filterStart, filterEnd]);
  const filteredFeedbacks        = useMemo(() => filterByDateRange(feedbacks,        filterStart, filterEnd, 'createdAt', 'ngayPhanHoi'), [feedbacks, filterStart, filterEnd]);
  const filteredInspections      = useMemo(() => filterByDateRange(inspections,      filterStart, filterEnd, 'inspectionDate'), [inspections, filterStart, filterEnd]);
  const filteredQualityEvals     = useMemo(() => filterByDateRange(qualityEvals,     filterStart, filterEnd), [qualityEvals, filterStart, filterEnd]);
  const filteredInvoices         = useMemo(() => filterByDateRange(invoices,         filterStart, filterEnd), [invoices, filterStart, filterEnd]);
  const filteredCosts            = useMemo(() => filterByDateRange(costs,            filterStart, filterEnd), [costs, filterStart, filterEnd]);
  const filteredTaxReports       = useMemo(() => filterByDateRange(taxReports,       filterStart, filterEnd), [taxReports, filterStart, filterEnd]);
  const filteredFinishedProducts = useMemo(() => filterByDateRange(finishedProducts, filterStart, filterEnd), [finishedProducts, filterStart, filterEnd]);
  const filteredSupplyRequests   = useMemo(() => filterByDateRange(supplyRequests,   filterStart, filterEnd, 'ngayYeuCau', 'createdAt'), [supplyRequests, filterStart, filterEnd]);
  const filteredWorkPlans        = useMemo(() => filterByDateRange(workPlans,        filterStart, filterEnd, 'ngayBatDau'), [workPlans, filterStart, filterEnd]);
  const filteredPurchaseRequests = useMemo(() => filterByDateRange(purchaseRequests, filterStart, filterEnd, 'ngayYeuCau', 'createdAt'), [purchaseRequests, filterStart, filterEnd]);
  // Derived counts — always reflect the active period filter
  const workPlanCount             = filteredWorkPlans.length;
  const purchaseRequestCount      = filteredPurchaseRequests.length;
  // Đếm ALL pending requests (không lọc theo kỳ) — tránh miss yêu cầu tháng trước còn chờ duyệt
  const purchaseRequestPendingCount = useMemo(() => (purchaseRequests as PurchaseRequest[]).filter(
    (r: PurchaseRequest) => r.trangThai === 'Chờ duyệt'
  ).length, [purchaseRequests]);
  // ──────────────────────────────────────────────────────────────────────────

  // Mutation for approving/rejecting purchase requests
  const approveMutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) =>
      purchaseRequestService.updatePurchaseRequest(id, {
        trangThai: approve ? 'Đã duyệt' : 'Từ chối',
        nguoiDuyet: user?.fullName || user?.username,
        ngayDuyet: new Date().toISOString(),
      }),
    onSuccess: (_, { approve }) => {
      toast.success(approve ? 'Đã duyệt yêu cầu' : 'Đã từ chối yêu cầu');
      queryClient.invalidateQueries({ queryKey: ['purchaseRequests'] });
    },
    onError: (error: any) => {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi xử lý yêu cầu');
    },
  });

  const handleApprovePurchaseRequest = (id: string, approve: boolean) => {
    if (!user) return;
    setApproveLoading(id);
    approveMutation.mutate({ id, approve }, {
      onSettled: () => setApproveLoading(null),
    });
  };

  // Hooks hoisted above early returns to satisfy Rules of Hooks
  const quickStats = useMemo(
    () => getQuickStats(tasksCount, feedbackCount, purchaseRequestCount, purchaseRequestPendingCount, workPlanCount, overtimeCount, overtimePendingCount, evaluationPendingCount, reportUnreadCount),
    [tasksCount, feedbackCount, purchaseRequestCount, purchaseRequestPendingCount, workPlanCount, overtimeCount, overtimePendingCount, evaluationPendingCount, reportUnreadCount]
  );

  const departmentStats = useMemo(() => ({
    general: {
      name: "Bộ phận tổng hợp",
      icon: <Building2 className="h-6 w-6" />,
      color: "bg-slate-400",
      stats: [
        { label: "Đơn hàng", value: filteredOrders.length.toString(), link: "/general/pricing?tab=orders" },
        { label: "Báo giá", value: filteredQuotations.length.toString(), link: "/general/pricing?tab=quotes" },
        { label: "Khách hàng", value: customers.length.toString(), link: "/general/partners" },
        { label: "Phản hồi KH", value: filteredFeedbacks.length.toString(), link: "/general/partners" }
      ]
    },
    quality: {
      name: "Bộ phận chất lượng",
      icon: <ShieldCheck className="h-6 w-6" />,
      color: "bg-emerald-400",
      stats: [
        { label: "Quy trình", value: processes.length.toString(), link: "/quality/process" },
        { label: "Kiểm tra NB", value: filteredInspections.length.toString(), link: "/quality/process?tab=inspection" },
        { label: "Đánh giá CL", value: filteredQualityEvals.length.toString(), link: "/production/management?tab=qualityEvaluation" },
        { label: "Nhân viên", value: employees.length.toString(), link: "/quality/personnel?tab=employees" }
      ]
    },
    business: {
      name: "Bộ phận kinh doanh",
      icon: <Briefcase className="h-6 w-6" />,
      color: "bg-blue-400",
      stats: [
        { label: "Đơn hàng", value: filteredOrders.length.toString(), link: "/business/domestic?tab=orders" },
        { label: "Khách hàng", value: customers.length.toString(), link: "/business/international?tab=customers" },
        { label: "Báo giá", value: filteredQuotations.length.toString(), link: "/business/domestic?tab=quotations" },
        { label: "Phản hồi", value: filteredFeedbacks.length.toString(), link: "/business/domestic?tab=feedback" }
      ]
    },
    accounting: {
      name: "Bộ phận kế toán",
      icon: <Calculator className="h-6 w-6" />,
      color: "bg-amber-400",
      stats: [
        { label: "Hóa đơn", value: filteredInvoices.length.toString(), link: "/accounting/admin?tab=invoices" },
        { label: "Chi phí", value: filteredCosts.length.toString(), link: "/general" },
        { label: "Công nợ", value: (debtSummary?.soLuongCongNo || 0).toString(), link: "/accounting/admin?tab=debts" },
        { label: "Báo cáo thuế", value: filteredTaxReports.length.toString(), link: "/accounting/tax" }
      ]
    },
    production: {
      name: "Bộ phận sản xuất",
      icon: <Factory className="h-6 w-6" />,
      color: "bg-indigo-400",
      stats: [
        { label: "Hệ thống máy", value: machines.length.toString(), link: "/technical/quality?tab=machineSystems" },
        { label: "Đang SX", value: filteredOrders.filter((o: any) => o.trangThaiSanXuat === 'DANG_SAN_XUAT').length.toString(), link: "/production/management?tab=productionOrders" },
        { label: "Thành phẩm", value: filteredFinishedProducts.length.toString(), link: "/production/management?tab=finishedProduct" },
        { label: "Đã giao", value: filteredOrders.filter((o: any) => o.trangThaiSanXuat === 'DA_GIAO_CHO_KHACH_HANG').length.toString(), link: "/production/management?tab=orderList" }
      ]
    },
    purchasing: {
      name: "Bộ phận mua hàng",
      icon: <ShoppingCart className="h-6 w-6" />,
      color: "bg-teal-400",
      stats: [
        { label: "Yêu cầu mua", value: purchaseRequestCount.toString(), link: "/purchasing/materials?tab=purchaseRequestList" },
        { label: "Nhà cung cấp", value: suppliers.length.toString(), link: "/purchasing/materials?tab=suppliers" },
        { label: "Yêu cầu cung ứng", value: filteredSupplyRequests.length.toString(), link: "/production/warehouse?tab=supplyRequest" },
        { label: "Chờ duyệt", value: purchaseRequestPendingCount.toString(), link: "/purchasing/materials?tab=purchaseRequestList" }
      ]
    },
    technical: {
      name: "Bộ phận kỹ thuật",
      icon: <Wrench className="h-6 w-6" />,
      color: "bg-rose-400",
      stats: [
        { label: "Hệ thống máy", value: machineSystems.length.toString(), link: "/technical/quality?tab=machineSystems" },
        { label: "Yêu cầu sửa chữa", value: repairRequests.length.toString(), link: "/technical/quality?tab=repairAndFault" },
        { label: "Mẫu lỗi", value: faultRecords.length.toString(), link: "/technical/quality?tab=repairAndFault" },
        { label: "Linh kiện", value: spareParts.length.toString(), link: "/technical/quality?tab=partsAndOrders" },
        { label: "Dự án", value: projects.length.toString(), link: "/technical/projects" },
      ]
    }
  }), [
    filteredOrders, filteredQuotations, customers, filteredFeedbacks,
    processes, filteredInspections, filteredQualityEvals, employees,
    filteredInvoices, filteredCosts, debtSummary, filteredTaxReports,
    machines, filteredFinishedProducts, purchaseRequestCount, suppliers,
    filteredSupplyRequests, purchaseRequestPendingCount,
    machineSystems, repairRequests, faultRecords, spareParts, projects,
  ]);

  // Hero trend chart — monthly bucketing T1-T12 (current year), respects period filter via filteredOrders/filteredQuotations
  const heroChartData = useMemo(() => {
    const year = new Date().getFullYear();
    const orderCounts = new Array(12).fill(0);
    const quotationCounts = new Array(12).fill(0);
    (filteredOrders as any[]).forEach((o: any) => {
      const d = new Date(o.ngayDatHang || o.createdAt);
      if (!isNaN(d.getTime()) && d.getFullYear() === year) orderCounts[d.getMonth()]++;
    });
    (filteredQuotations as any[]).forEach((q: any) => {
      const d = new Date(q.createdAt || q.ngayTao);
      if (!isNaN(d.getTime()) && d.getFullYear() === year) quotationCounts[d.getMonth()]++;
    });
    return orderCounts.map((c, i) => ({
      month: `T${i + 1}`,
      orders: c,
      quotations: quotationCounts[i],
    }));
  }, [filteredOrders, filteredQuotations]);

  const handleDepartmentClick = useCallback((deptKey: string) => {
    navigate(`/${deptKey}`);
  }, [navigate]);

  const handleStatClick = useCallback((link: string) => {
    navigate(link);
  }, [navigate]);

  const handleQuickStatClick = useCallback((type: string) => {
    if (type === 'tasks') {
      setIsTaskListModalOpen(true);
    } else if (type === 'feedbacks') {
      setIsFeedbackListModalOpen(true);
    } else if (type === 'purchaseRequests') {
      setIsPurchaseRequestModalOpen(true);
    } else if (type === 'plans') {
      setIsPlanModalOpen(true);
    } else if (type === 'evaluation') {
      setIsEvaluationModalOpen(true);
    } else if (type === 'dailyReports') {
      setIsDailyReportModalOpen(true);
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center" role="status" aria-live="polite" aria-busy="true">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" aria-hidden="true"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Non-stats users (EMPLOYEE, TEAM_LEAD) see the personal employee dashboard
  if (!canSeeStats) {
    return <EmployeeDashboard />;
  }

  // Nếu là admin, hiển thị Admin Dashboard
  const departmentName = getDepartmentDisplayName(user.department);

  return (
    <div className={`-m-6 min-h-full ${getThemePageBackground(activeTheme)}`}>
      <div className="w-full px-4 lg:px-6 py-4">
        {/* Header Section — same theme as employee dashboard */}
        <div className="mb-5">
          <ThemeHeader activeTheme={activeTheme} user={user} departmentName={departmentName} />
        </div>

        {/* Period Filter */}
        <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Main row: label + segmented control */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
            {/* Left: icon + label + date range */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg shrink-0">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-400 leading-none mb-0.5">Kỳ thống kê</p>
                <p className="text-xs sm:text-sm font-semibold text-gray-700 leading-none truncate">
                  {selectedPeriod === 'all'
                    ? 'Toàn bộ dữ liệu'
                    : selectedPeriod === 'custom'
                    ? (customStart || customEnd)
                      ? `${customStart ? new Date(customStart).toLocaleDateString('vi-VN') : '?'} – ${customEnd ? new Date(customEnd).toLocaleDateString('vi-VN') : 'nay'}`
                      : 'Chọn khoảng thời gian'
                    : (() => {
                        const start = getPresetStart(selectedPeriod as Exclude<PeriodFilter, 'custom'>);
                        if (!start) return '';
                        const fmt = (d: Date) =>
                          d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        return `${fmt(start)} – ${fmt(new Date())}`;
                      })()
                  }
                </p>
              </div>
            </div>

            {/* Right: segmented control */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1 sm:pb-0 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Preset periods */}
              <div className="flex items-center bg-gray-100 rounded-lg sm:rounded-lg p-0.5 sm:p-1 gap-0.5 snap-start shrink-0">
                {PRESET_PERIODS.map(p => (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriod(p)}
                    className={`snap-start px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                      selectedPeriod === p
                        ? 'bg-white text-blue-600 shadow-sm font-semibold'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
              {/* Divider */}
              <div className="w-px h-5 sm:h-6 bg-gray-200 mx-0.5 sm:mx-1 shrink-0 snap-start" />
              {/* Custom button */}
              <button
                onClick={() => setSelectedPeriod('custom')}
                className={`snap-start shrink-0 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 border whitespace-nowrap ${
                  selectedPeriod === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Tùy chọn
              </button>
            </div>
          </div>

          {/* Expanded date range row — only when 'custom' selected */}
          {selectedPeriod === 'custom' && (
            <div className="px-3 sm:px-5 py-2 sm:py-3 border-t border-gray-100 bg-blue-50/40 flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-gray-600 shrink-0">Từ ngày</span>
              <DatePicker
                value={customStart}
                onChange={setCustomStart}
                maxDate={customEnd || new Date().toISOString().slice(0, 10)}
                placeholder="Chọn ngày bắt đầu"
                allowClear
              />
              <span className="text-gray-400">→</span>
              <span className="text-sm font-medium text-gray-600 shrink-0">Đến ngày</span>
              <DatePicker
                value={customEnd}
                onChange={setCustomEnd}
                minDate={customStart || undefined}
                maxDate={new Date().toISOString().slice(0, 10)}
                placeholder="Chọn ngày kết thúc"
                allowClear
              />
              {(customStart || customEnd) && (
                <button
                  onClick={() => { setCustomStart(''); setCustomEnd(''); }}
                  className="ml-1 text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Xóa
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats Overview — uniform height cards, responsive grid with snap on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 mb-4">
          {quickStats.map((stat, index) => (
            <div key={index} className="h-full">
              <QuickStatCard
                stat={stat}
                onClick={stat.clickable ? () => handleQuickStatClick(stat.type) : undefined}
              />
            </div>
          ))}
        </div>

        {/* Hero trend chart — spans full width */}
        <ChartCard title="Xu hướng đơn hàng & báo giá theo tháng" variant="dark">
          <p className="text-xs text-gray-400 mb-3">Năm {new Date().getFullYear()} — theo ngày đặt hàng / ngày tạo</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={heroChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }}
                formatter={(value: number, name: string) => [value, name === 'orders' ? 'Đơn hàng' : 'Báo giá']}
                labelFormatter={(label: string) => label}
              />
              <Legend wrapperStyle={{ paddingTop: '5px', color: '#fff' }} iconType="line" formatter={(value: string) => value === 'orders' ? 'Đơn hàng' : 'Báo giá'} />
              <Line type="monotone" dataKey="orders" stroke="#38bdf8" strokeWidth={3} dot={{ fill: '#38bdf8', r: 3 }} activeDot={{ r: 6 }} name="orders" />
              <Line type="monotone" dataKey="quotations" stroke="#a78bfa" strokeWidth={3} dot={{ fill: '#a78bfa', r: 3 }} activeDot={{ r: 6 }} name="quotations" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Admin Dashboard - Full Department Overview */}
        {userIsAdmin ? (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800">Tổng quan các phòng ban</h2>
            </div>

            {/* All Departments - Full Width Format */}
            <div className="space-y-4 sm:space-y-5">
              {Object.entries(departmentStats).map(([key, department]) => (
                <div key={key}>
                  <DepartmentCard
                    department={department}
                    onClick={() => handleDepartmentClick(key)}
                    onStatClick={handleStatClick}
                    isFullWidth={true}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-xl sm:rounded-lg shadow-sm w-full sm:max-w-6xl sm:mx-4 h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-base sm:text-2xl font-bold text-gray-800 flex items-center">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 mr-2" />
                Yêu cầu mua hàng
              </h2>
              <button
                onClick={() => setIsPurchaseRequestModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-3 sm:p-6 overflow-x-auto flex-1">
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

            <div className="p-3 sm:p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsPurchaseRequestModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Request Detail Modal */}
      {selectedPurchaseRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60]">
          <div className="bg-white rounded-t-xl sm:rounded-lg shadow-sm w-full sm:max-w-3xl sm:mx-4 h-[92vh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-3 sm:p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-base sm:text-xl font-bold text-gray-800 flex items-center">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
                Chi tiết: {selectedPurchaseRequest.maYeuCau}
              </h2>
              <button
                onClick={() => setSelectedPurchaseRequest(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
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

            <div className="p-3 sm:p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedPurchaseRequest(null)}
                className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50"
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
