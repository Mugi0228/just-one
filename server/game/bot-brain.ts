import { WORD_MAP, CATEGORY_FALLBACK } from './bot-word-map.js';

/**
 * テキストを正規化する（比較用）。
 */
const normalize = (text: string): string =>
  text.toLowerCase().normalize('NFKC').trim();

/**
 * ボットがヒントを1つ生成する。
 * 同じプールからランダムに選ぶため、ボット同士で被りが自然に発生する。
 */
export const generateBotHint = (topic: string): string => {
  const associations = WORD_MAP[topic];
  if (associations && associations.length > 0) {
    const index = Math.floor(Math.random() * associations.length);
    return associations[index];
  }

  // フォールバック: カテゴリベースの汎用ワード
  const categories = Object.values(CATEGORY_FALLBACK);
  const fallbackPool = categories[Math.floor(Math.random() * categories.length)];
  return fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
};

/**
 * ボットが回答を推測する。
 * ヒントからWORD_MAPを逆引きし、最も一致するお題を返す。
 * 意図的に20%の確率で間違えてゲーム性を維持する。
 */
export const generateBotAnswer = (
  visibleHints: readonly string[],
  actualTopic: string,
): string => {
  if (visibleHints.length === 0) {
    // ヒントが全部消えた場合はランダムな回答
    const allTopics = Object.keys(WORD_MAP);
    return allTopics[Math.floor(Math.random() * allTopics.length)];
  }

  // WORD_MAPを逆引きしてスコアリング
  let bestTopic = '';
  let bestScore = 0;

  for (const [candidate, associations] of Object.entries(WORD_MAP)) {
    const normalizedAssociations = associations.map(normalize);
    const matchCount = visibleHints.filter((hint) =>
      normalizedAssociations.some((a) => a === normalize(hint)),
    ).length;

    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestTopic = candidate;
    }
  }

  // 20%の確率で意図的に間違える（ゲーム性維持）
  if (Math.random() < 0.2 || bestScore === 0) {
    // 関連性のある別のお題を返す（完全にランダムだと不自然なので）
    const allTopics = Object.keys(WORD_MAP);
    const wrongTopics = allTopics.filter((t) => t !== actualTopic);
    return wrongTopics[Math.floor(Math.random() * wrongTopics.length)];
  }

  return bestTopic;
};
