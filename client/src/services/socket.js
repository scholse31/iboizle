import { io } from 'socket.io-client';

export function getServerUrl() {
  // 1. Check local storage (user configured Render URL in settings)
  const savedUrl = localStorage.getItem('synchro_server_url');
  if (savedUrl && savedUrl.trim()) {
    return savedUrl.trim().replace(/\/+$/, '');
  }

  // 2. Check environment variable (Vercel env: VITE_SERVER_URL)
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL.trim().replace(/\/+$/, '');
  }

  // 3. Fallback for localhost development
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:3001';
  }

  // 4. Default to Render backend
  return 'https://iboizle.onrender.com';
}

export const socket = io(getServerUrl(), {
  autoConnect: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1500,
  transports: ['websocket', 'polling']
});
