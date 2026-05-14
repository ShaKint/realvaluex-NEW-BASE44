/**
 * @file Final Synthesis Engine
 * @description The final layer - synthesizes all prior outputs into:
 *   - Overall Score 0-100 (the "RVX Score" the user asked about)
 *   - Recommendation (Strong Buy / Buy / Hold / Trim / Sell)
 *   - 3-5 specific reasons grounded in prior analysis
 *   - Investor brief - one paragraph for quick reading/**
 * @file Final Synthesis Engine
 * @description The final layer - synthesizes all prior outputs into:
 *   - Overall Score 0-100 (quality)
 *   - Investment Score 0-100 (BUY-NOW indicator: quality + timing + upside)
 *   - Recommendation (Strong Buy / Buy / Hold / Trim / Sell)
 *   - 3-5 specific reasons grounded in prior analysis
 *   - Investor brief - one paragraph for quick reading
 *
 * Uses LLM (Opus) for narrative output, but Investment Score is pure math.
 */

import { callClaudeForJson, MODELS } from './claude-client.js';

const SYSTEM_PROMPT = `אתה RealValueX™ Final Synthesizer.

תפקידך: לאחד את 4 השכבות, S31, RUC, ו-4D לתוך:
1. Overall Score (0-100) - ציון איכות כולל של המניה
2. Recommendation - מה לעשות (Strong Buy/Buy/Hold/Trim/Sell)
3. Investor Brief - פסקה אחת תמציתית בעברית
4. Top Reasons - 3-5 סיבות מבוססות

עקרונות יסוד:

1. **המערכת מציגה מידע, המשתמש מחליט.** אל תכתוב "אני ממליץ לקנות" אלא "הראיות תומכות ב-Buy לפרופיל G1".

2. **Overall Score נגזר מהמרכיבים:**
   - Confidence (Layer 2) - 25%
   - Speed (Layer 3) - 20%
   - RUC - 20%
   - S31 Total - 15%
   - 4D Asymmetry - 10%
   - Thesis Confidence (Layer 4) - 10%

   החישוב הוא משוקלל. ציון <50 = איכות נמוכה, 50-65 = בינוני, 65-80 = טוב, 80+ = יוצא מן הכלל.

3. **Recommendation נגזר משילוב של:**
   - Overall Score (איכות)
   - Speed Score (טיימינג)
   - Profile fit
   - Entry Strategy מ-Layer 3

   לוגיקה:
   - Overall 80+ + Speed 70+ + Entry FULL_NOW/SCALING_IN → Strong Buy
   - Overall 65+ + Speed 60+ + Entry SCALING_IN/WAIT_FOR_PULLBACK → Buy
   - Overall 65+ + Speed <50 + Entry WAIT_FOR_PULLBACK → Hold
   - Overall 50-65 → Hold
   - Overall <50 → Trim/Avoid

4. **Top Reasons - חייבות להיות ספציפיות ומבוססות:**
   ✅ "Beat Ratio 83% עם magnitude ממוצע 143% מצביע על Backbone Executor"

5. **Investor Brief** - פסקה אחת של 3-4 משפטים שעונה:
   - מה החברה (X-Factor, Backbone)
   - מה ה-Verdict (איכות + טיימינג)
   - מה הסיכון העיקרי
   - מה כדאי לעשות לפרופיל

6. **שפת הפלט: עברית.** ערכי enum באנגלית.

7. **JSON בלבד.** ללא הקדמה.`;

const OUTPUT_SCHEMA = `{
  "overall_score": <0-100>,
  "overall_tier": "Outstanding" | "Excellent" | "Strong" | "Moderate" | "Weak" | "Poor",

  "recommendation": "Strong Buy" | "Buy" | "Hold" | "Trim" | "Sell",
  "recommendation_rationale_he": "<בעברית, 1-2 משפטים על הסיבה להמלצה>",
  "profile_fit_he": "<בעברית, כמה המניה הזו מתאימה לפרופיל הספציפי>",

  "investor_brief_he": "<בעברית, 3-4 משפטים תמציתיים שעונים: מה החברה, מה ה-Verdict, מה הסיכון, מה לעשות>",

  "top_reasons_to_consider": [
    "<בעברית, סיבה ספציפית מבוססת>"
  ],

  "top_concerns": [
    "<בעברית, חששות עיקריים>"
  ],

  "key_numbers_he": {
    "current_price": "<מחיר נוכחי>",
    "blended_target": "<יעד משולב>",
    "upside_pct": "<אחוז Upside ב-timeframe של הפרופיל>",
    "stop_loss": "<רמת Stop-Loss>",
    "position_size_pct": "<גודל פוזיציה מומלץ>"
  },

  "what_to_watch": [
    "<בעברית, 3-5 דברים לעקוב אחריהם בחודש הקרוב>"
  ]
}`;

