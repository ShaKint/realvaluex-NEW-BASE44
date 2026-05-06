import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { Briefcase, PlusCircle } from 'lucide-react';

export default function OnboardingStep3({ value, onChange, investorType }) {
  const { lang } = useLang();
  const isBeginner = investorType === 'beginner';

  const options = [
    {
      value: true,
      icon: Briefcase,
      label: isBeginner
        ? (lang === 'he' ? 'כן, כבר קניתי מניות בעבר' : 'Yes, I have bought stocks before')
        : t(lang, 'hasPortfolioYes'),
      desc: isBeginner
        ? (lang === 'he' ? 'יש לי כסף שהשקעתי כבר במניות, קרנות, או מטבעות' : 'I already have money invested in stocks, funds, or crypto')
        : null,
      color: 'from-violet-500/20 to-purple-500/20 border-violet-500/40',
      iconColor: 'text-violet-400',
    },
    {
      value: false,
      icon: PlusCircle,
      label: isBeginner
        ? (lang === 'he' ? 'לא, אני מתחיל מאפס' : 'No, I am starting fresh')
        : t(lang, 'hasPortfolioNo'),
      desc: isBeginner
        ? (lang === 'he' ? 'עדיין לא השקעתי כסף בשום מקום — אני רוצה להתחיל' : "I haven't invested money anywhere yet — I want to start")
        : null,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40',
      iconColor: 'text-amber-400',
    },
  ];

  return (
    <div className="space-y-4">
      {isBeginner && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs leading-relaxed">
          {lang === 'he'
            ? '💡 "תיק השקעות" = כל הכסף שהשקעת במניות, קרנות סל (ETF), או מטבעות דיגיטליים'
            : '💡 "Portfolio" = all the money you\'ve invested in stocks, ETFs, or crypto'}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4">
        {options.map(opt => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              onClick={() => onChange(opt.value)}
              className={`flex items-center gap-4 p-5 rounded-2xl border-2 bg-gradient-to-r text-start transition-all ${opt.color} ${selected ? 'ring-2 ring-white/50 scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-6 h-6 ${opt.iconColor}`} />
              </div>
              <div>
                <div className="font-semibold text-white text-base">{opt.label}</div>
                {opt.desc && <div className="text-white/50 text-sm mt-0.5">{opt.desc}</div>}
              </div>
              {selected && <div className="ms-auto w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              </div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}