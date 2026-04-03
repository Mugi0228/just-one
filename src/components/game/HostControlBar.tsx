import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { Button } from '@/components/ui/Button';
import { GAME_CONFIG } from '@shared/constants/game-config';

export function HostControlBar() {
  const { state } = useGameState();

  if (!state.isHost) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10">
      <div className="bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] rounded-t-2xl">
        <div className="max-w-xl mx-auto px-4 py-3">
          <HostControls />
        </div>
      </div>
    </div>
  );
}

function HostControls() {
  const { state } = useGameState();

  switch (state.phase) {
    case 'LOBBY':
      return <LobbyControls />;
    case 'TEAM_ASSIGNMENT':
      return <TeamAssignmentControls />;
    case 'HINT_WRITING':
      return state.progressionMode === 'manual' ? <PauseResumeControls /> : null;
    case 'ANSWERING':
      return state.progressionMode === 'manual' ? <AnsweringControls /> : null;
    case 'ROUND_RESULT':
      return state.progressionMode === 'manual' ? <RoundResultControls /> : null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Lobby Controls
// ---------------------------------------------------------------------------

function LobbyControls() {
  const { state } = useGameState();
  const canShuffle = state.players.length >= GAME_CONFIG.MIN_PLAYERS;
  const botCount = state.players.filter((p) => p.isBot).length;

  function handleAddBot() {
    socket.emit('host:add-bot');
  }

  function handleShuffle() {
    socket.emit('host:start-team-shuffle');
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        onClick={handleAddBot}
        variant="secondary"
        disabled={botCount >= GAME_CONFIG.MAX_BOTS}
        className="text-sm px-4 py-2"
      >
        ボット追加
      </Button>
      <Button
        onClick={handleShuffle}
        disabled={!canShuffle}
        className="text-sm px-4 py-2"
      >
        チーム分けシャッフル
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team Assignment Controls
// ---------------------------------------------------------------------------

function TeamAssignmentControls() {
  const [isStarting, setIsStarting] = useState(false);

  function handleReshuffle() {
    socket.emit('host:start-team-shuffle');
  }

  function handleStartGame() {
    if (isStarting) return;
    setIsStarting(true);
    socket.emit('host:confirm-teams');
    setTimeout(() => setIsStarting(false), 3000);
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        onClick={handleReshuffle}
        variant="secondary"
        className="text-sm px-4 py-2"
      >
        シャッフルし直す
      </Button>
      <Button
        onClick={handleStartGame}
        disabled={isStarting}
        className="text-sm px-4 py-2"
      >
        {isStarting ? '開始中...' : 'ゲーム開始'}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pause / Resume Controls (manual mode)
// ---------------------------------------------------------------------------

function PauseResumeControls() {
  const [isPaused, setIsPaused] = useState(false);

  function handleToggle() {
    if (isPaused) {
      socket.emit('host:resume');
      setIsPaused(false);
    } else {
      socket.emit('host:pause');
      setIsPaused(true);
    }
  }

  return (
    <div className="flex items-center justify-center">
      <Button
        onClick={handleToggle}
        variant={isPaused ? 'primary' : 'secondary'}
        className="text-sm px-4 py-2"
      >
        {isPaused ? '再開' : '一時停止'}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Answering Controls (manual mode)
// ---------------------------------------------------------------------------

function AnsweringControls() {
  const { state } = useGameState();
  const [isPaused, setIsPaused] = useState(false);
  const timerDone = state.timeRemaining <= 0;

  function handleToggle() {
    if (isPaused) {
      socket.emit('host:resume');
      setIsPaused(false);
    } else {
      socket.emit('host:pause');
      setIsPaused(true);
    }
  }

  function handleReveal() {
    socket.emit('host:reveal-result');
  }

  return (
    <div className="flex items-center justify-center gap-3">
      {!timerDone && (
        <Button
          onClick={handleToggle}
          variant="secondary"
          className="text-sm px-4 py-2"
        >
          {isPaused ? '再開' : '一時停止'}
        </Button>
      )}
      <Button onClick={handleReveal} className="text-sm px-4 py-2">
        答え合わせ
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Round Result Controls (manual mode)
// ---------------------------------------------------------------------------

function RoundResultControls() {
  const { state } = useGameState();
  const isLastRound = state.currentRound >= GAME_CONFIG.TOTAL_ROUNDS;

  function handleNextRound() {
    socket.emit('host:next-round');
  }

  return (
    <div className="flex items-center justify-center">
      <Button onClick={handleNextRound} className="text-sm px-4 py-2">
        {isLastRound ? '最終結果を表示' : '次のラウンドへ'}
      </Button>
    </div>
  );
}
