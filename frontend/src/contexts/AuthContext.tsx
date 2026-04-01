import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';
import AuthService from '../services/authService';
import { WS_BASE_URL } from '../config/api';

/** Notification payload pushed over WebSocket (mirrors backend WsNotificationPayload) */
export interface WsNotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

type NotificationListener = (notification: WsNotificationPayload) => void;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  /** Subscribe to real-time notifications via WebSocket. Returns an unsubscribe function. */
  subscribeToNotifications: (fn: NotificationListener) => () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── WebSocket refs (not state — must not trigger re-renders) ─────────────
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationListeners = useRef<Set<NotificationListener>>(new Set());
  // Flag: true while the user is intentionally logged out (skip reconnect)
  const isLoggedOutRef = useRef(false);

  /* ── WebSocket: connect ─────────────────────────────────────────────────── */

  const connectWebSocket = useCallback(() => {
    const token = AuthService.getAccessToken();
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.debug('[WS] Connected');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; payload?: unknown };

        if (msg.type === 'NOTIFICATION' && msg.payload) {
          const payload = msg.payload as WsNotificationPayload;
          notificationListeners.current.forEach((fn) => fn(payload));
        } else if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (event: CloseEvent) => {
      console.debug(`[WS] Closed (code=${event.code})`);

      // 4001 = auth failure (expired/invalid token) — do not retry
      // 1000 = normal close (logout) — do not retry
      if (event.code !== 1000 && event.code !== 4001 && !isLoggedOutRef.current) {
        reconnectTimerRef.current = setTimeout(connectWebSocket, 5000);
      }
    };

    ws.onerror = () => {
      // onclose fires right after onerror, so reconnect is handled there
    };
  }, []);

  /* ── WebSocket: disconnect ──────────────────────────────────────────────── */

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Logout');
      wsRef.current = null;
    }
  }, []);

  /* ── Cleanup on unmount ─────────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = () => {
      try {
        const currentUser = AuthService.getCurrentUser();
        const token = AuthService.getAccessToken();

        if (currentUser && token) {
          setUser(currentUser);
          isLoggedOutRef.current = false;
          connectWebSocket();
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [connectWebSocket]);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const authResponse = await AuthService.login(credentials);
      setUser(authResponse.user);
      isLoggedOutRef.current = false;
      connectWebSocket();
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const authResponse = await AuthService.register(userData);
      setUser(authResponse.user);
      isLoggedOutRef.current = false;
      connectWebSocket();
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      isLoggedOutRef.current = true;
      disconnectWebSocket();
      await AuthService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (userData: Partial<User>): void => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      AuthService.updateCurrentUser(userData);
    }
  };

  /**
   * Subscribe to real-time notifications pushed via WebSocket.
   * Returns an unsubscribe function — call it in your useEffect cleanup.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   return subscribeToNotifications((n) => console.log('New notification:', n));
   * }, [subscribeToNotifications]);
   * ```
   */
  const subscribeToNotifications = useCallback((fn: NotificationListener): (() => void) => {
    notificationListeners.current.add(fn);
    return () => {
      notificationListeners.current.delete(fn);
    };
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    subscribeToNotifications,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};