/**
 * @file RUC Calculator (Chapter 36)
 * @description Remaining Upside Capacity - "How much room is left to grow?"
 *
 * This is the answer to "כמה עוד יש לעלות?"
 *
 * RUC Score (0-100) is profile-aware:
 *   - C1 (Core): Long-term CAGR 8-15%
 *   - G1 (Growth): 20-30%/year
 *   - M1 (Momentum): 30%+ in 3-6 months
 *   - F1 (Frontier): Catalyst-driven, binary
 *
 * Inputs:
 *   - quote (current price, year high/low)
 *   - priceTarget (consensus)
 *   - layer1 (lifecycle, backbone)
 *   - layer2 (confidence)
 *   - layer3 (entry strategy targets)
 *   - keyMetrics (P/E vs sector)
 */

// ============================================================================
// Profile-specific upside expectations
// ============================================================================
const PROFILE_UPSIDE_TARGETS = {
  C1: { min: 8, target: 12, max: 15, timeframe_months: 24 },
  G1: { min: 15, target: 25, max: 40, timeframe_months: 12 },
  M1: { min: 25, target: 50, max: 100, timeframe_months: 6 },
  F1: { min: 50, target: 100, max: 500, timeframe_months: 18 },
};

// ============================================================================
// Component scores
// ============================================================================

/**
 * Score 1: Target Consensus delta (0-30 points)
 * How much upside do analysts see?
 */
function scoreTargetConsensus(currentPrice, priceTarget) {
  if (!priceTarget?.targetConsensus || !currentPrice) return { score: 15, delta_pct: null };

  const target = priceTarget.targetConsensus;
  const deltaPct = ((target - currentPrice) / currentPrice) * 100;

  let score;
  if (deltaPct >= 50) score = 30;
  else if (deltaPct >= 30) score = 25;
  else if (deltaPct >= 15) score = 20;
  else if (deltaPct >= 5) score = 15;
  else if (deltaPct >= -5) score = 10;
  else if (deltaPct >= -15) score = 5;
  else score = 0;

  return { score, delta_pct: Math.round(deltaPct * 10) / 10 };
}

/**
 * Score 2: Distance from year high (0-25 points)
 * Lower in range = more room to grow back
 */
function scoreDistanceFromHigh(currentPrice, yearHigh) {
  if (!yearHigh || !currentPrice) return { score: 12, distance_pct: null };

  const distPct = ((yearHigh - currentPrice) / yearHigh) * 100;

  let score;
  if (distPct >= 50) score = 25;     // 50%+ from high - lots of room
  else if (distPct >= 30) score = 22;
  else if (distPct >= 20) score = 18;
  else if (distPct >= 10) score = 14;
  else if (distPct >= 5) score = 10;
  else if (distPct >= 0) score = 6;
  else score = 4;                     // above year high - momentum but limited

  return { score, distance_pct: Math.round(distPct * 10) / 10 };
}

/**
 * Score 3: Lifecycle stage (0-20 points)
 */
function scoreLifecycle(lifecycle) {
  return {
    score: {
      'Development': 18,
      'Growth': 20,
      'Maturity': 10,
      'Decline': 2,
    }[lifecycle] || 12,
    stage: lifecycle,
  };
}

/**
 * Score 4: Backbone tier multiplier (0-15 points)
 * Stronger backbone = more sustained upside
 */
function scoreBackbone(tier) {
  return {
    score: {
      'Pure': 15,
      'Near': 13,
      'In-Making': 11,
      'Niche': 8,
      'Aspiring': 5,
      'Commodity': 2,
    }[tier] || 8,
    tier,
  };
}

/**
 * Score 5: Confidence (0-10 points)
 * Higher confidence = more reliable upside
 */
function scoreConfidence(confidenceScore) {
  return {
    score: Math.round((confidenceScore / 100) * 10),
    confidence: confidenceScore,
  };
}

