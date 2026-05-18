/**
 * @file Portfolio Calculator - pure math, no LLM
 * @description Calculates Health Score, HHI, Pareto, Sector breakdown, Concentration metrics
 *
 * All functions are pure (no side effects, no async).
 * Input: array of enriched holdings (with live price)
 * Output: structured analysis object
 *
 * Health Score formula (from RealValueX MVP):
 *   base 60
 *   + min(totalPnlPct × 0.3, 20)        // profit boost (max +20)
 *   + min(winnerLoserRatio × 2, 10)     // ratio boost (max +10)
 *   - min(max(top1Pct - 8, 0) × 2, 15)  // concentration penalty (max -15)
 *   - min(max(totalStocks - 30, 0) × 0.5, 10)  // over-diversification penalty (max -10)
 *   - min(deepLossesCount × 1.5, 15)    // deep loss penalty (max -15)
 *   - min(max(techPct - 50, 0) × 0.5, 10)  // sector concentration (max -10)
 *
 * Clamped to 0-100.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Tech-heavy sectors (used for sector concentration penalty)
 */
const TECH_SECTORS = new Set([
  'Technology', 'Semiconductors', 'Cybersecurity', 'Fintech',
  'טכנולוגיה', 'מוליכים למחצה', 'סייבר', 'פינטק',
]);

/**
 * Sector name mapping (English → Hebrew)
 */
const SECTOR_HE = {
  'Technology': 'טכנולוגיה',
  'Semiconductors': 'מוליכים למחצה',
  'Healthcare': 'בריאות',
  'Pharmaceuticals': 'תרופות',
  'Pharma': 'תרופות',
  'Financial Services': 'שירותים פיננסיים',
  'Financials': 'פיננסים',
  'Fintech': 'פינטק',
  'Cybersecurity': 'סייבר',
  'Energy': 'אנרגיה',
  'Materials': 'חומרים',
  'Industrials': 'תעשייה',
  'Consumer Cyclical': 'צריכה מחזורית',
  'Consumer Defensive': 'צריכה לא מחזורית',
  'Real Estate': 'נדל"ן',
  'Communication Services': 'שירותי תקשורת',
  'Utilities': 'תשתיות',
  'EV': 'רכב חשמלי',
  'Battery': 'סוללות',
  'Autonomous': 'אוטונומי',
  'Other': 'אחר',
};

/**
 * Health Score tier breakpoints
 */
