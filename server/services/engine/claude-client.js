/**
 * @file Claude Client - wrapper around Anthropic SDK
 * @description Centralized API for calling Claude models with retry, JSON parsing, and usage tracking.
 *
 * Note: temperature parameter is NOT supported by Claude Opus 4.7 (reasoning model).
 * Output determinism is controlled by the model itself.
 *
 * Models used per layer (per RealValueX brief):
 *   - Layer analysis: claude-opus-4-7 (deepest reasoning)
 *   - Scanner: claude-sonnet-4-6
 *   - News snippets: claude-haiku-4-5-20251001
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Singleton client (reuses ANTHROPIC_API_KEY from env)
// ============================================================================
let _client = null;
function getClient() {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

// ============================================================================
// Model constants
// ============================================================================
export const MODELS = {
  OPUS: 'claude-opus-4-7',
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',
};

const DEFAULT_TIMEOUT_MS = 120000;
const MAX_RETRIES = 2;

/**
 * Custom error for Claude API failures.
 */
export class ClaudeError extends Error {
  constructor(message, { statusCode, retryable = false, raw = null } = {}) {
    super(message);
    this.name = 'ClaudeError';
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.raw = raw;
  }
}

/**
 * Extract JSON object from text that may contain surrounding markdown/text.
 * @param {string} text
 * @returns {Object} parsed JSON
 */
export function extractJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Cannot extract JSON from empty/non-string input');
  }

  // Try 1: parse as-is
  try {
    return JSON.parse(text.trim());
  } catch (_) { /* fall through */ }

  // Try 2: extract from ```json ... ``` fence
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (_) { /* fall through */ }
  }

  // Try 3: find first { and matching last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) { /* fall through */ }
  }

  throw new Error(`Could not extract valid JSON from response (length: ${text.length})`);
}

/**
 * Call Claude with a system + user prompt, expecting JSON output.
 * Note: temperature is NOT sent (deprecated for Opus 4.7).
 *
 * @param {Object} opts
 * @param {string} opts.model
 * @param {string} opts.system
 * @param {string} opts.userMessage
 * @param {number} [opts.maxTokens=4096]
 * @param {number} [opts.timeoutMs=DEFAULT_TIMEOUT_MS]
 * @returns {Promise<{json: Object, usage: {input_tokens: number, output_tokens: number}, raw_text: string}>}
 */
export async function callClaudeForJson({
  model,
  system,
  userMessage,
  maxTokens = 4096,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!model || !system || !userMessage) {
    throw new ClaudeError('callClaudeForJson requires model, system, and userMessage');
  }

  const client = getClient();
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create(
        {
          model,
          max_tokens: maxTokens,
          system,
          messages: [{ role: 'user', content: userMessage }],
        },
        { timeout: timeoutMs }
      );

      const textBlocks = response.content.filter(b => b.type === 'text');
      const rawText = textBlocks.map(b => b.text).join('\n');

      if (!rawText) {
        throw new ClaudeError('Empty response from Claude', { raw: response });
      }

      let json;
      try {
        json = extractJson(rawText);
      } catch (parseErr) {
        throw new ClaudeError(`JSON parse failed: ${parseErr.message}`, {
          raw: rawText.substring(0, 500),
        });
      }

      return {
        json,
        usage: {
          input_tokens: response.usage?.input_tokens || 0,
          output_tokens: response.usage?.output_tokens || 0,
        },
        raw_text: rawText,
      };
    } catch (err) {
      lastError = err;

      const statusCode = err.status || err.statusCode;
      const isRetryable =
        statusCode === 429 ||
        statusCode === 503 ||
        statusCode === 529 ||
        err.name === 'AbortError';

      if (!isRetryable || attempt === MAX_RETRIES) {
        if (err instanceof ClaudeError) throw err;
        throw new ClaudeError(`Claude API error: ${err.message}`, {
          statusCode,
          retryable: isRetryable,
        });
      }

      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[claude-client] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms due to:`, err.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/**
 * Simple text-only call (no JSON parsing).
 */
export async function callClaudeForText({
  model,
  system,
  userMessage,
  maxTokens = 2048,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const client = getClient();
  const response = await client.messages.create(
    {
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    },
    { timeout: timeoutMs }
  );

  const textBlocks = response.content.filter(b => b.type === 'text');
  return {
    text: textBlocks.map(b => b.text).join('\n'),
    usage: {
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
    },
  };
}
