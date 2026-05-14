/**
 * @file FMP Data Provider
 * @description Implementation of DataProvider interface for Financial Modeling Prep.
 * Uses the "stable" API. Requires env variable: FMP_API_KEY
 */

import { ProviderError, classifyMarketCap } from './interface.js';

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_VERSION = 'stable';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Make a request to FMP API.
 */
async function fmpRequest(endpoint, params = {}) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new ProviderError('FMP_API_KEY not configured', {
      provider: 'fmp',
      endpoint,
      retryable: false,
    });
  }

  const url = new URL(`${FMP_BASE_URL}/${FMP_API_VERSION}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  });
  url.searchParams.set('apikey', apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });

    if (!response.ok) {
      const isRetryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(
        `FMP ${endpoint} returned ${response.status}`,
        { provider: 'fmp', endpoint, statusCode: response.status, retryable: isRetryable }
      );
    }

    const data = await response.json();

    if (data && typeof data === 'object' && data['Error Message']) {
      throw new ProviderError(
        `FMP ${endpoint}: ${data['Error Message']}`,
        { provider: 'fmp', endpoint, statusCode: 200, retryable: false }
      );
    }

    return data;
  } catch (err) {
    if (err instanceof ProviderError) throw err;
    if (err.name === 'AbortError') {
      throw new ProviderError(`FMP ${endpoint} timeout after ${REQUEST_TIMEOUT_MS}ms`, {
        provider: 'fmp',
        endpoint,
        retryable: true,
      });
    }
    throw new ProviderError(`FMP ${endpoint} network error: ${err.message}`, {
      provider: 'fmp',
      endpoint,
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function unwrapSingle(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

// ============================================================================
// Normalization functions
// ============================================================================

function normalizeProfile(raw) {
  if (!raw) return null;
  return {
    ticker: raw.symbol,
    companyName: raw.companyName || null,
    sector: raw.sector || null,
    industry: raw.industry || null,
    exchange: raw.exchange || null,
    country: raw.country || null,
    currency: raw.currency || 'USD',
    description: raw.description || null,
    website: raw.website || null,
    ceo: raw.ceo || null,
    ipoDate: raw.ipoDate || null,
    marketCap: raw.marketCap || null,
    marketCapClass: classifyMarketCap(raw.marketCap),
    isEtf: !!raw.isEtf,
    isActive: !!raw.isActivelyTrading,
    raw,
  };
}

function normalizeQuote(raw) {
  if (!raw) return null;
  return {
    ticker: raw.symbol,
    price: raw.price,
    change: raw.change,
    changePercentage: raw.changePercentage,
    dayLow: raw.dayLow,
    dayHigh: raw.dayHigh,
    yearLow: raw.yearLow,
    yearHigh: raw.yearHigh,
    ma50: raw.priceAvg50 ?? null,
    ma200: raw.priceAvg200 ?? null,
    volume: raw.volume,
    marketCap: raw.marketCap,
    timestamp: raw.timestamp,
    raw,
  };
}

function normalizeKeyMetrics(raw) {
  if (!raw) return null;
  return {
    ticker: raw.symbol,
    peTtm: raw.earningsYieldTTM ? (1 / raw.earningsYieldTTM) : null,
    evToEbitda: raw.evToEBITDATTM ?? null,
    evToSales: raw.evToSalesTTM ?? null,
    evToFcf: raw.evToFreeCashFlowTTM ?? null,
    roe: raw.returnOnEquityTTM ?? null,
    roic: raw.returnOnInvestedCapitalTTM ?? null,
    fcfYield: raw.freeCashFlowYieldTTM ?? null,
    earningsYield: raw.earningsYieldTTM ?? null,
    currentRatio: raw.currentRatioTTM ?? null,
    netDebtToEbitda: raw.netDebtToEBITDATTM ?? null,
    rdToRevenue: raw.researchAndDevelopementToRevenueTTM ?? null,
    raw,
  };
}

function normalizeEarningsEntry(raw) {
  const actual = raw.epsActual;
  const estimate = raw.epsEstimated;

  let status = 'pending';
  let beatMagnitude = null;

  if (actual !== null && actual !== undefined && estimate !== null && estimate !== undefined && estimate !== 0) {
    beatMagnitude = (actual - estimate) / Math.abs(estimate);
    if (beatMagnitude > 0.01) status = 'beat';
    else if (beatMagnitude < -0.01) status = 'miss';
    else status = 'inline';
  }

  return {
    date: raw.date,
    epsActual: actual ?? null,
    epsEstimated: estimate ?? null,
    revenueActual: raw.revenueActual ?? null,
    revenueEstimated: raw.revenueEstimated ?? null,
    status,
    beatMagnitude,
  };
}

function normalizePriceTarget(raw) {
  if (!raw) return null;
  return {
    ticker: raw.symbol,
    targetHigh: raw.targetHigh ?? null,
    targetLow: raw.targetLow ?? null,
    targetConsensus: raw.targetConsensus ?? null,
    targetMedian: raw.targetMedian ?? null,
  };
}

/**
 * Normalize a historical price entry from FMP's "light" endpoint.
 * FMP response: { symbol, date, price, volume }
 */
function normalizeHistoricalPrice(raw) {
  if (!raw || !raw.date) return null;
  return {
    date: raw.date,
    close: raw.price ?? null,
    volume: raw.volume ?? null,
  };
}

// ============================================================================
// TTL Policy (seconds)
// ============================================================================
const TTL_POLICY = {
  'profile': 7 * 24 * 60 * 60,
  'quote': 5 * 60,
  'key-metrics-ttm': 24 * 60 * 60,
  'earnings': 24 * 60 * 60,
  'price-target-consensus': 24 * 60 * 60,
  'historical-prices': 24 * 60 * 60,
};
const DEFAULT_TTL = 60 * 60;

// ============================================================================
// Provider export
// ============================================================================
const fmpProvider = {
  name: 'fmp',

  async getProfile(ticker) {
    const raw = await fmpRequest('profile', { symbol: ticker });
    return normalizeProfile(unwrapSingle(raw));
  },

  async getQuote(ticker) {
    const raw = await fmpRequest('quote', { symbol: ticker });
    return normalizeQuote(unwrapSingle(raw));
  },

  async getKeyMetricsTTM(ticker) {
    const raw = await fmpRequest('key-metrics-ttm', { symbol: ticker });
    return normalizeKeyMetrics(unwrapSingle(raw));
  },

  async getEarningsHistory(ticker, limit = 24) {
    const raw = await fmpRequest('earnings', { symbol: ticker, limit });
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeEarningsEntry);
  },

  async getPriceTargetConsensus(ticker) {
    const raw = await fmpRequest('price-target-consensus', { symbol: ticker });
    return normalizePriceTarget(unwrapSingle(raw));
  },

  /**
   * Get historical daily closing prices for the last N days.
   * Returns array sorted newest-first (matches FMP response order).
   *
   * @param {string} ticker
   * @param {number} days - Number of calendar days back (default 90)
   * @returns {Promise<Array<{date: string, close: number, volume: number}>>}
   */
  async getHistoricalPrices(ticker, days = 90) {
    const toDate = new Date().toISOString().split('T')[0];
    const fromDateMs = Date.now() - days * 86400000;
    const fromDate = new Date(fromDateMs).toISOString().split('T')[0];

    const raw = await fmpRequest('historical-price-eod-light', {
      symbol: ticker,
      from: fromDate,
      to: toDate,
    });

    // FMP "stable" returns flat array. Defensive: also handle { historical: [...] }
    let entries;
    if (Array.isArray(raw)) {
      entries = raw;
    } else if (raw && Array.isArray(raw.historical)) {
      entries = raw.historical;
    } else {
      return [];
    }

    return entries.map(normalizeHistoricalPrice).filter(Boolean);
  },

  getTTL(endpoint) {
    return TTL_POLICY[endpoint] || DEFAULT_TTL;
  },
};

export default fmpProvider;
