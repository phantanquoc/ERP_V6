import React, {
  createContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { getActiveTheme, getAllThemes, Theme } from '../services/themeService';

// ─── Storage key (per-user) ───────────────────────────────────────────────────
const storageKey = (userId: string) => `erp_theme_${userId}`;

const getUserId = (): string => {
  try {
    const raw = localStorage.getItem('user');
    if (raw) return JSON.parse(raw)?.id ?? 'guest';
  } catch { /* ignore */ }
  return 'guest';
};

// ─── Context shape ────────────────────────────────────────────────────────────
export interface ThemeContextValue {
  activeTheme: Theme | null;   // theme đang được lưu (persisted)
  themes: Theme[];
  isEventTheme: boolean;
  /** Áp dụng CSS vars ngay + lưu vào localStorage */
  applyTheme: (theme: Theme) => void;
  /** Chỉ áp dụng CSS vars để preview — KHÔNG lưu */
  previewTheme: (theme: Theme) => void;
  /** Khôi phục CSS vars về `activeTheme` đã lưu */
  revertPreview: () => void;
  refreshThemes: () => Promise<void>;
}

// Export để useTheme hook có thể import
export const ThemeContext = createContext<ThemeContextValue>({
  activeTheme: null,
  themes: [],
  isEventTheme: false,
  applyTheme: () => {},
  previewTheme: () => {},
  revertPreview: () => {},
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

function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ─── Provider — only component export in this file ───────────────────────────
// useTheme hook là file riêng (hooks/useTheme.ts) để Vite Fast Refresh không bị lỗi
// "export is incompatible" khi mix component + hook trong cùng 1 file.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activeTheme, setActiveTheme]   = useState<Theme | null>(null);
  const [themes, setThemes]             = useState<Theme[]>([]);
  const [isEventTheme, setIsEventTheme] = useState(false);

  // Guard: chỉ chạy init() 1 lần — chặn React StrictMode double-invoke
  const initDoneRef     = useRef(false);
  // Dùng ref để tránh stale closure trong async callbacks
  const isEventThemeRef = useRef(false);
  // Ref lưu activeTheme để revertPreview không bị stale closure
  const activeThemeRef  = useRef<Theme | null>(null);

  // ── Apply theme → CSS vars + lưu vào localStorage (persisted) ───────────────
  const applyTheme = (theme: Theme, isEvent = false) => {
    applyCssVars(theme);
    setActiveTheme(theme);
    activeThemeRef.current = theme;
    setIsEventTheme(isEvent);
    isEventThemeRef.current = isEvent;
    if (!isEvent) {
      localStorage.setItem(storageKey(getUserId()), theme.name);
    }
  };

  // ── Preview: chỉ đổi CSS vars để xem trước — KHÔNG lưu ─────────────────────
  const previewTheme = (theme: Theme) => {
    applyCssVars(theme);
  };

  // ── Revert: khôi phục CSS vars về theme đã lưu (dùng ref tránh stale) ───────
  const revertPreview = () => {
    if (activeThemeRef.current) applyCssVars(activeThemeRef.current);
  };

  // ── Fetch danh sách themes và apply preference đã lưu ──────────────────────
  const refreshThemes = async (): Promise<void> => {
    try {
      const data = await getAllThemes();
      setThemes(data);
      if (!isEventThemeRef.current) {
        const savedName = localStorage.getItem(storageKey(getUserId()));
        if (savedName) {
          const saved = data.find((t) => t.name === savedName);
          if (saved) {
            applyCssVars(saved);
            setActiveTheme(saved);
            activeThemeRef.current = saved;
          }
        }
      }
    } catch (e) {
      console.error('[ThemeContext] refreshThemes failed:', e);
    }
  };

  // ── On mount: (1) fetch active theme từ server, (2) load danh sách ─────────
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const init = async () => {
      try {
        const serverTheme = await getActiveTheme();
        const isEvent = !serverTheme.isDefault && !!serverTheme.startDate;
        applyTheme(serverTheme, isEvent);
      } catch (e) {
        console.error('[ThemeContext] getActiveTheme failed:', e);
      }

      try {
        const data = await getAllThemes();
        setThemes(data);
        if (!isEventThemeRef.current) {
          const savedName = localStorage.getItem(storageKey(getUserId()));
          if (savedName) {
            const saved = data.find((t) => t.name === savedName);
            if (saved) {
              applyCssVars(saved);
              setActiveTheme(saved);
              activeThemeRef.current = saved;
            }
          }
        }
      } catch (e) {
        console.error('[ThemeContext] getAllThemes failed:', e);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeContext.Provider value={{
      activeTheme,
      themes,
      isEventTheme,
      applyTheme: (t) => applyTheme(t, false),
      previewTheme,
      revertPreview,
      refreshThemes,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
