import { customAlphabet } from 'nanoid';
import { GAME_CONFIG } from '@shared/constants/game-config.js';

const UPPERCASE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const generate = customAlphabet(
  UPPERCASE_ALPHABET,
  GAME_CONFIG.SESSION_CODE_LENGTH,
);

/**
 * セッションコード（英大文字4文字）を生成する。
 * 既存コードとの衝突を避けるため、existingCodes を受け取り重複時はリトライする。
 */
export const generateSessionCode = (existingCodes: ReadonlySet<string>): string => {
  const MAX_RETRIES = 100;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const code = generate();
    if (!existingCodes.has(code)) {
      return code;
    }
  }

  throw new Error('Failed to generate a unique session code after maximum retries');
};
