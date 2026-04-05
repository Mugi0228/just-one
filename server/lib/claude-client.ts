import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;
let initialized = false;

/**
 * Anthropic クライアントのシングルトンを返す。
 * ANTHROPIC_API_KEY 未設定時は null を返す。
 */
export const getClaudeClient = (): Anthropic | null => {
  if (!initialized) {
    initialized = true;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      client = new Anthropic({ apiKey });
    }
  }
  return client;
};
