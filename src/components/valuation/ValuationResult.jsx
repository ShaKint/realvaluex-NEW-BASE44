import { useLang } from '@/lib/LanguageContext';
import { TrendingUp, TrendingDown, Shield, Zap, AlertTriangle, CheckCircle2, Brain } from 'lucide-react';

const classificationConfig = {
  A: { label: 'Deep Value', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  B: { label: 'Fair Value', color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/30' },
  C: { label: 'Slightly Overvalued', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  D: { label: 'Overvalued', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' },
};

const recColor = {
  'Strong Buy': 'text-emerald-400',
  'Buy': 'text-emerald-300',
  'Hold': 'text-amber-400',
  'Sell': 'text-rose-300',
  'Strong Sell': 'text-rose-400',
};

function Method({ title, value, explanation, color = 'indigo' }) {
  const colorMap = {
    indigo: 'border-indigo-500/20 bg-indigo-500/5',
    violet: 'border-violet-500/20 bg-violet-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
  };
  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]}`}>
      <div className="text-white/40 text-xs mb-1">{title}</div>
      <div className="text-xl font-bold text-white mb-1">${value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}</div>
      <div className="text-white/40 text-xs leading-relaxed">{explanation}</div>
    </div>
  );
}

export default function ValuationResult({ ticker, result }) {
  const { lang } = useLang();
  const v = result;
  const isUpside = v.upside_pct >= 0;
  const cls = classificationConfig[v.classification] || classificationConfig['C'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-500/20">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white font-mono">{ticker}</div>
                <div className="text-white/40 text-xs">{lang === 'he' ? 'ניתוח שווי פנימי' : 'Intrinsic Value Analysis'}</div>
              </div>
            </div>
            <p className="text-white/55 text-sm max-w-lg leading-relaxed">{v.company_summary}</p>
          </div>
          <div className="text-end space-y-2">
            <div>
              <div className="text-white/30 text-xs">{lang === 'he' ? 'שווי קונצנזוס' : 'Consensus Value'}</div>
              <div className="text-3xl font-bold text-white">${v.consensus_value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            </div>
            <div className={`text-lg font-bold ${isUpside ? 'text-emerald-400' : 'text-rose-400'} flex items-center gap-1 justify-end`}>
              {isUpside ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUpside ? '+' : ''}{v.upside_pct?.toFixed(1)}%
              <span className="text-white/30 text-sm font-normal">{lang === 'he' ? 'פוטנציאל' : 'upside'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Classification + Recommendation */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 rounded-xl border ${cls.bg}`}>
          <div className="text-white/40 text-xs mb-1">{lang === 'he' ? 'סיווג' : 'Classification'}</div>
          <div className={`text-2xl font-bold ${cls.color}`}>{v.classification}</div>
          <div className={`text-sm font-medium ${cls.color} mt-0.5`}>{cls.label}</div>
          <div className="text-white/35 text-xs mt-1 leading-relaxed">{v.classification_rationale}</div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="text-white/40 text-xs mb-1">{lang === 'he' ? 'המלצה' : 'Recommendation'}</div>
          <div className={`text-xl font-bold ${recColor[v.recommendation] || 'text-white'}`}>{v.recommendation}</div>
          <div className="text-white/40 text-xs mt-2">{lang === 'he' ? 'ביטחון:' : 'Confidence:'}</div>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i < v.confidence ? 'bg-indigo-500' : 'bg-white/10'}`} />
            ))}
          </div>
          <div className="text-white/30 text-xs mt-1">{v.confidence}/10</div>
        </div>
      </div>

      {/* 3 valuation methods */}
      <div>
        <div className="text-white/40 text-sm font-medium mb-3">{lang === 'he' ? 'שיטות הערכה' : 'Valuation Methods'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Method
            title="DCF"
            value={v.dcf?.intrinsic_value}
            explanation={v.dcf?.explanation}
            color="indigo"
          />
          <Method
            title="P/E Valuation"
            value={v.pe_valuation?.fair_value}
            explanation={v.pe_valuation?.explanation}
            color="violet"
          />
          <Method
            title="Graham Number"
            value={v.graham_number?.value}
            explanation={v.graham_number?.explanation}
            color="amber"
          />
        </div>
      </div>

      {/* Risks & Catalysts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/15">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-white/70 text-sm font-medium">{lang === 'he' ? 'סיכונים מרכזיים' : 'Key Risks'}</span>
          </div>
          <ul className="space-y-2">
            {(v.risks || []).map((r, i) => (
              <li key={i} className="text-white/50 text-xs flex gap-2">
                <span className="text-rose-400 flex-shrink-0">↓</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-white/70 text-sm font-medium">{lang === 'he' ? 'קטליזטורים' : 'Catalysts'}</span>
          </div>
          <ul className="space-y-2">
            {(v.catalysts || []).map((c, i) => (
              <li key={i} className="text-white/50 text-xs flex gap-2">
                <span className="text-emerald-400 flex-shrink-0">↑</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-3 rounded-xl bg-white/3 border border-white/5">
        <p className="text-white/20 text-xs leading-relaxed">
          {lang === 'he'
            ? '⚠️ ניתוח זה נוצר על ידי AI ומיועד למטרות מחקר בלבד. אין לראות בו המלצת השקעה. תמיד עשה מחקר עצמאי לפני השקעה.'
            : '⚠️ This analysis is AI-generated for research purposes only. It does not constitute investment advice. Always do your own research before investing.'}
        </p>
      </div>
    </div>
  );
}