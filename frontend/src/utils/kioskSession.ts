/**
 * Kiosk session management for the Production Data Entry tablet page.
 *
 * Device key lives in localStorage (survives tab reload); the kiosk flag lives in
 * sessionStorage (per-tab — never leaks to ERP tabs).
 *
 * Only this file hardcodes the key names.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const KIOSK_DEVICE_KEY = 'pdeDeviceKey';
const KIOSK_FLAG = 'pdeKioskMode';
const KIOSK_OPERATOR_KEY = 'pdeOperator';
const KIOSK_OPERATOR_ID_KEY = 'pdeOperatorId';
const KIOSK_SHIFT_KEY = 'pdeShift';
const KIOSK_DATE_KEY = 'pdeDate';
const KIOSK_ACTIVE_TAB_KEY = 'pdeActiveTab';

/** Custom event name dispatched when a kiosk session becomes invalid */
export const KIOSK_EXPIRED_EVENT = 'pde:kiosk-expired';

// ─── Device Key Management ───────────────────────────────────────────────────

/** Store device key in localStorage (persists across reloads) */
export function setDeviceKey(key: string): void {
  localStorage.setItem(KIOSK_DEVICE_KEY, key);
}

/** Get stored device key (localStorage first, env fallback for build-time config) */
export function getDeviceKey(): string | null {
  return localStorage.getItem(KIOSK_DEVICE_KEY) || import.meta.env.VITE_DATA_ENTRY_DEVICE_KEY || null;
}

/** Remove stored device key */
export function clearDeviceKey(): void {
  localStorage.removeItem(KIOSK_DEVICE_KEY);
}

// ─── Activation (called from ERP tab — legacy compat, now just marks tab) ────

/**
 * Legacy activation — no longer copies JWT tokens.
 * Device key should be set separately via setDeviceKey().
 */
export function activate(): void {
  // No-op: device key is set directly via setDeviceKey()
}

// ─── Kiosk route detection ────────────────────────────────────────────────────

/** URL prefix shared by every public kiosk page (hub + entry screens). */
const KIOSK_ROUTE_PREFIX = '/production/nhap-lieu';

/**
 * True only when the current URL is an actual kiosk route.
 * The admin preview (/production/tablet-hub-preview) is intentionally excluded.
 */
export function isKioskRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith(KIOSK_ROUTE_PREFIX);
}

// ─── Tab marking (called from kiosk tab on mount) ─────────────────────────────

/**
 * Mark this tab as kiosk mode (sessionStorage = per-tab).
 * No-op outside a kiosk route so the flag can never leak into the admin preview
 * (which renders the same hub component) or any other ERP page.
 */
export function markTab(): void {
  if (!isKioskRoute()) return;
  sessionStorage.setItem(KIOSK_FLAG, '1');
}

/**
 * Check if the CURRENT tab is in kiosk mode.
 *
 * Requires BOTH the per-tab flag AND an active kiosk route. Route-gating is
 * essential: the flag persists across reloads and in-tab navigation, so without
 * it a tab that once visited a kiosk page would keep sending device-key auth
 * (and skipping JWT restore) on every ERP page — causing blanket 401s and
 * logout-on-reload.
 */
export function isKioskTab(): boolean {
  return sessionStorage.getItem(KIOSK_FLAG) === '1' && isKioskRoute();
}

// ─── Session check ────────────────────────────────────────────────────────────

/** Returns true if a device key is available (localStorage or env fallback) */
export function hasKioskSession(): boolean {
  return !!getDeviceKey();
}

// ─── Deactivation ─────────────────────────────────────────────────────────────

/** Remove all kiosk keys (device key + flag). Called if admin explicitly deactivates. */
export function deactivate(): void {
  localStorage.removeItem(KIOSK_DEVICE_KEY);
  sessionStorage.removeItem(KIOSK_FLAG);
  clearSelection();
}

// ─── Selection state (per-tab, sessionStorage) ────────────────────────────────

export interface KioskSelection {
  operator: string;
  operatorId: string;
  shift: number;
  date: string;
  activeTab: string;
}

/** Read selection state from sessionStorage. Returns null if operator is missing (nothing to restore). */
export function getSelection(): KioskSelection | null {
  const operator = sessionStorage.getItem(KIOSK_OPERATOR_KEY);
  if (!operator) return null;
  const operatorId = sessionStorage.getItem(KIOSK_OPERATOR_ID_KEY) ?? '';
  const shiftRaw = sessionStorage.getItem(KIOSK_SHIFT_KEY);
  const shift = shiftRaw ? Number(shiftRaw) : 0;
  const date = sessionStorage.getItem(KIOSK_DATE_KEY) ?? '';
  const activeTab = sessionStorage.getItem(KIOSK_ACTIVE_TAB_KEY) ?? '';
  return { operator, operatorId, shift: Number.isFinite(shift) ? shift : 0, date, activeTab };
}

/** Persist part or all of the selection state. Only writes keys present in the patch. */
export function setSelection(patch: Partial<KioskSelection>): void {
  if (patch.operator !== undefined) sessionStorage.setItem(KIOSK_OPERATOR_KEY, patch.operator);
  if (patch.operatorId !== undefined) sessionStorage.setItem(KIOSK_OPERATOR_ID_KEY, patch.operatorId);
  if (patch.shift !== undefined) sessionStorage.setItem(KIOSK_SHIFT_KEY, String(patch.shift));
  if (patch.date !== undefined) sessionStorage.setItem(KIOSK_DATE_KEY, patch.date);
  if (patch.activeTab !== undefined) sessionStorage.setItem(KIOSK_ACTIVE_TAB_KEY, patch.activeTab);
}

/** Remove all selection keys. */
export function clearSelection(): void {
  sessionStorage.removeItem(KIOSK_OPERATOR_KEY);
  sessionStorage.removeItem(KIOSK_OPERATOR_ID_KEY);
  sessionStorage.removeItem(KIOSK_SHIFT_KEY);
  sessionStorage.removeItem(KIOSK_DATE_KEY);
  sessionStorage.removeItem(KIOSK_ACTIVE_TAB_KEY);
}
