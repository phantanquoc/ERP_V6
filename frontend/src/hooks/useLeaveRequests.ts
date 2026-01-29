import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import leaveRequestService, { LeaveRequest, CreateLeaveRequestData } from '../services/leaveRequestService';

// Query keys for cache management
export const leaveRequestKeys = {
  all: ['leaveRequests'] as const,
  lists: () => [...leaveRequestKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...leaveRequestKeys.lists(), filters] as const,
  details: () => [...leaveRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...leaveRequestKeys.details(), id] as const,
  my: () => [...leaveRequestKeys.all, 'my'] as const,
  myList: (filters: Record<string, any>) => [...leaveRequestKeys.my(), filters] as const,
};

interface LeaveRequestFilters {
  page?: number;
  limit?: number;
  status?: string;
}

// Hook to get all leave requests with filters
export const useLeaveRequests = (filters: LeaveRequestFilters = {}) => {
  const { page = 1, limit = 10, status } = filters;
  
  return useQuery({
    queryKey: leaveRequestKeys.list({ page, limit, status }),
    queryFn: () => leaveRequestService.getAllLeaveRequests({ page, limit, status }),
  });
};

// Hook to get my leave requests
export const useMyLeaveRequests = (filters: LeaveRequestFilters = {}) => {
  const { page = 1, limit = 10, status } = filters;
  
  return useQuery({
    queryKey: leaveRequestKeys.myList({ page, limit, status }),
    queryFn: () => leaveRequestService.getMyLeaveRequests({ page, limit, status }),
  });
};

// Hook to get a single leave request by ID
export const useLeaveRequest = (id: string) => {
  return useQuery({
    queryKey: leaveRequestKeys.detail(id),
    queryFn: () => leaveRequestService.getLeaveRequestById(id),
    enabled: !!id,
  });
};

// Hook to create leave request
export const useCreateLeaveRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateLeaveRequestData) => leaveRequestService.createLeaveRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.my() });
    },
  });
};

// Hook to approve leave request
export const useApproveLeaveRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, approverId }: { id: string; approverId: string }) => 
      leaveRequestService.approveLeaveRequest(id, approverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.my() });
    },
  });
};

// Hook to reject leave request
export const useRejectLeaveRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, approverId, reason }: { id: string; approverId: string; reason: string }) => 
      leaveRequestService.rejectLeaveRequest(id, approverId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.my() });
    },
  });
};

