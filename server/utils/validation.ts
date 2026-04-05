import { GAME_CONFIG } from '@shared/constants/game-config.js';

/** HTMLタグを除去する */
const stripHtmlTags = (input: string): string => input.replace(/<[^>]*>/g, '');

/** 制御文字・ゼロ幅スペース・RTL上書き文字などを除去する */
const stripControlChars = (input: string): string =>
  input.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF\u2028\u2029\u202A-\u202E]/g, '');

/** 前後の空白を除去し、HTMLタグと制御文字を取り除く */
const sanitize = (input: string): string => stripHtmlTags(stripControlChars(input)).trim();

export interface ValidationResult {
  readonly valid: boolean;
  readonly sanitized: string;
  readonly error?: string;
}

/** プレイヤー名のバリデーション */
export const validatePlayerName = (name: string): ValidationResult => {
  const sanitized = sanitize(name);

  if (sanitized.length === 0) {
    return { valid: false, sanitized, error: '名前を入力してください' };
  }

  if (sanitized.length > GAME_CONFIG.MAX_PLAYER_NAME_LENGTH) {
    return {
      valid: false,
      sanitized,
      error: `名前は${GAME_CONFIG.MAX_PLAYER_NAME_LENGTH}文字以内にしてください`,
    };
  }

  return { valid: true, sanitized };
};

/** ヒントのバリデーション */
export const validateHint = (hint: string): ValidationResult => {
  const sanitized = sanitize(hint);

  if (sanitized.length === 0) {
    return { valid: false, sanitized, error: 'ヒントを入力してください' };
  }

  if (sanitized.length > GAME_CONFIG.MAX_HINT_LENGTH) {
    return {
      valid: false,
      sanitized,
      error: `ヒントは${GAME_CONFIG.MAX_HINT_LENGTH}文字以内にしてください`,
    };
  }

  return { valid: true, sanitized };
};

/** 回答のバリデーション */
export const validateAnswer = (answer: string): ValidationResult => {
  const sanitized = sanitize(answer);

  if (sanitized.length === 0) {
    return { valid: false, sanitized, error: '回答を入力してください' };
  }

  if (sanitized.length > GAME_CONFIG.MAX_ANSWER_LENGTH) {
    return {
      valid: false,
      sanitized,
      error: `回答は${GAME_CONFIG.MAX_ANSWER_LENGTH}文字以内にしてください`,
    };
  }

  return { valid: true, sanitized };
};
