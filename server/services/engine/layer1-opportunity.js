/**
 * @file Layer 1 - Opportunity Engine
 * @description Identifies "Potential Energy" in a stock per RealValueX methodology.
 * Covers Chapters 1, 7, 9, 10, 26, 32.
 *
 * CRITICAL: This layer does NOT reject. It identifies weaknesses to be evaluated
 * by later layers in context. The model is DYNAMIC and CONTEXTUAL.
 *
 * Output: Hebrew JSON conforming to Layer1Output schema (see types.js).
 */

import { callClaudeForJson, MODELS } from './claude-client.js';

// ============================================================================
// System prompt - Hebrew/English mix
// English for structure (clarity for the model), Hebrew for content
// ============================================================================
const SYSTEM_PROMPT = `אתה RealValueX™ Layer 1 - Opportunity Engine.

תפקידך: לזהות את "האנרגיה הפוטנציאלית" של מניה - האם יש כאן הזדמנות תשואה אסימטרית?

עקרונות יסוד (חובה לשמור):

1. **המודל הוא דינמי וקונטקסטואלי** - חולשה ב-Layer 1 אינה פסילה. היא מסומנת לבדיקה ע"י השכבות הבאות שיבחנו אם היא מאוזנת ע"י סיגנלים חיצוניים (מוסדיים, Backlog, Catalyst).

2. **אסור לפסול** מניה על בסיס חולשה יחידה. כל חולשה חייבת לכלול \`can_be_balanced_by\` - מה יכול לאזן אותה ב-Layer 2/3.

3. **התאמה לפרופיל** - אותה תכונה (FCF שלילי) נראית אחרת ל-C1 (חמורה) ול-F1 (מקובלת עם Catalyst).

4. **שפת הפלט: עברית.** כל הטקסטים החופשיים (descriptions, summaries, rationale, indicators) חייבים להיות בעברית. ערכים enum נשארים באנגלית (GREEN/YELLOW/RED, A/B/C, וכו').

5. **JSON בלבד** - אל תוסיף הקדמה או סיום. רק האובייקט.

6. **תמציתיות** - שמור על תיאורים קצרים (1-2 משפטים). מקסימום 3 weaknesses, 3 strengths, 4 positive_indicators, 4 negative_indicators.

מודל הניתוח מבוסס על 6 פרקים:
- פרק 1: שלב מחזור חיים (Development/Growth/Maturity/Decline)
- פרק 7: X-Factor (TechLockIn/Scale/Ecosystem/DemandShock/Execution) + ה-verdict שלו
- פרק 9: שלב חדירה לשוק
- פרק 10: חיות עסקית (FCF, R&D, ROIC, פטנטים, מותג)
- פרק 26: Innovation Momentum
- פרק 32: עמידות החפיר (Moat Durability) - האם רלוונטי ב-3 שנים? 10?

Backbone Spectrum (סולם, לא בינארי):
- Pure: מונופול דה-פקטו (ASML, Visa)
- Near: דומיננטיות + Lock-in (NVIDIA, Microsoft)
- In-Making: בדרך, עוד לא הוכיחו Scale (Palantir, Snowflake)
- Niche: מונופול בנישה צרה
- Aspiring: פוטנציאל אבל סיכון ביצועי גבוה (F1/M1)
- Commodity: בלי X-Factor - לא מתאים ל-RealValueX

TYPE Classification:
- A: Re-rating play (המחיר הוא ה-Edge, שוק מתמחר שגוי)
- B: Compounder (X-Factor הוא ה-Edge, TAM + Scaling)
- C: Hybrid (Re-rating + Growth)`;

// ============================================================================
// JSON schema definition (shown to model as part of user message)
// ============================================================================
const OUTPUT_SCHEMA = `{
  "x_factor": {
    "type": "TechLockIn" | "Scale" | "Ecosystem" | "DemandShock" | "Execution" | "None",
    "verdict": "GREEN" | "YELLOW" | "RED",
    "description": "<בעברית, 1-2 משפטים על ה-X-Factor>",
    "durability": "GREEN" | "YELLOW" | "RED"
  },
  "backbone": {
    "tier": "Pure" | "Near" | "In-Making" | "Niche" | "Aspiring" | "Commodity",
    "rationale": "<בעברית, למה הסיווג הזה>"
  },
  "type_classification": "A" | "B" | "C",
  "lifecycle_stage": "Development" | "Growth" | "Maturity" | "Decline",
  "weaknesses": [
    {
      "chapter": <מספר פרק>,
      "issue": "<בעברית, מה החולשה>",
      "can_be_balanced_by": ["<בעברית, מה יכול לאזן - לדוגמה: 'Backlog מאומת', 'מוסדיים בעלי אמון', 'Catalyst קרוב'>"]
    }
  ],
  "strengths": [
    {
      "chapter": <מספר פרק>,
      "finding": "<בעברית, מה החוזק>"
    }
  ],
  "contributes_to_4d": {
    "yield_signal": "high" | "medium" | "low",
    "duration_signal": "high" | "medium" | "low"
  },
  "potential_energy_summary": "<בעברית, 1-2 משפטים: האם יש כאן Potential Energy ולמה>",
  "positive_indicators": ["<בעברית, רשימת אינדיקטורים חיוביים, עד 4>"],
  "negative_indicators": ["<בעברית, אינדיקטורים שליליים - לציון בלבד, לא לפסילה, עד 4>"],
  "needs_attention": ["<בעברית, פריטים שדורשים בדיקה נוספת בשכבות הבאות, עד 4>"]
}`;

