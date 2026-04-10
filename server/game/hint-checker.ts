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
 * ヒントが単語（文章でない）かどうかを判定する。
 * - NFKC正規化後に空白文字が含まれる場合は複数単語とみなす
 * - 漢字の後に接続助詞（の・は・が・を・で・に・と・も・へ）が続く場合は文節とみなす
 * - 漢字の後に複合助詞（から・まで・など・より）が続く場合も文節とみなす
 */
const isSingleWord = (text: string): boolean => {
  const normalized = katakanaToHiragana(text.normalize('NFKC'));
  if (/\s/.test(normalized)) return false;
  // 漢字の後に接続助詞が続くパターン（例: 真夏の休み → 夏の）
  if (/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF][のはがをでにともへ]/.test(normalized)) return false;
  // 漢字の後に複合助詞が続くパターン（例: 夏から・仕事まで）
  if (/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF](から|まで|など|より)/.test(normalized)) return false;
  return true;
};

/**
 * ヒントの被り判定を行う（完全一致 + お題一致）。
 * お題と同じヒント・単語でないヒントは先に除外し、NFKC正規化 + 小文字化で比較して
 * 2回以上出現したワードは全て isDuplicate: true とする。
 *
 * @param hints - プレイヤーが提出した生のヒント配列
 * @param topic - 今ラウンドのお題（お題と同じヒントは無条件で無効）
 * @returns 被り判定済みの新しい Hint 配列
 */
export const checkDuplicateHints = (
  hints: readonly Omit<Hint, 'isDuplicate'>[],
  topic: string,
): readonly Hint[] => {
  const normalizedTopic = normalizeText(topic);

  // 単語でない・お題と同じヒントを除外（重複チェック対象から外す）
  const validHints = hints.filter(
    (h) => isSingleWord(h.text) && normalizeText(h.text) !== normalizedTopic,
  );

  const normalizedCounts = new Map<string, number>();
  for (const hint of validHints) {
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
    if (!isSingleWord(hint.text)) {
      return { ...hint, isDuplicate: true, duplicateReason: 'not-word' as const };
    }
    if (normalizeText(hint.text) === normalizedTopic) {
      return { ...hint, isDuplicate: true, duplicateReason: 'topic' as const };
    }
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
