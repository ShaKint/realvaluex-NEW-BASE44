// server/routes/scanner.js

import { Router } from 'express';
import { anthropic } from '../index.js';

const router = Router();

const STOCK_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    ticker: { type: 'string' },
    company: { type: 'string' },
    sector: { type: 'string' },
    price: { type: 'number' },
    pe_ratio: { type: 'number' },
    upside_potential: { type: 'number' },
    market_cap_b: { type: 'number' },
    revenue_growth: { type: 'number' },
    dividend_yield: { type: 'number' },
    score: { type: 'number' },
    strategy_fit: { type: 'string' },
    one_liner: { type: 'string' },
    one_liner_he: { type: 'string' },
    trend: { type: 'string', enum: ['up', 'down', 'flat'] },
    rationale: { type: 'string' },
    rationale_he: { type: 'string' },
    earnings_track: { type: 'string' },
    analyst_target: { type: 'number' },
    analyst_consensus: { type: 'string' },
    tam_growth: { type: 'string' },
    key_catalysts: { type: 'array', items: { type: 'string' } },
    key_risks: { type: 'array', items: { type: 'string' } },
  },
};

const SCAN_SCHEMA = {
  type: 'object',
  properties: { stocks: { type: 'array', items: STOCK_ITEM_SCHEMA } },
  required: ['stocks'],
};

router.post('/', async (req, res) => {
  try {
    const { filters = {}, lang = 'en' } = req.body || {};
    const hebrewBlock = lang === 'he'
      ? ' IMPORTANT: Write ALL text fields (one_liner_he, rationale_he, strategy_fit, earnings_track, tam_growth, analyst_consensus, key_catalysts, key_risks) in Hebrew. Numbers and tickers remain in English.'
      : '';

    const prompt = `You are a stock screener AI for the RealValueX platform.${hebrewBlock}

Generate a realistic list of 12 stocks matching these filters:
- Sector: ${filters.sector === 'all' ? 'any sector' : filters.sector}
- Strategy: ${filters.strategy || 'any'}
- Market Cap: ${filters.marketCap}
- Max P/E: ${filters.maxPE || 'no limit'}
- Min P/E: ${filters.minPE || 'no limit'}
- Min Upside: ${filters.minUpside || '0'}%

Return realistic stock data with tickers from US markets (NYSE/NASDAQ). Each stock should genuinely fit the filters. Use real companies. Vary the results.

For each stock, provide a detailed rationale explaining WHY it matches the strategy, including:
- Market/industry TAM growth projections and trends
- Historical earnings beats/misses track record
- Analyst consensus and price targets
- Key financial metrics driving the thesis (revenue growth rate, margins, FCF)
- Specific catalysts that could unlock value
- Notable risks to the thesis`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      tools: [{
        name: 'return_scan_results',
        description: 'Return the scanned stock list',
        input_schema: SCAN_SCHEMA,
      }],
      tool_choice: { type: 'tool', name: 'return_scan_results' },
      messages: [{ role: 'user', content: prompt }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    res.json(toolUse?.input ?? { stocks: [] });
  } catch (error) {
    console.error('[scanner] error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
