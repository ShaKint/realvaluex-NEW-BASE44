/**
 * @file Claude Client - wrapper around Anthropic SDK
 * @description Centralized API for calling Claude models with retry, JSON parsing, and usage tracking.
 *
 * Note: temperature parameter is NOT supported by Claude Opus 4.7 (reasoning model).
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================================================
// Singleton client
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

const DEFAULT_TIMEOUT_MS = 180000;  // 3 minutes for complex layers
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
 * Robust JSON extraction with multiple fallback strategies.
 * Handles:
 *   - Pure JSON
 *   - ```json ... ``` fence (with or without language)
 *   - JSON with leading commentary
 *   - JSON with trailing commentary
 *   - Truncated JSON (attempts to repair common cases)
 *
 * @param {string} text
 * @returns {Object}
 * @throws {Error} with diagnostic info
 */
export function extractJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Cannot extract JSON from empty/non-string input');
  }

  const trimmed = text.trim();

  // Strategy 1: parse as-is
  try {
    return JSON.parse(trimmed);
  } catch (_) { /* continue */ }

  // Strategy 2: extract from ```json ... ``` or ``` ... ``` fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();
    try {
      return JSON.parse(candidate);
    } catch (_) { /* continue */ }
  }

  // Strategy 3: find longest substring that starts with { and ends with }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) { /* continue */ }

    // Strategy 4: attempt to repair common truncation
    // Add missing closing braces/brackets
    const repaired = tryRepairTruncated(candidate);
    if (repaired) {
      try {
        return JSON.parse(repaired);
      } catch (_) { /* continue */ }
    }
  }

  // Strategy 5: starting from {, try to repair from raw text (no need for lastBrace)
  if (firstBrace !== -1) {
    const fromBrace = trimmed.substring(firstBrace);
    const repaired = tryRepairTruncated(fromBrace);
    if (repaired) {
      try {
        return JSON.parse(repaired);
      } catch (_) { /* continue */ }
    }
  }

  // All strategies failed - throw with diagnostic info
  const preview = trimmed.length > 500
    ? trimmed.substring(0, 250) + '...[truncated]...' + trimmed.substring(trimmed.length - 250)
    : trimmed;
  throw new Error(
    `Could not extract valid JSON from response (length: ${text.length}). Preview: ${preview}`
  );
}

/**
 * Attempt to repair JSON that was cut off mid-output.
 * Walks the text character-by-character, tracking string context,
 * and finds the last *valid* position outside a string to truncate cleanly.
 * Then closes any open braces/brackets.
 *
 * Returns repaired JSON string, or null if cannot repair.
 */
function tryRepairTruncated(text) {
  // Walk the text and track context: which positions are valid truncation points
  // A valid truncation point is outside a string, after a "completable" structure
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  let lastSafePoint = -1;  // last index where we can truncate cleanly

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\') {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      if (!inString) {
        // String just closed - this is a safe point
        lastSafePoint = i;
      }
      continue;
    }
    if (inString) continue;

    if (ch === '{') openBraces++;
    else if (ch === '}') { openBraces--; lastSafePoint = i; }
    else if (ch === '[') openBrackets++;
    else if (ch === ']') { openBrackets--; lastSafePoint = i; }
    else if (ch === ',') {
      // Comma is a safe point only if not the last char before another comma
      lastSafePoint = i - 1;  // truncate BEFORE the comma
    }
  }

  // If we never went into a string and never opened structures, can't repair
  if (lastSafePoint < 0) return null;

  // If we were still in a string when text ended, must truncate to lastSafePoint
  // If structures are balanced, no repair needed
  if (!inString && openBraces === 0 && openBrackets === 0) return null;

  // Truncate to last safe point
  let repaired = text.substring(0, lastSafePoint + 1);

  // Remove trailing comma if present (invalid in JSON)
  while (repaired.endsWith(',')) {
    repaired = repaired.slice(0, -1);
  }

  // Recount opens after truncation
  openBraces = 0;
  openBrackets = 0;
  inString = false;
  escapeNext = false;
  for (let i = 0; i < repaired.length; i++) {
    const ch = repaired[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\') { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  // Close any open structures
  while (openBrackets > 0) { repaired += ']'; openBrackets--; }
  while (openBraces > 0) { repaired += '}'; openBraces--; }

  return repaired;
}

/**
 * Call Claude with a system + user prompt, expecting JSON output.
 * Automatically retries with double max_tokens if response was truncated.
 *
 * @param {Object} opts
 * @param {string} opts.model
 * @param {string} opts.system
 * @param {string} opts.userMessage
 * @param {number} [opts.maxTokens=4096]
 * @param {number} [opts.timeoutMs]
 * @param {string} [opts.layerName] - for diagnostic logging
 */
export async function callClaudeForJson({
  model,
  system,
  userMessage,
  maxTokens = 4096,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  layerName = 'unknown',
}) {
  if (!model || !system || !userMessage) {
    throw new ClaudeError('callClaudeForJson requires model, system, and userMessage');
  }

  const client = getClient();
  let lastError = null;
  let currentMaxTokens = maxTokens;
  let truncationRetries = 0;
  const MAX_TRUNCATION_RETRIES = 1;  // allow ONE auto-retry with bigger window

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create(
        {
          model,
          max_tokens: currentMaxTokens,
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

      // Check stop reason - if max_tokens AND we still have retries, increase tokens
      if (response.stop_reason === 'max_tokens') {
        console.warn(`[claude-client/${layerName}] Response hit max_tokens (${currentMaxTokens}). Output truncated.`);

        if (truncationRetries < MAX_TRUNCATION_RETRIES) {
          truncationRetries++;
          currentMaxTokens = Math.min(currentMaxTokens * 2, 16000);  // double, cap at 16k
          console.warn(`[claude-client/${layerName}] Auto-retrying with maxTokens=${currentMaxTokens}`);
          continue;  // retry the whole call with bigger window
        }
        // Out of retries - try to parse what we got (repair logic will kick in)
      }

      let json;
      try {
        json = extractJson(rawText);
      } catch (parseErr) {
        // Log diagnostic info before failing
        console.error(`[claude-client/${layerName}] JSON parse failed`);
        console.error(`[claude-client/${layerName}] stop_reason: ${response.stop_reason}`);
        console.error(`[claude-client/${layerName}] tokens: in=${response.usage?.input_tokens} out=${response.usage?.output_tokens}`);
        console.error(`[claude-client/${layerName}] response length: ${rawText.length}`);
        console.error(`[claude-client/${layerName}] response end: ...${rawText.substring(Math.max(0, rawText.length - 300))}`);
        throw new ClaudeError(`JSON parse failed for ${layerName}: ${parseErr.message}`, {
          raw: rawText.substring(0, 1000),
        });
      }

      return {
        json,
        usage: {
          input_tokens: response.usage?.input_tokens || 0,
          output_tokens: response.usage?.output_tokens || 0,
        },
        raw_text: rawText,
        stop_reason: response.stop_reason,
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
      console.warn(`[claude-client/${layerName}] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms:`, err.message);
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
