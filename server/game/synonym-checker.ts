import { getClaudeClient } from '../lib/claude-client.js';

export interface SynonymResult {
  readonly synonymGroups: readonly (readonly string[])[];
}

const EMPTY_RESULT: SynonymResult = { synonymGroups: [] };

/**
 * Claude Haiku を使って同義語グループを判定する。
 * API キー未設定・タイムアウト・パース失敗時はすべて空グループを返す。
 *
 * @param hints - 完全一致被りで除外されなかったヒントのテキスト一覧
 * @param topic - お題（文脈考慮のため）
 */
export const checkSynonyms = async (
  hints: readonly string[],
  topic: string,
): Promise<SynonymResult> => {
  if (hints.length < 2) return EMPTY_RESULT;

  const client = getClaudeClient();
  if (!client) return EMPTY_RESULT;

  const systemPrompt =
    'あなたは「Just One」というパーティーゲームの審判です。' +
    'ユーザーが提供するヒント一覧を分析し、同じ意味や非常に近い意味のヒントのグループを特定してください。' +
    '必ず {"synonymGroups": [...]} 形式のJSONのみを返してください。';

  const userPrompt =
    `お題: ${topic}\n` +
    `ヒント一覧: ${JSON.stringify(hints)}\n` +
    '同義語グループのみをJSON形式で返してください。\n' +
    '例: {"synonymGroups": [["車", "自動車"]]}\n' +
    'グループがない場合: {"synonymGroups": []}';

  try {
    const response = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('synonym check timeout')), 5000),
      ),
    ]);

    const content = response.content[0];
    if (content.type !== 'text') return EMPTY_RESULT;

    const match = content.text.trim().match(/\{[\s\S]*\}/);
    if (!match) return EMPTY_RESULT;

    const parsed = JSON.parse(match[0]) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !Array.isArray((parsed as Record<string, unknown>).synonymGroups)
    ) {
      return EMPTY_RESULT;
    }

    return {
      synonymGroups: (parsed as { synonymGroups: string[][] }).synonymGroups,
    };
  } catch {
    return EMPTY_RESULT;
  }
};
