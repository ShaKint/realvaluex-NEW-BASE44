/**
 * @file PPR Prompt Builder (Ch 37)
 *
 * Builds the system + user prompts for the LLM call that scores PPR.
 * Anchored directly to the 6 questions of Ch 37 in the
 * RealValueX Master Operating Manual v1.0.
 *
 * The 4 Safeguards (E1-E4) are baked into the system prompt.
 */

/**
 * The system prompt — establishes the LLM's role and the 4 Safeguards.
 * Written in Hebrew because all model documentation is Hebrew and the
 * output verdicts must be in Hebrew per Shay's preference.
 */
export const PPR_SYSTEM_PROMPT = `אתה מנוע ניתוח של מערכת RealValueX™ Master Operating Manual v1.0.
משימתך כעת: לענות על שאלות פרק 37 — Peak Pricing Risk (PPR), חלק מבחן Cisco.

עקרון העל של המודל:
Upside = Expansion Remaining − Crowding − Capital Cycle Saturation − Narrative Completion + Optionality

PPR בודק מקרה ספציפי: מניה שכבר תמחרה את כל הסיפור (Crowding מקסימלי + Narrative Completion).
זה הסיכון של Cisco 2000: חברה טובה במחיר נורא.

== 4 ה-Safeguards שאתה חייב לציית להם ==

E1 (Prediction Registry): התחזית שלך תישמר. אל תגיד "סביר" — תן הסתברות מספרית.

E2 (Base Rates): לכל טענה הסתברותית — תן Base Rate היסטורי. דוגמאות:
- "מניות עם PE > 2× ממוצע 5-שנתי הניבו תשואה ממוצעת של X% בשנתיים הבאות"
- "כאשר TTC > 5 שנים, ההסתברות לקריסה של 50%+ בעשור היא Y%"
אם אתה לא יודע base rate מדויק — אמור "אין לי base rate מספרי לזה" ואל תמציא.

E3 (Honest Incompleteness): אם נתון חסר — תגיד מפורשות "אין לי נתון על זה" ותסביר איך זה משפיע על הציון. אל תכתוב "סביר להניח" ואל תנחש.

E4 (Utility): כל ניתוח חייב להוביל לפעולה. תוצאת ה-PPR שלך משפיעה ישירות על החלטה: TRIM אם PPR > 7, MONITOR אם 4-7, HOLD אם < 4.

== הוראות פלט ==

החזר JSON בלבד, ללא markdown fences, ללא טקסט סביב. מבנה:

{
  "answers": {
    "q1_fairValueGap": {
      "answer_he": "...",
      "metric": <number or null>,
      "confidence": "high" | "medium" | "low" | "none"
    },
    "q2_bullCasePricedIn": { "answer_he": "...", "verdict": "yes" | "no" | "partial" | "unknown", "confidence": "..." },
    "q3_ttc": { "answer_he": "...", "years": <number or null>, "confidence": "..." },
    "q4_peakPricingRisk": { "answer_he": "...", "verdict": "yes" | "no" | "elevated" | "unknown", "confidence": "..." },
    "q5_multipleExcess": { "answer_he": "...", "vsHistoricalRatio": <number or null>, "confidence": "..." },
    "q6_pprScore": { "score": <integer 0-10>, "reasoning_he": "..." }
  },
  "baseRates_he": ["...", "..."],
  "missingData_he": ["...", "..."],
  "verdict_he": "<2-3 משפטים סיכום>",
  "flag": "red" | "yellow" | "green",
  "actionHint_he": "<פעולה ספציפית: TRIM / MONITOR / HOLD + תנאי>"
}

== חוקי דירוג PPR ==
0-3: בטוח (green) — המחיר עוד לא תמחר את הסיפור
4-6: יש סיכון (yellow) — חלק מהסיפור מתומחר, נדרש מעקב
7-10: סיכון גבוה (red) — המחיר כבר תמחר את כל הסיפור או יותר (Cisco-style)

flag חייב להיות עקבי עם הציון.`;

/**
 * Build the user prompt for a specific ticker.
 * @param {object} data - output of gatherPPRData()
 */
