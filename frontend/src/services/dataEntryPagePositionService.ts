import apiClient from './apiClient';

interface Position {
  id: string;
  code: string;
  name: string;
  category: string;
}

interface DataEntryPageMapping {
  id: string;
  pageKey: string;
  positionId: string;
  position: Position;
  createdAt: string;
  updatedAt: string;
}

class DataEntryPagePositionService {
  async listByPage(pageKey: string): Promise<DataEntryPageMapping[]> {
    try {
      const response = await apiClient.get(
        `/data-entry-page-positions/pages/${pageKey}/positions`
      );
      return response.data as DataEntryPageMapping[];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async addMapping(pageKey: string, positionId: string): Promise<DataEntryPageMapping> {
    try {
      const response = await apiClient.post(
        `/data-entry-page-positions/pages/${pageKey}/positions`,
        { positionId }
      );
      return response.data as DataEntryPageMapping;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async removeMapping(pageKey: string, positionId: string): Promise<void> {
    try {
      await apiClient.delete(
        `/data-entry-page-positions/pages/${pageKey}/positions/${positionId}`
      );
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

export default new DataEntryPagePositionService();
