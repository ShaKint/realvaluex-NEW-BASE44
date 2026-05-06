import { useLang } from '@/lib/LanguageContext';
import { Briefcase, Star, Zap, Brain } from 'lucide-react';

export default function QuickStats({ profile }) {
  const { lang } = useLang();

  const stats = [
    {
      icon: Briefcase,
      label: lang === 'he' ? 'מניות בתיק' : 'Portfolio',
      value: '8',
      sub: lang === 'he' ? '+2 החודש' : '+2 this month',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      href: '/portfolio',
    },
    {
      icon: Star,
      label: lang === 'he' ? 'Wish List' : 'Wish List',
      value: '12',
      sub: lang === 'he' ? '3 חדשות' : '3 new',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      href: '/wishlist',
    },
    {
      icon: Zap,
      label: lang === 'he' ? 'הזדמנויות' : 'Opportunities',
      value: '4',
      sub: lang === 'he' ? 'Score A+' : 'Score A+',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      href: '/opportunities',
    },
    {
      icon: Brain,
      label: lang === 'he' ? 'ניתוחים' : 'Analyses',
      value: '21',
      sub: lang === 'he' ? 'הכל' : 'total',
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      href: '/analysis',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <a
            key={s.label}
            href={s.href}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 hover:border-white/10 transition-all group"
          >
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div className={`text-2xl font-bold ${s.color} mb-0.5`}>{s.value}</div>
            <div className="text-white/60 text-sm font-medium">{s.label}</div>
            <div className="text-white/25 text-xs mt-0.5">{s.sub}</div>
          </a>
        );
      })}
    </div>
  );
}