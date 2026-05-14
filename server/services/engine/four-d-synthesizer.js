/**
 * @file 4D Score Synthesizer
 * @description Computes the 4D scores (Yield × Speed × Duration × Confidence)
 * and the Asymmetry Index.
 *
 * Per MODEL.md and DB schema:
 *   asymmetry_index = (yield × speed × duration × confidence) / 1,000,000
 *   Range: 0-100 each, asymmetry: 0-100
 *
 * Each dimension synthesizes signals from multiple layers.
 */

/**
 * Convert signal strength to numeric.
 */
function signalToNumeric(signal) {
  return { 'high': 80, 'medium': 50, 'low': 25 }[signal] || 50;
}

// ============================================================================
// Yield Score - "How much could this make?"
// ============================================================================
function computeYieldScore({ layer1, ruc, s31 }) {
  // Base: RUC score (which already incorporates upside potential)
  let score = ruc.ruc_score * 0.55;

  // Layer 1 yield signal contribution
  const yieldSignal = signalToNumeric(layer1.contributes_to_4d?.yield_signal);
  score += yieldSignal * 0.25;

  // S31 Narr contribution (catalyst-driven upside)
  score += (s31.narr_score / 2) * 100 * 0.2;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// Speed Score - "How fast will it happen?"
// ============================================================================
function computeSpeedScore({ layer3, s31 }) {
  // Base: Layer 3 speed score directly
  let score = layer3.speed_score * 0.7;

  // Mkt contribution from S31 (timing signal)
  score += (s31.mkt_score / 4) * 100 * 0.3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// Duration Score - "How long will this work?"
// ============================================================================
function computeDurationScore({ layer1, layer4 }) {
  // Layer 1 duration signal
  let score = signalToNumeric(layer1.contributes_to_4d?.duration_signal) * 0.4;

  // X-Factor durability
  const durabilityBonus = {
    'GREEN': 30,
    'YELLOW': 18,
    'RED': 8,
  }[layer1.x_factor?.durability] || 18;
  score += durabilityBonus;

  // Thesis confidence (from Layer 4)
  const thesisContribution = (layer4.thesis_confidence || 50) * 0.3;
  score += thesisContribution;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ============================================================================
// Confidence Score - directly from Layer 2
// ============================================================================
function computeConfidenceScore({ layer2 }) {
  return Math.max(0, Math.min(100, layer2.confidence_score));
}

// ============================================================================
// Asymmetry Index
// ============================================================================
function computeAsymmetryIndex({ yieldScore, speedScore, durationScore, confidenceScore }) {
  return Math.round(
    ((yieldScore * speedScore * durationScore * confidenceScore) / 1000000) * 100
  ) / 100;
}

// ============================================================================
// Hebrew tier per score
// ============================================================================
function scoreTier(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 65) return 'Strong';
  if (score >= 50) return 'Moderate';
  if (score >= 35) return 'Weak';
  return 'Poor';
}

// ============================================================================
// Main
// ============================================================================
export function computeFourD({ layer1, layer2, layer3, layer4, ruc, s31 }) {
  if (!layer1 || !layer2 || !layer3 || !layer4 || !ruc || !s31) {
    return null;
  }

  const yieldScore = computeYieldScore({ layer1, ruc, s31 });
  const speedScore = computeSpeedScore({ layer3, s31 });
  const durationScore = computeDurationScore({ layer1, layer4 });
  const confidenceScore = computeConfidenceScore({ layer2 });

  const asymmetryIndex = computeAsymmetryIndex({
    yieldScore, speedScore, durationScore, confidenceScore,
  });

  return {
    yield_score: yieldScore,
    yield_tier: scoreTier(yieldScore),

    speed_score: speedScore,
    speed_tier: scoreTier(speedScore),

    duration_score: durationScore,
    duration_tier: scoreTier(durationScore),

    confidence_score: confidenceScore,
    confidence_tier: scoreTier(confidenceScore),

    asymmetry_index: asymmetryIndex,
    asymmetry_tier:
      asymmetryIndex >= 50 ? 'Outstanding Asymmetry' :
      asymmetryIndex >= 30 ? 'High Asymmetry' :
      asymmetryIndex >= 15 ? 'Good Asymmetry' :
      asymmetryIndex >= 8 ? 'Moderate Asymmetry' :
      'Low Asymmetry',

    summary_he: `4D: Y=${yieldScore} S=${speedScore} D=${durationScore} C=${confidenceScore} | Asymmetry Index: ${asymmetryIndex}`,
  };
}
