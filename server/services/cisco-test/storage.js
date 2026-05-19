/**
 * @file Cisco Test Storage
 *
 * Persistence layer for cisco_test_predictions table.
 * Implements Safeguard E1 (Prediction Registry) from the model:
 * every analysis is saved with full context for later calibration.
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS — appropriate
 * since this is backend-only code that already verified user_id
 * via the requireAuth middleware in index.js.
 */

import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  });
  return _supabase;
}

/**
 * Save a Cisco Test prediction.
 * Strategy C: returns { saved: boolean, error?, id? } — never throws.
 * Caller decides whether to surface the failure to the user.
 *
 * @param {object} params
 * @param {string} params.userId            - auth.users.id
 * @param {object} params.pprResult         - output of analyzePPR()
 * @param {string} params.stage             - 'A' / 'B' / 'C' / 'D'
 * @param {string[]} params.blocksActive    - e.g. ['ppr']
 * @returns {Promise<{saved: boolean, id?: string, error?: string}>}
 */
export async function savePrediction({ userId, pprResult, stage, blocksActive }) {
  if (!userId) {
    return { saved: false, error: 'userId required' };
  }
  if (!pprResult || pprResult.error) {
    return { saved: false, error: 'invalid pprResult (no data to save or block failed)' };
  }

  try {
    const supabase = getSupabase();

    // Build row from the PPR result. All field extractions are defensive
    // because the PPR result shape can vary if the LLM produces partial output.
    const row = {
      user_id: userId,
      ticker: pprResult.ticker,
      company_name: pprResult.rawData?.company?.name || null,
      sector: pprResult.rawData?.company?.sector || null,

      stage,
      blocks_active: blocksActive,

      ppr_score: typeof pprResult.score === 'number' ? pprResult.score : null,
      ppr_flag: pprResult.flag || null,

      // These will be filled in later stages — left null in Stage A
      rta_score: null,
      rta_flag: null,
      tps_score: null,
      tps_flag: null,
      cisco_verdict: null,
      state_hint: null,

      // E4 Utility
      action_hint: extractActionVerb(pprResult.actionHint_he),
      action_detail_he: pprResult.actionHint_he || null,

      // Anchoring snapshot
      price_at_analysis: pprResult.rawData?.price?.current ?? null,
      analyst_pt_at_analysis:
        pprResult.rawData?.analyst?.priceTargetConsensus ?? null,
      ttc_years_estimated:
        pprResult.answers?.q3_ttc?.years ??
        pprResult.rawData?.derived?.ttcYears ??
        null,
      market_cap_at_analysis: pprResult.rawData?.company?.marketCap ?? null,

      // Full audit trail
      full_response: pprResult,

      // Metadata
      llm_input_tokens: pprResult.llm?.inputTokens ?? null,
      llm_output_tokens: pprResult.llm?.outputTokens ?? null,
      elapsed_ms: pprResult.elapsedMs ?? null,

      // Verification scheduling: defer for 90 days
      verify_at: ninetyDaysFromNow(),
    };

    const { data, error } = await supabase
      .from('cisco_test_predictions')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('[cisco-test/storage] insert failed:', error.message, error.details);
      return { saved: false, error: error.message };
    }

    return { saved: true, id: data.id };
  } catch (err) {
    console.error('[cisco-test/storage] exception:', err.message, err.stack);
    return { saved: false, error: err.message };
  }
}

/**
 * Fetch a user's prediction history for a ticker.
 * Returns newest first.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.ticker
 * @param {number} [params.limit=20]
 * @returns {Promise<{ok: boolean, predictions?: object[], error?: string}>}
 */
export async function getPredictionHistory({ userId, ticker, limit = 20 }) {
  if (!userId || !ticker) {
    return { ok: false, error: 'userId and ticker required' };
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('cisco_test_predictions')
      .select(
        'id, ticker, stage, blocks_active, ppr_score, ppr_flag, rta_score, rta_flag, tps_score, tps_flag, cisco_verdict, state_hint, action_hint, action_detail_he, price_at_analysis, analyst_pt_at_analysis, ttc_years_estimated, verify_at, verified_at, verify_outcome, actual_return_pct, created_at'
      )
      .eq('user_id', userId)
      .eq('ticker', ticker.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[cisco-test/storage] history fetch failed:', error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true, predictions: data || [] };
  } catch (err) {
    console.error('[cisco-test/storage] history exception:', err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Extract action verb from the Hebrew action hint.
 * The hint typically starts with TRIM / HOLD / ADD / SELL / MONITOR.
 */
function extractActionVerb(hintHe) {
  if (!hintHe || typeof hintHe !== 'string') return null;
  const verbs = ['TRIM', 'HOLD', 'ADD', 'SELL', 'MONITOR', 'BUY'];
  for (const verb of verbs) {
    if (hintHe.toUpperCase().includes(verb)) return verb;
  }
  return null;
}

function ninetyDaysFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString();
}
