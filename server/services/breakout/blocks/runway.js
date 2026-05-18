/**
 * Block 1: Runway (Weight: 25%)
 *
 * Measures financial sustainability — how long the company can operate
 * before needing external capital. Two paths:
 *   A) FCF positive → company doesn't need runway; score based on FCF strength
 *   B) FCF negative → calculate years of runway = cash / annual burn
 *
 * Data source: FMP cashflow-statement + balance-sheet-statement (4 quarters)
 */

import { fmpGet } from '../utils/fmp.js';

const FALLBACK = {
  score: 50,
  color: 'gray',
  signals: ['Data unavailable'],
  metrics: {},
};

export async function runwayBlock(ticker) {
  try {
    // Fetch last 4 quarters of cashflow + most recent balance sheet
    const [cashflows, balance] = await Promise.all([
      fmpGet('cashflow-statement', { symbol: ticker, period: 'quarter', limit: 4 }),
      fmpGet('balance-sheet-statement', { symbol: ticker, period: 'quarter', limit: 1 }),
    ]);

    if (!Array.isArray(cashflows) || cashflows.length === 0) {
      return { ...FALLBACK, signals: ['No cashflow data'] };
    }
    if (!Array.isArray(balance) || balance.length === 0) {
      return { ...FALLBACK, signals: ['No balance sheet data'] };
    }

    // TTM FCF (sum of last 4 quarters)
    const ttmFCF = cashflows.reduce((sum, q) => sum + (q.freeCashFlow || 0), 0);

    // Cash position
    const latestBS = balance[0];
    const cash =
      (latestBS.cashAndCashEquivalents || 0) +
      (latestBS.shortTermInvestments || 0);
    const totalDebt = latestBS.totalDebt || 0;
    const netCash = cash - totalDebt;

    // Latest quarterly FCF for momentum
    const latestQFCF = cashflows[0]?.freeCashFlow || 0;
    const previousQFCF = cashflows[1]?.freeCashFlow || 0;

    const metrics = {
      ttmFCF,
      cash,
      totalDebt,
      netCash,
      latestQFCF,
      previousQFCF,
    };

    // === Scoring logic ===
    let score;
    let color;
    const signals = [];

    if (ttmFCF > 0) {
      // Path A: FCF positive
      // Approximate FCF margin via revenue — but we don't have revenue here.
      // Use absolute FCF tiers + net cash bonus.
      if (ttmFCF >= 5_000_000_000) {
        score = 95;
        color = 'green';
        signals.push(`FCF חזק מאוד: $${formatBn(ttmFCF)} TTM`);
      } else if (ttmFCF >= 1_000_000_000) {
        score = 85;
        color = 'green';
        signals.push(`FCF חזק: $${formatBn(ttmFCF)} TTM`);
      } else if (ttmFCF >= 100_000_000) {
        score = 75;
        color = 'green';
        signals.push(`FCF חיובי: $${formatBn(ttmFCF)} TTM`);
      } else {
        score = 65;
        color = 'green';
        signals.push(`FCF חיובי גבולי: $${formatBn(ttmFCF)} TTM`);
      }

      // FCF momentum bonus (latest Q > previous Q)
      if (latestQFCF > previousQFCF && previousQFCF >= 0) {
        score = Math.min(100, score + 5);
        signals.push(`FCF מתאיץ: $${formatBn(previousQFCF)} → $${formatBn(latestQFCF)}`);
      }

      // Net cash bonus
      if (netCash > 0) {
        score = Math.min(100, score + 3);
        signals.push(`Net cash position: $${formatBn(netCash)}`);
      } else if (totalDebt > Math.abs(ttmFCF) * 10) {
        score = Math.max(0, score - 10);
        signals.push(`חוב גבוה: ${(totalDebt / Math.max(ttmFCF, 1)).toFixed(1)}× FCF`);
      }
    } else {
      // Path B: FCF negative — calculate runway in years
      const annualBurn = Math.abs(ttmFCF);
      const runwayYears = cash / annualBurn;

      if (runwayYears >= 5) {
        score = 70;
        color = 'green';
        signals.push(`Runway: ${runwayYears.toFixed(1)} שנים (FCF שלילי, אבל מזומן חזק)`);
      } else if (runwayYears >= 3) {
        score = 55;
        color = 'yellow';
        signals.push(`Runway: ${runwayYears.toFixed(1)} שנים — מספק לטווח בינוני`);
      } else if (runwayYears >= 1.5) {
        score = 35;
        color = 'yellow';
        signals.push(`Runway: ${runwayYears.toFixed(1)} שנים — דורש מעקב`);
      } else {
        score = 15;
        color = 'red';
        signals.push(`Runway קצר: ${runwayYears.toFixed(1)} שנים — סיכון מהותי`);
      }

      signals.push(`FCF שלילי: -$${formatBn(annualBurn)} TTM`);
      signals.push(`מזומן: $${formatBn(cash)}, חוב: $${formatBn(totalDebt)}`);
    }

    return { score: Math.round(score), color, signals, metrics };
  } catch (err) {
    console.error(`[breakout/runway] ${ticker}:`, err.message);
    return { ...FALLBACK, signals: [`Error: ${err.message}`] };
  }
}

function formatBn(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  return value.toFixed(0);
}
