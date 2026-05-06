import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { Slider } from '@/components/ui/slider';

const MultiSelect = ({ options, value = [], onChange, single = false }) => {
  const toggle = (v) => {
    if (single) {
      onChange([v]);
    } else {
      onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const selected = value.includes(opt.value);
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              selected
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-white/5 border-white/15 text-white/50 hover:text-white hover:border-white/30'
            }`}
          >
            <span>{opt.emoji}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default function OnboardingStep2({ value = {}, onChange, investorType }) {
  const { lang } = useLang();
  const data = value || {};
  const isBeginner = investorType === 'beginner';

  const update = (key, val) => onChange({ ...data, [key]: val });

  // ── BEGINNER MODE ──────────────────────────────────────────────
  if (isBeginner) {
    const horizonsBeginner = [
      {
        value: 'long',
        emoji: '🏔️',
        label: lang === 'he' ? 'לטווח ארוך (שנה ומעלה)' : 'Long-term (1+ year)',
        desc: lang === 'he' ? 'קונים מניה ומחזיקים אותה זמן רב — פחות לחץ, פחות מעקב יומי' : 'Buy and hold for a long time — less stress, no daily monitoring',
        recommended: true,
      },
      {
        value: 'medium',
        emoji: '📅',
        label: lang === 'he' ? 'לכמה חודשים' : 'Several months',
        desc: lang === 'he' ? 'קונים מניה ומחזיקים אותה מספר חודשים' : 'Hold a stock for a few months',
      },
      {
        value: 'swing',
        emoji: '⚡',
        label: lang === 'he' ? 'לימים-שבועות (מתקדם)' : 'Days-weeks (advanced)',
        desc: lang === 'he' ? 'קנייה ומכירה תוך ימים — דורש ניסיון וזמן' : 'Buy and sell within days — requires experience and time',
      },
    ];

    const markets = [
      { value: 'us', emoji: '🇺🇸', label: lang === 'he' ? 'ארה"ב' : 'USA', desc: lang === 'he' ? 'הבורסה הגדולה בעולם — Apple, Google, Amazon...' : 'The largest stock market — Apple, Google, Amazon...' },
      { value: 'israel', emoji: '🇮🇱', label: lang === 'he' ? 'ישראל' : 'Israel', desc: lang === 'he' ? 'בורסה תל אביב — חברות ישראליות' : 'Tel Aviv Stock Exchange — Israeli companies' },
      { value: 'crypto', emoji: '₿', label: lang === 'he' ? 'קריפטו (מסוכן)' : 'Crypto (risky)', desc: lang === 'he' ? 'ביטקוין ומטבעות דיגיטליים — תנודתי מאוד' : 'Bitcoin and digital currencies — very volatile' },
    ];

    return (
      <div className="space-y-6">
        {/* Beginner notice */}
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-indigo-200/80 text-sm leading-relaxed">
            {lang === 'he'
              ? '👋 אל דאגה — השאלות כאן פשוטות. אין תשובות נכונות או לא נכונות. נסביר כל מושג.'
              : "👋 Don't worry — these questions are simple. There are no right or wrong answers. We'll explain every term."}
          </p>
        </div>

        {/* Horizon - beginner */}
        <div>
          <div className="text-white/70 text-sm font-medium mb-1">
            {lang === 'he' ? '🕐 לכמה זמן אתה רוצה להשקיע?' : '🕐 How long do you want to invest?'}
          </div>
          <div className="text-white/35 text-xs mb-3">
            {lang === 'he' ? 'כמה זמן אתה מתכנן להחזיק את הכסף בשוק' : 'How long you plan to keep your money invested'}
          </div>
          <div className="space-y-2">
            {horizonsBeginner.map(opt => {
              const selected = (data.horizons ?? []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => update('horizons', selected ? [] : [opt.value])}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-start transition-all ${
                    selected
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:border-white/25'
                  }`}
                >
                  <span className="text-xl mt-0.5">{opt.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      {opt.label}
                      {opt.recommended && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-300 text-xs">
                          {lang === 'he' ? 'מומלץ למתחילים' : 'Recommended'}
                        </span>
                      )}
                    </div>
                    <div className="text-white/45 text-xs mt-0.5">{opt.desc}</div>
                  </div>
                  {selected && <div className="w-4 h-4 rounded-full bg-indigo-400 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Markets - beginner */}
        <div>
          <div className="text-white/70 text-sm font-medium mb-1">
            {lang === 'he' ? '🌍 באיזה שוק אתה מעוניין?' : '🌍 Which market interests you?'}
          </div>
          <div className="text-white/35 text-xs mb-3">
            {lang === 'he' ? 'ניתן לבחור יותר מאחד' : 'You can select more than one'}
          </div>
          <div className="space-y-2">
            {markets.map(opt => {
              const selected = (data.markets ?? []).includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    const cur = data.markets ?? [];
                    update('markets', selected ? cur.filter(x => x !== opt.value) : [...cur, opt.value]);
                  }}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-start transition-all ${
                    selected
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/70 hover:border-white/25'
                  }`}
                >
                  <span className="text-xl mt-0.5">{opt.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-white/45 text-xs mt-0.5">{opt.desc}</div>
                  </div>
                  {selected && <div className="w-4 h-4 rounded-full bg-indigo-400 flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── EXPERIENCED MODE ───────────────────────────────────────────
  const investingStyles = [
    { value: 'fundamental', emoji: '📊', label: lang === 'he' ? 'פונדמנטלי' : 'Fundamental' },
    { value: 'technical', emoji: '📈', label: lang === 'he' ? 'טכני' : 'Technical' },
    { value: 'macro', emoji: '🌍', label: lang === 'he' ? 'מאקרו' : 'Macro' },
    { value: 'quantitative', emoji: '🤖', label: lang === 'he' ? 'כמותי' : 'Quantitative' },
    { value: 'mixed', emoji: '⚡', label: lang === 'he' ? 'משולב' : 'Mixed' },
  ];

  const horizons = [
    { value: 'swing', emoji: '⚡', label: lang === 'he' ? 'Swing (ימים-שבועות)' : 'Swing (days-weeks)' },
    { value: 'medium', emoji: '📅', label: lang === 'he' ? 'בינוני (חודשים)' : 'Medium (months)' },
    { value: 'long', emoji: '🏔️', label: lang === 'he' ? 'ארוך טווח (1+ שנה)' : 'Long-term (1+ year)' },
  ];

  const markets = [
    { value: 'us', emoji: '🇺🇸', label: 'US' },
    { value: 'israel', emoji: '🇮🇱', label: lang === 'he' ? 'ישראל' : 'Israel' },
    { value: 'europe', emoji: '🇪🇺', label: lang === 'he' ? 'אירופה' : 'Europe' },
    { value: 'emerging', emoji: '🌏', label: 'Emerging' },
    { value: 'crypto', emoji: '₿', label: 'Crypto' },
  ];

  const sectors = [
    { value: 'tech', emoji: '💻', label: lang === 'he' ? 'טכנולוגיה' : 'Technology' },
    { value: 'healthcare', emoji: '🏥', label: lang === 'he' ? 'בריאות' : 'Healthcare' },
    { value: 'finance', emoji: '🏦', label: lang === 'he' ? 'פיננסים' : 'Finance' },
    { value: 'energy', emoji: '⚡', label: lang === 'he' ? 'אנרגיה' : 'Energy' },
    { value: 'consumer', emoji: '🛒', label: lang === 'he' ? 'צרכנות' : 'Consumer' },
    { value: 'industrial', emoji: '🏭', label: lang === 'he' ? 'תעשייה' : 'Industrial' },
    { value: 'realestate', emoji: '🏠', label: lang === 'he' ? 'נדל"ן' : 'Real Estate' },
    { value: 'all', emoji: '🌐', label: lang === 'he' ? 'הכל' : 'All' },
  ];

  return (
    <div className="space-y-7">
      {/* Years */}
      <div>
        <div className="text-white/70 text-sm font-medium mb-3">
          {lang === 'he' ? '⏱ שנות ניסיון' : '⏱ Years of Experience'}
        </div>
        <div className="text-center mb-4">
          <span className="text-5xl font-bold text-white">{data.years ?? 0}</span>
          <span className="text-white/40 text-sm ms-2">{lang === 'he' ? 'שנים' : 'years'}</span>
        </div>
        <Slider
          min={0} max={30} step={1}
          value={[data.years ?? 0]}
          onValueChange={([v]) => update('years', v)}
          className="w-full"
        />
        <div className="flex justify-between text-white/25 text-xs mt-1">
          <span>0</span><span>10</span><span>20</span><span>30+</span>
        </div>
      </div>

      {/* Investing style */}
      <div>
        <div className="text-white/70 text-sm font-medium mb-3">
          {lang === 'he' ? '🧠 סגנון ניתוח (ניתן לבחור מספר)' : '🧠 Analysis Style (multi-select)'}
        </div>
        <MultiSelect options={investingStyles} value={data.styles ?? []} onChange={v => update('styles', v)} />
      </div>

      {/* Horizon */}
      <div>
        <div className="text-white/70 text-sm font-medium mb-3">
          {lang === 'he' ? '🎯 אופק השקעה מועדף' : '🎯 Preferred Investment Horizon'}
        </div>
        <MultiSelect options={horizons} value={data.horizons ?? []} onChange={v => update('horizons', v)} />
      </div>

      {/* Markets */}
      <div>
        <div className="text-white/70 text-sm font-medium mb-3">
          {lang === 'he' ? '🌍 שווקים שאתה פעיל בהם' : '🌍 Markets You Trade In'}
        </div>
        <MultiSelect options={markets} value={data.markets ?? []} onChange={v => update('markets', v)} />
      </div>

      {/* Sectors */}
      <div>
        <div className="text-white/70 text-sm font-medium mb-3">
          {lang === 'he' ? '📂 סקטורים מועדפים' : '📂 Preferred Sectors'}
        </div>
        <MultiSelect options={sectors} value={data.sectors ?? []} onChange={v => update('sectors', v)} />
      </div>
    </div>
  );
}