// server/routes/valuation.js

import { Router } from 'express';
import { anthropic } from '../index.js';

const router = Router();

const VALUATION_SCHEMA = {
  type: 'object',
  properties: {
    company_summary: { type: 'string' },
    business_stage: { type: 'string' },
    x_factor: { type: 'string' },
    x_factor_verdict: { type: 'string' },
    moat_durability: { type: 'string' },
    type_classification: { type: 'string' },
    dcf: {
      type: 'object',
      properties: {
        intrinsic_value: { type: 'number' },
        assumptions: {
          type: 'object',
          properties: {
            revenue_growth_rate: { type: 'number' },
            ebit_margin: { type: 'number' },
            terminal_growth_rate: { type: 'number' },
            discount_rate: { type: 'number' },
          },
        },
        explanation: { type: 'string' },
      },
    },
    pe_valuation: {
      type: 'object',
      properties: {
        fair_value: { type: 'number' },
        sector_avg_pe: { type: 'number' },
        company_pe: { type: 'number' },
        explanation: { type: 'string' },
      },
    },
    graham_number: {
      type: 'object',
      properties: {
        value: { type: 'number' },
        eps: { type: 'number' },
        book_value_per_share: { type: 'number' },
        explanation: { type: 'string' },
      },
    },
    consensus_value: { type: 'number' },
    current_price_estimate: { type: 'number' },
    upside_pct: { type: 'number' },
    analyst_target_avg: { type: 'number' },
    analyst_consensus: { type: 'string' },
    analyst_count: { type: 'number' },
    earnings_track_record: { type: 'string' },
    revenue_3yr_trend: { type: 'string' },
    gross_margin_trend: { type: 'string' },
    tam_size: { type: 'string' },
    market_share: { type: 'string' },
    institutional_ownership: { type: 'string' },
    insider_activity: { type: 'string' },
    management_execution_score: { type: 'string' },
    geopolitical_risk: { type: 'string' },
    technical_levels: { type: 'string' },
    historical_cagr: { type: 'string' },
    return_forecast: {
      type: 'object',
      properties: {
        bear_1yr: { type: 'number' },
        base_1yr: { type: 'number' },
        bull_1yr: { type: 'number' },
        cagr_5yr: { type: 'number' },
        cagr_10yr: { type: 'number' },
      },
    },
    ruc_score: { type: 'number' },
    s31_score: { type: 'number' },
    bubble_risk: { type: 'string' },
    thesis_rationale: { type: 'string' },
    classification: { type: 'string' },
    classification_rationale: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
    catalysts: { type: 'array', items: { type: 'string' } },
    recommendation: { type: 'string' },
    confidence: { type: 'number' },
    allocation_recommendation: { type: 'string' },
  },
  required: ['company_summary', 'classification', 'recommendation'],
};

router.post('/', async (req, res) => {
  try {
    const { ticker, company_name, financials, lang } = req.body || {};
    if (!ticker) return res.status(400).json({ error: 'ticker required' });

    const isHebrew = lang === 'he';
    const langInstruction = isHebrew
      ? 'IMPORTANT: Write ALL text fields in Hebrew. Use Hebrew financial terminology. Numbers and tickers remain in English.'
      : 'Write all text fields in English.';

    const prompt = `You are RealValueX v3.0 - an elite equity analyst using a rigorous 4-layer, 36-chapter stock analysis model. Analyze: ${ticker} (${company_name || ticker}).

${langInstruction}

User-provided financials (supplement with your knowledge if empty): ${JSON.stringify(financials || {})}

Apply the full RealValueX framework across all 4 layers:

LAYER 1 - Opportunity Engine: X-Factor, Moat Durability, Product Stage, Innovation Momentum
LAYER 2 - Validation Engine: Fundamentals (3yr revenue/EPS/margins trend), ARR/SaaS metrics if relevant, Competition & Market Share, Institutional holders, Management Execution DNA, Geopolitical Risk, Sentiment
LAYER 3 - Timing & Allocation Engine: Historical pricing vs 1/3/5/10yr averages, Technical levels (MA50/MA200/RSI), Valuation multiples vs sector peers, DCF + P/E + Graham Number, CAGR forecast 1/5/10/20yr, Bear/Base/Bull scenarios
LAYER 4 - Monitoring & Decision Engine: Bubble Risk, Capital Allocation recommendation, Thesis Integrity, RUC score, S31 Protocol score, TYPE classification (A/B/C)

Cross-reference: analyst consensus targets, earnings beat/miss history (last 8 quarters), TAM size & CAGR, sector momentum, macro tailwinds/headwinds, insider activity.

Be DATA-DRIVEN and SPECIFIC: use real numbers, percentages, historical stats, analyst estimates. If exact data is unavailable, use well-reasoned estimates and state assumptions clearly.

Return the analysis as a single JSON object using the provided tool.`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      tools: [{
        name: 'return_valuation',
        description: 'Return the full RealValueX valuation analysis',
        input_schema: VALUATION_SCHEMA,
      }],
      tool_choice: { type: 'tool', name: 'return_valuation' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) return res.status(500).json({ error: 'No tool_use in response' });

    res.json({ valuation: toolUse.input });
  } catch (error) {
    console.error('[valuation] error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
