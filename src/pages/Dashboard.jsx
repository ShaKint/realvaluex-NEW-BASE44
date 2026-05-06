import { useEffect, useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import {
  Brain, BarChart3, ScanSearch, Star, TrendingDown, Zap,
  Settings, Shield, Menu, X, LogOut, User, ChevronRight, ChevronLeft
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', icon: BarChart3, path: '/dashboard' },
  { key: 'portfolio', icon: BarChart3, path: '/portfolio' },
  { key: 'scanner', icon: ScanSearch, path: '/scanner' },
  { key: 'wishlist', icon: Star, path: '/wishlist' },
  { key: 'sellList', icon: TrendingDown, path: '/sell-list' },
  { key: 'opportunities', icon: Zap, path: '/opportunities' },
  { key: 'analysis', icon: Brain, path: '/analysis' },
];

export default function Dashboard() {
  const { lang, isRTL } = useLang();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const CollapseIcon = isRTL ? ChevronRight : ChevronLeft;

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) {
        base44.entities.UserProfile.filter({ user_id: u.id }).then(profiles => {
          if (profiles.length > 0) setProfile(profiles[0]);
        });
      }
    });
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <div className={`min-h-screen bg-slate-950 text-white flex ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-64 bg-slate-900 border-${isRTL ? 'l' : 'r'} border-white/5 flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')} lg:relative lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-white">RealValueX™</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ key, icon: Icon, path }) => {
            const active = window.location.pathname === path;
            return (
              <a
                key={key}
                href={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{t(lang, key)}</span>
              </a>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-3">
                <div className="text-white/20 text-xs uppercase tracking-widest">Admin</div>
              </div>
              <a
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/5 transition-all"
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>{t(lang, 'adminPanel')}</span>
              </a>
            </>
          )}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <a href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all">
            <Settings className="w-4 h-4" />
            <span>{t(lang, 'settings')}</span>
          </a>
          <button
            onClick={() => base44.auth.logout('/')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>{lang === 'he' ? 'התנתק' : 'Logout'}</span>
          </button>
          <LanguageSwitcher className="w-full justify-center mt-1 !text-white/40 !border-white/10" />
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-screen overflow-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/5"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-lg font-semibold text-white">{t(lang, 'dashboard')}</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  {user.full_name?.[0]?.toUpperCase() || <User className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden sm:block">{user.full_name}</span>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard content */}
        <div className="flex-1 p-4 sm:p-6">
          {/* Welcome card */}
          <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-500/20">
            <h2 className="text-xl font-bold text-white mb-1">
              {lang === 'he' ? `שלום, ${user?.full_name?.split(' ')[0] || ''}!` : `Hello, ${user?.full_name?.split(' ')[0] || ''}!`}
            </h2>
            <p className="text-white/40 text-sm">
              {profile
                ? (lang === 'he' ? `פרופיל: ${profile.investor_type === 'experienced' ? 'משקיע מנוסה' : 'משקיע מתחיל'} · סיכון: ${profile.risk_tolerance}` : `Profile: ${profile.investor_type} · Risk: ${profile.risk_tolerance}`)
                : (lang === 'he' ? 'ברוך הבא! השלם את ה-Onboarding כדי להתאים אישית.' : 'Welcome! Complete onboarding to personalize.')}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: lang === 'he' ? 'מניות בתיק' : 'Portfolio Stocks', value: '—', color: 'text-indigo-400' },
              { label: lang === 'he' ? 'Wish List' : 'Wish List', value: '—', color: 'text-amber-400' },
              { label: lang === 'he' ? 'הזדמנויות' : 'Opportunities', value: '—', color: 'text-emerald-400' },
              { label: lang === 'he' ? 'ניתוחים היום' : "Today's Analyses", value: '—', color: 'text-violet-400' },
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <div className={`text-2xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-white/40 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Modules grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {navItems.slice(1).map(({ key, icon: Icon, path }) => (
              <a
                key={key}
                href={path}
                className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 hover:border-white/15 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon className="w-5 h-5 text-indigo-400" />
                  <CollapseIcon className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                </div>
                <div className="font-semibold text-white">{t(lang, key)}</div>
                <div className="text-white/30 text-xs mt-1">{lang === 'he' ? 'לחץ לכניסה' : 'Click to enter'}</div>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}