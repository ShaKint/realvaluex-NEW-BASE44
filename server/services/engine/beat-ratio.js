/**
 * @file Beat Ratio Calculator (Chapter 11.5)
 * @description Calculates earnings beat ratios from historical earnings data.
 *
 * Per MODEL.md Chapter 11.5, Beat Ratio is "the strongest indicator of Confidence":
 *   - >80% over 5 years  = Backbone Executor (+15 Confidence)
 *   - 65-80%              = Strong Performer (+5-10 Confidence)
 *   - 50-65%              = Mediocre
 *   - <50%                = Promise Stock (-15 Confidence, apply 50% discount on guidance)
 *
 * This is a pure math computation - no LLM needed. Saves tokens and is more reliable.
 */

/**
 * Classify a single earnings entry: beat / miss / inline / pending.
 * Tolerance of 1% for "inline" classification.
 */
function classifyEntry(entry) {
  const actual = entry.epsActual;
  const estimate = entry.epsEstimated;

  if (actual === null || actual === undefined ||
      estimate === null || estimate === undefined ||
      estimate === 0) {
    return { status: 'pending', magnitude: null };
  }

  const magnitude = (actual - estimate) / Math.abs(estimate);
  if (magnitude > 0.01) return { status: 'beat', magnitude };
  if (magnitude < -0.01) return { status: 'miss', magnitude };
  return { status: 'inline', magnitude };
}

/**
 * Compute beat ratio for a slice of earnings entries.
 * Returns null if not enough data.
 */
function computeRatio(entries) {
  if (!entries || entries.length === 0) return null;

  const classified = entries
    .map(classifyEntry)
    .filter(c => c.status !== 'pending');

  if (classified.length === 0) return null;

  const beats = classified.filter(c => c.status === 'beat').length;
  const misses = classified.filter(c => c.status === 'miss').length;
  const inline = classified.filter(c => c.status === 'inline').length;

  const beatMagnitudes = classified
    .filter(c => c.status === 'beat')
    .map(c => c.magnitude);

  return {
    total: classified.length,
    beats,
    misses,
    inline,
    ratio: beats / classified.length,
    avg_beat_magnitude: beatMagnitudes.length > 0
      ? beatMagnitudes.reduce((a, b) => a + b, 0) / beatMagnitudes.length
      : null,
  };
}

/**
 * Determine direction by comparing recent vs older periods.
 */
function computeDirection(earnings) {
  if (earnings.length < 8) return 'Unknown';

  const reported = earnings.filter(e =>
    e.epsActual !== null && e.epsActual !== undefined &&
    e.epsEstimated !== null && e.epsEstimated !== undefined
  );

  if (reported.length < 8) return 'Unknown';

  // Earnings are returned newest-first by FMP
  const recent = reported.slice(0, 4);
  const older = reported.slice(4, 8);

  const recentRatio = computeRatio(recent)?.ratio ?? 0;
  const olderRatio = computeRatio(older)?.ratio ?? 0;
  const delta = recentRatio - olderRatio;

  if (delta > 0.15) return 'Improving';
  if (delta < -0.15) return 'Deteriorating';
  return 'Stable';
}

/**
 * Categorize per MODEL.md Chapter 11.5.
 */
function categorize(ratio5y) {
  if (ratio5y === null) return 'Unknown';
  if (ratio5y >= 0.80) return 'Backbone Executor';
  if (ratio5y >= 0.65) return 'Strong Performer';
  if (ratio5y >= 0.50) return 'Mediocre';
  return 'Promise Stock';
}

/**
 * Compute Confidence score contribution per category.
 */
function confidenceContribution(category) {
  switch (category) {
    case 'Backbone Executor': return 15;
    case 'Strong Performer': return 8;
    case 'Mediocre': return 0;
    case 'Promise Stock': return -15;
    default: return 0;
  }
}

/**
 * Main: compute Beat Ratio analysis from earnings history.
 *
 * @param {Array<Object>} earnings - Earnings entries (newest first), as returned by getEarningsHistory.
 *                                    Each entry: {date, epsActual, epsEstimated, ...}
 * @returns {Object} Beat Ratio analysis result
 */
export function computeBeatRatio(earnings) {
  if (!Array.isArray(earnings) || earnings.length === 0) {
    return {
      ratio_1y: null,
      ratio_5y: null,
      ratio_10y: null,
      avg_beat_magnitude_5y: null,
      direction: 'Unknown',
      category: 'Unknown',
      confidence_contribution: 0,
      total_quarters_5y: 0,
      beats_5y: 0,
      misses_5y: 0,
      inline_5y: 0,
      summary: 'אין נתוני earnings זמינים',
    };
  }

  // FMP returns newest-first; take the requested windows
  const last4 = earnings.slice(0, 4);     // ~1 year
  const last20 = earnings.slice(0, 20);   // ~5 years
  const last40 = earnings.slice(0, 40);   // ~10 years

  const r1y = computeRatio(last4);
  const r5y = computeRatio(last20);
  const r10y = computeRatio(last40);
  const direction = computeDirection(earnings);
  const category = categorize(r5y?.ratio ?? null);
  const contribution = confidenceContribution(category);

  // Generate Hebrew summary
  const summary = buildSummary({ r5y, category, direction });

  return {
    ratio_1y: r1y?.ratio ?? null,
    ratio_5y: r5y?.ratio ?? null,
    ratio_10y: r10y?.ratio ?? null,
    avg_beat_magnitude_5y: r5y?.avg_beat_magnitude ?? null,
    direction,
    category,
    confidence_contribution: contribution,
    total_quarters_5y: r5y?.total ?? 0,
    beats_5y: r5y?.beats ?? 0,
    misses_5y: r5y?.misses ?? 0,
    inline_5y: r5y?.inline ?? 0,
    summary,
  };
}

function buildSummary({ r5y, category, direction }) {
  if (!r5y || r5y.total === 0) {
    return 'אין מספיק נתונים לחישוב Beat Ratio';
  }

  const pct = Math.round((r5y.ratio || 0) * 100);
  const magnitudePct = r5y.avg_beat_magnitude !== null
    ? Math.round((r5y.avg_beat_magnitude || 0) * 100)
    : null;

  const directionHe = {
    'Improving': 'מגמת שיפור',
    'Stable': 'יציב',
    'Deteriorating': 'מגמת הרעה',
    'Unknown': 'לא ידוע',
  }[direction];

  const categoryHe = {
    'Backbone Executor': 'Backbone Executor - מבצע מצוין, אינדיקטור חזק ל-Confidence',
    'Strong Performer': 'Strong Performer - ביצועים טובים אך לא שלמים',
    'Mediocre': 'Mediocre - ביצוע בינוני, רלוונטי רק עם Catalyst חזק',
    'Promise Stock': 'Promise Stock - דגל אדום: ההנהלה לא עומדת בהבטחות, יש להחיל 50% discount על תחזיות',
  }[category];

  const magPart = magnitudePct !== null
    ? `, beat magnitude ממוצע: ${magnitudePct}%`
    : '';

  return `Beat Ratio של ${pct}% מתוך ${r5y.total} רבעונים (${r5y.beats} beats, ${r5y.misses} misses, ${r5y.inline} inline)${magPart}. מגמה: ${directionHe}. סיווג: ${categoryHe}.`;
}
