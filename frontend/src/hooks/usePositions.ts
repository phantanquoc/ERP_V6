import { useQuery } from '@tanstack/react-query';
import positionService from '../services/positionService';

// Query keys for cache management
export const positionKeys = {
  all: ['positions'] as const,
  lists: () => [...positionKeys.all, 'list'] as const,
  details: () => [...positionKeys.all, 'detail'] as const,
  detail: (id: string) => [...positionKeys.details(), id] as const,
  levels: () => [...positionKeys.all, 'levels'] as const,
  levelsByPosition: (positionId: string) => [...positionKeys.levels(), positionId] as const,
};

// Hook to get all positions
export const usePositions = () => {
  return useQuery({
    queryKey: positionKeys.lists(),
    queryFn: () => positionService.getAllPositions(),
    // Positions rarely change, cache for longer
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Hook to get position levels by position ID
export const usePositionLevelsByPosition = (positionId: string) => {
  return useQuery({
    queryKey: positionKeys.levelsByPosition(positionId),
    queryFn: () => positionService.getPositionLevelsByPosition(positionId),
    enabled: !!positionId,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

