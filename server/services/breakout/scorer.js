/**
 * Scorer for Breakout Engine
 *
 * Stage 1 weights (no Catalyst, no Sector — 65% total weight, rescaled to 100):
 *   Runway:    25 / 65 = 38.5%
 *   Revenue:   20 / 65 = 30.8%
 *   Sentiment: 20 / 65 = 30.8%
 *
 * Full Stage 3 weights (target):
 *   Runway 25 / Revenue 20 / Catalyst 20 / Sentiment 20 / Sector 15 = 100
 */

const STAGE1_WEIGHTS = {
  runway: 25,
  revenue: 20,
  sentiment: 20,
};

const STAGE1_TOTAL_WEIGHT = Object.values(STAGE1_WEIGHTS).reduce(
  (s, w) => s + w,
  0
);

/**
 * Compute final breakout score from block results.
 * @param {{runway: object, revenue: object, sentiment: object}} blocks
 * @returns {number} 0-100
 */
export function computeScore(blocks) {
  let weightedSum = 0;
  for (const [name, weight] of Object.entries(STAGE1_WEIGHTS)) {
    const blockScore = blocks[name]?.score ?? 50; // neutral fallback
    weightedSum += blockScore * weight;
  }
  return Math.round(weightedSum / STAGE1_TOTAL_WEIGHT);
}

/**
 * Map numeric score → tier with Hebrew label and emoji.
 */
export function scoreToTier(score) {
  if (score >= 75) {
    return {
      level: 'high',
      emoji: '🟢',
      label_he: 'הסתברות פריצה גבוהה',
      label_en: 'High Probability',
    };
  }
  if (score >= 60) {
    return {
      level: 'moderate',
      emoji: '🔵',
      label_he: 'הסתברות פריצה בינונית',
      label_en: 'Moderate Probability',
    };
  }
  if (score >= 40) {
    return {
      level: 'low',
      emoji: '🟡',
      label_he: 'הסתברות פריצה נמוכה',
      label_en: 'Low Probability',
    };
  }
  return {
    level: 'very_low',
    emoji: '🔴',
    label_he: 'הסתברות פריצה נמוכה מאוד',
    label_en: 'Very Low Probability',
  };
}
