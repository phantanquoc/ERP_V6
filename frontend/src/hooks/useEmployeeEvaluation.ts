import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import employeeEvaluationService, {
  CreateGoalRequest,
  UpdateGoalRequest,
  CreateIdpItemRequest,
  UpdateIdpItemRequest,
  PeerFeedbackSubmitRequest,
  UpdateCommentRequest,
} from '../services/employeeEvaluationService';

// ── Query key factory ──────────────────────────────────────────────────────
export const evaluationKeys = {
  all: ['evaluations'] as const,
  myEvaluation: (evaluationId: string) => [...evaluationKeys.all, 'my', evaluationId] as const,
  details: (evaluationId: string) => [...evaluationKeys.all, 'details', evaluationId] as const,
  subordinates: (month: number, year: number) => [...evaluationKeys.all, 'subordinates', month, year] as const,
  history: (evaluationId: string) => [...evaluationKeys.all, 'history', evaluationId] as const,
  completionStats: (month: number, year: number) => [...evaluationKeys.all, 'completionStats', month, year] as const,
  goals: (evaluationId: string) => [...evaluationKeys.all, 'goals', evaluationId] as const,
  idp: (evaluationId: string) => [...evaluationKeys.all, 'idp', evaluationId] as const,
  evidence: (detailId: string) => [...evaluationKeys.all, 'evidence', detailId] as const,
  auditLog: (evaluationId: string) => [...evaluationKeys.all, 'audit-log', evaluationId] as const,
  calibrationHeatmap: (month: number, year: number) => [...evaluationKeys.all, 'calibration-heatmap', month, year] as const,
  payrollPreview: (evaluationId: string) => [...evaluationKeys.all, 'payroll-preview', evaluationId] as const,
  peerFeedback: (evaluationId: string) => [...evaluationKeys.all, 'peer-feedback', evaluationId] as const,
  appeal: (evaluationId: string) => [...evaluationKeys.all, 'appeal', evaluationId] as const,
};

// ── Read hooks ─────────────────────────────────────────────────────────────

export const useMyEvaluation = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.myEvaluation(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getEvaluationDetails(evaluationId!),
    enabled: !!evaluationId,
  });
};

export const useEvaluationDetails = (evaluationId: string | null, isManager?: boolean) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.details(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getEvaluationDetails(evaluationId!, isManager),
    enabled: !!evaluationId,
  });
};

export const useSubordinatesForEvaluation = (month: number, year: number) => {
  return useQuery({
    queryKey: evaluationKeys.subordinates(month, year),
    queryFn: () => employeeEvaluationService.getSubordinatesForEvaluation(month, year),
    enabled: !!month && !!year,
  });
};

export const useEvaluationHistory = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.history(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getEvaluationHistory(evaluationId!),
    enabled: !!evaluationId,
  });
};

export const useCompletionStats = (month: number, year: number) => {
  return useQuery({
    queryKey: evaluationKeys.completionStats(month, year),
    queryFn: () => employeeEvaluationService.getCompletionStats(month, year),
    enabled: !!month && !!year,
  });
};

export const useEvaluationGoals = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.goals(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.listGoals(evaluationId!),
    enabled: !!evaluationId,
  });
};

export const useEvaluationIdp = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.idp(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.listIdpItems(evaluationId!),
    enabled: !!evaluationId,
  });
};

export const useEvaluationEvidence = (detailId: string | null) => {
  return useQuery({
    queryKey: detailId ? evaluationKeys.evidence(detailId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.listEvidence(detailId!),
    enabled: !!detailId,
  });
};

export const useEvaluationAuditLog = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.auditLog(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getAuditLog(evaluationId!),
    enabled: !!evaluationId,
  });
};

export const useCalibrationHeatmap = (month: number, year: number) => {
  return useQuery({
    queryKey: evaluationKeys.calibrationHeatmap(month, year),
    queryFn: () => employeeEvaluationService.getCalibrationHeatmap(month, year),
    enabled: !!month && !!year,
  });
};

export const usePayrollPreview = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.payrollPreview(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getPayrollPreview(evaluationId!),
    enabled: !!evaluationId,
  });
};

export const usePeerFeedback = (evaluationId: string | null) => {
  return useQuery({
    queryKey: evaluationId ? evaluationKeys.peerFeedback(evaluationId) : evaluationKeys.all,
    queryFn: () => employeeEvaluationService.getPeerFeedbackAggregate(evaluationId!),
    enabled: !!evaluationId,
  });
};

