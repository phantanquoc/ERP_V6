import { NotificationCategory } from './notification.types';

export const NotificationRoutingTargetType = {
  ROLE: 'role',
  DEPARTMENT: 'department',
  SUB_DEPARTMENT: 'subDepartment',
} as const;

export type NotificationRoutingTargetType =
  typeof NotificationRoutingTargetType[keyof typeof NotificationRoutingTargetType];

export const NotificationRoutingEvent = {
  QUOTATION_REQUEST_CREATED: 'quotation-request.created',
  QUOTATION_CREATED: 'quotation.created',
  QUOTATION_CUSTOMER_CONFIRMED: 'quotation.customer-confirmed',
  ORDER_CREATED: 'order.created',
  LEAVE_REQUEST_CREATED: 'leave.request.created',
  SUPPLY_REQUEST_CREATED: 'supply.request.created',
  SUPPLY_REQUEST_APPROVED: 'supply.request.approved',
  PURCHASE_REQUEST_CREATED: 'purchase-request.created',
  PURCHASE_REQUEST_COMPLETED: 'purchase-request.completed',
  TAX_REPORT_CREATED: 'tax-report.created',
  INVOICE_CREATED: 'invoice.created',
  CUSTOMER_FEEDBACK_CREATED: 'customer-feedback.created',
  OVERTIME_PLAN_APPROVAL_REQUIRED: 'overtime-plan.approval-required',
  TASK_ADMIN_VISIBLE: 'task.admin.visible',
  FEEDBACK_ADMIN_VISIBLE: 'feedback.admin.visible',
  DAILY_REPORT_ADMIN_VISIBLE: 'daily-report.admin.visible',
} as const;

export type NotificationRoutingEvent =
  typeof NotificationRoutingEvent[keyof typeof NotificationRoutingEvent];

export interface NotificationChannelSettings {
  [key: string]: boolean;
  inAppEnabled: boolean;
  webPushEnabled: boolean;
}

export interface NotificationUiSettings {
  [key: string]: boolean | number;
  unreadPollingIntervalSeconds: number;
  recentLimit: number;
  historyWindowDays: number;
  showAdminFlowOverview: boolean;
}

export type NotificationCategoryPreferences = Record<NotificationCategory, boolean>;

export interface NotificationRoutingTarget {
  id: string;
  type: NotificationRoutingTargetType;
  value: string;
  label: string;
}

export interface NotificationRoutingRule {
  eventKey: NotificationRoutingEvent;
  enabled: boolean;
  recipients: NotificationRoutingTarget[];
}

export type NotificationRoutingRules = Record<NotificationRoutingEvent, NotificationRoutingRule>;

export interface NotificationSettings {
  [key: string]:
    | NotificationChannelSettings
    | NotificationUiSettings
    | NotificationCategoryPreferences
    | NotificationRoutingRules;
  channels: NotificationChannelSettings;
  ui: NotificationUiSettings;
  categories: NotificationCategoryPreferences;
  routingRules: NotificationRoutingRules;
}

