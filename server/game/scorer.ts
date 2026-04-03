import { GAME_CONFIG } from '@shared/constants/game-config.js';
import type { Hint } from '@shared/types/game.js';

/**
 * カタカナをひらがなに変換する（U+30A1-30F6 → U+3041-3096）。
 */
const katakanaToHiragana = (text: string): string =>
  text.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );

/**
 * テキストを正規化して比較用に変換する。
 */
const normalizeForComparison = (text: string): string =>
  katakanaToHiragana(text.normalize('NFKC')).toLowerCase().replace(/\s+/g, '');

export interface RoundScoreResult {
  readonly isCorrect: boolean;
  readonly allHintsUnique: boolean;
  readonly score: number;
}

/**
 * ラウンドのスコアを計算する。
 *
 * - 正解: +CORRECT_SCORE
 * - 全ヒントがユニーク（被りなし）かつ正解: +ALL_UNIQUE_BONUS
 *
 * @param answer - 回答者の回答（null は未回答 = 不正解）
 * @param topic - そのラウンドのお題
 * @param hints - 被り判定済みのヒント配列
 */
export const calculateRoundScore = (
  answer: string | null,
  topic: string,
  hints: readonly Hint[],
): RoundScoreResult => {
  const allHintsUnique = hints.every((h) => !h.isDuplicate);

  if (answer === null) {
    return { isCorrect: false, allHintsUnique, score: 0 };
  }

  const isCorrect =
    normalizeForComparison(answer) === normalizeForComparison(topic);

  if (!isCorrect) {
    return { isCorrect: false, allHintsUnique, score: 0 };
  }

  const baseScore = GAME_CONFIG.CORRECT_SCORE;
  const bonus = allHintsUnique ? GAME_CONFIG.ALL_UNIQUE_BONUS : 0;

  return {
    isCorrect: true,
    allHintsUnique,
    score: baseScore + bonus,
  };
};
