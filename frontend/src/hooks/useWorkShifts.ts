import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

export interface WorkShift {
  id: string;
  name: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const workShiftKeys = {
  all: ['work-shifts'] as const,
  lists: () => [...workShiftKeys.all, 'list'] as const,
  list: () => [...workShiftKeys.lists()] as const,
};

const extractData = (response: any): WorkShift[] => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

export function useWorkShifts(enabled = true) {
  return useQuery({
    queryKey: workShiftKeys.list(),
    queryFn: async () => {
      const response = await apiClient.get('/work-shifts');
      const all: WorkShift[] = extractData(response);
      return all.filter(s => s.isActive);
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
