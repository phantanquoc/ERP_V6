import React from 'react';
import {
  CheckCircle, Clock, AlertCircle, Target, ClipboardList, DollarSign,
  PackageCheck, CalendarDays, ShoppingCart, Truck, PackageOpen, KeyRound,
  MessageSquare, FileText, Bell, Receipt, BarChart2,
} from 'lucide-react';
import { AppNotification } from '../services/notificationService';

// Action target enum
export const NotificationActionTarget = {
  TASK_LIST: 'TASK_LIST',
  EVALUATION: 'EVALUATION',
  PAYROLL: 'PAYROLL',
  ACCEPTANCE_HANDOVER: 'ACCEPTANCE_HANDOVER',
  LEAVE_REQUEST: 'LEAVE_REQUEST',
  OVERTIME_PLAN: 'OVERTIME_PLAN',
  FEEDBACK_LIST: 'FEEDBACK_LIST',
  DAILY_WORK_REPORT_LIST: 'DAILY_WORK_REPORT_LIST',
  WORK_PLAN_LIST: 'WORK_PLAN_LIST',
  QUOTATION_REQUEST: 'QUOTATION_REQUEST',
  QUOTATION: 'QUOTATION',
  ORDER: 'ORDER',
  TAX_REPORT: 'TAX_REPORT',
  INVOICE: 'INVOICE',
  CUSTOMER_FEEDBACK: 'CUSTOMER_FEEDBACK',
  SUPPLY_REQUEST: 'SUPPLY_REQUEST',
  PURCHASE_REQUEST: 'PURCHASE_REQUEST',
  NONE: 'NONE',
} as const;

export type NotificationActionTarget = typeof NotificationActionTarget[keyof typeof NotificationActionTarget];

export interface NotificationConfig {
  actionType: 'route' | 'modal' | 'none';
  actionTarget: NotificationActionTarget;
}

export const getNotificationConfig = (notification: AppNotification): NotificationConfig => {
  switch (notification.type) {
    case 'TASK':
    case 'TASK_ADMIN':
    case 'TASK_EVALUATED':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.TASK_LIST };
    case 'EVALUATION':
    case 'EVALUATION_SUPERVISOR1':
    case 'EVALUATION_SUPERVISOR2':
    case 'EVALUATION_COMPLETED':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.EVALUATION };
    case 'PAYROLL':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.PAYROLL };
    case 'ACCEPTANCE_HANDOVER':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.ACCEPTANCE_HANDOVER };
    case 'LEAVE_REQUEST':
    case 'LEAVE_REQUEST_RESPONSE':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.LEAVE_REQUEST };
    case 'OVERTIME_PLAN':
    case 'OVERTIME_PLAN_APPROVAL':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.OVERTIME_PLAN };
    case 'PRIVATE_FEEDBACK':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.FEEDBACK_LIST };
    case 'DAILY_WORK_REPORT':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.DAILY_WORK_REPORT_LIST };
    case 'WORK_PLAN':
      return { actionType: 'modal', actionTarget: NotificationActionTarget.WORK_PLAN_LIST };
    case 'QUOTATION_REQUEST':
      return { actionType: 'route', actionTarget: NotificationActionTarget.QUOTATION_REQUEST };
    case 'QUOTATION':
      return { actionType: 'route', actionTarget: NotificationActionTarget.QUOTATION };
    case 'ORDER':
      return { actionType: 'route', actionTarget: NotificationActionTarget.ORDER };
    case 'TAX_REPORT':
      return { actionType: 'route', actionTarget: NotificationActionTarget.TAX_REPORT };
    case 'INVOICE':
      return { actionType: 'route', actionTarget: NotificationActionTarget.INVOICE };
    case 'CUSTOMER_FEEDBACK':
      return { actionType: 'route', actionTarget: NotificationActionTarget.CUSTOMER_FEEDBACK };
    case 'SUPPLY_REQUEST':
    case 'SUPPLY_REQUEST_PROCESSING':
    case 'SUPPLY_REQUEST_APPROVED':
    case 'SUPPLY_REQUEST_REJECTED':
    case 'SUPPLY_REQUEST_FULFILLED':
      return { actionType: 'route', actionTarget: NotificationActionTarget.SUPPLY_REQUEST };
    default:
      return { actionType: 'none', actionTarget: NotificationActionTarget.NONE };
  }
};

