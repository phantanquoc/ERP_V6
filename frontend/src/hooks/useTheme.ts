import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

/**
 * Hook để truy cập ThemeContext.
 * Tách ra file riêng để Vite Fast Refresh hoạt động đúng
 * (tránh lỗi "export is incompatible" khi mix component + hook trong 1 file).
 */
export function useTheme() {
  return useContext(ThemeContext);
}