// ============================================================================
// Build user message from stock data + profile
// ============================================================================
function buildUserMessage({ ticker, profile, stockData }) {
  // Strip raw fields to reduce token count
  const cleanData = {
    profile: stripRaw(stockData.profile),
    quote: stripRaw(stockData.quote),
    keyMetrics: stripRaw(stockData.keyMetrics),
    recentEarnings: stockData.earnings?.slice(0, 8) || [],
  };

  return `נתח את המניה הבאה לפי Layer 1 (Opportunity Engine):

**TICKER:** ${ticker}
**PROFILE:** ${profile}
**TODAY:** ${new Date().toISOString().split('T')[0]}

**הנתונים שזמינים (מ-FMP):**
\`\`\`json
${JSON.stringify(cleanData, null, 2)}
\`\`\`

**המשימה:**

ענה על שאלת Layer 1: **"האם יש כאן Potential Energy?"**

התמקד ב:
1. **פרק 1** - באיזה שלב מחזור חיים החברה? (Development/Growth/Maturity/Decline)
2. **פרק 7** - מהו ה-X-Factor? איזה סוג? האם הוא Market Leader/Survival/אין?
3. **פרק 9** - שלב חדירה לשוק? (אם זמין מהנתונים)
4. **פרק 10** - האם FCF חיובי? R&D משמעותי? ROIC גבוה?
5. **פרק 26** - האם יש Innovation Momentum?
6. **פרק 32** - האם החפיר עמיד ל-3/10 שנים? האם flywheel או נשחק?

זכור:
- **חולשות לא פוסלות.** רק מסמנות לשכבות הבאות
- **התאם לפרופיל ${profile}.** מה שמקובל ב-F1 לא מקובל ב-C1, ולהיפך
- **בחר Backbone tier** מהסולם (Pure → Commodity)
- **סווג TYPE** - A/B/C
- **תמציתיות**: 1-2 משפטים לכל תיאור. מקסימום 3 weaknesses, 3 strengths.

החזר אך ורק JSON שתואם בדיוק לסכימה הזו:
\`\`\`
${OUTPUT_SCHEMA}
\`\`\`

JSON בלבד. ללא הקדמה. ללא סיום. ללא markdown fence.`;
}

/**
 * Remove the bulky `raw` field that providers attach for debugging.
 * Saves significant tokens.
 */
function stripRaw(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const { raw, ...rest } = obj;
  return rest;
}

// ============================================================================
// Main runner
// ============================================================================

/**
 * Run Layer 1 analysis.
 * @param {Object} params
 * @param {string} params.ticker
 * @param {string} params.profile - C1|G1|M1|F1
 * @param {Object} params.stockData - bundle from data Facade
 * @returns {Promise<Object>} Layer1Output
 */
export async function runLayer1({ ticker, profile, stockData }) {
  if (!ticker || !profile || !stockData) {
    throw new Error('runLayer1 requires ticker, profile, and stockData');
  }

  const userMessage = buildUserMessage({ ticker, profile, stockData });

  const { json, usage } = await callClaudeForJson({
    model: MODELS.OPUS,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 8000,
    layerName: 'layer1-opportunity',
  });

  // Validate critical fields exist (defensive - LLMs sometimes skip fields)
  const required = ['x_factor', 'backbone', 'type_classification', 'lifecycle_stage'];
  const missing = required.filter(k => !json[k]);
  if (missing.length > 0) {
    throw new Error(`Layer 1 output missing required fields: ${missing.join(', ')}`);
  }

  // Wrap with metadata
  return {
    layer: 'opportunity',
    ticker: ticker.toUpperCase(),
    profile,
    analyzed_at: new Date().toISOString(),
    model: MODELS.OPUS,
    ...json,
    usage,
  };
}
