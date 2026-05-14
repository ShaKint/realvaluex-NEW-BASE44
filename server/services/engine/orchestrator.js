/**
 * @file Analysis Orchestrator
 * @description Coordinates the 4-Layer engine pipeline.
 *
 * Current state (3C-2): Layer 1 (Opportunity) + Layer 2 (Validation) with Beat Ratio.
 * Future (3C-3 onward): Add Layer 3, 4 + S31 + RUC.
 *
 * Flow:
 *   1. Gather stock data via Facade (cached FMP calls)
 *   2. Run Layer 1 (Opportunity)
 *   3. Compute Beat Ratio (pure math, no LLM)
 *   4. Run Layer 2 (Validation) with Layer 1 context + Beat Ratio
 *   5. (Future) Run Layer 3, 4
 *   6. (Future) Compute S31 + RUC + final 4D scores
 *   7. Return assembled analysis result
 */

import * as stockData from '../stock-data.js';
import { runLayer1 } from './layer1-opportunity.js';
import { computeBeatRatio } from './beat-ratio.js';
import { runLayer2 } from './layer2-validation.js';
import { isValidProfile } from './types.js';

/**
 * Gather all stock data needed for the layers.
 */
async function gatherStockData(ticker) {
  const [profile, quote, keyMetrics, earnings, priceTarget] = await Promise.all([
    stockData.getProfile(ticker),
    stockData.getQuote(ticker),
    stockData.getKeyMetricsTTM(ticker),
    stockData.getEarningsHistory(ticker, 24),
    stockData.getPriceTargetConsensus(ticker),
  ]);

  if (!profile) {
    throw new Error(`No profile data found for ticker: ${ticker}`);
  }

  return { profile, quote, keyMetrics, earnings, priceTarget };
}

/**
 * Main analysis entry point.
 * @param {Object} params
 * @param {string} params.ticker
 * @param {string} params.profile - C1|G1|M1|F1
 * @returns {Promise<Object>}
 */
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
  // Step 2: Run Layer 1 (Opportunity Engine)
  // ============================================================================
  const layer1Start = Date.now();
  const layer1Output = await runLayer1({
    ticker: tickerUpper,
    profile,
    stockData: stockDataBundle,
  });
  const layer1Duration = Date.now() - layer1Start;

  // ============================================================================
  // Step 3: Compute Beat Ratio (Chapter 11.5) - pure math, no LLM
  // ============================================================================
  const beatRatioStart = Date.now();
  const beatRatio = computeBeatRatio(stockDataBundle.earnings || []);
  const beatRatioDuration = Date.now() - beatRatioStart;

  // ============================================================================
  // Step 4: Run Layer 2 (Validation Engine)
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
  // (Future 3C-3/4): Layer 3, 4 + S31 + RUC + final synthesis
  // ============================================================================

  // ============================================================================
  // Assemble result
  // ============================================================================
  return {
    ticker: tickerUpper,
    profile,
    methodology_version: 'realvaluex-v3.0',
    analyzed_at: new Date().toISOString(),
    completed_layers: ['opportunity', 'validation'],

    layers: {
      opportunity: layer1Output,
      validation: layer2Output,
      // timing: null,        // 3C-3
      // monitoring: null,    // 3C-3
    },

    // Placeholder for final synthesis (3C-4)
    final: null,

    timings_ms: {
      total: Date.now() - startTime,
      data_gathering: dataDuration,
      layer1: layer1Duration,
      beat_ratio: beatRatioDuration,
      layer2: layer2Duration,
    },

    usage: {
      total_input_tokens:
        layer1Output.usage.input_tokens + layer2Output.usage.input_tokens,
      total_output_tokens:
        layer1Output.usage.output_tokens + layer2Output.usage.output_tokens,
      by_layer: {
        layer1: layer1Output.usage,
        layer2: layer2Output.usage,
      },
    },
  };
}
