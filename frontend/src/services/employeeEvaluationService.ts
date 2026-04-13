import apiClient, { ApiError } from './apiClient';

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
}

export interface EvaluationDetailsResponse {
  evaluationId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  period: string;
  // SUGGESTION fix: status included so frontend can disable inputs by status
  status: string;
  details: EvaluationDetail[];
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
    isManager?: boolean
  ): Promise<any> {
    try {
      const body = {
        ...(selfScore !== undefined && { selfScore }),
        ...(supervisorScore1 !== undefined && { supervisorScore1 }),
        ...(supervisorScore2 !== undefined && { supervisorScore2 }),
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

  async getSubordinatesForEvaluation(month: number, year: number): Promise<any[]> {
    try {
      const response = await apiClient.get(
        `/employee-evaluations/subordinates/${month}/${year}`
      );
      return response.data || [];
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
