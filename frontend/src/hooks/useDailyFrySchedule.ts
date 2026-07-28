import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScheduledBatch {
  code: string;
  sequence: number;
  shift: number;
  startTime: { hour: number; minute: number };
  ngaySanXuat: string;
  isNextCalendarDay: boolean;
}

// ─── Query Key Factory ───────────────────────────────────────────────────────

export const dailyScheduleKeys = {
  all: ['dailySchedule'] as const,
  lists: () => [...dailyScheduleKeys.all, 'list'] as const,
  list: (productionDay: string, shift?: number) =>
    [...dailyScheduleKeys.lists(), { productionDay, shift }] as const,
};

// ─── Service Function ────────────────────────────────────────────────────────

async function fetchDailySchedule(
  productionDay: string,
  shift?: number,
): Promise<ScheduledBatch[]> {
  const params: Record<string, any> = { productionDay };
  if (shift != null) params.shift = shift;
  const response = await apiClient.get<{ productionDay: string; schedule: ScheduledBatch[] }>(
    '/material-evaluations/schedule',
    { params },
  );
  return (response.data as any).schedule ?? [];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Fetches the daily fry-batch schedule for a production day, optionally filtered by shift.
 * Returns 16 entries (or the shift subset) of scheduled batch codes.
 */
export function useDailyFrySchedule(productionDay: string, shift?: number) {
  return useQuery<ScheduledBatch[]>({
    queryKey: dailyScheduleKeys.list(productionDay, shift),
    queryFn: () => fetchDailySchedule(productionDay, shift),
    enabled: !!productionDay,
    staleTime: 5 * 60 * 1000, // schedule is static per day, cache 5 min
  });
}
