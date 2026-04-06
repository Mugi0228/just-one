import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerServiceWorker } from './lib/pwa';

// iOS PWA では window.innerHeight がセーフエリア底を含まない値を返す（デバッグ済み）
// body は safe area まで伸びるため、body の background が safe area に露出する
// → PlayerLayout の高さに safe area bottom を加算して body が透けないようにする
const setAppHeight = () => {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
};
setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);

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
