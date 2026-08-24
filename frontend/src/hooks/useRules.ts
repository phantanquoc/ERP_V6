import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ruleService from '../services/ruleService';

export const ruleKeys = {
  all: ['rules'] as const,
  lists: () => [...ruleKeys.all, 'list'] as const,
  list: (filters: Record<string, string>) => [...ruleKeys.lists(), filters] as const,
  detail: (id: string) => [...ruleKeys.all, 'detail', id] as const,
  matrix: (positionId?: string, departmentId?: string) => [...ruleKeys.all, 'matrix', positionId ?? '', departmentId ?? ''] as const,
  myPermissions: () => [...ruleKeys.all, 'my-permissions'] as const,
  auditLog: (ruleId?: string) => [...ruleKeys.all, 'audit-log', ruleId ?? ''] as const,
};

export const resourceKeys = {
  all: ['resources'] as const,
  list: () => [...resourceKeys.all, 'list'] as const,
};

export function useRules(filters?: Record<string, string>) {
  return useQuery({ queryKey: ruleKeys.list(filters ?? {}), queryFn: () => ruleService.listRules(filters) });
}

export function useRuleMatrix(positionId?: string, departmentId?: string) {
  return useQuery({
    queryKey: ruleKeys.matrix(positionId, departmentId),
    queryFn: () => ruleService.getMatrix({ positionId: positionId ?? '', departmentId: departmentId ?? '' } as never),
    enabled: !!positionId || !!departmentId,
  });
}

export function useMyPermissions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ruleKeys.myPermissions(),
    queryFn: () => ruleService.getMyPermissions(),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useResources() {
  return useQuery({ queryKey: resourceKeys.list(), queryFn: () => ruleService.listResources(), staleTime: 300_000 });
}

export function useRuleAuditLogs(ruleId?: string) {
  return useQuery({ queryKey: ruleKeys.auditLog(ruleId), queryFn: () => ruleService.listAuditLogs(ruleId ? { ruleId } : undefined) });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => ruleService.createRule(data as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ruleKeys.all }); qc.invalidateQueries({ queryKey: ruleKeys.myPermissions() }); },
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => ruleService.updateRule(id, data as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ruleKeys.all }); qc.invalidateQueries({ queryKey: ruleKeys.myPermissions() }); },
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ruleService.deleteRule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ruleKeys.all }); qc.invalidateQueries({ queryKey: ruleKeys.myPermissions() }); },
  });
}