// ── Mutation hooks ─────────────────────────────────────────────────────────

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
      queryClient.invalidateQueries({ queryKey: evaluationKeys.all });
    },
  });
};

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

export const useUpdateEvaluationComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, body }: { evaluationId: string; body: UpdateCommentRequest }) =>
      employeeEvaluationService.updateEvaluationComment(evaluationId, body),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.details(evaluationId) });
      queryClient.invalidateQueries({ queryKey: evaluationKeys.myEvaluation(evaluationId) });
    },
  });
};

export const useToggleNotApplicable = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ detailId, notApplicable }: { detailId: string; notApplicable: boolean }) =>
      employeeEvaluationService.toggleNotApplicable(detailId, notApplicable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.all });
    },
  });
};

export const useCopyFromPreviousMonth = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (evaluationId: string) =>
      employeeEvaluationService.copyFromPreviousMonth(evaluationId),
    onSuccess: (_data, evaluationId) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.details(evaluationId) });
      queryClient.invalidateQueries({ queryKey: evaluationKeys.myEvaluation(evaluationId) });
    },
  });
};

export const useSubmitAppeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, appealComment }: { evaluationId: string; appealComment: string }) =>
      employeeEvaluationService.submitAppeal(evaluationId, appealComment),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.details(evaluationId) });
      queryClient.invalidateQueries({ queryKey: evaluationKeys.myEvaluation(evaluationId) });
    },
  });
};

export const useReplyAppeal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, appealResponse }: { evaluationId: string; appealResponse: string }) =>
      employeeEvaluationService.replyAppeal(evaluationId, appealResponse),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.details(evaluationId) });
    },
  });
};

// ── Goals mutations ────────────────────────────────────────────────────────

export const useCreateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, body }: { evaluationId: string; body: CreateGoalRequest }) =>
      employeeEvaluationService.createGoal(evaluationId, body),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.goals(evaluationId) });
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, goalId, body }: { evaluationId: string; goalId: string; body: UpdateGoalRequest }) =>
      employeeEvaluationService.updateGoal(evaluationId, goalId, body),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.goals(evaluationId) });
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, goalId }: { evaluationId: string; goalId: string }) =>
      employeeEvaluationService.deleteGoal(evaluationId, goalId),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.goals(evaluationId) });
    },
  });
};

// ── IDP mutations ──────────────────────────────────────────────────────────

export const useCreateIdpItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, body }: { evaluationId: string; body: CreateIdpItemRequest }) =>
      employeeEvaluationService.createIdpItem(evaluationId, body),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.idp(evaluationId) });
    },
  });
};

export const useUpdateIdpItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, idpId, body }: { evaluationId: string; idpId: string; body: UpdateIdpItemRequest }) =>
      employeeEvaluationService.updateIdpItem(evaluationId, idpId, body),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.idp(evaluationId) });
    },
  });
};

export const useDeleteIdpItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, idpId }: { evaluationId: string; idpId: string }) =>
      employeeEvaluationService.deleteIdpItem(evaluationId, idpId),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.idp(evaluationId) });
    },
  });
};

// ── Evidence mutations ─────────────────────────────────────────────────────

export const useUploadEvidence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ detailId, file }: { detailId: string; file: File }) =>
      employeeEvaluationService.uploadEvidence(detailId, file),
    onSuccess: (_data, { detailId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.evidence(detailId) });
    },
  });
};

export const useDeleteEvidence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceId, detailId }: { evidenceId: string; detailId: string }) =>
      employeeEvaluationService.deleteEvidence(evidenceId),
    onSuccess: (_data, { detailId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.evidence(detailId) });
    },
  });
};

// ── Peer feedback mutations ────────────────────────────────────────────────

export const useInvitePeers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evaluationId, inviteeUserIds }: { evaluationId: string; inviteeUserIds: string[] }) =>
      employeeEvaluationService.invitePeers(evaluationId, inviteeUserIds),
    onSuccess: (_data, { evaluationId }) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.peerFeedback(evaluationId) });
    },
  });
};

export const useSubmitPeerFeedback = () => {
  return useMutation({
    mutationFn: ({ token, body }: { token: string; body: PeerFeedbackSubmitRequest }) =>
      employeeEvaluationService.submitPeerFeedback(token, body),
  });
};

export const useDeclinePeerFeedback = () => {
  return useMutation({
    mutationFn: (token: string) => employeeEvaluationService.declinePeerFeedback(token),
  });
};
