/**
 * Kiosk session management for the Production Data Entry tablet page.
 *
 * Tokens live in localStorage (survive tab reload); the kiosk flag lives in
 * sessionStorage (per-tab — never leaks to ERP tabs).
 *
 * Only this file hardcodes the key names.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const KIOSK_ACCESS_KEY = 'pdeAccessToken';
const KIOSK_REFRESH_KEY = 'pdeRefreshToken';
const KIOSK_FLAG = 'pdeKioskMode';

/** Custom event name dispatched when a kiosk refresh fails */
export const KIOSK_EXPIRED_EVENT = 'pde:kiosk-expired';

// ─── Activation (called from ERP tab) ─────────────────────────────────────────

/**
 * Copy the current access + refresh tokens into the dedicated kiosk keys.
 * Must be called BEFORE opening the tablet tab.
 */
export function activate(): void {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  if (accessToken) localStorage.setItem(KIOSK_ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(KIOSK_REFRESH_KEY, refreshToken);
}

// ─── Tab marking (called from kiosk tab on mount) ─────────────────────────────

/** Mark this tab as kiosk mode (sessionStorage = per-tab) */
export function markTab(): void {
  sessionStorage.setItem(KIOSK_FLAG, '1');
}

/** Check if the CURRENT tab is in kiosk mode */
export function isKioskTab(): boolean {
  return sessionStorage.getItem(KIOSK_FLAG) === '1';
}

// ─── Token access ─────────────────────────────────────────────────────────────

export function getKioskAccess(): string | null {
  return localStorage.getItem(KIOSK_ACCESS_KEY);
}

export function getKioskRefresh(): string | null {
  return localStorage.getItem(KIOSK_REFRESH_KEY);
}

export function setKioskAccess(token: string): void {
  localStorage.setItem(KIOSK_ACCESS_KEY, token);
}

// ─── Session check ────────────────────────────────────────────────────────────

/** Returns true if dedicated kiosk tokens exist in localStorage */
export function hasKioskSession(): boolean {
  return !!localStorage.getItem(KIOSK_ACCESS_KEY) && !!localStorage.getItem(KIOSK_REFRESH_KEY);
}

// ─── Deactivation ─────────────────────────────────────────────────────────────

/** Remove all kiosk keys (tokens + flag). Called if admin explicitly deactivates. */
export function deactivate(): void {
  localStorage.removeItem(KIOSK_ACCESS_KEY);
  localStorage.removeItem(KIOSK_REFRESH_KEY);
  sessionStorage.removeItem(KIOSK_FLAG);
}
