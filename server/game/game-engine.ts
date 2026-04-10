import type { Server } from 'socket.io';
import type { GamePhase, RevealedHint, TeamRoundResult, TeamFinalResult, TeamRoundInfo } from '@shared/types/game.js';
import type { ServerEvents, ClientEvents } from '@shared/types/events.js';
import { GAME_CONFIG } from '@shared/constants/game-config.js';
import type { GameSession, TeamRoundState } from './session-manager.js';
import { updateSession, getSession, getSocketIdByPlayerId } from './session-manager.js';
import { checkDuplicateHints, mergeSynonymDuplicates } from './hint-checker.js';
import { checkSynonyms } from './synonym-checker.js';
import { calculateRoundScore } from './scorer.js';
import { scheduleBotHints, scheduleBotAnswers } from './bot-scheduler.js';
import { cancelBotTimeouts } from './bot-timeout-registry.js';
import { createTopicProvider } from './topic-provider.js';

type AppServer = Server<ClientEvents, ServerEvents>;

// ---------------------------------------------------------------
// Double-execution guard for async finishHintWriting
// ---------------------------------------------------------------

/** 処理中のセッションコードを追跡し、finishHintWriting の二重実行を防ぐ */
const processingHintWriting = new Set<string>();

// ---------------------------------------------------------------
// Timer helpers
// ---------------------------------------------------------------

/** タイマーのコールバックと残り時間を追跡するストア（ポーズ/リジューム用） */
const timerCallbacks = new Map<string, {
  readonly onExpire: () => void;
  remaining: number;
}>();

const clearSessionTimer = (session: GameSession): GameSession => {
  if (session.timerId) {
    clearInterval(session.timerId);
  }
  timerCallbacks.delete(session.code);
  return { ...session, timerId: null, pausedTimeRemaining: null };
};

const startTimer = (
  io: AppServer,
  sessionCode: string,
  durationSeconds: number,
  onExpire: () => void,
): ReturnType<typeof setInterval> => {
  const state = { onExpire, remaining: durationSeconds };
  timerCallbacks.set(sessionCode, state);

  const timerId = setInterval(() => {
    state.remaining -= 1;
    io.to(sessionCode).emit('game:timer-tick', { timeRemaining: state.remaining });

    if (state.remaining <= 0) {
      clearInterval(timerId);
      timerCallbacks.delete(sessionCode);
      onExpire();
    }
  }, 1000);

  return timerId;
};

/**
 * 現在のタイマーを一時停止する。
 */
export const pauseTimer = (sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session || !session.timerId) return;

  const timerState = timerCallbacks.get(sessionCode);
  if (!timerState) return;

  // タイマーを停止し、残り時間を保存
  clearInterval(session.timerId);
  updateSession(sessionCode, (s) => ({
    ...s,
    timerId: null,
    pausedTimeRemaining: timerState.remaining,
  }));
};

/**
 * 一時停止したタイマーを再開する。
 */
export const resumeTimer = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session || session.pausedTimeRemaining === null) return;

  const timerState = timerCallbacks.get(sessionCode);
  if (!timerState) return;

  const remaining = session.pausedTimeRemaining;
  const { onExpire } = timerState;

  // 新しいタイマーを開始（残り時間から再開）
  const timerId = startTimer(io, sessionCode, remaining, onExpire);

  updateSession(sessionCode, (s) => ({
    ...s,
    timerId,
    pausedTimeRemaining: null,
  }));
};

// ---------------------------------------------------------------
// Phase transition helpers
// ---------------------------------------------------------------

/**
 * フェーズを変更し、クライアントに通知する。
 */
const changePhase = (
  io: AppServer,
  sessionCode: string,
  phase: GamePhase,
  timeRemaining: number,
): GameSession | undefined =>
  updateSession(sessionCode, (session) => {
    const cleared = clearSessionTimer(session);
    io.to(sessionCode).emit('game:phase-change', { phase, timeRemaining });
    return { ...cleared, phase };
  });

// ---------------------------------------------------------------
// Round initialization
// ---------------------------------------------------------------

/**
 * 新しいラウンドを開始する。
 * 各チームの回答者をローテーションで選出し、お題を配布する。
 */
