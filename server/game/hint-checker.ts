import type { Hint } from '@shared/types/game.js';
import type { SynonymResult } from './synonym-checker.js';

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
 * ヒントの被り判定を行う（完全一致）。
 * NFKC正規化 + 小文字化で比較し、2回以上出現したワードは全て isDuplicate: true とする。
 *
 * @param hints - プレイヤーが提出した生のヒント配列
 * @returns 被り判定済みの新しい Hint 配列
 */
export const checkDuplicateHints = (
  hints: readonly Omit<Hint, 'isDuplicate'>[],
): readonly Hint[] => {
  const normalizedCounts = new Map<string, number>();

  for (const hint of hints) {
    const normalized = normalizeText(hint.text);
    normalizedCounts.set(normalized, (normalizedCounts.get(normalized) ?? 0) + 1);
  }

  const duplicateSet = new Set<string>();
  for (const [normalized, count] of normalizedCounts) {
    if (count >= 2) {
      duplicateSet.add(normalized);
    }
  }

  return hints.map((hint) => {
    const isDuplicate = duplicateSet.has(normalizeText(hint.text));
    return isDuplicate
      ? { ...hint, isDuplicate: true, duplicateReason: 'exact' as const }
      : { ...hint, isDuplicate: false };
  });
};

/**
 * 同義語チェック結果をマージし、同義語被りを isDuplicate: true, duplicateReason: 'synonym' にマークする。
 * 既に完全一致被りのヒントはそのまま維持する。
 *
 * @param checkedHints - checkDuplicateHints 済みのヒント配列
 * @param synonymResult - checkSynonyms の結果
 * @returns 同義語被りも反映した新しい Hint 配列
 */
export const mergeSynonymDuplicates = (
  checkedHints: readonly Hint[],
  synonymResult: SynonymResult,
): readonly Hint[] => {
  if (synonymResult.synonymGroups.length === 0) return checkedHints;

  const synonymDuplicateSet = new Set<string>();
  for (const group of synonymResult.synonymGroups) {
    if (group.length >= 2) {
      for (const text of group) {
        synonymDuplicateSet.add(text);
      }
    }
  }

  if (synonymDuplicateSet.size === 0) return checkedHints;

  return checkedHints.map((hint) => {
    if (hint.isDuplicate) return hint;
    if (synonymDuplicateSet.has(hint.text)) {
      return { ...hint, isDuplicate: true, duplicateReason: 'synonym' as const };
    }
    return hint;
  });
};
