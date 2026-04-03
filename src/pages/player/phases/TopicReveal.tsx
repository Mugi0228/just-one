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
        <h2 className="text-5xl font-extrabold text-[var(--color-primary)] mb-4">
          {state.myRole === 'GUESSER' ? '???' : state.topic}
        </h2>

        <div className="inline-block">
          {state.myRole === 'GUESSER' ? (
            <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 font-extrabold rounded-full px-5 py-2 text-sm">
              🎯 回答者
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 font-extrabold rounded-full px-5 py-2 text-sm">
              💡 ヒント出し
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
