/**
 * Block 4: Market Sentiment (Weight: 20%)
 *
 * Two inputs:
 *  - RSI(14) from historical EOD prices: oversold (30-50) = breakout zone
 *  - Analyst consensus from FMP grades-summary
 *
 * Data source: FMP historical-price-eod-light + grades-summary
 */

import { fmpGet, fmpGetSafe } from '../utils/fmp.js';

const FALLBACK = {
  score: 50,
  color: 'gray',
  signals: ['Data unavailable'],
  metrics: {},
};

export async function sentimentBlock(ticker) {
  try {
    // Need ~30 days of EOD prices to compute RSI(14) reliably.
    // We'll fetch 40 calendar days to account for weekends/holidays.
    const today = new Date();
    const fromDate = new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000);
    const fmtDate = (d) => d.toISOString().slice(0, 10);

    const [prices, gradesArr] = await Promise.all([
      fmpGet('historical-price-eod-light', {
        symbol: ticker,
        from: fmtDate(fromDate),
        to: fmtDate(today),
      }),
      fmpGetSafe('grades-summary', { symbol: ticker }),
    ]);

    if (!Array.isArray(prices) || prices.length < 15) {
      return { ...FALLBACK, signals: ['Insufficient price history for RSI'] };
    }

    // Sort oldest-first for RSI calculation
    const sorted = [...prices].sort((a, b) => a.date.localeCompare(b.date));
    const closes = sorted.map((d) => d.price);

    const rsi = calculateRSI(closes, 14);
    if (rsi === null) {
      return { ...FALLBACK, signals: ['RSI calculation failed'] };
    }

    // Volume trend: latest 5-day avg vs prior 5-day avg
    let volumeTrend = null;
    if (sorted.length >= 10) {
      const recent5 = sorted.slice(-5);
      const prior5 = sorted.slice(-10, -5);
      const recentAvg =
        recent5.reduce((s, d) => s + (d.volume || 0), 0) / recent5.length;
      const priorAvg =
        prior5.reduce((s, d) => s + (d.volume || 0), 0) / prior5.length;
      if (priorAvg > 0) {
        volumeTrend = ((recentAvg - priorAvg) / priorAvg) * 100;
      }
    }

    // Analyst consensus
    const grades = Array.isArray(gradesArr) && gradesArr.length > 0 ? gradesArr[0] : null;

    const metrics = {
      rsi,
      latestPrice: closes[closes.length - 1],
      volumeTrend,
      grades,
    };

    // === Scoring logic ===
    let score;
    let color;
    const signals = [];

    // RSI base score (breakout zone is 30-50)
    if (rsi >= 30 && rsi <= 50) {
      score = 85;
      color = 'green';
      signals.push(`RSI: ${rsi.toFixed(1)} — אזור פריצה (oversold-to-neutral)`);
    } else if (rsi > 50 && rsi <= 60) {
      score = 70;
      color = 'green';
      signals.push(`RSI: ${rsi.toFixed(1)} — ניטרלי-חיובי`);
    } else if (rsi > 60 && rsi <= 70) {
      score = 55;
      color = 'yellow';
      signals.push(`RSI: ${rsi.toFixed(1)} — חזק, מתקרב לקנייתי-יתר`);
    } else if (rsi > 70) {
      score = 30;
      color = 'red';
      signals.push(`RSI: ${rsi.toFixed(1)} — קנייתי-יתר, פחות upside`);
    } else if (rsi >= 20) {
      score = 55;
      color = 'yellow';
      signals.push(`RSI: ${rsi.toFixed(1)} — oversold עמוק, אבל ייתכן ירידה ממשיכה`);
    } else {
      score = 40;
      color = 'red';
      signals.push(`RSI: ${rsi.toFixed(1)} — oversold קיצוני`);
    }

    // Volume bonus/penalty
    if (volumeTrend !== null) {
      if (volumeTrend > 30) {
        score = Math.min(100, score + 8);
        signals.push(`נפח בעלייה חדה: +${volumeTrend.toFixed(0)}% (5-day avg)`);
      } else if (volumeTrend > 10) {
        score = Math.min(100, score + 4);
        signals.push(`נפח עולה: +${volumeTrend.toFixed(0)}%`);
      } else if (volumeTrend < -30) {
        score = Math.max(0, score - 5);
        signals.push(`נפח דועך: ${volumeTrend.toFixed(0)}%`);
      }
    }

    // Analyst adjustment
    if (grades) {
      const { strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0, consensus } = grades;
      const total = strongBuy + buy + hold + sell + strongSell;
      if (total > 0) {
        const bullPct = ((strongBuy + buy) / total) * 100;
        if (bullPct >= 80) {
          score = Math.min(100, score + 7);
          signals.push(`אנליסטים: ${consensus} (${strongBuy + buy}/${hold}/${sell + strongSell})`);
        } else if (bullPct >= 60) {
          score = Math.min(100, score + 4);
          signals.push(`אנליסטים: ${consensus} (${strongBuy + buy}/${hold}/${sell + strongSell})`);
        } else if (bullPct < 30) {
          score = Math.max(0, score - 8);
          signals.push(`אנליסטים פושרים: ${consensus} (${strongBuy + buy}/${hold}/${sell + strongSell})`);
        } else {
          signals.push(`אנליסטים: ${consensus} (${strongBuy + buy}/${hold}/${sell + strongSell})`);
        }
      }
    }

    return { score: Math.round(score), color, signals, metrics };
  } catch (err) {
    console.error(`[breakout/sentiment] ${ticker}:`, err.message);
    return { ...FALLBACK, signals: [`Error: ${err.message}`] };
  }
}

/**
 * Calculate RSI (Wilder's smoothing) for given period.
 * Returns null if insufficient data.
 */
function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;

  // Daily changes
  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Initial average gain/loss over first `period` changes
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    const c = changes[i];
    if (c > 0) avgGain += c;
    else avgLoss += -c;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining changes
  for (let i = period; i < changes.length; i++) {
    const c = changes[i];
    const gain = c > 0 ? c : 0;
    const loss = c < 0 ? -c : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0 && avgGain === 0) return 50; // truly flat → neutral
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
