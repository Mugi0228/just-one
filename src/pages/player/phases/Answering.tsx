import { useState } from 'react';
import { socket } from '@/lib/socket';
import { useGameState } from '@/contexts/GameContext';
import { Timer } from '@/components/ui/Timer';
import { Input } from '@/components/ui/Input';
import { GAME_CONFIG } from '@shared/constants/game-config';
import { hapticSuccess } from '@/lib/haptics';

export function Answering() {
  const { state } = useGameState();
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const isGuesser = state.myRole === 'GUESSER';

  function handleSubmit() {
    if (answer.trim().length === 0 || submitted) return;
    socket.emit('player:submit-answer', { answer: answer.trim() });
    hapticSuccess();
    setSubmitted(true);
  }

  // Valid hints (not duplicates)
  const validHints = state.hints.filter((h) => !h.isDuplicate);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <Timer
        timeRemaining={state.timeRemaining}
        totalTime={GAME_CONFIG.ANSWERING_SECONDS}
      />

      {/* Hints display */}
      <div className="w-full">
        <p className="text-sm text-gray-500 font-bold mb-3 text-center">
          💡 公開されたヒント ({validHints.length}件)
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {validHints.map((hint) => (
            <div
              key={hint.playerId}
              className="bg-purple-100 text-[var(--color-primary)] rounded-full px-4 py-2 font-extrabold text-sm shadow-sm"
            >
              {hint.text}
            </div>
          ))}
          {validHints.length === 0 && (
            <p className="text-gray-400 font-semibold">有効なヒントがありません</p>
          )}
        </div>
      </div>

      {/* Guesser: answer input */}
      {isGuesser && (
        <>
          {submitted ? (
            <div className="bg-green-50 border-2 border-[var(--color-success)] rounded-2xl p-6 text-center w-full">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-[var(--color-success)] font-extrabold text-lg">
                回答を提出しました！
              </p>
              <p className="text-gray-500 text-sm font-semibold mt-1">
                結果を待っています...
              </p>
            </div>
          ) : (
            <div className="w-full bg-white rounded-2xl shadow-md p-6 border-l-4 border-l-[var(--color-warning)]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🎯</span>
                <span className="text-sm font-bold text-amber-600">回答を入力しよう！</span>
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  id="answer-input"
                  placeholder="回答を入力"
                  maxLength={GAME_CONFIG.MAX_ANSWER_LENGTH}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={answer.trim().length === 0}
                  className={`
                    rounded-2xl px-6 py-3 text-lg font-extrabold
                    transition-all duration-150
                    btn-3d
                    ${answer.trim().length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[var(--color-success)] hover:bg-green-600 text-white border-b-4 border-green-700 hover:scale-[1.02]'}
                  `}
                >
                  回答する
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Hint giver: waiting or answer received */}
      {!isGuesser && (
        state.timeRemaining === 0 ? (
          <div className="bg-green-50 border-2 border-[var(--color-success)] rounded-2xl p-6 text-center w-full">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-[var(--color-success)] font-extrabold text-lg">
              回答が完了しました！
            </p>
            <p className="text-gray-500 text-sm font-semibold mt-1">
              司会者が答え合わせをします
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center w-full border-l-4 border-l-[var(--color-cyan)]">
            <div className="flex items-center justify-center gap-2">
              <span className="text-xl">💡</span>
              <p className="text-gray-500 font-bold">
                回答者の答えを待っています
                <span className="animate-pulse">...</span>
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
