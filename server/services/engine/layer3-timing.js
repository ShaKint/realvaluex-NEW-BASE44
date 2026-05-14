/**
 * @file Layer 3 - Timing Engine
 * @description "When and how much to buy?" → Speed Score 0-100 + Entry recommendation
 *
 * Covers Chapters: 2, 12, 17, 22-25
 *
 * Key inputs:
 *   - All FMP data (profile, quote, key-metrics, historical prices, price-target)
 *   - Pre-computed technical indicators (RSI, MA, momentum, structure)
 *   - Layer 1 output (Opportunity context)
 *   - Layer 2 output (Validation/Confidence context)
 *
 * CRITICAL: Layer 3 evaluates ENTRY TIMING based on technicals and price action.
 * A high-quality stock (Confidence 80) can still be a BAD timing right now.
 *
 * Output: Hebrew JSON with Speed Score 0-100 + Entry recommendation.
 */

import { callClaudeForJson, MODELS } from './claude-client.js';

const SYSTEM_PROMPT = `אתה RealValueX™ Layer 3 - Timing Engine.

תפקידך: לחשב Speed Score (0-100) - "מתי וכמה לקנות עכשיו?"

עקרונות יסוד:

1. **קונטקסט מ-Layer 1 ו-Layer 2** - תקבל את הניתוחים הקודמים.
   - מ-Layer 1: סוג ה-Opportunity, Backbone, חולשות, חוזקות
   - מ-Layer 2: Confidence Score והאם החולשות מאוזנות

2. **טיימינג שונה מאיכות.** מניה איכותית (Confidence 85) יכולה להיות בנקודת כניסה גרועה (Speed 30)
   אם היא רק עלתה 200% והגיעה למצב Overbought. הפוך - מניה בינונית (Confidence 55)
   יכולה להיות בנקודת כניסה מצוינת (Speed 75) אם היא Oversold עם Catalyst קרוב.

3. **טכניקאות חישוב Speed Score:**
   - RSI: Oversold (<30) חיובי, Overbought (>70) שלילי
   - MA: מעל MA50+MA200 חיובי, Death Cross שלילי
   - Distance from year high: 0-5% (קצה השיא) זהיר, 5-15% pullback טוב, 30%+ מהשיא = תחתית
   - Momentum: slope חיובי + לא קיצוני = טוב; slope קיצוני שלילי = ירידה לא גמורה
   - Structure: 'breakout-up' חיובי, 'consolidation' לפני breakout חיובי, 'breakdown' שלילי
   - Target Consensus: אם מתחת למחיר נוכחי - אנליסטים זהירים → שלילי

4. **התאמה לפרופיל:**
   - C1: רק קונים בתיקונים משמעותיים (Distance 15%+ מהשיא, RSI <50)
   - G1: 5-10% pullback מקובל, MA50 חצוי כלפי מעלה
   - M1: רק על breakouts או breakouts לפני - לא בתיקונים עמוקים
   - F1: timing פחות חשוב, יכולה לקנות בכל עת אם יש Catalyst

5. **הגדרת Entry Strategy:**
   - 'FULL_NOW': לקנות הפוזיציה המלאה עכשיו
   - 'SCALING_IN': להיכנס בחלקים (לדוגמה 33% עכשיו, 33% אם יורד ל-MA50, 33% על breakout)
   - 'WAIT_FOR_PULLBACK': לחכות לתיקון לרמה ספציפית
   - 'WAIT_FOR_BREAKOUT': לחכות לפריצה של רמה ספציפית
   - 'AVOID_FOR_NOW': לא נקודת כניסה טובה כרגע, גם אם איכות גבוהה

6. **שפת הפלט: עברית.** ערכי enum באנגלית.

7. **JSON בלבד.** ללא הקדמה.

הפרקים המכוסים:
- פרק 2: מקור Edge טכני (פיגוץ' חדש, breakout, momentum)
- פרק 12: Catalyst Map (מה יקרה ב-30/90/180 ימים)
- פרק 17: Asymmetry/Risk-Reward
- פרק 22: RSI ו-MACD
- פרק 23: Moving Averages
- פרק 24: Volume Profile
- פרק 25: Phase Change (זיהוי מעבר ממגמה למגמה)`;

const OUTPUT_SCHEMA = `{
  "speed_score": <0-100>,
  "speed_tier": "Excellent" | "Good" | "Acceptable" | "Wait" | "Avoid",

  "entry_strategy": {
    "type": "FULL_NOW" | "SCALING_IN" | "WAIT_FOR_PULLBACK" | "WAIT_FOR_BREAKOUT" | "AVOID_FOR_NOW",
    "recommendation": "<בעברית, הסבר מפורט של האסטרטגיה>",
    "entry_levels": [
      {
        "price": <מחיר>,
        "size_pct": <אחוז מהפוזיציה הסופית, 0-100>,
        "trigger": "<בעברית, מה צריך לקרות כדי לקנות בקו הזה>"
      }
    ]
  },

  "technical_assessment": {
    "rsi_signal": "<בעברית - מה ה-RSI אומר>",
    "ma_signal": "<בעברית - מה ה-MAs אומרים>",
    "structure_signal": "<בעברית - מה מבנה המחיר אומר>",
    "momentum_signal": "<בעברית - מה ה-momentum אומר>",
    "volume_signal": "<בעברית - מה הנפח אומר>",
    "position_in_range": "<בעברית - היכן המחיר ביחס לטווח שנתי>"
  },

  "catalyst_map": {
    "near_term": ["<קטליסטים בטווח 30 ימים>"],
    "medium_term": ["<קטליסטים בטווח 90 ימים>"],
    "long_term": ["<קטליסטים בטווח 180+ ימים>"]
  },

  "risk_levels": {
    "stop_loss_initial": <מחיר - איפה לעצור>,
    "stop_loss_rationale": "<בעברית - למה דווקא ברמה הזו>",
    "first_target": <מחיר - מטרה ראשונה>,
    "second_target": <מחיר - מטרה שנייה>,
    "risk_reward_ratio": <Reward:Risk ratio - לדוגמה 3 משמעו 3:1>
  },

  "contributes_to_4d": {
    "speed_signal": "high" | "medium" | "low"
  },

  "timing_summary": "<בעברית, 2-3 משפטים: האם זה זמן טוב להיכנס ולמה>",
  "positive_indicators": ["<בעברית>"],
  "negative_indicators": ["<בעברית>"],
  "needs_attention": ["<בעברית, פריטים לבדיקה ב-Layer 4>"]
}`;

