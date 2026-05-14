/**
 * @file Provider Registry
 * @description Single point of entry to get the active data provider.
 * Future: support multiple providers by env var or feature flag.
 */

const fmp = require('./fmp');

const PROVIDERS = {
  fmp,
  // polygon: require('./polygon'),       // future
  // alphavantage: require('./alphavantage'),  // future
};

const DEFAULT_PROVIDER = 'fmp';

/**
 * Get a specific provider by name, or the active default.
 * @param {string} [name] - provider name (defaults to env or 'fmp')
 * @returns {DataProvider}
 */
function getProvider(name) {
  const providerName = name || process.env.ACTIVE_DATA_PROVIDER || DEFAULT_PROVIDER;
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(`Unknown data provider: ${providerName}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  return provider;
}

/**
 * List all registered providers.
 * @returns {string[]}
 */
function listProviders() {
  return Object.keys(PROVIDERS);
}

module.exports = {
  getProvider,
  listProviders,
};
