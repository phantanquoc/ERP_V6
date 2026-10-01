import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import repairRequestService, {
  type ConfirmAcceptancePayload,
  type CreateRepairRequestRequest,
  type PlanRepairRequestPayload,
  type RepairActualFieldsPayload,
  type RepairRequestFilters,
  type RepairRequestStatsFilters,
  type RequestType,
  type RepairRequestStatus,
  type UpdateRepairRequestRequest,
} from '../services/repairRequestService';

// ── Query key factory ────────────────────────────────────────────────────
// Canonical factory per spec: { all, lists(type,status,page,limit), detail(id), assignees(id), materialNeeds(id), supplyLinks(id), supplyChain(id) }
// Includes sourceInspectionRequestId as optional 5th param of lists for filtering.
export const repairRequestKeys = {
  all: ['repairRequests'] as const,
  lists: (
    type?: RequestType | null,
    status?: RepairRequestStatus | null,
    page?: number,
    limit?: number,
    sourceInspectionRequestId?: string | null,
    search?: string | null,
  ) => [...repairRequestKeys.all, 'list', type ?? null, status ?? null, page ?? null, limit ?? null, sourceInspectionRequestId ?? null, search ?? null] as const,
  // compat: alias used by older callers that pass filter object
  _listByFilters: (filters: RepairRequestFilters = {}) =>
    repairRequestKeys.lists(
      filters.requestType ?? null,
      filters.trangThai ?? null,
      filters.page ?? undefined,
      filters.limit ?? undefined,
      filters.sourceInspectionRequestId ?? null,
      filters.search ?? null,
    ),
  // keep legacy names as aliases
  listsRoot: () => [...repairRequestKeys.all, 'list'] as const,
  list: (filters: RepairRequestFilters = {}) => repairRequestKeys._listByFilters(filters),
  details: () => [...repairRequestKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...repairRequestKeys.all, 'detail', String(id)] as const,
  generatedCode: () => [...repairRequestKeys.all, 'generatedCode'] as const,
  stats: (filters?: RepairRequestStatsFilters) => [...repairRequestKeys.all, 'stats', filters ?? null] as const,
  assignees: (id: number | string) => [...repairRequestKeys.all, 'assignees', String(id)] as const,
  materialNeeds: (id: number | string) => [...repairRequestKeys.all, 'materialNeeds', String(id)] as const,
  supplyLinks: (id: number | string) => [...repairRequestKeys.all, 'supplyLinks', String(id)] as const,
  supplyChain: (id: number | string) => [...repairRequestKeys.all, 'supplyChain', String(id)] as const,
  incidentalCosts: (id: number | string) => [...repairRequestKeys.all, 'incidentalCosts', String(id)] as const,
  costSummary: (id: number | string) => [...repairRequestKeys.all, 'costSummary', String(id)] as const,

};

export const useRepairRequests = (filters: RepairRequestFilters = {}, opts?: { enabled?: boolean }) =>
  useQuery({
    queryKey: repairRequestKeys._listByFilters(filters),
    queryFn: () => repairRequestService.getAll(filters),
    enabled: opts?.enabled ?? true,
    // Keep the current page visible while the next one loads (no layout jump)
    placeholderData: keepPreviousData,
  });

export const useRepairRequest = (id: number | string | null | undefined) =>
  useQuery({
    queryKey: repairRequestKeys.detail(id as number | string),
    queryFn: () => repairRequestService.getById(id!),
    enabled: !!id,
  });

export const useGeneratedRepairRequestCode = () =>
  useQuery({
    queryKey: repairRequestKeys.generatedCode(),
    queryFn: () => repairRequestService.generateCode(),
  });

export const useCreateRepairRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, file }: { data: CreateRepairRequestRequest; file?: File }) =>
      repairRequestService.create(data, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.generatedCode() });
    },
  });
};

export const useUpdateRepairRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, file }: { id: number | string; data: UpdateRepairRequestRequest; file?: File }) =>
      repairRequestService.update(id, data, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const useDeleteRepairRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => repairRequestService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

// ── Status transitions ─────────────────────────────────────────────────

export const useAcceptRepair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => repairRequestService.accept(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const usePlanRepair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload?: PlanRepairRequestPayload }) =>
      repairRequestService.plan(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const useStartRepair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => repairRequestService.startRepair(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const useSubmitAcceptance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => repairRequestService.submitAcceptance(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

// Literal root keys: importing the factories would create an import cycle
// (useAcceptanceHandovers already imports repairRequestKeys from this module).
const ACCEPTANCE_HANDOVERS_ROOT = ['acceptanceHandovers'] as const;
const FAULT_RECORDS_ROOT = ['faultRecords'] as const;
const INSPECTION_REQUESTS_ROOT = ['inspectionRequests'] as const;

export const useConfirmAcceptance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ConfirmAcceptancePayload }) =>
      repairRequestService.confirmAcceptance(id, { ketQua: payload.ketQua, lyDo: payload.lyDo }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
      // The slip's ketQua changed
      queryClient.invalidateQueries({ queryKey: ACCEPTANCE_HANDOVERS_ROOT });
    },
  });
};

