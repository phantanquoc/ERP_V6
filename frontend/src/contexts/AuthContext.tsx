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
    // Chỉ skip nếu đang OPEN (readyState=1). CONNECTING(0)/CLOSING(2)/CLOSED(3) → tạo mới
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) return;

    // Đóng connection cũ nếu đang CONNECTING/CLOSING trước khi tạo mới
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.onclose = null; // tắt handler cũ để không trigger reconnect loop
      wsRef.current.close();
    }
    wsRef.current = null;

    const ws = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.debug('[WS] Connected');
      // Subscribe to personal notifications so the server starts pushing them to us.
      // Without this message the server may only broadcast system-wide events but not
      // user-specific notifications (OVERTIME_PLAN, TASK, LEAVE_REQUEST, etc.).
      ws.send(JSON.stringify({ type: 'SUBSCRIBE_NOTIFICATIONS' }));
      console.debug('[WS] SUBSCRIBE_NOTIFICATIONS sent');
      // Sau khi reconnect, re-fetch các system settings để cập nhật giá trị lỡ bị missed
      // trong khoảng thời gian WS bị disconnect
      window.dispatchEvent(new CustomEvent('wsReconnected'));
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; payload?: unknown };

        if (msg.type === 'NOTIFICATION' && msg.payload) {
          const payload = msg.payload as WsNotificationPayload;
          console.debug('[WS] NOTIFICATION received:', payload.type, payload.title);
          notificationListeners.current.forEach((fn) => fn(payload));
        } else if (msg.type === 'BROADCAST' && msg.payload) {
          // System-wide broadcasts — dispatch as custom events so any component can listen
          const broadcastPayload = msg.payload as Record<string, unknown>;
          if (broadcastPayload.type === 'SYSTEM_BANNER_CHANGED') {
            window.dispatchEvent(
              new CustomEvent('systemBannerChanged', { detail: broadcastPayload.value })
            );
          } else if (broadcastPayload.type === 'SYSTEM_SLOGAN_CHANGED') {
            window.dispatchEvent(
              new CustomEvent('systemSloganChanged', { detail: broadcastPayload.value })
            );
          } else if (broadcastPayload.type === 'OVERTIME_PLAN_CHANGED') {
            // Any overtime plan was created/approved — refresh all open overtime modals
            console.debug('[WS] BROADCAST: OVERTIME_PLAN_CHANGED');
            window.dispatchEvent(new CustomEvent('overtimePlanChanged'));
          }
        } else if (msg.type === 'FORCE_LOGOUT') {
          // Bị đẩy ra do login từ thiết bị/IP khác
          const reason = (msg.payload as Record<string, string>)?.reason || 'Tài khoản đã đăng nhập từ thiết bị khác';
          console.warn('[WS] FORCE_LOGOUT received:', reason);
          alert(reason);
          isLoggedOutRef.current = true;
          disconnectWebSocket();
          AuthService.logout().catch(() => {});
          setUser(null);
        } else if (msg.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (event: CloseEvent) => {
      console.debug(`[WS] Closed (code=${event.code})`);
      // Reset ref để connectWebSocket biết cần tạo mới
      if (wsRef.current === ws) wsRef.current = null;

      // 4001 = auth failure (expired/invalid token) — do not retry
      // 1000 = normal close (logout) — do not retry
      if (event.code !== 1000 && event.code !== 4001 && !isLoggedOutRef.current) {
        reconnectTimerRef.current = setTimeout(connectWebSocket, 5000);
      }
    };

    ws.onerror = (event) => {
      console.warn('[WS] Error — onclose will fire next', event);
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

  /* ── Reconnect khi tab được focus lại (sau docker restart / network hiccup) ── */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoggedOutRef.current) {
        connectWebSocket();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [connectWebSocket]);

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