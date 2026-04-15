import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryProvider } from './contexts/QueryProvider'
import App from './App.tsx'
import './index.css'

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
