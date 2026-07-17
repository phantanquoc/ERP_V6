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

/** Get stored device key */
export function getDeviceKey(): string | null {
  return localStorage.getItem(KIOSK_DEVICE_KEY);
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

// ─── Tab marking (called from kiosk tab on mount) ─────────────────────────────

/** Mark this tab as kiosk mode (sessionStorage = per-tab) */
export function markTab(): void {
  sessionStorage.setItem(KIOSK_FLAG, '1');
}

/** Check if the CURRENT tab is in kiosk mode */
export function isKioskTab(): boolean {
  return sessionStorage.getItem(KIOSK_FLAG) === '1';
}

// ─── Session check ────────────────────────────────────────────────────────────

/** Returns true if a device key exists in localStorage */
export function hasKioskSession(): boolean {
  return !!localStorage.getItem(KIOSK_DEVICE_KEY);
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
