import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quotationService } from '../services/quotationService';
import { quotationRequestService } from '../services/quotationRequestService';

// Query keys for quotations
export const quotationKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...quotationKeys.lists(), filters] as const,
  details: () => [...quotationKeys.all, 'detail'] as const,
  detail: (id: string) => [...quotationKeys.details(), id] as const,
  count: () => [...quotationKeys.all, 'count'] as const,
};

// Query keys for quotation requests
export const quotationRequestKeys = {
  all: ['quotationRequests'] as const,
  lists: () => [...quotationRequestKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...quotationRequestKeys.lists(), filters] as const,
  details: () => [...quotationRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...quotationRequestKeys.details(), id] as const,
  count: () => [...quotationRequestKeys.all, 'count'] as const,
};

interface QuotationFilters {
  page?: number;
  limit?: number;
  search?: string;
  customerType?: string;
}

// Hook to get all quotations with filters
export const useQuotations = (filters: QuotationFilters = {}) => {
  const { page = 1, limit = 10, search, customerType } = filters;
  
  return useQuery({
    queryKey: quotationKeys.list({ page, limit, search, customerType }),
    queryFn: () => quotationService.getAllQuotations(page, limit, search, customerType),
  });
};

// Hook to get quotations count
export const useQuotationsCount = (customerType?: string) => {
  return useQuery({
    queryKey: [...quotationKeys.count(), customerType],
    queryFn: async () => {
      const response = await quotationService.getAllQuotations(1, 1, undefined, customerType);
      return response.pagination.total;
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Hook to get a single quotation by ID
export const useQuotation = (id: string) => {
  return useQuery({
    queryKey: quotationKeys.detail(id),
    queryFn: () => quotationService.getQuotationById(id),
    enabled: !!id,
  });
};

// Hook to create quotation
export const useCreateQuotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: quotationService.createQuotation.bind(quotationService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationKeys.count() });
    },
  });
};

// Hook to update quotation
export const useUpdateQuotation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      quotationService.updateQuotation(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: quotationKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: quotationKeys.lists() });
    },
  });
};

// ============ QUOTATION REQUESTS ============

// Hook to get all quotation requests with filters
export const useQuotationRequests = (filters: QuotationFilters = {}) => {
  const { page = 1, limit = 10, search, customerType } = filters;
  
  return useQuery({
    queryKey: quotationRequestKeys.list({ page, limit, search, customerType }),
    queryFn: () => quotationRequestService.getAllQuotationRequests(page, limit, search, customerType),
  });
};

// Hook to get quotation requests count
export const useQuotationRequestsCount = (customerType?: string) => {
  return useQuery({
    queryKey: [...quotationRequestKeys.count(), customerType],
    queryFn: async () => {
      const response = await quotationRequestService.getAllQuotationRequests(1, 1, undefined, customerType);
      return response.pagination.total;
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Hook to get a single quotation request by ID
export const useQuotationRequest = (id: string) => {
  return useQuery({
    queryKey: quotationRequestKeys.detail(id),
    queryFn: () => quotationRequestService.getQuotationRequestById(id),
    enabled: !!id,
  });
};

// Hook to create quotation request
export const useCreateQuotationRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: quotationRequestService.createQuotationRequest.bind(quotationRequestService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationRequestKeys.count() });
    },
  });
};

// Hook to update quotation request
export const useUpdateQuotationRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      quotationRequestService.updateQuotationRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: quotationRequestKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: quotationRequestKeys.lists() });
    },
  });
};