// ============================================================================
// Time-Bound Upside calculation (per profile)
// ============================================================================
function computeTimeBoundUpside({ profile, currentPrice, layer3, priceTarget, rucScore }) {
  const profileTarget = PROFILE_UPSIDE_TARGETS[profile];

  // Use Layer 3 targets if available, else fall back to consensus
  const firstTarget = layer3.risk_levels?.first_target;
  const secondTarget = layer3.risk_levels?.second_target;
  const consensus = priceTarget?.targetConsensus;

  // Compute weighted target: 60% to first_target, 40% to second_target if both available
  let blendedTarget = null;
  if (firstTarget && secondTarget) {
    blendedTarget = firstTarget * 0.6 + secondTarget * 0.4;
  } else if (firstTarget) {
    blendedTarget = firstTarget;
  } else if (consensus) {
    blendedTarget = consensus;
  }

  // Adjust by RUC score (50 = neutral, scale 0.5x - 1.5x)
  const rucMultiplier = 0.5 + (rucScore / 100);

  if (!blendedTarget || !currentPrice) {
    return {
      time_bound_upside_pct: profileTarget.target,
      timeframe_months: profileTarget.timeframe_months,
      target_price_blended: null,
      method: 'profile_default',
    };
  }

  const rawUpsidePct = ((blendedTarget - currentPrice) / currentPrice) * 100;
  const adjustedUpsidePct = rawUpsidePct * rucMultiplier;

  // Constrain to profile bounds
  const finalUpsidePct = Math.max(
    -20,
    Math.min(profileTarget.max * 2, adjustedUpsidePct)
  );

  return {
    time_bound_upside_pct: Math.round(finalUpsidePct * 10) / 10,
    timeframe_months: profileTarget.timeframe_months,
    target_price_blended: Math.round(blendedTarget * 100) / 100,
    raw_upside_pct: Math.round(rawUpsidePct * 10) / 10,
    ruc_multiplier_applied: Math.round(rucMultiplier * 100) / 100,
    method: 'blended_targets',
  };
}

// ============================================================================
// Hebrew tier description
// ============================================================================
function rucTier(score) {
  if (score >= 75) return 'High Upside';
  if (score >= 55) return 'Moderate Upside';
  if (score >= 35) return 'Limited Upside';
  if (score >= 15) return 'Marginal Upside';
  return 'Capped';
}

function rucDescriptionHe(score, profile) {
  const tier = rucTier(score);
  return {
    'High Upside': `RUC גבוה - יש מקום משמעותי לעלייה לפרופיל ${profile}`,
    'Moderate Upside': `RUC בינוני - יש מקום סביר לעלייה לפרופיל ${profile}`,
    'Limited Upside': `RUC מוגבל - העלייה הצפויה מתונה`,
    'Marginal Upside': `RUC שולי - רוב ה-Upside כבר מומש`,
    'Capped': `RUC נמוך - המחיר קרוב למיצוי או מעבר ליעדים`,
  }[tier];
}

// ============================================================================
// Main computation
// ============================================================================
export function computeRUC({ profile, stockData, layer1, layer2, layer3 }) {
  if (!profile || !stockData || !layer1 || !layer2 || !layer3) {
    return null;
  }

  const currentPrice = stockData.quote?.price;
  const yearHigh = stockData.quote?.yearHigh;
  const priceTarget = stockData.priceTarget;

  // Compute component scores
  const targetScore = scoreTargetConsensus(currentPrice, priceTarget);
  const distScore = scoreDistanceFromHigh(currentPrice, yearHigh);
  const lifecycleScore = scoreLifecycle(layer1.lifecycle_stage);
  const backboneScore = scoreBackbone(layer1.backbone?.tier);
  const confidenceScore = scoreConfidence(layer2.confidence_score);

  // Total RUC score (0-100)
  const rucScore = Math.min(100,
    targetScore.score +
    distScore.score +
    lifecycleScore.score +
    backboneScore.score +
    confidenceScore.score
  );

  // Time-bound upside calculation
  const timeBoundUpside = computeTimeBoundUpside({
    profile, currentPrice, layer3, priceTarget, rucScore,
  });

  return {
    ruc_score: rucScore,
    ruc_tier: rucTier(rucScore),
    description_he: rucDescriptionHe(rucScore, profile),

    components: {
      target_consensus: targetScore,
      distance_from_high: distScore,
      lifecycle: lifecycleScore,
      backbone: backboneScore,
      confidence: confidenceScore,
    },

    time_bound_upside: timeBoundUpside,

    summary_he: timeBoundUpside.target_price_blended
      ? `RUC ${rucScore}/100 (${rucTier(rucScore)}) - פוטנציאל ${timeBoundUpside.time_bound_upside_pct > 0 ? '+' : ''}${timeBoundUpside.time_bound_upside_pct}% ב-${timeBoundUpside.timeframe_months} חודשים (יעד משולב $${timeBoundUpside.target_price_blended})`
      : `RUC ${rucScore}/100 (${rucTier(rucScore)}) - אין מספיק נתוני יעדים מספקים לחישוב מדויק`,
  };
}
