/**
 * Breakout Engine — Orchestrator (Stage 1 MVP)
 *
 * Runs 3 blocks in parallel:
 *   - Runway (Block 1)
 *   - Revenue Acceleration (Block 2)
 *   - Sentiment (Block 4)
 *
 * Missing in Stage 1 (will be added later):
 *   - Block 3: Catalyst Imminence (LLM call)
 *   - Block 5: Sector Tailwinds
 *
 * Expected latency per ticker: ~3-5 seconds (FMP calls in parallel).
 */

import { runwayBlock } from './blocks/runway.js';
import { revenueBlock } from './blocks/revenue.js';
import { sentimentBlock } from './blocks/sentiment.js';
import { computeScore, scoreToTier } from './scorer.js';

/**
 * Analyze single ticker — returns full breakout assessment.
 * @param {string} ticker
 * @returns {Promise<object>} breakout result
 */
export async function analyzeBreakout(ticker) {
  const startedAt = Date.now();

  // Validate ticker — reject Tel Aviv tickers in Stage 1
  if (!ticker || typeof ticker !== 'string') {
    throw new Error('ticker is required');
  }
  if (ticker.toUpperCase().endsWith('.TA')) {
    return {
      ticker,
      breakoutScore: null,
      tier: null,
      blocks: {},
      error: 'Tel Aviv stocks (.TA) not supported on current FMP plan',
      elapsedMs: 0,
      stage: 'mvp',
      stageNote:
        'MVP: 3 of 5 blocks active (Runway, Revenue, Sentiment). Catalyst + Sector pending.',
      generatedAt: new Date().toISOString(),
    };
  }

  // Run blocks in parallel — each handles its own errors and returns fallback
  const [runway, revenue, sentiment] = await Promise.all([
    runwayBlock(ticker),
    revenueBlock(ticker),
    sentimentBlock(ticker),
  ]);

  const blocks = { runway, revenue, sentiment };
  const breakoutScore = computeScore(blocks);
  const tier = scoreToTier(breakoutScore);

  // Synthesize a short Hebrew rationale from block signals
  const rationale_he = buildRationale(blocks, breakoutScore, tier);

  return {
    ticker: ticker.toUpperCase(),
    breakoutScore,
    tier,
    blocks,
    rationale_he,
    elapsedMs: Date.now() - startedAt,
    stage: 'mvp',
    stageNote:
      'MVP: 3 of 5 blocks active (Runway, Revenue, Sentiment). Catalyst + Sector pending.',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Build a short Hebrew narrative from block scores.
 * Stage 1: rule-based. Stage 2 will replace with LLM synthesis.
 */
function buildRationale(blocks, score, tier) {
  const lines = [];
  lines.push(`${tier.emoji} ציון פריצה: ${score} (${tier.label_he})`);

  const blockSummary = (name, hebrewName, block) => {
    const colorWord =
      block.color === 'green'
        ? 'חיובי'
        : block.color === 'yellow'
        ? 'מעורב'
        : block.color === 'red'
        ? 'שלילי'
        : 'לא ידוע';
    return `${hebrewName}: ${block.score}/100 (${colorWord})`;
  };

  lines.push(blockSummary('runway', 'בריאות פיננסית', blocks.runway));
  lines.push(blockSummary('revenue', 'צמיחת הכנסות', blocks.revenue));
  lines.push(blockSummary('sentiment', 'סנטימנט שוק', blocks.sentiment));

  return lines.join('\n');
}
