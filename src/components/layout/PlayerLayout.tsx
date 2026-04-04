import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useConnectionStatus, type ConnectionStatus } from '@/hooks/useConnectionStatus';

interface PlayerLayoutProps {
  readonly children: ReactNode;
  readonly hideHeader?: boolean;
}

function ConnectionIndicator() {
  const status = useConnectionStatus();
  const [showSuccess, setShowSuccess] = useState(false);
  const prevStatusRef = useRef<ConnectionStatus | null>(null);

  useEffect(() => {
    if (prevStatusRef.current !== null && prevStatusRef.current !== 'connected' && status === 'connected') {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      prevStatusRef.current = status;
      return () => clearTimeout(timer);
    }
    prevStatusRef.current = status;
  }, [status]);

  if (status === 'connected' && !showSuccess) return null;

  const bg = status === 'connected' ? 'bg-green-500 text-white' : 'bg-amber-400 text-amber-900';
  const label = status === 'connected'
    ? '✓ 接続できました'
    : '⏳ 接続中...';

  return (
    <div className="relative h-0 overflow-visible z-20">
      <div className={`absolute top-0 left-0 right-0 text-center text-sm font-bold py-2 px-4 ${bg}`}>
        {label}
      </div>
    </div>
  );
}

export function PlayerLayout({ children, hideHeader = false }: PlayerLayoutProps) {
  return (
    <div
      className="flex flex-col bg-[var(--color-bg)] relative overflow-x-hidden overflow-y-auto"
      style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Decorative gradient blobs (全ページ共通) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-purple-400 rounded-full opacity-40 blur-[80px]" />
        <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] bg-cyan-300 rounded-full opacity-35 blur-[80px]" />
        <div className="absolute bottom-10 -left-16 w-[24rem] h-[24rem] bg-pink-300 rounded-full opacity-35 blur-[80px]" />
        <div className="absolute -bottom-24 right-1/4 w-[26rem] h-[26rem] bg-purple-300 rounded-full opacity-30 blur-[80px]" />
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
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-6 pb-8">
        <div className="w-full max-w-lg flex-1 flex flex-col">{children}</div>
      </main>
    </div>
  );
}
