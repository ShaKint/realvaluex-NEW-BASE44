/**
 * @file Layer 3 - Timing Engine
 * @description "When and how much to buy?" → Speed Score 0-100 + Entry recommendation
 *
 * UPDATE (3C-4+ optimization): layer2Output is now OPTIONAL.
 * When running in parallel with L2, L3 receives null and uses only L1 context.
 *
 * Output: Hebrew JSON with Speed Score 0-100 + Entry recommendation.
 */

import { callClaudeForJson, MODELS } from './claude-client.js';

const SYSTEM_PROMPT = `אתה RealValueX™ Layer 3 - Timing Engine.

תפקידך: לחשב Speed Score (0-100) - "מתי וכמה לקנות עכשיו?"

עקרונות יסוד:

1. **קונטקסט מ-Layer 1** - תקבל את הניתוח הקודם.
   - מ-Layer 1: סוג ה-Opportunity, Backbone, חולשות, חוזקות

2. **טיימינג שונה מאיכות.** מניה איכותית יכולה להיות בנקודת כניסה גרועה
   אם היא רק עלתה 200% והגיעה למצב Overbought.

3. **טכניקאות חישוב Speed Score:**
   - RSI: Oversold (<30) חיובי, Overbought (>70) שלילי
   - MA: מעל MA50+MA200 חיובי, Death Cross שלילי
   - Distance from year high: 0-5% (קצה השיא) זהיר, 5-15% pullback טוב, 30%+ מהשיא = תחתית
   - Momentum: slope חיובי + לא קיצוני = טוב
   - Structure: 'breakout-up' חיובי, 'consolidation' חיובי, 'breakdown' שלילי
   - Target Consensus: אם מתחת למחיר נוכחי - שלילי

4. **התאמה לפרופיל:**
   - C1: רק קונים בתיקונים משמעותיים
   - G1: 5-10% pullback מקובל
   - M1: רק על breakouts
   - F1: timing פחות חשוב

5. **Entry Strategy:**
   - 'FULL_NOW': קניית הפוזיציה המלאה עכשיו
   - 'SCALING_IN': כניסה בחלקים
   - 'WAIT_FOR_PULLBACK': המתנה לתיקון
   - 'WAIT_FOR_BREAKOUT': המתנה לפריצה
   - 'AVOID_FOR_NOW': לא נקודת כניסה טובה

6. **שפת הפלט: עברית.** ערכי enum באנגלית.

7. **JSON בלבד.** ללא הקדמה.`;

const OUTPUT_SCHEMA = `{
  "speed_score": <0-100>,
  "speed_tier": "Excellent" | "Good" | "Acceptable" | "Wait" | "Avoid",

  "entry_strategy": {
    "type": "FULL_NOW" | "SCALING_IN" | "WAIT_FOR_PULLBACK" | "WAIT_FOR_BREAKOUT" | "AVOID_FOR_NOW",
    "recommendation": "<בעברית, הסבר>",
    "entry_levels": [
      {
        "price": <מחיר>,
        "size_pct": <אחוז 0-100>,
        "trigger": "<בעברית>"
      }
    ]
  },

  "technical_assessment": {
    "rsi_signal": "<בעברית>",
    "ma_signal": "<בעברית>",
    "structure_signal": "<בעברית>",
    "momentum_signal": "<בעברית>",
    "volume_signal": "<בעברית>",
    "position_in_range": "<בעברית>"
  },

  "catalyst_map": {
    "near_term": ["<קטליסטים 30 ימים>"],
    "medium_term": ["<קטליסטים 90 ימים>"],
    "long_term": ["<קטליסטים 180+ ימים>"]
  },

  "risk_levels": {
    "stop_loss_initial": <מחיר>,
    "stop_loss_rationale": "<בעברית>",
    "first_target": <מחיר>,
    "second_target": <מחיר>,
    "risk_reward_ratio": <יחס>
  },

  "contributes_to_4d": {
    "speed_signal": "high" | "medium" | "low"
  },

  "timing_summary": "<בעברית, 2-3 משפטים>",
  "positive_indicators": ["<בעברית>"],
  "negative_indicators": ["<בעברית>"],
  "needs_attention": ["<בעברית>"]
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

  // Layer 2 context is optional (might be null in parallel mode)
  const layer2Section = layer2Output ? `
**Layer 2 (Validation):**
\`\`\`json
${JSON.stringify({
  confidence_score: layer2Output.confidence_score,
  confidence_tier: layer2Output.confidence_tier,
  validation_summary: layer2Output.validation_summary,
  risk_assessment: layer2Output.risk_assessment,
  weaknesses_resolution: layer2Output.weaknesses_resolution,
}, null, 2)}
\`\`\`
` : '';

  const cleanData = {
    quote: stripRaw(stockData.quote),
    priceTarget: stockData.priceTarget,
  };

  return `נתח Timing למניה:

**TICKER:** ${ticker}
**PROFILE:** ${profile}
**TODAY:** ${new Date().toISOString().split('T')[0]}

**Layer 1 (Opportunity):**
\`\`\`json
${JSON.stringify(layer1Context, null, 2)}
\`\`\`
${layer2Section}
**אינדיקטורים טכניים:**
\`\`\`json
${JSON.stringify(technicalIndicators, null, 2)}
\`\`\`

**נתוני שוק:**
\`\`\`json
${JSON.stringify(cleanData, null, 2)}
\`\`\`

**המשימה:**

1. **לזהות את נקודת הזמן** - Breakout/Pullback/Consolidation/Downtrend
2. **לחשב Speed Score (0-100)** מבוסס על RSI, MA, Distance, Momentum, Structure, Target Consensus
3. **לקבוע Entry Strategy** עם רמות מחיר ספציפיות
4. **לקבוע Stop-Loss + Targets**
5. **להתאים לפרופיל ${profile}**

החזר JSON תואם לסכימה:
\`\`\`
${OUTPUT_SCHEMA}
\`\`\`

JSON בלבד. ללא הקדמה. ללא markdown fence.`;
}

export async function runLayer3({ ticker, profile, stockData, technicalIndicators, layer1Output, layer2Output }) {
  if (!ticker || !profile || !stockData || !technicalIndicators || !layer1Output) {
    throw new Error('runLayer3 requires ticker, profile, stockData, technicalIndicators, layer1Output');
  }
  // layer2Output is optional (null when running in parallel with L2)

  const userMessage = buildUserMessage({
    ticker, profile, stockData, technicalIndicators, layer1Output, layer2Output
  });

  const { json, usage } = await callClaudeForJson({
    model: MODELS.OPUS,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 6000,
    layerName: 'layer3-timing',
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
    ran_with_layer2_context: layer2Output !== null,
    ...json,
    usage,
  };
}
