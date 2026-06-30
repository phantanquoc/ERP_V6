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
}

/**
 * Resolve a notification to a route string, or null if no deep-link exists.
 * PASSWORD_RESET always returns null.
 * Types with no entityId that require one return null.
 */
export function resolveDeepLink(notification: NotificationForLink): string | null {
  const { type, metadata, entityId, period } = notification;
  // entityId may come from the notification or from metadata
  const id = entityId ?? (metadata?.entityId as string | undefined);

  switch (type) {
    case 'TASK':
    case 'TASK_ADMIN':
    case 'WORK_PLAN':
      if (!id) return null;
      return `/tasks?id=${id}`;

    case 'EVALUATION':
    case 'EVALUATION_SUPERVISOR1':
    case 'EVALUATION_SUPERVISOR1_COMPLETED':
    case 'EVALUATION_SUPERVISOR2':
    case 'EVALUATION_COMPLETED':
      return id ? `/evaluations/${id}` : '/evaluations';

    case 'LEAVE_REQUEST':
    case 'LEAVE_REQUEST_RESPONSE':
      if (!id) return null;
      return `/leave-requests?id=${id}`;

    case 'OVERTIME_PLAN':
    case 'OVERTIME_PLAN_APPROVAL':
      if (!id) return null;
      return `/overtime-plans?id=${id}`;

    case 'SUPPLY_REQUEST':
    case 'SUPPLY_REQUEST_PROCESSING':
    case 'SUPPLY_REQUEST_APPROVED':
    case 'SUPPLY_REQUEST_FULFILLED':
    case 'PURCHASE_REQUEST':
      if (!id) return null;
      return `/supply-requests?id=${id}`;

    case 'PAYROLL': {
      const p = period ?? (metadata?.period as string | undefined);
      if (!p) return null;
      return `/payroll?period=${p}`;
    }

    case 'ACCEPTANCE_HANDOVER':
      if (!id) return null;
      return `/acceptance-handovers?id=${id}`;

    case 'REPAIR_REQUEST':
      if (!id) return null;
      return `/repair-requests?id=${id}`;

    case 'ORDER':
      if (!id) return null;
      return `/orders?id=${id}`;

    case 'WAREHOUSE':
      if (!id) return null;
      return `/warehouse?id=${id}`;

    case 'INVOICE':
      if (!id) return null;
      return `/invoices?id=${id}`;

    case 'DEBT':
      if (!id) return null;
      return `/debts?id=${id}`;

    case 'PRODUCTION_REPORT':
      if (!id) return null;
      return `/production-reports?id=${id}`;

    case 'FAULT_RECORD':
      if (!id) return null;
      return `/fault-records?id=${id}`;

    case 'PRIVATE_FEEDBACK':
    case 'DAILY_WORK_REPORT':
      return '/my-history';

    case 'PROJECT_APPROVAL':
      if (!id) return null;
      return `/project-approvals?id=${id}`;

    case 'PRICING':
      if (!id) return null;
      return `/pricing?id=${id}`;

    case 'PASSWORD_RESET':
      return null;

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
