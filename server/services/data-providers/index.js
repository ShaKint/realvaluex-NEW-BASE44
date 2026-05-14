/**
 * @file Provider Registry
 * @description Single point of entry to get the active data provider.
 */

import fmp from './fmp.js';

const PROVIDERS = {
  fmp,
  // polygon: ...   (future)
  // alphavantage: ...   (future)
};

const DEFAULT_PROVIDER = 'fmp';

/**
 * Get a specific provider by name, or the active default.
 * @param {string} [name]
 * @returns {Object} provider
 */
export function getProvider(name) {
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
export function listProviders() {
  return Object.keys(PROVIDERS);
}
