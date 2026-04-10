import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

interface PlayerLayoutProps {
  readonly children: ReactNode;
  readonly hideHeader?: boolean;
  readonly centerContent?: boolean;
}

// モジュールレベル: コンポーネント再マウントをまたいで持続する
// 「接続中...」バナーが出た切断サイクルかどうかを追跡する
let isShowingConnectingBanner = false;

function ConnectionIndicator() {
  const status = useConnectionStatus();
  const [visible, setVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    if (status !== 'connected') {
      clearTimer();
      // 1.5秒以上切断が続いた場合のみバナーを表示（瞬断はスキップ）
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        isShowingConnectingBanner = true;
        setIsConnecting(true);
        setVisible(true);
      }, 1500);
    } else {
      clearTimer();
      if (isShowingConnectingBanner) {
        // 「接続中...」を表示していた → 「接続できました」に切り替えて3秒後に非表示
        setIsConnecting(false);
        setVisible(true);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setVisible(false);
          isShowingConnectingBanner = false;
        }, 3000);
      } else {
        setVisible(false);
      }
    }

    return clearTimer;
  }, [status]);

  if (!visible) return null;

  const bg = isConnecting ? 'bg-black/70 text-white' : 'bg-green-500 text-white';
  const label = isConnecting ? '⏳ 接続中...' : '✓ 接続できました';

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
      className="fixed inset-0 flex flex-col"
      style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 40%, #f9a8d4 75%, #a78bfa 100%)' }}
    >
      {/* セーフエリア分を内側 padding で確保 */}
      <div
        className="relative z-10 flex flex-col flex-1 min-h-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 0.75rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        }}
      >
        {!hideHeader && (
          <header className="bg-white/30 backdrop-blur-sm px-4 py-3">
            <h1 className="text-center text-2xl font-extrabold text-[var(--color-primary)]">
              Just One
            </h1>
          </header>
        )}
        <ConnectionIndicator />
        {/*
         * overflow-y-auto を main に置き、children の直接ラッパーに my-auto を使う。
         * my-auto は overflow-y-auto flex コンテナ内で正しく動作する：
         *  - コンテンツが収まる場合 → 上下均等マージンで中央寄せ
         *  - コンテンツがはみ出す場合 → マージン0でトップ配置、スクロール可能
         */}
        <main className="flex-1 flex flex-col items-center overflow-y-auto px-4">
          <div className="w-full max-w-lg my-auto py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
