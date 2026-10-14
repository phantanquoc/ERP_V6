/**
 * API Client for making HTTP requests to the backend
 * Handles authentication, token refresh, error handling, and FormData uploads
 */

import AuthService from './authService';
import { API_BASE_URL } from '../config/api';
import { isKioskTab, getDeviceKey, getSelection, KIOSK_EXPIRED_EVENT } from '../utils/kioskSession';

/**
 * Custom error class that preserves HTTP status code
 */
export class ApiError extends Error {
  public statusCode: number;
  /**
   * Parsed error response body, when the server sent one.
   *
   * Some endpoints flatten machine-readable detail alongside `message` that callers
   * need in order to react (e.g. the shared-lookup 409 carries
   * `{ requiresConfirmation, oldLabel, newLabel, affectedRecords }` to drive a cascade
   * confirmation dialog). Optional and purely additive — callers that only read
   * `statusCode`/`message` are unaffected.
   */
  public body?: unknown;

  constructor(statusCode: number, message: string, body?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.body = body;
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  responseType?: string;
  /** When true, a 401 in kiosk tab will NOT dispatch KIOSK_EXPIRED_EVENT */
  skipKioskExpiry?: boolean;
}

// ── Anti-spam: in-flight dedup + per-endpoint cooldown ───────────────
// Prevents double-submit when user double-clicks or spams Enter.
// - In-flight: identical POST/PUT/PATCH to same endpoint is dropped (409 locally)
// - Cooldown: same endpoint blocked for 400ms after a write (covers race before isPending flips)
const inflightKeys = new Set<string>();
const cooldownUntil = new Map<string, number>();
const COOLDOWN_MS = 400;

function writeKey(method: string, endpoint: string): string {
  return `${method}:${endpoint.split('?')[0]}`;
}

function genIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get authorization headers.
   * In kiosk mode: sends x-device-key + x-operator-id (no Authorization).
   * In desktop mode: sends Authorization Bearer token.
   */
  private getAuthHeader(): Record<string, string> {
    if (isKioskTab()) {
      const deviceKey = getDeviceKey();
      const selection = getSelection();
      if (deviceKey) {
        // Kiosk activated — device key auth only
        const headers: Record<string, string> = { 'x-device-key': deviceKey };
        if (selection?.operatorId) headers['x-operator-id'] = selection.operatorId;
        return headers;
      }
      // Kiosk tab not yet activated — fallback to JWT so admin can
      // call authenticated endpoints (e.g. register a new device)
      const token = localStorage.getItem('accessToken');
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    const token = localStorage.getItem('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Build full URL with query params
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== null && value !== '')
          .map(([key, value]) => [key, String(value)])
      ).toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return url;
  }

