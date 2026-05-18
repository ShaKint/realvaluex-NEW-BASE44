/**
 * FMP API helper for Breakout Engine
 * Centralizes calls to FMP "stable" API.
 *
 * NOTE: If the existing codebase uses a different base URL (v3/v4),
 * update FMP_BASE accordingly. The "stable" endpoints below have been
 * verified against the live FMP API on Build plan as of 2026-05-18.
 */

const FMP_BASE = 'https://financialmodelingprep.com/stable';

/**
 * Build a URL and fetch JSON from FMP.
 * @param {string} endpoint - e.g. "cashflow-statement"
 * @param {object} params - query params (symbol, period, limit, etc.)
 * @returns {Promise<any>} parsed JSON
 * @throws on non-2xx or plan-gated responses
 */
export async function fmpGet(endpoint, params = {}) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new Error('FMP_API_KEY env var is missing');
  }

  const query = new URLSearchParams({ ...params, apikey: apiKey });
  const url = `${FMP_BASE}/${endpoint}?${query.toString()}`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`FMP network error for ${endpoint}: ${err.message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Surface plan-gating clearly so callers can fallback
    if (body.includes('higher plan') || body.includes('upgrade')) {
      const planErr = new Error(`FMP plan-gated: ${endpoint}`);
      planErr.planGated = true;
      planErr.endpoint = endpoint;
      throw planErr;
    }
    throw new Error(`FMP ${endpoint} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Safe wrapper — returns null on plan-gating, throws on other errors.
 * Use this when a block should gracefully degrade if data unavailable.
 */
export async function fmpGetSafe(endpoint, params = {}) {
  try {
    return await fmpGet(endpoint, params);
  } catch (err) {
    if (err.planGated) {
      console.warn(`[breakout/fmp] ${endpoint} plan-gated, returning null`);
      return null;
    }
    throw err;
  }
}
