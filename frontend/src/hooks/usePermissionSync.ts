import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMyPermissions } from './useRules';
import { setCachedPermissions, clearCachedPermissions } from '../utils/permissions';

/**
 * Bridges React Query `myPermissions` cache into the global `cachedPermissions`
 * consumed by `can()`. Mounted as a child of AuthProvider so every refetch /
 * invalidate (Rule CRUD, WS USER_PROFILE_UPDATED) is reflected without re-login.
 * AuthContext itself does NOT import this — avoids circular dep.
 */
export function usePermissionSync(): void {
  const { isAuthenticated, user } = useAuth();
  const { data } = useMyPermissions({ enabled: isAuthenticated && !!user });

  useEffect(() => {
    if (data) setCachedPermissions(data as unknown as Array<{ resourceCode: string; action: string; allow: boolean }>);
  }, [data]);

  useEffect(() => {
    if (!isAuthenticated) clearCachedPermissions();
  }, [isAuthenticated]);
}
