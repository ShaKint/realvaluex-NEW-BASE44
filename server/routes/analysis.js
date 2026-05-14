/**
 * @file Analysis routes
 * @description Endpoints for running the 4-Layer Engine on stocks.
 *
 * Mounted at: /api/analysis/*
 *
 * Endpoints:
 *   GET  /api/analysis/:ticker?profile=G1   Run full analysis (currently Layer 1 only)
 */

import express from 'express';
import { analyzeStock } from '../services/engine/orchestrator.js';

const router = express.Router();

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

  // Validation errors
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
 * GET /api/analysis/:ticker?profile=G1
 *
 * Runs the analysis pipeline for a stock.
 * Currently returns Layer 1 (Opportunity) output only.
 * Future layers will be added in 3C-2/3/4.
 */
router.get('/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker?.toUpperCase();
    const profile = (req.query.profile || 'G1').toUpperCase();

    const result = await analyzeStock({ ticker, profile });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
