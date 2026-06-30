import React from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle,
  Target,
  CalendarDays,
  DollarSign,
  PackageCheck,
  ShoppingCart,
  Truck,
  PackageOpen,
  KeyRound,
  MessageSquare,
  FileText,
  ShoppingBag,
  Warehouse,
  Receipt,
  CreditCard,
  BarChart3,
  Wrench,
  Bell,
  AlertCircle,
} from 'lucide-react';

// ---- Type labels (Vietnamese) -------------------------------------------

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  EVALUATION: 'Đánh giá',
  EVALUATION_SUPERVISOR1: 'Đánh giá (Cấp 1)',
  EVALUATION_SUPERVISOR1_COMPLETED: 'Đánh giá cấp 1 hoàn thành',
  EVALUATION_SUPERVISOR2: 'Đánh giá (Cấp 2)',
  EVALUATION_COMPLETED: 'Đánh giá hoàn thành',
  TASK: 'Nhiệm vụ',
  TASK_ADMIN: 'Nhiệm vụ (Admin)',
  WORK_PLAN: 'Kế hoạch công việc',
  LEAVE_REQUEST: 'Nghỉ phép',
  LEAVE_REQUEST_RESPONSE: 'Phản hồi nghỉ phép',
  OVERTIME_PLAN: 'Kế hoạch tăng ca',
  OVERTIME_PLAN_APPROVAL: 'Duyệt tăng ca',
  SUPPLY_REQUEST: 'Yêu cầu vật tư',
  SUPPLY_REQUEST_PROCESSING: 'Xử lý yêu cầu vật tư',
  SUPPLY_REQUEST_APPROVED: 'Duyệt yêu cầu vật tư',
  SUPPLY_REQUEST_FULFILLED: 'Hoàn thành yêu cầu vật tư',
  PURCHASE_REQUEST: 'Yêu cầu mua hàng',
  PAYROLL: 'Bảng lương',
  ACCEPTANCE_HANDOVER: 'Nghiệm thu bàn giao',
  PASSWORD_RESET: 'Đặt lại mật khẩu',
  PRIVATE_FEEDBACK: 'Góp ý',
  DAILY_WORK_REPORT: 'Báo cáo công việc',
  REPAIR_REQUEST: 'Yêu cầu sửa chữa',
  ORDER: 'Đơn hàng',
  WAREHOUSE: 'Kho',
  INVOICE: 'Hóa đơn',
  DEBT: 'Công nợ',
  PRODUCTION_REPORT: 'Báo cáo sản xuất',
  PROJECT_APPROVAL: 'Duyệt dự án',
  FAULT_RECORD: 'Ghi nhận lỗi',
  PRICING: 'Giá thành',
};

// ---- Group mapping (7 clusters) -----------------------------------------

export interface NotificationGroup {
  key: string;
  label: string;
  types: string[];
}

export const NOTIFICATION_TYPE_GROUPS: NotificationGroup[] = [
  {
    key: 'evaluation',
    label: 'Đánh giá',
    types: [
      'EVALUATION',
      'EVALUATION_SUPERVISOR1',
      'EVALUATION_SUPERVISOR1_COMPLETED',
      'EVALUATION_SUPERVISOR2',
      'EVALUATION_COMPLETED',
    ],
  },
  {
    key: 'task',
    label: 'Nhiệm vụ',
    types: ['TASK', 'TASK_ADMIN', 'WORK_PLAN'],
  },
  {
    key: 'leaveOvertime',
    label: 'Nghỉ phép & Tăng ca',
    types: ['LEAVE_REQUEST', 'LEAVE_REQUEST_RESPONSE', 'OVERTIME_PLAN', 'OVERTIME_PLAN_APPROVAL'],
  },
  {
    key: 'supplyPurchase',
    label: 'Vật tư & Mua hàng',
    types: [
      'SUPPLY_REQUEST',
      'SUPPLY_REQUEST_PROCESSING',
      'SUPPLY_REQUEST_APPROVED',
      'SUPPLY_REQUEST_FULFILLED',
      'PURCHASE_REQUEST',
    ],
  },
  {
    key: 'report',
    label: 'Báo cáo',
    types: ['DAILY_WORK_REPORT', 'PRIVATE_FEEDBACK', 'PRODUCTION_REPORT', 'FAULT_RECORD'],
  },
  {
    key: 'orderWarehouse',
    label: 'Đơn hàng & Kho',
    types: ['ORDER', 'WAREHOUSE', 'INVOICE', 'DEBT', 'PRICING'],
  },
  {
    key: 'other',
    label: 'Khác',
    types: ['PAYROLL', 'ACCEPTANCE_HANDOVER', 'PASSWORD_RESET', 'REPAIR_REQUEST', 'PROJECT_APPROVAL'],
  },
];

