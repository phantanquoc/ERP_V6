import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { getActiveTheme, getAllThemes, Theme } from '../services/themeService';

// ─── Storage key (per-user) ───────────────────────────────────────────────────
const storageKey = (userId?: string) =>
  userId ? `erp_theme_${userId}` : 'erp_theme_guest';

/** Lấy userId từ localStorage — AuthService lưu user object với key 'user' */
const getUserId = (): string => {
  try {
    const raw = localStorage.getItem('user');
    if (raw) return JSON.parse(raw)?.id ?? 'guest';
  } catch { /* ignore */ }
  return 'guest';
};

// ─── Context shape ────────────────────────────────────────────────────────────
interface ThemeContextValue {
  activeTheme: Theme | null;
  themes: Theme[];
  isEventTheme: boolean;          // true khi đang dùng theme sự kiện (30/4, 1/5…)
  applyTheme: (theme: Theme) => void;
  refreshThemes: () => Promise<void>;
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

  // ── Apply theme → CSS vars + per-user localStorage ─────────────────────────
  const applyTheme = useCallback((theme: Theme, isEvent = false) => {
    applyCssVars(theme);
    setActiveTheme(theme);
    setIsEventTheme(isEvent);
    if (!isEvent) {
      localStorage.setItem(storageKey(getUserId()), theme.name);
    }
  }, []);

  // ── Fetch all themes (public endpoint) ─────────────────────────────────────
  const refreshThemes = useCallback(async () => {
    try {
      const data = await getAllThemes();
      setThemes(data);

      // Apply saved per-user preference nếu không có event theme đang active
      if (!isEventTheme) {
        const savedName = localStorage.getItem(storageKey(getUserId()));
        if (savedName) {
          const saved = data.find((t) => t.name === savedName);
          if (saved) {
            applyCssVars(saved);
            setActiveTheme(saved);
          }
        }
      }
    } catch { /* non-critical */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEventTheme]);

  // ── On mount: fetch active theme từ server ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const serverTheme = await getActiveTheme();
        const isEvent = !serverTheme.isDefault && !!serverTheme.startDate;
        applyTheme(serverTheme, isEvent);
      } catch { /* giữ :root defaults */ }
    })();
  }, [applyTheme]);

  return (
    <ThemeContext.Provider value={{
      activeTheme,
      themes,
      isEventTheme,
      applyTheme: (t) => applyTheme(t, false),
      refreshThemes,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}
