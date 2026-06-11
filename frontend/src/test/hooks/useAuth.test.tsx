/**
 * Tests for useAuth hook (via AuthContext).
 *
 * useAuth is a React context hook — it must be consumed inside an AuthProvider.
 * AuthProvider calls AuthService.fetchMe() on mount (to refresh from server)
 * and opens a WebSocket. We mock both to keep tests fast and isolated.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';
import type { User } from '../../types/auth';
import { createTestQueryClient } from '../utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

const mockUser: User = {
  _id: 'user-001',
  username: 'nguyen.van.a',
  email: 'nguyen.van.a@example.com',
  firstName: 'An',
  lastName: 'Nguyễn Văn',
  role: UserRole.EMPLOYEE,
  department: 'production',
  departmentName: 'Bộ phận sản xuất',
  isActive: true,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
};

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock WebSocket so tests don't need a real WS server
const mockWsInstance = {
  onopen: null as (() => void) | null,
  onmessage: null as ((e: MessageEvent) => void) | null,
  onclose: null as (() => void) | null,
  onerror: null as (() => void) | null,
  readyState: WebSocket.CLOSED,
  close: vi.fn(),
};

vi.stubGlobal('WebSocket', vi.fn(() => mockWsInstance));

// Mock AuthService.fetchMe — normally calls /api/auth/me via apiClient
vi.mock('../../services/authService', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../services/authService')>();
  return {
    ...original,
    default: {
      ...original.default,
      fetchMe: vi.fn().mockResolvedValue(null),
      getCurrentUser: vi.fn().mockReturnValue(null),
      getAccessToken: vi.fn().mockReturnValue(null),
      logout: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('throws when used outside AuthProvider', () => {
    // renderHook without AuthProvider wrapper — useAuth should throw
    expect(() => {
      const { result } = renderHook(() => useAuth());
      return result;
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('returns isAuthenticated=false and user=null when no session exists', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('returns the stored user when localStorage has a valid session', async () => {
    // Pre-seed localStorage as AuthService.login() would
    localStorage.setItem('accessToken', 'mock-access-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    // getCurrentUser reads from localStorage; getAccessToken too
    const AuthService = (await import('../../services/authService')).default;
    vi.mocked(AuthService.getCurrentUser).mockReturnValue(mockUser);
    vi.mocked(AuthService.getAccessToken).mockReturnValue('mock-access-token');
    vi.mocked(AuthService.fetchMe).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('nguyen.van.a@example.com');
    expect(result.current.user?.role).toBe(UserRole.EMPLOYEE);
  });

  it('exposes login, logout, and updateUser functions', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper(queryClient),
    });

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.updateUser).toBe('function');
  });
});
