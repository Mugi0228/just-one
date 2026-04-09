import { GAME_CONFIG } from '@shared/constants/game-config.js';
import type { Hint } from '@shared/types/game.js';
import { getClaudeClient } from '../lib/claude-client.js';

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

/**
 * Claude Haiku を使って回答とお題が同じ意味かどうかを判定する。
 * 正規化で一致した場合は API を呼ばない。
 * API キー未設定・タイムアウト・パース失敗時は false を返す（手動上書きで救済）。
 */
const checkAnswerSimilarity = async (
  answer: string,
  topic: string,
): Promise<boolean> => {
  const client = getClaudeClient();
  if (!client) return false;

  const systemPrompt =
    'あなたは「Just One」というパーティーゲームの審判です。' +
    '回答とお題が同じものを指しているかどうかを判定してください。' +
    '漢字・ひらがな・カタカナ・英語の表記揺れ、略称、別名、類義語も正解とみなしてください。' +
    '必ず {"isCorrect": true} または {"isCorrect": false} のみを返してください。';

  const userPrompt = `お題: ${topic}\n回答: ${answer}`;

  try {
    const response = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 32,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('answer check timeout')), 5000),
      ),
    ]);

    const content = response.content[0];
    if (content.type !== 'text') return false;

    const match = content.text.trim().match(/\{[\s\S]*\}/);
    if (!match) return false;

    const parsed = JSON.parse(match[0]) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return false;
    return (parsed as Record<string, unknown>).isCorrect === true;
  } catch {
    return false;
  }
};

export interface RoundScoreResult {
  readonly isCorrect: boolean;
  readonly allHintsUnique: boolean;
  readonly score: number;
}

/**
 * ラウンドのスコアを計算する。
 * まず正規化で完全一致を確認し、不一致の場合は Claude Haiku で類似判定を行う。
 *
 * - 正解: +CORRECT_SCORE
 * - 全ヒントがユニーク（被りなし）かつ正解: +ALL_UNIQUE_BONUS
 *
 * @param answer - 回答者の回答（null は未回答 = 不正解）
 * @param topic - そのラウンドのお題
 * @param hints - 被り判定済みのヒント配列
 */
export const calculateRoundScore = async (
  answer: string | null,
  topic: string,
  hints: readonly Hint[],
): Promise<RoundScoreResult> => {
  const allHintsUnique = hints.every((h) => !h.isDuplicate);

  if (answer === null) {
    return { isCorrect: false, allHintsUnique, score: 0 };
  }

  // まず正規化で完全一致チェック（高速・無料）
  const exactMatch =
    normalizeForComparison(answer) === normalizeForComparison(topic);

  // 不一致の場合は Claude Haiku で類似判定
  const isCorrect = exactMatch || await checkAnswerSimilarity(answer, topic);

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
