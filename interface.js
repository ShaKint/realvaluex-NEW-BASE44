/**
 * @file Provider Interface (JSDoc contract)
 * @description All data providers (FMP, Polygon, AlphaVantage, etc) must implement this interface.
 *
 * Each provider exports a module with:
 *   - name: string (provider identifier)
 *   - 5 data methods (getProfile, getQuote, getKeyMetricsTTM, getEarningsHistory, getPriceTargetConsensus)
 *   - getTTL(endpoint): returns cache TTL in seconds per endpoint
 *
 * Methods return *normalized* data (consistent shape across providers).
 * Raw provider responses are stored in cache for debugging/audit but not exposed.
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
 * @property {string|null} ipoDate          ISO date string
 * @property {number|null} marketCap        in USD
 * @property {string|null} marketCapClass   'mega'|'large'|'mid'|'small'|'micro'|'nano'
 * @property {boolean} isEtf
 * @property {boolean} isActive
 * @property {Object} raw                   Original provider response (for debugging)
 */

/**
 * @typedef {Object} StockQuote
 * @property {string} ticker
 * @property {number} price
 * @property {number} change
 * @property {number} changePercentage
 * @property {number} dayLow
 * @property {number} dayHigh
 * @property {number} yearLow              52-week low
 * @property {number} yearHigh             52-week high
 * @property {number|null} ma50            50-day moving average
 * @property {number|null} ma200           200-day moving average
 * @property {number} volume
 * @property {number} marketCap
 * @property {number} timestamp            Unix timestamp
 * @property {Object} raw
 */

/**
 * @typedef {Object} KeyMetrics
 * @property {string} ticker
 * @property {number|null} peTtm
 * @property {number|null} evToEbitda
 * @property {number|null} evToSales
 * @property {number|null} evToFcf
 * @property {number|null} roe             Return on Equity
 * @property {number|null} roic            Return on Invested Capital
 * @property {number|null} fcfYield        Free Cash Flow Yield
 * @property {number|null} earningsYield
 * @property {number|null} currentRatio
 * @property {number|null} netDebtToEbitda
 * @property {number|null} rdToRevenue     R&D as % of Revenue
 * @property {Object} raw
 */

/**
 * @typedef {Object} EarningsEntry
 * @property {string} date                 ISO date string
 * @property {number|null} epsActual       null = not reported yet
 * @property {number|null} epsEstimated
 * @property {number|null} revenueActual
 * @property {number|null} revenueEstimated
 * @property {'beat'|'miss'|'inline'|'pending'} status
 * @property {number|null} beatMagnitude   % difference (epsActual - epsEstimated) / epsEstimated
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
 * @typedef {Object} DataProvider
 * @property {string} name
 * @property {(ticker: string) => Promise<StockProfile>} getProfile
 * @property {(ticker: string) => Promise<StockQuote>} getQuote
 * @property {(ticker: string) => Promise<KeyMetrics>} getKeyMetricsTTM
 * @property {(ticker: string, limit?: number) => Promise<EarningsEntry[]>} getEarningsHistory
 * @property {(ticker: string) => Promise<PriceTargetConsensus>} getPriceTargetConsensus
 * @property {(endpoint: string) => number} getTTL  Returns TTL in seconds
 */

/**
 * Provider error - thrown by providers on API failures.
 * Façade layer catches these and decides whether to retry, fallback, or propagate.
 */
class ProviderError extends Error {
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
 * Used by providers when normalizing to StockProfile.
 */
const MARKET_CAP_THRESHOLDS = {
  mega: 200_000_000_000,   // >= $200B
  large: 10_000_000_000,   // $10B - $200B
  mid: 2_000_000_000,      // $2B - $10B
  small: 300_000_000,      // $300M - $2B
  micro: 50_000_000,       // $50M - $300M
  // nano: < $50M
};

/**
 * Classify market cap into class string.
 * @param {number} marketCap
 * @returns {'mega'|'large'|'mid'|'small'|'micro'|'nano'|null}
 */
function classifyMarketCap(marketCap) {
  if (!marketCap || marketCap <= 0) return null;
  if (marketCap >= MARKET_CAP_THRESHOLDS.mega) return 'mega';
  if (marketCap >= MARKET_CAP_THRESHOLDS.large) return 'large';
  if (marketCap >= MARKET_CAP_THRESHOLDS.mid) return 'mid';
  if (marketCap >= MARKET_CAP_THRESHOLDS.small) return 'small';
  if (marketCap >= MARKET_CAP_THRESHOLDS.micro) return 'micro';
  return 'nano';
}

module.exports = {
  ProviderError,
  classifyMarketCap,
  MARKET_CAP_THRESHOLDS,
};
