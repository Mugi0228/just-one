import { useGameState } from '@/contexts/GameContext';
import { PhaseTransition } from '@/components/ui/PhaseTransition';
import { TopicReveal } from '@/pages/player/phases/TopicReveal';
import { HintWriting } from '@/pages/player/phases/HintWriting';
import { HintChecking } from '@/pages/player/phases/HintChecking';
import { Answering } from '@/pages/player/phases/Answering';
import { RoundResult } from '@/pages/player/phases/RoundResult';

const MANUAL_CONTROL_PHASES = new Set(['HINT_WRITING', 'ANSWERING', 'ROUND_RESULT']);

export function GamePage() {
  const { state } = useGameState();

  // Bottom bar height: score row (~40px) + optional host controls (~52px)
  const hasHostControls =
    state.isHost &&
    state.progressionMode === 'manual' &&
    MANUAL_CONTROL_PHASES.has(state.phase);
  const bottomPad = hasHostControls ? 'pb-28' : 'pb-16';

  return (
    <div className={`flex flex-col gap-4 ${bottomPad}`}>
      {/* Round badge */}
      <div className="text-center">
        <span className="inline-block bg-[var(--color-primary)] text-white text-sm font-extrabold px-4 py-1.5 rounded-full">
          🎯 ラウンド {state.currentRound}
        </span>
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