// ---- Icon mapping --------------------------------------------------------

export function getNotificationIcon(type: string): React.ReactNode {
  switch (type) {
    case 'EVALUATION':
      return React.createElement(ClipboardList, { className: 'w-4 h-4 text-orange-600' });
    case 'EVALUATION_SUPERVISOR1':
    case 'EVALUATION_SUPERVISOR2':
      return React.createElement(Clock, { className: 'w-4 h-4 text-blue-600' });
    case 'EVALUATION_SUPERVISOR1_COMPLETED':
    case 'EVALUATION_COMPLETED':
      return React.createElement(CheckCircle, { className: 'w-4 h-4 text-green-600' });
    case 'TASK':
    case 'TASK_ADMIN':
      return React.createElement(Target, { className: 'w-4 h-4 text-indigo-600' });
    case 'WORK_PLAN':
      return React.createElement(CalendarDays, { className: 'w-4 h-4 text-purple-600' });
    case 'PAYROLL':
      return React.createElement(DollarSign, { className: 'w-4 h-4 text-green-600' });
    case 'ACCEPTANCE_HANDOVER':
      return React.createElement(PackageCheck, { className: 'w-4 h-4 text-teal-600' });
    case 'LEAVE_REQUEST':
    case 'LEAVE_REQUEST_RESPONSE':
      return React.createElement(CalendarDays, { className: 'w-4 h-4 text-purple-600' });
    case 'OVERTIME_PLAN':
    case 'OVERTIME_PLAN_APPROVAL':
      return React.createElement(Clock, { className: 'w-4 h-4 text-orange-600' });
    case 'SUPPLY_REQUEST':
      return React.createElement(ShoppingCart, { className: 'w-4 h-4 text-teal-600' });
    case 'SUPPLY_REQUEST_PROCESSING':
      return React.createElement(Clock, { className: 'w-4 h-4 text-yellow-600' });
    case 'SUPPLY_REQUEST_APPROVED':
      return React.createElement(Truck, { className: 'w-4 h-4 text-blue-600' });
    case 'SUPPLY_REQUEST_FULFILLED':
      return React.createElement(PackageOpen, { className: 'w-4 h-4 text-green-600' });
    case 'PURCHASE_REQUEST':
      return React.createElement(ShoppingCart, { className: 'w-4 h-4 text-cyan-600' });
    case 'PASSWORD_RESET':
      return React.createElement(KeyRound, { className: 'w-4 h-4 text-red-600' });
    case 'PRIVATE_FEEDBACK':
      return React.createElement(MessageSquare, { className: 'w-4 h-4 text-orange-600' });
    case 'DAILY_WORK_REPORT':
      return React.createElement(FileText, { className: 'w-4 h-4 text-teal-600' });
    case 'REPAIR_REQUEST':
      return React.createElement(Wrench, { className: 'w-4 h-4 text-red-600' });
    case 'ORDER':
      return React.createElement(ShoppingBag, { className: 'w-4 h-4 text-blue-600' });
    case 'WAREHOUSE':
      return React.createElement(Warehouse, { className: 'w-4 h-4 text-amber-600' });
    case 'INVOICE':
      return React.createElement(Receipt, { className: 'w-4 h-4 text-emerald-600' });
    case 'DEBT':
      return React.createElement(CreditCard, { className: 'w-4 h-4 text-rose-600' });
    case 'PRODUCTION_REPORT':
      return React.createElement(BarChart3, { className: 'w-4 h-4 text-cyan-600' });
    case 'FAULT_RECORD':
      return React.createElement(AlertCircle, { className: 'w-4 h-4 text-red-600' });
    case 'PROJECT_APPROVAL':
      return React.createElement(CheckCircle, { className: 'w-4 h-4 text-blue-600' });
    case 'PRICING':
      return React.createElement(DollarSign, { className: 'w-4 h-4 text-amber-600' });
    default:
      return React.createElement(Bell, { className: 'w-4 h-4 text-gray-600' });
  }
}

// ---- Relative time formatting -------------------------------------------

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return 'Hôm qua';

  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// ---- Deep-link resolver -------------------------------------------------

export interface NotificationForLink {
  type: string;
  metadata?: Record<string, unknown>;
  entityId?: string;
  period?: string;
  supplyRequestId?: string;
  leaveRequestId?: string;
  acceptanceHandoverId?: string;
  taskId?: string;
  evaluationId?: string;
}

