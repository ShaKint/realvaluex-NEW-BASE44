/**
 * @file Analysis Orchestrator
 * @description Coordinates the 4-Layer engine pipeline.
 *
 * Current state (3C-1): Layer 1 only.
 * Future (3C-2 onward): Add Layer 2, 3, 4 + S31 + RUC.
 *
 * Flow:
 *   1. Gather stock data via Facade (cached FMP calls)
 *   2. Run Layer 1 (Opportunity)
 *   3. (Future) Run Layer 2, 3, 4 with cumulative context
 *   4. (Future) Compute S31 + RUC + final 4D scores
 *   5. Return assembled analysis result
 */

import * as stockData from '../stock-data.js';
import { runLayer1 } from './layer1-opportunity.js';
import { isValidProfile } from './types.js';

/**
 * Gather all stock data needed for the layers.
 * Returns a bundle that flows through all subsequent layers.
 *
 * @param {string} ticker
 * @returns {Promise<Object>} StockDataBundle
 */
async function gatherStockData(ticker) {
  // Fetch in parallel - all cached, so even cache miss is fast
  const [profile, quote, keyMetrics, earnings, priceTarget] = await Promise.all([
    stockData.getProfile(ticker),
    stockData.getQuote(ticker),
    stockData.getKeyMetricsTTM(ticker),
    stockData.getEarningsHistory(ticker, 24),  // 24 quarters = 6 years (enough for Beat Ratio in Layer 4)
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
  // Validation
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
  // (Future 3C-2/3/4): Layer 2, 3, 4 + S31 + RUC + final synthesis
  // ============================================================================

  // ============================================================================
  // Assemble result
  // ============================================================================
  return {
    ticker: tickerUpper,
    profile,
    methodology_version: 'realvaluex-v3.0',
    analyzed_at: new Date().toISOString(),
    completed_layers: ['opportunity'],

    layers: {
      opportunity: layer1Output,
      // validation: null,    // 3C-2
      // timing: null,        // 3C-3
      // monitoring: null,    // 3C-3
    },

    // Placeholder for final synthesis (3C-4)
    final: null,

    timings_ms: {
      total: Date.now() - startTime,
      data_gathering: dataDuration,
      layer1: layer1Duration,
    },

    usage: {
      total_input_tokens: layer1Output.usage.input_tokens,
      total_output_tokens: layer1Output.usage.output_tokens,
    },
  };
}
