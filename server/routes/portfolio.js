/**
 * @file Portfolio routes
 * @description Endpoints for portfolio-level analysis (no LLM, pure math)
 *
 * Mounted at: /api/portfolio/*
 *
 * Endpoints:
 *   POST /api/portfolio/analyze       Analyze portfolio (input: holdings array)
 *   GET  /api/portfolio                Get user's holdings from Supabase + analyze
 *   GET  /api/portfolio/health         Quick Health Score only (fastest endpoint)
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { analyzePortfolio } from '../services/portfolio/calculator.js';
import * as stockData from '../services/stock-data.js';

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
  console.error('[portfolio route] error:', err.message, err.stack);

  if (err.name === 'ProviderError') {
    return res.status(err.statusCode || 502).json({
      error: 'Data provider error',
      message: err.message,
      provider: err.provider,
    });
  }

  if (err.message?.includes('Bad request') || err.message?.includes('required')) {
    return res.status(400).json({ error: 'Bad request', message: err.message });
  }

  return res.status(500).json({
    error: 'Internal error',
    message: err.message,
  });
}

/**
 * Enrich holdings with live prices from FMP.
 * Uses internal cache - typically ~50ms per ticker if cached, ~500ms if not.
 *
 * @param {Array} holdings - [{ ticker, qty, avgCost, sector?, name? }]
 * @returns enriched holdings with live `price` field
 */
async function enrichWithLivePrices(holdings) {
  if (!Array.isArray(holdings) || holdings.length === 0) return [];

  // Fetch quotes in parallel (FMP cache handles dedup)
  const tickers = [...new Set(holdings.map(h => h.ticker?.toUpperCase()).filter(Boolean))];

  const quoteResults = await Promise.allSettled(
    tickers.map(t => stockData.getQuote(t))
  );

  // Build lookup map: ticker -> quote
  const quoteMap = {};
  tickers.forEach((ticker, i) => {
    const result = quoteResults[i];
    if (result.status === 'fulfilled' && result.value) {
      quoteMap[ticker] = result.value;
    }
  });

  // Also fetch profiles in parallel for sector data (only for those missing sector)
  const tickersMissingSector = tickers.filter(t => {
    const h = holdings.find(x => x.ticker?.toUpperCase() === t);
    return h && !h.sector;
  });

  let profileMap = {};
  if (tickersMissingSector.length > 0) {
    const profileResults = await Promise.allSettled(
      tickersMissingSector.map(t => stockData.getProfile(t))
    );
    tickersMissingSector.forEach((ticker, i) => {
      const result = profileResults[i];
      if (result.status === 'fulfilled' && result.value) {
        profileMap[ticker] = result.value;
      }
    });
  }

  // Build enriched holdings
  return holdings.map(h => {
    const ticker = h.ticker?.toUpperCase();
    const quote = quoteMap[ticker];
    const profile = profileMap[ticker];

    return {
      ticker,
      name: h.name || profile?.companyName || ticker,
      sector: h.sector || profile?.sector || 'Other',
      qty: Number(h.qty) || 0,
      avgCost: Number(h.avgCost) || 0,
      price: quote?.price || h.price || 0,  // fall back to provided price if quote fails
      priceSource: quote ? 'live' : (h.price ? 'provided' : 'missing'),
    };
  });
}

// ============================================================================
// POST /api/portfolio/analyze
// Analyze a portfolio provided in request body
// ============================================================================
/**
 * Request body:
 * {
 *   holdings: [
 *     { ticker: "AAPL", qty: 18, avgCost: 187.67, sector?: "Technology", name?: "Apple" }
 *   ],
 *   enrichWithLivePrices?: boolean  // default true. if false, expects `price` in each holding.
 * }
 *
 * Returns full portfolio analysis (see calculator.js analyzePortfolio output)
 */
