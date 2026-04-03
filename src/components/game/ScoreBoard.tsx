import type { TeamRoundResult } from '@shared/types/game';

interface ScoreBoardProps {
  readonly results: readonly TeamRoundResult[];
}

export function ScoreBoard({ results }: ScoreBoardProps) {
  if (results.length === 0) return null;

  const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {sorted.map((team, index) => (
        <div
          key={team.teamId}
          className="flex items-center gap-2 bg-white shadow-sm rounded-2xl px-4 py-2 text-sm border border-gray-100"
        >
          <span className="text-gray-400 font-extrabold">{index + 1}.</span>
          <span className="font-extrabold text-gray-700">{team.teamName}</span>
          <span className="bg-purple-100 text-[var(--color-primary)] font-extrabold px-2 py-0.5 rounded-full text-xs">
            {team.totalScore}pt
          </span>
        </div>
      ))}
    </div>
  );
}
