import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getActiveTheme, getAllThemes, Theme } from '../services/themeService';

// ─── Storage key ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'erp_theme_name';

// ─── Context shape ────────────────────────────────────────────────────────────
interface ThemeContextValue {
  activeTheme: Theme | null;
  themes: Theme[];
  isEventTheme: boolean;          // true khi đang dùng theme sự kiện (30/4, 1/5…)
  applyTheme: (theme: Theme) => void;
  refreshThemes: (token: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  activeTheme: null,
  themes: [],
  isEventTheme: false,
  applyTheme: () => {},
  refreshThemes: async () => {},
});

// ─── CSS var mapping ──────────────────────────────────────────────────────────
function applyCssVars(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary',       theme.primaryColor);
  root.style.setProperty('--color-primary-dark',  theme.primaryDarkColor  ?? shadeColor(theme.primaryColor, -20));
  root.style.setProperty('--color-primary-light', theme.primaryLightColor ?? shadeColor(theme.primaryColor,  20));
  root.style.setProperty('--color-secondary',     theme.secondaryColor);
  root.style.setProperty('--color-accent',        theme.accentColor);
  root.style.setProperty('--color-bg',            theme.bgColor);
  root.style.setProperty('--color-sidebar',       theme.sidebarColor);
  root.style.setProperty('--color-sidebar-text',  theme.sidebarText);
  root.style.setProperty('--color-header',        theme.sidebarColor);
  root.style.setProperty('--color-header-text',   theme.sidebarText);
}

/** Lighten (+) or darken (-) a hex color by `amount` (0-100). */
function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null);
  const [themes, setThemes]           = useState<Theme[]>([]);
  const [isEventTheme, setIsEventTheme] = useState(false);

  // Apply a theme object → CSS vars + localStorage (only for non-event choice)
  const applyTheme = useCallback((theme: Theme) => {
    applyCssVars(theme);
    setActiveTheme(theme);
    setIsEventTheme(!theme.isDefault && !!theme.startDate);
    // Only persist user manual choice for non-event themes
    if (theme.isDefault || !theme.startDate) {
      localStorage.setItem(STORAGE_KEY, theme.name);
    }
  }, []);

  // Fetch all themes for admin picker
  const refreshThemes = useCallback(async (token: string) => {
    try {
      const data = await getAllThemes(token);
      setThemes(data);
    } catch {
      // Non-critical — ignore
    }
  }, []);

  // On mount: fetch active theme from API (server auto-detects event vs default)
  useEffect(() => {
    (async () => {
      try {
        // 1. Try to apply saved preference immediately (avoid flash)
        const saved = localStorage.getItem(STORAGE_KEY);

        // 2. Fetch server-authoritative active theme
        const serverTheme = await getActiveTheme();

        // 3. If server says "event theme" → always honour it (override user pref)
        if (!serverTheme.isDefault && serverTheme.startDate) {
          applyTheme(serverTheme);
          return;
        }

        // 4. Otherwise honour user's saved preference if it exists
        if (saved && saved !== serverTheme.name) {
          // We don't have the full theme object yet; just use server default for now.
          // Full theme list requires auth — will be populated after login via refreshThemes.
        }

        applyTheme(serverTheme);
      } catch {
        // Backend unreachable — CSS vars stay at :root defaults from index.css
      }
    })();
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{ activeTheme, themes, isEventTheme, applyTheme, refreshThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}
