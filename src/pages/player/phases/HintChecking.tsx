import { useGameState } from '@/contexts/GameContext';
import { Timer } from '@/components/ui/Timer';
import { GAME_CONFIG } from '@shared/constants/game-config';

const AVATAR_COLORS = [
  'bg-[var(--color-primary)]',
  'bg-[var(--color-success)]',
  'bg-[var(--color-warning)]',
  'bg-[var(--color-pink)]',
  'bg-[#3B82F6]',
  'bg-[var(--color-cyan)]',
  'bg-[#F97316]',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

const STAGGER_CLASSES = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6'];

function getStaggerClass(index: number): string {
  return STAGGER_CLASSES[Math.min(index, STAGGER_CLASSES.length - 1)];
}

export function HintChecking() {
  const { state } = useGameState();
  const isGuesser = state.myRole === 'GUESSER';

  // Guesser sees a waiting screen
  if (isGuesser) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Timer
          timeRemaining={state.timeRemaining}
          totalTime={GAME_CONFIG.HINT_CHECKING_SECONDS}
        />
        <div className="bg-white rounded-2xl shadow-md p-8 text-center w-full border-l-4 border-l-[var(--color-warning)] animate-phase-enter">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-2xl font-extrabold text-amber-600 mb-2">
            被りチェック中...
          </p>
          <p className="text-gray-500 font-semibold">
            まもなくヒントが公開されます
          </p>
        </div>
      </div>
    );
  }

  // Hint givers see the duplicate check results with staggered animation
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <Timer
        timeRemaining={state.timeRemaining}
        totalTime={GAME_CONFIG.HINT_CHECKING_SECONDS}
      />

      <div className="text-center mb-1">
        <p className="text-lg font-extrabold text-gray-800">🔍 被りチェック結果</p>
      </div>

      <div className="w-full flex flex-col gap-2">
        {state.hints.map((hint, index) => (
          <div
            key={hint.playerId}
            className={`
              flex items-center gap-3 bg-white rounded-2xl shadow-sm px-4 py-3
              animate-slide-in-right ${getStaggerClass(index)}
              ${hint.isDuplicate && hint.duplicateReason === 'synonym'
                ? 'border-l-4 border-l-orange-400'
                : hint.isDuplicate
                  ? 'border-l-4 border-l-[var(--color-error)]'
                  : 'border-l-4 border-l-[var(--color-success)]'}
            `}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white ${getAvatarColor(index)}`}
            >
              {hint.playerName.charAt(0)}
            </div>
            <span
              className={`flex-1 font-bold ${
                hint.isDuplicate ? 'line-through text-gray-400' : 'text-gray-800'
              }`}
            >
              {hint.text}
            </span>
            {hint.isDuplicate && hint.duplicateReason === 'synonym' ? (
              <span className="flex items-center gap-1 text-orange-500 text-xs font-extrabold">
                🔀 <span>類義語</span>
              </span>
            ) : hint.isDuplicate ? (
              <span className="text-lg">❌</span>
            ) : (
              <span className="text-lg">✅</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
