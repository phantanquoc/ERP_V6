/**
 * Notification type constants
 * Tập trung tất cả notification types để tránh magic strings
 */
export const NotificationType = {
  EVALUATION: 'EVALUATION',
  EVALUATION_SUPERVISOR1: 'EVALUATION_SUPERVISOR1',
  EVALUATION_SUPERVISOR2: 'EVALUATION_SUPERVISOR2',
  EVALUATION_COMPLETED: 'EVALUATION_COMPLETED',
  TASK: 'TASK',
  LEAVE_REQUEST: 'LEAVE_REQUEST',
  LEAVE_REQUEST_RESPONSE: 'LEAVE_REQUEST_RESPONSE',
  PAYROLL: 'PAYROLL',
  ACCEPTANCE_HANDOVER: 'ACCEPTANCE_HANDOVER',
  OVERTIME_PLAN: 'OVERTIME_PLAN',
  OVERTIME_PLAN_APPROVAL: 'OVERTIME_PLAN_APPROVAL',
  SUPPLY_REQUEST: 'SUPPLY_REQUEST',
  SUPPLY_REQUEST_PROCESSING: 'SUPPLY_REQUEST_PROCESSING',
  SUPPLY_REQUEST_APPROVED: 'SUPPLY_REQUEST_APPROVED',
  SUPPLY_REQUEST_REJECTED: 'SUPPLY_REQUEST_REJECTED',
  SUPPLY_REQUEST_FULFILLED: 'SUPPLY_REQUEST_FULFILLED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  TASK_ADMIN: 'TASK_ADMIN',
  PRIVATE_FEEDBACK: 'PRIVATE_FEEDBACK',
  DAILY_WORK_REPORT: 'DAILY_WORK_REPORT',
  WORK_PLAN: 'WORK_PLAN',
  TASK_EVALUATED: 'TASK_EVALUATED',
  QUOTATION_REQUEST: 'QUOTATION_REQUEST',
  QUOTATION: 'QUOTATION',
  ORDER: 'ORDER',
  TAX_REPORT: 'TAX_REPORT',
  INVOICE: 'INVOICE',
  CUSTOMER_FEEDBACK: 'CUSTOMER_FEEDBACK',
  PURCHASE_REQUEST: 'PURCHASE_REQUEST',
  PURCHASE_REQUEST_COMPLETED: 'PURCHASE_REQUEST_COMPLETED',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const NotificationCategory = {
  EVALUATION: 'EVALUATION',
  TASK: 'TASK',
  LEAVE: 'LEAVE',
  PAYROLL: 'PAYROLL',
  ACCEPTANCE: 'ACCEPTANCE',
  OVERTIME: 'OVERTIME',
  SUPPLY: 'SUPPLY',
  AUTH: 'AUTH',
  FEEDBACK: 'FEEDBACK',
  REPORT: 'REPORT',
  WORK_PLAN: 'WORK_PLAN',
  SYSTEM: 'SYSTEM',
} as const;

export type NotificationCategory = typeof NotificationCategory[keyof typeof NotificationCategory];

/**
 * Evaluation status constants
 * Tập trung tất cả evaluation statuses để tránh magic strings
 */
export const EvaluationStatus = {
  SELF_PENDING: 'SELF_PENDING',
  SUPERVISOR1_PENDING: 'SUPERVISOR1_PENDING',
  SUPERVISOR2_PENDING: 'SUPERVISOR2_PENDING',
  COMPLETED: 'COMPLETED',
} as const;

export type EvaluationStatus = typeof EvaluationStatus[keyof typeof EvaluationStatus];

/**
 * Leave request status constants
 */
export const LeaveRequestStatusConst = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type LeaveRequestStatusConst = typeof LeaveRequestStatusConst[keyof typeof LeaveRequestStatusConst];

// ─── Envelope & Metadata types used by notificationService ───────────────────

export interface NotificationMetadata {
  legacyType?: string;
  period?: string;
  evaluationId?: string;
  taskId?: string;
  acceptanceHandoverId?: string;
  leaveRequestId?: string;
  supplyRequestId?: string;
  entityType?: string;
  entityId?: string;
  entityCode?: string;
  entityName?: string;
  actor?: {
    userId: string;
    employeeId?: string;
    name: string;
    role?: string;
  };
  actionType?: 'created' | 'updated' | 'status_changed' | 'confirmed';
  actionLabel?: string;
  summary?: string;
  changedFields?: string[];
  [key: string]: unknown;
}

export interface NotificationEnvelope {
  id: string;
  employeeId: string;
  type: string;
  eventName: string;
  category: string;
  title: string;
  message: string;
  period?: string;
  evaluationId?: string;
  taskId?: string;
  acceptanceHandoverId?: string;
  leaveRequestId?: string;
  supplyRequestId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: NotificationMetadata;
  isRead: boolean;
  readAt?: string;
  createdAt: Date;
  updatedAt: Date;
}
