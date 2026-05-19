/**
 * @file PPR Data Fetcher (Ch 37 — Peak Pricing Risk)
 *
 * Gathers all available quantitative data needed for Ch 37 questions.
 * Uses stock-data.js facade ONLY — no direct FMP calls.
 *
 * Ch 37 questions (from RealValueX Master Operating Manual v1.0):
 *   1. מה הפער בין מחיר הנוכחי למחיר Fair Value?
 *   2. אם החברה כבר מתומחרת לפי Bull Case — האם יש עוד upside?
 *   3. מה Time-To-Catch-Up (TTC) — כמה זמן ייקח לפונדמנטלים להגיע למחיר?
 *   4. אם TTC > 5 שנים — האם המניה ב-Peak Pricing Risk?
 *   5. מה Multiple Excess (כמה מעל Historical Average)?      ← partial: facade does not yet expose historical multiples
 *   6. מה ציון PPR (0-10, גבוה = יותר סיכון)?
 *
 * Returns a normalized data packet for the LLM. Fields that could not
 * be retrieved are explicitly set to `null` with a `_missing` field
 * listing them — per Safeguard E3 (Honest Incompleteness).
 */

import * as stockData from '../../stock-data.js';

/**
 * Safely pick a numeric field by trying multiple property names.
 * Returns null if none match.
 */
