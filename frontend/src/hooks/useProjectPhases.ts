import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import projectService, {
  CreateProjectPhaseRequest,
  CreateProjectTaskRequest,
  ReorderProjectPhasesRequest,
  UpdateProjectPhaseRequest,
  UpdateProjectTaskRequest,
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