// Technician-entered actual execution data (DA_NGHIEM_THU / HOAN_THANH).
export const useUpdateRepairActualFields = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: RepairActualFieldsPayload }) =>
      repairRequestService.updateActualFields(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.costSummary(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.listsRoot() });
    },
  });
};

export const useRejectRepair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason?: string }) =>
      repairRequestService.reject(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const useCancelRepair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason?: string }) =>
      repairRequestService.cancel(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
    },
  });
};

export const useCompleteRepair = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => repairRequestService.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
      // complete() closes linked FaultRecords and may unblock the source YCKT
      queryClient.invalidateQueries({ queryKey: FAULT_RECORDS_ROOT });
      queryClient.invalidateQueries({ queryKey: INSPECTION_REQUESTS_ROOT });
    },
  });
};

// Generic transition helper kept for compat
export const useRepairStatusTransition = () => {
  const accept = useAcceptRepair();
  const plan = usePlanRepair();
  const start = useStartRepair();
  const submit = useSubmitAcceptance();
  const confirm = useConfirmAcceptance();
  const reject = useRejectRepair();
  const cancel = useCancelRepair();
  const complete = useCompleteRepair();
  return { accept, plan, start, submit, confirm, reject, cancel, complete };
};

// ── Status history ─────────────────────────────────────────────────────
const statusHistoryKeys = {
  all: ['repairRequestStatusHistory'] as const,
  history: (id: number | string) => [...statusHistoryKeys.all, String(id)] as const,
};

export const useRepairStatusHistory = (id: number | string | null | undefined) =>
  useQuery({
    queryKey: statusHistoryKeys.history(id ?? ''),
    queryFn: () => repairRequestService.getStatusHistory(id!),
    enabled: !!id,
    retry: (failureCount, error) => {
      const status = (error as { statusCode?: number; status?: number })?.statusCode ?? (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });


// ── Incidental costs ─────────────────────────────────────────────────
export const useRepairIncidentalCosts = (id: number | string | null | undefined) =>
  useQuery({
    queryKey: repairRequestKeys.incidentalCosts(id as string),
    queryFn: () => repairRequestService.listIncidentalCosts(id!),
    enabled: !!id,
  });

export const useCreateIncidentalCost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: import('../services/repairRequestService').CreateIncidentalCostRequest }) =>
      repairRequestService.createIncidentalCost(id, payload),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: repairRequestKeys.incidentalCosts(v.id) });
      qc.invalidateQueries({ queryKey: repairRequestKeys.costSummary(v.id) });
      qc.invalidateQueries({ queryKey: repairRequestKeys.detail(v.id) });
    },
  });
};

export const useUpdateIncidentalCost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, costId, payload }: { id: number | string; costId: string; payload: import('../services/repairRequestService').UpdateIncidentalCostRequest }) =>
      repairRequestService.updateIncidentalCost(id, costId, payload),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: repairRequestKeys.incidentalCosts(v.id) });
      qc.invalidateQueries({ queryKey: repairRequestKeys.costSummary(v.id) });
    },
  });
};

export const useDeleteIncidentalCost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, costId }: { id: number | string; costId: string }) =>
      repairRequestService.deleteIncidentalCost(id, costId),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: repairRequestKeys.incidentalCosts(v.id) });
      qc.invalidateQueries({ queryKey: repairRequestKeys.costSummary(v.id) });
    },
  });
};

export const useRepairCostSummary = (id: number | string | null | undefined) =>
  useQuery({
    queryKey: repairRequestKeys.costSummary(id as string),
    queryFn: () => repairRequestService.getCostSummary(id!),
    enabled: !!id,
  });

// ── Stats ──────────────────────────────────────────────────────────────
export const useRepairRequestStats = (filters?: RepairRequestStatsFilters, opts?: { enabled?: boolean }) =>
  useQuery({
    queryKey: repairRequestKeys.stats(filters),
    queryFn: () => repairRequestService.getStats(filters),
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
  });
