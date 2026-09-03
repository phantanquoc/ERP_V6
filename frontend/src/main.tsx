import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryProvider } from './contexts/QueryProvider'
import App from './App.tsx'
import './index.css'

// Tự phục hồi sau deploy: tab đang mở (hoặc cache cũ) có thể tham chiếu
// chunk hash cũ đã bị thay bằng hash mới. Chunk cũ nay trả về index.html
// (text/html) hoặc 404 nên trình duyệt chặn theo strict MIME check.
// Phát hiện lỗi nạp module và reload đúng MỘT LẦN để lấy index.html +
// bundle mới; sessionStorage chặn vòng lặp reload nếu lỗi vẫn còn.
const RELOAD_GUARD_KEY = 'abf-chunk-reload';
window.addEventListener('error', (event) => {
  const msg = event.message || '';
  const target = event.target as HTMLElement | null;
  const isModuleLoadFailure =
    /failed to (load module script|fetch dynamically imported module)/i.test(msg) ||
    (target instanceof HTMLScriptElement && target.type === 'module');
  if (!isModuleLoadFailure) return;
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
  sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  window.location.reload();
}, true);
// Bundle nạp thành công thì xóa guard để lần deploy sau còn được reload lại.
window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_GUARD_KEY));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <App />
    </QueryProvider>
  </StrictMode>,
)

// Register service worker for Web Push Notifications.
// Registration happens unconditionally so the SW is always installed early.
// The subscribe/unsubscribe (permission-gated) flow lives in NotificationBell.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}
