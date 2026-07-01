import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, {
  NotificationPreference,
  NotificationPreferenceItem,
} from '../services/notificationService';
import { myNotificationsKeys } from './useMyNotifications';

// ---- Query key factory --------------------------------------------------

export const notificationPreferencesKeys = {
  all: ['notification-preferences'] as const,
  lists: () => [...notificationPreferencesKeys.all, 'list'] as const,
};

// ---- Queries ------------------------------------------------------------

export function useNotificationPreferences() {
  return useQuery<NotificationPreference[]>({
    queryKey: notificationPreferencesKeys.lists(),
    queryFn: () => notificationService.getNotificationPreferences(),
    staleTime: 60_000,
  });
}

// ---- Mutations ----------------------------------------------------------

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation<NotificationPreference[], Error, NotificationPreferenceItem[]>({
    mutationFn: (items: NotificationPreferenceItem[]) =>
      notificationService.updateNotificationPreferences(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationPreferencesKeys.lists() });
      // Also invalidate notification stats and unread counts in case the UI shows them
      queryClient.invalidateQueries({ queryKey: myNotificationsKeys.statsList() });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });
}
