import { useGameState } from '@/contexts/GameContext';
import { socket } from '@/lib/socket';

export function RoundResult() {
  const { state } = useGameState();

  const needsBottomPadding = state.isHost && state.progressionMode === 'manual';

  return (
    <div className={`flex flex-col gap-4 ${needsBottomPadding ? 'pb-20' : ''}`}>
      <h3 className="text-xl font-extrabold text-center text-gray-800">
        ラウンド {state.currentRound} 結果
      </h3>

      <div className="flex flex-col gap-3">
        {state.roundResults.map((result) => (
          <div
            key={result.teamId}
            className={`
              bg-white rounded-2xl shadow-md p-5
              ${result.isCorrect
                ? 'border-2 border-[var(--color-success)]'
                : 'border-2 border-[var(--color-error)]'}
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-extrabold text-lg text-gray-800">{result.teamName}</span>
              {result.isCorrect ? (
                <span className="font-extrabold text-lg text-[var(--color-success)]">
                  🎉 正解！
                </span>
              ) : (
                <span className="font-extrabold text-lg text-[var(--color-error)]">
                  不正解...
                </span>
              )}
            </div>

            <div className="text-sm text-gray-500 mb-1 font-semibold">
              お題: <span className="text-gray-800 font-bold">{result.topic}</span>
            </div>

            <div className="text-sm text-gray-500 mb-1 font-semibold">
              回答者: {result.guesserName} →{' '}
              <span className="text-gray-800 font-bold">
                {result.answer ?? '(未回答)'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {result.hints.map((hint) => (
                <span
                  key={hint.playerId}
                  className={`
                    text-xs font-bold rounded-full px-3 py-1
                    ${hint.isDuplicate
                      ? 'bg-red-100 text-[var(--color-error)] line-through'
                      : 'bg-green-100 text-green-700'}
                  `}
                >
                  {hint.text}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between">
              {state.isHost && state.progressionMode === 'manual' && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      socket.emit('host:override-result', {
                        teamId: result.teamId,
                        isCorrect: true,
                      })
                    }
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                      result.isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    ⭕ 正解
                  </button>
                  <button
                    onClick={() =>
                      socket.emit('host:override-result', {
                        teamId: result.teamId,
                        isCorrect: false,
                      })
                    }
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                      !result.isCorrect
                        ? 'bg-red-500 text-white'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    ❌ 不正解
                  </button>
                </div>
              )}
              <div className={`text-right ${state.isHost && state.progressionMode === 'manual' ? '' : 'ml-auto'}`}>
                <span className="inline-block bg-purple-100 text-[var(--color-primary)] font-extrabold text-sm px-3 py-1 rounded-full">
                  +{result.score}pt
                </span>
                <span className="ml-2 text-gray-500 text-sm font-bold">
                  (合計 {result.totalScore}pt)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
