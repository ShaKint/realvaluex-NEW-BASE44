// server/routes/market-news.js
// Replaces: base44.integrations.Core.InvokeLLM in src/components/dashboard/MarketNews.jsx

import { Router } from 'express';
import { anthropic } from '../index.js';

const router = Router();

const ITEM = {
  type: 'object',
  properties: {
    title_en: { type: 'string' },
    title_he: { type: 'string' },
    source: { type: 'string' },
    impact: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
    time: { type: 'string' },
  },
};

const SCHEMA = {
  type: 'object',
  properties: { items: { type: 'array', items: ITEM } },
  required: ['items'],
};

router.post('/', async (req, res) => {
  try {
    const { existing = [] } = req.body || {};
    const excludeList = existing.map(t => `"${t}"`).join(', ');

    const prompt = `Generate 4 realistic financial market news headlines for today.
These should be different from: ${excludeList || 'none'}.
Mix of positive, negative, and neutral market news about stocks, economy, tech, crypto, and global markets.
Include both English (title_en) and Hebrew (title_he) versions.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      tools: [
        { type: 'web_search_20250305', name: 'web_search' },
        {
          name: 'return_market_news',
          description: 'Return market news headlines',
          input_schema: SCHEMA,
        },
      ],
      messages: [{ role: 'user', content: prompt }],
    });

    const tool = [...response.content].reverse().find(
      b => b.type === 'tool_use' && b.name === 'return_market_news'
    );
    res.json(tool?.input ?? { items: [] });
  } catch (error) {
    console.error('[market-news] error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
