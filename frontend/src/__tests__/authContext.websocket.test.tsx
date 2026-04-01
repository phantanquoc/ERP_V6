/**
 * AuthContext — WebSocket Integration Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests cho phần WebSocket được tích hợp vào AuthContext:
 *   • connectWebSocket() được gọi khi login / initial auth check
 *   • disconnectWebSocket() được gọi khi logout
 *   • subscribeToNotifications() subscribe/unsubscribe đúng cách
 *   • WebSocket messages kích hoạt listeners
 *   • Auto-reconnect: có khi mất kết nối, không khi logout/auth fail
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, WsNotificationPayload, useAuth } from '../contexts/AuthContext';

/* ─────────────────────────────────────────────────────────────────────────────
   Mock WebSocket
   ───────────────────────────────────────────────────────────────────────────── */

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.OPEN;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn((code?: number, reason?: string) => {
    this.readyState = MockWebSocket.CLOSED;
    // Simulate close event
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code ?? 1000, reason }));
    }
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async connection open
    setTimeout(() => this.onopen?.(new Event('open')), 0);
  }

  /** Helper: simulate receiving a message from the server */
  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  /** Helper: simulate the server closing the connection */
  simulateClose(code = 1006, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Mock AuthService
   ───────────────────────────────────────────────────────────────────────────── */

const mockUser = {
  id: 'user-1',
  email: 'test@erp.com',
  name: 'Test User',
  role: 'EMPLOYEE' as const,
  department: 'general',
  employeeId: 'emp-1',
};

vi.mock('../services/authService', () => ({
  default: {
    login: vi.fn().mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'test@erp.com',
        name: 'Test User',
        role: 'EMPLOYEE',
        department: 'general',
        employeeId: 'emp-1',
      },
      accessToken: 'tok',
      refreshToken: 'ref',
    }),
    register: vi.fn().mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'test@erp.com',
        name: 'Test User',
        role: 'EMPLOYEE',
        department: 'general',
        employeeId: 'emp-1',
      },
      accessToken: 'tok',
      refreshToken: 'ref',
    }),
    logout: vi.fn().mockResolvedValue(undefined),
    getCurrentUser: vi.fn().mockReturnValue(null),
    getAccessToken: vi.fn().mockReturnValue('test-jwt-token'),
    updateCurrentUser: vi.fn(),
    isAuthenticated: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('../config/api', () => ({
  API_BASE_URL: 'http://localhost:5000/api',
  WS_BASE_URL: 'ws://localhost:5000',
}));

/* ─────────────────────────────────────────────────────────────────────────────
   Setup / Teardown
   ───────────────────────────────────────────────────────────────────────────── */

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

