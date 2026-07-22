import { useQuery } from '@tanstack/react-query';
import attendedOperatorsService from '../services/attendedOperatorsService';

export const attendedOperatorsKeys = {
  all: ['attendedOperators'] as const,
  byShift: (date: string, shift: number, pageKey: string) =>
    [...attendedOperatorsKeys.all, 'byShift', date, shift, pageKey] as const,
};

export const useAttendedOperatorsByShift = (
  date: string,
  shift: number | null,
  pageKey: string
) => {
  return useQuery({
    queryKey: attendedOperatorsKeys.byShift(
      date,
      shift ?? 0,
      pageKey
    ),
    queryFn: () =>
      attendedOperatorsService.getAttendedOperators(
        date,
        shift!,
        pageKey
      ),
    enabled: !!shift && !!pageKey && !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
