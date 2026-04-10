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

  const showForceReset = state.isHost && inGamePhase;

  const scores = [...state.teams]
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      totalScore: state.roundResults.find((r) => r.teamId === t.id)?.totalScore ?? 0,
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const showScores = inGamePhase && scores.length > 0;

  if (!showScores && !showHostControls && !showForceReset) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="bg-white/20 backdrop-blur-md border-t border-white/30">
        <div
          className="max-w-xl mx-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Score row + ロビーに戻る を1行にまとめてコンパクトに */}
          {showScores && (
            <div className="flex items-center gap-2 px-3 py-1">
              <div className="flex flex-wrap gap-1.5 flex-1 justify-center">
                {scores.map((team, i) => {
                  const isMyTeam = team.teamId === state.myTeam?.id;
                  return (
                    <div
                      key={team.teamId}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 ${
                        isMyTeam
                          ? 'bg-[var(--color-primary)] border border-white/30'
                          : 'bg-white/40 border border-white/50'
                      }`}
                    >
                      <span className={`font-bold text-xs ${isMyTeam ? 'text-white/70' : 'text-gray-400'}`}>{i + 1}.</span>
                      <span className={`font-extrabold text-sm ${isMyTeam ? 'text-white' : 'text-gray-700'}`}>{team.teamName}</span>
                      <span className={`font-extrabold px-1.5 py-0.5 rounded-full text-xs ${
                        isMyTeam ? 'bg-white/20 text-white' : 'bg-white/50 text-[var(--color-primary)]'
                      }`}>
                        {team.totalScore}pt
                      </span>
                    </div>
                  );
                })}
              </div>
              {showForceReset && <ForceResetControl inline />}
            </div>
          )}

          {/* Host controls */}
          {showHostControls && (
            <div className={`px-4 py-2 ${showScores ? 'border-t border-white/30' : ''}`}>
              <HostControls />
            </div>
          )}

          {/* Force reset — スコアがない場合のみ単独表示 */}
          {showForceReset && !showScores && (
            <div className={`px-4 py-1 ${showHostControls ? 'border-t border-white/30' : ''}`}>
              <ForceResetControl />
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
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        onClick={() => socket.emit('host:back-to-lobby')}
        variant="secondary"
        className="text-sm px-3 py-2"
      >
        ← ロビーに戻る
      </Button>
      <Button
        onClick={() => socket.emit('host:start-team-shuffle')}
        variant="secondary"
        className="text-sm px-3 py-2"
      >
        シャッフルし直す
      </Button>
      <Button
        onClick={handleStartGame}
        disabled={isStarting}
        className="text-sm px-3 py-2"
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

// ---------------------------------------------------------------------------
// Force Reset Control — ゲーム中にロビーへ強制リセット
// ---------------------------------------------------------------------------

function ForceResetControl({ inline = false }: { inline?: boolean }) {
  const [confirming, setConfirming] = useState(false);

  function handleReset() {
    socket.emit('host:play-again');
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleReset}
          className="text-xs font-extrabold text-white bg-red-500 rounded-full px-2 py-0.5"
        >
          リセット
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs font-bold text-gray-400"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className={inline ? 'shrink-0' : 'flex items-center justify-center'}>
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-gray-400 font-bold underline underline-offset-2 whitespace-nowrap"
      >
        ロビーに戻る
      </button>
    </div>
  );
}
