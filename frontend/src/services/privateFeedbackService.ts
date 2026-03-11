import apiClient from './apiClient';

// Types
export type FeedbackType = 'GOP_Y' | 'NEU_KHO_KHAN';
export type FeedbackStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface PrivateFeedback {
  id: string;
  code: string;
  type: FeedbackType;
  userId: string;
  date: string;
  content: string;
  notes?: string;
  purpose?: string; // Chỉ cho GOP_Y
  solution?: string; // Chỉ cho NEU_KHO_KHAN
  attachments: string[];
  status: FeedbackStatus;
  response?: string;
  respondedBy?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreatePrivateFeedbackData {
  type: FeedbackType;
  content: string;
  notes?: string;
  purpose?: string;
  solution?: string;
  attachments?: string[];
}

export interface UpdatePrivateFeedbackData {
  content?: string;
  notes?: string;
  purpose?: string;
  solution?: string;
  attachments?: string[];
  status?: FeedbackStatus;
  response?: string;
  respondedBy?: string;
}

export interface PaginatedResponse {
  success: boolean;
  message: string;
  data: PrivateFeedback[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SingleResponse {
  success: boolean;
  message: string;
  data: PrivateFeedback;
}

export interface GenerateCodeResponse {
  success: boolean;
  message: string;
  data: {
    code: string;
  };
}

export interface StatsResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    byStatus: {
      pending: number;
      inProgress: number;
      resolved: number;
    };
    byType: {
      gopY: number;
      neuKhoKhan: number;
    };
  };
}

export const privateFeedbackService = {
  // Lấy tất cả feedback
  async getAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    type?: FeedbackType;
    status?: FeedbackStatus;
    userId?: string;
  } = {}): Promise<PaginatedResponse> {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      userId
    } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (status) params.append('status', status);
    if (userId) params.append('userId', userId);

    const response = await apiClient.get(`/private-feedbacks?${params.toString()}`);
    return response as unknown as PaginatedResponse;
  },

  // Lấy feedback theo ID
  async getById(id: string): Promise<SingleResponse> {
    const response = await apiClient.get(`/private-feedbacks/${id}`);
    return response as unknown as SingleResponse;
  },

  // Lấy feedback theo code
  async getByCode(code: string): Promise<SingleResponse> {
    const response = await apiClient.get(`/private-feedbacks/code/${code}`);
    return response as unknown as SingleResponse;
  },

  // Tạo mã tự động
  async generateCode(type: FeedbackType): Promise<GenerateCodeResponse> {
    const response = await apiClient.post('/private-feedbacks/generate-code', { type });
    return response as unknown as GenerateCodeResponse;
  },

  // Tạo feedback mới
  async create(data: CreatePrivateFeedbackData, files?: File[]): Promise<SingleResponse> {
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('content', data.content);
      if (data.notes) formData.append('notes', data.notes);
      if (data.purpose) formData.append('purpose', data.purpose);
      if (data.solution) formData.append('solution', data.solution);
      files.forEach(file => formData.append('files', file));
      const response = await apiClient.post('/private-feedbacks', formData);
      return response as unknown as SingleResponse;
    }
    const response = await apiClient.post('/private-feedbacks', data);
    return response as unknown as SingleResponse;
  },

  // Cập nhật feedback
  async update(id: string, data: UpdatePrivateFeedbackData, files?: File[]): Promise<SingleResponse> {
    if (files && files.length > 0) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'attachments') {
          if (Array.isArray(value)) {
            value.forEach(v => formData.append(key, v));
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      files.forEach(file => formData.append('files', file));
      const response = await apiClient.patch(`/private-feedbacks/${id}`, formData);
      return response as unknown as SingleResponse;
    }
    const response = await apiClient.patch(`/private-feedbacks/${id}`, data);
    return response as unknown as SingleResponse;
  },

  // Xóa feedback
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/private-feedbacks/${id}`);
  },

  // Lấy thống kê
  async getStats(userId?: string): Promise<StatsResponse> {
    const params = userId ? `?userId=${userId}` : '';
    const response = await apiClient.get(`/private-feedbacks/stats${params}`);
    return response as unknown as StatsResponse;
  },
};

