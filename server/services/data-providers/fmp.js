/**
 * @file FMP Data Provider
 * @description Implementation of DataProvider interface for Financial Modeling Prep.
 * Uses the "stable" API (financialmodelingprep.com/stable/...).
 * Falls back to v3 legacy if stable endpoint returns 404.
 *
 * Requires environment variable: FMP_API_KEY
 */

const { ProviderError, classifyMarketCap } = require('./interface');

const FMP_BASE_URL = 'https://financialmodelingprep.com';
const FMP_API_VERSION = 'stable'; // change to 'api/v3' if needed
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Make a request to FMP API.
 * @param {string} endpoint - e.g. 'profile', 'quote', 'key-metrics-ttm'
 * @param {Object} params - query parameters (apikey added automatically)
 * @returns {Promise<any>}
 * @throws {ProviderError}
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

    // FMP returns {"Error Message": "..."} for some errors with 200 status
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

/**
 * FMP often returns single-item endpoints as arrays. Unwrap them.
 */
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

// ============================================================================
// TTL Policy (seconds)
// ============================================================================
const TTL_POLICY = {
  'profile': 7 * 24 * 60 * 60,           // 7 days
  'quote': 5 * 60,                        // 5 minutes
  'key-metrics-ttm': 24 * 60 * 60,        // 24 hours
  'earnings': 24 * 60 * 60,               // 24 hours
  'price-target-consensus': 24 * 60 * 60, // 24 hours
};
const DEFAULT_TTL = 60 * 60; // 1 hour

// ============================================================================
// Provider export
// ============================================================================
module.exports = {
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

  getTTL(endpoint) {
    return TTL_POLICY[endpoint] || DEFAULT_TTL;
  },

  // Exposed for cache layer to use raw response from cache
  _normalize: {
    profile: (raw) => normalizeProfile(unwrapSingle(raw)),
    quote: (raw) => normalizeQuote(unwrapSingle(raw)),
    'key-metrics-ttm': (raw) => normalizeKeyMetrics(unwrapSingle(raw)),
    earnings: (raw) => Array.isArray(raw) ? raw.map(normalizeEarningsEntry) : [],
    'price-target-consensus': (raw) => normalizePriceTarget(unwrapSingle(raw)),
  },
};
