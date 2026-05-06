import { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { ScanSearch, Filter, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DashboardLayout from '@/components/layout/DashboardLayout';

const SECTORS = {
  he: ['הכל', 'טכנולוגיה', 'בריאות', 'פיננסים', 'אנרגיה', 'צרכנות', 'תעשייה', 'נדל"ן'],
  en: ['All', 'Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial', 'Real Estate'],
};
const SECTOR_VALS = ['all', 'tech', 'healthcare', 'finance', 'energy', 'consumer', 'industrial', 'realestate'];

const STRATEGIES = {
  he: [
    { key: 'value', label: 'Value Investing', desc: 'P/E נמוך, מחיר מתחת לשווי פנימי', icon: '💎' },
    { key: 'growth', label: 'Growth', desc: 'צמיחת הכנסות גבוהה, שוק מתרחב', icon: '🚀' },
    { key: 'dividend', label: 'דיבידנד', desc: 'תשואת דיבידנד גבוהה ויציבה', icon: '💰' },
    { key: 'momentum', label: 'מומנטום', desc: 'מניות חזקות עם מגמה עולה', icon: '⚡' },
    { key: 'turnaround', label: 'Turnaround', desc: 'מניות מדוכאות עם קטליזטור', icon: '🔄' },
  ],
  en: [
    { key: 'value', label: 'Value Investing', desc: 'Low P/E, price below intrinsic value', icon: '💎' },
    { key: 'growth', label: 'Growth', desc: 'High revenue growth, expanding market', icon: '🚀' },
    { key: 'dividend', label: 'Dividend', desc: 'High & stable dividend yield', icon: '💰' },
    { key: 'momentum', label: 'Momentum', desc: 'Strong stocks with upward trend', icon: '⚡' },
    { key: 'turnaround', label: 'Turnaround', desc: 'Depressed stocks with a catalyst', icon: '🔄' },
  ],
};

const MARKET_CAPS = {
  he: [{ key: 'all', label: 'הכל' }, { key: 'large', label: 'Large Cap (>$10B)' }, { key: 'mid', label: 'Mid Cap ($2B-$10B)' }, { key: 'small', label: 'Small Cap (<$2B)' }],
  en: [{ key: 'all', label: 'All' }, { key: 'large', label: 'Large Cap (>$10B)' }, { key: 'mid', label: 'Mid Cap ($2B-$10B)' }, { key: 'small', label: 'Small Cap (<$2B)' }],
};

export default function Scanner() {
  const { lang, isRTL } = useLang();
  const [filters, setFilters] = useState({ sector: 'all', strategy: '', marketCap: 'all', minPE: '', maxPE: '', minUpside: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortBy, setSortBy] = useState('upside');
  const [sortDir, setSortDir] = useState('desc');

  const handleScan = async () => {
    setLoading(true);
    setScanned(false);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a stock screener AI for the RealValueX™ platform. Generate a realistic list of 12 stocks matching these filters:
- Sector: ${filters.sector === 'all' ? 'any sector' : filters.sector}
- Strategy: ${filters.strategy || 'any'}
- Market Cap: ${filters.marketCap}
- Max P/E: ${filters.maxPE || 'no limit'}
- Min P/E: ${filters.minPE || 'no limit'}
- Min Upside: ${filters.minUpside || '0'}%

Return realistic stock data with tickers from US markets (NYSE/NASDAQ). Each stock should genuinely fit the filters.
Use real companies. Vary the results - don't always pick the same stocks.`,
      response_json_schema: {
        type: 'object',
        properties: {
          stocks: {
            type: 'array',
            items: {
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
              }
            }
          }
        }
      }
    });
    const stocks = res?.stocks || [];
    setResults(stocks);
    setLoading(false);
    setScanned(true);
  };

  const sorted = [...results].sort((a, b) => {
    const v = sortDir === 'desc' ? -1 : 1;
    if (sortBy === 'upside') return v * ((a.upside_potential || 0) - (b.upside_potential || 0));
    if (sortBy === 'pe') return v * ((a.pe_ratio || 0) - (b.pe_ratio || 0));
    if (sortBy === 'score') return v * ((a.score || 0) - (b.score || 0));
    return 0;
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const TrendIcon = ({ trend }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-rose-400" />;
    return <Minus className="w-4 h-4 text-white/30" />;
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <ScanSearch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{lang === 'he' ? 'סורק מניות' : 'Stock Scanner'}</h1>
            <p className="text-white/35 text-xs">{lang === 'he' ? 'חיפוש לפי פילטרים חכמים' : 'AI-powered stock screener'}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-5">
          {/* Strategy */}
          <div>
            <div className="text-white/50 text-xs mb-2">{lang === 'he' ? 'אסטרטגיה' : 'Strategy'}</div>
            <div className="flex flex-wrap gap-2">
              {STRATEGIES[lang].map(s => (
                <button key={s.key}
                  onClick={() => setFilters(f => ({ ...f, strategy: f.strategy === s.key ? '' : s.key }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${filters.strategy === s.key ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/25'}`}
                >
                  <span>{s.icon}</span><span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sector + Market Cap */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-white/50 text-xs mb-2">{lang === 'he' ? 'סקטור' : 'Sector'}</div>
              <select
                value={filters.sector}
                onChange={e => setFilters(f => ({ ...f, sector: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                {SECTORS[lang].map((s, i) => <option key={i} value={SECTOR_VALS[i]}>{s}</option>)}
              </select>
            </div>
            <div>
              <div className="text-white/50 text-xs mb-2">{lang === 'he' ? 'שווי שוק' : 'Market Cap'}</div>
              <select
                value={filters.marketCap}
                onChange={e => setFilters(f => ({ ...f, marketCap: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                {MARKET_CAPS[lang].map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          </div>

          {/* Advanced */}
          <button onClick={() => setShowAdvanced(v => !v)} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors">
            <Filter className="w-3.5 h-3.5" />
            {lang === 'he' ? 'פילטרים מתקדמים' : 'Advanced Filters'}
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {[
                { key: 'minPE', label: lang === 'he' ? 'P/E מינימום' : 'Min P/E' },
                { key: 'maxPE', label: lang === 'he' ? 'P/E מקסימום' : 'Max P/E' },
                { key: 'minUpside', label: lang === 'he' ? 'פוטנציאל עלייה מינ. (%)' : 'Min Upside (%)' },
              ].map(f => (
                <div key={f.key}>
                  <div className="text-white/50 text-xs mb-1.5">{f.label}</div>
                  <input
                    type="number"
                    value={filters[f.key]}
                    onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder="—"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleScan}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-semibold transition-all"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
            {lang === 'he' ? 'סרוק עכשיו' : 'Scan Now'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto mb-4" />
            <div className="text-white/40 text-sm">{lang === 'he' ? 'סורק את השוק...' : 'Scanning the market...'}</div>
          </div>
        )}

        {/* Results */}
        {scanned && !loading && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/50 text-sm">
                {lang === 'he' ? `נמצאו ${results.length} מניות` : `${results.length} stocks found`}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/30">
                {[
                  { col: 'upside', label: lang === 'he' ? 'פוטנציאל' : 'Upside' },
                  { col: 'pe', label: 'P/E' },
                  { col: 'score', label: lang === 'he' ? 'ציון' : 'Score' },
                ].map(s => (
                  <button key={s.col} onClick={() => toggleSort(s.col)}
                    className={`flex items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${sortBy === s.col ? 'text-cyan-400 bg-cyan-500/10' : 'hover:text-white/60'}`}
                  >
                    {s.label} {sortBy === s.col && (sortDir === 'desc' ? '↓' : '↑')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {sorted.map((stock, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                        {stock.ticker?.slice(0, 4)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{stock.ticker}</span>
                          <TrendIcon trend={stock.trend} />
                          <span className="text-white/30 text-xs">{stock.sector}</span>
                        </div>
                        <div className="text-white/50 text-sm">{stock.company}</div>
                        <div className="text-white/30 text-xs mt-0.5">{lang === 'he' ? stock.one_liner_he : stock.one_liner}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="text-right">
                        <div className="text-white font-semibold">${stock.price?.toFixed(2)}</div>
                        <div className="text-white/30 text-xs">P/E {stock.pe_ratio?.toFixed(1)}</div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${(stock.upside_potential || 0) > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {(stock.upside_potential || 0) > 0 ? '+' : ''}{stock.upside_potential?.toFixed(0)}%
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, j) => (
                          <div key={j} className={`w-1.5 h-4 rounded-full ${j < Math.round((stock.score || 0) / 20) ? 'bg-indigo-500' : 'bg-white/10'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {stock.strategy_fit && (
                    <div className="mt-2 text-xs text-indigo-300/60 flex items-center gap-1">
                      <span>✦</span> {stock.strategy_fit}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}