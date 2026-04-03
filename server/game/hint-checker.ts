import type { Hint } from '@shared/types/game.js';

/**
 * カタカナをひらがなに変換する（U+30A1-30F6 → U+3041-3096）。
 */
const katakanaToHiragana = (text: string): string =>
  text.replace(/[\u30A1-\u30F6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60),
  );

/**
 * テキストを正規化する（NFKC正規化 + カタカナ→ひらがな + 小文字化 + 空白除去）。
 */
const normalizeText = (text: string): string =>
  katakanaToHiragana(text.normalize('NFKC')).toLowerCase().replace(/\s+/g, '');

/**
 * ヒントの被り判定を行う。
 * NFKC正規化 + 小文字化で比較し、2回以上出現したワードは全て isDuplicate: true とする。
 *
 * @param hints - プレイヤーが提出した生のヒント配列（isDuplicate は無視される）
 * @returns 被り判定済みの新しい Hint 配列
 */
export const checkDuplicateHints = (
  hints: readonly Omit<Hint, 'isDuplicate'>[],
): readonly Hint[] => {
  // 正規化テキストごとの出現回数をカウント
  const normalizedCounts = new Map<string, number>();

  for (const hint of hints) {
    const normalized = normalizeText(hint.text);
    normalizedCounts.set(normalized, (normalizedCounts.get(normalized) ?? 0) + 1);
  }

  // 2回以上出現したものを重複セットに追加
  const duplicateSet = new Set<string>();
  for (const [normalized, count] of normalizedCounts) {
    if (count >= 2) {
      duplicateSet.add(normalized);
    }
  }

  // 各ヒントに isDuplicate フラグを付与した新しい配列を返す
  return hints.map((hint) => ({
    ...hint,
    isDuplicate: duplicateSet.has(normalizeText(hint.text)),
  }));
};
