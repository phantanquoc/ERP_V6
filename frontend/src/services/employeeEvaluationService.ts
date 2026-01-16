import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  details: EvaluationDetail[];
}

class EmployeeEvaluationService {
  private getAuthToken(): string {
    return localStorage.getItem('accessToken') || '';
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.getAuthToken()}`,
      'Content-Type': 'application/json',
    };
  }

  async getEmployeeEvaluations(month: number, year: number): Promise<EmployeeEvaluation[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/employee-evaluations/evaluations`, {
        params: { month, year },
        headers: this.getHeaders(),
      });
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEvaluationDetails(evaluationId: string): Promise<EvaluationDetailsResponse> {
    try {
      // Try to use the /my-evaluation endpoint first (for self-evaluation)
      // If it fails with 403, fall back to the manager endpoint
      try {
        const response = await axios.get(
          `${API_BASE_URL}/employee-evaluations/my-evaluation/${evaluationId}`,
          {
            headers: this.getHeaders(),
          }
        );
        return response.data.data;
      } catch (error: any) {
        // If 403, try the manager endpoint
        if (error.response?.status === 403) {
          const response = await axios.get(
            `${API_BASE_URL}/employee-evaluations/evaluations/${evaluationId}/details`,
            {
              headers: this.getHeaders(),
            }
          );
          return response.data.data;
        }
        throw error;
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createOrUpdateEvaluation(employeeId: string, month: number, year: number): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/employee-evaluations/evaluations`,
        { employeeId, month, year },
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateEvaluationDetail(
    detailId: string,
    selfScore?: number,
    supervisorScore1?: number,
    supervisorScore2?: number
  ): Promise<any> {
    try {
      // Try to use the /my-evaluation endpoint first (for self-evaluation)
      // If it fails with 403, fall back to the manager endpoint
      try {
        const response = await axios.patch(
          `${API_BASE_URL}/employee-evaluations/my-evaluation/details/${detailId}`,
          {
            ...(selfScore !== undefined && { selfScore }),
            ...(supervisorScore1 !== undefined && { supervisorScore1 }),
            ...(supervisorScore2 !== undefined && { supervisorScore2 }),
          },
          {
            headers: this.getHeaders(),
          }
        );
        return response.data.data;
      } catch (error: any) {
        // If 403, try the manager endpoint
        if (error.response?.status === 403) {
          const response = await axios.patch(
            `${API_BASE_URL}/employee-evaluations/evaluations/details/${detailId}`,
            {
              ...(selfScore !== undefined && { selfScore }),
              ...(supervisorScore1 !== undefined && { supervisorScore1 }),
              ...(supervisorScore2 !== undefined && { supervisorScore2 }),
            },
            {
              headers: this.getHeaders(),
            }
          );
          return response.data.data;
        }
        throw error;
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getEvaluationHistory(evaluationId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/employee-evaluations/evaluations/${evaluationId}/history`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async finalizeEvaluation(evaluationId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/employee-evaluations/evaluations/${evaluationId}/finalize`,
        {},
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getSubordinatesForEvaluation(month: number, year: number): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/employee-evaluations/subordinates/${month}/${year}`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data.data || [];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;
      return new Error(message);
    }
    return new Error('An unexpected error occurred');
  }
}

export default new EmployeeEvaluationService();

