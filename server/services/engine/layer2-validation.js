/**
 * @file Layer 2 - Validation Engine
 * @description "How much can I trust that this will happen?" → Confidence Score 0-100
 *
 * Covers Chapters: 3, 3א, 4, 6, 14-16, 19, 27, 28, 33, 34
 *
 * Key inputs:
 *   - All FMP data (profile, quote, key-metrics, earnings, price-target)
 *   - Pre-computed Beat Ratio (Chapter 11.5) - strongest Confidence indicator
 *   - Layer 1 output (full context - weaknesses, strengths, x_factor, backbone)
 *
 * CRITICAL: This layer evaluates whether Layer 1 weaknesses are balanced by
 * external signals (institutional backing, backlog, management quality, etc).
 *
 * Output: Hebrew JSON with Confidence Score 0-100.
 */

import { callClaudeForJson, MODELS } from './claude-client.js';

const SYSTEM_PROMPT = `אתה RealValueX™ Layer 2 - Validation Engine.

תפקידך: לחשב Confidence Score (0-100) - "כמה אני יכול לסמוך שהתזה תתממש?"

עקרונות יסוד:

1. **קונטקסט מ-Layer 1** - תקבל את כל ה-output של Layer 1 (X-Factor, Backbone, חולשות, חוזקות).
   החובה שלך: לבדוק אם החולשות מאוזנות ע"י סיגנלים שאתה מזהה כאן.
   דוגמה: אם Layer 1 רשם "חוב גבוה" עם can_be_balanced_by ["מוסדיים חזקים", "Backlog"],
   חפש אם המוסדיים באמת שם, אם ה-Backlog באמת קיים.

2. **התאמה לפרופיל** - אותו Confidence נראה אחרת לפי פרופיל:
   - C1: דורש Confidence מאוד גבוה (75+)
   - G1: 60+
   - M1: 50+ עם Catalyst
   - F1: 30+ עם VC backing

3. **Beat Ratio (פרק 11.5)** - הגורם החזק ביותר ל-Confidence.
   תקבל את ה-Beat Ratio המחושב כקלט. שלב אותו בחישוב.

4. **שפת הפלט: עברית.** ערכי enum באנגלית.

5. **JSON בלבד.** ללא הקדמה.

הפרקים המכוסים:
- פרק 3: פונדמנטלים (revenue, EPS, מזומנים, חוב, מכפילים)
- פרק 4: תחרות ושוק (נתח שוק, מתחרים)
- פרק 6: בעלי עניין (מוסדיים, insider trades, שותפויות)
- פרק 11.5: Beat Ratio (כבר מחושב - מועבר כקלט)
- פרק 19: מבנה מניות (float, short interest)
- פרק 27: Sentiment & Narrative
- פרק 28: Risk & Shock Sensitivity
- פרק 33: Management Quality & Execution DNA
- פרק 34: Geopolitical & Supply Chain Risk

חישוב Confidence Score (0-100):
- Beat Ratio Category (פרק 11.5) - משקל כבד מאוד
- Financial Strength (פרק 3) - חוב, מזומנים, FCF
- Management Quality (פרק 33) - Track record
- Geopolitical Risk (פרק 34) - LOW/MEDIUM/HIGH/CRITICAL
- Institutional backing (פרק 6)
- Sector Risk

ציון 80+ = Backbone-class Confidence
ציון 65-80 = Strong Confidence
ציון 50-65 = Moderate Confidence
ציון <50 = Low Confidence (סיכון משמעותי)`;

const OUTPUT_SCHEMA = `{
  "confidence_score": <0-100>,
  "confidence_tier": "Backbone-class" | "Strong" | "Moderate" | "Low",

  "financial_strength": {
    "score": <0-100>,
    "fcf_health": "GREEN" | "YELLOW" | "RED",
    "debt_level": "GREEN" | "YELLOW" | "RED",
    "liquidity": "GREEN" | "YELLOW" | "RED",
    "summary": "<בעברית, 1-2 משפטים>"
  },

  "management_quality": {
    "score": <0-100>,
    "category": "Execution" | "Hybrid" | "Promise",
    "beat_ratio_integration": "<בעברית, איך ה-Beat Ratio שקיבלת משפיע>",
    "key_findings": ["<בעברית, ממצאי מפתח על ההנהלה>"]
  },

  "institutional_signals": {
    "score": <0-100>,
    "summary": "<בעברית, מה ידוע על אחזקות מוסדיים, insider trades, שותפויות>"
  },

  "competitive_position": {
    "score": <0-100>,
    "summary": "<בעברית, נתח שוק, מתחרים מרכזיים, סיכוני תחרות>"
  },

  "risk_assessment": {
    "geopolitical_risk": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "concentration_risk": "LOW" | "MEDIUM" | "HIGH",
    "macro_sensitivity": "LOW" | "MEDIUM" | "HIGH",
    "summary": "<בעברית>"
  },

  "weaknesses_resolution": [
    {
      "from_layer1_weakness": "<התיאור המקורי מ-Layer 1>",
      "status": "BALANCED" | "PARTIALLY_BALANCED" | "UNRESOLVED" | "AGGRAVATED",
      "evidence": "<בעברית, מה הראיות שמצאת>"
    }
  ],

  "contributes_to_4d": {
    "confidence_signal": "high" | "medium" | "low"
  },

  "validation_summary": "<בעברית, 2-3 משפטים: רמת ה-Confidence הכוללת ולמה>",
  "positive_indicators": ["<בעברית>"],
  "negative_indicators": ["<בעברית>"],
  "needs_attention": ["<בעברית, פריטים לבדיקה ב-Layer 3/4>"]
}`;

