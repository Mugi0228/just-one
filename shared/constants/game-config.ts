export const GAME_CONFIG = {
  /** ラウンド数 */
  TOTAL_ROUNDS: 7,
  /** チーム最大数 */
  MAX_TEAM_COUNT: 4,
  /** 1チームの最小人数（回答者1人 + ヒント出し2人） */
  MIN_TEAM_SIZE: 3,
  /** チーム最大人数 */
  MAX_TEAM_SIZE: 7,
  /** 最小プレイ人数 */
  MIN_PLAYERS: 3,
  /** お題表示時間（秒） */
  TOPIC_REVEAL_SECONDS: 5,
  /** ヒント記入時間（秒） */
  HINT_WRITING_SECONDS: 60,
  /** 被りチェック表示時間（秒） */
  HINT_CHECKING_SECONDS: 10,
  /** 回答時間（秒） */
  ANSWERING_SECONDS: 60,
  /** ラウンド結果表示時間（秒） */
  ROUND_RESULT_SECONDS: 15,
  /** 正解スコア */
  CORRECT_SCORE: 1,
  /** 全員一致ボーナススコア */
  ALL_UNIQUE_BONUS: 1,
  /** セッションコード長 */
  SESSION_CODE_LENGTH: 4,
  /** プレイヤー名の最大文字数 */
  MAX_PLAYER_NAME_LENGTH: 20,
  /** ヒントの最大文字数 */
  MAX_HINT_LENGTH: 30,
  /** 回答の最大文字数 */
  MAX_ANSWER_LENGTH: 50,
  /** ボットの最大数 */
  MAX_BOTS: 27,
} as const;
