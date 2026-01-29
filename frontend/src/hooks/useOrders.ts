import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';

// Query keys for cache management
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  count: () => [...orderKeys.all, 'count'] as const,
};

interface OrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  customerType?: string;
  status?: string;
}

// Hook to get all orders with filters
export const useOrders = (filters: OrderFilters = {}) => {
  const { page = 1, limit = 10, search, customerType, status } = filters;
  
  return useQuery({
    queryKey: orderKeys.list({ page, limit, search, customerType, status }),
    queryFn: () => orderService.getAllOrders(page, limit, search, customerType),
  });
};

// Hook to get orders count
export const useOrdersCount = (customerType?: string) => {
  return useQuery({
    queryKey: [...orderKeys.count(), customerType],
    queryFn: async () => {
      const response = await orderService.getAllOrders(1, 1, undefined, customerType);
      return response.pagination.total;
    },
    staleTime: 2 * 60 * 1000,
  });
};

// Hook to get a single order by ID
export const useOrder = (id: string) => {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderService.getOrderById(id),
    enabled: !!id,
  });
};

// Hook to create order
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: orderService.createOrderFromQuotation.bind(orderService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.count() });
    },
  });
};

// Hook to update order
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      orderService.updateOrder(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
    },
  });
};

// Hook to delete order
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: orderService.deleteOrder.bind(orderService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.count() });
    },
  });
};