export const startRound = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session) return;

  const nextRound = session.currentRound + 1;

  // 全チーム共通のお題を1つ選ぶ
  const sharedTopic = session.topicProvider.next();

  // 各チームのラウンド状態を構築
  const newGuesserRotation = new Map(session.guesserRotation);

  // 最大チーム人数（ヒント数の公平基準）
  const maxTeamSize = Math.max(...session.teams.map((t) => t.memberIds.length));

  const teamRoundStates: TeamRoundState[] = session.teams.map((team) => {
    const currentIndex = newGuesserRotation.get(team.id) ?? 0;
    const guesserId = team.memberIds[currentIndex % team.memberIds.length];
    newGuesserRotation.set(team.id, currentIndex + 1);

    // 人数差の分だけ追加ヒントが必要なプレイヤーをランダム選出
    const hinters = [...team.memberIds.filter((id) => id !== guesserId)];
    const extraNeeded = Math.max(0, maxTeamSize - team.memberIds.length);
    // Fisher-Yates shuffle してから先頭 extraNeeded 件を採用
    for (let i = hinters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hinters[i], hinters[j]] = [hinters[j], hinters[i]];
    }
    const doubleHintPlayerIds = hinters.slice(0, extraNeeded);

    return {
      teamId: team.id,
      guesserId,
      doubleHintPlayerIds,
      topic: sharedTopic,
      hints: [],
      checkedHints: [],
      answer: null,
      score: 0,
    };
  });

  // ルーム更新
  updateSession(sessionCode, (s) => ({
    ...s,
    currentRound: nextRound,
    teamRoundStates,
    guesserRotation: newGuesserRotation,
  }));

  // クライアントに round-start を送信
  const teamsInfo: readonly TeamRoundInfo[] = teamRoundStates.map((trs) => {
    const player = session.players.find((p) => p.id === trs.guesserId);
    return {
      teamId: trs.teamId,
      guesserId: trs.guesserId,
      guesserName: player?.name ?? 'Unknown',
      doubleHintPlayerIds: [...trs.doubleHintPlayerIds],
    };
  });

  // 回答者にはお題を隠す（空文字を送信）
  const guesserIds = new Set(teamRoundStates.map((trs) => trs.guesserId));

  for (const player of session.players) {
    if (player.isBot) continue;

    const isGuesser = guesserIds.has(player.id);
    const socketId = getSocketIdByPlayerId(player.id);

    io.to(socketId).emit('game:round-start', {
      round: nextRound,
      totalRounds: session.totalRounds,
      topic: isGuesser ? '' : sharedTopic,
      teams: teamsInfo,
    });
  }

  // TOPIC_REVEAL フェーズへ
  startTopicRevealPhase(io, sessionCode);
};

// ---------------------------------------------------------------
// Phase: TOPIC_REVEAL
// ---------------------------------------------------------------

const startTopicRevealPhase = (io: AppServer, sessionCode: string): void => {
  const updated = changePhase(
    io,
    sessionCode,
    'TOPIC_REVEAL',
    GAME_CONFIG.TOPIC_REVEAL_SECONDS,
  );
  if (!updated) return;

  const timerId = startTimer(
    io,
    sessionCode,
    GAME_CONFIG.TOPIC_REVEAL_SECONDS,
    () => startHintWritingPhase(io, sessionCode),
  );

  updateSession(sessionCode, (s) => ({ ...s, timerId }));
};

// ---------------------------------------------------------------
// Phase: HINT_WRITING
// ---------------------------------------------------------------

const startHintWritingPhase = (io: AppServer, sessionCode: string): void => {
  const updated = changePhase(
    io,
    sessionCode,
    'HINT_WRITING',
    GAME_CONFIG.HINT_WRITING_SECONDS,
  );
  if (!updated) return;

  const timerId = startTimer(
    io,
    sessionCode,
    GAME_CONFIG.HINT_WRITING_SECONDS,
    () => { finishHintWriting(io, sessionCode).catch(console.error); },
  );

  updateSession(sessionCode, (s) => ({ ...s, timerId }));

  // ボットのヒントを自動提出
  scheduleBotHints(io, sessionCode);
};

/**
 * ヒント提出を処理する。
 */
