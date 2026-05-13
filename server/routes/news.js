// server/routes/news.js

import { Router } from 'express';
import { anthropic } from '../index.js';

const router = Router();

const NEWS_ITEM = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    headline: { type: 'string' },
    headline_he: { type: 'string' },
    summary: { type: 'string' },
    summary_he: { type: 'string' },
    source: { type: 'string' },
    category: { type: 'string', enum: ['macro', 'earnings', 'tech', 'fed', 'crypto', 'geopolitical'] },
    impact: { type: 'string', enum: ['bullish', 'bearish', 'neutral'] },
    tickers: { type: 'array', items: { type: 'string' } },
    time_ago: { type: 'string' },
    relevance_score: { type: 'number' },
  },
};

const NEWS_SCHEMA = {
  type: 'object',
  properties: { news: { type: 'array', items: NEWS_ITEM } },
  required: ['news'],
};

router.post('/', async (req, res) => {
  try {
    const { profile, lang = 'en' } = req.body || {};
    const sectors = profile?.preferred_sectors?.join(', ') || 'technology, finance, energy';
    const markets = profile?.active_markets?.join(', ') || 'US markets';
    const style = profile?.investing_styles?.join(', ') || 'fundamental';

    const prompt = `You are a financial news curator for an investment platform. Use web search to fetch real news from today (${new Date().toDateString()}), then return 16 curated items.

User profile:
- Preferred sectors: ${sectors}
- Active markets: ${markets}
- Investment style: ${style}

Mix: macro news, earnings reports, sector news, Fed/rates news.
Vary the market impact (bullish/bearish/neutral).
Include Hebrew translation (headline_he, summary_he) for each item.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      tools: [
        { type: 'web_search_20250305', name: 'web_search' },
        {
          name: 'return_news',
          description: 'Return the curated news list',
          input_schema: NEWS_SCHEMA,
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    });

    const newsToolUse = [...response.content].reverse().find(
      b => b.type === 'tool_use' && b.name === 'return_news'
    );
    res.json(newsToolUse?.input ?? { news: [] });
  } catch (error) {
    console.error('[news] error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
