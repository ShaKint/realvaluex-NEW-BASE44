import { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Newspaper, ExternalLink, RefreshCw } from 'lucide-react';

const INITIAL_NEWS = [
  { time: '14:32', title_he: 'Fed שומר על ריבית — שוק מגיב בעליות', title_en: 'Fed holds rates steady — markets rally in response', source: 'Reuters', impact: 'positive' },
  { time: '12:15', title_he: 'NVIDIA מכריזה על שבב AI חדש — מניה זינקה 4%', title_en: 'NVIDIA announces new AI chip — stock jumps 4%', source: 'Bloomberg', impact: 'positive' },
  { time: '10:48', title_he: 'אפל מציגה רווחים מעל תחזיות הרבעון השלישי', title_en: 'Apple beats Q3 earnings estimates across the board', source: 'CNBC', impact: 'positive' },
  { time: '09:20', title_he: 'ירידות בשוק הנדל"ן האמריקאי — מכירות בית נמוכות מהצפוי', title_en: 'US housing market sees lower-than-expected home sales', source: 'WSJ', impact: 'negative' },
];

const impactDot = { positive: 'bg-emerald-400', negative: 'bg-rose-400', neutral: 'bg-white/30' };

export default function MarketNews() {
  const { lang } = useLang();
  const [news, setNews] = useState(INITIAL_NEWS);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    setLoading(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate 4 realistic financial market news headlines for today. 
      These should be different from: ${news.map(n => n.title_en).join(', ')}.
      Mix of positive, negative, and neutral market news about stocks, economy, tech, crypto, and global markets.
      Return as JSON array.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title_en: { type: 'string' },
                title_he: { type: 'string' },
                source: { type: 'string' },
                impact: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                time: { type: 'string' }
              }
            }
          }
        }
      }
    });
    if (result?.items?.length) {
      setNews(prev => [...prev, ...result.items]);
    }
    setLoading(false);
  };

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white">{lang === 'he' ? 'חדשות שוק' : 'Market News'}</span>
        </div>
      </div>

      <div className="space-y-3">
        {news.map((item, i) => (
          <div key={i} className="flex items-start gap-3 group cursor-pointer">
            <div className="flex flex-col items-center gap-1 mt-1 flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${impactDot[item.impact] || impactDot.neutral}`} />
              {i < news.length - 1 && <div className="w-px h-6 bg-white/10" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white/80 text-sm leading-snug group-hover:text-white transition-colors">
                {lang === 'he' ? item.title_he : item.title_en}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white/25 text-xs">{item.time}</span>
                <span className="text-white/20 text-xs">·</span>
                <span className="text-white/25 text-xs">{item.source}</span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0 mt-1" />
          </div>
        ))}
      </div>

      <button
        onClick={loadMore}
        disabled={loading}
        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        {loading ? (lang === 'he' ? 'טוען...' : 'Loading...') : (lang === 'he' ? 'טען עוד חדשות' : 'Load more news')}
      </button>
    </div>
  );
}