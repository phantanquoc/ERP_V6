import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_URL = `${API_BASE_URL}/private-feedbacks`;

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

// Helper function to get auth header
const getAuthHeader = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};

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

    const response = await axios.get(`${API_URL}?${params.toString()}`, getAuthHeader());
    return response.data;
  },

  // Lấy feedback theo ID
  async getById(id: string): Promise<SingleResponse> {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
  },

  // Lấy feedback theo code
  async getByCode(code: string): Promise<SingleResponse> {
    const response = await axios.get(`${API_URL}/code/${code}`, getAuthHeader());
    return response.data;
  },

  // Tạo mã tự động
  async generateCode(type: FeedbackType): Promise<GenerateCodeResponse> {
    const response = await axios.post(`${API_URL}/generate-code`, { type }, getAuthHeader());
    return response.data;
  },

  // Tạo feedback mới
  async create(data: CreatePrivateFeedbackData): Promise<SingleResponse> {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
  },

  // Cập nhật feedback
  async update(id: string, data: UpdatePrivateFeedbackData): Promise<SingleResponse> {
    const response = await axios.patch(`${API_URL}/${id}`, data, getAuthHeader());
    return response.data;
  },

  // Xóa feedback
  async delete(id: string): Promise<void> {
    await axios.delete(`${API_URL}/${id}`, getAuthHeader());
  },

  // Lấy thống kê
  async getStats(userId?: string): Promise<StatsResponse> {
    const params = userId ? `?userId=${userId}` : '';
    const response = await axios.get(`${API_URL}/stats${params}`, getAuthHeader());
    return response.data;
  },
};

