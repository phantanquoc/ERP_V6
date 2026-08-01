import apiClient from './apiClient';

export interface AttendedOperator {
  id: string;
  name: string;
  employeeCode: string;
  positionName: string;
}

class AttendedOperatorsService {
  async getAttendedOperators(
    date: string,
    shift: number,
    pageKey: string
  ): Promise<AttendedOperator[]> {
    try {
      const response = await apiClient.get('/kiosk/attended-operators', {
        params: {
          date,
          shift,
          pageKey,
        },
      });
      return response.data as AttendedOperator[];
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

export default new AttendedOperatorsService();
