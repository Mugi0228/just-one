import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { Button } from '@/components/ui/Button';
import { GAME_CONFIG } from '@shared/constants/game-config';

const GAME_PHASE_SET = new Set([
  'TOPIC_REVEAL',
  'HINT_WRITING',
  'HINT_CHECKING',
  'ANSWERING',
  'ROUND_RESULT',
]);

// Phases where host controls are rendered
const HOST_CONTROL_PHASES = new Set(['LOBBY', 'TEAM_ASSIGNMENT']);
const HOST_MANUAL_CONTROL_PHASES = new Set(['HINT_WRITING', 'ANSWERING', 'ROUND_RESULT']);

export function HostControlBar() {
  const { state } = useGameState();

  const inGamePhase = GAME_PHASE_SET.has(state.phase);

  const showHostControls =
    state.isHost &&
    (HOST_CONTROL_PHASES.has(state.phase) ||
      (state.progressionMode === 'manual' && HOST_MANUAL_CONTROL_PHASES.has(state.phase)));

  const scores = [...state.teams]
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      totalScore: state.roundResults.find((r) => r.teamId === t.id)?.totalScore ?? 0,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const showScores = inGamePhase && scores.length > 0;

  if (!showScores && !showHostControls) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10">
      <div className="bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] rounded-t-2xl">
        <div
          className="max-w-xl mx-auto"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          {/* Score row — always visible during game phases */}
          {showScores && (
            <div className="flex flex-wrap gap-2 justify-center px-4 pt-2 pb-2">
              {scores.map((team, i) => (
                <div
                  key={team.teamId}
                  className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1"
                >
                  <span className="text-gray-400 font-bold text-xs">{i + 1}.</span>
                  <span className="font-extrabold text-gray-700 text-sm">{team.teamName}</span>
                  <span className="bg-purple-100 text-[var(--color-primary)] font-extrabold px-2 py-0.5 rounded-full text-xs">
                    {team.totalScore}pt
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Host controls */}
          {showHostControls && (
            <div
              className={`px-4 py-3 ${showScores ? 'border-t border-gray-100' : ''}`}
            >
              <HostControls />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Host Controls (phase-specific)
// ---------------------------------------------------------------------------

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

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        onClick={() => socket.emit('host:add-bot')}
        variant="secondary"
        disabled={botCount >= GAME_CONFIG.MAX_BOTS}
        className="text-sm px-4 py-2"
      >
        ボット追加
      </Button>
      <Button
        onClick={() => socket.emit('host:start-team-shuffle')}
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

  function handleStartGame() {
    if (isStarting) return;
    setIsStarting(true);
    socket.emit('host:confirm-teams');
    setTimeout(() => setIsStarting(false), 3000);
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        onClick={() => socket.emit('host:back-to-lobby')}
        variant="secondary"
        className="text-sm px-4 py-2"
      >
        ← ロビーに戻る
      </Button>
      <Button
        onClick={() => socket.emit('host:start-team-shuffle')}
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
      <Button
        onClick={() => socket.emit('host:reveal-result')}
        className="text-sm px-4 py-2"
      >
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
  const isLastRound = state.currentRound >= state.totalRounds;

  return (
    <div className="flex items-center justify-center">
      <Button
        onClick={() => socket.emit('host:next-round')}
        className="text-sm px-4 py-2"
      >
        {isLastRound ? '最終結果を表示' : '次のラウンドへ'}
      </Button>
    </div>
  );
}
