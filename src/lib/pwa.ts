import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker(): void {
  registerSW({
    onRegistered(registration) {
      console.log('[PWA] Service worker registered', registration);
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration failed', error);
    },
    // Auto-update without prompt
    immediate: true,
  });
}