export const DEFAULT_NOTIFICATION_ROUTING_RULES: NotificationRoutingRules = {
  [NotificationRoutingEvent.QUOTATION_REQUEST_CREATED]: {
    eventKey: NotificationRoutingEvent.QUOTATION_REQUEST_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'quotation-request-pricing',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_GENERAL_PRICING',
        label: 'Tổng hợp / Tính giá',
      },
      {
        id: 'quotation-request-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.QUOTATION_CREATED]: {
    eventKey: NotificationRoutingEvent.QUOTATION_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'quotation-created-business',
        type: NotificationRoutingTargetType.DEPARTMENT,
        value: 'DEPT_BUSINESS',
        label: 'Phòng kinh doanh',
      },
      {
        id: 'quotation-created-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.QUOTATION_CUSTOMER_CONFIRMED]: {
    eventKey: NotificationRoutingEvent.QUOTATION_CUSTOMER_CONFIRMED,
    enabled: true,
    recipients: [
      {
        id: 'quotation-confirmed-business',
        type: NotificationRoutingTargetType.DEPARTMENT,
        value: 'DEPT_BUSINESS',
        label: 'Phòng kinh doanh',
      },
      {
        id: 'quotation-confirmed-production-management',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_PRODUCTION_MANAGEMENT',
        label: 'Quản lý sản xuất',
      },
      {
        id: 'quotation-confirmed-accounting-admin',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_ACCOUNTING_ADMIN',
        label: 'Kế toán admin',
      },
      {
        id: 'quotation-confirmed-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.ORDER_CREATED]: {
    eventKey: NotificationRoutingEvent.ORDER_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'order-created-production-management',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_PRODUCTION_MANAGEMENT',
        label: 'Quản lý sản xuất',
      },
      {
        id: 'order-created-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.LEAVE_REQUEST_CREATED]: {
    eventKey: NotificationRoutingEvent.LEAVE_REQUEST_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'leave-quality-personnel',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_QUALITY_PERSONNEL',
        label: 'Chất lượng nhân sự',
      },
    ],
  },
  [NotificationRoutingEvent.SUPPLY_REQUEST_CREATED]: {
    eventKey: NotificationRoutingEvent.SUPPLY_REQUEST_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'supply-production-warehouse',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_PRODUCTION_WAREHOUSE',
        label: 'Kho sản xuất',
      },
      {
        id: 'supply-created-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.SUPPLY_REQUEST_APPROVED]: {
    eventKey: NotificationRoutingEvent.SUPPLY_REQUEST_APPROVED,
    enabled: true,
    recipients: [
      {
        id: 'supply-approved-production-warehouse',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_PRODUCTION_WAREHOUSE',
        label: 'Kho sản xuất',
      },
      {
        id: 'supply-approved-purchasing',
        type: NotificationRoutingTargetType.DEPARTMENT,
        value: 'DEPT_PURCHASING',
        label: 'Phòng mua hàng',
      },
      {
        id: 'supply-approved-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.PURCHASE_REQUEST_CREATED]: {
    eventKey: NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'purchase-created-purchasing',
        type: NotificationRoutingTargetType.DEPARTMENT,
        value: 'DEPT_PURCHASING',
        label: 'Phòng mua hàng',
      },
      {
        id: 'purchase-created-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.PURCHASE_REQUEST_COMPLETED]: {
    eventKey: NotificationRoutingEvent.PURCHASE_REQUEST_COMPLETED,
    enabled: true,
    recipients: [
      {
        id: 'purchase-completed-production-warehouse',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_PRODUCTION_WAREHOUSE',
        label: 'Kho sản xuất',
      },
      {
        id: 'purchase-completed-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.TAX_REPORT_CREATED]: {
    eventKey: NotificationRoutingEvent.TAX_REPORT_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'tax-report-accounting-tax',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_ACCOUNTING_TAX',
        label: 'Kế toán thuế',
      },
      {
        id: 'tax-report-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.INVOICE_CREATED]: {
    eventKey: NotificationRoutingEvent.INVOICE_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'invoice-created-accounting-admin',
        type: NotificationRoutingTargetType.SUB_DEPARTMENT,
        value: 'SUBDEPT_ACCOUNTING_ADMIN',
        label: 'Kế toán admin',
      },
      {
        id: 'invoice-created-business',
        type: NotificationRoutingTargetType.DEPARTMENT,
        value: 'DEPT_BUSINESS',
        label: 'Phòng kinh doanh',
      },
      {
        id: 'invoice-created-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.CUSTOMER_FEEDBACK_CREATED]: {
    eventKey: NotificationRoutingEvent.CUSTOMER_FEEDBACK_CREATED,
    enabled: true,
    recipients: [
      {
        id: 'customer-feedback-business',
        type: NotificationRoutingTargetType.DEPARTMENT,
        value: 'DEPT_BUSINESS',
        label: 'Phòng kinh doanh',
      },
      {
        id: 'customer-feedback-general',
        type: NotificationRoutingTargetType.DEPARTMENT,
        value: 'DEPT_GENERAL',
        label: 'Phòng tổng hợp',
      },
      {
        id: 'customer-feedback-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.OVERTIME_PLAN_APPROVAL_REQUIRED]: {
    eventKey: NotificationRoutingEvent.OVERTIME_PLAN_APPROVAL_REQUIRED,
    enabled: true,
    recipients: [
      {
        id: 'overtime-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.TASK_ADMIN_VISIBLE]: {
    eventKey: NotificationRoutingEvent.TASK_ADMIN_VISIBLE,
    enabled: true,
    recipients: [
      {
        id: 'task-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.FEEDBACK_ADMIN_VISIBLE]: {
    eventKey: NotificationRoutingEvent.FEEDBACK_ADMIN_VISIBLE,
    enabled: true,
    recipients: [
      {
        id: 'feedback-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
  [NotificationRoutingEvent.DAILY_REPORT_ADMIN_VISIBLE]: {
    eventKey: NotificationRoutingEvent.DAILY_REPORT_ADMIN_VISIBLE,
    enabled: true,
    recipients: [
      {
        id: 'daily-report-admin',
        type: NotificationRoutingTargetType.ROLE,
        value: 'ADMIN',
        label: 'Admin',
      },
    ],
  },
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  channels: {
    inAppEnabled: true,
    webPushEnabled: true,
  },
  ui: {
    unreadPollingIntervalSeconds: 10,
    recentLimit: 20,
    historyWindowDays: 30,
    showAdminFlowOverview: true,
  },
  categories: {
    [NotificationCategory.EVALUATION]: true,
    [NotificationCategory.TASK]: true,
    [NotificationCategory.LEAVE]: true,
    [NotificationCategory.PAYROLL]: true,
    [NotificationCategory.ACCEPTANCE]: true,
    [NotificationCategory.OVERTIME]: true,
    [NotificationCategory.SUPPLY]: true,
    [NotificationCategory.AUTH]: true,
    [NotificationCategory.FEEDBACK]: true,
    [NotificationCategory.REPORT]: true,
    [NotificationCategory.WORK_PLAN]: true,
    [NotificationCategory.SYSTEM]: true,
  },
  routingRules: DEFAULT_NOTIFICATION_ROUTING_RULES,
};
