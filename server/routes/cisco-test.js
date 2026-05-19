/**
 * @file Cisco Test Router
 *
 * Stage A:    PPR only (Ch 37)
 * Stage A.5:  + E1 Prediction Registry persistence (Supabase)
 * Stage B+:   RTA, TPS, Synthesizer, Layers, State Classifier
 *
 * Auth: requireAuth applied at app.use() level in index.js
 *       so req.user.id is guaranteed populated.
 */

import { Router } from 'express';
import { analyzePPR } from '../services/cisco-test/blocks/ppr.js';
import {
  savePrediction,
  getPredictionHistory,
} from '../services/cisco-test/storage.js';

const router = Router();

/**
 * GET /api/cisco-test/_meta/health
 */
router.get('/_meta/health', (req, res) => {
  res.json({
    ok: true,
    service: 'cisco-test',
    stage: 'A.5',
    chapters_active: [37],
    chapters_pending: [38, 39],
    layers_pending: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'],
    state_classifier: 'pending',
    safeguards_active: ['E1', 'E2', 'E3', 'E4'],
    safeguards_pending: [],
    ts: Date.now(),
  });
});

/**
 * GET /api/cisco-test/history/:ticker
 * Returns the prediction history for the current user + ticker.
 */
router.get('/history/:ticker', async (req, res) => {
  const { ticker } = req.params;
  if (!ticker || ticker.length > 12) {
    return res.status(400).json({ error: 'Invalid ticker' });
  }

  const result = await getPredictionHistory({
    userId: req.user.id,
    ticker,
    limit: 20,
  });

  if (!result.ok) {
    return res.status(500).json({ error: 'History fetch failed', message: result.error });
  }

  return res.json({
    ticker: ticker.toUpperCase(),
    count: result.predictions.length,
    predictions: result.predictions,
  });
});

/**
 * GET /api/cisco-test/:ticker
 *
 * Runs PPR analysis and persists it (E1 Safeguard).
 * If save fails, the analysis is still returned with `saved: false`
 * so the user knows immediately something is wrong.
 */
router.get('/:ticker', async (req, res) => {
  const { ticker } = req.params;

  if (!ticker || ticker.length > 12) {
    return res.status(400).json({ error: 'Invalid ticker' });
  }

  try {
    // 1. Run the analysis
    const ppr = await analyzePPR(ticker);

    // 2. Save to Supabase (E1) — never throws, returns {saved, id?, error?}
    let saveResult = { saved: false, error: 'block returned an error' };
    if (!ppr.error) {
      saveResult = await savePrediction({
        userId: req.user.id,
        pprResult: ppr,
        stage: 'A',
        blocksActive: ['ppr'],
      });
    }

    // 3. Return — include save status so user sees persistence health
    return res.json({
      ticker: ticker.toUpperCase(),
      stage: 'A.5',
      stageNote:
        'Stage A.5: PPR (Ch 37) + E1 Prediction Registry. RTA, TPS, Layers, State Classifier pending.',
      ppr,
      persistence: {
        saved: saveResult.saved,
        predictionId: saveResult.id || null,
        error: saveResult.error || null,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cisco-test] Failed for', ticker, ':', err);
    return res.status(500).json({
      error: 'Cisco test analysis failed',
      message: err.message,
      ticker,
    });
  }
});

export default router;
