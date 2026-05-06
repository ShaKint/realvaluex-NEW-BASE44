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

export default function OnboardingStep2({ value = {}, onChange }) {
  const { lang } = useLang();
  const data = value || {};

  const update = (key, val) => onChange({ ...data, [key]: val });

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
    { value: 'emerging', emoji: '🌏', label: lang === 'he' ? 'Emerging' : 'Emerging' },
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
        <MultiSelect
          options={investingStyles}
          value={data.styles ?? []}
          onChange={v => update('styles', v)}
        />
      </div>

      {/* Horizon */}
      <div>
        <div className="text-white/70 text-sm font-medium mb-3">
          {lang === 'he' ? '🎯 אופק השקעה מועדף' : '🎯 Preferred Investment Horizon'}
        </div>
        <MultiSelect
          options={horizons}
          value={data.horizons ?? []}
          onChange={v => update('horizons', v)}
        />
      </div>

      {/* Markets */}
      <div>
        <div className="text-white/70 text-sm font-medium mb-3">
          {lang === 'he' ? '🌍 שווקים שאתה פעיל בהם' : '🌍 Markets You Trade In'}
        </div>
        <MultiSelect
          options={markets}
          value={data.markets ?? []}
          onChange={v => update('markets', v)}
        />
      </div>

      {/* Sectors */}
      <div>
        <div className="text-white/70 text-sm font-medium mb-3">
          {lang === 'he' ? '📂 סקטורים מועדפים' : '📂 Preferred Sectors'}
        </div>
        <MultiSelect
          options={sectors}
          value={data.sectors ?? []}
          onChange={v => update('sectors', v)}
        />
      </div>
    </div>
  );
}