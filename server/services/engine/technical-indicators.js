/**
 * @file Technical Indicators (Chapter 22-25)
 * @description Pure-math computation of technical indicators from historical prices.
 *
 * No LLM needed - this is deterministic math. Saves tokens and is more reliable.
 *
 * Indicators computed:
 *   - RSI (14-period) - momentum oscillator
 *   - MA50, MA200 - trend
 *   - Distance from 52w high/low - position in range
 *   - Momentum slope (20-day) - direction
 *   - Volume profile (recent vs avg)
 *   - Price structure (consolidation/breakout/pullback)
 *
 * Input: array of {date, close, volume} sorted NEWEST FIRST (as FMP returns).
 */

// ============================================================================
// Helpers
// ============================================================================

/**
 * Simple Moving Average over N periods.
 * @param {number[]} closes - closes in NEWEST-FIRST order
 * @param {number} period
 */
function sma(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(0, period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * RSI (Relative Strength Index) using Wilder's smoothing.
 * Standard 14-period.
 * @param {number[]} closes - in NEWEST-FIRST order
 * @param {number} period - default 14
 * @returns {number|null} RSI in range 0-100
 */
function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;

  // Reverse to oldest-first for calculation
  const oldestFirst = [...closes].reverse();

  let gains = 0;
  let losses = 0;

  // Initial average over first `period` changes
  for (let i = 1; i <= period; i++) {
    const change = oldestFirst[i] - oldestFirst[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Wilder's smoothing for remaining points
  for (let i = period + 1; i < oldestFirst.length; i++) {
    const change = oldestFirst[i] - oldestFirst[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Linear regression slope (over N periods).
 * Returns slope as % per day (annualized for daily data).
 * @param {number[]} closes - in NEWEST-FIRST order
 * @param {number} period
 */
function momentumSlope(closes, period = 20) {
  if (closes.length < period) return null;

  // Use oldest-first for x-axis to be intuitive
  const slice = closes.slice(0, period).reverse();

  const n = slice.length;
  const xs = Array.from({ length: n }, (_, i) => i);
  const ys = slice;

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Express as % per day relative to mean price
  const meanY = sumY / n;
  if (meanY === 0) return null;
  return (slope / meanY) * 100;
}

/**
 * Identify simple price structure pattern over recent window.
 * Returns one of: 'breakout-up', 'breakdown', 'consolidation',
 *                 'pullback-from-high', 'uptrend', 'downtrend', 'choppy'
 */
function priceStructure(closes, lookback = 30) {
  if (closes.length < lookback) return 'insufficient-data';

  const window = closes.slice(0, lookback);
  const current = window[0];
  const recentMax = Math.max(...window);
  const recentMin = Math.min(...window);
  const range = recentMax - recentMin;
  if (range === 0) return 'flat';

  const posInRange = (current - recentMin) / range;
  const distFromMax = (recentMax - current) / recentMax;

  // Compute slope of the window
  const slope = momentumSlope(closes, lookback);

  // Heuristic classification
  if (posInRange > 0.95 && slope > 0.3) return 'breakout-up';
  if (posInRange < 0.05 && slope < -0.3) return 'breakdown';
  if (distFromMax > 0.05 && distFromMax < 0.15 && slope > -0.1) return 'pullback-from-high';
  if (Math.abs(slope) < 0.1 && distFromMax < 0.1) return 'consolidation';
  if (slope > 0.2) return 'uptrend';
  if (slope < -0.2) return 'downtrend';
  return 'choppy';
}

// ============================================================================
// Hebrew categorization helpers
// ============================================================================

function classifyRSI(rsiValue) {
  if (rsiValue === null) return { zone: 'Unknown', he: 'אין מספיק נתונים' };
  if (rsiValue >= 70) return { zone: 'Overbought', he: 'קניית יתר (Overbought) - סיכון לתיקון' };
  if (rsiValue >= 60) return { zone: 'Strong', he: 'מומנטום חזק (לא קיצוני)' };
  if (rsiValue >= 40) return { zone: 'Neutral', he: 'אזור נייטרלי' };
  if (rsiValue >= 30) return { zone: 'Weak', he: 'חולשה' };
  return { zone: 'Oversold', he: 'מכירת יתר (Oversold) - הזדמנות אפשרית' };
}

function classifyMACross(ma50, ma200, currentPrice) {
  if (ma50 === null || ma200 === null) return { state: 'Unknown', he: 'אין מספיק נתונים' };
  const above50 = currentPrice > ma50;
  const above200 = currentPrice > ma200;
  const goldenCross = ma50 > ma200;

  if (above50 && above200 && goldenCross) {
    return { state: 'Bullish', he: 'מעל MA50 ומעל MA200, Golden Cross - מבנה עולה חזק' };
  }
  if (!above50 && !above200 && !goldenCross) {
    return { state: 'Bearish', he: 'מתחת ל-MA50 ול-MA200, Death Cross - מבנה יורד' };
  }
  if (above50 && !above200) {
    return { state: 'Recovery', he: 'מעל MA50 אבל מתחת ל-MA200 - שלב התאוששות אפשרי' };
  }
  if (!above50 && above200) {
    return { state: 'Correction', he: 'מתחת ל-MA50 אבל מעל MA200 - תיקון בתוך מגמה עולה' };
  }
  return { state: 'Mixed', he: 'תמונה מעורבת' };
}

function structureHe(structure) {
  return {
    'breakout-up': 'פריצה כלפי מעלה - מומנטום חיובי חזק',
    'breakdown': 'פריצה כלפי מטה - מבנה שלילי',
    'consolidation': 'דשדוש (Consolidation) - לפני תנועה גדולה',
    'pullback-from-high': 'תיקון מהשיא - הזדמנות אפשרית או תחילת היפוך',
    'uptrend': 'מגמה עולה',
    'downtrend': 'מגמה יורדת',
    'choppy': 'תנודתי ללא מגמה ברורה',
    'flat': 'ללא תנועה',
    'insufficient-data': 'אין מספיק נתונים',
  }[structure] || 'לא ידוע';
}

// ============================================================================
// Main computation
// ============================================================================

/**
 * Compute all technical indicators from historical prices and current quote.
 *
 * @param {Array<{date: string, close: number, volume: number}>} historical - NEWEST FIRST
 * @param {Object} quote - current quote from getQuote() (has ma50, ma200, yearHigh, yearLow)
 * @returns {Object}
 */
export function computeTechnicalIndicators(historical, quote) {
  if (!Array.isArray(historical) || historical.length === 0) {
    return {
      available: false,
      summary: 'אין נתוני מחירים היסטוריים',
    };
  }

  const closes = historical.map(e => e.close).filter(c => typeof c === 'number');
  const volumes = historical.map(e => e.volume).filter(v => typeof v === 'number');

  if (closes.length < 14) {
    return {
      available: false,
      summary: `מעט מדי נתונים (${closes.length} ימים) - נדרשים לפחות 14 ל-RSI`,
    };
  }

  const currentPrice = quote?.price ?? closes[0];
  const yearHigh = quote?.yearHigh ?? Math.max(...closes);
  const yearLow = quote?.yearLow ?? Math.min(...closes);

  // RSI
  const rsi14 = rsi(closes, 14);
  const rsiClass = classifyRSI(rsi14);

  // Moving averages (from quote if available, else compute)
  const ma50 = quote?.ma50 ?? sma(closes, 50);
  const ma200 = quote?.ma200 ?? sma(closes, 200);
  const maCross = classifyMACross(ma50, ma200, currentPrice);

  // Recent computed MAs from historical (more accurate to historical window)
  const ma20 = sma(closes, 20);

  // Distance from highs/lows
  const distFromYearHigh = yearHigh > 0 ? (yearHigh - currentPrice) / yearHigh : null;
  const distFromYearLow = yearLow > 0 ? (currentPrice - yearLow) / yearLow : null;

  // Momentum
  const momentum20d = momentumSlope(closes, 20);
  const momentum5d = momentumSlope(closes, 5);

  // Recent return windows
  const returnLast5d = closes.length >= 5 ? (currentPrice - closes[4]) / closes[4] : null;
  const returnLast20d = closes.length >= 20 ? (currentPrice - closes[19]) / closes[19] : null;

  // Volume profile
  const avgVolume = volumes.length > 0
    ? volumes.reduce((a, b) => a + b, 0) / volumes.length
    : null;
  const recentVolume = volumes.length > 0 ? volumes[0] : null;
  const volumeRatio = (avgVolume && recentVolume) ? recentVolume / avgVolume : null;

  // Price structure
  const structure = priceStructure(closes, Math.min(30, closes.length));

  // Volatility (std dev of daily returns over last 20 days)
  let volatility20d = null;
  if (closes.length >= 21) {
    const dailyReturns = [];
    for (let i = 0; i < 20; i++) {
      dailyReturns.push((closes[i] - closes[i + 1]) / closes[i + 1]);
    }
    const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / dailyReturns.length;
    volatility20d = Math.sqrt(variance) * Math.sqrt(252); // annualized
  }

  return {
    available: true,
    data_points: closes.length,
    current_price: currentPrice,

    rsi: {
      value: rsi14,
      zone: rsiClass.zone,
      description: rsiClass.he,
    },

    moving_averages: {
      ma20,
      ma50,
      ma200,
      current_vs_ma50_pct: ma50 ? ((currentPrice - ma50) / ma50) * 100 : null,
      current_vs_ma200_pct: ma200 ? ((currentPrice - ma200) / ma200) * 100 : null,
      state: maCross.state,
      description: maCross.he,
    },

    distance: {
      from_year_high_pct: distFromYearHigh !== null ? distFromYearHigh * 100 : null,
      from_year_low_pct: distFromYearLow !== null ? distFromYearLow * 100 : null,
      year_high: yearHigh,
      year_low: yearLow,
    },

    momentum: {
      slope_5d_pct_per_day: momentum5d,
      slope_20d_pct_per_day: momentum20d,
      return_5d_pct: returnLast5d !== null ? returnLast5d * 100 : null,
      return_20d_pct: returnLast20d !== null ? returnLast20d * 100 : null,
    },

    volume: {
      recent: recentVolume,
      avg_in_window: avgVolume,
      ratio: volumeRatio,
      description: volumeRatio !== null
        ? `נפח אחרון ${volumeRatio.toFixed(2)}x מהממוצע (${volumeRatio > 1.5 ? 'גבוה' : volumeRatio < 0.7 ? 'נמוך' : 'רגיל'})`
        : 'אין נתוני נפח',
    },

    structure: {
      pattern: structure,
      description: structureHe(structure),
    },

    volatility: {
      annualized_pct: volatility20d !== null ? volatility20d * 100 : null,
      description: volatility20d !== null
        ? `סטיית תקן שנתית: ${(volatility20d * 100).toFixed(1)}% (${volatility20d > 0.6 ? 'גבוהה במיוחד' : volatility20d > 0.35 ? 'גבוהה' : volatility20d > 0.2 ? 'בינונית' : 'נמוכה'})`
        : 'אין מספיק נתונים',
    },

    summary: buildSummary({
      rsi14, rsiClass, maCross, structure, momentum20d,
      distFromYearHigh, currentPrice, yearHigh,
    }),
  };
}

function buildSummary({ rsi14, rsiClass, maCross, structure, momentum20d, distFromYearHigh, currentPrice, yearHigh }) {
  const parts = [];

  if (rsi14 !== null) {
    parts.push(`RSI ${rsi14.toFixed(0)} (${rsiClass.zone})`);
  }
  parts.push(`MA: ${maCross.state}`);
  parts.push(`מבנה: ${structureHe(structure)}`);

  if (distFromYearHigh !== null) {
    parts.push(`מרחק משיא שנתי: ${(distFromYearHigh * 100).toFixed(1)}%`);
  }

  if (momentum20d !== null) {
    const dir = momentum20d > 0.2 ? 'חיובי' : momentum20d < -0.2 ? 'שלילי' : 'נייטרלי';
    parts.push(`Momentum 20d ${dir}`);
  }

  return parts.join(' | ');
}