function pickNumber(obj, ...names) {
  if (!obj || typeof obj !== 'object') return null;
  for (const name of names) {
    const v = obj[name];
    if (v !== undefined && v !== null && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return null;
}

export async function gatherPPRData(ticker) {
  const startedAt = Date.now();
  const missing = [];
  const errors = [];

  // Run facade calls in parallel — each handles its own cache layer
  const [quoteR, ptR, keyMetricsR, profileR, earningsR] = await Promise.allSettled([
    stockData.getQuote(ticker),
    stockData.getPriceTargetConsensus(ticker),
    stockData.getKeyMetricsTTM(ticker),
    stockData.getProfile(ticker),
    stockData.getEarningsHistory(ticker, 8),
  ]);

  // Quote (REQUIRED)
  let currentPrice = null;
  if (quoteR.status === 'fulfilled' && quoteR.value) {
    currentPrice = pickNumber(quoteR.value, 'price', 'currentPrice', 'close');
  } else if (quoteR.status === 'rejected') {
    errors.push({ field: 'quote', message: quoteR.reason?.message || 'failed' });
  }
  if (currentPrice === null) {
    missing.push('currentPrice');
  }

  // Analyst price target consensus
  let analystPT = null;
  let analystUpsidePct = null;
  if (ptR.status === 'fulfilled' && ptR.value) {
    analystPT = pickNumber(
      ptR.value,
      'targetConsensus', 'priceTarget', 'consensusTarget',
      'targetMean', 'targetMedian'
    );
    if (analystPT !== null && currentPrice !== null && currentPrice > 0) {
      analystUpsidePct = ((analystPT - currentPrice) / currentPrice) * 100;
    }
  } else if (ptR.status === 'rejected') {
    errors.push({ field: 'priceTargetConsensus', message: ptR.reason?.message || 'failed' });
  }
  if (analystPT === null) missing.push('analystPriceTarget');

  // Key metrics TTM — try a range of FMP normalized field names
  let peRatioTTM = null;
  let psRatioTTM = null;
  let pfcfRatioTTM = null;
  let evToEbitdaTTM = null;
  let pegRatioTTM = null;
  if (keyMetricsR.status === 'fulfilled' && keyMetricsR.value) {
    const km = Array.isArray(keyMetricsR.value) ? keyMetricsR.value[0] : keyMetricsR.value;
    peRatioTTM = pickNumber(km, 'peRatioTTM', 'pe', 'priceToEarningsRatio', 'peRatio');
    psRatioTTM = pickNumber(km, 'priceToSalesRatioTTM', 'psRatio', 'priceToSalesRatio');
    pfcfRatioTTM = pickNumber(km, 'pfcfRatioTTM', 'pfcfRatio', 'priceToFreeCashFlowRatio');
    evToEbitdaTTM = pickNumber(km, 'enterpriseValueOverEBITDATTM', 'evToEbitda');
    pegRatioTTM = pickNumber(km, 'pegRatioTTM', 'peg', 'pegRatio');
  } else if (keyMetricsR.status === 'rejected') {
    errors.push({ field: 'keyMetricsTTM', message: keyMetricsR.reason?.message || 'failed' });
  }
  if (peRatioTTM === null && psRatioTTM === null) missing.push('valuationMultiples');

  // Profile — sector + market cap context
  let companyName = null;
  let sector = null;
  let industry = null;
  let marketCap = null;
  let beta = null;
  if (profileR.status === 'fulfilled' && profileR.value) {
    const p = Array.isArray(profileR.value) ? profileR.value[0] : profileR.value;
    companyName = p?.companyName || p?.name || null;
    sector = p?.sector || null;
    industry = p?.industry || null;
    marketCap = pickNumber(p, 'mktCap', 'marketCap', 'marketCapitalization');
    beta = pickNumber(p, 'beta');
  } else if (profileR.status === 'rejected') {
    errors.push({ field: 'profile', message: profileR.reason?.message || 'failed' });
  }

  // Earnings history → infer recent revenue growth rate (proxy for "growth fundamentals")
  // Use the most recent 4 quarters vs the prior 4 quarters for YoY rough proxy
  let recentRevenueGrowthPct = null;
  let recentEpsGrowthPct = null;
  if (earningsR.status === 'fulfilled' && Array.isArray(earningsR.value) && earningsR.value.length >= 8) {
    // Earnings history shape varies — try common fields
    const recent4 = earningsR.value.slice(0, 4);
    const prior4 = earningsR.value.slice(4, 8);
    const sumField = (arr, ...names) =>
      arr.reduce((s, item) => {
        const v = pickNumber(item, ...names);
        return s + (v ?? 0);
      }, 0);
    const recentRev = sumField(recent4, 'revenue', 'totalRevenue');
    const priorRev = sumField(prior4, 'revenue', 'totalRevenue');
    if (priorRev > 0 && recentRev > 0) {
      recentRevenueGrowthPct = ((recentRev - priorRev) / priorRev) * 100;
    }
    const recentEPS = sumField(recent4, 'eps', 'epsActual', 'earningsPerShare');
    const priorEPS = sumField(prior4, 'eps', 'epsActual', 'earningsPerShare');
    if (Math.abs(priorEPS) > 0.01) {
      recentEpsGrowthPct = ((recentEPS - priorEPS) / Math.abs(priorEPS)) * 100;
    }
  } else if (earningsR.status === 'rejected') {
    errors.push({ field: 'earnings', message: earningsR.reason?.message || 'failed' });
  }
  if (recentRevenueGrowthPct === null) missing.push('recentRevenueGrowth');

  // Derived: rough Time-To-Catch-Up estimate
  // If price implies fair-value premium of X%, and earnings grow at Y%/yr,
  // then TTC ≈ ln(1 + X/100) / ln(1 + Y/100)
  let ttcYears = null;
  if (
    analystUpsidePct !== null && analystUpsidePct < 0 &&  // stock above PT consensus
    recentEpsGrowthPct !== null && recentEpsGrowthPct > 0
  ) {
    const premium = -analystUpsidePct / 100; // e.g. 0.20 for 20% premium
    const growth = recentEpsGrowthPct / 100;
    if (growth > 0.005) {
      ttcYears = Math.log(1 + premium) / Math.log(1 + growth);
    }
  }

  // Historical multiples — NOT AVAILABLE via current facade
  // This is the Q5 gap. Explicitly mark and never invent.
  const historicalMultiples = null;
  missing.push('historicalMultiplesAverage_5yr'); // Q5 cannot be answered

  return {
    ticker: ticker.toUpperCase(),
    fetchedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    company: { name: companyName, sector, industry, marketCap, beta },
    price: { current: currentPrice },
    analyst: {
      priceTargetConsensus: analystPT,
      upsidePct: analystUpsidePct,  // negative = stock above PT (premium)
    },
    multiples: {
      peTTM: peRatioTTM,
      psTTM: psRatioTTM,
      pfcfTTM: pfcfRatioTTM,
      evToEbitdaTTM,
      pegTTM: pegRatioTTM,
      historicalAverages: historicalMultiples, // null — known gap, see _missing
    },
    growth: {
      recentRevenueGrowthPctYoY: recentRevenueGrowthPct,
      recentEpsGrowthPctYoY: recentEpsGrowthPct,
    },
    derived: {
      ttcYears,
      _ttcMethod: ttcYears
        ? 'log(1+premium)/log(1+epsGrowth) using analystPT as fair-value anchor'
        : null,
    },
    _missing: missing,
    _errors: errors,
  };
}
