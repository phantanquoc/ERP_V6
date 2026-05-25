// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Server base URL (without /api suffix) - used for file/upload links
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// WebSocket URL — same host as API, swap http(s) → ws(s), drop /api suffix
export const WS_BASE_URL = SERVER_BASE_URL.replace(/^http/, 'ws');

// Helper function to get full API URL
export const getApiUrl = (endpoint: string = '') => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

// Helper function to get server file URL (for uploaded files, attachments, etc.)
export const getFileUrl = (filePath: string = '') => {
  if (!filePath) return '';
  const base = SERVER_BASE_URL.endsWith('/') ? SERVER_BASE_URL.slice(0, -1) : SERVER_BASE_URL;
  const path = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${base}${path}`;
};