function stripRaw(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const { raw, ...rest } = obj;
  return rest;
}

function buildUserMessage({ ticker, profile, stockData, beatRatio, layer1Output }) {
  // Provide Layer 1 context in a compact, structured form
  const layer1Context = {
    x_factor: layer1Output.x_factor,
    backbone: layer1Output.backbone,
    type_classification: layer1Output.type_classification,
    lifecycle_stage: layer1Output.lifecycle_stage,
    weaknesses: layer1Output.weaknesses,
    strengths: layer1Output.strengths,
    needs_attention: layer1Output.needs_attention,
  };

  const cleanData = {
    profile: stripRaw(stockData.profile),
    quote: stripRaw(stockData.quote),
    keyMetrics: stripRaw(stockData.keyMetrics),
    priceTarget: stockData.priceTarget,
    recentEarnings: stockData.earnings?.slice(0, 8) || [],
  };

  return `נתח את המניה הבאה לפי Layer 2 (Validation Engine):

**TICKER:** ${ticker}
**PROFILE:** ${profile}
**TODAY:** ${new Date().toISOString().split('T')[0]}

**הקלט מ-Layer 1 (Opportunity):**
\`\`\`json
${JSON.stringify(layer1Context, null, 2)}
\`\`\`

**Beat Ratio מחושב (פרק 11.5):**
\`\`\`json
${JSON.stringify(beatRatio, null, 2)}
\`\`\`

**נתוני FMP:**
\`\`\`json
${JSON.stringify(cleanData, null, 2)}
\`\`\`

**המשימה:**

ענה על שאלת Layer 2: **"כמה אני יכול לסמוך שהתזה של Layer 1 תתממש?"** → Confidence Score 0-100

חובה לבצע:

1. **לבדוק כל חולשה מ-Layer 1** - האם היא BALANCED / PARTIALLY_BALANCED / UNRESOLVED / AGGRAVATED?
   השתמש ב-can_be_balanced_by כרמז למה לחפש.

2. **לשלב את ה-Beat Ratio בציון** - לפי המודל זה הגורם החזק ביותר ל-Confidence.
   - Backbone Executor → +15
   - Strong Performer → +5-10
   - Mediocre → 0
   - Promise Stock → -15

3. **לחשב Confidence Score מבוסס על:**
   - Financial Strength (פרק 3)
   - Management Quality + Beat Ratio (פרק 33 + 11.5)
   - Institutional Signals (פרק 6)
   - Competitive Position (פרק 4)
   - Risk Assessment (פרק 28, 34)

4. **התאם לפרופיל ${profile}** - מה ש-Confidence 60 אומר משתנה לפי הפרופיל.

5. **בלי הזיות** - אם אין לך נתון על נושא (לדוגמה: אין רשימת מוסדיים בקלט), אמור זאת מפורשות ב-needs_attention.

החזר אך ורק JSON שתואם בדיוק לסכימה:
\`\`\`
${OUTPUT_SCHEMA}
\`\`\`

JSON בלבד. ללא הקדמה. ללא markdown fence.`;
}

/**
 * Run Layer 2 analysis.
 * @param {Object} params
 * @param {string} params.ticker
 * @param {string} params.profile
 * @param {Object} params.stockData
 * @param {Object} params.beatRatio - From beat-ratio.js
 * @param {Object} params.layer1Output - Full Layer 1 result
 * @returns {Promise<Object>} Layer2Output
 */
export async function runLayer2({ ticker, profile, stockData, beatRatio, layer1Output }) {
  if (!ticker || !profile || !stockData || !beatRatio || !layer1Output) {
    throw new Error('runLayer2 requires ticker, profile, stockData, beatRatio, and layer1Output');
  }

  const userMessage = buildUserMessage({ ticker, profile, stockData, beatRatio, layer1Output });

  const { json, usage } = await callClaudeForJson({
    model: MODELS.OPUS,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 4096,
  });

  // Validate required fields
  const required = ['confidence_score', 'confidence_tier', 'financial_strength', 'management_quality'];
  const missing = required.filter(k => !(k in json));
  if (missing.length > 0) {
    throw new Error(`Layer 2 output missing required fields: ${missing.join(', ')}`);
  }

  return {
    layer: 'validation',
    ticker: ticker.toUpperCase(),
    profile,
    analyzed_at: new Date().toISOString(),
    model: MODELS.OPUS,
    beat_ratio_input: beatRatio,
    ...json,
    usage,
  };
}