function stripRaw(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const { raw, ...rest } = obj;
  return rest;
}

function buildUserMessage({ ticker, profile, stockData, technicalIndicators, layer1Output, layer2Output }) {
  const layer1Context = {
    x_factor: layer1Output.x_factor,
    backbone: layer1Output.backbone,
    type_classification: layer1Output.type_classification,
    lifecycle_stage: layer1Output.lifecycle_stage,
    potential_energy_summary: layer1Output.potential_energy_summary,
    weaknesses: layer1Output.weaknesses,
    strengths: layer1Output.strengths,
  };

  const layer2Context = {
    confidence_score: layer2Output.confidence_score,
    confidence_tier: layer2Output.confidence_tier,
    validation_summary: layer2Output.validation_summary,
    risk_assessment: layer2Output.risk_assessment,
    weaknesses_resolution: layer2Output.weaknesses_resolution,
  };

  const cleanData = {
    quote: stripRaw(stockData.quote),
    priceTarget: stockData.priceTarget,
  };

  return `נתח את המניה הבאה לפי Layer 3 (Timing Engine):

**TICKER:** ${ticker}
**PROFILE:** ${profile}
**TODAY:** ${new Date().toISOString().split('T')[0]}

**הקלט מ-Layer 1 (Opportunity):**
\`\`\`json
${JSON.stringify(layer1Context, null, 2)}
\`\`\`

**הקלט מ-Layer 2 (Validation):**
\`\`\`json
${JSON.stringify(layer2Context, null, 2)}
\`\`\`

**אינדיקטורים טכניים מחושבים:**
\`\`\`json
${JSON.stringify(technicalIndicators, null, 2)}
\`\`\`

**נתוני שוק נוכחיים:**
\`\`\`json
${JSON.stringify(cleanData, null, 2)}
\`\`\`

**המשימה:**

ענה על שאלת Layer 3: **"מתי וכמה לקנות עכשיו?"** → Speed Score 0-100 + Entry Strategy

חובה לבצע:

1. **לזהות את נקודת הזמן** - האם זה Breakout, Pullback, Consolidation, או Downtrend?

2. **לחשב Speed Score** מבוסס על:
   - RSI (Oversold = חיובי, Overbought = שלילי)
   - מבנה ה-MA (Bullish/Bearish/Recovery)
   - Distance מהשיא השנתי
   - Momentum direction
   - Structure pattern
   - Target Consensus vs Current Price

3. **לקבוע Entry Strategy ספציפית** - לא רק "תקנה" אלא **רמות מחיר מדויקות**:
   - אם FULL_NOW: רמת המחיר הנוכחי + סיבה
   - אם SCALING_IN: 3 רמות מחיר עם size אחוזים
   - אם WAIT_FOR_PULLBACK: מחיר היעד לתיקון + סיבה (לדוגמה MA50)
   - אם WAIT_FOR_BREAKOUT: רמת הפריצה + נפח נדרש
   - אם AVOID_FOR_NOW: למה לא עכשיו ומתי כן

4. **לקבוע Stop-Loss + Targets** מבוססי טכניקה:
   - Stop: מתחת לרמת תמיכה הקרובה (MA50, swing low וכו')
   - Target 1: רמת התנגדות קרובה
   - Target 2: שיא שנתי או רמת אסכאמה היסטורית

5. **התאם לפרופיל ${profile}** - אסטרטגיית כניסה שונה בכל פרופיל.

החזר אך ורק JSON שתואם בדיוק לסכימה:
\`\`\`
${OUTPUT_SCHEMA}
\`\`\`

JSON בלבד. ללא הקדמה. ללא markdown fence.`;
}

/**
 * Run Layer 3 analysis.
 */
export async function runLayer3({ ticker, profile, stockData, technicalIndicators, layer1Output, layer2Output }) {
  if (!ticker || !profile || !stockData || !technicalIndicators || !layer1Output || !layer2Output) {
    throw new Error('runLayer3 requires all inputs: ticker, profile, stockData, technicalIndicators, layer1Output, layer2Output');
  }

  const userMessage = buildUserMessage({
    ticker, profile, stockData, technicalIndicators, layer1Output, layer2Output
  });

  const { json, usage } = await callClaudeForJson({
    model: MODELS.OPUS,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 4096,
  });

  const required = ['speed_score', 'speed_tier', 'entry_strategy', 'technical_assessment'];
  const missing = required.filter(k => !(k in json));
  if (missing.length > 0) {
    throw new Error(`Layer 3 output missing required fields: ${missing.join(', ')}`);
  }

  return {
    layer: 'timing',
    ticker: ticker.toUpperCase(),
    profile,
    analyzed_at: new Date().toISOString(),
    model: MODELS.OPUS,
    technical_indicators_input: technicalIndicators,
    ...json,
    usage,
  };
}
