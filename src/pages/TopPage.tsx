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
        <p className="text-center text-gray-400 text-xs font-bold mt-2">v1.4.4</p>
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
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-gray-100">
          {/* 概要 */}
          <p className="text-gray-600 font-semibold pt-3 text-sm leading-relaxed">
            チームに分かれて、各チームの「回答者」にお題の言葉を当ててもらう協力ゲームです。全チームが同じお題に挑戦し、より多く正解したチームが勝ちます。
          </p>

          {/* ルール */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wide">ルール</p>
            {[
              { icon: '🙈', title: '回答者はお題を知らない', text: 'ラウンド開始時、回答者だけにお題が隠されます。他のメンバー（ヒント出し役）は全員お題を見ることができます。' },
              { icon: '✏️', title: 'ヒントを1人1つ書く', text: 'ヒント出し役は全員、お題に関連する言葉を1つだけ書きます。他のメンバーのヒントは見えません。' },
              { icon: '🚫', title: '被ったヒントは消える', text: '同じ・または意味が似たヒントを複数人が書くと、そのヒントは自動で消えます（表記揺れも対象）。' },
              { icon: '👀', title: '残ったヒントだけ公開', text: '消えなかったヒントのみ回答者に見せます。ヒントが多く消えるほど、回答者に届く情報は少なくなります。' },
              { icon: '🎯', title: '回答者がお題を当てる', text: '残ったヒントを見て、回答者がお題を答えます。正解すれば+1pt！さらに全ヒントが被らずに残っていた場合はボーナス+1ptの計2pt獲得。不正解は0ptです。' },
            ].map(({ icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                <div>
                  <p className="text-gray-800 font-extrabold text-sm">{title}</p>
                  <p className="text-gray-500 font-semibold text-xs leading-relaxed mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 得点まとめ */}
          <div className="bg-gray-50 rounded-xl px-3 py-3 flex flex-col gap-1.5">
            <p className="text-gray-500 font-extrabold text-xs">🏆 得点</p>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-semibold text-gray-600">
                <span>正解</span><span className="font-extrabold text-[var(--color-primary)]">+1pt</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-600">
                <span>全ヒントが被らず残った（ボーナス）</span><span className="font-extrabold text-amber-500">+1pt</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-600">
                <span>不正解 / 未回答</span><span className="font-extrabold text-gray-400">0pt</span>
              </div>
            </div>
          </div>

          {/* コツ */}
          <div className="bg-purple-50 rounded-xl px-3 py-3 flex flex-col gap-2">
            <p className="text-[var(--color-primary)] font-extrabold text-xs">💡 勝つためのコツ</p>
            {[
              '「犬」→「吠える」より「犬」→「忠実」のほうが被りにくい。少しひねったヒントを狙おう。',
              'マニアックすぎると回答者に伝わらない。ユニークさと分かりやすさのバランスが大事。',
              'チームのメンバー構成を考えて、全員が思いつかなさそうな角度からヒントを出すと◎',
            ].map((tip, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[var(--color-primary)] font-extrabold text-xs shrink-0">{i + 1}.</span>
                <p className="text-gray-600 font-semibold text-xs leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