export const submitHint = (
  io: AppServer,
  sessionCode: string,
  playerId: string,
  hintText: string,
  rawText: string,
): void => {
  const session = getSession(sessionCode);
  if (!session || session.phase !== 'HINT_WRITING') return;

  // プレイヤーが所属するチームと、そのラウンド状態を見つける
  const teamIndex = session.teams.findIndex((t) =>
    t.memberIds.includes(playerId),
  );
  if (teamIndex === -1) return;

  const teamRound = session.teamRoundStates[teamIndex];

  // 回答者はヒントを出せない
  if (teamRound.guesserId === playerId) return;

  // 提出済み件数チェック（ダブルヒント担当者は2回まで、それ以外は1回まで）
  const playerHintCount = teamRound.hints.filter((h) => h.playerId === playerId).length;
  const isDoubleHintPlayer = teamRound.doubleHintPlayerIds.includes(playerId);
  const maxAllowed = isDoubleHintPlayer ? 2 : 1;
  if (playerHintCount >= maxAllowed) return;

  const newHint = { playerId, text: hintText, rawText };

  const updatedTeamRoundStates = session.teamRoundStates.map((trs, i) =>
    i === teamIndex ? { ...trs, hints: [...trs.hints, newHint] } : trs,
  );

  updateSession(sessionCode, (s) => ({
    ...s,
    teamRoundStates: updatedTeamRoundStates,
  }));

  // ヒント提出通知（チーム全員に）
  const team = session.teams[teamIndex];
  const totalHinters = team.memberIds.length - 1; // 回答者を除く
  const totalExpected = totalHinters + teamRound.doubleHintPlayerIds.length;
  const submittedCount = teamRound.hints.length + 1;

  for (const memberId of team.memberIds) {
    const memberPlayer = session.players.find((p) => p.id === memberId);
    if (memberPlayer?.isBot) continue;

    io.to(getSocketIdByPlayerId(memberId)).emit('game:hint-submitted', {
      playerId,
      submittedCount,
      totalHinters: totalExpected,
    });
  }

  // 全チームで全員提出済みなら早期完了
  const updatedSession = getSession(sessionCode);
  if (updatedSession && allHintsSubmitted(updatedSession)) {
    finishHintWriting(io, sessionCode).catch(console.error);
  }
};

/**
 * 全チームでヒント全員提出済みかチェック。
 */
const allHintsSubmitted = (session: GameSession): boolean =>
  session.teamRoundStates.every((trs) => {
    const team = session.teams.find((t) => t.id === trs.teamId);
    if (!team) return false;
    const totalHinters = team.memberIds.length - 1;
    const totalExpected = totalHinters + trs.doubleHintPlayerIds.length;
    return trs.hints.length >= totalExpected;
  });

/**
 * ヒント記入フェーズを終了し、被りチェックフェーズへ進む。
 * 完全一致チェック後、Claude Haiku で同義語チェックを非同期実行する。
 */
const finishHintWriting = async (io: AppServer, sessionCode: string): Promise<void> => {
  const session = getSession(sessionCode);
  if (!session) return;
  // 既にフェーズが進んでいる場合は何もしない（フェーズ確認）
  if (session.phase !== 'HINT_WRITING') return;
  // async 待機中の二重実行を防ぐ
  if (processingHintWriting.has(sessionCode)) return;
  processingHintWriting.add(sessionCode);

  try {
    // タイマーを即座にクリア（async 待機前に）
    updateSession(sessionCode, (s) => clearSessionTimer(s));

    // 完全一致チェック（同期）
    const exactCheckedStates = session.teamRoundStates.map((trs) => ({
      ...trs,
      checkedHints: checkDuplicateHints(trs.hints, trs.topic),
    }));

    // 同義語チェック（async、チームごとに並列実行）
    const synonymCheckedStates = await Promise.all(
      exactCheckedStates.map(async (trs) => {
        const nonDuplicateHints = trs.checkedHints.filter((h) => !h.isDuplicate);
        if (nonDuplicateHints.length < 2) return trs;
        const synonymResult = await checkSynonyms(
          nonDuplicateHints.map((h) => h.text),
          trs.topic,
        );
        return {
          ...trs,
          checkedHints: mergeSynonymDuplicates(trs.checkedHints, synonymResult),
        };
      }),
    );

    updateSession(sessionCode, (s) => ({
      ...s,
      teamRoundStates: synonymCheckedStates,
    }));

    startHintCheckingPhase(io, sessionCode);
  } finally {
    processingHintWriting.delete(sessionCode);
  }
};

