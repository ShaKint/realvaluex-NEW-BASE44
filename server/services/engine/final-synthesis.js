import { callClaudeForJson, MODELS } from './claude-client.js';

const SYSTEM_PROMPT = `אתה RealValueX Final Synthesizer.

תפקידך: לאחד את 4 השכבות, S31, RUC, ו-4D לתוך:
1. Overall Score (0-100) - ציון איכות כולל
2. Recommendation - Strong Buy/Buy/Hold/Trim/Sell
3. Investor Brief - פסקה תמציתית בעברית
4. Top Reasons - 3-5 סיבות

עקרונות:

1. המערכת מציגה מידע, המשתמש מחליט. אל תכתוב "אני ממליץ" אלא "הראיות תומכות".

2. Overall Score נגזר מ:
   - Confidence (Layer 2) - 25%
   - Speed (Layer 3) - 20%
   - RUC - 20%
   - S31 Total - 15%
   - 4D Asymmetry - 10%
   - Thesis Confidence (Layer 4) - 10%

3. Recommendation לפי לוגיקה:
   - Overall 80+ + Speed 70+ + Entry FULL_NOW/SCALING_IN -> Strong Buy
   - Overall 65+ + Speed 60+ + Entry SCALING_IN/WAIT_FOR_PULLBACK -> Buy
   - Overall 65+ + Speed <50 + Entry WAIT_FOR_PULLBACK -> Hold
   - Overall 50-65 -> Hold
   - Overall <50 -> Trim/Avoid

4. Top Reasons - ספציפיות:
   GOOD: "Beat Ratio 83% עם magnitude ממוצע 143% מצביע על Backbone Executor"

5. Investor Brief - 3-4 משפטים שעונים: מה החברה, מה ה-Verdict, מה הסיכון, מה לעשות

6. שפת הפלט: עברית. ערכי enum באנגלית.

7. JSON בלבד. ללא הקדמה.`;

const OUTPUT_SCHEMA = `{
  "overall_score": <0-100>,
  "overall_tier": "Outstanding" | "Excellent" | "Strong" | "Moderate" | "Weak" | "Poor",
  "recommendation": "Strong Buy" | "Buy" | "Hold" | "Trim" | "Sell",
  "recommendation_rationale_he": "<בעברית>",
  "profile_fit_he": "<בעברית>",
  "investor_brief_he": "<בעברית, 3-4 משפטים>",
  "top_reasons_to_consider": ["<בעברית>"],
  "top_concerns": ["<בעברית>"],
  "key_numbers_he": {
    "current_price": "<מחיר נוכחי>",
    "blended_target": "<יעד משולב>",
    "upside_pct": "<אחוז Upside>",
    "stop_loss": "<Stop-Loss>",
    "position_size_pct": "<גודל פוזיציה>"
  },
  "what_to_watch": ["<בעברית>"]
}`;

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
    description = 'חלש - איכות סבירה אבל טיימינג בעייתי';
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
  return `סנתז את הניתוח:

TICKER: ${ticker}
PROFILE: ${profile}
CURRENT PRICE: $${currentPrice || 'N/A'}
TODAY: ${new Date().toISOString().split('T')[0]}

Layer 1 (Opportunity):
- X-Factor: ${layer1.x_factor?.type} / ${layer1.x_factor?.verdict}
- Backbone: ${layer1.backbone?.tier}
- Type: ${layer1.type_classification}
- Lifecycle: ${layer1.lifecycle_stage}

Layer 2 (Validation):
- Confidence: ${layer2.confidence_score}/100 (${layer2.confidence_tier})

Layer 3 (Timing):
- Speed: ${layer3.speed_score}/100 (${layer3.speed_tier})
- Entry: ${layer3.entry_strategy?.type}
- Stop-Loss: $${layer3.risk_levels?.stop_loss_initial}
- Target 1: $${layer3.risk_levels?.first_target}

Layer 4 (Monitoring):
- Thesis: ${layer4.thesis_statement}
- Thesis Confidence: ${layer4.thesis_confidence}/100

Beat Ratio: ${beatRatio.ratio_5y ? (beatRatio.ratio_5y * 100).toFixed(0) + '%' : 'N/A'} (${beatRatio.category})

S31: ${s31.total_score}/10 -> ${s31.allocation_band}

RUC: ${ruc.ruc_score}/100 - upside ${ruc.time_bound_upside.time_bound_upside_pct}% in ${ruc.time_bound_upside.timeframe_months} months

4D: Y${fourD.yield_score} S${fourD.speed_score} D${fourD.duration_score} C${fourD.confidence_score} | Asymmetry ${fourD.asymmetry_index}

המשימה:
1. חשב Overall Score 0-100
2. קבע Recommendation
3. כתוב Investor Brief - 3-4 משפטים
4. 3-5 Top Reasons ספציפיות
5. 2-4 Top Concerns
6. What to Watch - 3-5 דברים

החזר JSON בלבד:
\`\`\`
${OUTPUT_SCHEMA}
\`\`\``;
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
    investment_score: investmentScore,
    ...json,
    usage,
  };
}
