import { useGameState } from '@/contexts/GameContext';
import { ScoreBoard } from '@/components/game/ScoreBoard';
import { PhaseTransition } from '@/components/ui/PhaseTransition';
import { TopicReveal } from '@/pages/player/phases/TopicReveal';
import { HintWriting } from '@/pages/player/phases/HintWriting';
import { HintChecking } from '@/pages/player/phases/HintChecking';
import { Answering } from '@/pages/player/phases/Answering';
import { RoundResult } from '@/pages/player/phases/RoundResult';

export function GamePage() {
  const { state } = useGameState();
  const showHostBar =
    state.isHost &&
    state.progressionMode === 'manual' &&
    ['HINT_WRITING', 'ANSWERING', 'ROUND_RESULT'].includes(state.phase);

  return (
    <div className={`flex flex-col gap-4 ${showHostBar ? 'pb-20' : ''}`}>
      {/* Header: round + scoreboard */}
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <span className="inline-block bg-[var(--color-primary)] text-white text-sm font-extrabold px-4 py-1.5 rounded-full">
            🎯 ラウンド {state.currentRound}
          </span>
        </div>
        <ScoreBoard results={state.roundResults} />
      </div>

      {/* Phase content with transition */}
      <PhaseTransition phaseKey={`${state.currentRound}-${state.phase}`}>
        <PhaseContent phase={state.phase} />
      </PhaseTransition>
    </div>
  );
}

function PhaseContent({ phase }: { readonly phase: string }) {
  switch (phase) {
    case 'TOPIC_REVEAL':
      return <TopicReveal />;
    case 'HINT_WRITING':
      return <HintWriting />;
    case 'HINT_CHECKING':
      return <HintChecking />;
    case 'ANSWERING':
      return <Answering />;
    case 'ROUND_RESULT':
      return <RoundResult />;
    default:
      return null;
  }
}
