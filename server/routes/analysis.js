/**
 * @file Analysis routes
 * @description Endpoints for running the 4-Layer Engine on stocks.
 *
 * Mounted at: /api/analysis/*
 *
 * Endpoints:
 *   GET  /api/analysis/search       Search analyzed stocks by filters (fast, DB-only)
 *   GET  /api/analysis/list         List all analyzed stocks (paginated)
 *   GET  /api/analysis/:ticker      Run full 4-layer analysis (LLM, ~3-4 min)
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { analyzeStock } from '../services/engine/orchestrator.js';

const router = express.Router();

// ============================================================================
// Supabase client (for read-only search queries)
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

// ============================================================================
// SEARCH endpoint - fast DB-only search of analyzed stocks
// ============================================================================
/**
 * GET /api/analysis/search?profile=G1&min_score=70&recommendation=Buy,Hold&type=B
 *
 * Filters (all optional except profile):
 *   - profile: C1|G1|M1|F1 (required)
 *   - min_score: 0-100 (quality_score >= X)
 *   - max_score: 0-100
 *   - recommendation: comma-separated list (Strong Buy,Buy,Hold,Trim,Sell)
 *   - type: A|B|C
 *   - backbone: comma-separated list (Pure,Near,In-Making,Niche,Aspiring,Commodity)
 *   - min_confidence: 0-100
 *   - min_speed: 0-100
 *   - min_yield: 0-100
 *   - min_duration: 0-100
 *   - sector: text match on stocks_master.sector
 *   - limit: default 50, max 200
 *   - sort_by: overall_score|confidence|speed|yield|duration (default: overall_score desc)
 *   - include_expired: true to include expired cache entries (default: false)
 */
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

    // Date filter (not expired by default)
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

    // Sorting
    const sortColumn = {
      'overall_score': 'quality_score',
      'confidence': 'confidence_score',
      'speed': 'speed_score',
      'yield': 'yield_score',
      'duration': 'duration_score',
      'recent': 'created_at',
    }[sort_by] || 'quality_score';

    query = query.order(sortColumn, { ascending: false, nullsLast: true });
    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('[analysis/search] query error:', error);
      return res.status(500).json({ error: 'Search failed', message: error.message });
    }

    // Apply sector filter post-query (since it's on joined table)
    let results = data || [];
    if (sector) {
      const sectorLower = sector.toLowerCase();
      results = results.filter(r =>
        r.stocks_master?.sector?.toLowerCase().includes(sectorLower)
      );
    }

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
// LIST endpoint - simple list of all analyzed tickers (for autocomplete/sidebar)
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
      .limit(limit);

    if (profile) {
      query = query.eq('best_profile_match', profile);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'List failed', message: error.message });
    }

    // Deduplicate by ticker+profile (take most recent)
    const seen = new Set();
    const unique = [];
    for (const row of (data || [])) {
      const key = `${row.ticker}:${row.best_profile_match}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(row);
      }
    }

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
// FULL ANALYSIS endpoint - the 4-layer pipeline
// ============================================================================
/**
 * GET /api/analysis/:ticker?profile=G1&force_refresh=false
 *
 * Runs the full analysis pipeline for a stock.
 * If a recent cached result exists (TTL 4h), returns it instantly.
 * Set force_refresh=true to bypass cache.
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
