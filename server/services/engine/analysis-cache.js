/**
 * @file Analysis Cache - reads/writes stocks_analysis_cache table
 * @description Persists full 4-layer analysis results to DB with TTL.
 *
 * Cache strategy:
 *   - Lookup by ticker + profile (not user-specific)
 *   - TTL: 4 hours (during market hours)
 *   - Writes also populate child tables: s31_history, four_d_scores_history, beat_ratio_history
 */

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

const CACHE_TTL_HOURS = 4;

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  _supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket },
    }
  );
  return _supabase;
}

/**
 * Look up a cached analysis for ticker + profile.
 * Returns null if not found or expired.
 */
export async function lookupAnalysis(ticker, profile) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('stocks_analysis_cache')
      .select('id, analysis_data, created_at, expires_at')
      .eq('ticker', ticker.toUpperCase())
      .eq('best_profile_match', profile)
      .eq('analysis_type', 'full_valuation')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[analysis-cache] lookup error:', error.message);
      return null;
    }
    if (!data) return null;

    return {
      cached_at: data.created_at,
      expires_at: data.expires_at,
      analysis_id: data.id,
      ...data.analysis_data,
    };
  } catch (err) {
    console.warn('[analysis-cache] lookup exception:', err.message);
    return null;
  }
}

/**
 * Ensure stocks_master has a row for the ticker (required by foreign keys).
 * Upserts based on profile data.
 */
async function ensureStocksMasterRow(ticker, stockData) {
  try {
    const supabase = getSupabase();
    const profile = stockData?.profile;
    if (!profile) return;

    await supabase
      .from('stocks_master')
      .upsert({
        ticker: ticker.toUpperCase(),
        company_name: profile.companyName || ticker,
        sector: profile.sector || null,
        industry: profile.industry || null,
        exchange: profile.exchange || null,
        country: profile.country || null,
        currency: profile.currency || 'USD',
        description: profile.description || null,
        website: profile.website || null,
        ceo: profile.ceo || null,
        ipo_date: profile.ipoDate || null,
        market_cap_class: profile.marketCapClass || null,
        is_etf: !!profile.isEtf,
        is_active: profile.isActive !== false,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'ticker' });
  } catch (err) {
    console.warn('[analysis-cache] ensureStocksMasterRow failed:', err.message);
  }
}

/**
 * Save a full analysis result to DB and populate child tables.
 *
 * @param {Object} fullResult - The full assembled analysis object
 * @param {Object} stockData - For ensuring stocks_master row exists
 */
export async function saveAnalysis(fullResult, stockData) {
  try {
    const supabase = getSupabase();
    const { ticker, profile, layers, final, methodology_version, usage } = fullResult;

    // Step 1: Ensure stocks_master row (foreign key requirement)
    await ensureStocksMasterRow(ticker, stockData);

    // Step 2: Compute expires_at
    const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();

    // Step 3: Insert into stocks_analysis_cache
    const fourD = fullResult.synthesis?.four_d;
    const s31 = fullResult.synthesis?.s31;

    const cacheRow = {
      ticker: ticker.toUpperCase(),
      yield_score: fourD?.yield_score ?? null,
      speed_score: fourD?.speed_score ?? null,
      duration_score: fourD?.duration_score ?? null,
      confidence_score: fourD?.confidence_score ?? null,
      s31_total: s31?.total_score ?? null,
      backbone_tier: layers?.opportunity?.backbone?.tier ?? null,
      type_classification: layers?.opportunity?.type_classification ?? null,
      recommendation: final?.recommendation ?? null,
      best_profile_match: profile,
      analysis_type: 'full_valuation',
      model_version: 'claude-opus-4-7',
      methodology_version: methodology_version || 'realvaluex-v3.0',
      language: 'he',
      triggered_by: 'user_request',
      quality_score: final?.overall_score ?? null,
      analysis_data: fullResult,
      expires_at: expiresAt,
    };

    const { data: cacheInsert, error: cacheError } = await supabase
      .from('stocks_analysis_cache')
      .insert(cacheRow)
      .select('id')
      .single();

    if (cacheError) {
      console.warn('[analysis-cache] cache insert error:', cacheError.message);
      return null;
    }

    const cacheId = cacheInsert?.id;
    if (!cacheId) return null;

    // Step 4: Insert into child history tables (best-effort, don't fail if any of these fail)
    await Promise.allSettled([
      // 4D scores history
      fourD && supabase.from('four_d_scores_history').insert({
        ticker: ticker.toUpperCase(),
        yield_score: fourD.yield_score,
        speed_score: fourD.speed_score,
        duration_score: fourD.duration_score,
        confidence_score: fourD.confidence_score,
        stock_price: stockData?.quote?.price ?? null,
        analysis_cache_id: cacheId,
      }),

      // S31 history
      s31 && supabase.from('s31_history').insert({
        ticker: ticker.toUpperCase(),
        fund_score: s31.fund_score,
        mkt_score: s31.mkt_score,
        narr_score: s31.narr_score,
        fund_breakdown: s31.fund_breakdown,
        mkt_breakdown: s31.mkt_breakdown,
        narr_breakdown: s31.narr_breakdown,
        analysis_cache_id: cacheId,
      }),

      // Beat Ratio history
      layers?.validation?.beat_ratio_input && supabase.from('beat_ratio_history').insert({
        ticker: ticker.toUpperCase(),
        beat_ratio_1y: layers.validation.beat_ratio_input.ratio_1y,
        beat_ratio_5y: layers.validation.beat_ratio_input.ratio_5y,
        beat_ratio_10y: layers.validation.beat_ratio_input.ratio_10y,
        avg_beat_magnitude_5y: layers.validation.beat_ratio_input.avg_beat_magnitude_5y,
        direction: layers.validation.beat_ratio_input.direction !== 'Unknown'
          ? layers.validation.beat_ratio_input.direction
          : null,
        category: layers.validation.beat_ratio_input.category !== 'Unknown'
          ? layers.validation.beat_ratio_input.category
          : null,
        total_quarters_5y: layers.validation.beat_ratio_input.total_quarters_5y,
        beats_5y: layers.validation.beat_ratio_input.beats_5y,
        misses_5y: layers.validation.beat_ratio_input.misses_5y,
        inline_5y: layers.validation.beat_ratio_input.inline_5y,
        confidence_score_contribution: layers.validation.beat_ratio_input.confidence_contribution,
        data_source: 'fmp',
      }),
    ]);

    return cacheId;
  } catch (err) {
    console.error('[analysis-cache] saveAnalysis exception:', err.message);
    return null;
  }
}
