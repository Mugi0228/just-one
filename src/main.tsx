import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerServiceWorker } from './lib/pwa';

// iOS PWA では 100dvh がホームインジケーター分だけ短くなる場合がある。
// window.innerHeight は viewport-fit=cover 環境で常に正確な画面高さを返す。
const setAppHeight = () => {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
};
setAppHeight();
window.addEventListener('resize', setAppHeight);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
