import { useLang } from '@/lib/LanguageContext';
import { TrendingUp, ChevronRight, ChevronLeft, Zap } from 'lucide-react';

const OPPORTUNITIES = [
  {
    ticker: 'MSFT',
    name: 'Microsoft',
    sector: 'Technology',
    price: '415.20',
    upside: '+18%',
    score: 92,
    tag: 'A',
  },
  {
    ticker: 'JNJ',
    name: 'Johnson & Johnson',
    sector: 'Healthcare',
    price: '152.80',
    upside: '+22%',
    score: 88,
    tag: 'A',
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet',
    sector: 'Technology',
    price: '175.40',
    upside: '+15%',
    score: 85,
    tag: 'B',
  },
  {
    ticker: 'BRK.B',
    name: 'Berkshire Hathaway',
    sector: 'Finance',
    price: '408.90',
    upside: '+12%',
    score: 83,
    tag: 'A',
  },
];

const scoreColor = (s) => s >= 90 ? 'text-emerald-400' : s >= 80 ? 'text-indigo-400' : 'text-amber-400';
const tagColor = (tag) => tag === 'A' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300';

export default function TopOpportunities() {
  const { lang, isRTL } = useLang();
  const ArrowIcon = isRTL ? ChevronLeft : ChevronRight;

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-white">{lang === 'he' ? 'הזדמנויות מובילות' : 'Top Opportunities'}</span>
        </div>
        <a href="/opportunities" className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
          {lang === 'he' ? 'הכל' : 'See all'} <ArrowIcon className="w-3 h-3" />
        </a>
      </div>

      <div className="space-y-3">
        {OPPORTUNITIES.map((opp) => (
          <div key={opp.ticker} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-all cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-300">{opp.ticker.slice(0, 2)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">{opp.ticker}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${tagColor(opp.tag)}`}>{opp.tag}</span>
              </div>
              <div className="text-white/35 text-xs truncate">{opp.name}</div>
            </div>
            <div className="text-end flex-shrink-0">
              <div className="text-white text-sm font-medium">${opp.price}</div>
              <div className="text-emerald-400 text-xs font-medium flex items-center gap-0.5 justify-end">
                <TrendingUp className="w-3 h-3" />
                {opp.upside}
              </div>
            </div>
            <div className={`text-lg font-bold ${scoreColor(opp.score)} w-8 text-center flex-shrink-0`}>
              {opp.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}