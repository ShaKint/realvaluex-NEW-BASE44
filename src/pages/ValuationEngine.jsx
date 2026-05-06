import { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Brain, Loader2 } from 'lucide-react';
import ValuationForm from '@/components/valuation/ValuationForm';
import ValuationResult from '@/components/valuation/ValuationResult';

export default function ValuationEngine() {
  const { lang } = useLang();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [ticker, setTicker] = useState('');
  const [error, setError] = useState('');

  const handleAnalyze = async ({ ticker: t, financials }) => {
    setLoading(true);
    setResult(null);
    setError('');
    setTicker(t);

    const res = await base44.functions.invoke('valuationEngine', {
      ticker: t,
      financials,
    });

    if (res.data?.error) {
      setError(res.data.error);
    } else {
      setResult(res.data?.valuation);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {lang === 'he' ? 'מנוע הערכה' : 'Valuation Engine'}
              </h1>
              <p className="text-white/35 text-sm">
                {lang === 'he' ? 'ניתוח שווי פנימי מבוסס DCF, P/E ו-Graham Number' : 'Intrinsic value via DCF, P/E & Graham Number'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/5 mb-6">
          <ValuationForm onSubmit={handleAnalyze} loading={loading} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
              <Brain className="absolute inset-0 m-auto w-6 h-6 text-indigo-400" />
            </div>
            <div className="text-white/50 text-sm">
              {lang === 'he' ? 'המנוע מנתח את המניה...' : 'Analyzing the stock...'}
            </div>
            <div className="text-white/25 text-xs">
              {lang === 'he' ? 'זה עשוי לקחת 10-20 שניות' : 'This may take 10-20 seconds'}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <ValuationResult ticker={ticker} result={result} />
        )}
      </div>
    </div>
  );
}