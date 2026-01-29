import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { privateFeedbackService } from '../services/privateFeedbackService';
import customerFeedbackService from '../services/customerFeedbackService';

// Query keys for private feedback
export const privateFeedbackKeys = {
  all: ['privateFeedback'] as const,
  lists: () => [...privateFeedbackKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...privateFeedbackKeys.lists(), filters] as const,
  details: () => [...privateFeedbackKeys.all, 'detail'] as const,
  detail: (id: string) => [...privateFeedbackKeys.details(), id] as const,
  stats: () => [...privateFeedbackKeys.all, 'stats'] as const,
};

// Query keys for customer feedback
export const customerFeedbackKeys = {
  all: ['customerFeedback'] as const,
  lists: () => [...customerFeedbackKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...customerFeedbackKeys.lists(), filters] as const,
  details: () => [...customerFeedbackKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerFeedbackKeys.details(), id] as const,
};

interface FeedbackFilters {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  userId?: string;
}

// ============ PRIVATE FEEDBACK ============

// Hook to get all private feedbacks with filters
export const usePrivateFeedbacks = (filters: FeedbackFilters = {}) => {
  const { page = 1, limit = 10, ...rest } = filters;
  
  return useQuery({
    queryKey: privateFeedbackKeys.list({ page, limit, ...rest }),
    queryFn: () => privateFeedbackService.getAll({ page, limit, ...rest }),
  });
};

// Hook to get private feedback stats (for dashboard)
export const usePrivateFeedbackStats = () => {
  return useQuery({
    queryKey: privateFeedbackKeys.stats(),
    queryFn: () => privateFeedbackService.getStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to get a single private feedback by ID
export const usePrivateFeedback = (id: string) => {
  return useQuery({
    queryKey: privateFeedbackKeys.detail(id),
    queryFn: () => privateFeedbackService.getById(id),
    enabled: !!id,
  });
};

// Hook to create private feedback
export const useCreatePrivateFeedback = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: privateFeedbackService.create.bind(privateFeedbackService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: privateFeedbackKeys.lists() });
      queryClient.invalidateQueries({ queryKey: privateFeedbackKeys.stats() });
    },
  });
};

// Hook to update private feedback
export const useUpdatePrivateFeedback = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      privateFeedbackService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: privateFeedbackKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: privateFeedbackKeys.lists() });
      queryClient.invalidateQueries({ queryKey: privateFeedbackKeys.stats() });
    },
  });
};

// ============ CUSTOMER FEEDBACK ============

interface CustomerFeedbackFilters {
  trangThaiXuLy?: string;
  loaiPhanHoi?: string;
  mucDoNghiemTrong?: string;
  search?: string;
  customerType?: string;
}

// Hook to get all customer feedbacks with filters
export const useCustomerFeedbacks = (filters: CustomerFeedbackFilters = {}) => {
  return useQuery({
    queryKey: customerFeedbackKeys.list(filters),
    queryFn: () => customerFeedbackService.getAllFeedbacks(filters),
  });
};

// Hook to get a single customer feedback by ID
export const useCustomerFeedback = (id: string) => {
  return useQuery({
    queryKey: customerFeedbackKeys.detail(id),
    queryFn: () => customerFeedbackService.getFeedbackById(id),
    enabled: !!id,
  });
};

// Hook to create customer feedback
export const useCreateCustomerFeedback = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: customerFeedbackService.createFeedback.bind(customerFeedbackService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerFeedbackKeys.lists() });
    },
  });
};

// Hook to update customer feedback
export const useUpdateCustomerFeedback = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      customerFeedbackService.updateFeedback(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerFeedbackKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerFeedbackKeys.lists() });
    },
  });
};