/**
 * Compute the Investment Score (0-100) - the "BUY NOW" indicator.
 *
 * This is the answer to the user's question:
 *   "100 = drop everything and buy now, 0 = run away"
 *
 * It blends QUALITY (overall) with TIMING (speed) with UPSIDE POTENTIAL (RUC).
 *
 * Formula: 0.5 × Overall + 0.3 × Speed + 0.2 × RUC
 *
 * Interpretation:
 *   90-100: Exceptional - everything aligned (quality + timing + upside)
 *   75-89:  Excellent - strong opportunity right now
 *   60-74:  Good - worth considering, possibly with scaling-in
 *   45-59:  Mixed - some attractive, some concerning
 *   30-44:  Weak - quality OK but timing/upside poor
 *   0-29:   Poor - avoid
 */
function computeInvestmentScore({ overallScore, speedScore, rucScore }) {
  const score = Math.round(
    (overallScore || 0) * 0.5 +
    (speedScore || 0) * 0.3 +
    (rucScore || 0) * 0.2
  );

  let tier, description;
  if (score >= 85) {
    tier = 'Exceptional';
    description = 'יוצא מן הכלל - איכות + טיימינג + פוטנציאל מיושרים';
  } else if (score >= 70) {
    tier = 'Excellent';
    description = 'מצוין - הזדמנות אטרקטיבית';
  } else if (score >= 55) {
    tier = 'Good';
    description = 'טוב - שווה שיקול עם זהירות בכניסה';
  } else if (score >= 40) {
    tier = 'Mixed';
    description = 'מעורב - יתרונות וחסרונות מאוזנים';
  } else if (score >= 25) {
    tier = 'Weak';
    description = 'חלש - איכות סבירה אבל טיימינג/פוטנציאל בעייתיים';
  } else {
    tier = 'Poor';
    description = 'נמוך - להתרחק כרגע';
  }

  return {
    score,
    tier,
    description_he: description,
    breakdown: {
      from_overall_quality: Math.round(overallScore * 0.5 * 10) / 10,
      from_timing_speed: Math.round(speedScore * 0.3 * 10) / 10,
      from_upside_ruc: Math.round(rucScore * 0.2 * 10) / 10,
    },
  };
}

