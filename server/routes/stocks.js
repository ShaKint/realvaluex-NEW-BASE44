/**
 * @file Stock Data routes - thin wrapper around the stock-data Facade
 * @description Endpoints for serving stock data via cached FMP calls.
 *
 * Mounted at: /api/stocks/*
 *
 * Endpoints:
 *   GET  /api/stocks/smoke-test?ticker=AAPL
 *   GET  /api/stocks/:ticker/profile
 *   GET  /api/stocks/:ticker/quote
 *   GET  /api/stocks/:ticker/key-metrics
 *   GET  /api/stocks/:ticker/earnings?limit=24
 *   GET  /api/stocks/:ticker/price-target
 */

import express from 'express';
import * as stockData from '../services/stock-data.js';

const router = express.Router();

function handleError(res, err) {
  console.error('[stocks route] error:', err.message, err.stack);
  if (err.name === 'ProviderError') {
    return res.status(err.statusCode || 502).json({
      error: 'Provider error',
      message: err.message,
      provider: err.provider,
      retryable: err.retryable,
    });
  }
  return res.status(500).json({
    error: 'Internal error',
    message: err.message,
  });
}

router.get('/smoke-test', async (req, res) => {
  try {
    const ticker = (req.query.ticker || 'AAPL').toString().toUpperCase();
    const results = await stockData.smokeTest(ticker);
    const allOk = Object.values(results).every(r => r.ok);
    res.status(allOk ? 200 : 207).json({ ticker, allOk, results });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:ticker/profile', async (req, res) => {
  try {
    const profile = await stockData.getProfile(req.params.ticker);
    if (!profile) return res.status(404).json({ error: 'Not found', ticker: req.params.ticker });
    res.json(profile);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:ticker/quote', async (req, res) => {
  try {
    const quote = await stockData.getQuote(req.params.ticker);
    if (!quote) return res.status(404).json({ error: 'Not found', ticker: req.params.ticker });
    res.json(quote);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:ticker/key-metrics', async (req, res) => {
  try {
    const metrics = await stockData.getKeyMetricsTTM(req.params.ticker);
    if (!metrics) return res.status(404).json({ error: 'Not found', ticker: req.params.ticker });
    res.json(metrics);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:ticker/earnings', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 24, 40);
    const earnings = await stockData.getEarningsHistory(req.params.ticker, limit);
    res.json({ ticker: req.params.ticker.toUpperCase(), count: earnings.length, entries: earnings });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/:ticker/price-target', async (req, res) => {
  try {
    const target = await stockData.getPriceTargetConsensus(req.params.ticker);
    if (!target) return res.status(404).json({ error: 'Not found', ticker: req.params.ticker });
    res.json(target);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
