import { useState, useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GAME_CONFIG } from '@shared/constants/game-config';
import type { ProgressionMode } from '@shared/types/game';

type TopView = 'menu' | 'create' | 'join';

export function TopPage() {
  const { state, setPendingProgressionMode } = useGameState();
  const [view, setView] = useState<TopView>('menu');

  if (view === 'create') {
    return (
      <CreateView
        onBack={() => setView('menu')}
        setPendingProgressionMode={setPendingProgressionMode}
        error={state.error}
      />
    );
  }

  if (view === 'join') {
    return <JoinView onBack={() => setView('menu')} error={state.error} />;
  }

  return (
    <div className="flex flex-col items-center justify-center gap-10 flex-1">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold text-[var(--color-primary)] mb-3 animate-bounce-in">
          Just One
        </h1>
        <p className="text-gray-500 text-xl font-bold">
          🎉 パーティーワードゲーム 🎉
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Button onClick={() => setView('create')} className="text-xl py-4">
          ✨ ルームを作成
        </Button>
        <Button
          onClick={() => setView('join')}
          variant="secondary"
          className="text-xl py-4"
        >
          🎮 ルームに参加
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Session View
// ---------------------------------------------------------------------------

interface CreateViewProps {
  readonly onBack: () => void;
  readonly setPendingProgressionMode: (mode: ProgressionMode) => void;
  readonly error: string | null;
}

function CreateView({ onBack, setPendingProgressionMode, error }: CreateViewProps) {
  const [hostName, setHostName] = useState('');
  const [progressionMode, setProgressionMode] = useState<ProgressionMode>('auto');
  const [isCreating, setIsCreating] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const canCreate =
    hostName.trim().length > 0 &&
    hostName.length <= GAME_CONFIG.MAX_PLAYER_NAME_LENGTH &&
    !isCreating;

  function handleCreate() {
    if (!canCreate) return;
    setIsCreating(true);
    setPendingProgressionMode(progressionMode);
    socket.emit('host:create-session', {
      hostName: hostName.trim(),
      progressionMode,
    });

    const timeout = setTimeout(() => setIsCreating(false), 5000);

    function onCreated() {
      clearTimeout(timeout);
      socket.off('error', onError);
      cleanupRef.current = null;
    }
    function onError() {
      clearTimeout(timeout);
      setIsCreating(false);
      socket.off('session:created', onCreated);
      cleanupRef.current = null;
    }

    socket.once('session:created', onCreated);
    socket.once('error', onError);

    cleanupRef.current = () => {
      clearTimeout(timeout);
      socket.off('session:created', onCreated);
      socket.off('error', onError);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
          ✨ ルームを作成
        </h2>
        <p className="text-gray-500 font-semibold">新しいルームを作ります</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-5">
        <Input
          id="host-name"
          label="あなたの名前"
          placeholder="名前を入力"
          maxLength={GAME_CONFIG.MAX_PLAYER_NAME_LENGTH}
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
        />

        {/* Progression mode selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 font-bold">
            進行モード
          </label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setProgressionMode('auto')}
              className={`
                rounded-2xl p-4 text-left transition-all duration-150
                ${progressionMode === 'auto'
                  ? 'bg-purple-50 border-[3px] border-[var(--color-primary)] shadow-sm'
                  : 'bg-gray-50 border-[3px] border-gray-200 hover:border-gray-300'}
              `}
            >
              <div className="font-extrabold text-gray-800 mb-1">🤖 自動進行</div>
              <div className="text-sm text-gray-500 font-semibold">
                1人でも遊べる！タイマーで自動的に進行します
              </div>
            </button>
            <button
              type="button"
              onClick={() => setProgressionMode('manual')}
              className={`
                rounded-2xl p-4 text-left transition-all duration-150
                ${progressionMode === 'manual'
                  ? 'bg-purple-50 border-[3px] border-[var(--color-primary)] shadow-sm'
                  : 'bg-gray-50 border-[3px] border-gray-200 hover:border-gray-300'}
              `}
            >
              <div className="font-extrabold text-gray-800 mb-1">🎤 手動進行</div>
              <div className="text-sm text-gray-500 font-semibold">
                宴会向け！司会者が進行をコントロールします
              </div>
            </button>
          </div>
        </div>

        <Button onClick={handleCreate} disabled={!canCreate}>
          {isCreating ? '作成中...' : '作成する'}
        </Button>
      </div>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-[var(--color-primary)] text-sm font-bold transition-colors"
        >
          ← 戻る
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-[var(--color-error)] rounded-2xl p-4 text-center text-[var(--color-error)] font-bold">
          {error}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Join Session View
// ---------------------------------------------------------------------------

interface JoinViewProps {
  readonly onBack: () => void;
  readonly error: string | null;
}

function JoinView({ onBack, error }: JoinViewProps) {
  const [sessionCode, setSessionCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const canJoin =
    sessionCode.length === GAME_CONFIG.SESSION_CODE_LENGTH &&
    playerName.trim().length > 0 &&
    playerName.length <= GAME_CONFIG.MAX_PLAYER_NAME_LENGTH &&
    !isSubmitting;

  function handleJoin() {
    if (!canJoin) return;
    setIsSubmitting(true);
    socket.emit('player:join', {
      playerName: playerName.trim(),
      sessionCode: sessionCode.toUpperCase(),
    });
    const timeout = setTimeout(() => setIsSubmitting(false), 5000);

    function onJoined() {
      clearTimeout(timeout);
      socket.off('error', onError);
      cleanupRef.current = null;
    }
    function onError() {
      clearTimeout(timeout);
      setIsSubmitting(false);
      socket.off('session:joined', onJoined);
      cleanupRef.current = null;
    }

    socket.once('session:joined', onJoined);
    socket.once('error', onError);

    cleanupRef.current = () => {
      clearTimeout(timeout);
      socket.off('session:joined', onJoined);
      socket.off('error', onError);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-3xl font-extrabold text-gray-800 mb-2">
          🎮 ルームに参加
        </h2>
        <p className="text-gray-500 font-semibold">ルームコードを入力してください</p>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-4">
        <Input
          id="session-code"
          label="ルームコード"
          placeholder="4桁の英数字"
          maxLength={GAME_CONFIG.SESSION_CODE_LENGTH}
          value={sessionCode}
          onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
          className="text-center text-2xl tracking-widest uppercase"
        />

        <Input
          id="player-name"
          label="あなたの名前"
          placeholder="名前を入力"
          maxLength={GAME_CONFIG.MAX_PLAYER_NAME_LENGTH}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />

        <Button onClick={handleJoin} disabled={!canJoin}>
          {isSubmitting ? '参加中...' : '参加する'}
        </Button>
      </div>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-[var(--color-primary)] text-sm font-bold transition-colors"
        >
          ← 戻る
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-[var(--color-error)] rounded-2xl p-4 text-center text-[var(--color-error)] font-bold">
          {error}
        </div>
      )}
    </div>
  );
}
