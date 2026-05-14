/**
 * @file Analysis routes
 * @description Endpoints for running the 4-Layer Engine on stocks.
 *
 * Mounted at: /api/analysis/*
 *
 * Endpoints:
 *   GET  /api/analysis/search             Search analyzed stocks (deduplicated)
 *   GET  /api/analysis/list               List all analyzed (deduplicated)
 *   GET  /api/analysis/:ticker/chart      Price history + technical indicators (no LLM, fast)
 *   GET  /api/analysis/:ticker/history    Historical analyses for a ticker
 *   GET  /api/analysis/:ticker            Run full 4-layer analysis (LLM)
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { analyzeStock } from '../services/engine/orchestrator.js';
import * as stockData from '../services/stock-data.js';
import { computeTechnicalIndicators } from '../services/engine/technical-indicators.js';

const router = express.Router();

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
// CHART endpoint - price history + technical indicators (FAST, no LLM)
// ============================================================================
/**
 * GET /api/analysis/:ticker/chart?days=90
 *
 * Returns historical price data + technical indicators.
 * Uses FMP cache - typically returns in ~500ms.
 *
 * Response shape:
 * {
 *   ticker, current_price, year_high, year_low,
 *   quote: { price, change, changePercentage, dayLow, dayHigh, volume, marketCap, ... },
 *   historical: [{ date, close, volume }, ...],  // newest first
 *   indicators: {
 *     rsi: { value, zone, description },
 *     moving_averages: { ma20, ma50, ma200, state, description },
 *     distance: { from_year_high_pct, from_year_low_pct },
 *     momentum: { ... },
 *     volume: { ... },
 *     structure: { pattern, description },
 *     volatility: { annualized_pct },
 *     summary
 *   }
 * }
 */
router.get('/:ticker/chart', async (req, res) => {
  try {
    const ticker = req.params.ticker?.toUpperCase();
    const days = Math.min(parseInt(req.query.days) || 90, 365);

    if (!ticker) {
      return res.status(400).json({ error: 'Bad request', message: 'ticker is required' });
    }

    // Fetch in parallel (all cached)
    const [quote, historical, profile] = await Promise.all([
      stockData.getQuote(ticker),
      stockData.getHistoricalPrices(ticker, days),
      stockData.getProfile(ticker),
    ]);

    if (!quote && !historical?.length) {
      return res.status(404).json({ error: 'Not found', ticker });
    }

    // Compute technical indicators
    const indicators = computeTechnicalIndicators(historical || [], quote);

    res.json({
      ticker,
      company_name: profile?.companyName || null,
      sector: profile?.sector || null,
      industry: profile?.industry || null,

      current_price: quote?.price || null,
      year_high: quote?.yearHigh || null,
      year_low: quote?.yearLow || null,

      quote: quote ? {
        price: quote.price,
        change: quote.change,
        changePercentage: quote.changePercentage,
        dayLow: quote.dayLow,
        dayHigh: quote.dayHigh,
        volume: quote.volume,
        marketCap: quote.marketCap,
        ma50: quote.ma50,
        ma200: quote.ma200,
        timestamp: quote.timestamp,
      } : null,

      historical: historical || [],
      indicators,
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// SEARCH endpoint
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
    const fetchLimit = limit * 3;

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

    if (include_expired !== 'true') {
      query = query.gt('expires_at', new Date().toISOString());
    }

    if (min_score !== undefined) query = query.gte('quality_score', parseInt(min_score));
    if (max_score !== undefined) query = query.lte('quality_score', parseInt(max_score));
    if (min_confidence !== undefined) query = query.gte('confidence_score', parseInt(min_confidence));
    if (min_speed !== undefined) query = query.gte('speed_score', parseInt(min_speed));
    if (min_yield !== undefined) query = query.gte('yield_score', parseInt(min_yield));
    if (min_duration !== undefined) query = query.gte('duration_score', parseInt(min_duration));

    if (recommendation) {
      const recs = recommendation.split(',').map(s => s.trim());
      query = query.in('recommendation', recs);
    }
    if (type) query = query.eq('type_classification', type);
    if (backbone) {
      const tiers = backbone.split(',').map(s => s.trim());
      query = query.in('backbone_tier', tiers);
    }

    query = query.order('created_at', { ascending: false });
    query = query.limit(fetchLimit);

    const { data, error } = await query;

    if (error) {
      console.error('[analysis/search] query error:', error);
      return res.status(500).json({ error: 'Search failed', message: error.message });
    }

    let results = data || [];

    if (sector) {
      const sectorLower = sector.toLowerCase();
      results = results.filter(r =>
        r.stocks_master?.sector?.toLowerCase().includes(sectorLower)
      );
    }

    results = dedupByTickerProfile(results);

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
      if (sortColumn === 'created_at') return new Date(bVal) - new Date(aVal);
      return bVal - aVal;
    });

    results = results.slice(0, limit);

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
        min_score, max_score, recommendation, type, backbone,
        min_confidence, min_speed, min_yield, min_duration, sector, sort_by,
      },
      count: flattened.length,
      results: flattened,
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// LIST endpoint
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

    if (profile) query = query.eq('best_profile_match', profile);

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
// HISTORY endpoint
// ============================================================================
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
        id, ticker, best_profile_match, quality_score, recommendation,
        backbone_tier, type_classification, s31_total,
        yield_score, speed_score, duration_score, confidence_score,
        created_at, expires_at
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
// FULL ANALYSIS endpoint
// ============================================================================
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
