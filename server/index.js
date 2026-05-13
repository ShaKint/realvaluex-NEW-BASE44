**להוסיף קובץ חדש: `server/index.js`**

ב-GitHub: Add file → Create new file → שם: `server/index.js`

תוכן:

```js
// server/index.js
// RealValueX Backend Service - runs on Railway
// Replaces: base44/functions/valuationEngine/entry.ts + all base44.integrations.Core.InvokeLLM calls

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

import valuationRouter from './routes/valuation.js';
import scannerRouter from './routes/scanner.js';
import newsRouter from './routes/news.js';
import marketNewsRouter from './routes/market-news.js';

const app = express();
app.use(cors({
  origin: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ── Auth middleware: verify Supabase JWT ────────────────────────────────
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

    req.user = data.user;
    next();
  } catch (e) {
    res.status(401).json({ error: e.message });
  }
}

// ── Routes ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/valuation', requireAuth, valuationRouter);
app.use('/api/scanner', requireAuth, scannerRouter);
app.use('/api/news', requireAuth, newsRouter);
app.use('/api/market-news', requireAuth, marketNewsRouter);

// ── Start ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[RealValueX backend] listening on :${PORT}`);
});
```
