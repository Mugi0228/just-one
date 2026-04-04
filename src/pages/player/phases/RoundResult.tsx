import { useEffect } from 'react';
import { useGameState } from '@/contexts/GameContext';
import { hapticSuccess, hapticError } from '@/lib/haptics';

export function RoundResult() {
  const { state } = useGameState();
  // Haptic feedback based on results for this player's team
  useEffect(() => {
    if (!state.myTeam) return;
    const myResult = state.roundResults.find((r) => r.teamId === state.myTeam?.id);
    if (!myResult) return;
    if (myResult.isCorrect) {
      hapticSuccess();
    } else {
      hapticError();
    }
  }, [state.currentRound]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl font-extrabold text-center text-gray-800">
        ラウンド {state.currentRound} / {state.totalRounds} 結果
      </h3>

      <div className="flex flex-col gap-5">
        {state.roundResults.map((result) => (
          <div key={result.teamId} className="flex flex-col gap-2">
            {/* Topic — outside the card */}
            <div className="flex items-baseline gap-2 px-1">
              <span className="text-xs text-gray-400 font-bold">お題</span>
              <span className="text-2xl font-extrabold text-gray-900">{result.topic}</span>
            </div>

            {/* Result card */}
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              {/* Card header — colored by result */}
              <div
                className={`px-5 py-4 flex items-center justify-between ${
                  result.isCorrect ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'
                }`}
              >
                <span className="font-extrabold text-white text-lg">{result.teamName}</span>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-white text-lg">
                    {result.isCorrect ? '🎉 正解！' : '❌ 不正解'}
                  </span>
                  <span className="bg-white/25 text-white font-extrabold text-sm px-3 py-1 rounded-full">
                    +{result.score}pt
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="px-5 py-4 flex flex-col gap-4">
                {/* Answer */}
                <div>
                  <p className="text-xs text-gray-400 font-bold mb-1">
                    回答者: {result.guesserName}
                  </p>
                  <p
                    className={`text-xl font-extrabold ${
                      result.answer
                        ? result.isCorrect
                          ? 'text-[var(--color-success)]'
                          : 'text-[var(--color-error)]'
                        : 'text-gray-400'
                    }`}
                  >
                    {result.answer ?? '(未回答)'}
                  </p>
                </div>

                {/* Hints */}
                {result.hints.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 font-bold mb-2">ヒント</p>
                    <div className="flex flex-wrap gap-2">
                      {result.hints.map((hint) => (
                        <span
                          key={hint.playerId}
                          className={`
                            text-sm font-bold rounded-full px-3 py-1.5
                            ${hint.isDuplicate
                              ? 'bg-red-100 text-[var(--color-error)] line-through opacity-60'
                              : 'bg-purple-100 text-[var(--color-primary)]'}
                          `}
                        >
                          {hint.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total score */}
                <div className="pt-1 border-t border-gray-100">
                  <span className="text-gray-500 text-sm font-bold">
                    合計 {result.totalScore}pt
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
