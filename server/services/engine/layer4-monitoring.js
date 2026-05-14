/**
 * @file Layer 4 - Monitoring Engine
 * @description "How do we manage the position once we're in?" → Thesis Lock + Alert rules
 *
 * Covers Chapters: 5, 8, 11, 13, 18, 20, 21, 29, 30, 31, 35
 *
 * Key inputs: All previous layer outputs + Beat Ratio + Technical Indicators
 *
 * CRITICAL: Layer 4 produces the "ongoing rules" for the position:
 *   - What's the Thesis Statement that defines this trade?
 *   - When do we add to the position (Pyramid Up)?
 *   - When do we reduce (Trim Down)?
 *   - When do we exit completely (Thesis Break)?
 *   - What news/events should trigger a review?
 *
 * Output: Hebrew JSON with Thesis Lock + Monitoring rules.
 */

import { callClaudeForJson, MODELS } from './claude-client.js';

const SYSTEM_PROMPT = `אתה RealValueX™ Layer 4 - Monitoring Engine.

תפקידך: לקבוע את הכללים לניהול הפוזיציה אחרי שכבר נכנסנו.

עקרונות יסוד:

1. **Thesis Statement היא הלב של Layer 4.** משפט יחיד שמתאר מה אנחנו מאמינים שיקרה.
   דוגמה (לא לחזור עליה, רק להמחיש): "אנחנו מאמינים ש-DemandShock של AI על NAND יימשך 24+ חודשים,
   המחירים יישארו גבוהים, וההכנסות יחצו $30B עד 2027."

   כל כלל נוסף נגזר מה-Thesis. אם ה-Thesis נשבר → exit.

2. **Pyramid Up Rules** - מתי להגדיל פוזיציה?
   - בדרך כלל: רק על strength מאומת (beat נוסף, breakout)
   - לא לעולם: על recoveries מ-Stop-Loss

3. **Trim Down Rules** - מתי להקטין?
   - הפוזיציה הפכה גדולה מדי (>5% מהתיק לפרופיל C1/G1)
   - הגיע ל-Target 1 - קח 25-33%
   - יש סיבה דחופה (geopolitical shock וכו')

4. **Thesis Break Triggers** - מה ישבור את ה-Thesis?
   - לא "המחיר ירד 10%" (זה Stop-Loss, לא Thesis Break)
   - אלא: "ה-Beat Ratio נשבר", "Catalyst לא קרה", "מתחרה חזק יצא"

5. **Review Triggers** - אירועים שדורשים בדיקה (לא בהכרח פעולה):
   - Earnings יצא
   - Insider sale גדול
   - 13F תאריך publication
   - מעבר מתחת ל-MA200

6. **קונטקסט מ-Layers 1+2+3** - תקבל את כל הניתוחים הקודמים.

7. **התאמה לפרופיל:**
   - C1: כללים שמרניים, hold ארוך, trim על gains
   - G1: pyramid up על breakouts, trim בקצוות
   - M1: stop-loss הדוק, pyramid אגרסיבי
   - F1: position sizing קטן (1-3%), בלי pyramid, exit מוקדם

8. **שפת הפלט: עברית.** ערכי enum באנגלית.

9. **JSON בלבד.** ללא הקדמה.

הפרקים המכוסים:
- פרק 5: Investment Thesis
- פרק 8: Position Sizing
- פרק 11: Earnings Tracking
- פרק 13: Catalyst Calendar
- פרק 18: News Flow Monitoring
- פרק 20: Pyramid Up Rules
- פרק 21: Trim Down Rules
- פרק 29: Stop-Loss Rules
- פרק 30: Thesis Break Triggers
- פרק 31: Review Schedule
- פרק 35: Position Lifecycle`;

