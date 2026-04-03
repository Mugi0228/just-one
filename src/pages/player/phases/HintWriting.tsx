import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { Timer } from '@/components/ui/Timer';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { GAME_CONFIG } from '@shared/constants/game-config';
import { hapticSuccess } from '@/lib/haptics';

export function HintWriting() {
  const { state } = useGameState();
  const [hint, setHint] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isGuesser = state.myRole === 'GUESSER';

  function handleSubmit() {
    if (hint.trim().length === 0 || submitted) return;
    socket.emit('player:submit-hint', { hint: hint.trim() });
    hapticSuccess();
    setSubmitted(true);
  }

  // Guesser sees a waiting screen
  if (isGuesser) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Timer
          timeRemaining={state.timeRemaining}
          totalTime={GAME_CONFIG.HINT_WRITING_SECONDS}
        />
        <div className="bg-white rounded-2xl shadow-md p-8 text-center w-full border-l-4 border-l-[var(--color-warning)]">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-2xl font-extrabold text-amber-600 mb-2">
            回答者のあなたは待機中
          </p>
          <p className="text-gray-500 font-semibold">
            チームメンバーがヒントを考えています
            <span className="animate-pulse">...</span>
          </p>
        </div>
      </div>
    );
  }

  // Hint giver
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <Timer
        timeRemaining={state.timeRemaining}
        totalTime={GAME_CONFIG.HINT_WRITING_SECONDS}
      />

      <div className="text-center">
        <p className="text-sm text-gray-500 font-bold mb-1">お題</p>
        <h3 className="text-3xl font-extrabold text-gray-800">{state.topic}</h3>
      </div>

      {submitted ? (
        <div className="bg-green-50 border-2 border-[var(--color-success)] rounded-2xl p-6 text-center w-full">
          <p className="text-3xl mb-2">✅</p>
          <p className="text-[var(--color-success)] font-extrabold text-lg mb-1">
            ヒントを提出しました！
          </p>
          <p className="text-gray-500 text-sm font-semibold">
            他のメンバーの提出を待っています...
          </p>
          {/* Progress indicator */}
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-3 w-full overflow-hidden">
              <div
                className="bg-[var(--color-success)] h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${state.hintTotalHinters > 0 ? (state.hintSubmittedCount / state.hintTotalHinters) * 100 : 0}%`,
                }}
              />
            </div>
            <p className="text-gray-500 text-xs font-bold mt-1.5">
              {state.hintSubmittedCount} / {state.hintTotalHinters} 人提出済み
            </p>
          </div>
        </div>
      ) : (
        <div className="w-full bg-white rounded-2xl shadow-md p-6 border-l-4 border-l-[var(--color-cyan)]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">💡</span>
            <span className="text-sm font-bold text-cyan-600">ヒントを書こう！</span>
          </div>
          <div className="flex flex-col gap-3">
            <Input
              id="hint-input"
              placeholder="ヒントを1つ入力"
              maxLength={GAME_CONFIG.MAX_HINT_LENGTH}
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={hint.trim().length === 0}
              className={`
                rounded-2xl px-6 py-3 text-lg font-extrabold
                transition-all duration-150
                btn-3d
                ${hint.trim().length === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[var(--color-success)] hover:bg-green-600 text-white border-b-4 border-green-700 hover:scale-[1.02]'}
              `}
            >
              提出する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
