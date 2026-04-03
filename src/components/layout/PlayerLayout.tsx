import { useEffect, useState, type ReactNode } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

interface PlayerLayoutProps {
  readonly children: ReactNode;
}

function ConnectionIndicator() {
  const status = useConnectionStatus();
  // Track how long we've been disconnected to distinguish cold-start from runtime disconnect
  const [disconnectedMs, setDisconnectedMs] = useState(0);

  useEffect(() => {
    if (status === 'connected') {
      setDisconnectedMs(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setDisconnectedMs(Date.now() - start), 500);
    return () => clearInterval(id);
  }, [status]);

  if (status === 'connected') return null;

  const isReconnecting = status === 'reconnecting';
  const isColdStart = disconnectedMs < 15_000; // within first 15s = likely cold start

  if (isColdStart && !isReconnecting) {
    return (
      <div className="relative z-20 text-center text-sm font-bold py-3 px-4 bg-purple-100 text-purple-700 flex items-center justify-center gap-2">
        <span className="animate-spin inline-block">⏳</span>
        サーバー起動中です（初回は少しお待ちください）
      </div>
    );
  }

  return (
    <div
      className={`relative z-20 text-center text-sm font-bold py-2 px-4 ${
        isReconnecting
          ? 'bg-amber-400 text-amber-900'
          : 'bg-red-500 text-white'
      }`}
    >
      {isReconnecting ? '再接続中...' : '接続が切れました'}
    </div>
  );
}

export function PlayerLayout({ children }: PlayerLayoutProps) {
  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--color-bg)] relative overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Decorative gradient blobs (全ページ共通) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-purple-400 rounded-full opacity-40 blur-[80px]" />
        <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] bg-cyan-300 rounded-full opacity-35 blur-[80px]" />
        <div className="absolute bottom-10 -left-16 w-[24rem] h-[24rem] bg-pink-300 rounded-full opacity-35 blur-[80px]" />
        <div className="absolute -bottom-24 right-1/4 w-[26rem] h-[26rem] bg-purple-300 rounded-full opacity-30 blur-[80px]" />
      </div>

      <header
        className="relative z-10 bg-white/80 backdrop-blur-sm shadow-md px-4 py-3"
        style={{ paddingLeft: 'max(1rem, env(safe-area-inset-left))', paddingRight: 'max(1rem, env(safe-area-inset-right))' }}
      >
        <h1 className="text-center text-2xl font-extrabold text-[var(--color-primary)]">
          Just One
        </h1>
      </header>
      <ConnectionIndicator />
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 py-6 pb-8">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
