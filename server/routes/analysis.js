/**
 * @file Analysis routes
 * @description Endpoints for running the 4-Layer Engine on stocks.
 *
 * Mounted at: /api/analysis/*
 *
 * Endpoints:
 *   GET  /api/analysis/search             Search analyzed stocks by filters (deduplicated)
 *   GET  /api/analysis/list               List all analyzed stocks (deduplicated)
 *   GET  /api/analysis/:ticker/history    Historical analyses for a specific ticker
 *   GET  /api/analysis/:ticker            Run full 4-layer analysis (LLM, ~3-4 min)
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { analyzeStock } from '../services/engine/orchestrator.js';

const router = express.Router();

// ============================================================================
// Supabase client (for read-only queries)
// ============================================================================
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

function handleError(res, err) {
  console.error('[analysis route] error:', err.message, err.stack);

  if (err.name === 'ClaudeError') {
    return res.status(err.statusCode || 502).json({
      error: 'Claude API error',
      message: err.message,
      retryable: err.retryable,
    });
  }

  if (err.name === 'ProviderError') {
    return res.status(err.statusCode || 502).json({
      error: 'Data provider error',
      message: err.message,
      provider: err.provider,
    });
  }

  if (err.message?.includes('Invalid profile') || err.message?.includes('Ticker is required')) {
    return res.status(400).json({ error: 'Bad request', message: err.message });
  }

  if (err.message?.includes('No profile data found')) {
    return res.status(404).json({ error: 'Not found', message: err.message });
  }

  return res.status(500).json({
    error: 'Internal error',
    message: err.message,
  });
}

/**
 * Deduplicate analysis rows by ticker+profile, keeping the most recent.
 * Returns rows in their original order (which should be by created_at desc).
 */
