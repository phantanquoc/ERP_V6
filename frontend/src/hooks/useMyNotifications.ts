import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, {
  MyNotificationsParams,
  MyNotificationsStatsParams,
  MyNotificationsResponse,
  MyNotificationsStats,
  AppNotification,
} from '../services/notificationService';

// ---- Query key factory --------------------------------------------------

export const myNotificationsKeys = {
  all: ['my-notifications'] as const,
  lists: () => [...myNotificationsKeys.all, 'list'] as const,
  list: (params: MyNotificationsParams) => [...myNotificationsKeys.lists(), params] as const,
  statsList: () => [...myNotificationsKeys.all, 'stats'] as const,
  stats: (params: MyNotificationsStatsParams) => [...myNotificationsKeys.statsList(), params] as const,
};

// Existing notifications unread-count query key (shared with NotificationBell)
const UNREAD_COUNT_KEY = ['notifications', 'unreadCount'] as const;

// ---- Queries ------------------------------------------------------------

export function useMyNotificationsList(params: MyNotificationsParams) {
  return useQuery<MyNotificationsResponse>({
    queryKey: myNotificationsKeys.list(params),
    queryFn: () => notificationService.getMyNotifications(params),
    placeholderData: (prev) => prev, // TanStack v5 equivalent of keepPreviousData
    staleTime: 30_000,
  });
}

export function useMyNotificationsStats(params: MyNotificationsStatsParams) {
  return useQuery<MyNotificationsStats>({
    queryKey: myNotificationsKeys.stats(params),
    queryFn: () => notificationService.getMyNotificationsStats(params),
    staleTime: 60_000,
  });
}

// ---- Mutations ----------------------------------------------------------

/**
 * Optimistically mark a single notification as read.
 * - On mutate: snapshot cache, set isRead=true on matching list item.
 * - On error: rollback cache.
 * - On success: invalidate all my-notifications queries + unread-count badge.
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation<AppNotification, Error, string, { previousData: unknown }>({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: myNotificationsKeys.all });

      // Snapshot all matching list queries
      const previousData = queryClient.getQueriesData({ queryKey: myNotificationsKeys.lists() });

      // Optimistically update every cached list
      queryClient.setQueriesData<MyNotificationsResponse>(
        { queryKey: myNotificationsKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === notificationId ? { ...item, isRead: true } : item
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _notificationId, context) => {
      // Rollback
      if (context?.previousData) {
        const entries = context.previousData as [unknown, unknown][];
        entries.forEach(([key, value]) => {
          queryClient.setQueryData(key as readonly unknown[], value);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myNotificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

/**
 * Mark all notifications as read.
 * Invalidates list + stats + unread-count on success.
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myNotificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

/**
 * Optimistically delete a notification.
 * - On mutate: snapshot cache, remove item from list.
 * - On error: rollback cache.
 * - On success: invalidate list + stats + unread-count.
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, { previousData: unknown }>({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: myNotificationsKeys.all });

      const previousData = queryClient.getQueriesData({ queryKey: myNotificationsKeys.lists() });

      queryClient.setQueriesData<MyNotificationsResponse>(
        { queryKey: myNotificationsKeys.lists() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((item) => item.id !== notificationId),
            total: Math.max(0, old.total - 1),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _notificationId, context) => {
      if (context?.previousData) {
        const entries = context.previousData as [unknown, unknown][];
        entries.forEach(([key, value]) => {
          queryClient.setQueryData(key as readonly unknown[], value);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myNotificationsKeys.all });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
