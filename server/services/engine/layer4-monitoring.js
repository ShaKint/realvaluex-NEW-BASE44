/**
 * @file Layer 4 - Monitoring Engine
 * @description "How do we manage the position once we're in?" → Thesis Lock + Alert rules
 *
 * Output: Hebrew JSON with Thesis Lock + Monitoring rules.
 */

import { callClaudeForJson, MODELS } from './claude-client.js';

const SYSTEM_PROMPT = `אתה RealValueX™ Layer 4 - Monitoring Engine.

תפקידך: לקבוע את הכללים לניהול הפוזיציה אחרי שכבר נכנסנו.

עקרונות יסוד:

1. **Thesis Statement היא הלב של Layer 4.** משפט יחיד שמתאר מה אנחנו מאמינים שיקרה.
   זה חייב להיות ספציפי וניתן לבדיקה. לא "החברה טובה" אלא "X יקרה בטווח Y".

2. **Pyramid Up Rules** - מתי להגדיל פוזיציה?
   - רק על strength מאומת (beat נוסף, breakout)
   - לעולם לא: על recoveries מ-Stop-Loss

3. **Trim Down Rules** - מתי להקטין?
   - הפוזיציה גדלה מדי
   - הגיע ל-Target 1 - קח 25-33%

4. **Thesis Break Triggers** - מה ישבור את ה-Thesis?
   - לא "המחיר ירד 10%" (זה Stop-Loss)
   - אלא: "Beat Ratio נשבר", "Catalyst לא קרה", "מתחרה חזק יצא"

5. **התאמה לפרופיל:**
   - C1: כללים שמרניים, hold ארוך
   - G1: pyramid על breakouts
   - M1: stop-loss הדוק
   - F1: סייז קטן (1-3%), בלי pyramid

6. **שפת הפלט: עברית.** ערכי enum באנגלית.

7. **JSON בלבד.** ללא הקדמה.`;

function buildOutputSchema(profile) {
  return `{
  "thesis_statement": "<משפט יחיד בעברית>",
  "thesis_confidence": <0-100>,

  "position_sizing": {
    "recommended_pct_of_portfolio": <0.5-15>,
    "rationale": "<בעברית - למה הגודל הזה לפרופיל ${profile}>",
    "max_pct_after_pyramid": <אחוז מקסימלי>
  },

  "pyramid_up_rules": [
    {
      "trigger": "<בעברית>",
      "action": "<בעברית>",
      "max_total_pct": <אחוז>
    }
  ],

  "trim_down_rules": [
    {
      "trigger": "<בעברית>",
      "action": "<בעברית>"
    }
  ],

  "stop_loss_rules": {
    "initial_stop_price": <מחיר>,
    "trailing_stop_method": "<בעברית>",
    "hard_exit_conditions": ["<בעברית>"]
  },

  "thesis_break_triggers": [
    {
      "trigger": "<בעברית>",
      "action": "EXIT_FULL" | "EXIT_PARTIAL" | "REASSESS",
      "rationale": "<בעברית>"
    }
  ],

  "review_schedule": {
    "scheduled_reviews": [
      {
        "event": "<בעברית>",
        "expected_date": "<תאריך או טריגר>",
        "what_to_check": "<בעברית>"
      }
    ],
    "trigger_alerts": ["<בעברית>"]
  },

  "key_metrics_to_track": ["<בעברית>"],

  "monitoring_summary": "<בעברית, 2-3 משפטים>",
  "positive_indicators": ["<בעברית>"],
  "negative_indicators": ["<בעברית>"]
}`;
}

