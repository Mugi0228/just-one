import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useConnectionStatus, type ConnectionStatus } from '@/hooks/useConnectionStatus';

interface PlayerLayoutProps {
  readonly children: ReactNode;
  readonly hideHeader?: boolean;
  readonly centerContent?: boolean;
}

function ConnectionIndicator() {
  const status = useConnectionStatus();
  const [showSuccess, setShowSuccess] = useState(false);
  const prevStatusRef = useRef<ConnectionStatus | null>(null);
  const hasConnectedOnce = useRef(false);

  useEffect(() => {
    if (prevStatusRef.current !== null && prevStatusRef.current !== 'connected' && status === 'connected') {
      if (!hasConnectedOnce.current) {
        hasConnectedOnce.current = true;
        setShowSuccess(true);
        const timer = setTimeout(() => setShowSuccess(false), 5000);
        prevStatusRef.current = status;
        return () => clearTimeout(timer);
      }
    }
    prevStatusRef.current = status;
  }, [status]);

  if (status === 'connected' && !showSuccess) return null;

  const bg = status === 'connected' ? 'bg-green-500 text-white' : 'bg-black/70 text-white';
  const label = status === 'connected' ? '✓ 接続できました' : '⏳ 接続中...';

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className={`text-sm font-bold py-2 px-5 rounded-full shadow-lg ${bg}`}>
        {label}
      </div>
    </div>
  );
}

export function PlayerLayout({ children, hideHeader = false, centerContent = false }: PlayerLayoutProps) {
  return (
    /*
     * layout-full-height = calc(window.innerHeight + env(safe-area-inset-bottom))
     * → body がセーフエリアに透けても背景グラデーションが一致する高さをカバー
     *
     * overflow-x-hidden のみ（y は設定しない）:
     * - overflow: hidden / overflow-y: hidden は iOS Safari で fixed 子要素（blobs）の
     *   レンダリングを壊すため使用しない
     * - スクロールは <main> だけに任せることで TOP ページの誤スクロールを防ぐ
     */
    <div
      className="layout-full-height flex flex-col bg-[var(--color-bg)] relative overflow-x-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundImage: 'var(--bg-gradient)',
      }}
    >
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-purple-400 rounded-full opacity-40 blur-[80px]" />
        <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] bg-cyan-300 rounded-full opacity-35 blur-[80px]" />
        <div className="absolute bottom-10 -left-16 w-[24rem] h-[24rem] bg-pink-300 rounded-full opacity-35 blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 w-[26rem] h-[26rem] bg-purple-300 rounded-full opacity-30 blur-[80px]" />
      </div>

      {!hideHeader && (
        <header
          className="relative z-10 bg-white/80 backdrop-blur-sm shadow-md px-4 py-3"
          style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
        >
          <h1 className="text-center text-2xl font-extrabold text-[var(--color-primary)]">
            Just One
          </h1>
        </header>
      )}
      <ConnectionIndicator />
      {/* スクロールは main のみ。外側 div に overflow-y を持たせないことで
          TOP ページのように内容が短い場面での誤スクロールを防ぐ */}
      <main className={`relative z-10 flex-1 flex flex-col items-center px-4 py-6 pb-8 overflow-y-auto ${centerContent ? 'justify-center' : ''}`}>
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
