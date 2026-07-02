import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import systemSettingsService, { SystemSettings } from '../services/systemSettingsService';
import { useAuth } from './AuthContext';

interface SystemSettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

const FALLBACK_SETTINGS: SystemSettings = {
  id: '',
  activeTheme: 'DEFAULT',
  slogan: 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.',
  updatedAt: '',
};

export const SystemSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated) {
      setSettings(FALLBACK_SETTINGS);
      setLoading(false);
      return;
    }
    try {
      const data = await systemSettingsService.getSettings();
      setSettings(data);
    } catch {
      setSettings(FALLBACK_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = (): SystemSettingsContextType => {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
};
