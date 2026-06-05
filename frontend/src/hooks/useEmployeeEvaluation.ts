import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import employeeEvaluationService from '../services/employeeEvaluationService';

// Query key factory
export const evaluationKeys = {
  all: ['evaluations'] as const,
  myEvaluation: (evaluationId: string) => [...evaluationKeys.all, 'my', evaluationId] as const,
  details: (evaluationId: string) => [...evaluationKeys.all, 'details', evaluationId] as const,
  subordinates: (month: number, year: number) => [...evaluationKeys.all, 'subordinates', month, year] as const,
  history: (evaluationId: string) => [...evaluationKeys.all, 'history', evaluationId] as const,
  completionStats: (month: number, year: number) => [...evaluationKeys.all, 'completionStats', month, year] as const,
};

// Hook to get self-evaluation details (employee's own evaluation)
export const useMyEvaluation = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.myEvaluation(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getEvaluationDetails(evaluationId!),
    enabled: !!evaluationId,
  });
};

// Hook to get evaluation details (manager view when isManager=true)
export const useEvaluationDetails = (evaluationId: string | null, isManager?: boolean) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.details(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getEvaluationDetails(evaluationId!, isManager),
    enabled: !!evaluationId,
  });
};

// Hook to get subordinates for evaluation in a given month/year
export const useSubordinatesForEvaluation = (month: number, year: number) => {
  return useQuery({
    queryKey: evaluationKeys.subordinates(month, year),
    queryFn: () => employeeEvaluationService.getSubordinatesForEvaluation(month, year),
    enabled: !!month && !!year,
  });
};

// Hook to get evaluation history for an evaluation
export const useEvaluationHistory = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.history(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getEvaluationHistory(evaluationId!),
    enabled: !!evaluationId,
  });
};

// Mutation to update a single evaluation detail (self or supervisor score)
export const useUpdateEvaluationDetail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      detailId,
      selfScore,
      supervisorScore1,
      supervisorScore2,
      isManager,
      comment,
    }: {
      detailId: string;
      selfScore?: number;
      supervisorScore1?: number;
      supervisorScore2?: number;
      isManager?: boolean;
      comment?: string;
    }) =>
      employeeEvaluationService.updateEvaluationDetail(
        detailId,
        selfScore,
        supervisorScore1,
        supervisorScore2,
        isManager,
        comment
      ),
    onSuccess: () => {
      // Invalidate all evaluation queries so details and history refresh
      queryClient.invalidateQueries({ queryKey: evaluationKeys.all });
    },
  });
};

// Mutation to acknowledge a completed evaluation
export const useAcknowledgeEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evaluationId: string) =>
      employeeEvaluationService.acknowledgeEvaluation(evaluationId),
    onSuccess: (_data, evaluationId) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.myEvaluation(evaluationId) });
      queryClient.invalidateQueries({ queryKey: evaluationKeys.details(evaluationId) });
    },
  });
};

// Mutation to create or update an evaluation (idempotent)
export const useCreateOrUpdateEvaluation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      employeeId,
      month,
      year,
    }: {
      employeeId: string;
      month: number;
      year: number;
    }) => employeeEvaluationService.createOrUpdateEvaluation(employeeId, month, year),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.all });
    },
  });
};

// Hook to get completion stats for a given month/year (admin/dept-head)
export const useCompletionStats = (month: number, year: number) => {
  return useQuery({
    queryKey: evaluationKeys.completionStats(month, year),
    queryFn: () => employeeEvaluationService.getCompletionStats(month, year),
    enabled: !!month && !!year,
  });
};
