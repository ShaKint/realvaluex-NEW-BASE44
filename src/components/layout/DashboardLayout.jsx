הבנתי. אני צריך לראות את הקובץ המקורי כדי להחליף נכון. רגע אחד:**להחליף: `src/components/layout/DashboardLayout.jsx`**

נתיב: https://github.com/ShaKint/realvaluex-NEW-BASE44/blob/main/src/components/layout/DashboardLayout.jsx

תוכן:

```jsx
import { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import {
  Brain, BarChart3, ScanSearch, Star, TrendingDown, Zap,
  Settings, Shield, Menu, X, LogOut, User, Bell, Newspaper, Calculator
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', icon: BarChart3, path: '/dashboard' },
  { key: 'scanner', icon: ScanSearch, path: '/scanner' },
  { key: 'valuation', icon: Calculator, path: '/valuation' },
  { key: 'alerts', icon: Bell, path: '/alerts' },
  { key: 'news', icon: Newspaper, path: '/news' },
  { key: 'portfolio', icon: BarChart3, path: '/portfolio' },
  { key: 'wishlist', icon: Star, path: '/wishlist' },
  { key: 'sellList', icon: TrendingDown, path: '/sell-list' },
  { key: 'opportunities', icon: Zap, path: '/opportunities' },
  { key: 'analysis', icon: Brain, path: '/analysis' },
];

export default function DashboardLayout({ children }) {
  const { lang, isRTL } = useLang();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentPath = window.location.pathname;

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin';
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

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
            const active = currentPath === path;
            const label = t(lang, key);
            return (
              
                key={key}
                href={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-indigo-600 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </a>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1 px-3">
                <div className="text-white/20 text-xs uppercase tracking-widest">Admin</div>
              </div>
              
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/5 transition-all"
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>{t(lang, 'adminPanel')}</span>
              </a>
            </>
          )}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <a href="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all">
            <Settings className="w-4 h-4" />
            <span>{t(lang, 'settings')}</span>
          </a>
          <button
            onClick={() => logout()}
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
          </div>
          {user && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                {displayName?.[0]?.toUpperCase() || <User className="w-3.5 h-3.5" />}
              </div>
              <span className="hidden sm:block">{displayName}</span>
            </div>
          )}
        </header>

        {children}
      </main>
    </div>
  );
}
```
