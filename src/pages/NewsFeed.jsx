import { useState, useEffect } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Newspaper, RefreshCw, ExternalLink, TrendingUp, TrendingDown, Minus, Bookmark, Globe, Zap } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const CATEGORIES = {
  he: [
    { key: 'all', label: 'הכל' },
    { key: 'macro', label: 'מאקרו' },
    { key: 'earnings', label: 'דוחות' },
    { key: 'tech', label: 'טכנולוגיה' },
    { key: 'fed', label: 'פד / ריבית' },
    { key: 'crypto', label: 'קריפטו' },
    { key: 'geopolitical', label: 'גיאופוליטי' },
  ],
  en: [
    { key: 'all', label: 'All' },
    { key: 'macro', label: 'Macro' },
    { key: 'earnings', label: 'Earnings' },
    { key: 'tech', label: 'Technology' },
    { key: 'fed', label: 'Fed / Rates' },
    { key: 'crypto', label: 'Crypto' },
    { key: 'geopolitical', label: 'Geopolitical' },
  ],
};

const IMPACT_COLORS = {
  bullish: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  bearish: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  neutral: 'bg-white/5 text-white/40 border-white/10',
};

const ImpactIcon = ({ impact }) => {
  if (impact === 'bullish') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (impact === 'bearish') return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-white/30" />;
};

export default function NewsFeed() {
  const { lang } = useLang();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [category, setCategory] = useState('all');
  const [saved, setSaved] = useState([]);

  const fetchNews = async (prof) => {
    setLoading(true);
    const sectors = prof?.preferred_sectors?.join(', ') || 'technology, finance, energy';
    const markets = prof?.active_markets?.join(', ') || 'US markets';
    const style = prof?.investing_styles?.join(', ') || 'fundamental';

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a financial news curator for an investment platform. Generate 16 realistic, varied financial news items from today (${new Date().toDateString()}).

User profile:
- Preferred sectors: ${sectors}
- Active markets: ${markets}
- Investment style: ${style}

Mix: macro news, earnings reports, sector news, Fed/rates news.
Vary the market impact (bullish/bearish/neutral).
Make them realistic and informative.
Include Hebrew translation for each headline if the article is significant.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          news: {
            type: 'array',
            items: {
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
              }
            }
          }
        }
      }
    });

    setNews(res?.news || []);
    setLoading(false);
  };

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) {
        base44.entities.UserProfile.filter({ user_id: u.id }).then(profiles => {
          const prof = profiles?.[0] || null;
          setProfile(prof);
          fetchNews(prof);
        });
      } else {
        fetchNews(null);
      }
    });
  }, []);

  const filtered = category === 'all' ? news : news.filter(n => n.category === category);
  const toggleSave = (id) => setSaved(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{lang === 'he' ? 'פיד חדשות' : 'Market News'}</h1>
              <p className="text-white/35 text-xs">
                {lang === 'he' ? 'חדשות מותאמות לפרופיל שלך' : 'Personalized to your profile'}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchNews(profile)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:block">{lang === 'he' ? 'רענן' : 'Refresh'}</span>
          </button>
        </div>

        {/* Profile tag */}
        {profile && (
          <div className="flex items-center gap-2 text-xs text-white/25">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span>
              {lang === 'he'
                ? `מותאם לפרופיל: ${profile.preferred_sectors?.slice(0, 3).join(', ') || 'כללי'}`
                : `Personalized for: ${profile.preferred_sectors?.slice(0, 3).join(', ') || 'General'}`}
            </span>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES[lang].map(cat => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${category === cat.key ? 'bg-violet-600 border-violet-500 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/25'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="relative w-12 h-12 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
              <Globe className="absolute inset-0 m-auto w-5 h-5 text-violet-400" />
            </div>
            <div className="text-white/40 text-sm">{lang === 'he' ? 'מאסף חדשות מהאינטרנט...' : 'Fetching news from the web...'}</div>
          </div>
        )}

        {/* News Grid */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {/* Featured */}
            {filtered[0] && (
              <div className={`p-5 rounded-2xl border ${IMPACT_COLORS[filtered[0].impact] || 'bg-white/5 border-white/5'} relative`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <ImpactIcon impact={filtered[0].impact} />
                      <span className="text-xs text-white/30 uppercase tracking-wider">{filtered[0].category}</span>
                      <span className="text-xs text-white/20">·</span>
                      <span className="text-xs text-white/30">{filtered[0].source}</span>
                      <span className="text-xs text-white/20">{filtered[0].time_ago}</span>
                    </div>
                    <h2 className="font-bold text-white text-base leading-snug mb-2">
                      {lang === 'he' && filtered[0].headline_he ? filtered[0].headline_he : filtered[0].headline}
                    </h2>
                    <p className="text-white/45 text-sm leading-relaxed">
                      {lang === 'he' && filtered[0].summary_he ? filtered[0].summary_he : filtered[0].summary}
                    </p>
                    {filtered[0].tickers?.length > 0 && (
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        {filtered[0].tickers.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded-lg bg-white/10 text-white/60 text-xs font-mono">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggleSave(filtered[0].id)} className={`transition-colors ${saved.includes(filtered[0].id) ? 'text-violet-400' : 'text-white/20 hover:text-white/50'}`}>
                    <Bookmark className="w-4 h-4" fill={saved.includes(filtered[0].id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            )}

            {/* Rest */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.slice(1).map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <ImpactIcon impact={item.impact} />
                      <span className="text-xs text-white/25 uppercase">{item.category}</span>
                    </div>
                    <button onClick={() => toggleSave(item.id)} className={`transition-colors flex-shrink-0 ${saved.includes(item.id) ? 'text-violet-400' : 'text-white/15 hover:text-white/40'}`}>
                      <Bookmark className="w-3.5 h-3.5" fill={saved.includes(item.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="font-semibold text-white text-sm leading-snug mb-1">
                    {lang === 'he' && item.headline_he ? item.headline_he : item.headline}
                  </div>
                  <div className="text-white/35 text-xs leading-relaxed line-clamp-2">
                    {lang === 'he' && item.summary_he ? item.summary_he : item.summary}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-white/20 text-xs">{item.source} · {item.time_ago}</div>
                    {item.tickers?.length > 0 && (
                      <div className="flex gap-1">
                        {item.tickers.slice(0, 2).map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-xs font-mono">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && filtered.length === 0 && news.length > 0 && (
          <div className="text-center py-12 text-white/30 text-sm">
            {lang === 'he' ? 'אין חדשות בקטגוריה זו' : 'No news in this category'}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}