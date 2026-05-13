// server/index.js
// RealValueX Backend Service - runs on Railway

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

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const anthropic = new Anth
