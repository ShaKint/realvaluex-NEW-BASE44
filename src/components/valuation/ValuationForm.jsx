import { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

const POPULAR = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'AMZN', 'JNJ', 'BRK.B', 'TSLA'];

export default function ValuationForm({ onSubmit, loading }) {
  const { lang } = useLang();
  const [ticker, setTicker] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [financials, setFinancials] = useState({
    revenue: '',
    net_income: '',
    eps: '',
    book_value_per_share: '',
    pe_ratio: '',
    free_cash_flow: '',
  });

  const updateFinancial = (key, val) => setFinancials(f => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    const cleaned = {};
    Object.entries(financials).forEach(([k, v]) => {
      if (v !== '') cleaned[k] = parseFloat(v);
    });
    onSubmit({ ticker: ticker.trim().toUpperCase(), financials: cleaned });
  };

  const fields = [
    { key: 'revenue', label: lang === 'he' ? 'הכנסות שנתיות ($M)' : 'Annual Revenue ($M)', placeholder: 'e.g. 394000' },
    { key: 'net_income', label: lang === 'he' ? 'רווח נקי ($M)' : 'Net Income ($M)', placeholder: 'e.g. 97000' },
    { key: 'eps', label: lang === 'he' ? 'EPS ($)' : 'EPS ($)', placeholder: 'e.g. 6.43' },
    { key: 'book_value_per_share', label: lang === 'he' ? 'ערך ספרי למניה ($)' : 'Book Value/Share ($)', placeholder: 'e.g. 4.25' },
    { key: 'pe_ratio', label: lang === 'he' ? 'מכפיל רווח (P/E)' : 'P/E Ratio', placeholder: 'e.g. 28' },
    { key: 'free_cash_flow', label: lang === 'he' ? 'תזרים מזומנים חופשי ($M)' : 'Free Cash Flow ($M)', placeholder: 'e.g. 90000' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Ticker input */}
      <div>
        <label className="block text-white/60 text-sm mb-2">
          {lang === 'he' ? 'סמל מניה (Ticker)' : 'Stock Ticker Symbol'}
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder={lang === 'he' ? 'למשל: AAPL, MSFT' : 'e.g. AAPL, MSFT'}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500 text-sm font-mono tracking-wider"
              maxLength={10}
            />
          </div>
          <button
            type="submit"
            disabled={!ticker.trim() || loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm"
          >
            {loading
              ? (lang === 'he' ? 'מחשב...' : 'Analyzing...')
              : (lang === 'he' ? 'נתח' : 'Analyze')}
          </button>
        </div>
      </div>

      {/* Popular shortcuts */}
      <div>
        <div className="text-white/30 text-xs mb-2">{lang === 'he' ? 'מניות פופולריות:' : 'Popular:'}</div>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTicker(t)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all ${
                ticker === t
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/25'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced: manual financials */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {lang === 'he' ? 'הזן נתונים פיננסיים ידנית (אופציונלי)' : 'Enter financials manually (optional)'}
        </button>
        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-white/40 text-xs mb-1">{f.label}</label>
                <input
                  type="number"
                  value={financials[f.key]}
                  onChange={e => updateFinancial(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 text-sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}