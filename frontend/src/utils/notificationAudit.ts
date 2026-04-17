import type { AppNotification } from '@services/notificationService';

const joinParts = (parts: Array<string | undefined>) => parts.filter(Boolean).join(' • ');

export const getNotificationAuditHeadline = (notification: AppNotification): string | null => {
  const actorName = notification.metadata?.actor?.name;
  const actionLabel = notification.metadata?.action?.label;
  const entityLabel = notification.metadata?.entity?.code || notification.metadata?.entity?.name;

  const headline = joinParts([actorName, actionLabel, entityLabel]);
  return headline || null;
};

export const getNotificationAuditDetail = (notification: AppNotification): string | null => {
  const actor = notification.metadata?.actor;
  const action = notification.metadata?.action;

  const ownerLabel = joinParts([
    actor?.subDepartmentName,
    actor?.departmentName,
  ]);
  const changedFields = action?.changedFields?.length
    ? `Trường thay đổi: ${action.changedFields.join(', ')}`
    : undefined;

  const detail = joinParts([ownerLabel, action?.summary, changedFields]);
  return detail || null;
};
