import { useEffect, useRef } from 'react';
import { useGameState } from '@/contexts/GameContext';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/Button';
import { hapticHeavy } from '@/lib/haptics';

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

const CONFETTI_COLORS = ['#7C3AED', '#06B6D4', '#EC4899', '#F59E0B', '#22C55E', '#EF4444'];

const STAGGER_CLASSES = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6'];

function launchConfetti(container: HTMLElement) {
  const count = 60;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const left = Math.random() * 100;
    const duration = 1.5 + Math.random() * 2;
    const delay = Math.random() * 0.8;
    el.style.cssText = `
      left: ${left}%;
      top: -20px;
      background: ${color};
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(el);
    // Clean up after animation
    setTimeout(() => el.remove(), (duration + delay + 0.5) * 1000);
  }
}

export function FinalResultPage() {
  const { state } = useGameState();
  const sorted = [...state.finalResults].sort((a, b) => a.rank - b.rank);
  const containerRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    hapticHeavy();
    if (containerRef.current) {
      launchConfetti(containerRef.current);
    }
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      <div className="text-center animate-scale-pop">
        <h2 className="text-3xl font-extrabold text-gray-800">🎊 最終結果</h2>
      </div>

      {/* Rankings */}
      <div className="flex flex-col gap-4">
        {sorted.map((team, index) => (
          <div
            key={team.teamId}
            className={`
              rounded-2xl p-5
              animate-phase-enter ${STAGGER_CLASSES[Math.min(index, STAGGER_CLASSES.length - 1)]}
              ${RANK_CARD_STYLES[team.rank] ?? 'bg-white shadow-md border-2 border-gray-100'}
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
                  <th key={team.teamId} className="text-center py-3 px-3 font-bold whitespace-nowrap min-w-[5rem]">
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
