import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import themeService, { ThemeData } from '../services/themeService';

interface ThemeContextType {
  theme: ThemeData | null;
  isLoading: boolean;
  /** Tất cả themes để ThemePickerModal hiển thị */
  allThemes: ThemeData[];
  /** Áp dụng theme tạm thời (preview, không lưu DB) */
  previewTheme: (theme: ThemeData | null) => void;
  /** Reload theme từ server */
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [allThemes, setAllThemes] = useState<ThemeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const applyThemeCssVars = (t: ThemeData) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', t.primaryColor);
    root.style.setProperty('--color-secondary', t.secondaryColor);
    root.style.setProperty('--color-accent', t.accentColor);
    root.style.setProperty('--color-bg', t.bgColor);
    root.style.setProperty('--color-sidebar', t.sidebarColor);
    root.style.setProperty('--color-sidebar-text', t.sidebarText);
  };

  const loadTheme = async () => {
    try {
      setIsLoading(true);
      const [active, all] = await Promise.all([
        themeService.getActiveTheme(),
        themeService.getAllThemes(),
      ]);
      setAllThemes(all);
      if (active) {
        setTheme(active);
        applyThemeCssVars(active);
      }
    } catch (error) {
      console.error('[ThemeContext] Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTheme();

    // Re-apply theme khi WS reconnects (có thể theme đã thay đổi trong khi offline)
    const onReconnect = () => { void loadTheme(); };
    window.addEventListener('wsReconnected', onReconnect);
    return () => window.removeEventListener('wsReconnected', onReconnect);
  }, []);

  const previewTheme = (t: ThemeData | null) => {
    if (t) {
      setTheme(t);
      applyThemeCssVars(t);
    } else {
      // Khôi phục active theme khi cancel preview
      void loadTheme();
    }
  };

  const refreshTheme = async () => {
    await loadTheme();
  };

  return (
    <ThemeContext.Provider value={{ theme, isLoading, allThemes, previewTheme, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