function buildUserMessage({ ticker, profile, currentPrice, layer1, layer2, layer3, layer4, beatRatio, s31, ruc, fourD }) {
  return `סנתז את הניתוח הבא לציון סופי + המלצה:

**TICKER:** ${ticker}
**PROFILE:** ${profile}
**CURRENT PRICE:** $${currentPrice || 'N/A'}
**TODAY:** ${new Date().toISOString().split('T')[0]}

**Layer 1 (Opportunity):**
- X-Factor: ${layer1.x_factor?.type} / ${layer1.x_factor?.verdict} / Durability: ${layer1.x_factor?.durability}
- Backbone: ${layer1.backbone?.tier}
- Type: ${layer1.type_classification}
- Lifecycle: ${layer1.lifecycle_stage}
- Potential Energy: ${layer1.potential_energy_summary}

**Layer 2 (Validation):**
- Confidence Score: ${layer2.confidence_score}/100 (${layer2.confidence_tier})
- Validation: ${layer2.validation_summary}

**Layer 3 (Timing):**
- Speed Score: ${layer3.speed_score}/100 (${layer3.speed_tier})
- Entry Strategy: ${layer3.entry_strategy?.type}
- Stop-Loss: $${layer3.risk_levels?.stop_loss_initial}
- First Target: $${layer3.risk_levels?.first_target}
- Second Target: $${layer3.risk_levels?.second_target}
- Timing: ${layer3.timing_summary}

**Layer 4 (Monitoring):**
- Thesis: ${layer4.thesis_statement}
- Thesis Confidence: ${layer4.thesis_confidence}/100
- Position Size: ${layer4.position_sizing?.recommended_pct_of_portfolio}%

**Beat Ratio:**
- Ratio 5Y: ${beatRatio.ratio_5y ? (beatRatio.ratio_5y * 100).toFixed(0) + '%' : 'N/A'}
- Category: ${beatRatio.category}
- Magnitude: ${beatRatio.avg_beat_magnitude_5y ? (beatRatio.avg_beat_magnitude_5y * 100).toFixed(0) + '%' : 'N/A'}

**S31 Protocol:**
- Total: ${s31.total_score}/10 → ${s31.allocation_band}

**RUC (Remaining Upside Capacity):**
- Score: ${ruc.ruc_score}/100 (${ruc.ruc_tier})
- Time-Bound Upside: ${ruc.time_bound_upside.time_bound_upside_pct}% in ${ruc.time_bound_upside.timeframe_months} months
- Blended Target: $${ruc.time_bound_upside.target_price_blended}

**4D Scores:**
- Yield: ${fourD.yield_score} / Speed: ${fourD.speed_score} / Duration: ${fourD.duration_score} / Confidence: ${fourD.confidence_score}
- Asymmetry Index: ${fourD.asymmetry_index} (${fourD.asymmetry_tier})

**המשימה:**

1. **חשב Overall Score 0-100** - שילוב משוקלל לפי הנוסחה:
   Overall = Confidence × 0.25 + Speed × 0.20 + RUC × 0.20 + (S31/10 × 100) × 0.15 + Asymmetry × 0.10 + ThesisConf × 0.10

2. **קבע Recommendation** לפי הלוגיקה.

3. **כתוב Investor Brief** - 3-4 משפטים תמציתיים.

4. **3-5 Top Reasons** - ספציפיים, מבוססים.

5. **2-4 Top Concerns**.

6. **What to Watch** - 3-5 דברים לחודש הקרוב.

החזר JSON תואם:
\`\`\`
${OUTPUT_SCHEMA}
\`\`\`

JSON בלבד. ללא הקדמה. ללא markdown fence.`;
}

export async function runFinalSynthesis({ ticker, profile, stockData, layer1, layer2, layer3, layer4, beatRatio, s31, ruc, fourD }) {
  if (!ticker || !profile || !layer1 || !layer2 || !layer3 || !layer4 || !beatRatio || !s31 || !ruc || !fourD) {
    throw new Error('runFinalSynthesis requires all prior outputs');
  }

  const currentPrice = stockData?.quote?.price;

  const userMessage = buildUserMessage({
    ticker, profile, currentPrice,
    layer1, layer2, layer3, layer4, beatRatio, s31, ruc, fourD,
  });

  const { json, usage } = await callClaudeForJson({
    model: MODELS.OPUS,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 4096,
    layerName: 'final-synthesis',
  });

  const required = ['overall_score', 'recommendation', 'investor_brief_he', 'top_reasons_to_consider'];
  const missing = required.filter(k => !(k in json));
  if (missing.length > 0) {
    throw new Error(`Final Synthesis output missing required fields: ${missing.join(', ')}`);
  }

  // ============================================================================
  // COMPUTE INVESTMENT SCORE (pure math, deterministic)
  // ============================================================================
  const investmentScore = computeInvestmentScore({
    overallScore: json.overall_score,
    speedScore: layer3.speed_score,
    rucScore: ruc.ruc_score,
  });

  return {
    ticker: ticker.toUpperCase(),
    profile,
    analyzed_at: new Date().toISOString(),
    model: MODELS.OPUS,

    // The key new field - the "buy now" indicator
    investment_score: investmentScore,

    ...json,
    usage,
  };
}
 *
 * Uses LLM (Opus) but with TIGHT context - all the math is already done.
 */

import { callClaudeForJson, MODELS } from './claude-client.js';

