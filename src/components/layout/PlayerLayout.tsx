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
     * fixed inset-0: JS の高さ計算を一切使わず画面全体（セーフエリア含む）を確実にカバー。
     * window.innerHeight の挙動は iOS バージョンによって異なるため、
     * JS 計算ベースのアプローチはバージョン依存の不具合を生む。
     *
     * ポイント:
     * - overflow は設定しない: overflow:hidden は iOS Safari で fixed 子要素をクリップする
     * - blobs は fixed inset-0 のまま: 親が fixed でも子の fixed は viewport 基準で描画される
     * - セーフエリアは内側 wrapper の padding で管理
     */
    <div
      className="fixed inset-0 flex flex-col bg-[var(--color-bg)]"
      style={{ backgroundImage: 'var(--bg-gradient)' }}
    >
      {/* Decorative gradient blobs — fixed inset-0 維持（viewport 基準で描画） */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] bg-purple-400 rounded-full opacity-40 blur-[80px]" />
        <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] bg-cyan-300 rounded-full opacity-35 blur-[80px]" />
        <div className="absolute bottom-10 -left-16 w-[24rem] h-[24rem] bg-pink-300 rounded-full opacity-35 blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 w-[26rem] h-[26rem] bg-purple-300 rounded-full opacity-30 blur-[80px]" />
      </div>

      {/* セーフエリア分を内側 padding で確保。overflow-x-hidden で横はみ出しのみ防ぐ */}
      <div
        className="flex flex-col flex-1 min-h-0 overflow-x-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {!hideHeader && (
          <header className="relative z-10 bg-white/80 backdrop-blur-sm shadow-md px-4 py-3">
            <h1 className="text-center text-2xl font-extrabold text-[var(--color-primary)]">
              Just One
            </h1>
          </header>
        )}
        <ConnectionIndicator />
        <main className={`relative z-10 flex-1 flex flex-col items-center px-4 py-6 pb-8 overflow-y-auto ${centerContent ? 'justify-center' : ''}`}>
          <div className="w-full max-w-lg">{children}</div>
        </main>
      </div>
    </div>
  );
}
