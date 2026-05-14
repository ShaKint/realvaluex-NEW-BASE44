/**
 * @file Stock Data Facade
 * @description Single entry point for all stock data needs.
 * Handles: cache lookup, provider call, cache write.
 *
 * Architecture: Cache stores NORMALIZED data (not raw provider responses).
 * Why: simpler than raw+normalize-on-read, and we already version the
 *      methodology in stocks_analysis_cache. If normalization changes, run
 *      cleanup_expired_cache() to wipe stale entries.
 *
 * Routes should ONLY use this module, not call providers directly.
 *
 * Example usage:
 *   const stockData = require('./services/stock-data');
 *   const profile = await stockData.getProfile('NVDA');
 *   const earnings = await stockData.getEarningsHistory('NVDA', 24);
 */

const { createClient } = require('@supabase/supabase-js');
const { getProvider } = require('./data-providers');
const { ProviderError } = require('./data-providers/interface');

// ============================================================================
// Supabase client (service_role - bypasses RLS, can read/write external_data_cache)
// ============================================================================
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  _supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _supabase;
}

// ============================================================================
// Cache key builder
// ============================================================================
function buildCacheKey(provider, endpoint, symbol, extraParams = null) {
  let key = `${provider}:${endpoint}:${symbol.toUpperCase()}`;
  if (extraParams) {
    const paramStr = Object.entries(extraParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}${v}`)
      .join('');
    if (paramStr) key += `:${paramStr}`;
  }
  return key;
}

// ============================================================================
// Cache operations
// ============================================================================
async function readCache(cacheKey) {
  try {
    const { data, error } = await getSupabase()
      .from('external_data_cache')
      .select('data')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.warn(`[stock-data] cache read error for ${cacheKey}:`, error.message);
      return null;
    }
    if (!data) return null;

    // Fire-and-forget hit count increment
    incrementHitCount(cacheKey).catch(err =>
      console.warn(`[stock-data] hit count increment failed:`, err.message)
    );

    return data.data;
  } catch (err) {
    console.warn(`[stock-data] cache read exception:`, err.message);
    return null;
  }
}

async function writeCache(cacheKey, provider, endpoint, symbol, normalizedData, ttlSeconds, params = null) {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const { error } = await getSupabase()
      .from('external_data_cache')
      .upsert({
        cache_key: cacheKey,
        provider,
        endpoint,
        symbol: symbol.toUpperCase(),
        params,
        data: normalizedData,
        status_code: 200,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt,
        hit_count: 0,
        last_hit_at: null,
      }, { onConflict: 'cache_key' });

    if (error) {
      console.warn(`[stock-data] cache write error for ${cacheKey}:`, error.message);
    }
  } catch (err) {
    console.warn(`[stock-data] cache write exception:`, err.message);
  }
}

async function incrementHitCount(cacheKey) {
  // Read-modify-write (not atomic, but acceptable for hit counts)
  const { data } = await getSupabase()
    .from('external_data_cache')
    .select('hit_count')
    .eq('cache_key', cacheKey)
    .maybeSingle();
  if (!data) return;
  await getSupabase()
    .from('external_data_cache')
    .update({
      hit_count: (data.hit_count || 0) + 1,
      last_hit_at: new Date().toISOString(),
    })
    .eq('cache_key', cacheKey);
}

// ============================================================================
// Generic fetch-with-cache wrapper
// ============================================================================
/**
 * @param {string} endpoint - provider endpoint name
 * @param {string} ticker
 * @param {Object|null} extraParams - extra params affecting cache key (e.g. {limit: 24})
 * @param {() => Promise<any>} fetchFn - returns NORMALIZED data
 * @returns {Promise<any>} normalized data (from cache or fresh)
 */
async function fetchWithCache(endpoint, ticker, extraParams, fetchFn) {
  if (!ticker || typeof ticker !== 'string') {
    throw new Error('Ticker is required and must be a string');
  }
  const tickerUpper = ticker.toUpperCase();
  const provider = getProvider();
  const cacheKey = buildCacheKey(provider.name, endpoint, tickerUpper, extraParams);

  // 1. Try cache
  const cached = await readCache(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // 2. Cache miss - fetch from provider (returns normalized data)
  const normalized = await fetchFn();

  // 3. Fire-and-forget cache write
  const ttl = provider.getTTL(endpoint);
  writeCache(cacheKey, provider.name, endpoint, tickerUpper, normalized, ttl, extraParams)
    .catch(err => console.warn(`[stock-data] background cache write failed:`, err.message));

  return normalized;
}

// ============================================================================
// Public API
// ============================================================================

async function getProfile(ticker) {
  return await fetchWithCache(
    'profile',
    ticker,
    null,
    () => getProvider().getProfile(ticker)
  );
}

async function getQuote(ticker) {
  return await fetchWithCache(
    'quote',
    ticker,
    null,
    () => getProvider().getQuote(ticker)
  );
}

async function getKeyMetricsTTM(ticker) {
  return await fetchWithCache(
    'key-metrics-ttm',
    ticker,
    null,
    () => getProvider().getKeyMetricsTTM(ticker)
  );
}

async function getEarningsHistory(ticker, limit = 24) {
  return await fetchWithCache(
    'earnings',
    ticker,
    { limit },
    () => getProvider().getEarningsHistory(ticker, limit)
  );
}

async function getPriceTargetConsensus(ticker) {
  return await fetchWithCache(
    'price-target-consensus',
    ticker,
    null,
    () => getProvider().getPriceTargetConsensus(ticker)
  );
}

/**
 * Manually invalidate cache for a ticker.
 * Use after: earnings event, price target change, manual data refresh.
 * @param {string} ticker
 * @param {string} [endpoint] - if omitted, invalidates ALL endpoints for ticker
 * @returns {Promise<number>} number of cache entries deleted
 */
async function invalidateCache(ticker, endpoint) {
  const supabase = getSupabase();
  let query = supabase
    .from('external_data_cache')
    .delete()
    .eq('symbol', ticker.toUpperCase());
  if (endpoint) query = query.eq('endpoint', endpoint);
  const { error, count } = await query;
  if (error) throw new Error(`Cache invalidation failed: ${error.message}`);
  return count || 0;
}

/**
 * Smoke test - call from a route or admin script to verify everything works end-to-end.
 * @param {string} [ticker='AAPL']
 * @returns {Promise<Object>} test results
 */
async function smokeTest(ticker = 'AAPL') {
  const results = {};
  const tests = [
    ['profile', () => getProfile(ticker)],
    ['quote', () => getQuote(ticker)],
    ['keyMetrics', () => getKeyMetricsTTM(ticker)],
    ['earnings', () => getEarningsHistory(ticker, 8)],
    ['priceTarget', () => getPriceTargetConsensus(ticker)],
  ];
  for (const [name, fn] of tests) {
    const start = Date.now();
    try {
      const data = await fn();
      results[name] = {
        ok: true,
        durationMs: Date.now() - start,
        hasData: data !== null && data !== undefined,
        sample: name === 'earnings' ? `${data?.length || 0} entries` : 'object',
      };
    } catch (err) {
      results[name] = {
        ok: false,
        durationMs: Date.now() - start,
        error: err.message,
        provider: err.provider,
        statusCode: err.statusCode,
      };
    }
  }
  return results;
}

module.exports = {
  getProfile,
  getQuote,
  getKeyMetricsTTM,
  getEarningsHistory,
  getPriceTargetConsensus,
  invalidateCache,
  smokeTest,
  ProviderError,
};