const SYSTEM_PROMPT = `אתה RealValueX™ Final Synthesizer.

תפקידך: לאחד את 4 השכבות, S31, RUC, ו-4D לתוך:
1. Overall Score (0-100) - הציון הסופי של המניה
2. Recommendation - מה לעשות (Strong Buy/Buy/Hold/Trim/Sell)
3. Investor Brief - פסקה אחת תמציתית בעברית
4. Top Reasons - 3-5 סיבות מבוססות

עקרונות יסוד:

1. **המערכת מציגה מידע, המשתמש מחליט.** אל תכתוב "אני ממליץ לקנות" אלא "הראיות תומכות ב-Buy לפרופיל G1".

2. **Overall Score נגזר מהמרכיבים:**
   - Confidence (Layer 2) - 25%
   - Speed (Layer 3) - 20%
   - RUC - 20%
   - S31 Total - 15%
   - 4D Asymmetry - 10%
   - Thesis Confidence (Layer 4) - 10%

   החישוב הוא משוקלל. ציון <50 = איכות נמוכה, 50-65 = בינוני, 65-80 = טוב, 80+ = יוצא מן הכלל.

3. **Recommendation נגזר משילוב של:**
   - Overall Score (איכות)
   - Speed Score (טיימינג)
   - Profile fit
   - Entry Strategy מ-Layer 3

   לוגיקה:
   - Overall 80+ + Speed 70+ + Entry FULL_NOW/SCALING_IN → Strong Buy
   - Overall 65+ + Speed 60+ + Entry SCALING_IN/WAIT_FOR_PULLBACK → Buy
   - Overall 65+ + Speed <50 + Entry WAIT_FOR_PULLBACK → Hold (חכה לכניסה)
   - Overall 50-65 → Hold
   - Overall <50 → Trim/Avoid
   - Type-specific: Type C מניות בשיא צריכים זהירות יתרה

4. **Top Reasons - חייבות להיות ספציפיות ומבוססות:**
   ❌ "החברה איכותית"
   ✅ "Beat Ratio 83% עם magnitude ממוצע 143% מצביע על Backbone Executor"

5. **Investor Brief** - פסקה אחת של 3-4 משפטים שעונה:
   - מה החברה (X-Factor, Backbone)
   - מה ה-Verdict (איכות + טיימינג)
   - מה הסיכון העיקרי
   - מה כדאי לעשות לפרופיל

6. **שפת הפלט: עברית.** ערכי enum באנגלית.

7. **JSON בלבד.** ללא הקדמה.`;

const OUTPUT_SCHEMA = `{
  "overall_score": <0-100>,
  "overall_tier": "Outstanding" | "Excellent" | "Strong" | "Moderate" | "Weak" | "Poor",

  "recommendation": "Strong Buy" | "Buy" | "Hold" | "Trim" | "Sell",
  "recommendation_rationale_he": "<בעברית, 1-2 משפטים על הסיבה להמלצה>",
  "profile_fit_he": "<בעברית, כמה המניה הזו מתאימה לפרופיל הספציפי>",

  "investor_brief_he": "<בעברית, 3-4 משפטים תמציתיים שעונים: מה החברה, מה ה-Verdict, מה הסיכון, מה לעשות>",

  "top_reasons_to_consider": [
    "<בעברית, סיבה ספציפית מבוססת>"
  ],

  "top_concerns": [
    "<בעברית, חששות עיקריים שהמשתמש צריך לדעת>"
  ],

  "key_numbers_he": {
    "current_price": "<מחיר נוכחי>",
    "blended_target": "<יעד משולב מ-Layer 3 + Consensus>",
    "upside_pct": "<אחוז Upside ב-timeframe של הפרופיל>",
    "stop_loss": "<רמת Stop-Loss מ-Layer 3>",
    "position_size_pct": "<גודל פוזיציה מומלץ מ-Layer 4>"
  },

  "what_to_watch": [
    "<בעברית, 3-5 דברים חשובים לעקוב אחריהם בחודש הקרוב>"
  ]
}`;