// ---------------------------------------------------------------
// Phase: HINT_CHECKING
// ---------------------------------------------------------------

const startHintCheckingPhase = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session) return;

  changePhase(
    io,
    sessionCode,
    'HINT_CHECKING',
    GAME_CONFIG.HINT_CHECKING_SECONDS,
  );

  // 各チームのヒントを公開（回答者には被りが消されたものを見せるのはANSWERINGフェーズ）
  // HINT_CHECKINGではヒントギバーたちに被り結果を表示する
  for (const trs of session.teamRoundStates) {
    const team = session.teams.find((t) => t.id === trs.teamId);
    if (!team) continue;

    const revealedHints: readonly RevealedHint[] = trs.checkedHints.map((h) => {
      const player = session.players.find((p) => p.id === h.playerId);
      return {
        playerId: h.playerId,
        playerName: player?.name ?? 'Unknown',
        text: h.text,
        isDuplicate: h.isDuplicate,
        duplicateReason: h.duplicateReason,
      };
    });

    // ヒントギバーのみに全ヒント（被り付き）を送信
    for (const memberId of team.memberIds) {
      if (memberId === trs.guesserId) continue;
      const memberPlayer = session.players.find((p) => p.id === memberId);
      if (memberPlayer?.isBot) continue;

      io.to(getSocketIdByPlayerId(memberId)).emit('game:hints-revealed', {
        teamId: trs.teamId,
        hints: revealedHints,
      });
    }
  }

  const timerId = startTimer(
    io,
    sessionCode,
    GAME_CONFIG.HINT_CHECKING_SECONDS,
    () => startAnsweringPhase(io, sessionCode),
  );

  updateSession(sessionCode, (s) => ({ ...s, timerId }));
};

// ---------------------------------------------------------------
// Phase: ANSWERING
// ---------------------------------------------------------------

const startAnsweringPhase = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session) return;

  changePhase(
    io,
    sessionCode,
    'ANSWERING',
    GAME_CONFIG.ANSWERING_SECONDS,
  );

  // 回答者にユニークなヒントのみ公開
  for (const trs of session.teamRoundStates) {
    const team = session.teams.find((t) => t.id === trs.teamId);
    if (!team) continue;

    const uniqueHints: readonly RevealedHint[] = trs.checkedHints
      .filter((h) => !h.isDuplicate)
      .map((h) => {
        const player = session.players.find((p) => p.id === h.playerId);
        return {
          playerId: h.playerId,
          playerName: player?.name ?? 'Unknown',
          text: h.text,
          isDuplicate: false,
        };
      });

    // 回答者にユニークなヒントを送信（ボットはスキップ）
    const guesserPlayer = session.players.find((p) => p.id === trs.guesserId);
    if (!guesserPlayer?.isBot) {
      io.to(getSocketIdByPlayerId(trs.guesserId)).emit('game:hints-revealed', {
        teamId: trs.teamId,
        hints: uniqueHints,
      });
    }
  }

  const timerId = startTimer(
    io,
    sessionCode,
    GAME_CONFIG.ANSWERING_SECONDS,
    () => finishAnswering(io, sessionCode),
  );

  updateSession(sessionCode, (s) => ({ ...s, timerId }));

  // ボットの回答を自動提出
  scheduleBotAnswers(io, sessionCode);
};

/**
 * 回答を処理する。
 */
export const submitAnswer = (
  io: AppServer,
  sessionCode: string,
  playerId: string,
  answerText: string,
): void => {
  const session = getSession(sessionCode);
  if (!session || session.phase !== 'ANSWERING') return;

  // 回答者であるチームを検索
  const teamIndex = session.teamRoundStates.findIndex(
    (trs) => trs.guesserId === playerId,
  );
  if (teamIndex === -1) return;

  const teamRound = session.teamRoundStates[teamIndex];

  // 既に回答済み
  if (teamRound.answer !== null) return;

  const updatedTeamRoundStates = session.teamRoundStates.map((trs, i) =>
    i === teamIndex ? { ...trs, answer: answerText } : trs,
  );

  updateSession(sessionCode, (s) => ({
    ...s,
    teamRoundStates: updatedTeamRoundStates,
  }));

  // 全チーム回答済みなら早期完了
  const updatedSession = getSession(sessionCode);
  if (updatedSession && allAnswersSubmitted(updatedSession)) {
    finishAnswering(io, sessionCode);
  }
};

