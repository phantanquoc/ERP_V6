import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import projectService, {
  CreateProjectCostRequest,
  CreateProjectPhaseRequest,
  CreateProjectTaskRequest,
  CreateProjectUpdateRequest,
  ReorderProjectPhasesRequest,
  ReorderProjectTasksRequest,
  UpdateProjectCostRequest,
  UpdateProjectPhaseRequest,
  UpdateProjectTaskRequest,
  UpdateProjectUpdateRequest,
  ProjectApproval,
} from '../services/projectService';
import { projectKeys } from './useProjects';

export const projectPhaseKeys = {
  all: ['projectPhases'] as const,
  lists: () => [...projectPhaseKeys.all, 'list'] as const,
  list: (projectId: string) => [...projectPhaseKeys.lists(), projectId] as const,
  details: () => [...projectPhaseKeys.all, 'detail'] as const,
  detail: (projectId: string, phaseId: string) => [...projectPhaseKeys.details(), projectId, phaseId] as const,
};

export const projectTaskKeys = {
  all: ['projectTasks'] as const,
  lists: () => [...projectTaskKeys.all, 'list'] as const,
  list: (projectId: string, projectPhaseId?: string | null) =>
    [...projectTaskKeys.lists(), projectId, projectPhaseId ?? 'unphased-or-all'] as const,
  details: () => [...projectTaskKeys.all, 'detail'] as const,
  detail: (projectId: string, taskId: string) => [...projectTaskKeys.details(), projectId, taskId] as const,
  unphased: (projectId: string) => [...projectTaskKeys.lists(), projectId, 'unphased'] as const,
};

const invalidateProjectContext = (queryClient: ReturnType<typeof useQueryClient>, projectId: string) => {
  queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
  queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
  queryClient.invalidateQueries({ queryKey: projectPhaseKeys.list(projectId) });
  queryClient.invalidateQueries({ queryKey: projectTaskKeys.lists() });
};

export const useProjectPhases = (projectId: string) =>
  useQuery({
    queryKey: projectPhaseKeys.list(projectId),
    queryFn: () => projectService.getPhases(projectId),
    enabled: !!projectId,
  });

export const useProjectUnphasedTasks = (projectId: string) =>
  useQuery({
    queryKey: projectTaskKeys.unphased(projectId),
    queryFn: () => projectService.getUnphasedTasks(projectId),
    enabled: !!projectId,
  });

export const useCreateProjectPhase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateProjectPhaseRequest }) =>
      projectService.addPhase(projectId, data),
    onSuccess: (_, variables) => {
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useUpdateProjectPhase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, phaseId, data }: { projectId: string; phaseId: string; data: UpdateProjectPhaseRequest }) =>
      projectService.updatePhase(projectId, phaseId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectPhaseKeys.detail(variables.projectId, variables.phaseId) });
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useDeleteProjectPhase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, phaseId, moveTasksToUnphased }: { projectId: string; phaseId: string; moveTasksToUnphased?: boolean }) =>
      projectService.deletePhase(projectId, phaseId, moveTasksToUnphased),
    onSuccess: (_, variables) => {
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useReorderProjectPhases = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: ReorderProjectPhasesRequest }) =>
      projectService.reorderPhases(projectId, data),
    onSuccess: (_, variables) => {
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useReorderProjectTasks = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: ReorderProjectTasksRequest }) =>
      projectService.reorderTasks(projectId, data),
    onSuccess: (_, variables) => {
      invalidateProjectContext(queryClient, variables.projectId);
      queryClient.invalidateQueries({ queryKey: projectTaskKeys.unphased(variables.projectId) });
    },
  });
};

export const useCreateProjectTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateProjectTaskRequest }) =>
      projectService.addTask(projectId, data),
    onSuccess: (_, variables) => {
      invalidateProjectContext(queryClient, variables.projectId);
      queryClient.invalidateQueries({ queryKey: projectTaskKeys.list(variables.projectId, variables.data.projectPhaseId) });
      queryClient.invalidateQueries({ queryKey: projectTaskKeys.unphased(variables.projectId) });
    },
  });
};