router.post('/analyze', async (req, res) => {
  const startTime = Date.now();
  try {
    const { holdings, enrichWithLivePrices: shouldEnrich = true } = req.body;

    if (!Array.isArray(holdings)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'holdings must be an array',
      });
    }

    // Validate each holding has minimum required fields
    for (let i = 0; i < holdings.length; i++) {
      const h = holdings[i];
      if (!h.ticker) {
        return res.status(400).json({
          error: 'Bad request',
          message: `holdings[${i}]: ticker is required`,
        });
      }
      if (h.qty === undefined || h.avgCost === undefined) {
        return res.status(400).json({
          error: 'Bad request',
          message: `holdings[${i}] (${h.ticker}): qty and avgCost are required`,
        });
      }
    }

    // Enrich with live prices unless explicitly disabled
    const enriched = shouldEnrich
      ? await enrichWithLivePrices(holdings)
      : holdings.map(h => ({
          ticker: h.ticker?.toUpperCase(),
          name: h.name || h.ticker,
          sector: h.sector || 'Other',
          qty: Number(h.qty) || 0,
          avgCost: Number(h.avgCost) || 0,
          price: Number(h.price) || 0,
          priceSource: 'provided',
        }));

    const enrichTime = Date.now() - startTime;

    // Run the math
    const analysis = analyzePortfolio(enriched);

    const totalTime = Date.now() - startTime;

    res.json({
      ...analysis,
      meta: {
        analyzed_at: new Date().toISOString(),
        timings_ms: {
          enrich: enrichTime,
          calculate: totalTime - enrichTime,
          total: totalTime,
        },
        prices_live: enriched.filter(h => h.priceSource === 'live').length,
        prices_missing: enriched.filter(h => h.priceSource === 'missing').length,
      },
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// GET /api/portfolio
// Load user's holdings from Supabase and analyze
// ============================================================================
/**
 * Reads from `public.holdings` table (or whatever table you use)
 * Filters by req.user.id
 *
 * Returns full portfolio analysis
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();
  try {
    const supabase = getSupabase();
    const userId = req.user.id;

    // First, get the user's portfolio(s)
    const { data: portfolios, error: pErr } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId);

    if (pErr) {
      console.error('[portfolio/get] portfolios query error:', pErr);
      return res.status(500).json({
        error: 'Database error',
        message: pErr.message,
      });
    }

    if (!portfolios || portfolios.length === 0) {
      return res.json({
        empty: true,
        summary: { totalValue: 0, totalCost: 0, totalPnL: 0, totalPnLPct: 0, totalStocks: 0 },
        message_he: 'אין פורטפוליו. צור פורטפוליו והוסף החזקות',
      });
    }

    const portfolioIds = portfolios.map(p => p.id);

    // Now get holdings for all user's portfolios
    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('ticker, quantity, avg_cost, sector, name')
      .in('portfolio_id', portfolioIds);

    if (error) {
      console.error('[portfolio/get] holdings query error:', error);
      return res.status(500).json({
        error: 'Database error',
        message: error.message,
      });
    }

    if (!holdings || holdings.length === 0) {
      return res.json({
        empty: true,
        summary: { totalValue: 0, totalCost: 0, totalPnL: 0, totalPnLPct: 0, totalStocks: 0 },
        message_he: 'אין החזקות בתיק. הוסף מניות דרך Import או UI',
      });
    }

    // Map DB schema to calculator format
    const mapped = holdings.map(h => ({
      ticker: h.ticker,
      qty: h.quantity,
      avgCost: h.avg_cost,
      sector: h.sector,
      name: h.name,
    }));

    const dbTime = Date.now() - startTime;

    // Enrich with live prices
    const enriched = await enrichWithLivePrices(mapped);
    const enrichTime = Date.now() - dbTime - startTime;

    // Run analysis
    const analysis = analyzePortfolio(enriched);
    const totalTime = Date.now() - startTime;

    res.json({
      ...analysis,
      meta: {
        analyzed_at: new Date().toISOString(),
        source: 'supabase',
        timings_ms: {
          db: dbTime,
          enrich: enrichTime,
          calculate: totalTime - dbTime - enrichTime,
          total: totalTime,
        },
        prices_live: enriched.filter(h => h.priceSource === 'live').length,
        prices_missing: enriched.filter(h => h.priceSource === 'missing').length,
      },
    });
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// GET /api/portfolio/health
// Fastest endpoint - just Health Score + top warnings
// ============================================================================
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  try {
    const supabase = getSupabase();
    const userId = req.user.id;

    // Get user's portfolios
    const { data: portfolios, error: pErr } = await supabase
      .from('portfolios')
      .select('id')
      .eq('user_id', userId);

    if (pErr) {
      return res.status(500).json({ error: 'Database error', message: pErr.message });
    }

    if (!portfolios || portfolios.length === 0) {
      return res.json({
        empty: true,
        score: 0,
        tier: 'Empty',
        message_he: 'אין פורטפוליו',
      });
    }

    const portfolioIds = portfolios.map(p => p.id);

    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('ticker, quantity, avg_cost, sector')
      .in('portfolio_id', portfolioIds);

    if (error) {
      return res.status(500).json({ error: 'Database error', message: error.message });
    }

    if (!holdings || holdings.length === 0) {
      return res.json({
        empty: true,
        score: 0,
        tier: 'Empty',
        message_he: 'אין החזקות בתיק',
      });
    }

    const mapped = holdings.map(h => ({
      ticker: h.ticker,
      qty: h.quantity,
      avgCost: h.avg_cost,
      sector: h.sector,
    }));

    const enriched = await enrichWithLivePrices(mapped);
    const analysis = analyzePortfolio(enriched);

    res.json({
      score: analysis.healthScore.score,
      tier: analysis.healthScore.tier,
      tier_he: analysis.healthScore.tier_he,
      color: analysis.healthScore.color,
      breakdown: analysis.healthScore.breakdown,
      topWarnings_he: analysis.warnings_he.slice(0, 3),
      summary: {
        totalValue: analysis.summary.totalValue,
        totalPnLPct: analysis.summary.totalPnLPct,
        totalStocks: analysis.summary.totalStocks,
      },
      meta: {
        analyzed_at: new Date().toISOString(),
        time_ms: Date.now() - startTime,
      },
    });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
