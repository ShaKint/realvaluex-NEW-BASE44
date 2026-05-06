import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { Briefcase, PlusCircle } from 'lucide-react';

export default function OnboardingStep3({ value, onChange }) {
  const { lang } = useLang();

  const options = [
    {
      value: true,
      icon: Briefcase,
      label: t(lang, 'hasPortfolioYes'),
      color: 'from-violet-500/20 to-purple-500/20 border-violet-500/40',
      iconColor: 'text-violet-400',
    },
    {
      value: false,
      icon: PlusCircle,
      label: t(lang, 'hasPortfolioNo'),
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40',
      iconColor: 'text-amber-400',
    },
  ];

  return (
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
            <div className="font-semibold text-white text-lg">{opt.label}</div>
            {selected && <div className="ms-auto w-5 h-5 rounded-full bg-white flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            </div>}
          </button>
        );
      })}
    </div>
  );
}