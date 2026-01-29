import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import internationalCustomerService from '../services/internationalCustomerService';

// Query keys for cache management
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
};

interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  customerType?: string;
}

// Hook to get all customers with filters
export const useCustomers = (filters: CustomerFilters = {}) => {
  const { page = 1, limit = 100, search = '', customerType } = filters;
  
  return useQuery({
    queryKey: customerKeys.list({ page, limit, search, customerType }),
    queryFn: () => internationalCustomerService.getAllCustomers(page, limit, search, customerType),
  });
};

// Hook to get international customers
export const useInternationalCustomers = (page = 1, limit = 100, search = '') => {
  return useCustomers({ page, limit, search, customerType: 'Quốc tế' });
};

// Hook to get domestic customers
export const useDomesticCustomers = (page = 1, limit = 100, search = '') => {
  return useCustomers({ page, limit, search, customerType: 'Nội địa' });
};

// Hook to get a single customer by ID
export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => internationalCustomerService.getCustomerById(id),
    enabled: !!id,
  });
};

// Hook to create customer
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: internationalCustomerService.createCustomer.bind(internationalCustomerService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
};

// Hook to update customer
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      internationalCustomerService.updateCustomer(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
};

// Hook to delete customer
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: internationalCustomerService.deleteCustomer.bind(internationalCustomerService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
};