const allAnswersSubmitted = (session: GameSession): boolean =>
  session.teamRoundStates.every((trs) => trs.answer !== null);

const finishAnswering = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session) return;
  if (session.phase !== 'ANSWERING') return;

  updateSession(sessionCode, (s) => clearSessionTimer(s));
  cancelBotTimeouts(sessionCode);

  if (session.progressionMode === 'manual') {
    // 手動モード: 結果表示せず、ホストの「答え合わせ」ボタンを待つ
    // タイマーを0にしてクライアントに回答完了を伝える
    io.to(sessionCode).emit('game:timer-tick', { timeRemaining: 0 });
    return;
  }

  showRoundResult(io, sessionCode).catch(console.error);
};

/**
 * ホストが「答え合わせ」を実行する（手動モード用）。
 */
export const revealResult = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session || session.phase !== 'ANSWERING') return;

  updateSession(sessionCode, (s) => clearSessionTimer(s));
  showRoundResult(io, sessionCode).catch(console.error);
};

// ---------------------------------------------------------------
// Phase: ROUND_RESULT
// ---------------------------------------------------------------

const showRoundResult = async (io: AppServer, sessionCode: string): Promise<void> => {
  const session = getSession(sessionCode);
  if (!session) return;

  // スコア計算（Claude Haiku による類似判定を含む非同期処理）
  const newTotalScores = new Map(session.totalScores);
  const results: TeamRoundResult[] = [];

  const scoreResults = await Promise.all(
    session.teamRoundStates.map((trs) =>
      calculateRoundScore(trs.answer, trs.topic, trs.checkedHints),
    ),
  );

  const scoredTeamRoundStates = session.teamRoundStates.map((trs, i) => {
    const { isCorrect, allHintsUnique, score } = scoreResults[i];

    const currentTotal = newTotalScores.get(trs.teamId) ?? 0;
    const newTotal = currentTotal + score;
    newTotalScores.set(trs.teamId, newTotal);

    const team = session.teams.find((t) => t.id === trs.teamId);
    const guesser = session.players.find((p) => p.id === trs.guesserId);

    const revealedHints: readonly RevealedHint[] = trs.checkedHints.map((h) => {
      const player = session.players.find((p) => p.id === h.playerId);
      return {
        playerId: h.playerId,
        playerName: player?.name ?? 'Unknown',
        text: h.text,
        isDuplicate: h.isDuplicate,
        duplicateReason: h.duplicateReason,
      };
    });

    results.push({
      teamId: trs.teamId,
      teamName: team?.name ?? 'Unknown',
      topic: trs.topic,
      guesserName: guesser?.name ?? 'Unknown',
      answer: trs.answer,
      isCorrect,
      allHintsUnique,
      score,
      totalScore: newTotal,
      hints: revealedHints,
    });

    return { ...trs, score };
  });

  updateSession(sessionCode, (s) => ({
    ...s,
    teamRoundStates: scoredTeamRoundStates,
    totalScores: newTotalScores,
    roundHistory: [...s.roundHistory, scoredTeamRoundStates],
  }));

  changePhase(
    io,
    sessionCode,
    'ROUND_RESULT',
    GAME_CONFIG.ROUND_RESULT_SECONDS,
  );

  io.to(sessionCode).emit('game:round-result', { results });

  // progressionMode に応じた遷移制御
  const updatedSession = getSession(sessionCode);
  if (updatedSession?.progressionMode === 'auto') {
    // auto: タイマー完了後に自動的に次のラウンドへ遷移する
    const timerId = startTimer(
      io,
      sessionCode,
      GAME_CONFIG.ROUND_RESULT_SECONDS,
      () => proceedToNextRound(io, sessionCode),
    );
    updateSession(sessionCode, (s) => ({ ...s, timerId }));
  } else {
    // manual: 表示タイマーは動かすが、自動遷移はしない。host:next-round を待つ。
    const timerId = startTimer(
      io,
      sessionCode,
      GAME_CONFIG.ROUND_RESULT_SECONDS,
      () => {
        // タイマー切れでも自動遷移はしない。ホストの操作を待つ。
        updateSession(sessionCode, (s) => ({ ...s, timerId: null }));
      },
    );
    updateSession(sessionCode, (s) => ({ ...s, timerId }));
  }
};