/**
 * Resolve a notification to a route string, or null if no deep-link exists.
 * Mirrors the navigation logic in NotificationBell.handleNotificationClick.
 * Returns null for types whose detail is only accessible via a modal (TASK,
 * EVALUATION, PAYROLL, ACCEPTANCE_HANDOVER, LEAVE_REQUEST, OVERTIME_PLAN,
 * WORK_PLAN, PRIVATE_FEEDBACK, DAILY_WORK_REPORT, PASSWORD_RESET) — the
 * MyNotificationsDetailModal handles those by opening the corresponding
 * list-modal in place (see resolveModalKind).
 */
export function resolveDeepLink(notification: NotificationForLink): string | null {
  const { type, metadata } = notification;
  const meta = (metadata ?? {}) as Record<string, unknown>;

  switch (type) {
    // Module pages with tab/query routing — mirror NotificationBell navigate() calls

    case 'SUPPLY_REQUEST':
    case 'SUPPLY_REQUEST_PROCESSING':
    case 'SUPPLY_REQUEST_APPROVED':
    case 'SUPPLY_REQUEST_FULFILLED': {
      const srId = (meta.supplyRequestId as string | undefined) ?? notification.supplyRequestId;
      return srId
        ? `/production/warehouse?tab=supplyRequest&supplyRequestId=${srId}`
        : '/production/warehouse?tab=supplyRequest';
    }

    case 'PURCHASE_REQUEST': {
      const prId = meta.purchaseRequestId as string | undefined;
      return prId
        ? `/purchasing/materials?purchaseRequestId=${prId}`
        : '/purchasing/materials';
    }

    case 'REPAIR_REQUEST': {
      const repairRequestId = meta.entityId as string | undefined;
      return repairRequestId
        ? `/technical/quality?tab=repairRequests&repairRequestId=${repairRequestId}`
        : '/technical/quality?tab=repairRequests';
    }

    case 'ORDER': {
      const orderId = meta.entityId as string | undefined;
      return orderId
        ? `/business/international?orderId=${orderId}`
        : '/business/international';
    }

    case 'WAREHOUSE':
      return '/production/warehouse';

    case 'INVOICE': {
      const invoiceId = meta.entityId as string | undefined;
      return invoiceId
        ? `/accounting/admin?tab=invoices&invoiceId=${invoiceId}`
        : '/accounting/admin?tab=invoices';
    }

    case 'DEBT': {
      const debtId = meta.entityId as string | undefined;
      return debtId
        ? `/accounting/admin?tab=debts&debtId=${debtId}`
        : '/accounting/admin?tab=debts';
    }

    case 'PRODUCTION_REPORT': {
      const reportId = meta.entityId as string | undefined;
      return reportId
        ? `/production/management?tab=productionReport&reportId=${reportId}`
        : '/production/management?tab=productionReport';
    }

    case 'PROJECT_APPROVAL': {
      const projectId = meta.entityId as string | undefined;
      return projectId
        ? `/technical/projects?projectId=${projectId}`
        : '/technical/projects';
    }

    case 'FAULT_RECORD': {
      const faultRecordId = meta.entityId as string | undefined;
      return faultRecordId
        ? `/technical/mechanical?tab=faultRecords&faultRecordId=${faultRecordId}`
        : '/technical/mechanical?tab=faultRecords';
    }

    case 'PRICING': {
      const entityId = meta.entityId as string | undefined;
      const event = meta.event as string | undefined;
      // Route to the correct tab based on the originating event
      if (event === 'QUOTATION_REQUEST_CREATED') {
        return entityId
          ? `/general/pricing?tab=requests&quotationRequestId=${entityId}`
          : '/general/pricing?tab=requests';
      }
      if (event === 'QUOTATION_WON' || event === 'QUOTATION_LOST' || event === 'QUOTATION_PRICE_UNLOCKED') {
        return entityId
          ? `/general/pricing?tab=quotes&quotationId=${entityId}`
          : '/general/pricing?tab=quotes';
      }
      if (event === 'ORDER_DELIVERED') {
        return entityId
          ? `/general/pricing?tab=orders&orderId=${entityId}`
          : '/general/pricing?tab=orders';
      }
      return '/general/pricing';
    }

    // Modal-only types in NotificationBell — no standalone route exists yet.
    // Returning null hides the standalone navigation; MyNotificationsDetailModal
    // calls resolveModalKind() to decide whether to render an in-place list modal.
    case 'TASK':
    case 'TASK_ADMIN':
    case 'WORK_PLAN':
    case 'PRIVATE_FEEDBACK':
    case 'DAILY_WORK_REPORT':
    case 'EVALUATION':
    case 'EVALUATION_SUPERVISOR1':
    case 'EVALUATION_SUPERVISOR1_COMPLETED':
    case 'EVALUATION_SUPERVISOR2':
    case 'EVALUATION_COMPLETED':
    case 'PAYROLL':
    case 'ACCEPTANCE_HANDOVER':
    case 'LEAVE_REQUEST':
    case 'LEAVE_REQUEST_RESPONSE':
    case 'OVERTIME_PLAN':
    case 'OVERTIME_PLAN_APPROVAL':
    case 'PASSWORD_RESET':
      return null;

    default:
      return null;
  }
}

