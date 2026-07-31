import apiClient, { ApiError } from './apiClient';

// ── Enums ──────────────────────────────────────────────────────────────────
export type EvaluationMode = 'QUICK' | 'FULL';

// ── Core detail / evaluation types ────────────────────────────────────────
export interface EvaluationDetail {
  stt: number;
  responsibilityId: string;
  title: string;
  description: string;
  weight: number;
  selfScore: number | null;
  supervisorScore1: number | null;
  supervisorScore2: number | null;
  detailId: string | null;
  // New fields from enhance-employee-evaluation
  notApplicable?: boolean;
  masked?: boolean;
  commentEmployee?: string | null;
  commentSup1?: string | null;
  commentSup2?: string | null;
}

export interface EmployeeEvaluation {
  id: string;
  employeeCode: string;
  employeeName: string;
  positionId: string;
  positionName: string;
  evaluationId: string | null;
  selfScore: number;
  supervisorScore1: number;
  supervisorScore2: number;
  // New fields
  mode?: EvaluationMode;
}

export interface EvaluationDetailsResponse {
  evaluationId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  period: string;
  status: string;
  supervisor1Name?: string | null;
  supervisor2Name?: string | null;
  details: EvaluationDetail[];
  // New fields
  mode?: EvaluationMode;
  commentEmployee?: string | null;
  commentSup1?: string | null;
  commentSup2?: string | null;
  selfScorePercentage?: number | null;
  sup1Percentage?: number | null;
  sup2Percentage?: number | null;
  appealComment?: string | null;
  appealResponse?: string | null;
  appealedAt?: string | null;
  appealRespondedAt?: string | null;
  masked?: boolean;
}

export interface CompletionStats {
  total: number;
  selfPending: number;
  supervisor1Pending: number;
  supervisor2Pending: number;
  completed: number;
  acknowledged: number;
  completionRate: number;
  byDepartment: Array<{
    departmentName: string;
    total: number;
    completed: number;
    rate: number;
  }>;
}

// ── Goals ──────────────────────────────────────────────────────────────────
export interface EvaluationGoal {
  id: string;
  evaluationId: string;
  orderIndex: number;
  title: string;
  description?: string | null;
  targetPeriod?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  targetPeriod?: string;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  targetPeriod?: string;
}

