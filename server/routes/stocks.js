/**
 * @file Stock Data routes - thin wrapper around the stock-data Facade
 * @description Endpoints for testing the data layer and serving raw stock data.
 *
 * Mounted at: /api/stocks/*
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
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

// ============================================================================
// DIAGNOSTIC ENDPOINT - temporary, for debugging cache write issues
// ============================================================================
router.get('/cache-debug', async (req, res) => {
  const diagnostics = {
    env_check: {},
    supabase_init: null,
    insert_test: null,
    select_test: null,
  };

  // Step 1: Check env vars exist
  diagnostics.env_check.SUPABASE_URL_present = !!process.env.SUPABASE_URL;
  diagnostics.env_check.SUPABASE_URL_value = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : null;
  diagnostics.env_check.SUPABASE_SERVICE_ROLE_KEY_present = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  diagnostics.env_check.SUPABASE_SERVICE_ROLE_KEY_length = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0;
  // Decode JWT role from key (first part of JWT, base64-decoded)
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      diagnostics.env_check.key_role = payload.role || 'unknown';
      diagnostics.env_check.key_iss = payload.iss || 'unknown';
    } else {
      diagnostics.env_check.key_role = 'not-a-jwt';
    }
  } catch (e) {
    diagnostics.env_check.key_role_decode_error = e.message;
  }

  // Step 2: Initialize Supabase client
  let supabase;
  try {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    diagnostics.supabase_init = 'ok';
  } catch (err) {
    diagnostics.supabase_init = `error: ${err.message}`;
    return res.json(diagnostics);
  }

  // Step 3: Try an INSERT
  try {
    const testKey = `diagnostic:test:${Date.now()}`;
    const { data, error } = await supabase
      .from('external_data_cache')
      .insert({
        cache_key: testKey,
        provider: 'fmp',
        endpoint: 'debug',
        symbol: 'DEBUG',
        data: { diagnostic: true, ts: Date.now() },
        expires_at: new Date(Date.now() + 60000).toISOString(),
      })
      .select();

    if (error) {
      diagnostics.insert_test = {
        ok: false,
        error_message: error.message,
        error_code: error.code,
        error_details: error.details,
        error_hint: error.hint,
      };
    } else {
      diagnostics.insert_test = {
        ok: true,
        rows_inserted: data?.length || 0,
        inserted_key: testKey,
      };
    }
  } catch (err) {
    diagnostics.insert_test = { ok: false, exception: err.message };
  }

  // Step 4: SELECT to verify
  try {
    const { data, error } = await supabase
      .from('external_data_cache')
      .select('cache_key, symbol, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(5);
    if (error) {
      diagnostics.select_test = { ok: false, error_message: error.message };
    } else {
      diagnostics.select_test = { ok: true, rows: data || [] };
    }
  } catch (err) {
    diagnostics.select_test = { ok: false, exception: err.message };
  }

  res.json(diagnostics);
});

// ============================================================================
// Regular routes
// ============================================================================

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