function buildUserMessage({ ticker, profile, stockData, beatRatio, technicalIndicators, layer1Output, layer2Output, layer3Output }) {
  const layer1Context = {
    x_factor: layer1Output.x_factor,
    backbone: layer1Output.backbone,
    type_classification: layer1Output.type_classification,
    potential_energy_summary: layer1Output.potential_energy_summary,
  };

  const layer2Context = {
    confidence_score: layer2Output.confidence_score,
    confidence_tier: layer2Output.confidence_tier,
    validation_summary: layer2Output.validation_summary,
    risk_assessment: layer2Output.risk_assessment,
  };

  const layer3Context = {
    speed_score: layer3Output.speed_score,
    speed_tier: layer3Output.speed_tier,
    entry_strategy: layer3Output.entry_strategy,
    risk_levels: layer3Output.risk_levels,
    timing_summary: layer3Output.timing_summary,
  };

  const outputSchema = buildOutputSchema(profile);

  return `נתח Monitoring למניה:

**TICKER:** ${ticker}
**PROFILE:** ${profile}
**TODAY:** ${new Date().toISOString().split('T')[0]}

**Layer 1 (Opportunity):**
\`\`\`json
${JSON.stringify(layer1Context, null, 2)}
\`\`\`

**Layer 2 (Validation - Confidence ${layer2Output.confidence_score}):**
\`\`\`json
${JSON.stringify(layer2Context, null, 2)}
\`\`\`

**Layer 3 (Timing - Speed ${layer3Output.speed_score}):**
\`\`\`json
${JSON.stringify(layer3Context, null, 2)}
\`\`\`

**Beat Ratio:**
\`\`\`json
${JSON.stringify({
  ratio_5y: beatRatio.ratio_5y,
  category: beatRatio.category,
  direction: beatRatio.direction,
}, null, 2)}
\`\`\`

**Technical Indicators:**
\`\`\`json
${JSON.stringify({
  rsi: technicalIndicators.rsi,
  ma_state: technicalIndicators.moving_averages?.state,
  structure: technicalIndicators.structure,
  volatility: technicalIndicators.volatility,
}, null, 2)}
\`\`\`

**Current Quote:**
\`\`\`json
${JSON.stringify({
  price: stockData.quote?.price,
  yearHigh: stockData.quote?.yearHigh,
  yearLow: stockData.quote?.yearLow,
  ma50: stockData.quote?.ma50,
  ma200: stockData.quote?.ma200,
}, null, 2)}
\`\`\`

**המשימה:**

1. **לנסח Thesis Statement** - משפט יחיד ספציפי
2. **לקבוע Position Sizing לפי פרופיל ${profile}:**
   - C1: 3-8% / G1: 2-6% / M1: 1-4% / F1: 0.5-2%
3. **לקבוע Pyramid Up Rules** עם triggers ורמות
4. **לקבוע Trim Down Rules**
5. **לקבוע Stop-Loss + Thesis Break Triggers** (הם שונים!)
6. **לקבוע Review Schedule**
7. **לרשום Key Metrics to Track**

החזר JSON תואם:
\`\`\`
${outputSchema}
\`\`\`

JSON בלבד. ללא הקדמה. ללא markdown fence.`;
}

export async function runLayer4({ ticker, profile, stockData, beatRatio, technicalIndicators, layer1Output, layer2Output, layer3Output }) {
  if (!ticker || !profile || !stockData || !beatRatio || !technicalIndicators || !layer1Output || !layer2Output || !layer3Output) {
    throw new Error('runLayer4 requires all inputs');
  }

  const userMessage = buildUserMessage({
    ticker, profile, stockData, beatRatio, technicalIndicators,
    layer1Output, layer2Output, layer3Output,
  });

  const { json, usage } = await callClaudeForJson({
    model: MODELS.OPUS,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 6000,
    layerName: 'layer4-monitoring',
  });

  const required = ['thesis_statement', 'position_sizing', 'pyramid_up_rules', 'trim_down_rules', 'stop_loss_rules'];
  const missing = required.filter(k => !(k in json));
  if (missing.length > 0) {
    throw new Error(`Layer 4 output missing required fields: ${missing.join(', ')}`);
  }

  return {
    layer: 'monitoring',
    ticker: ticker.toUpperCase(),
    profile,
    analyzed_at: new Date().toISOString(),
    model: MODELS.OPUS,
    ...json,
    usage,
  };
}
