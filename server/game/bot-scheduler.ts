import type { Server } from 'socket.io';
import type { ClientEvents, ServerEvents } from '@shared/types/events.js';
import { getSession } from './session-manager.js';
import { submitHint, submitAnswer } from './game-engine.js';
import { generateBotHint, generateBotAnswer } from './bot-brain.js';
import { trackBotTimeout, untrackBotTimeout } from './bot-timeout-registry.js';

type AppServer = Server<ClientEvents, ServerEvents>;

/**
 * HINT_WRITING フェーズ開始時に、ボットのヒントを自動提出するスケジューラー。
 * 各ボットは1〜3秒のランダム遅延で提出する。
 */
export const scheduleBotHints = (
  io: AppServer,
  sessionCode: string,
): void => {
  const session = getSession(sessionCode);
  if (!session) return;

  for (const trs of session.teamRoundStates) {
    const team = session.teams.find((t) => t.id === trs.teamId);
    if (!team) continue;

    // ボットのヒント出し役を抽出
    const botHinterIds = team.memberIds.filter((id) => {
      if (id === trs.guesserId) return false;
      const player = session.players.find((p) => p.id === id);
      return player?.isBot === true;
    });

    for (const botId of botHinterIds) {
      const delay = 1000 + Math.floor(Math.random() * 2000);
      const handle = setTimeout(() => {
        untrackBotTimeout(sessionCode, handle);
        const currentSession = getSession(sessionCode);
        if (!currentSession || currentSession.phase !== 'HINT_WRITING') return;

        const hint = generateBotHint(trs.topic);
        submitHint(io, sessionCode, botId, hint, hint);
      }, delay);
      trackBotTimeout(sessionCode, handle);
    }
  }
};

/**
 * ANSWERING フェーズ開始時に、ボット回答者の回答を自動提出するスケジューラー。
 * 2〜5秒のランダム遅延で提出する。
 */
export const scheduleBotAnswers = (
  io: AppServer,
  sessionCode: string,
): void => {
  const session = getSession(sessionCode);
  if (!session) return;

  for (const trs of session.teamRoundStates) {
    const guesser = session.players.find((p) => p.id === trs.guesserId);
    if (!guesser?.isBot) continue;

    const delay = 2000 + Math.floor(Math.random() * 3000);
    const handle = setTimeout(() => {
      untrackBotTimeout(sessionCode, handle);
      const currentSession = getSession(sessionCode);
      if (!currentSession || currentSession.phase !== 'ANSWERING') return;

      const currentTrs = currentSession.teamRoundStates.find(
        (s) => s.teamId === trs.teamId,
      );
      if (!currentTrs) return;

      const visibleHints = currentTrs.checkedHints
        .filter((h) => !h.isDuplicate)
        .map((h) => h.text);

      const answer = generateBotAnswer(visibleHints, currentTrs.topic);
      submitAnswer(io, sessionCode, trs.guesserId, answer);
    }, delay);
    trackBotTimeout(sessionCode, handle);
  }
};