// ---------------------------------------------------------------
// Next Round / Final Result
// ---------------------------------------------------------------

/**
 * 次のラウンドへ進むか、最終結果を表示する。
 */
export const proceedToNextRound = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session) return;
  if (session.phase !== 'ROUND_RESULT') return;

  updateSession(sessionCode, (s) => clearSessionTimer(s));

  if (session.currentRound >= session.totalRounds) {
    showFinalResult(io, sessionCode);
  } else {
    startRound(io, sessionCode);
  }
};

/**
 * ルームの最終結果ランキングを組み立てる。
 * showFinalResult と player:rejoin の両方で使用する。
 */
export const buildFinalResults = (session: GameSession): TeamFinalResult[] => {
  const teamScores = session.teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    totalScore: session.totalScores.get(team.id) ?? 0,
  }));

  const sorted = [...teamScores].sort((a, b) => b.totalScore - a.totalScore);

  const rankings: TeamFinalResult[] = sorted.reduce<TeamFinalResult[]>((acc, entry, index) => {
    const rank =
      index > 0 && sorted[index - 1].totalScore === entry.totalScore
        ? (acc[index - 1]?.rank ?? index + 1)
        : index + 1;

    let cumulativeScore = 0;
    const roundResults: TeamRoundResult[] = session.roundHistory.map((roundStates) => {
      const trs = roundStates.find((s) => s.teamId === entry.teamId);
      if (!trs) {
        return {
          teamId: entry.teamId,
          teamName: entry.teamName,
          topic: '',
          guesserName: '',
          answer: null,
          isCorrect: false,
          allHintsUnique: false,
          score: 0,
          totalScore: cumulativeScore,
          hints: [],
        };
      }

      const guesser = session.players.find((p) => p.id === trs.guesserId);
      const hints: readonly RevealedHint[] = trs.checkedHints.map((h) => {
        const player = session.players.find((p) => p.id === h.playerId);
        return {
          playerId: h.playerId,
          playerName: player?.name ?? 'Unknown',
          text: h.text,
          isDuplicate: h.isDuplicate,
          duplicateReason: h.duplicateReason,
        };
      });

      cumulativeScore += trs.score;

      return {
        teamId: trs.teamId,
        teamName: entry.teamName,
        topic: trs.topic,
        guesserName: guesser?.name ?? 'Unknown',
        answer: trs.answer,
        isCorrect: trs.score > 0,
        allHintsUnique: trs.checkedHints.every((h) => !h.isDuplicate),
        score: trs.score,
        totalScore: cumulativeScore,
        hints,
      };
    });

    return [...acc, {
      teamId: entry.teamId,
      teamName: entry.teamName,
      totalScore: entry.totalScore,
      rank,
      roundResults,
    }];
  }, []);

  return rankings;
};

const showFinalResult = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session) return;

  changePhase(io, sessionCode, 'FINAL_RESULT', 0);

  const rankings = buildFinalResults(session);
  io.to(sessionCode).emit('game:final-result', { rankings });
};

// ---------------------------------------------------------------
// MC Override
// ---------------------------------------------------------------

/**
 * ホストが正誤判定を上書きする。
 */
