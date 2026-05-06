import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { Shield, Scale, Zap } from 'lucide-react';

export default function OnboardingStep4({ value, onChange }) {
  const { lang } = useLang();

  const options = [
    {
      value: 'conservative',
      icon: Shield,
      label: t(lang, 'conservative'),
      desc: t(lang, 'conservativeDesc'),
      color: 'from-sky-500/20 to-blue-500/20 border-sky-500/40',
      iconColor: 'text-sky-400',
    },
    {
      value: 'moderate',
      icon: Scale,
      label: t(lang, 'moderate'),
      desc: t(lang, 'moderateDesc'),
      color: 'from-emerald-500/20 to-green-500/20 border-emerald-500/40',
      iconColor: 'text-emerald-400',
    },
    {
      value: 'aggressive',
      icon: Zap,
      label: t(lang, 'aggressive'),
      desc: t(lang, 'aggressiveDesc'),
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