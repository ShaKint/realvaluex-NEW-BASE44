// src/lib/api-client.js
// Frontend API client - calls the Railway backend service.
// Replaces all base44.integrations.Core.InvokeLLM and base44.functions.invoke calls.

import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function authedFetch(path, body) {
  // Attach the current Supabase JWT so the backend can verify the user
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

// ── Endpoints ──────────────────────────────────────────────────────────

// Replaces: base44.functions.invoke('valuationEngine', ...)
export const runValuation = ({ ticker, financials, lang }) =>
  authedFetch('/api/valuation', { ticker, financials, lang });

// Replaces: base44.integrations.Core.InvokeLLM in Scanner.jsx
export const runScanner = ({ filters, lang }) =>
  authedFetch('/api/scanner', { filters, lang });

// Replaces: base44.integrations.Core.InvokeLLM in NewsFeed.jsx
export const fetchPersonalizedNews = ({ profile, lang }) =>
  authedFetch('/api/news', { profile, lang });

// Replaces: base44.integrations.Core.InvokeLLM in MarketNews.jsx
export const fetchMarketNews = ({ existing, lang }) =>
  authedFetch('/api/market-news', { existing, lang });