beforeEach(() => {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/* ─────────────────────────────────────────────────────────────────────────────
   Import AuthService for assertion after mocking
   ───────────────────────────────────────────────────────────────────────────── */

import AuthService from '../services/authService';

/* ─────────────────────────────────────────────────────────────────────────────
   Tests
   ───────────────────────────────────────────────────────────────────────────── */

describe('AuthContext — WebSocket Integration', () => {

  /* ── Initial auth check ─────────────────────────────────────────────────── */

  describe('connectWebSocket on initial auth check', () => {
    it('should NOT connect WebSocket if no user is already logged in', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue(null);

      renderHook(() => useAuth(), { wrapper });

      await act(async () => { vi.runAllTimers(); });

      expect(MockWebSocket.instances).toHaveLength(0);
    });

    it('should connect WebSocket if user is already logged in (page refresh)', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(mockUser);
      (AuthService.getAccessToken as Mock).mockReturnValue('existing-token');

      renderHook(() => useAuth(), { wrapper });

      await act(async () => { vi.runAllTimers(); });

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toContain('ws://localhost:5000/ws?token=');
      expect(MockWebSocket.instances[0].url).toContain('existing-token');
    });
  });

  /* ── Login ──────────────────────────────────────────────────────────────── */

  describe('connectWebSocket on login', () => {
    it('should open a WebSocket connection after successful login', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('new-token');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toContain('ws://localhost:5000/ws');
    });

    it('should NOT create duplicate WebSocket connections on re-login', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('token');

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Login once
      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      // The first WebSocket is OPEN, so re-login should not create another
      expect(MockWebSocket.instances[0].readyState).toBe(MockWebSocket.OPEN);
      const countBefore = MockWebSocket.instances.length;

      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      expect(MockWebSocket.instances.length).toBe(countBefore);
    });
  });

  /* ── Logout ─────────────────────────────────────────────────────────────── */

  describe('disconnectWebSocket on logout', () => {
    it('should close WebSocket with code 1000 on logout', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const ws = MockWebSocket.instances[0];

      await act(async () => {
        await result.current.logout();
      });

      expect(ws.close).toHaveBeenCalledWith(1000, 'Logout');
    });

    it('should NOT auto-reconnect after intentional logout', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const ws = MockWebSocket.instances[0];
      const countBefore = MockWebSocket.instances.length;

      await act(async () => {
        await result.current.logout();
        vi.advanceTimersByTime(10_000); // Fast-forward past 5s reconnect window
      });

      // close() on ws simulates onclose with code 1000 → no reconnect
      expect(MockWebSocket.instances.length).toBe(countBefore);
    });
  });

  /* ── subscribeToNotifications ───────────────────────────────────────────── */

  describe('subscribeToNotifications', () => {
    it('should call the listener when a NOTIFICATION message arrives', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      const listener = vi.fn();

      await act(async () => {
        result.current.subscribeToNotifications(listener);
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const ws = MockWebSocket.instances[0];

      const payload: WsNotificationPayload = {
        id: 'notif-1',
        type: 'TASK',
        title: 'Nhiệm vụ mới',
        message: 'Bạn có một nhiệm vụ',
        isRead: false,
        createdAt: new Date().toISOString(),
      };

      act(() => {
        ws.simulateMessage({ type: 'NOTIFICATION', payload });
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(payload);
    });

    it('should call multiple listeners when a notification arrives', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      await act(async () => {
        result.current.subscribeToNotifications(listener1);
        result.current.subscribeToNotifications(listener2);
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const ws = MockWebSocket.instances[0];

      act(() => {
        ws.simulateMessage({
          type: 'NOTIFICATION',
          payload: { id: 'n1', type: 'TASK', title: 'T', message: 'M', isRead: false, createdAt: '' },
        });
      });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should NOT call listener after unsubscribing', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      const listener = vi.fn();
      let unsubscribe: () => void;

      await act(async () => {
        unsubscribe = result.current.subscribeToNotifications(listener);
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      // Unsubscribe before the message arrives
      act(() => { unsubscribe(); });

      const ws = MockWebSocket.instances[0];
      act(() => {
        ws.simulateMessage({
          type: 'NOTIFICATION',
          payload: { id: 'n1', type: 'TASK', title: 'T', message: 'M', isRead: false, createdAt: '' },
        });
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should NOT call listener for non-NOTIFICATION message types', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      const listener = vi.fn();

      await act(async () => {
        result.current.subscribeToNotifications(listener);
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const ws = MockWebSocket.instances[0];

      act(() => {
        ws.simulateMessage({ type: 'PING' });
        ws.simulateMessage({ type: 'BROADCAST', payload: { msg: 'system' } });
        ws.simulateMessage({ type: 'SERVER_SHUTDOWN', payload: {} });
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should respond to PING with PONG', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const ws = MockWebSocket.instances[0];

      act(() => {
        ws.simulateMessage({ type: 'PING' });
      });

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PONG' }));
    });
  });

  /* ── Auto-reconnect ─────────────────────────────────────────────────────── */

  describe('auto-reconnect', () => {
    it('should auto-reconnect after unexpected disconnection (code 1006)', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const ws = MockWebSocket.instances[0];

      // Simulate unexpected disconnect (e.g. network drop)
      act(() => {
        ws.simulateClose(1006, 'Connection lost');
      });

      // Advance past the 5s reconnect timer
      await act(async () => {
        vi.advanceTimersByTime(6_000);
      });

      expect(MockWebSocket.instances.length).toBe(2);
    });

    it('should NOT auto-reconnect on auth failure (code 4001)', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const countBefore = MockWebSocket.instances.length;
      const ws = MockWebSocket.instances[0];

      act(() => { ws.simulateClose(4001, 'Invalid token'); });

      await act(async () => { vi.advanceTimersByTime(10_000); });

      expect(MockWebSocket.instances.length).toBe(countBefore);
    });
  });

  /* ── Malformed messages ─────────────────────────────────────────────────── */

  describe('malformed message handling', () => {
    it('should ignore non-JSON messages without throwing', async () => {
      (AuthService.getCurrentUser as Mock).mockReturnValue(null);
      (AuthService.getAccessToken as Mock).mockReturnValue('tok');

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login({ email: 'test@erp.com', password: 'password' });
        vi.runAllTimers();
      });

      const ws = MockWebSocket.instances[0];

      expect(() => {
        act(() => {
          ws.onmessage?.(new MessageEvent('message', { data: 'not valid json!!!' }));
        });
      }).not.toThrow();
    });
  });
});
