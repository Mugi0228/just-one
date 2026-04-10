import { useState, useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GAME_CONFIG } from '@shared/constants/game-config';
import type { ProgressionMode } from '@shared/types/game';

type TopView = 'menu' | 'create' | 'join';

export function TopPage() {
  const { state, setPendingProgressionMode, setPendingTotalRounds } = useGameState();
  const [view, setView] = useState<TopView>('menu');

  if (view === 'create') {
    return (
      <CreateView
        onBack={() => setView('menu')}
        setPendingProgressionMode={setPendingProgressionMode}
        setPendingTotalRounds={setPendingTotalRounds}
        error={state.error}
      />
    );
  }

  if (view === 'join') {
    return <JoinView onBack={() => setView('menu')} error={state.error} />;
  }

  return (
    <div className="flex flex-col items-center gap-10">
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

      <div className="w-full max-w-xs">
        <RulesAccordion />
        <p className="text-center text-gray-400 text-xs font-bold mt-2">v1.3.1</p>
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
  readonly setPendingTotalRounds: (rounds: number) => void;
  readonly error: string | null;
}

const ROUND_OPTIONS = [3, 5, 7, 10] as const;

function CreateView({ onBack, setPendingProgressionMode, setPendingTotalRounds, error }: CreateViewProps) {
  const [hostName, setHostName] = useState('');
  const [progressionMode, setProgressionMode] = useState<ProgressionMode>('auto');
  const [totalRounds, setTotalRounds] = useState(7);
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
    setPendingTotalRounds(totalRounds);
    socket.emit('host:create-session', {
      hostName: hostName.trim(),
      progressionMode,
      totalRounds,
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

        {/* Round count selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-600 font-bold">ラウンド数</label>
          <div className="flex gap-2">
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTotalRounds(n)}
                className={`
                  flex-1 rounded-2xl py-3 font-extrabold text-lg transition-all duration-150
                  ${totalRounds === n
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'bg-gray-50 border-[3px] border-gray-200 text-gray-600 hover:border-gray-300'}
                `}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

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

// ---------------------------------------------------------------------------
// Rules Accordion
// ---------------------------------------------------------------------------

function RulesAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white/80 rounded-2xl shadow-sm overflow-hidden w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="font-extrabold text-gray-700 text-sm">📖 ルール説明</span>
        <span className={`text-gray-400 font-bold text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-100">
          <p className="text-gray-500 font-semibold pt-3 text-base">
            チーム全員で協力して、回答者に「お題」を当ててもらうゲームです。
          </p>

          <div className="flex flex-col gap-2.5">
            {[
              { icon: '👁️', text: 'ラウンドが始まると、回答者だけがお題を知らない状態になります。' },
              { icon: '✏️', text: 'ヒント出し役は全員、お題に関連する言葉を1つだけ書きます。' },
              { icon: '🚫', text: '同じ（または似た）ヒントを書いた人が複数いると、そのヒントは消えてしまいます。' },
              { icon: '👀', text: '消えずに残ったヒントだけが回答者に公開されます。' },
              { icon: '🎯', text: '回答者が正解すれば得点！チームで力を合わせてスコアを積み上げよう。' },
            ].map(({ icon, text }) => (
              <div key={icon} className="flex gap-2.5">
                <span className="text-base shrink-0">{icon}</span>
                <p className="text-gray-600 font-semibold leading-snug text-base">{text}</p>
              </div>
            ))}
          </div>

          <div className="bg-purple-50 rounded-xl px-3 py-2.5">
            <p className="text-[var(--color-primary)] font-extrabold text-xs mb-1">💡 コツ</p>
            <p className="text-gray-600 font-semibold leading-snug text-base">
              ありきたりな言葉は被って消えやすい。かといってマニアックすぎると伝わらない。ユニークで的確なヒントを狙おう！
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
