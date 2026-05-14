/**
 * @file S31 Protocol (Chapter 31)
 * @description Pure-math computation of the S31 Allocation Score.
 *
 * Total: Fund (0-4) + Mkt (0-4) + Narr (0-2) = 0-10
 *
 * Allocation Bands (per DB schema):
 *   - 0-4: Exploratory
 *   - 5-6: Mid Position
 *   - 7-10: Full Scaling
 *
 * Inputs come from prior layers - no LLM needed.
 */

// ============================================================================
// Fund Score (0-4) - from Layer 1 + Layer 2
// ============================================================================
function computeFundScore({ layer1, layer2, beatRatio }) {
  let score = 0;
  const breakdown = {};

  // Component 1: X-Factor + Backbone (0-1.5)
  const backboneScore = {
    'Pure': 1.5,
    'Near': 1.2,
    'In-Making': 0.9,
    'Niche': 0.7,
    'Aspiring': 0.4,
    'Commodity': 0.0,
  }[layer1.backbone?.tier] || 0;

  const xFactorMultiplier = {
    'GREEN': 1.0,
    'YELLOW': 0.7,
    'RED': 0.3,
  }[layer1.x_factor?.verdict] || 0.5;

  const xFactorContribution = backboneScore * xFactorMultiplier;
  score += xFactorContribution;
  breakdown.x_factor_backbone = Math.round(xFactorContribution * 100) / 100;

  // Component 2: Confidence Score (0-1.5)
  const confidenceContribution = (layer2.confidence_score / 100) * 1.5;
  score += confidenceContribution;
  breakdown.confidence = Math.round(confidenceContribution * 100) / 100;

  // Component 3: Beat Ratio bonus (0-1.0)
  const beatRatioContribution = {
    'Backbone Executor': 1.0,
    'Strong Performer': 0.6,
    'Mediocre': 0.2,
    'Promise Stock': -0.3,
  }[beatRatio.category] || 0;
  score += beatRatioContribution;
  breakdown.beat_ratio = Math.round(beatRatioContribution * 100) / 100;

  // Cap at 0-4
  const finalScore = Math.max(0, Math.min(4, Math.round(score)));
  return { score: finalScore, breakdown };
}

// ============================================================================
// Mkt Score (0-4) - from Layer 3 (Timing)
// ============================================================================
function computeMktScore({ layer3, technicalIndicators }) {
  let score = 0;
  const breakdown = {};

  // Component 1: Speed Score (0-2)
  const speedContribution = (layer3.speed_score / 100) * 2;
  score += speedContribution;
  breakdown.speed = Math.round(speedContribution * 100) / 100;

  // Component 2: MA structure (0-1)
  const maContribution = {
    'Bullish': 1.0,
    'Recovery': 0.7,
    'Mixed': 0.4,
    'Correction': 0.3,
    'Bearish': 0.0,
    'Unknown': 0.3,
  }[technicalIndicators.moving_averages?.state] || 0.3;
  score += maContribution;
  breakdown.ma_structure = Math.round(maContribution * 100) / 100;

  // Component 3: Structure pattern (0-1)
  const structureContribution = {
    'breakout-up': 1.0,
    'consolidation': 0.8,
    'pullback-from-high': 0.7,
    'uptrend': 0.6,
    'choppy': 0.3,
    'downtrend': 0.1,
    'breakdown': 0.0,
    'flat': 0.4,
    'insufficient-data': 0.4,
  }[technicalIndicators.structure?.pattern] || 0.4;
  score += structureContribution;
  breakdown.structure = Math.round(structureContribution * 100) / 100;

  const finalScore = Math.max(0, Math.min(4, Math.round(score)));
  return { score: finalScore, breakdown };
}

// ============================================================================
// Narr Score (0-2) - from Layer 3 catalysts + Layer 1 lifecycle
// ============================================================================
function computeNarrScore({ layer1, layer3 }) {
  let score = 0;
  const breakdown = {};

  // Component 1: Catalyst density (0-1.2)
  const nearCatalysts = layer3.catalyst_map?.near_term?.length || 0;
  const mediumCatalysts = layer3.catalyst_map?.medium_term?.length || 0;
  const totalCatalysts = nearCatalysts + mediumCatalysts;
  const catalystContribution = Math.min(1.2, totalCatalysts * 0.3);
  score += catalystContribution;
  breakdown.catalysts = Math.round(catalystContribution * 100) / 100;

  // Component 2: Lifecycle stage (0-0.8)
  const lifecycleContribution = {
    'Development': 0.5,
    'Growth': 0.8,
    'Maturity': 0.4,
    'Decline': 0.1,
  }[layer1.lifecycle_stage] || 0.4;
  score += lifecycleContribution;
  breakdown.lifecycle = Math.round(lifecycleContribution * 100) / 100;

  const finalScore = Math.max(0, Math.min(2, Math.round(score)));
  return { score: finalScore, breakdown };
}

// ============================================================================
// Allocation Band (matches DB generated column)
// ============================================================================
function allocationBand(total) {
  if (total >= 7 && total <= 10) return 'Full Scaling';
  if (total >= 5 && total <= 6) return 'Mid Position';
  return 'Exploratory';
}

function hebrewAllocationDescription(band) {
  return {
    'Full Scaling': 'בנייה מלאה - פוזיציה מלאה לפי הפרופיל',
    'Mid Position': 'פוזיציה בינונית - 50-70% מהגודל הסופי',
    'Exploratory': 'פוזיציה ראשונית - 20-30% מהגודל הסופי או המתנה',
  }[band];
}

// ============================================================================
// Main computation
// ============================================================================
export function computeS31({ layer1, layer2, layer3, beatRatio, technicalIndicators }) {
  if (!layer1 || !layer2 || !layer3 || !beatRatio || !technicalIndicators) {
    return null;
  }

  const fund = computeFundScore({ layer1, layer2, beatRatio });
  const mkt = computeMktScore({ layer3, technicalIndicators });
  const narr = computeNarrScore({ layer1, layer3 });

  const total = fund.score + mkt.score + narr.score;
  const band = allocationBand(total);

  return {
    fund_score: fund.score,
    mkt_score: mkt.score,
    narr_score: narr.score,
    total_score: total,
    allocation_band: band,
    allocation_description_he: hebrewAllocationDescription(band),

    fund_breakdown: fund.breakdown,
    mkt_breakdown: mkt.breakdown,
    narr_breakdown: narr.breakdown,

    summary: `S31 = Fund(${fund.score}) + Mkt(${mkt.score}) + Narr(${narr.score}) = ${total}/10 → ${band}`,
  };
}
