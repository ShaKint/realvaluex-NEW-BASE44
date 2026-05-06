import { useNavigate } from 'react-router-dom';
import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { Brain, ScanSearch, BarChart3, Bell, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';

const features = [
  { icon: Brain, key: 'feature1', color: 'from-indigo-500 to-violet-500' },
  { icon: ScanSearch, key: 'feature2', color: 'from-blue-500 to-cyan-500' },
  { icon: BarChart3, key: 'feature3', color: 'from-emerald-500 to-teal-500' },
  { icon: Bell, key: 'feature4', color: 'from-amber-500 to-orange-500' },
];

export default function Welcome() {
  const { lang, isRTL } = useLang();
  const navigate = useNavigate();
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between p-4 sm:p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">RealValueX™</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={() => navigate('/dashboard')}
            className="text-white/60 hover:text-white text-sm transition-colors"
          >
            {t(lang, 'alreadyHaveAccount')}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span>36 Chapters · 260 Questions · AI-Powered</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight mb-6 leading-tight">
          <span className="bg-gradient-to-r from-white via-indigo-200 to-violet-300 bg-clip-text text-transparent">
            {t(lang, 'welcomeTitle')}
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-4">
          {t(lang, 'welcomeSubtitle')}
        </p>

        <p className="text-base text-white/35 max-w-xl mx-auto mb-12">
          {t(lang, 'welcomeDescription')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/onboarding')}
            className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-900/50 transition-all hover:scale-105"
          >
            <span>{t(lang, 'getStarted')}</span>
            <ArrowIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Scroll hint */}
        <div className="mt-16 flex flex-col items-center gap-2 text-white/20">
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, key, color }) => (
            <div
              key={key}
              className="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white mb-2">{t(lang, `${key}Title`)}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{t(lang, `${key}Desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-violet-900/40 border border-indigo-500/20">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            {lang === 'he' ? 'מוכן לגלות הזדמנויות אמיתיות?' : 'Ready to discover real opportunities?'}
          </h2>
          <p className="text-white/40 mb-8">
            {lang === 'he' ? 'הצטרף עכשיו ותתחיל לנתח מניות כמו מקצוענים' : 'Join now and start analyzing stocks like a professional'}
          </p>
          <button
            onClick={() => navigate('/onboarding')}
            className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold hover:bg-white/90 transition-all hover:scale-105"
          >
            {t(lang, 'getStarted')} →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8 text-white/20 text-sm">
        RealValueX™ 2026 · {lang === 'he' ? 'כל הזכויות שמורות' : 'All Rights Reserved'}
      </footer>
    </div>
  );
}