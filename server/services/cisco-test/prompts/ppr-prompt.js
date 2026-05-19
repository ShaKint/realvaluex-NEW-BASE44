/**
 * @file PPR Block Orchestrator
 *
 * Pipeline:
 *   1. gatherPPRData() via stock-data facade
 *   2. Build prompt
 *   3. Call Opus 4.7
 *   4. Parse JSON (with single retry on parse failure)
 *   5. Return structured result
 */

import { anthropic } from '../../../index.js';
import { gatherPPRData } from '../data/ppr-data.js';
import { PPR_SYSTEM_PROMPT, buildPPRUserPrompt } from '../prompts/ppr-prompt.js';

const MODEL = 'claude-opus-4-7';
const MAX_TOKENS = 4000;

/**
 * Run PPR analysis for a single ticker.
 * @param {string} ticker
 * @returns {Promise<object>} full PPR result
 */
export async function analyzePPR(ticker) {
  const startedAt = Date.now();

  // 1. Gather data
  const data = await gatherPPRData(ticker);

  // 2. Build prompt
  const userPrompt = buildPPRUserPrompt(data);

  // 3. Call Opus
  let llmResponse;
  try {
    llmResponse = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: PPR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (err) {
    console.error('[ppr] Opus call failed:', err.message);
    return {
      ticker: data.ticker,
      stage: 'A',
      block: 'ppr',
      error: 'LLM call failed: ' + err.message,
      data,
      elapsedMs: Date.now() - startedAt,
    };
  }

  // 4. Extract + parse JSON
  const textContent =
    llmResponse.content
      ?.filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n') || '';

  let parsed;
  try {
    parsed = parseJSONResponse(textContent);
  } catch (err) {
    // Retry once with explicit fix request
    console.warn('[ppr] First JSON parse failed, retrying with fix instruction');
    try {
      const retryResponse = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: PPR_SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: textContent },
          {
            role: 'user',
            content:
              'התשובה הקודמת לא הצליחה להיות parsed כ-JSON תקני. אנא החזר אותו תוכן בדיוק, אבל הפעם JSON תקני וטהור בלבד, ללא backticks וללא טקסט נוסף.',
          },
        ],
      });
      const retryText =
        retryResponse.content
          ?.filter((c) => c.type === 'text')
          .map((c) => c.text)
          .join('\n') || '';
      parsed = parseJSONResponse(retryText);
    } catch (retryErr) {
      return {
        ticker: data.ticker,
        stage: 'A',
        block: 'ppr',
        error: 'JSON parse failed after retry: ' + retryErr.message,
        rawResponse: textContent,
        data,
        elapsedMs: Date.now() - startedAt,
      };
    }
  }

  // 5. Validate basic shape
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !parsed.answers ||
    !parsed.answers.q6_pprScore
  ) {
    return {
      ticker: data.ticker,
      stage: 'A',
      block: 'ppr',
      error: 'LLM response missing required fields',
      rawResponse: textContent,
      parsed,
      data,
      elapsedMs: Date.now() - startedAt,
    };
  }

  const score = parsed.answers.q6_pprScore.score;
  const flag = parsed.flag || (score >= 7 ? 'red' : score >= 4 ? 'yellow' : 'green');

  return {
    ticker: data.ticker,
    stage: 'A',
    block: 'ppr',
    chapter: 37,
    score,
    flag,
    verdict_he: parsed.verdict_he || '',
    actionHint_he: parsed.actionHint_he || '',
    answers: parsed.answers,
    baseRates_he: parsed.baseRates_he || [],
    missingData_he: parsed.missingData_he || [],
    rawData: data,
    llm: {
      model: MODEL,
      inputTokens: llmResponse.usage?.input_tokens,
      outputTokens: llmResponse.usage?.output_tokens,
      stopReason: llmResponse.stop_reason,
    },
    elapsedMs: Date.now() - startedAt,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Tolerant JSON parsing — strips markdown fences if present, trims, parses.
 */
function parseJSONResponse(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or non-string response');
  }
  let cleaned = text.trim();

  // Strip ```json ... ``` fences if present
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object boundaries found');
  }
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  return JSON.parse(cleaned);
}
