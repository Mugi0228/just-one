/**
 * ホスト切断タイムアウト管理（再接続猶予用）。
 * handler.ts と player-handlers.ts の両方から使うため独立モジュールにする。
 */
export const hostDisconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const HOST_DISCONNECT_TIMEOUT_MS = 60_000;

/**
 * ホスト再接続時に切断タイマーをキャンセルする。
 */
export const cancelHostDisconnectTimer = (sessionCode: string): void => {
  const timer = hostDisconnectTimers.get(sessionCode);
  if (timer) {
    clearTimeout(timer);
    hostDisconnectTimers.delete(sessionCode);
  }
};