export const useUpdateProjectTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId, data }: { projectId: string; taskId: string; data: UpdateProjectTaskRequest }) =>
      projectService.updateTask(projectId, taskId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectTaskKeys.detail(variables.projectId, variables.taskId) });
      invalidateProjectContext(queryClient, variables.projectId);
      queryClient.invalidateQueries({ queryKey: projectTaskKeys.unphased(variables.projectId) });
    },
  });
};

export const useDeleteProjectTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, taskId }: { projectId: string; taskId: string }) =>
      projectService.deleteTask(projectId, taskId),
    onSuccess: (_, variables) => {
      invalidateProjectContext(queryClient, variables.projectId);
      queryClient.invalidateQueries({ queryKey: projectTaskKeys.unphased(variables.projectId) });
    },
  });
};

// ── Updates ────────────────────────────────────────────────────────────────
export const projectUpdateKeys = {
  all: ['projectUpdates'] as const,
  lists: () => [...projectUpdateKeys.all, 'list'] as const,
  list: (projectId: string) => [...projectUpdateKeys.lists(), projectId] as const,
};

export const useProjectUpdates = (projectId: string) =>
  useQuery({
    queryKey: projectUpdateKeys.list(projectId),
    queryFn: () => projectService.getUpdates(projectId),
    enabled: !!projectId,
  });

export const useAddProjectUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateProjectUpdateRequest }) =>
      projectService.addUpdate(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectUpdateKeys.list(variables.projectId) });
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useUpdateProjectUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, updateId, data }: { projectId: string; updateId: string; data: UpdateProjectUpdateRequest }) =>
      projectService.updateUpdate(projectId, updateId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectUpdateKeys.list(variables.projectId) });
    },
  });
};

export const useDeleteProjectUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, updateId }: { projectId: string; updateId: string }) =>
      projectService.deleteUpdate(projectId, updateId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectUpdateKeys.list(variables.projectId) });
    },
  });
};

// ── Costs ──────────────────────────────────────────────────────────────────
export const projectCostKeys = {
  all: ['projectCosts'] as const,
  lists: () => [...projectCostKeys.all, 'list'] as const,
  list: (projectId: string, projectPhaseId?: string | null, projectTaskId?: string | null) =>
    [...projectCostKeys.lists(), projectId, projectPhaseId ?? 'all', projectTaskId ?? 'all'] as const,
};

export const useProjectCosts = (projectId: string, projectPhaseId?: string | null, projectTaskId?: string | null) =>
  useQuery({
    queryKey: projectCostKeys.list(projectId, projectPhaseId, projectTaskId),
    queryFn: () => projectService.getCosts(projectId, projectPhaseId, projectTaskId),
    enabled: !!projectId,
  });

export const useAddProjectCost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateProjectCostRequest }) =>
      projectService.addCost(projectId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectCostKeys.lists() });
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useUpdateProjectCost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, costId, data }: { projectId: string; costId: string; data: UpdateProjectCostRequest }) =>
      projectService.updateCost(projectId, costId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectCostKeys.lists() });
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useDeleteProjectCost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, costId }: { projectId: string; costId: string }) =>
      projectService.deleteCost(projectId, costId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectCostKeys.lists() });
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

// ── Approval Workflow ─────────────────────────────────────────────────────
export const projectApprovalKeys = {
  all: ['projectApprovals'] as const,
  lists: () => [...projectApprovalKeys.all, 'list'] as const,
  list: (projectId: string) => [...projectApprovalKeys.lists(), projectId] as const,
};

export const useProjectApprovals = (projectId: string) =>
  useQuery({
    queryKey: projectApprovalKeys.list(projectId),
    queryFn: () => projectService.getApprovals(projectId),
    enabled: !!projectId,
  });

export const useSubmitApproval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ghiChu, nguoiDuyetId }: { projectId: string; ghiChu?: string; nguoiDuyetId?: string }) =>
      projectService.submitForApproval(projectId, ghiChu, nguoiDuyetId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectApprovalKeys.list(variables.projectId) });
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useApproveProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId }: { projectId: string }) =>
      projectService.approve(projectId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectApprovalKeys.list(variables.projectId) });
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};

export const useRejectProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, lyDoTuChoi }: { projectId: string; lyDoTuChoi: string }) =>
      projectService.reject(projectId, lyDoTuChoi),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectApprovalKeys.list(variables.projectId) });
      invalidateProjectContext(queryClient, variables.projectId);
    },
  });
};
