import { API_BASE_URL } from '../config/api';

export interface Theme {
  id: string;
  name: string;
  displayName: string;
  primaryColor: string;
  primaryDarkColor?: string;
  primaryLightColor?: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  sidebarColor: string;
  sidebarText: string;
  logo?: string | null;
  isActive: boolean;
  isDefault: boolean;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
}

/**
 * Fetch the active theme for today (no auth required).
 * Server auto-detects: event theme (7 days early preview) → default theme.
 */
export async function getActiveTheme(): Promise<Theme> {
  const res = await fetch(`${API_BASE_URL}/themes/active`);
  if (!res.ok) throw new Error('Failed to fetch active theme');
  const json = await res.json();
  return json.data as Theme;
}

/**
 * Fetch all active themes (no auth required — public).
 */
export async function getAllThemes(): Promise<Theme[]> {
  const res = await fetch(`${API_BASE_URL}/themes`);
  if (!res.ok) throw new Error('Failed to fetch themes');
  const json = await res.json();
  return json.data as Theme[];
}
