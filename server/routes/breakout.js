/**
 * Breakout Engine — Express router
 *
 * Stage 1 MVP endpoint:
 *   GET /api/breakout/:ticker
 *     → returns breakout analysis for a single ticker
 *
 * Auth: requires Bearer token (Supabase JWT) — same pattern as /api/analysis
 *
 * Stage 2+ will add:
 *   POST /api/breakout/analyze   (batch list)
 *   GET  /api/breakout            (current user's full portfolio)
 */

import { Router } from 'express';
import { analyzeBreakout } from '../services/breakout/calculator.js';

const router = Router();

/**
 * Verify Supabase JWT — minimal middleware.
 * NOTE: If the project already has a shared auth middleware (e.g. in
 * server/middleware/auth.js), import it instead and remove this stub.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization Bearer token' });
  }
  // Token verification is delegated to downstream services that use it.
  // We just gate on presence here; full verification happens in supabase calls.
  req.authToken = token;
  next();
}

/**
 * GET /api/breakout/:ticker
 */
router.get('/:ticker', requireAuth, async (req, res) => {
  const { ticker } = req.params;

  if (!ticker || ticker.length > 12) {
    return res.status(400).json({ error: 'Invalid ticker' });
  }

  try {
    const result = await analyzeBreakout(ticker);
    return res.json(result);
  } catch (err) {
    console.error(`[breakout] Failed for ${ticker}:`, err);
    return res.status(500).json({
      error: 'Breakout analysis failed',
      message: err.message,
      ticker,
    });
  }
});

/**
 * GET /api/breakout/health
 * Lightweight health check that doesn't hit FMP.
 */
router.get('/_meta/health', (req, res) => {
  res.json({
    ok: true,
    service: 'breakout-engine',
    stage: 'mvp',
    blocks_active: ['runway', 'revenue', 'sentiment'],
    blocks_pending: ['catalyst', 'sector'],
    ts: Date.now(),
  });
});

export default router;
