import { useQuery } from '@tanstack/react-query';
import { auditLogService, ListAuditParams } from '../services/auditLogService';

export const auditLogKeys = {
  all: ['auditLogs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (params: ListAuditParams) =>
    [...auditLogKeys.lists(), params] as const,
};

export const useAuditLogs = (params: ListAuditParams, enabled = true) => {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => auditLogService.listAudit(params),
    enabled,
  });
};