export function buildPPRUserPrompt(data) {
  const sections = [];

  sections.push(`ניתוח PPR עבור: ${data.ticker} (${data.company.name || 'unknown name'})`);
  sections.push(`סקטור: ${data.company.sector || 'unknown'} | תעשייה: ${data.company.industry || 'unknown'}`);
  sections.push(`Market Cap: ${formatMaybe(data.company.marketCap, formatBn, '$')}`);
  sections.push(`Beta: ${formatMaybe(data.company.beta, (v) => v.toFixed(2))}`);
  sections.push('');

  sections.push('=== מחיר נוכחי ויעד אנליסטים ===');
  sections.push(`מחיר נוכחי: ${formatMaybe(data.price.current, (v) => '$' + v.toFixed(2))}`);
  sections.push(`PT consensus אנליסטים: ${formatMaybe(data.analyst.priceTargetConsensus, (v) => '$' + v.toFixed(2))}`);
  sections.push(
    `Upside מ-PT: ${
      data.analyst.upsidePct !== null
        ? data.analyst.upsidePct.toFixed(1) + '%' +
          (data.analyst.upsidePct < 0 ? ' (מחיר מעל ה-PT — premium)' : '')
        : 'לא ידוע'
    }`
  );
  sections.push('');

  sections.push('=== מכפילי תמחור ===');
  sections.push(`P/E (TTM): ${formatMaybe(data.multiples.peTTM, (v) => v.toFixed(1))}`);
  sections.push(`P/S (TTM): ${formatMaybe(data.multiples.psTTM, (v) => v.toFixed(1))}`);
  sections.push(`P/FCF (TTM): ${formatMaybe(data.multiples.pfcfTTM, (v) => v.toFixed(1))}`);
  sections.push(`EV/EBITDA (TTM): ${formatMaybe(data.multiples.evToEbitdaTTM, (v) => v.toFixed(1))}`);
  sections.push(`PEG (TTM): ${formatMaybe(data.multiples.pegTTM, (v) => v.toFixed(2))}`);
  sections.push(
    data.multiples.historicalAverages === null
      ? '*** ממוצעים היסטוריים: אין נתון זמין במערכת כרגע — נדרש להוסיף בשלב B ***'
      : `ממוצעים היסטוריים 5-שנתיים: ${JSON.stringify(data.multiples.historicalAverages)}`
  );
  sections.push('');

  sections.push('=== צמיחת פונדמנטלים אחרונה (8 רבעונים, YoY proxy) ===');
  sections.push(
    `Revenue Growth YoY: ${
      data.growth.recentRevenueGrowthPctYoY !== null
        ? data.growth.recentRevenueGrowthPctYoY.toFixed(1) + '%'
        : 'לא ידוע'
    }`
  );
  sections.push(
    `EPS Growth YoY: ${
      data.growth.recentEpsGrowthPctYoY !== null
        ? data.growth.recentEpsGrowthPctYoY.toFixed(1) + '%'
        : 'לא ידוע'
    }`
  );
  sections.push('');

  if (data.derived.ttcYears !== null) {
    sections.push('=== חישוב TTC מוקדם (לעיון בלבד — אמת לבד) ===');
    sections.push(`TTC משוער: ${data.derived.ttcYears.toFixed(1)} שנים`);
    sections.push(`שיטה: ${data.derived._ttcMethod}`);
    sections.push('');
  }

  if (data._missing.length > 0) {
    sections.push('=== נתונים חסרים ===');
    sections.push(data._missing.map((f) => `- ${f}`).join('\n'));
    sections.push('');
  }

  if (data._errors.length > 0) {
    sections.push('=== שגיאות בשליפה ===');
    sections.push(data._errors.map((e) => `- ${e.field}: ${e.message}`).join('\n'));
    sections.push('');
  }

  sections.push('=== המשימה ===');
  sections.push('ענה על 6 שאלות פרק 37 מהמודל:');
  sections.push('Q1: מה הפער בין מחיר הנוכחי למחיר Fair Value? (השתמש ב-PT consensus כעוגן)');
  sections.push('Q2: אם החברה כבר מתומחרת לפי Bull Case — האם יש עוד upside?');
  sections.push('Q3: מה Time-To-Catch-Up (TTC) — כמה זמן ייקח לפונדמנטלים להגיע למחיר?');
  sections.push('Q4: אם TTC > 5 שנים — האם המניה ב-Peak Pricing Risk?');
  sections.push('Q5: מה Multiple Excess (כמה מעל Historical Average)? — אם אין נתון, אמור מפורשות');
  sections.push('Q6: מה ציון PPR (0-10)? תן ציון אחד מספרי + הסבר');
  sections.push('');
  sections.push('החזר JSON בלבד לפי הסכמה שהוגדרה במערכת.');

  return sections.join('\n');
}

function formatMaybe(v, fmt, prefix = '') {
  if (v === null || v === undefined) return 'לא ידוע';
  return prefix + fmt(v);
}

function formatBn(v) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  return String(v);
}
