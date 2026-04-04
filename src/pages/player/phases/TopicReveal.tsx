import { useGameState } from '@/contexts/GameContext';
import { Timer } from '@/components/ui/Timer';
import { GAME_CONFIG } from '@shared/constants/game-config';

export function TopicReveal() {
  const { state } = useGameState();

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Timer
        timeRemaining={state.timeRemaining}
        totalTime={GAME_CONFIG.TOPIC_REVEAL_SECONDS}
      />

      <div className="bg-white rounded-2xl shadow-md p-8 text-center w-full relative overflow-hidden animate-bounce-in">
        {/* Sparkle decorations */}
        <span className="absolute top-3 left-4 text-2xl opacity-60">✨</span>
        <span className="absolute top-2 right-5 text-xl opacity-40">✨</span>
        <span className="absolute bottom-3 left-8 text-lg opacity-30">✨</span>
        <span className="absolute bottom-2 right-3 text-2xl opacity-50">✨</span>

        <p className="text-sm text-gray-500 font-bold mb-3">お題</p>
        <h2 className="text-5xl font-extrabold text-[var(--color-primary)]">
          {state.myRole === 'GUESSER' ? '???' : state.topic}
        </h2>
      </div>

      {state.myRole === 'GUESSER' ? (
        <div className="text-center flex flex-col gap-2">
          <p className="text-2xl font-extrabold text-[var(--color-primary)]">あなたは回答者です</p>
          <p className="text-gray-500 font-semibold">メンバーがヒントを考えます</p>
        </div>
      ) : (
        <div className="text-center flex flex-col gap-2">
          <p className="text-2xl font-extrabold text-[var(--color-cyan)]">あなたはヒント出しです</p>
          <p className="text-gray-500 font-semibold">お題に合うヒントを1つ考えてください</p>
        </div>
      )}
    </div>
  );
}
