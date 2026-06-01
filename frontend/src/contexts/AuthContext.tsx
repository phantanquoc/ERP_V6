import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { User, LoginRequest, RegisterRequest } from '../types/auth';
import AuthService from '../services/authService';
import { WS_BASE_URL } from '../config/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  wsConnected: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  /* ── WebSocket lifecycle ─────────────────────────────────────────────────── */

  const connectWs = useCallback((token: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Close stale connection if exists
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'NOTIFICATION') {
          if (msg.payload?.type === 'USER_PROFILE_UPDATED') {
            AuthService.fetchMe().then(fresh => {
              if (fresh) setUser(fresh);
            }).catch(() => {});
          } else {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            window.dispatchEvent(new CustomEvent('ws-notification', { detail: msg.payload }));
          }
        } else if (msg.type === 'FORCE_LOGOUT') {
          disconnectWs();
          AuthService.logout().then(() => setUser(null));
        }
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      setWsConnected(false);
      if (wsRef.current === ws) wsRef.current = null;
      // Auto-reconnect after 5s if still logged in
      const currentToken = AuthService.getAccessToken();
      if (currentToken) {
        reconnectTimerRef.current = setTimeout(() => connectWs(currentToken), 5000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [queryClient]);

  const disconnectWs = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close(1000, 'Logout');
      wsRef.current = null;
    }
    setWsConnected(false);
  }, []);

  // Connect WS when user is set, disconnect when null
  useEffect(() => {
    const token = AuthService.getAccessToken();
    if (user && token) {
      connectWs(token);
    } else {
      disconnectWs();
    }
    return () => disconnectWs();
  }, [user?.id, connectWs, disconnectWs]);

  // Reconnect on tab focus
  useEffect(() => {
    const onFocus = () => {
      const token = AuthService.getAccessToken();
      if (token && user && wsRef.current?.readyState !== WebSocket.OPEN) {
        connectWs(token);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id, connectWs]);

  /* ── Auth state ──────────────────────────────────────────────────────────── */

  const refreshProfile = useCallback(async () => {
    try {
      const freshUser = await AuthService.fetchMe();
      if (freshUser) setUser(freshUser);
    } catch { /* silent — network errors are non-fatal */ }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = AuthService.getCurrentUser();
        const token = AuthService.getAccessToken();

        if (currentUser && token) {
          setUser(currentUser);
          // Refresh from server in background to pick up any changes
          AuthService.fetchMe().then(fresh => {
            if (fresh) setUser(fresh);
          }).catch(() => {});
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Refresh profile when tab regains focus
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        refreshProfile();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [user?.id, refreshProfile]);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const authResponse = await AuthService.login(credentials);
      setUser(authResponse.user);
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
      disconnectWs();
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

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    wsConnected,
    login,
    register,
    logout,
    updateUser,
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