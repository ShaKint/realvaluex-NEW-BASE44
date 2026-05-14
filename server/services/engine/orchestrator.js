/**
 * @file Analysis Orchestrator (Optimized)
 * @description Coordinates the full RealValueX™ analysis pipeline.
 *
 * OPTIMIZATION (3C-4+): L2 and L3 run IN PARALLEL.
 *
 * Pipeline dependency analysis:
 *   - L1 depends on: stock data only
 *   - L2 depends on: L1 + Beat Ratio (math)
 *   - L3 depends on: L1 + Technical Indicators (math)
 *   - L4 depends on: L1 + L2 + L3
 *   - Final depends on: everything
 *
 * Key insight: L2 and L3 are INDEPENDENT of each other. Both need only L1.
 *
 * Optimized flow:
 *   1.  Cache lookup (return immediately if hit)
 *   2.  Gather stock data (parallel FMP calls)
 *   3.  Layer 1 (Opportunity) - LLM
 *   4.  [Beat Ratio + Tech Indicators] (math, instant)
 *   5.  [Layer 2 + Layer 3] PARALLEL - 2 LLM calls
 *   6.  Layer 4 (Monitoring) - LLM
 *   7.  [S31 + RUC + 4D] (math, instant)
 *   8.  Final Synthesis - LLM
 *   9.  Cache write (background, non-blocking)
 *
 * Expected: ~210s vs previous ~265s (-21%)
 */

import * as stockData from '../stock-data.js';
import { runLayer1 } from './layer1-opportunity.js';
import { computeBeatRatio } from './beat-ratio.js';
import { runLayer2 } from './layer2-validation.js';
import { computeTechnicalIndicators } from './technical-indicators.js';
import { runLayer3 } from './layer3-timing.js';
import { runLayer4 } from './layer4-monitoring.js';
import { computeS31 } from './s31-protocol.js';
import { computeRUC } from './ruc-calculator.js';
import { computeFourD } from './four-d-synthesizer.js';
import { runFinalSynthesis } from './final-synthesis.js';
import { lookupAnalysis, saveAnalysis } from './analysis-cache.js';
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