export const overrideResult = (
  io: AppServer,
  sessionCode: string,
  teamId: string,
  isCorrect: boolean,
): void => {
  const session = getSession(sessionCode);
  if (!session || session.phase !== 'ROUND_RESULT') return;

  const trsIndex = session.teamRoundStates.findIndex((t) => t.teamId === teamId);
  if (trsIndex === -1) return;

  const trs = session.teamRoundStates[trsIndex];
  const allHintsUnique = trs.checkedHints.every((h) => !h.isDuplicate);
  const newScore = isCorrect
    ? GAME_CONFIG.CORRECT_SCORE + (allHintsUnique ? GAME_CONFIG.ALL_UNIQUE_BONUS : 0)
    : 0;
  const scoreDiff = newScore - trs.score;

  const updatedTeamRoundStates = session.teamRoundStates.map((t, i) =>
    i === trsIndex ? { ...t, score: newScore } : t,
  );

  const newTotalScores = new Map(session.totalScores);
  const currentTotal = newTotalScores.get(teamId) ?? 0;
  newTotalScores.set(teamId, currentTotal + scoreDiff);

  // roundHistory の最終ラウンドも更新してスコアを同期する
  const updatedRoundHistory = session.roundHistory.map((round, i) => {
    if (i !== session.roundHistory.length - 1) return round;
    return round.map((t) => t.teamId === teamId ? { ...t, score: newScore } : t);
  });

  updateSession(sessionCode, (s) => ({
    ...s,
    teamRoundStates: updatedTeamRoundStates,
    totalScores: newTotalScores,
    roundHistory: updatedRoundHistory,
  }));

  // Rebuild and re-broadcast results
  const updatedSession = getSession(sessionCode);
  if (!updatedSession) return;

  const results: TeamRoundResult[] = updatedSession.teamRoundStates.map((t) => {
    const team = updatedSession.teams.find((tm) => tm.id === t.teamId);
    const guesser = updatedSession.players.find((p) => p.id === t.guesserId);
    const revealedHints: readonly RevealedHint[] = t.checkedHints.map((h) => {
      const player = updatedSession.players.find((p) => p.id === h.playerId);
      return {
        playerId: h.playerId,
        playerName: player?.name ?? 'Unknown',
        text: h.text,
        isDuplicate: h.isDuplicate,
        duplicateReason: h.duplicateReason,
      };
    });

    return {
      teamId: t.teamId,
      teamName: team?.name ?? 'Unknown',
      topic: t.topic,
      guesserName: guesser?.name ?? 'Unknown',
      answer: t.answer,
      isCorrect: t.score > 0,
      allHintsUnique: t.checkedHints.every((h) => !h.isDuplicate),
      score: t.score,
      totalScore: updatedSession.totalScores.get(t.teamId) ?? 0,
      hints: revealedHints,
    };
  });

  io.to(sessionCode).emit('game:round-result', { results });
};

// ---------------------------------------------------------------
// Play Again (reset to lobby)
// ---------------------------------------------------------------

/**
 * ゲームをリセットしてロビーに戻る。
 */
export const resetGameToLobby = (io: AppServer, sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session) return;

  const cleared = clearSessionTimer(session);
  cancelBotTimeouts(sessionCode);

  updateSession(sessionCode, () => ({
    ...cleared,
    phase: 'LOBBY' as const,
    teams: [],
    currentRound: 0,
    teamRoundStates: [],
    totalScores: new Map(),
    roundHistory: [],
    topicProvider: createTopicProvider(),
    guesserRotation: new Map(),
  }));

  const updated = getSession(sessionCode);
  if (!updated) return;

  io.to(sessionCode).emit('session:game-reset', { players: updated.players });
  io.to(sessionCode).emit('game:phase-change', { phase: 'LOBBY', timeRemaining: 0 });
};

// ---------------------------------------------------------------
// Timer remaining helper (for reconnection)
// ---------------------------------------------------------------

/**
 * 現在のタイマー残り時間を取得する。
 * ポーズ中は session.pausedTimeRemaining を返す。
 */
export const getTimerRemaining = (sessionCode: string): number => {
  const session = getSession(sessionCode);
  if (session?.pausedTimeRemaining !== null && session?.pausedTimeRemaining !== undefined) {
    return session.pausedTimeRemaining;
  }
  const timerState = timerCallbacks.get(sessionCode);
  return timerState?.remaining ?? 0;
};

// ---------------------------------------------------------------
// Team assignment
// ---------------------------------------------------------------

/**
 * チーム確定後、ゲームの初期スコアを設定する。
 */
export const initializeGameScores = (sessionCode: string): void => {
  const session = getSession(sessionCode);
  if (!session) return;

  const initialScores = new Map<string, number>();
  const initialRotation = new Map<string, number>();

  for (const team of session.teams) {
    initialScores.set(team.id, 0);
    initialRotation.set(team.id, 0);
  }

  updateSession(sessionCode, (s) => ({
    ...s,
    totalScores: initialScores,
    guesserRotation: initialRotation,
  }));
};