const HEALTH_TIERS = [
  { min: 80, tier: 'Excellent', tier_he: 'מצוין', color: 'emerald' },
  { min: 65, tier: 'Strong', tier_he: 'חזק', color: 'green' },
  { min: 50, tier: 'Moderate', tier_he: 'בינוני', color: 'yellow' },
  { min: 35, tier: 'Weak', tier_he: 'חלש', color: 'orange' },
  { min: 0,  tier: 'Critical', tier_he: 'קריטי', color: 'red' },
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Enrich a single holding with computed P&L fields.
 * @param {Object} h - { ticker, qty, avgCost, price, sector?, name? }
 * @returns enriched holding
 */
function enrichHolding(h) {
  const qty = Number(h.qty) || 0;
  const avgCost = Number(h.avgCost) || 0;
  const price = Number(h.price) || 0;
  const value = qty * price;
  const cost = qty * avgCost;
  const pnl = value - cost;
  const pnlPct = avgCost > 0 ? ((price - avgCost) / avgCost) * 100 : 0;

  return {
    ticker: h.ticker,
    name: h.name || h.ticker,
    sector: h.sector || 'Other',
    qty,
    avgCost,
    price,
    value,
    cost,
    pnl,
    pnlPct,
  };
}

/**
 * Get Hebrew name for a sector
 */
function sectorHe(sector) {
  return SECTOR_HE[sector] || sector || 'אחר';
}

/**
 * Determine tier from Health Score
 */
function healthTier(score) {
  for (const t of HEALTH_TIERS) {
    if (score >= t.min) return t;
  }
  return HEALTH_TIERS[HEALTH_TIERS.length - 1];
}

// ============================================================================
// CONCENTRATION ANALYSIS
// ============================================================================

/**
 * Calculate concentration metrics: top-N percentage, HHI, effective positions
 */
function calcConcentration(enriched, totalValue) {
  if (!enriched.length || totalValue <= 0) {
    return {
      top1: { ticker: null, pct: 0 },
      top4Pct: 0, top10Pct: 0,
      under1pctCount: 0, under1pctList: [],
      hhi: { value: 0, effectivePositions: 0 },
      warnings_he: [],
    };
  }

  const sortedByValue = [...enriched].sort((a, b) => b.value - a.value);

  // Top-N percentages
  const top1 = sortedByValue[0];
  const top1Pct = (top1.value / totalValue) * 100;

  const top4Value = sortedByValue.slice(0, 4).reduce((s, h) => s + h.value, 0);
  const top4Pct = (top4Value / totalValue) * 100;

  const top10Value = sortedByValue.slice(0, 10).reduce((s, h) => s + h.value, 0);
  const top10Pct = (top10Value / totalValue) * 100;

  // Under 1% positions (potential candidates for cleanup)
  const under1pct = enriched.filter(h => (h.value / totalValue) * 100 < 1.0);

  // HHI (Herfindahl-Hirschman Index)
  // Σ(weight_i^2) where weight is in percentage points
  const hhi = enriched.reduce((s, h) => {
    const weight = (h.value / totalValue) * 100;
    return s + (weight * weight);
  }, 0);

  // Effective positions = 10000 / HHI
  const effectivePositions = hhi > 0 ? Math.round(10000 / hhi) : 0;

  // Warnings
  const warnings = [];
  if (top1Pct > 20) {
    warnings.push(`ריכוז גבוה במניה אחת: ${top1.ticker} = ${top1Pct.toFixed(1)}% מהתיק. מעל 20% - סיכון משמעותי`);
  } else if (top1Pct > 12) {
    warnings.push(`${top1.ticker} = ${top1Pct.toFixed(1)}% מהתיק. שקול צמצום ל-8-10%`);
  }
  if (top4Pct > 50) {
    warnings.push(`4 המניות הגדולות = ${top4Pct.toFixed(1)}% מהתיק - תיק מרוכז`);
  }
  if (under1pct.length > 10) {
    warnings.push(`${under1pct.length} פוזיציות מתחת ל-1% - שקול לאחד או למכור את הזנב`);
  }

  return {
    top1: { ticker: top1.ticker, name: top1.name, pct: top1Pct, value: top1.value },
    top4Pct,
    top10Pct,
    under1pctCount: under1pct.length,
    under1pctList: under1pct.map(h => ({
      ticker: h.ticker,
      pct: (h.value / totalValue) * 100,
      value: h.value,
    })),
    hhi: {
      value: Math.round(hhi),
      effectivePositions,
      interpretation_he: `${effectivePositions} פוזיציות אפקטיביות מתוך ${enriched.length} - ${
        effectivePositions < enriched.length * 0.5
          ? 'יש לך הרבה פוזיציות קטנות מדי'
          : 'פיזור סביר'
      }`,
    },
    warnings_he: warnings,
  };
}

// ============================================================================
// PARETO ANALYSIS
// ============================================================================

/**
 * Calculate Pareto distribution: what % of stocks hold what % of value
 */
function calcPareto(enriched, totalValue) {
  if (!enriched.length || totalValue <= 0) {
    return { top20PctStocks: 0, top20PctValue: 0, interpretation_he: '' };
  }

  const sortedByValue = [...enriched].sort((a, b) => b.value - a.value);
  const top20Count = Math.max(1, Math.ceil(enriched.length * 0.2));
  const top20Value = sortedByValue.slice(0, top20Count).reduce((s, h) => s + h.value, 0);
  const top20Pct = (top20Value / totalValue) * 100;

  let interpretation;
  if (top20Pct > 85) {
    interpretation = `כלל פארטו קיצוני: ${top20Count} מניות (20%) שולטות ב-${top20Pct.toFixed(1)}% מהערך. רוב התיק מרוכז במעט מניות`;
  } else if (top20Pct > 70) {
    interpretation = `כלל פארטו רגיל: ${top20Count} מניות (20%) שולטות ב-${top20Pct.toFixed(1)}% מהערך - חלוקה מאוזנת`;
  } else {
    interpretation = `פיזור שטוח: ${top20Count} מניות (20%) שולטות רק ב-${top20Pct.toFixed(1)}% מהערך - יותר מדי פוזיציות קטנות`;
  }

  return {
    top20PctStocks: top20Count,
    top20PctValue: top20Pct,
    interpretation_he: interpretation,
  };
}

// ============================================================================
// SECTOR ANALYSIS
// ============================================================================

/**
 * Group holdings by sector and compute breakdown
 */
function calcSectors(enriched, totalValue) {
  if (!enriched.length || totalValue <= 0) return { sectors: [], techPct: 0 };

  const map = {};
  for (const h of enriched) {
    const s = h.sector || 'Other';
    if (!map[s]) map[s] = { stocks: [], value: 0, pnl: 0 };
    map[s].stocks.push(h);
    map[s].value += h.value;
    map[s].pnl += h.pnl;
  }

  const sectors = Object.entries(map)
    .map(([name, data]) => {
      const pct = (data.value / totalValue) * 100;
      const sortedStocks = [...data.stocks].sort((a, b) => b.value - a.value);
      const topStock = sortedStocks[0];

      let warning_he = null;
      if (pct > 50) {
        warning_he = `ריכוז סקטוריאלי קיצוני (${pct.toFixed(1)}%) - סיכון מערכתי גבוה`;
      } else if (pct > 35) {
        warning_he = `ריכוז סקטוריאלי גבוה (${pct.toFixed(1)}%) - שקול diversification`;
      }

      return {
        name,
        name_he: sectorHe(name),
        value: data.value,
        pct,
        pnl: data.pnl,
        stockCount: data.stocks.length,
        topStock: topStock?.ticker || null,
        topStockPct: topStock ? (topStock.value / totalValue) * 100 : 0,
        stocks: sortedStocks.map(h => ({
          ticker: h.ticker,
          value: h.value,
          pct: (h.value / totalValue) * 100,
          pnlPct: h.pnlPct,
        })),
        warning_he,
      };
    })
    .sort((a, b) => b.value - a.value);

  // Tech sector aggregate
  const techPct = sectors
    .filter(s => TECH_SECTORS.has(s.name))
    .reduce((sum, s) => sum + s.pct, 0);

  return { sectors, techPct };
}

// ============================================================================
// HEALTH SCORE
// ============================================================================

/**
 * Calculate Health Score (0-100) with breakdown of each component
 */
function calcHealthScore({ totalPnlPct, winnerLoserRatio, top1Pct, totalStocks, deepLossesCount, techPct }) {
  const base = 60;

  // Positive components (max +30)
  const profitBoost = Math.min(Math.max(totalPnlPct, 0) * 0.3, 20);
  const ratioBoost = Math.min(winnerLoserRatio * 2, 10);

  // Negative components (max -50)
  const concentrationPenalty = Math.min(Math.max(top1Pct - 8, 0) * 2, 15);
  const diversificationPenalty = Math.min(Math.max(totalStocks - 30, 0) * 0.5, 10);
  const lossPenalty = Math.min(deepLossesCount * 1.5, 15);
  const sectorConcPenalty = Math.min(Math.max(techPct - 50, 0) * 0.5, 10);

  const raw = base + profitBoost + ratioBoost - concentrationPenalty - diversificationPenalty - lossPenalty - sectorConcPenalty;
  const score = Math.round(Math.max(0, Math.min(100, raw)));

  const tier = healthTier(score);

  return {
    score,
    tier: tier.tier,
    tier_he: tier.tier_he,
    color: tier.color,
    breakdown: {
      base,
      profitBoost: Math.round(profitBoost * 10) / 10,
      ratioBoost: Math.round(ratioBoost * 10) / 10,
      concentrationPenalty: -Math.round(concentrationPenalty * 10) / 10,
      diversificationPenalty: -Math.round(diversificationPenalty * 10) / 10,
      lossPenalty: -Math.round(lossPenalty * 10) / 10,
      sectorConcPenalty: -Math.round(sectorConcPenalty * 10) / 10,
    },
  };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Analyze a portfolio - pure math, no async.
 *
 * @param {Array} holdings - [{ ticker, qty, avgCost, price, sector?, name? }]
 * @returns {Object} full portfolio analysis
 */
export function analyzePortfolio(holdings) {
  if (!Array.isArray(holdings) || holdings.length === 0) {
    return {
      empty: true,
      summary: { totalValue: 0, totalCost: 0, totalPnL: 0, totalPnLPct: 0, totalStocks: 0 },
      healthScore: { score: 0, tier: 'Empty', tier_he: 'ריק', color: 'gray', breakdown: {} },
      sectors: [],
      concentration: {},
      pareto: {},
      topWinners: [],
      topLosers: [],
      deepLosses: [],
      warnings_he: ['התיק ריק - אין מה לנתח'],
    };
  }

  // 1. Enrich each holding
  const enriched = holdings.map(enrichHolding);

  // 2. Summary stats
  const totalValue = enriched.reduce((s, h) => s + h.value, 0);
  const totalCost = enriched.reduce((s, h) => s + h.cost, 0);
  const totalPnL = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const winners = enriched.filter(h => h.pnl > 0);
  const losers = enriched.filter(h => h.pnl <= 0);
  const winnerProfit = winners.reduce((s, h) => s + h.pnl, 0);
  const loserLoss = Math.abs(losers.reduce((s, h) => s + h.pnl, 0));
  const winnerLoserRatio = loserLoss > 0 ? winnerProfit / loserLoss : (winnerProfit > 0 ? 999 : 0);

  // Deep losses (≤ -25%)
  const deepLosses = enriched
    .filter(h => h.pnlPct <= -25)
    .sort((a, b) => a.pnlPct - b.pnlPct)
    .map(h => ({
      ticker: h.ticker,
      name: h.name,
      sector: h.sector,
      pnlPct: h.pnlPct,
      pnl: h.pnl,
      value: h.value,
    }));

  // 3. Concentration analysis
  const concentration = calcConcentration(enriched, totalValue);

  // 4. Pareto
  const pareto = calcPareto(enriched, totalValue);

  // 5. Sectors
  const { sectors, techPct } = calcSectors(enriched, totalValue);

  // 6. Health Score
  const healthScore = calcHealthScore({
    totalPnlPct,
    winnerLoserRatio,
    top1Pct: concentration.top1.pct,
    totalStocks: enriched.length,
    deepLossesCount: deepLosses.length,
    techPct,
  });

  // 7. Top winners / losers (by pnlPct)
  const sortedByPct = [...enriched].sort((a, b) => b.pnlPct - a.pnlPct);
  const topWinners = sortedByPct.slice(0, 5).map(h => ({
    ticker: h.ticker, name: h.name, sector: h.sector,
    pnlPct: h.pnlPct, pnl: h.pnl, value: h.value,
  }));
  const topLosers = sortedByPct.slice(-5).reverse().map(h => ({
    ticker: h.ticker, name: h.name, sector: h.sector,
    pnlPct: h.pnlPct, pnl: h.pnl, value: h.value,
  }));

  // 8. Aggregated warnings
  const warnings_he = [
    ...concentration.warnings_he,
    ...sectors.filter(s => s.warning_he).map(s => s.warning_he),
  ];
  if (deepLosses.length >= 5) {
    warnings_he.unshift(`${deepLosses.length} מניות עם הפסד מעל 25% - שקול לבדוק כל אחת`);
  }
  if (techPct > 60) {
    warnings_he.push(`חשיפה לטכנולוגיה: ${techPct.toFixed(1)}% - תלות גבוהה בסקטור אחד`);
  }

  return {
    summary: {
      totalValue: Math.round(totalValue),
      totalCost: Math.round(totalCost),
      totalPnL: Math.round(totalPnL),
      totalPnLPct: Math.round(totalPnlPct * 100) / 100,
      totalStocks: enriched.length,
      winnersCount: winners.length,
      losersCount: losers.length,
      winnerProfit: Math.round(winnerProfit),
      loserLoss: Math.round(-loserLoss),
      winnerLoserRatio: Math.round(winnerLoserRatio * 100) / 100,
      deepLossesCount: deepLosses.length,
    },
    healthScore,
    sectors,
    techExposure: { pct: techPct },
    concentration,
    pareto,
    topWinners,
    topLosers,
    deepLosses,
    warnings_he,
  };
}

// Export pure functions for testing or external use
export {
  enrichHolding,
  calcHealthScore,
  calcConcentration,
  calcPareto,
  calcSectors,
  sectorHe,
};
