import type { Team, Player } from '@shared/types/game';

interface TeamCardProps {
  readonly team: Team;
  readonly players: readonly Player[];
  readonly highlighted?: boolean;
}

export function TeamCard({
  team,
  players,
  highlighted = false,
}: TeamCardProps) {
  const members = team.memberIds
    .map((id) => players.find((p) => p.id === id))
    .filter(Boolean);

  return (
    <div
      className={`
        rounded-2xl p-4
        ${highlighted ? 'bg-indigo-900/50 border-2 border-indigo-500' : 'bg-gray-800'}
      `}
    >
      <h3 className="text-lg font-bold mb-2 text-indigo-400">{team.name}</h3>
      <div className="flex flex-wrap gap-2">
        {members.map((member) =>
          member ? (
            <div
              key={member.id}
              className="flex items-center gap-2 bg-gray-700 rounded-xl px-3 py-1.5"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                {member.name.charAt(0)}
              </div>
              <span className="text-sm">{member.name}</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
