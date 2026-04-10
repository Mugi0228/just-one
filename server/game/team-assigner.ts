import type { Team } from '@shared/types/game.js';

/**
 * Fisher-Yates シャッフル（非破壊）。
 */
const shuffleArray = <T>(arr: readonly T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const TEAM_NAMES = ['チームA', 'チームB', 'チームC', 'チームD', 'チームE', 'チームF', 'チームG'] as const;

/**
 * プレイヤーIDリストをランダムにシャッフルし、指定数のチームに均等分配する。
 *
 * @param playerIds - 全プレイヤーのIDリスト
 * @param teamCount - チーム数
 * @returns 不変の Team 配列
 */
export const assignTeams = (
  playerIds: readonly string[],
  teamCount: number,
): readonly Team[] => {
  if (teamCount <= 0) {
    throw new Error('teamCount must be greater than 0');
  }

  if (playerIds.length < teamCount) {
    throw new Error(
      `Not enough players (${playerIds.length}) for ${teamCount} teams`,
    );
  }

  const shuffled = shuffleArray(playerIds);

  const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
    id: `team-${i}`,
    name: TEAM_NAMES[i] ?? `チーム${i + 1}`,
    memberIds: [] as readonly string[],
  }));

  // ラウンドロビンで分配
  const memberArrays: string[][] = Array.from({ length: teamCount }, () => []);

  for (let i = 0; i < shuffled.length; i++) {
    memberArrays[i % teamCount].push(shuffled[i]);
  }

  return teams.map((team, i) => ({
    ...team,
    memberIds: Object.freeze([...memberArrays[i]]),
  }));
};