export const resolveNotificationRoute = (target: NotificationActionTarget): string | null => {
  switch (target) {
    case NotificationActionTarget.QUOTATION_REQUEST: return '/business/domestic';
    case NotificationActionTarget.QUOTATION: return '/general/pricing';
    case NotificationActionTarget.ORDER: return '/business/domestic';
    case NotificationActionTarget.TAX_REPORT: return '/accounting/tax';
    case NotificationActionTarget.INVOICE: return '/accounting/admin';
    case NotificationActionTarget.CUSTOMER_FEEDBACK: return '/business/domestic';
    case NotificationActionTarget.SUPPLY_REQUEST: return '/common/supply-requests';
    case NotificationActionTarget.PURCHASE_REQUEST: return '/general/purchase';
    default: return null;
  }
};

export const getNotificationIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'EVALUATION': return <ClipboardList className="w-4 h-4 text-orange-600" />;
    case 'EVALUATION_SUPERVISOR1':
    case 'EVALUATION_SUPERVISOR2': return <Clock className="w-4 h-4 text-blue-600" />;
    case 'EVALUATION_COMPLETED': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'TASK':
    case 'TASK_ADMIN':
    case 'TASK_EVALUATED': return <Target className="w-4 h-4 text-indigo-600" />;
    case 'PAYROLL': return <DollarSign className="w-4 h-4 text-green-600" />;
    case 'ACCEPTANCE_HANDOVER': return <PackageCheck className="w-4 h-4 text-teal-600" />;
    case 'LEAVE_REQUEST':
    case 'LEAVE_REQUEST_RESPONSE': return <CalendarDays className="w-4 h-4 text-purple-600" />;
    case 'OVERTIME_PLAN':
    case 'OVERTIME_PLAN_APPROVAL': return <Clock className="w-4 h-4 text-orange-600" />;
    case 'SUPPLY_REQUEST': return <ShoppingCart className="w-4 h-4 text-teal-600" />;
    case 'SUPPLY_REQUEST_PROCESSING': return <Clock className="w-4 h-4 text-yellow-600" />;
    case 'SUPPLY_REQUEST_APPROVED': return <Truck className="w-4 h-4 text-blue-600" />;
    case 'SUPPLY_REQUEST_REJECTED': return <AlertCircle className="w-4 h-4 text-red-600" />;
    case 'SUPPLY_REQUEST_FULFILLED': return <PackageOpen className="w-4 h-4 text-green-600" />;
    case 'PASSWORD_RESET': return <KeyRound className="w-4 h-4 text-red-600" />;
    case 'PRIVATE_FEEDBACK': return <MessageSquare className="w-4 h-4 text-orange-600" />;
    case 'DAILY_WORK_REPORT': return <FileText className="w-4 h-4 text-teal-600" />;
    case 'WORK_PLAN': return <CalendarDays className="w-4 h-4 text-purple-600" />;
    case 'QUOTATION_REQUEST': return <FileText className="w-4 h-4 text-blue-600" />;
    case 'QUOTATION': return <BarChart2 className="w-4 h-4 text-purple-600" />;
    case 'ORDER': return <ShoppingCart className="w-4 h-4 text-yellow-600" />;
    case 'TAX_REPORT': return <BarChart2 className="w-4 h-4 text-indigo-600" />;
    case 'INVOICE': return <Receipt className="w-4 h-4 text-pink-600" />;
    case 'CUSTOMER_FEEDBACK': return <MessageSquare className="w-4 h-4 text-rose-600" />;
    default: return <Bell className="w-4 h-4 text-gray-600" />;
  }
};