function dedupByTickerProfile(rows) {
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const key = `${row.ticker}:${row.best_profile_match || row.profile}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }
  return unique;
}

// ============================================================================
// SEARCH endpoint - filtered, deduplicated, fast (DB-only)
// ============================================================================
router.get('/search', async (req, res) => {
  try {
    const {
      profile,
      min_score,
      max_score,
      recommendation,
      type,
      backbone,
      min_confidence,
      min_speed,
      min_yield,
      min_duration,
      sector,
      sort_by = 'overall_score',
      include_expired = 'false',
    } = req.query;

    // Validation
    if (!profile) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'profile is required (C1|G1|M1|F1)',
      });
    }
    if (!['C1', 'G1', 'M1', 'F1'].includes(profile)) {
      return res.status(400).json({
        error: 'Bad request',
        message: `Invalid profile: ${profile}`,
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);

    const supabase = getSupabase();

    // Fetch more than limit so we have rows to deduplicate from
    // (we may have multiple analyses per ticker+profile)
    const fetchLimit = limit * 3;

    let query = supabase
      .from('stocks_analysis_cache')
      .select(`
        id,
        ticker,
        yield_score,
        speed_score,
        duration_score,
        confidence_score,
        s31_total,
        backbone_tier,
        type_classification,
        recommendation,
        best_profile_match,
        quality_score,
        created_at,
        expires_at,
        stocks_master!inner(company_name, sector, industry, market_cap_class)
      `)
      .eq('best_profile_match', profile)
      .eq('analysis_type', 'full_valuation');

    if (include_expired !== 'true') {
      query = query.gt('expires_at', new Date().toISOString());
    }

    // Score filters
    if (min_score !== undefined) {
      query = query.gte('quality_score', parseInt(min_score));
    }
    if (max_score !== undefined) {
      query = query.lte('quality_score', parseInt(max_score));
    }
    if (min_confidence !== undefined) {
      query = query.gte('confidence_score', parseInt(min_confidence));
    }
    if (min_speed !== undefined) {
      query = query.gte('speed_score', parseInt(min_speed));
    }
    if (min_yield !== undefined) {
      query = query.gte('yield_score', parseInt(min_yield));
    }
    if (min_duration !== undefined) {
      query = query.gte('duration_score', parseInt(min_duration));
    }

    // Categorical filters
    if (recommendation) {
      const recs = recommendation.split(',').map(s => s.trim());
      query = query.in('recommendation', recs);
    }
    if (type) {
      query = query.eq('type_classification', type);
    }
    if (backbone) {
      const tiers = backbone.split(',').map(s => s.trim());
      query = query.in('backbone_tier', tiers);
    }

    // Always order by created_at desc FIRST so deduplication takes most recent
    query = query.order('created_at', { ascending: false });
    query = query.limit(fetchLimit);

    const { data, error } = await query;

    if (error) {
      console.error('[analysis/search] query error:', error);
      return res.status(500).json({ error: 'Search failed', message: error.message });
    }

    let results = data || [];

    // Sector filter (post-query, since it's on joined table)
    if (sector) {
      const sectorLower = sector.toLowerCase();
      results = results.filter(r =>
        r.stocks_master?.sector?.toLowerCase().includes(sectorLower)
      );
    }

    // Deduplicate by ticker+profile (keep most recent)
    results = dedupByTickerProfile(results);

    // Now sort by the requested column (after dedup)
    const sortColumn = {
      'overall_score': 'quality_score',
      'confidence': 'confidence_score',
      'speed': 'speed_score',
      'yield': 'yield_score',
      'duration': 'duration_score',
      'recent': 'created_at',
    }[sort_by] || 'quality_score';

    results.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (sortColumn === 'created_at') {
        return new Date(bVal) - new Date(aVal);
      }
      return bVal - aVal;
    });

    // Apply final limit after dedup
    results = results.slice(0, limit);

    // Flatten for cleaner response
    const flattened = results.map(r => ({
      id: r.id,
      ticker: r.ticker,
      company_name: r.stocks_master?.company_name || null,
      sector: r.stocks_master?.sector || null,
      industry: r.stocks_master?.industry || null,
      market_cap_class: r.stocks_master?.market_cap_class || null,

      overall_score: r.quality_score,
      recommendation: r.recommendation,
      backbone_tier: r.backbone_tier,
      type_classification: r.type_classification,
      s31_total: r.s31_total,

      yield_score: r.yield_score,
      speed_score: r.speed_score,
      duration_score: r.duration_score,
      confidence_score: r.confidence_score,

      analyzed_at: r.created_at,
      expires_at: r.expires_at,
      is_expired: new Date(r.expires_at) < new Date(),
    }));

    res.json({
      profile,
      filters_applied: {
        min_score,
        max_score,
        recommendation,
        type,
        backbone,
        min_confidence,
        min_speed,
        min_yield,
        min_duration,
        sector,
        sort_by,
      },
      count: flattened.length,
      results: flattened,
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// LIST endpoint - simple deduplicated list for autocomplete/sidebar
// ============================================================================
router.get('/list', async (req, res) => {
  try {
    const profile = req.query.profile;
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const supabase = getSupabase();
    let query = supabase
      .from('stocks_analysis_cache')
      .select('ticker, best_profile_match, quality_score, recommendation, created_at')
      .eq('analysis_type', 'full_valuation')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit * 3);

    if (profile) {
      query = query.eq('best_profile_match', profile);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'List failed', message: error.message });
    }

    const unique = dedupByTickerProfile(data || []).slice(0, limit);

    res.json({
      count: unique.length,
      profile: profile || 'all',
      tickers: unique,
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// HISTORY endpoint - all past analyses for a specific ticker
// ============================================================================
/**
 * GET /api/analysis/:ticker/history?profile=G1&limit=20
 *
 * Returns the full history of analyses for a ticker (optionally filtered by profile).
 * Useful for tracking how scores have evolved over time.
 */
router.get('/:ticker/history', async (req, res) => {
  try {
    const ticker = req.params.ticker?.toUpperCase();
    const profile = req.query.profile;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const include_expired = req.query.include_expired === 'true';

    if (!ticker) {
      return res.status(400).json({ error: 'Bad request', message: 'ticker is required' });
    }

    const supabase = getSupabase();
    let query = supabase
      .from('stocks_analysis_cache')
      .select(`
        id,
        ticker,
        best_profile_match,
        quality_score,
        recommendation,
        backbone_tier,
        type_classification,
        s31_total,
        yield_score,
        speed_score,
        duration_score,
        confidence_score,
        created_at,
        expires_at
      `)
      .eq('ticker', ticker)
      .eq('analysis_type', 'full_valuation')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (profile) {
      if (!['C1', 'G1', 'M1', 'F1'].includes(profile)) {
        return res.status(400).json({ error: 'Bad request', message: `Invalid profile: ${profile}` });
      }
      query = query.eq('best_profile_match', profile);
    }

    if (!include_expired) {
      query = query.gt('expires_at', new Date().toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[analysis/history] query error:', error);
      return res.status(500).json({ error: 'History query failed', message: error.message });
    }

    const flattened = (data || []).map(r => ({
      id: r.id,
      analyzed_at: r.created_at,
      profile: r.best_profile_match,
      overall_score: r.quality_score,
      recommendation: r.recommendation,
      backbone_tier: r.backbone_tier,
      type_classification: r.type_classification,
      s31_total: r.s31_total,
      four_d: {
        yield: r.yield_score,
        speed: r.speed_score,
        duration: r.duration_score,
        confidence: r.confidence_score,
      },
      expires_at: r.expires_at,
      is_expired: new Date(r.expires_at) < new Date(),
    }));

    res.json({
      ticker,
      profile: profile || 'all',
      count: flattened.length,
      history: flattened,
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// FULL ANALYSIS endpoint - the 4-layer pipeline
// ============================================================================
/**
 * GET /api/analysis/:ticker?profile=G1&force_refresh=false
 */
router.get('/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker?.toUpperCase();
    const profile = (req.query.profile || 'G1').toUpperCase();
    const forceRefresh = req.query.force_refresh === 'true';

    const result = await analyzeStock({ ticker, profile, forceRefresh });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
