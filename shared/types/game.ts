/** 進行モード */
export type ProgressionMode = 'auto' | 'manual';

/** ゲームフェーズ */
export type GamePhase =
  | 'LOBBY'
  | 'TEAM_ASSIGNMENT'
  | 'TOPIC_REVEAL'
  | 'HINT_WRITING'
  | 'HINT_CHECKING'
  | 'ANSWERING'
  | 'ROUND_RESULT'
  | 'FINAL_RESULT';

/** プレイヤーの役割 */
export type PlayerRole = 'GUESSER' | 'HINT_GIVER';

/** プレイヤー */
export interface Player {
  readonly id: string;
  readonly name: string;
  readonly joinedAt: number;
  readonly isConnected: boolean;
  readonly isBot: boolean;
}

/** チーム */
export interface Team {
  readonly id: string;
  readonly name: string;
  readonly memberIds: readonly string[];
}

/** 被り判定の理由 */
export type DuplicateReason = 'exact' | 'synonym' | 'not-word';

/** ヒント */
export interface Hint {
  readonly playerId: string;
  readonly text: string;
  readonly rawText: string;
  readonly isDuplicate: boolean;
  readonly duplicateReason?: DuplicateReason;
}

/** 公開用ヒント（回答者に見せる形） */
export interface RevealedHint {
  readonly playerId: string;
  readonly playerName: string;
  readonly text: string;
  readonly isDuplicate: boolean;
  readonly duplicateReason?: DuplicateReason;
}

/** チームのラウンド状態（クライアント送信用） */
export interface TeamRoundInfo {
  readonly teamId: string;
  readonly guesserId: string;
  readonly guesserName: string;
}

/** チームのラウンド結果 */
export interface TeamRoundResult {
  readonly teamId: string;
  readonly teamName: string;
  readonly topic: string;
  readonly guesserName: string;
  readonly answer: string | null;
  readonly isCorrect: boolean;
  readonly allHintsUnique: boolean;
  readonly score: number;
  readonly totalScore: number;
  readonly hints: readonly RevealedHint[];
}

/** チームの最終結果 */
export interface TeamFinalResult {
  readonly teamId: string;
  readonly teamName: string;
  readonly totalScore: number;
  readonly rank: number;
  readonly roundResults: readonly TeamRoundResult[];
}