  /**
   * Make HTTP request with automatic token refresh
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint, options.params);

    // ── anti-spam guard for write methods ──────────────────────
    const method = (options.method ?? 'GET').toUpperCase();
    const isWrite = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
    const wKey = writeKey(method, endpoint);
    if (isWrite) {
      const until = cooldownUntil.get(wKey);
      if (until && Date.now() < until) {
        throw new ApiError(429, 'Thao tác quá nhanh, vui lòng thử lại sau giây lát');
      }
      if (inflightKeys.has(wKey)) {
        throw new ApiError(429, 'Yêu cầu đang xử lý, vui lòng đợi');
      }
      inflightKeys.add(wKey);
    }

    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...this.getAuthHeader(),
      ...options.headers,
    };

    // Idempotency-Key for POST so backend can dedup even when frontend guard is bypassed
    if (isWrite && method === 'POST' && !headers['Idempotency-Key'] && !headers['idempotency-key']) {
      headers['Idempotency-Key'] = genIdempotencyKey();
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers,
      });

      // If 401, try to refresh token and retry
      if (response.status === 401) {
        // Kiosk route detection: public kiosk routes under /production/nhap-lieu*
        const isKioskRoute = window.location.pathname.startsWith('/production/nhap-lieu');

        if (isKioskRoute && isKioskTab()) {
          if (options.skipKioskExpiry) {
            // JWT-only call inside kiosk tab — do NOT treat as device expiry
            throw new Error('Unauthorized');
          }
          // Kiosk mode: device key is invalid/expired — signal UI
          window.dispatchEvent(new CustomEvent(KIOSK_EXPIRED_EVENT));
          throw new Error('Kiosk session expired.');
        } else {
          // Normal ERP tab or non-kiosk route: existing behavior
          const newToken = await AuthService.refreshToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
            response = await fetch(url, {
              ...options,
              headers,
            });
          } else {
            window.location.href = '/login';
            throw new Error('Session expired. Please login again.');
          }
        }
      }

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        let errorMessage = data.message || `HTTP ${response.status}`;
        if (data.error && typeof data.error === 'object') {
          const fieldErrors = Object.entries(data.error as Record<string, string>)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('; ');
          if (fieldErrors) errorMessage = fieldErrors;
        }
        throw new ApiError(response.status, errorMessage, data);
      }

      return data;
    } catch (error: any) {
      // Abort/Cancel là hành vi có chủ đích (StrictMode double-mount, đổi filter/page)
      // — không log như lỗi để tránh flood console và làm nhiễu lỗi thật.
      const isAbort =
        error?.name === 'AbortError' ||
        error?.name === 'CanceledError' ||
        error?.code === 'ERR_CANCELED' ||
        (typeof error?.message === 'string' && error.message.toLowerCase().includes('aborted'));
      if (isAbort) throw error;
      // Expected probe 404s when deep-link resolves YCSC vs YCKT across tables — don't spam console
      const isExpected404 =
        error instanceof ApiError &&
        error.statusCode === 404 &&
        endpoint.startsWith('/inspection-requests/');
      if (isExpected404) throw error;
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    } finally {
      if (isWrite) {
        inflightKeys.delete(wKey);
        cooldownUntil.set(wKey, Date.now() + COOLDOWN_MS);
        setTimeout(() => {
          const u = cooldownUntil.get(wKey);
          if (u && Date.now() >= u) cooldownUntil.delete(wKey);
        }, COOLDOWN_MS + 50);
      }
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request (JSON or FormData)
   */
  async post<T>(
    endpoint: string,
    body?: Record<string, any> | FormData,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * PATCH request (JSON or FormData)
   */
  async patch<T>(
    endpoint: string,
    body?: Record<string, any> | FormData,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * PUT request (JSON or FormData)
   */
  async put<T>(
    endpoint: string,
    body?: Record<string, any> | FormData,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Download a file with authentication. Fetches the endpoint with the auth header,
   * converts the response to a blob, and triggers a browser download.
   * If filename is omitted, it is parsed from the Content-Disposition header.
   */
  async download(endpoint: string, fallbackFilename?: string): Promise<void> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      ...this.getAuthHeader(),
    };

    let response = await fetch(url, { method: 'GET', headers });

    if (response.status === 401) {
      if (isKioskTab()) {
        window.dispatchEvent(new CustomEvent(KIOSK_EXPIRED_EVENT));
        throw new Error('Kiosk session expired.');
      } else {
        const newToken = await AuthService.refreshToken();
        if (newToken) {
          headers.Authorization = `Bearer ${newToken}`;
          response = await fetch(url, { method: 'GET', headers });
        } else {
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }
    }

    if (!response.ok) {
      let message = `Download failed: HTTP ${response.status}`;
      let body: unknown;
      try {
        body = await response.clone().json();
        if (body && typeof body === 'object' && 'message' in body && typeof (body as any).message === 'string') {
          message = (body as any).message;
        }
      } catch {
        try {
          const text = await response.clone().text();
          if (text) message = text;
        } catch {}
      }
      throw new ApiError(response.status, message, body);
    }

    // Prefer server-provided filename from Content-Disposition, fallback to caller-provided name
    let filename = fallbackFilename || 'download.xlsx';
    const cd = response.headers.get('Content-Disposition') || '';
    if (cd) {
      const mStar = cd.match(/filename\*=UTF-8''([^;]+)/i);
      const mPlain = cd.match(/filename="?([^";]+)"?/i);
      const raw = mStar ? decodeURIComponent(mStar[1]) : (mPlain ? mPlain[1] : '');
      if (raw) filename = raw;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  }
}

const apiClient = new ApiClient();
export default apiClient;

