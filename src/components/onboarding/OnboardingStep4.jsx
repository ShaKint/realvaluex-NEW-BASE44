import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { Shield, Scale, Zap } from 'lucide-react';

export default function OnboardingStep4({ value, onChange, investorType }) {
  const { lang } = useLang();
  const isBeginner = investorType === 'beginner';

  const options = [
    {
      value: 'conservative',
      icon: Shield,
      label: isBeginner
        ? (lang === 'he' ? '😌 שקט בלילה' : '😌 Sleep well at night')
        : t(lang, 'conservative'),
      desc: isBeginner
        ? (lang === 'he' ? 'אם המניה תרד ב-10%, אני אפנה לאחרים ואדאג מאוד' : "If my stock drops 10%, I'll worry a lot and might sell")
        : t(lang, 'conservativeDesc'),
      color: 'from-sky-500/20 to-blue-500/20 border-sky-500/40',
      iconColor: 'text-sky-400',
    },
    {
      value: 'moderate',
      icon: Scale,
      label: isBeginner
        ? (lang === 'he' ? '😐 אסבול ירידות קטנות' : '😐 I can handle small drops')
        : t(lang, 'moderate'),
      desc: isBeginner
        ? (lang === 'he' ? 'ירידה של 20-30% תדאיג אותי אבל לא אמכור מיד' : "A 20-30% drop will concern me but I won't panic sell")
        : t(lang, 'moderateDesc'),
      color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/40',
      iconColor: 'text-emerald-400',
    },
    {
      value: 'aggressive',
      icon: Zap,
      label: isBeginner
        ? (lang === 'he' ? '😤 אני בשביל הרווח הגדול' : '😤 I am here for big gains')
        : t(lang, 'aggressive'),
      desc: isBeginner
        ? (lang === 'he' ? 'מוכן לסכן יותר — אפילו ירידה של 50% לא תגרום לי למכור' : "Ready to risk more — even a 50% drop won't make me sell")
        : t(lang, 'aggressiveDesc'),
      color: 'from-rose-500/20 to-red-500/20 border-rose-500/40',
      iconColor: 'text-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      {options.map(opt => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 bg-gradient-to-r text-start transition-all ${opt.color} ${selected ? 'ring-2 ring-white/50 scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
          >
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Icon className={`w-5 h-5 ${opt.iconColor}`} />
            </div>
            <div>
              <div className="font-semibold text-white">{opt.label}</div>
              <div className="text-white/50 text-sm">{opt.desc}</div>
            </div>
            {selected && <div className="ms-auto w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            </div>}
          </button>
        );
      })}
    </div>
  );
}