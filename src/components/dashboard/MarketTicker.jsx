import { useLang } from '@/lib/LanguageContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MARKET_DATA = [
  { symbol: 'S&P 500', price: '5,842', change: '+0.74%', up: true },
  { symbol: 'NASDAQ', price: '18,493', change: '+1.12%', up: true },
  { symbol: 'AAPL', price: '213.49', change: '-0.32%', up: false },
  { symbol: 'NVDA', price: '897.32', change: '+2.45%', up: true },
  { symbol: 'TSLA', price: '174.18', change: '-1.21%', up: false },
  { symbol: 'TA-125', price: '2,341', change: '+0.55%', up: true },
  { symbol: 'BTC', price: '97,420', change: '+3.12%', up: true },
];

export default function MarketTicker() {
  const { lang } = useLang();

  return (
    <div className="overflow-hidden rounded-2xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white/40 text-xs font-medium">{lang === 'he' ? 'שוק חי' : 'Live Market'}</span>
      </div>
      <div className="flex gap-6 px-4 py-3 overflow-x-auto scrollbar-hide">
        {MARKET_DATA.map((item) => (
          <div key={item.symbol} className="flex-shrink-0 flex items-center gap-3">
            <span className="text-white/60 text-sm font-medium">{item.symbol}</span>
            <span className="text-white text-sm font-semibold">{item.price}</span>
            <span className={`flex items-center gap-0.5 text-xs font-medium ${item.up ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {item.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}