function buildUserMessage({ ticker, profile, currentPrice, layer1, layer2, layer3, layer4, beatRatio, s31, ruc, fourD }) {
  return `סנתז את הניתוח הבא לציון סופי + המלצה:

**TICKER:** ${ticker}
**PROFILE:** ${profile}
**CURRENT PRICE:** $${currentPrice || 'N/A'}
**TODAY:** ${new Date().toISOString().split('T')[0]}

**Layer 1 (Opportunity):**
- X-Factor: ${layer1.x_factor?.type} / ${layer1.x_factor?.verdict} / Durability: ${layer1.x_factor?.durability}
- Backbone: ${layer1.backbone?.tier}
- Type: ${layer1.type_classification}
- Lifecycle: ${layer1.lifecycle_stage}
- Potential Energy: ${layer1.potential_energy_summary}

**Layer 2 (Validation):**
- Confidence Score: ${layer2.confidence_score}/100 (${layer2.confidence_tier})
- Validation: ${layer2.validation_summary}

**Layer 3 (Timing):**
- Speed Score: ${layer3.speed_score}/100 (${layer3.speed_tier})
- Entry Strategy: ${layer3.entry_strategy?.type}
- Stop-Loss: $${layer3.risk_levels?.stop_loss_initial}
- First Target: $${layer3.risk_levels?.first_target}
- Second Target: $${layer3.risk_levels?.second_target}
- Timing: ${layer3.timing_summary}

**Layer 4 (Monitoring):**
- Thesis: ${layer4.thesis_statement}
- Thesis Confidence: ${layer4.thesis_confidence}/100
- Position Size: ${layer4.position_sizing?.recommended_pct_of_portfolio}%

**Beat Ratio:**
- Ratio 5Y: ${beatRatio.ratio_5y ? (beatRatio.ratio_5y * 100).toFixed(0) + '%' : 'N/A'}
- Category: ${beatRatio.category}
- Magnitude: ${beatRatio.avg_beat_magnitude_5y ? (beatRatio.avg_beat_magnitude_5y * 100).toFixed(0) + '%' : 'N/A'}

**S31 Protocol:**
- Fund: ${s31.fund_score}/4
- Mkt: ${s31.mkt_score}/4
- Narr: ${s31.narr_score}/2
- Total: ${s31.total_score}/10 → ${s31.allocation_band}

**RUC (Remaining Upside Capacity):**
- Score: ${ruc.ruc_score}/100 (${ruc.ruc_tier})
- Time-Bound Upside: ${ruc.time_bound_upside.time_bound_upside_pct}% in ${ruc.time_bound_upside.timeframe_months} months
- Blended Target: $${ruc.time_bound_upside.target_price_blended}

**4D Scores:**
- Yield: ${fourD.yield_score} / Speed: ${fourD.speed_score} / Duration: ${fourD.duration_score} / Confidence: ${fourD.confidence_score}
- Asymmetry Index: ${fourD.asymmetry_index} (${fourD.asymmetry_tier})

**המשימה:**

1. **חשב Overall Score 0-100** - שילוב משוקלל של כל המרכיבים לפי הנוסחה:
   Overall = Confidence × 0.25 + Speed × 0.20 + RUC × 0.20 + (S31/10 × 100) × 0.15 + Asymmetry × 0.10 + ThesisConf × 0.10

2. **קבע Recommendation** לפי הלוגיקה במערכת.

3. **כתוב Investor Brief** - 3-4 משפטים תמציתיים בעברית.

4. **3-5 Top Reasons** - ספציפיים, מבוססים על נתונים.

5. **2-4 Top Concerns** - מה צריך להפחיד.

6. **What to Watch** - 3-5 דברים חשובים לחודש הקרוב.

החזר JSON תואם:
\`\`\`
${OUTPUT_SCHEMA}
\`\`\`

JSON בלבד. ללא הקדמה. ללא markdown fence.`;
}

export async function runFinalSynthesis({ ticker, profile, stockData, layer1, layer2, layer3, layer4, beatRatio, s31, ruc, fourD }) {
  if (!ticker || !profile || !layer1 || !layer2 || !layer3 || !layer4 || !beatRatio || !s31 || !ruc || !fourD) {
    throw new Error('runFinalSynthesis requires all prior outputs');
  }

  const currentPrice = stockData?.quote?.price;

  const userMessage = buildUserMessage({
    ticker, profile, currentPrice,
    layer1, layer2, layer3, layer4, beatRatio, s31, ruc, fourD,
  });

  const { json, usage } = await callClaudeForJson({
    model: MODELS.OPUS,
    system: SYSTEM_PROMPT,
    userMessage,
    maxTokens: 4096,
    layerName: 'final-synthesis',
  });

  const required = ['overall_score', 'recommendation', 'investor_brief_he', 'top_reasons_to_consider'];
  const missing = required.filter(k => !(k in json));
  if (missing.length > 0) {
    throw new Error(`Final Synthesis output missing required fields: ${missing.join(', ')}`);
  }

  return {
    ticker: ticker.toUpperCase(),
    profile,
    analyzed_at: new Date().toISOString(),
    model: MODELS.OPUS,
    ...json,
    usage,
  };
}
