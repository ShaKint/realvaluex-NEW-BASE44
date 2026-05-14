/**
 * @file Claude Client - wrapper around Anthropic SDK
 * @description Centralized API for calling Claude models with retry, JSON parsing, and usage tracking.
 *
 * Models used per layer (per RealValueX brief):
 *   - Layer analysis: claude-opus-4-7 (deepest reasoning)
 *   - Scanner (3C-future): claude-sonnet-4-6
 *   - News snippets: claude-haiku-4-5-20251001
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Singleton client (reuses ANTHROPIC_API_KEY from env, same as index.js)
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

const DEFAULT_TIMEOUT_MS = 120000; // 2 minutes - Opus is slow on complex reasoning
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
 * Handles common cases:
 *   - Pure JSON (returns as-is)
 *   - JSON inside ```json ... ``` fence
 *   - JSON with leading/trailing text
 *
 * @param {string} text
 * @returns {Object} parsed JSON
 * @throws {Error} if no valid JSON found
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
 *
 * @param {Object} opts
 * @param {string} opts.model - one of MODELS.*
 * @param {string} opts.system - system prompt
 * @param {string} opts.userMessage - user message content
 * @param {number} [opts.maxTokens=4096]
 * @param {number} [opts.temperature=0.3] - lower = more deterministic (good for analysis)
 * @param {number} [opts.timeoutMs=DEFAULT_TIMEOUT_MS]
 * @returns {Promise<{json: Object, usage: {input_tokens: number, output_tokens: number}, raw_text: string}>}
 */
export async function callClaudeForJson({
  model,
  system,
  userMessage,
  maxTokens = 4096,
  temperature = 0.3,
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
          temperature,
          system,
          messages: [{ role: 'user', content: userMessage }],
        },
        { timeout: timeoutMs }
      );

      // Extract text content
      const textBlocks = response.content.filter(b => b.type === 'text');
      const rawText = textBlocks.map(b => b.text).join('\n');

      if (!rawText) {
        throw new ClaudeError('Empty response from Claude', { raw: response });
      }

      // Parse JSON
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

      // Determine if retryable
      const statusCode = err.status || err.statusCode;
      const isRetryable =
        statusCode === 429 ||  // rate limit
        statusCode === 503 ||  // service unavailable
        statusCode === 529 ||  // overloaded
        err.name === 'AbortError';

      if (!isRetryable || attempt === MAX_RETRIES) {
        if (err instanceof ClaudeError) throw err;
        throw new ClaudeError(`Claude API error: ${err.message}`, {
          statusCode,
          retryable: isRetryable,
        });
      }

      // Exponential backoff: 1s, 2s
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`[claude-client] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms due to:`, err.message);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

/**
 * Simple text-only call (no JSON parsing). For future use.
 */
export async function callClaudeForText({
  model,
  system,
  userMessage,
  maxTokens = 2048,
  temperature = 0.5,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const client = getClient();
  const response = await client.messages.create(
    {
      model,
      max_tokens: maxTokens,
      temperature,
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
