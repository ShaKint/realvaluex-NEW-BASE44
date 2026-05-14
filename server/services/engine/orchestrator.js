/**
 * @file Analysis Orchestrator
 * @description Coordinates the full RealValueX™ analysis pipeline.
 *
 * Current state (3C-4): ALL layers + S31 + RUC + 4D + Final Synthesis + Cache
 *
 * Pipeline:
 *   0.  Cache lookup (if hit → return immediately)
 *   1.  Gather stock data (parallel, cached FMP calls)
 *   2.  Layer 1 (Opportunity) - LLM
 *   3.  Beat Ratio (math)
 *   4.  Layer 2 (Validation) - LLM
 *   5.  Technical Indicators (math)
 *   6.  Layer 3 (Timing) - LLM
 *   7.  Layer 4 (Monitoring) - LLM
 *   8.  S31 Protocol (math)
 *   9.  RUC Calculator (math)
 *   10. 4D Synthesizer (math)
 *   11. Final Synthesis (LLM) - Overall Score + Recommendation
 *   12. Cache write (DB)
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
  // Step 0: Cache lookup
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
  // Step 1: Gather data (parallel, cached FMP)
  // ============================================================================
  const dataStart = Date.now();
  const stockDataBundle = await gatherStockData(tickerUpper);
  const dataDuration = Date.now() - dataStart;

  // ============================================================================
  // Step 2: Layer 1 (Opportunity)
  // ============================================================================
  const layer1Start = Date.now();
  const layer1Output = await runLayer1({
    ticker: tickerUpper, profile, stockData: stockDataBundle,
  });
  const layer1Duration = Date.now() - layer1Start;

  // ============================================================================
  // Step 3: Beat Ratio (math)
  // ============================================================================
  const beatRatio = computeBeatRatio(stockDataBundle.earnings || []);

  // ============================================================================
  // Step 4: Layer 2 (Validation)
  // ============================================================================
  const layer2Start = Date.now();
  const layer2Output = await runLayer2({
    ticker: tickerUpper, profile, stockData: stockDataBundle, beatRatio, layer1Output,
  });
  const layer2Duration = Date.now() - layer2Start;

  // ============================================================================
  // Step 5: Technical Indicators (math)
  // ============================================================================
  const technicalIndicators = computeTechnicalIndicators(
    stockDataBundle.historical || [],
    stockDataBundle.quote
  );

  // ============================================================================
  // Step 6: Layer 3 (Timing)
  // ============================================================================
  const layer3Start = Date.now();
  const layer3Output = await runLayer3({
    ticker: tickerUpper, profile, stockData: stockDataBundle,
    technicalIndicators, layer1Output, layer2Output,
  });
  const layer3Duration = Date.now() - layer3Start;

  // ============================================================================
  // Step 7: Layer 4 (Monitoring)
  // ============================================================================
  const layer4Start = Date.now();
  const layer4Output = await runLayer4({
    ticker: tickerUpper, profile, stockData: stockDataBundle,
    beatRatio, technicalIndicators,
    layer1Output, layer2Output, layer3Output,
  });
  const layer4Duration = Date.now() - layer4Start;

  // ============================================================================
  // Step 8: S31 Protocol (math)
  // ============================================================================
  const s31 = computeS31({
    layer1: layer1Output,
    layer2: layer2Output,
    layer3: layer3Output,
    beatRatio,
    technicalIndicators,
  });

  // ============================================================================
  // Step 9: RUC Calculator (math)
  // ============================================================================
  const ruc = computeRUC({
    profile,
    stockData: stockDataBundle,
    layer1: layer1Output,
    layer2: layer2Output,
    layer3: layer3Output,
  });

  // ============================================================================
  // Step 10: 4D Synthesizer (math)
  // ============================================================================
  const fourD = computeFourD({
    layer1: layer1Output,
    layer2: layer2Output,
    layer3: layer3Output,
    layer4: layer4Output,
    ruc,
    s31,
  });

  // ============================================================================
  // Step 11: Final Synthesis (LLM)
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
  // Assemble full result
  // ============================================================================
  const result = {
    ticker: tickerUpper,
    profile,
    methodology_version: 'realvaluex-v3.0',
    analyzed_at: new Date().toISOString(),
    completed_layers: ['opportunity', 'validation', 'timing', 'monitoring'],

    // The HEADLINE result - what the user sees first
    final: finalOutput,

    // The synthesis (math-derived scores)
    synthesis: {
      s31,
      ruc,
      four_d: fourD,
      beat_ratio: beatRatio,
      technical_indicators: technicalIndicators,
    },

    // Full layer outputs (drill-down)
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
      layer2: layer2Duration,
      layer3: layer3Duration,
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
  // Step 12: Cache write (best-effort, don't fail the request)
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