// ---- Modal kind resolver -------------------------------------------------

/**
 * Modal kinds that MyNotificationsDetailModal can open in place when no
 * standalone deep-link route exists for the notification type. Each kind
 * maps 1:1 to a detail or list modal component:
 *
 * - dailyWorkReport   → DailyWorkReportListModal (auto-opens detail by entityId)
 * - feedback          → FeedbackListModal (auto-opens detail by entityId)
 * - workPlan          → WorkPlanListModal (auto-opens detail by entityId)
 * - task              → TaskListModal (no per-item focus yet — opens list)
 * - evaluation        → EmployeeSelfEvaluationModal (by evaluationId + period)
 * - payroll           → EmployeePayrollModal (by period)
 * - acceptanceHandover→ AcceptanceHandoverViewModal (by acceptanceHandoverId)
 * - leaveRequest      → LeaveRequestApprovalModal (by leaveRequestId)
 * - overtimePlan      → OvertimePlanListModal (auto-opens detail by planId)
 * - passwordReset     → AdminResetPasswordModal (by targetUserId in metadata)
 */
export type NotificationModalKind =
  | 'dailyWorkReport'
  | 'feedback'
  | 'workPlan'
  | 'task'
  | 'evaluation'
  | 'payroll'
  | 'acceptanceHandover'
  | 'leaveRequest'
  | 'overtimePlan'
  | 'passwordReset'
  | null;

/**
 * Decide whether the notification should open an in-place detail/list modal.
 * Returns null for types that either deep-link to a route (resolveDeepLink
 * returns a string) or have no detail surface implemented yet.
 */
export function resolveModalKind(type: string): NotificationModalKind {
  switch (type) {
    case 'DAILY_WORK_REPORT':
      return 'dailyWorkReport';
    case 'PRIVATE_FEEDBACK':
      return 'feedback';
    case 'WORK_PLAN':
      return 'workPlan';
    case 'TASK':
    case 'TASK_ADMIN':
      return 'task';
    case 'EVALUATION':
    case 'EVALUATION_SUPERVISOR1':
    case 'EVALUATION_SUPERVISOR1_COMPLETED':
    case 'EVALUATION_SUPERVISOR2':
    case 'EVALUATION_COMPLETED':
      return 'evaluation';
    case 'PAYROLL':
      return 'payroll';
    case 'ACCEPTANCE_HANDOVER':
      return 'acceptanceHandover';
    case 'LEAVE_REQUEST':
    case 'LEAVE_REQUEST_RESPONSE':
      return 'leaveRequest';
    case 'OVERTIME_PLAN':
    case 'OVERTIME_PLAN_APPROVAL':
      return 'overtimePlan';
    case 'PASSWORD_RESET':
      return 'passwordReset';
    default:
      return null;
  }
}

// ---- Date preset detection ----------------------------------------------

export type DatePreset = 'today' | '7' | '30' | 'month' | 'custom' | 'none';

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getPresetDates(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  switch (preset) {
    case 'today': {
      const todayStr = toDateStr(now);
      return { dateFrom: todayStr, dateTo: todayStr };
    }
    case '7': {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      return { dateFrom: toDateStr(from), dateTo: toDateStr(now) };
    }
    case '30': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: toDateStr(from), dateTo: toDateStr(now) };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { dateFrom: toDateStr(from), dateTo: toDateStr(now) };
    }
    default:
      return {};
  }
}

/**
 * Detect which date preset matches the given dateFrom/dateTo, or 'custom' if no preset matches.
 * Returns 'none' when both are absent (server default — last 30 days).
 */
export function detectDatePreset(dateFrom?: string, dateTo?: string): DatePreset {
  if (!dateFrom && !dateTo) return 'none';

  const presets: DatePreset[] = ['today', '7', '30', 'month'];
  for (const preset of presets) {
    const { dateFrom: pFrom, dateTo: pTo } = getPresetDates(preset);
    if (pFrom === dateFrom && pTo === dateTo) return preset;
  }

  return 'custom';
}
