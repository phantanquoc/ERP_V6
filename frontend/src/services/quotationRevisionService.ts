import apiClient from './apiClient';

export interface QuotationRevision {
  id: string;
  quotationId: string;
  revisionNumber: number;
  snapshot: Record<string, unknown>;
  createdBy: string;
  createdByName?: string | null;
  createdAt: string;
  note?: string;
}

export interface QuotationRevisionListResponse {
  success: boolean;
  data: QuotationRevision[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuotationRevisionDetailResponse {
  success: boolean;
  data: QuotationRevision;
}

export const quotationRevisionService = {
  async listRevisions(quotationId: string, page = 1, limit = 10): Promise<QuotationRevisionListResponse> {
    const response = await apiClient.get(`/quotations/${quotationId}/revisions`, {
      params: { page, limit },
    });
    return response as unknown as QuotationRevisionListResponse;
  },

  async getRevisionById(quotationId: string, revisionId: string): Promise<QuotationRevisionDetailResponse> {
    const response = await apiClient.get(`/quotations/${quotationId}/revisions/${revisionId}`);
    return response as unknown as QuotationRevisionDetailResponse;
  },
};
