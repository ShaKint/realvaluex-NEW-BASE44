import { useLang } from '@/lib/LanguageContext';
import { TrendingUp, TrendingDown, Shield, Zap, AlertTriangle, Brain, BarChart3, Target, Activity, Users, Globe } from 'lucide-react';

const classificationConfig = {
  A: { label: 'Deep Value', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  B: { label: 'Fair Value', color: 'text-sky-400', bg: 'bg-sky-500/15 border-sky-500/30' },
  C: { label: 'Slightly Overvalued', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  D: { label: 'Overvalued', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' },
};

const recColor = {
  'Strong Buy': 'text-emerald-400', 'Buy': 'text-emerald-300',
  'Hold': 'text-amber-400', 'Sell': 'text-rose-300', 'Strong Sell': 'text-rose-400',
};

const verdictColor = { GREEN: 'text-emerald-400', YELLOW: 'text-amber-400', RED: 'text-rose-400' };
const verdictBg = { GREEN: 'bg-emerald-500/10 border-emerald-500/20', YELLOW: 'bg-amber-500/10 border-amber-500/20', RED: 'bg-rose-500/10 border-rose-500/20' };

function Section({ title, icon: Icon, children, color = 'indigo' }) {
  const borderMap = { indigo: 'border-indigo-500/15', violet: 'border-violet-500/15', cyan: 'border-cyan-500/15', amber: 'border-amber-500/15', slate: 'border-white/8' };
  return (
    <div className={`p-4 rounded-xl border ${borderMap[color] || 'border-white/8'} bg-white/3`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-white/40" />}
        <span className="text-white/50 text-xs font-semibold uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  );
}

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

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/35 text-xs flex-shrink-0">{label}</span>
      <span className="text-white/70 text-xs text-end">{value || '—'}</span>
    </div>
  );
}

export default function ValuationResult({ ticker, result }) {
  const { lang } = useLang();
  const v = result;
  const isUpside = v.upside_pct >= 0;
  const cls = classificationConfig[v.classification] || classificationConfig['C'];
  const xVerdict = v.x_factor_verdict?.toUpperCase() || 'YELLOW';
  const moatVerdict = v.moat_durability?.split(' ')[0]?.toUpperCase() || 'YELLOW';

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
                <div className="text-white/40 text-xs">{lang === 'he' ? 'ניתוח RealValueX™ v3.0 — 4 שכבות' : 'RealValueX™ v3.0 Analysis — 4 Layers'}</div>
              </div>
            </div>
            <p className="text-white/55 text-sm max-w-lg leading-relaxed">{v.company_summary}</p>
            {v.business_stage && (
              <div className="mt-2 flex gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs">{v.business_stage}</span>
                {v.type_classification && <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">{v.type_classification}</span>}
              </div>
            )}
          </div>
          <div className="text-end space-y-2">
            <div>
              <div className="text-white/30 text-xs">{lang === 'he' ? 'שווי קונצנזוס' : 'Consensus Value'}</div>
              <div className="text-3xl font-bold text-white">${v.consensus_value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              {v.analyst_target_avg && (
                <div className="text-white/35 text-xs mt-0.5">{lang === 'he' ? 'יעד אנליסטים:' : 'Analyst target:'} ${v.analyst_target_avg}</div>
              )}
            </div>
            <div className={`text-lg font-bold ${isUpside ? 'text-emerald-400' : 'text-rose-400'} flex items-center gap-1 justify-end`}>
              {isUpside ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {isUpside ? '+' : ''}{v.upside_pct?.toFixed(1)}%
              <span className="text-white/30 text-sm font-normal">{lang === 'he' ? 'פוטנציאל' : 'upside'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* S31 + RUC + Classification + Recommendation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border ${cls.bg}`}>
          <div className="text-white/40 text-xs mb-1">{lang === 'he' ? 'סיווג' : 'Classification'}</div>
          <div className={`text-2xl font-bold ${cls.color}`}>{v.classification}</div>
          <div className={`text-xs font-medium ${cls.color} mt-0.5`}>{cls.label}</div>
        </div>
        <div className="p-4 rounded-xl border border-white/10 bg-white/5">
          <div className="text-white/40 text-xs mb-1">{lang === 'he' ? 'המלצה' : 'Recommendation'}</div>
          <div className={`text-base font-bold ${recColor[v.recommendation] || 'text-white'}`}>{v.recommendation}</div>
          <div className="flex gap-0.5 mt-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i < v.confidence ? 'bg-indigo-500' : 'bg-white/10'}`} />
            ))}
          </div>
          <div className="text-white/30 text-xs mt-1">{lang === 'he' ? 'ביטחון' : 'Confidence'} {v.confidence}/10</div>
        </div>
        {v.s31_score != null && (
          <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
            <div className="text-white/40 text-xs mb-1">S31 Protocol</div>
            <div className={`text-2xl font-bold ${v.s31_score >= 7 ? 'text-emerald-400' : v.s31_score >= 5 ? 'text-amber-400' : 'text-rose-400'}`}>{v.s31_score}/10</div>
            <div className="text-white/30 text-xs mt-1">{v.s31_score >= 5 ? (lang === 'he' ? 'מאשר כניסה' : 'Entry confirmed') : (lang === 'he' ? 'מתחת לסף' : 'Below threshold')}</div>
          </div>
        )}
        {v.ruc_score != null && (
          <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5">
            <div className="text-white/40 text-xs mb-1">RUC Score</div>
            <div className={`text-2xl font-bold ${v.ruc_score >= 80 ? 'text-emerald-400' : v.ruc_score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{v.ruc_score}</div>
            <div className="text-white/30 text-xs mt-1">{v.ruc_score >= 80 ? (lang === 'he' ? 'הקצה הון' : 'Allocate') : v.ruc_score >= 50 ? (lang === 'he' ? 'החזק' : 'Hold') : (lang === 'he' ? 'שקול Trim' : 'Consider Trim')}</div>
          </div>
        )}
      </div>

      {/* LAYER 1 — X-Factor & Moat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {v.x_factor && (
          <Section title={lang === 'he' ? 'LAYER 1 — X-Factor' : 'LAYER 1 — X-Factor'} icon={Zap} color="indigo">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold mb-2 ${verdictBg[xVerdict]} ${verdictColor[xVerdict]}`}>
              ● {xVerdict}
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{v.x_factor}</p>
          </Section>
        )}
        {v.moat_durability && (
          <Section title={lang === 'he' ? 'Moat Durability' : 'Moat Durability'} icon={Shield} color="violet">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold mb-2 ${verdictBg[moatVerdict]} ${verdictColor[moatVerdict]}`}>
              ● {moatVerdict}
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{v.moat_durability}</p>
          </Section>
        )}
      </div>

      {/* LAYER 2 — Validation Data */}
      <Section title={lang === 'he' ? 'LAYER 2 — נתוני ולידציה' : 'LAYER 2 — Validation Data'} icon={BarChart3} color="cyan">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div>
            {v.revenue_3yr_trend && <StatRow label={lang === 'he' ? 'הכנסות 3 שנים' : '3-Year Revenue Trend'} value={v.revenue_3yr_trend} />}
            {v.gross_margin_trend && <StatRow label={lang === 'he' ? 'מגמת Gross Margin' : 'Gross Margin Trend'} value={v.gross_margin_trend} />}
            {v.earnings_track_record && <StatRow label={lang === 'he' ? 'רצף הכנסות היסטורי' : 'Earnings Track Record'} value={v.earnings_track_record} />}
            {v.management_execution_score && <StatRow label={lang === 'he' ? 'ביצועי הנהלה' : 'Management Execution'} value={v.management_execution_score} />}
          </div>
          <div>
            {v.tam_size && <StatRow label={lang === 'he' ? 'TAM & צמיחת שוק' : 'TAM & Market Growth'} value={v.tam_size} />}
            {v.market_share && <StatRow label={lang === 'he' ? 'נתח שוק' : 'Market Share'} value={v.market_share} />}
            {v.institutional_ownership && <StatRow label={lang === 'he' ? 'החזקה מוסדית' : 'Institutional Ownership'} value={v.institutional_ownership} />}
            {v.insider_activity && <StatRow label={lang === 'he' ? 'פעילות Insiders' : 'Insider Activity'} value={v.insider_activity} />}
          </div>
        </div>
      </Section>

      {/* LAYER 3 — Timing */}
      <Section title={lang === 'he' ? 'LAYER 3 — תמחור וטיימינג' : 'LAYER 3 — Timing & Pricing'} icon={Activity} color="amber">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mb-4">
          <div>
            {v.technical_levels && <StatRow label={lang === 'he' ? 'רמות טכניות' : 'Technical Levels'} value={v.technical_levels} />}
            {v.historical_cagr && <StatRow label={lang === 'he' ? 'CAGR היסטורי' : 'Historical CAGR'} value={v.historical_cagr} />}
            {v.bubble_risk && <StatRow label={lang === 'he' ? 'סיכון בועה' : 'Bubble Risk'} value={v.bubble_risk} />}
            {v.geopolitical_risk && <StatRow label={lang === 'he' ? 'סיכון גאופוליטי' : 'Geopolitical Risk'} value={v.geopolitical_risk} />}
          </div>
          <div>
            {v.analyst_consensus && <StatRow label={lang === 'he' ? 'קונצנזוס אנליסטים' : 'Analyst Consensus'} value={`${v.analyst_consensus}${v.analyst_count ? ` (${v.analyst_count} analysts)` : ''}`} />}
            {v.return_forecast?.bear_1yr != null && <StatRow label={lang === 'he' ? 'תרחיש Bear / Base / Bull (1Y)' : 'Bear / Base / Bull (1Y)'} value={`${v.return_forecast.bear_1yr > 0 ? '+' : ''}${v.return_forecast.bear_1yr}% / +${v.return_forecast.base_1yr}% / +${v.return_forecast.bull_1yr}%`} />}
            {v.return_forecast?.cagr_5yr != null && <StatRow label={lang === 'he' ? 'CAGR חזוי 5 שנים' : 'Forecast CAGR 5yr'} value={`${v.return_forecast.cagr_5yr}%`} />}
            {v.return_forecast?.cagr_10yr != null && <StatRow label={lang === 'he' ? 'CAGR חזוי 10 שנים' : 'Forecast CAGR 10yr'} value={`${v.return_forecast.cagr_10yr}%`} />}
          </div>
        </div>

        {/* 3 valuation methods */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
          <Method title="DCF" value={v.dcf?.intrinsic_value} explanation={v.dcf?.explanation} color="indigo" />
          <Method title="P/E Valuation" value={v.pe_valuation?.fair_value} explanation={v.pe_valuation?.explanation} color="violet" />
          <Method title="Graham Number" value={v.graham_number?.value} explanation={v.graham_number?.explanation} color="amber" />
        </div>
      </Section>

      {/* Full Thesis Rationale */}
      {v.thesis_rationale && (
        <Section title={lang === 'he' ? 'תזת ההשקעה המלאה — הצלבת נתונים' : 'Full Investment Thesis — Cross-Referenced Analysis'} icon={Brain} color="indigo">
          <p className="text-white/65 text-sm leading-relaxed whitespace-pre-line">{v.thesis_rationale}</p>
        </Section>
      )}

      {/* Classification rationale */}
      {v.classification_rationale && (
        <div className={`p-4 rounded-xl border ${cls.bg}`}>
          <div className="text-white/40 text-xs mb-1">{lang === 'he' ? 'רציונל סיווג' : 'Classification Rationale'}</div>
          <p className="text-white/65 text-sm leading-relaxed">{v.classification_rationale}</p>
        </div>
      )}

      {/* Allocation recommendation */}
      {v.allocation_recommendation && (
        <Section title={lang === 'he' ? 'המלצת הקצאת הון' : 'Capital Allocation Recommendation'} icon={Target} color="cyan">
          <p className="text-white/65 text-sm leading-relaxed">{v.allocation_recommendation}</p>
        </Section>
      )}

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
                <span className="text-rose-400 flex-shrink-0">↓</span>{r}
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
                <span className="text-emerald-400 flex-shrink-0">↑</span>{c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-3 rounded-xl bg-white/3 border border-white/5">
        <p className="text-white/20 text-xs leading-relaxed">
          {lang === 'he'
            ? '⚠️ ניתוח זה נוצר על ידי AI על בסיס מודל RealValueX™ v3.0 ומיועד למטרות מחקר בלבד. אין לראות בו המלצת השקעה. תמיד עשה מחקר עצמאי לפני השקעה.'
            : '⚠️ This analysis is AI-generated using the RealValueX™ v3.0 model for research purposes only. It does not constitute investment advice. Always do your own research before investing.'}
        </p>
      </div>
    </div>
  );
}