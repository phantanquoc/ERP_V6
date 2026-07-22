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

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
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
  /** When true, a 401 in kiosk tab will NOT dispatch KIOSK_EXPIRED_EVENT */
  skipKioskExpiry?: boolean;
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

    const isFormData = options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...this.getAuthHeader(),
      ...options.headers,
    };

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
        if (data.errors && typeof data.errors === 'object') {
          const fieldErrors = Object.entries(data.errors as Record<string, string>)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('; ');
          if (fieldErrors) errorMessage = fieldErrors;
        }
        throw new ApiError(response.status, errorMessage);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
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
   */
  async download(endpoint: string, filename: string): Promise<void> {
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
      throw new ApiError(response.status, `Download failed: HTTP ${response.status}`);
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

