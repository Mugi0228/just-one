/** ルームコード → アクティブなボットタイムアウトハンドルのセット */
const botTimeouts = new Map<string, Set<ReturnType<typeof setTimeout>>>();

export const trackBotTimeout = (
  sessionCode: string,
  handle: ReturnType<typeof setTimeout>,
): void => {
  const existing = botTimeouts.get(sessionCode);
  if (existing) {
    existing.add(handle);
  } else {
    botTimeouts.set(sessionCode, new Set([handle]));
  }
};

export const untrackBotTimeout = (
  sessionCode: string,
  handle: ReturnType<typeof setTimeout>,
): void => {
  botTimeouts.get(sessionCode)?.delete(handle);
};

/**
 * ルームのすべてのボットタイムアウトをキャンセルする。
 * ルーム削除時に呼び出す。
 */
export const cancelBotTimeouts = (sessionCode: string): void => {
  const handles = botTimeouts.get(sessionCode);
  if (handles) {
    for (const handle of handles) {
      clearTimeout(handle);
    }
    botTimeouts.delete(sessionCode);
  }
};
