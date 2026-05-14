/**
 * @file Engine Types (JSDoc contracts)
 * @description Type definitions for the 4-Layer Analysis Engine.
 *
 * The engine runs 4 sequential Claude calls (one per layer) on stock data.
 * Each layer produces a structured output that flows as context to the next.
 *
 * Output is in Hebrew (RTL) per RealValueX methodology language.
 */

/**
 * @typedef {'C1'|'G1'|'M1'|'F1'} ProfileCode
 * C1 = Core (long-term value, CAGR 7-15%)
 * G1 = Growth (15-30% CAGR, mid-term)
 * M1 = Momentum (30%+ in 3-6mo, catalyst-driven)
 * F1 = Frontier/Moonshot (binary, 1-3% position max)
 */

/**
 * @typedef {'A'|'B'|'C'} TypeClassification
 * A = Re-rating play (price is the Edge)
 * B = Compounder (X-Factor is the Edge)
 * C = Hybrid (Re-rating + Growth)
 */

/**
 * @typedef {'Pure'|'Near'|'In-Making'|'Niche'|'Aspiring'|'Commodity'} BackboneTier
 * Pure = de-facto monopoly (ASML, Visa)
 * Near = dominant + lock-in (NVIDIA, Microsoft)
 * In-Making = on the path (Palantir, Snowflake)
 * Niche = monopoly in a small but critical niche
 * Aspiring = high potential, unproven scale
 * Commodity = no X-Factor, not RealValueX material
 */

/**
 * @typedef {'GREEN'|'YELLOW'|'RED'} TrafficLight
 */

/**
 * @typedef {'high'|'medium'|'low'} SignalStrength
 */

/**
 * @typedef {Object} StockDataBundle
 * @description Bundle of normalized stock data fetched from the Facade.
 * Used as input to layer prompts.
 * @property {Object} profile - From stockData.getProfile()
 * @property {Object} quote - From stockData.getQuote()
 * @property {Object} keyMetrics - From stockData.getKeyMetricsTTM()
 * @property {Array<Object>} earnings - From stockData.getEarningsHistory()
 * @property {Object|null} priceTarget - From stockData.getPriceTargetConsensus()
 */

/**
 * @typedef {Object} Weakness
 * @property {number} chapter - Chapter number from the model
 * @property {string} issue - Description in Hebrew
 * @property {string[]} can_be_balanced_by - What signals from other layers could compensate
 */

/**
 * @typedef {Object} Strength
 * @property {number} chapter
 * @property {string} finding - Description in Hebrew
 */

/**
 * @typedef {Object} Layer1Output
 * @description Output from Layer 1 - Opportunity Engine.
 * Key question: "Is there Potential Energy here?"
 * IMPORTANT: weaknesses here do NOT reject the stock - they flag items for later layers.
 *
 * @property {'opportunity'} layer
 * @property {string} ticker
 * @property {ProfileCode} profile
 * @property {string} analyzed_at - ISO timestamp
 * @property {string} model - e.g. 'claude-opus-4-7'
 *
 * @property {Object} x_factor - From Chapter 7
 * @property {'TechLockIn'|'Scale'|'Ecosystem'|'DemandShock'|'Execution'|'None'} x_factor.type
 * @property {TrafficLight} x_factor.verdict
 * @property {string} x_factor.description
 * @property {TrafficLight} x_factor.durability - From Chapter 32 (Moat Durability)
 *
 * @property {Object} backbone
 * @property {BackboneTier} backbone.tier
 * @property {string} backbone.rationale
 *
 * @property {TypeClassification} type_classification
 * @property {'Development'|'Growth'|'Maturity'|'Decline'} lifecycle_stage
 *
 * @property {Weakness[]} weaknesses - Items flagged for later layers to evaluate
 * @property {Strength[]} strengths
 *
 * @property {Object} contributes_to_4d - This layer's signal to 4D scores
 * @property {SignalStrength} contributes_to_4d.yield_signal
 * @property {SignalStrength} contributes_to_4d.duration_signal
 *
 * @property {string} potential_energy_summary - 1-2 sentence summary
 * @property {string[]} positive_indicators
 * @property {string[]} negative_indicators
 * @property {string[]} needs_attention
 *
 * @property {Object} usage - Token usage tracking
 * @property {number} usage.input_tokens
 * @property {number} usage.output_tokens
 */

/**
 * @typedef {Object} AnalysisContext
 * @description The cumulative context that flows between layers.
 * Each layer receives ALL prior layers' outputs as context.
 *
 * @property {string} ticker
 * @property {ProfileCode} profile
 * @property {StockDataBundle} stockData
 * @property {Layer1Output|null} layer1
 * @property {Object|null} layer2  - Will be defined in 3C-2
 * @property {Object|null} layer3  - Will be defined in 3C-3
 * @property {Object|null} layer4  - Will be defined in 3C-3
 */

// Re-export as named constants for runtime use
export const PROFILES = ['C1', 'G1', 'M1', 'F1'];
export const TYPES = ['A', 'B', 'C'];
export const BACKBONE_TIERS = ['Pure', 'Near', 'In-Making', 'Niche', 'Aspiring', 'Commodity'];
export const TRAFFIC_LIGHTS = ['GREEN', 'YELLOW', 'RED'];
export const SIGNAL_STRENGTHS = ['high', 'medium', 'low'];
export const X_FACTOR_TYPES = ['TechLockIn', 'Scale', 'Ecosystem', 'DemandShock', 'Execution', 'None'];
export const LIFECYCLE_STAGES = ['Development', 'Growth', 'Maturity', 'Decline'];

/**
 * Validate that a profile code is valid.
 * @param {string} profile
 * @returns {boolean}
 */
export function isValidProfile(profile) {
  return PROFILES.includes(profile);
}