export async function analyzeStock({ ticker, profile, forceRefresh = false }) {
  if (!ticker || typeof ticker !== 'string') {
    throw new Error('Ticker is required');
  }
  if (!isValidProfile(profile)) {
    throw new Error(`Invalid profile: ${profile}. Must be one of C1, G1, M1, F1`);
  }

  const startTime = Date.now();
  const tickerUpper = ticker.toUpperCase();

  // ============================================================================
  // Step 1: Cache lookup
  // ============================================================================
  if (!forceRefresh) {
    const cached = await lookupAnalysis(tickerUpper, profile);
    if (cached) {
      return {
        ...cached,
        from_cache: true,
        cache_age_minutes: Math.round((Date.now() - new Date(cached.cached_at).getTime()) / 60000),
      };
    }
  }

  // ============================================================================
  // Step 2: Gather data (parallel FMP calls, cached)
  // ============================================================================
  const dataStart = Date.now();
  const stockDataBundle = await gatherStockData(tickerUpper);
  const dataDuration = Date.now() - dataStart;

  // ============================================================================
  // Step 3: Layer 1 (Opportunity) - SEQUENTIAL (everyone depends on this)
  // ============================================================================
  const layer1Start = Date.now();
  const layer1Output = await runLayer1({
    ticker: tickerUpper, profile, stockData: stockDataBundle,
  });
  const layer1Duration = Date.now() - layer1Start;

  // ============================================================================
  // Step 4: Math computations (instant, ~1ms)
  // ============================================================================
  const beatRatio = computeBeatRatio(stockDataBundle.earnings || []);
  const technicalIndicators = computeTechnicalIndicators(
    stockDataBundle.historical || [],
    stockDataBundle.quote
  );

  // ============================================================================
  // Step 5: Layer 2 + Layer 3 IN PARALLEL
  // ============================================================================
  // Both only depend on L1 + math computations (which are done).
  // Run them concurrently to save 50-60 seconds.
  const parallelStart = Date.now();
  const [layer2Output, layer3Output] = await Promise.all([
    runLayer2({
      ticker: tickerUpper,
      profile,
      stockData: stockDataBundle,
      beatRatio,
      layer1Output,
    }),
    runLayer3({
      ticker: tickerUpper,
      profile,
      stockData: stockDataBundle,
      technicalIndicators,
      layer1Output,
      layer2Output: null,  // L3 doesn't strictly need L2; runs independently
    }),
  ]);
  const parallelDuration = Date.now() - parallelStart;

  // ============================================================================
  // Step 6: Layer 4 (Monitoring) - SEQUENTIAL (needs L1+L2+L3)
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
  // Step 7: Math synthesis (instant)
  // ============================================================================
  const s31 = computeS31({
    layer1: layer1Output,
    layer2: layer2Output,
    layer3: layer3Output,
    beatRatio,
    technicalIndicators,
  });

  const ruc = computeRUC({
    profile,
    stockData: stockDataBundle,
    layer1: layer1Output,
    layer2: layer2Output,
    layer3: layer3Output,
  });

  const fourD = computeFourD({
    layer1: layer1Output,
    layer2: layer2Output,
    layer3: layer3Output,
    layer4: layer4Output,
    ruc,
    s31,
  });

  // ============================================================================
  // Step 8: Final Synthesis (LLM)
  // ============================================================================
  const finalStart = Date.now();
  const finalOutput = await runFinalSynthesis({
    ticker: tickerUpper,
    profile,
    stockData: stockDataBundle,
    layer1: layer1Output,
    layer2: layer2Output,
    layer3: layer3Output,
    layer4: layer4Output,
    beatRatio,
    s31,
    ruc,
    fourD,
  });
  const finalDuration = Date.now() - finalStart;

  // ============================================================================
  // Assemble result
  // ============================================================================
  const result = {
    ticker: tickerUpper,
    profile,
    methodology_version: 'realvaluex-v3.0',
    analyzed_at: new Date().toISOString(),
    completed_layers: ['opportunity', 'validation', 'timing', 'monitoring'],

    final: finalOutput,

    synthesis: {
      s31,
      ruc,
      four_d: fourD,
      beat_ratio: beatRatio,
      technical_indicators: technicalIndicators,
    },

    layers: {
      opportunity: layer1Output,
      validation: layer2Output,
      timing: layer3Output,
      monitoring: layer4Output,
    },

    timings_ms: {
      total: Date.now() - startTime,
      data_gathering: dataDuration,
      layer1: layer1Duration,
      layers_2_and_3_parallel: parallelDuration,
      layer4: layer4Duration,
      final_synthesis: finalDuration,
    },

    usage: {
      total_input_tokens:
        layer1Output.usage.input_tokens +
        layer2Output.usage.input_tokens +
        layer3Output.usage.input_tokens +
        layer4Output.usage.input_tokens +
        finalOutput.usage.input_tokens,
      total_output_tokens:
        layer1Output.usage.output_tokens +
        layer2Output.usage.output_tokens +
        layer3Output.usage.output_tokens +
        layer4Output.usage.output_tokens +
        finalOutput.usage.output_tokens,
      by_layer: {
        layer1: layer1Output.usage,
        layer2: layer2Output.usage,
        layer3: layer3Output.usage,
        layer4: layer4Output.usage,
        final: finalOutput.usage,
      },
    },

    from_cache: false,
  };

  // ============================================================================
  // Step 9: Cache write (background, non-blocking)
  // ============================================================================
  saveAnalysis(result, stockDataBundle)
    .then(cacheId => {
      if (cacheId) {
        console.log(`[orchestrator] Saved analysis to cache: ${cacheId}`);
      }
    })
    .catch(err => {
      console.warn('[orchestrator] Background cache save failed:', err.message);
    });

  return result;
}