const OUTPUT_SCHEMA = `{
  "thesis_statement": "<משפט יחיד בעברית - מה אנחנו מאמינים שיקרה>",
  "thesis_confidence": <0-100>,

  "position_sizing": {
    "recommended_pct_of_portfolio": <אחוז מהתיק, 0.5-15>,
    "rationale": "<בעברית - למה הגודל הזה לפרופיל ${profile_placeholder}>",
    "max_pct_after_pyramid": <אחוז מקסימלי, גדול או שווה לרמת הבסיס>
  },

  "pyramid_up_rules": [
    {
      "trigger": "<בעברית - מה צריך לקרות>",
      "action": "<בעברית - מה לעשות, לדוגמה 'להוסיף 25% מהפוזיציה'>",
      "max_total_pct": <אחוז מקסימלי מהתיק אחרי ההוספה>
    }
  ],

  "trim_down_rules": [
    {
      "trigger": "<בעברית - מה צריך לקרות>",
      "action": "<בעברית - מה לעשות, לדוגמה 'למכור 33% מהפוזיציה'>"
    }
  ],

  "stop_loss_rules": {
    "initial_stop_price": <מחיר>,
    "trailing_stop_method": "<בעברית - לדוגמה 'MA50 ביומי' או 'נמוך של 20 ימים'>",
    "hard_exit_conditions": ["<בעברית - תנאים שמחייבים יציאה מיידית>"]
  },

  "thesis_break_triggers": [
    {
      "trigger": "<בעברית - מה היה צריך להישבר ב-Thesis>",
      "action": "EXIT_FULL" | "EXIT_PARTIAL" | "REASSESS",
      "rationale": "<בעברית>"
    }
  ],

  "review_schedule": {
    "scheduled_reviews": [
      {
        "event": "<בעברית - לדוגמה 'דוח Q2'>",
        "expected_date": "<תאריך משוער או טריגר>",
        "what_to_check": "<בעברית - מה לבדוק>"
      }
    ],
    "trigger_alerts": ["<בעברית - אירועים שצריכים לעורר alert מיידי>"]
  },

  "key_metrics_to_track": ["<בעברית - מטריקות שצריך לעקוב אחריהן ב-tracker>"],

  "monitoring_summary": "<בעברית, 2-3 משפטים: איך לנהל את הפוזיציה הזו>",
  "positive_indicators": ["<בעברית>"],
  "negative_indicators": ["<בעברית>"]
}`;

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

  return `נתח את המניה הבאה לפי Layer 4 (Monitoring Engine):

**TICKER:** ${ticker}
**PROFILE:** ${profile}
**TODAY:** ${new Date().toISOString().split('T')[0]}

**הקלט מ-Layer 1 (Opportunity):**
\`\`\`json
${JSON.stringify(layer1Context, null, 2)}
\`\`\`

**הקלט מ-Layer 2 (Validation - Confidence ${layer2Output.confidence_score}):**
\`\`\`json
${JSON.stringify(layer2Context, null, 2)}
\`\`\`

**הקלט מ-Layer 3 (Timing - Speed ${layer3Output.speed_score}):**
\`\`\`json
${JSON.stringify(layer3Context, null, 2)}
\`\`\`

**Beat Ratio Context:**
\`\`\`json
${JSON.stringify({
  ratio_5y: beatRatio.ratio_5y,
  category: beatRatio.category,
  direction: beatRatio.direction,
}, null, 2)}
\`\`\`

**Technical Indicators Summary:**
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

ענה על שאלת Layer 4: **"איך לנהל את הפוזיציה אחרי שנכנסנו?"**

חובה לבצע:

1. **לנסח Thesis Statement** - משפט יחיד שמסביר מה אנחנו מאמינים שיקרה.
   זה חייב להיות ספציפי וניתן לבדיקה. לא "החברה טובה" אלא "X יקרה בטווח Y".

2. **לקבוע Position Sizing לפי פרופיל ${profile}:**
   - C1: 3-8% מהתיק
   - G1: 2-6% מהתיק
   - M1: 1-4% מהתיק
   - F1: 0.5-2% מהתיק (Moonshot)

3. **לקבוע Pyramid Up Rules** - מתי להגדיל את הפוזיציה (עם triggers ספציפיים ורמות מחיר).

4. **לקבוע Trim Down Rules** - מתי להקטין (בדרך כלל ב-Targets של Layer 3).

5. **לקבוע Stop-Loss + Thesis Break Triggers** - הבדל קריטי:
   - Stop-Loss = שלל טכני (מחיר)
   - Thesis Break = שלל מבני (סיבה לתזה נפלה)

6. **לקבוע Review Schedule** - תאריכים ספציפיים לבדיקה:
   - תאריך earnings הבא
   - 13F deadline
   - earnings season חברות יריבות

7. **לרשום Key Metrics to Track** - מה צריך להופיע ב-dashboard:
   - Beat Ratio updates
   - חולשות מ-Layer 1 שעדיין לא נפתרו
   - MA50/200 levels
   - הנפח

החזר אך ורק JSON שתואם בדיוק לסכימה:
\`\`\`
${OUTPUT_SCHEMA.replace('${profile_placeholder}', profile)}
\`\`\`

JSON בלבד. ללא הקדמה. ללא markdown fence.`;
}

/**
 * Run Layer 4 analysis.
 */
export async function runLayer4({ ticker, profile, stockData, beatRatio, technicalIndicators, layer1Output, layer2Output, layer3Output }) {
  if (!ticker || !profile || !stockData || !beatRatio || !technicalIndicators || !layer1Output || !layer2Output || !layer3Output) {
    throw new Error('runLayer4 requires all inputs: ticker, profile, stockData, beatRatio, technicalIndicators, layer1Output, layer2Output, layer3Output');
  }

  const userMessage = buildUserMessage({
    ticker, profile, stockData, beatRatio, technicalIndicators,
    layer1Output, layer2Output, layer3Output,
  });

  const { json, usage } = await callClaudeForJson({
    model: MODELS.OPUS,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 4096,
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
