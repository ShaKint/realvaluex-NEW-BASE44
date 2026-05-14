/**
 * @file Analysis Orchestrator
 * @description Coordinates the 4-Layer engine pipeline.
 *
 * Current state (3C-3): All 4 layers running with cumulative context.
 *   - Layer 1 (Opportunity)
 *   - Beat Ratio (math)
 *   - Layer 2 (Validation)
 *   - Technical Indicators (math)
 *   - Layer 3 (Timing)
 *   - Layer 4 (Monitoring)
 *
 * Future (3C-4): Add S31 + RUC + final 4D scores synthesis + cache write.
 */

import * as stockData from '../stock-data.js';
import { runLayer1 } from './layer1-opportunity.js';
import { computeBeatRatio } from './beat-ratio.js';
import { runLayer2 } from './layer2-validation.js';
import { computeTechnicalIndicators } from './technical-indicators.js';
import { runLayer3 } from './layer3-timing.js';
import { runLayer4 } from './layer4-monitoring.js';
import { isValidProfile } from './types.js';

async function gatherStockData(ticker) {
  const [profile, quote, keyMetrics, earnings, priceTarget, historical] = await Promise.all([
    stockData.getProfile(ticker),
    stockData.getQuote(ticker),
    stockData.getKeyMetricsTTM(ticker),
    stockData.getEarningsHistory(ticker, 24),
    stockData.getPriceTargetConsensus(ticker),
    stockData.getHistoricalPrices(ticker, 90),
  ]);

  if (!profile) {
    throw new Error(`No profile data found for ticker: ${ticker}`);
  }

  return { profile, quote, keyMetrics, earnings, priceTarget, historical };
}

export async function analyzeStock({ ticker, profile }) {
  if (!ticker || typeof ticker !== 'string') {
    throw new Error('Ticker is required');
  }
  if (!isValidProfile(profile)) {
    throw new Error(`Invalid profile: ${profile}. Must be one of C1, G1, M1, F1`);
  }

  const startTime = Date.now();
  const tickerUpper = ticker.toUpperCase();

  // ============================================================================
  // Step 1: Gather stock data (parallel, cached)
  // ============================================================================
  const dataStart = Date.now();
  const stockDataBundle = await gatherStockData(tickerUpper);
  const dataDuration = Date.now() - dataStart;

  // ============================================================================
  // Step 2: Layer 1 (Opportunity)
  // ============================================================================
  const layer1Start = Date.now();
  const layer1Output = await runLayer1({
    ticker: tickerUpper,
    profile,
    stockData: stockDataBundle,
  });
  const layer1Duration = Date.now() - layer1Start;

  // ============================================================================
  // Step 3: Beat Ratio (math, no LLM)
  // ============================================================================
  const beatRatioStart = Date.now();
  const beatRatio = computeBeatRatio(stockDataBundle.earnings || []);
  const beatRatioDuration = Date.now() - beatRatioStart;

  // ============================================================================
  // Step 4: Layer 2 (Validation)
  // ============================================================================
  const layer2Start = Date.now();
  const layer2Output = await runLayer2({
    ticker: tickerUpper,
    profile,
    stockData: stockDataBundle,
    beatRatio,
    layer1Output,
  });
  const layer2Duration = Date.now() - layer2Start;

  // ============================================================================
  // Step 5: Technical Indicators (math, no LLM)
  // ============================================================================
  const techStart = Date.now();
  const technicalIndicators = computeTechnicalIndicators(
    stockDataBundle.historical || [],
    stockDataBundle.quote
  );
  const techDuration = Date.now() - techStart;

  // ============================================================================
  // Step 6: Layer 3 (Timing)
  // ============================================================================
  const layer3Start = Date.now();
  const layer3Output = await runLayer3({
    ticker: tickerUpper,
    profile,
    stockData: stockDataBundle,
    technicalIndicators,
    layer1Output,
    layer2Output,
  });
  const layer3Duration = Date.now() - layer3Start;

  // ============================================================================
  // Step 7: Layer 4 (Monitoring)
  // ============================================================================
  const layer4Start = Date.now();
  const layer4Output = await runLayer4({
    ticker: tickerUpper,
    profile,
    stockData: stockDataBundle,
    beatRatio,
    technicalIndicators,
    layer1Output,
    layer2Output,
    layer3Output,
  });
  const layer4Duration = Date.now() - layer4Start;

  // ============================================================================
  // (Future 3C-4): S31 + RUC + final 4D scores + cache write
  // ============================================================================

  // ============================================================================
  // Assemble result
  // ============================================================================
  return {
    ticker: tickerUpper,
    profile,
    methodology_version: 'realvaluex-v3.0',
    analyzed_at: new Date().toISOString(),
    completed_layers: ['opportunity', 'validation', 'timing', 'monitoring'],

    layers: {
      opportunity: layer1Output,
      validation: layer2Output,
      timing: layer3Output,
      monitoring: layer4Output,
    },

    // Placeholder for final synthesis (3C-4)
    final: null,

    timings_ms: {
      total: Date.now() - startTime,
      data_gathering: dataDuration,
      layer1: layer1Duration,
      beat_ratio: beatRatioDuration,
      layer2: layer2Duration,
      technical_indicators: techDuration,
      layer3: layer3Duration,
      layer4: layer4Duration,
    },

    usage: {
      total_input_tokens:
        layer1Output.usage.input_tokens +
        layer2Output.usage.input_tokens +
        layer3Output.usage.input_tokens +
        layer4Output.usage.input_tokens,
      total_output_tokens:
        layer1Output.usage.output_tokens +
        layer2Output.usage.output_tokens +
        layer3Output.usage.output_tokens +
        layer4Output.usage.output_tokens,
      by_layer: {
        layer1: layer1Output.usage,
        layer2: layer2Output.usage,
        layer3: layer3Output.usage,
        layer4: layer4Output.usage,
      },
    },
  };
}
