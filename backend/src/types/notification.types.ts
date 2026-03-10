/**
 * Notification type constants
 * Tập trung tất cả notification types để tránh magic strings
 */
export const NotificationType = {
  EVALUATION: 'EVALUATION',
  EVALUATION_SUPERVISOR1: 'EVALUATION_SUPERVISOR1',
  EVALUATION_SUPERVISOR2: 'EVALUATION_SUPERVISOR2',
  TASK: 'TASK',
  LEAVE_REQUEST: 'LEAVE_REQUEST',
  LEAVE_REQUEST_RESPONSE: 'LEAVE_REQUEST_RESPONSE',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

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

