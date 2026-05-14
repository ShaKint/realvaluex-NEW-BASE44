/**
 * @file Provider Interface (JSDoc contract)
 * @description All data providers (FMP, Polygon, AlphaVantage, etc) must implement this interface.
 *
 * Each provider exports a module with:
 *   - name: string (provider identifier)
 *   - 5 data methods (getProfile, getQuote, getKeyMetricsTTM, getEarningsHistory, getPriceTargetConsensus)
 *   - getTTL(endpoint): returns cache TTL in seconds per endpoint
 *
 * Methods return normalized data (consistent shape across providers).
 */

/**
 * @typedef {Object} StockProfile
 * @property {string} ticker
 * @property {string} companyName
 * @property {string|null} sector
 * @property {string|null} industry
 * @property {string|null} exchange
 * @property {string|null} country
 * @property {string} currency
 * @property {string|null} description
 * @property {string|null} website
 * @property {string|null} ceo
 * @property {string|null} ipoDate
 * @property {number|null} marketCap
 * @property {string|null} marketCapClass
 * @property {boolean} isEtf
 * @property {boolean} isActive
 * @property {Object} raw
 */

/**
 * @typedef {Object} StockQuote
 * @property {string} ticker
 * @property {number} price
 * @property {number} change
 * @property {number} changePercentage
 * @property {number} dayLow
 * @property {number} dayHigh
 * @property {number} yearLow
 * @property {number} yearHigh
 * @property {number|null} ma50
 * @property {number|null} ma200
 * @property {number} volume
 * @property {number} marketCap
 * @property {number} timestamp
 * @property {Object} raw
 */

/**
 * @typedef {Object} KeyMetrics
 * @property {string} ticker
 * @property {number|null} peTtm
 * @property {number|null} evToEbitda
 * @property {number|null} evToSales
 * @property {number|null} evToFcf
 * @property {number|null} roe
 * @property {number|null} roic
 * @property {number|null} fcfYield
 * @property {number|null} earningsYield
 * @property {number|null} currentRatio
 * @property {number|null} netDebtToEbitda
 * @property {number|null} rdToRevenue
 * @property {Object} raw
 */

/**
 * @typedef {Object} EarningsEntry
 * @property {string} date
 * @property {number|null} epsActual
 * @property {number|null} epsEstimated
 * @property {number|null} revenueActual
 * @property {number|null} revenueEstimated
 * @property {'beat'|'miss'|'inline'|'pending'} status
 * @property {number|null} beatMagnitude
 */

/**
 * @typedef {Object} PriceTargetConsensus
 * @property {string} ticker
 * @property {number|null} targetHigh
 * @property {number|null} targetLow
 * @property {number|null} targetConsensus
 * @property {number|null} targetMedian
 */

/**
 * Provider error - thrown by providers on API failures.
 * Facade layer catches these and decides whether to retry, fallback, or propagate.
 */
export class ProviderError extends Error {
  constructor(message, { provider, endpoint, statusCode, retryable = false } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.endpoint = endpoint;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

/**
 * Market cap thresholds (USD) for classification.
 */
export const MARKET_CAP_THRESHOLDS = {
  mega: 200_000_000_000,
  large: 10_000_000_000,
  mid: 2_000_000_000,
  small: 300_000_000,
  micro: 50_000_000,
};

/**
 * Classify market cap into class string.
 * @param {number} marketCap
 * @returns {'mega'|'large'|'mid'|'small'|'micro'|'nano'|null}
 */
export function classifyMarketCap(marketCap) {
  if (!marketCap || marketCap <= 0) return null;
  if (marketCap >= MARKET_CAP_THRESHOLDS.mega) return 'mega';
  if (marketCap >= MARKET_CAP_THRESHOLDS.large) return 'large';
  if (marketCap >= MARKET_CAP_THRESHOLDS.mid) return 'mid';
  if (marketCap >= MARKET_CAP_THRESHOLDS.small) return 'small';
  if (marketCap >= MARKET_CAP_THRESHOLDS.micro) return 'micro';
  return 'nano';
}
