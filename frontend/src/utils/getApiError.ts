import { ApiError } from '../services/apiClient';

/**
 * Unified error message extractor.
 * Handles both ApiError (fetch-based apiClient) and legacy axios-shaped errors.
 * Use everywhere instead of `error.response?.data?.message`.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Đã xảy ra lỗi'): string {
  if (error instanceof ApiError) {
    // ApiError.message is already the server's message; body may carry field errors
    if (error.message && error.message !== `HTTP ${error.statusCode}`) return error.message;
    const body = error.body as Record<string, unknown> | undefined;
    if (body?.message && typeof body.message === 'string') return body.message;
    return fallback;
  }
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const resp = e.response as Record<string, unknown> | undefined;
    const data = resp?.data as Record<string, unknown> | undefined;
    if (data?.message && typeof data.message === 'string') return data.message;
    if (typeof e.message === 'string' && e.message) return e.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function getApiFieldErrors(error: unknown): Record<string, string> | null {
  if (error instanceof ApiError) {
    const body = error.body as Record<string, unknown> | undefined;
    if (body?.errors && typeof body.errors === 'object') return body.errors as Record<string, string>;
    if (body?.error && typeof body.error === 'object') return body.error as Record<string, string>;
  }
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const resp = e.response as Record<string, unknown> | undefined;
    const data = resp?.data as Record<string, unknown> | undefined;
    if (data?.errors && typeof data.errors === 'object') return data.errors as Record<string, string>;
    if (data?.error && typeof data.error === 'object') return data.error as Record<string, string>;
  }
  return null;
}
