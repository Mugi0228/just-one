import { useGameState } from '@/contexts/GameContext';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/Button';

const RANK_EMOJI: Record<number, string> = {
  1: '🏆',
  2: '🥈',
  3: '🥉',
};

const RANK_CARD_STYLES: Record<number, string> = {
  1: 'bg-amber-50 border-2 border-amber-400 shadow-lg',
  2: 'bg-gray-50 border-2 border-gray-300 shadow-md',
  3: 'bg-orange-50 border-2 border-orange-300 shadow-md',
};

const RANK_TEXT_STYLES: Record<number, string> = {
  1: 'text-5xl text-amber-500',
  2: 'text-3xl text-gray-400',
  3: 'text-2xl text-orange-400',
};

export function FinalResultPage() {
  const { state } = useGameState();
  const sorted = [...state.finalResults].sort((a, b) => a.rank - b.rank);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center animate-bounce-in">
        <h2 className="text-3xl font-extrabold text-gray-800">🎊 最終結果</h2>
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-4">
        {sorted.map((team) => (
          <div
            key={team.teamId}
            className={`
              rounded-2xl p-5
              ${RANK_CARD_STYLES[team.rank] ?? 'bg-white shadow-md border-2 border-gray-100'}
              ${team.rank === 1 ? 'animate-bounce-in' : ''}
            `}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                {RANK_EMOJI[team.rank] && (
                  <span className="text-2xl mb-1">{RANK_EMOJI[team.rank]}</span>
                )}
                <span
                  className={`font-extrabold ${RANK_TEXT_STYLES[team.rank] ?? 'text-xl text-gray-400'}`}
                >
                  {team.rank}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-lg text-gray-800">{team.teamName}</p>
                <p className="text-[var(--color-primary)] font-extrabold text-xl">
                  {team.totalScore}pt
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Round-by-round breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-extrabold text-gray-500">ラウンド振り返り</h3>
        <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b-2 border-gray-100">
                <th className="text-left py-3 px-3 font-bold">R</th>
                {sorted.map((team) => (
                  <th key={team.teamId} className="text-center py-3 px-3 font-bold">
                    {team.teamName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted[0]?.roundResults.map((_, roundIdx) => (
                <tr
                  key={roundIdx}
                  className={`border-b border-gray-100 ${
                    roundIdx % 2 === 1 ? 'bg-gray-50' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-gray-400 font-bold">{roundIdx + 1}</td>
                  {sorted.map((team) => {
                    const rr = team.roundResults[roundIdx];
                    return (
                      <td key={team.teamId} className="text-center py-2.5 px-3">
                        <span className="font-bold">
                          {rr?.isCorrect ? (
                            <span className="text-[var(--color-success)]">⭕ +{rr.score}</span>
                          ) : (
                            <span className="text-[var(--color-error)]">❌ 0</span>
                          )}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fun closing message & play again */}
      <div className="text-center py-4 flex flex-col items-center gap-4">
        <p className="text-xl font-extrabold text-gray-500">おつかれさまでした！🎊</p>
        {state.isHost && (
          <Button
            onClick={() => socket.emit('host:play-again')}
            className="text-sm px-6 py-3"
          >
            もう1回遊ぶ
          </Button>
        )}
      </div>
    </div>
  );
}
