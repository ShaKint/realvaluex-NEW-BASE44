/**
 * Block 2: Revenue Acceleration (Weight: 20%)
 *
 * Measures revenue growth and — critically — whether it's accelerating.
 * Computes YoY growth from raw income statements (Q vs Q-4), not FMP's
 * growthRevenue (which is QoQ for quarterly period).
 *
 * Data source: FMP income-statement (last 8 quarters)
 */

import { fmpGet } from '../utils/fmp.js';

const FALLBACK = {
  score: 50,
  color: 'gray',
  signals: ['Data unavailable'],
  metrics: {},
};

export async function revenueBlock(ticker) {
  try {
    // Need 8 quarters to compute 4 YoY data points
    const quarters = await fmpGet('income-statement', {
      symbol: ticker,
      period: 'quarter',
      limit: 8,
    });

    if (!Array.isArray(quarters) || quarters.length < 5) {
      return { ...FALLBACK, signals: ['Insufficient revenue history'] };
    }

    // quarters is most-recent-first. Compute YoY for q[0], q[1], q[2], q[3]
    // by comparing to q[4], q[5], q[6], q[7] respectively.
    const yoyGrowth = [];
    for (let i = 0; i < 4 && i + 4 < quarters.length; i++) {
      const curr = quarters[i].revenue;
      const yearAgo = quarters[i + 4].revenue;
      if (curr && yearAgo && yearAgo !== 0) {
        yoyGrowth.push({
          period: quarters[i].period + ' ' + quarters[i].fiscalYear,
          revenue: curr,
          yearAgoRevenue: yearAgo,
          yoyPct: ((curr - yearAgo) / Math.abs(yearAgo)) * 100,
        });
      }
    }

    if (yoyGrowth.length < 2) {
      return { ...FALLBACK, signals: ['Cannot compute YoY trend'] };
    }

    const latestYoY = yoyGrowth[0].yoyPct;
    const previousYoY = yoyGrowth[1]?.yoyPct ?? null;
    const twoQuartersAgoYoY = yoyGrowth[2]?.yoyPct ?? null;

    // Acceleration: is latest YoY > previous YoY (and ideally > 2-back)?
    const isAccelerating =
      previousYoY !== null && latestYoY > previousYoY;
    const isStrongAcceleration =
      isAccelerating &&
      twoQuartersAgoYoY !== null &&
      previousYoY > twoQuartersAgoYoY;

    const metrics = {
      latestYoY,
      previousYoY,
      twoQuartersAgoYoY,
      isAccelerating,
      isStrongAcceleration,
      history: yoyGrowth,
    };

    // === Scoring logic ===
    let score;
    let color;
    const signals = [];

    // Base score by latest YoY
    if (latestYoY >= 50) {
      score = 90;
      color = 'green';
    } else if (latestYoY >= 30) {
      score = 80;
      color = 'green';
    } else if (latestYoY >= 15) {
      score = 65;
      color = 'green';
    } else if (latestYoY >= 5) {
      score = 50;
      color = 'yellow';
    } else if (latestYoY >= 0) {
      score = 35;
      color = 'yellow';
    } else if (latestYoY >= -10) {
      score = 20;
      color = 'red';
    } else {
      score = 10;
      color = 'red';
    }

    signals.push(`YoY צמיחה אחרונה: ${latestYoY.toFixed(1)}%`);

    // Acceleration bonus / deceleration penalty
    if (isStrongAcceleration) {
      score = Math.min(100, score + 15);
      signals.push(
        `מאיץ בעקביות: ${twoQuartersAgoYoY.toFixed(1)}% → ${previousYoY.toFixed(
          1
        )}% → ${latestYoY.toFixed(1)}%`
      );
    } else if (isAccelerating) {
      score = Math.min(100, score + 8);
      signals.push(
        `מאיץ: ${previousYoY.toFixed(1)}% → ${latestYoY.toFixed(1)}%`
      );
    } else if (previousYoY !== null && latestYoY < previousYoY - 5) {
      score = Math.max(0, score - 10);
      signals.push(
        `מאט: ${previousYoY.toFixed(1)}% → ${latestYoY.toFixed(1)}%`
      );
    } else {
      signals.push(
        `יציב סביב ${latestYoY.toFixed(1)}%`
      );
    }

    return { score: Math.round(score), color, signals, metrics };
  } catch (err) {
    console.error(`[breakout/revenue] ${ticker}:`, err.message);
    return { ...FALLBACK, signals: [`Error: ${err.message}`] };
  }
}
