/**
 * @file Cisco Test Router
 *
 * Stage A (current): PPR only — Ch 37
 * Stage B: + RTA (Ch 38)
 * Stage C: + TPS (Ch 39)
 * Stage D: Cisco Test synthesizer + red/yellow/green flag
 * Stages E-H: 6 Asymmetry Layers + State Classifier + Action + Safeguards
 *
 * Mounted at /api/cisco-test in index.js with requireAuth.
 */

import { Router } from 'express';
import { analyzePPR } from '../services/cisco-test/blocks/ppr.js';

const router = Router();

/**
 * GET /api/cisco-test/:ticker
 *
 * Returns PPR-only result during Stage A.
 * Will be extended in future stages.
 */
router.get('/:ticker', async (req, res) => {
  const { ticker } = req.params;

  if (!ticker || ticker.length > 12) {
    return res.status(400).json({ error: 'Invalid ticker' });
  }

  try {
    const ppr = await analyzePPR(ticker);

    return res.json({
      ticker: ticker.toUpperCase(),
      stage: 'A',
      stageNote: 'Stage A: PPR (Ch 37) only. RTA, TPS, Asymmetry Layers, and State Classifier pending.',
      ppr,
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

/**
 * GET /api/cisco-test/_meta/health
 */
router.get('/_meta/health', (req, res) => {
  res.json({
    ok: true,
    service: 'cisco-test',
    stage: 'A',
    chapters_active: [37],
    chapters_pending: [38, 39],
    layers_pending: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'],
    state_classifier: 'pending',
    ts: Date.now(),
  });
});

export default router;