// ── IDP Items ──────────────────────────────────────────────────────────────
export interface EvaluationIdpItem {
  id: string;
  evaluationId: string;
  orderIndex: number;
  skill: string;
  action: string;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIdpItemRequest {
  skill: string;
  action: string;
  deadline?: string;
}

export interface UpdateIdpItemRequest {
  skill?: string;
  action?: string;
  deadline?: string;
}

// ── Evidence ───────────────────────────────────────────────────────────────
export interface EvaluationEvidence {
  id: string;
  evaluationDetailId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

// ── Appeal ─────────────────────────────────────────────────────────────────
export interface AppealRequest {
  appealComment: string;
}

export interface AppealReplyRequest {
  appealResponse: string;
}

// ── Peer Feedback ──────────────────────────────────────────────────────────
export interface PeerInviteRequest {
  inviteeUserIds: string[];
}

export interface PeerFeedbackSubmitRequest {
  strength: string;
  weakness: string;
  suggestion: string;
}

export interface PeerFeedbackAggregate {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  respondentCount: number;
  pending?: boolean;
  expectedMinimum?: number;
}

// ── Calibration Heatmap ────────────────────────────────────────────────────
export interface CalibrationSupervisorEntry {
  supervisorId: string;
  supervisorName: string;
  supervisorRole: string;
  subordinateCount: number;
  avgScore: number;
  distribution: {
    d0_20: number;
    d21_40: number;
    d41_60: number;
    d61_80: number;
    d81_100: number;
  };
}

export interface InflationAlert {
  supervisorId: string;
  supervisorName: string;
  departmentName: string;
  inflationRate: number;
  sampleSize: number;
}

export interface CalibrationHeatmap {
  supervisors: CalibrationSupervisorEntry[];
  departmentBenchmarks: Array<{
    departmentName: string;
    p20: number;
    p50: number;
    p80: number;
  }>;
  trend: Array<{
    period: string;
    avgScore: number;
    completionRate: number;
  }>;
  inflationAlerts: InflationAlert[];
}

// ── Payroll Preview ────────────────────────────────────────────────────────
export interface PayrollPreview {
  kpiBonus: number;
  currentSup2Percentage: number;
  projectedDeduction: number;
  projectedNet: number;
  isFinalized: boolean;
}

// ── Audit Log ──────────────────────────────────────────────────────────────
export interface AuditLogEntry {
  id: string;
  evaluationId: string;
  evaluationDetailId?: string | null;
  changedByUserId?: string | null;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

// ── Copy from previous month ───────────────────────────────────────────────
export interface CopyPreviousMonthResult {
  copied: number;
  skipped: number;
  copiedCount: number;
  sourcePeriod: string;
}

// ── Comment update request ─────────────────────────────────────────────────
export interface UpdateCommentRequest {
  role: 'employee' | 'sup1' | 'sup2';
  comment: string;
}

class EmployeeEvaluationService {
  async getEmployeeEvaluations(month: number, year: number): Promise<EmployeeEvaluation[]> {
    try {
      const response = await apiClient.get('/employee-evaluations/evaluations', {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // BUG 4: Accept isManager param to go directly to manager endpoint when true
  async getEvaluationDetails(evaluationId: string, isManager?: boolean): Promise<EvaluationDetailsResponse> {
    try {
      if (isManager) {
        const response = await apiClient.get(
          `/employee-evaluations/evaluations/${evaluationId}/details`
        );
        return response.data;
      }

      // Try self-evaluation endpoint first, fall back on 403
      try {
        const response = await apiClient.get(
          `/employee-evaluations/my-evaluation/${evaluationId}`
        );
        return response.data;
      } catch (error: any) {
        if (error instanceof ApiError && error.statusCode === 403) {
          const response = await apiClient.get(
            `/employee-evaluations/evaluations/${evaluationId}/details`
          );
          return response.data;
        }
        throw error;
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createOrUpdateEvaluation(employeeId: string, month: number, year: number): Promise<any> {
    try {
      const response = await apiClient.post(
        '/employee-evaluations/evaluations',
        { employeeId, month, year }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // BUG 5: Bulk creation endpoint
  async createBulkEvaluations(month: number, year: number): Promise<any> {
    try {
      const response = await apiClient.post(
        '/employee-evaluations/evaluations/bulk',
        { month, year }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // BUG 4: Accept isManager param to go directly to manager endpoint when true
  async updateEvaluationDetail(
    detailId: string,
    selfScore?: number,
    supervisorScore1?: number,
    supervisorScore2?: number,
    isManager?: boolean,
    comment?: string
  ): Promise<any> {
    try {
      const body = {
        ...(selfScore !== undefined && { selfScore }),
        ...(supervisorScore1 !== undefined && { supervisorScore1 }),
        ...(supervisorScore2 !== undefined && { supervisorScore2 }),
        ...(comment !== undefined && { comment }),
      };

      if (isManager) {
        const response = await apiClient.patch(
          `/employee-evaluations/evaluations/details/${detailId}`,
          body
        );
        return response.data;
      }

      // Try self-evaluation endpoint first, fall back on 403
      try {
        const response = await apiClient.patch(
          `/employee-evaluations/my-evaluation/details/${detailId}`,
          body
        );
        return response.data;
      } catch (error: any) {
        if (error instanceof ApiError && error.statusCode === 403) {
          const response = await apiClient.patch(
            `/employee-evaluations/evaluations/details/${detailId}`,
            body
          );
          return response.data;
        }
        throw error;
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEvaluationHistory(evaluationId: string): Promise<any> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/evaluations/${evaluationId}/history`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async finalizeEvaluation(evaluationId: string): Promise<any> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/${evaluationId}/finalize`,
        {}
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async acknowledgeEvaluation(evaluationId: string): Promise<any> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/${evaluationId}/acknowledge`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPendingCount(): Promise<number> {
    try {
      const response = await apiClient.get('/employee-evaluations/pending-count');
      return (response.data as { count: number })?.count ?? 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSubordinatesForEvaluation(month: number, year: number): Promise<any[]> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/subordinates/${month}/${year}`
      );
      return (response.data as any[]) || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCompletionStats(month: number, year: number): Promise<CompletionStats> {
    try {
      const response = await apiClient.get('/employee-evaluations/completion-stats', {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Comment ───────────────────────────────────────────────────────────────

  // ── Comment ──────────────────────────────────────────────────────────────
  async updateEvaluationComment(evaluationId: string, body: UpdateCommentRequest): Promise<any> {
    try {
      const response = await apiClient.patch(
        `/employee-evaluations/evaluations/${evaluationId}/comment`,
        body
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── N/A toggle ────────────────────────────────────────────────────────────
  async toggleNotApplicable(detailId: string, notApplicable: boolean): Promise<any> {
    try {
      const response = await apiClient.patch(
        `/employee-evaluations/evaluations/details/${detailId}/na`,
        { notApplicable }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Evidence ──────────────────────────────────────────────────────────────
  async listEvidence(detailId: string): Promise<EvaluationEvidence[]> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/evaluations/details/${detailId}/evidence`
      );
      return (response.data as EvaluationEvidence[]) || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async uploadEvidence(detailId: string, file: File): Promise<EvaluationEvidence> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/details/${detailId}/evidence`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteEvidence(evidenceId: string): Promise<void> {
    try {
      await apiClient.delete(`/employee-evaluations/evaluations/evidence/${evidenceId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Appeal ────────────────────────────────────────────────────────────────
  async submitAppeal(evaluationId: string, appealComment: string): Promise<any> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/${evaluationId}/appeal`,
        { appealComment }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async replyAppeal(evaluationId: string, appealResponse: string): Promise<any> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/${evaluationId}/appeal/reply`,
        { appealResponse }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  async getAuditLog(evaluationId: string): Promise<AuditLogEntry[]> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/evaluations/${evaluationId}/audit-log`
      );
      return (response.data as AuditLogEntry[]) || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Payroll preview ────────────────────────────────────────────────────────
  async getPayrollPreview(evaluationId: string): Promise<PayrollPreview> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/evaluations/${evaluationId}/payroll-preview`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── PDF export ────────────────────────────────────────────────────────────
  async downloadPdf(evaluationId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/evaluations/${evaluationId}/pdf`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Calibration heatmap ───────────────────────────────────────────────────
  async getCalibrationHeatmap(month: number, year: number): Promise<CalibrationHeatmap> {
    try {
      const response = await apiClient.get('/employee-evaluations/calibration/heatmap', {
        params: { month, year },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Copy from previous month ──────────────────────────────────────────────
  async copyFromPreviousMonth(evaluationId: string): Promise<CopyPreviousMonthResult> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/${evaluationId}/copy-previous-month`,
        {}
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Goals ──────────────────────────────────────────────────────────────────
  async listGoals(evaluationId: string): Promise<EvaluationGoal[]> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/evaluations/${evaluationId}/goals`
      );
      return (response.data as EvaluationGoal[]) || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createGoal(evaluationId: string, body: CreateGoalRequest): Promise<EvaluationGoal> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/${evaluationId}/goals`,
        body
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateGoal(evaluationId: string, goalId: string, body: UpdateGoalRequest): Promise<EvaluationGoal> {
    try {
      const response = await apiClient.patch(
        `/employee-evaluations/evaluations/${evaluationId}/goals/${goalId}`,
        body
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteGoal(evaluationId: string, goalId: string): Promise<void> {
    try {
      await apiClient.delete(`/employee-evaluations/evaluations/${evaluationId}/goals/${goalId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── IDP Items ──────────────────────────────────────────────────────────────
  async listIdpItems(evaluationId: string): Promise<EvaluationIdpItem[]> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/evaluations/${evaluationId}/idp-items`
      );
      return (response.data as EvaluationIdpItem[]) || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createIdpItem(evaluationId: string, body: CreateIdpItemRequest): Promise<EvaluationIdpItem> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/${evaluationId}/idp-items`,
        body
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateIdpItem(evaluationId: string, idpId: string, body: UpdateIdpItemRequest): Promise<EvaluationIdpItem> {
    try {
      const response = await apiClient.patch(
        `/employee-evaluations/evaluations/${evaluationId}/idp-items/${idpId}`,
        body
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteIdpItem(evaluationId: string, idpId: string): Promise<void> {
    try {
      await apiClient.delete(`/employee-evaluations/evaluations/${evaluationId}/idp-items/${idpId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // ── Peer Feedback ──────────────────────────────────────────────────────────
  async invitePeers(evaluationId: string, inviteeUserIds: string[]): Promise<any> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/evaluations/${evaluationId}/peer-feedback/invite`,
        { inviteeUserIds }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async submitPeerFeedback(token: string, body: PeerFeedbackSubmitRequest): Promise<any> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/peer-feedback/submit/${token}`,
        body
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async declinePeerFeedback(token: string): Promise<any> {
    try {
      const response = await apiClient.post(
        `/employee-evaluations/peer-feedback/decline/${token}`,
        {}
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getPeerFeedbackAggregate(evaluationId: string): Promise<PeerFeedbackAggregate> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/evaluations/${evaluationId}/peer-feedback/aggregate`
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error instanceof Error) {
      const message = error.message;
      return new Error(message);
    }
    return new Error('An unexpected error occurred');
  }
}

export default new EmployeeEvaluationService();
