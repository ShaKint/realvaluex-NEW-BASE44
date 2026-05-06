import { useEffect, useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import MarketTicker from '@/components/dashboard/MarketTicker';
import PortfolioChart from '@/components/dashboard/PortfolioChart';
import TopOpportunities from '@/components/dashboard/TopOpportunities';
import MarketNews from '@/components/dashboard/MarketNews';
import QuickStats from '@/components/dashboard/QuickStats';

export default function Dashboard() {
  const { lang } = useLang();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

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

  return (
    <DashboardLayout>
      <div className="flex-1 p-4 sm:p-6 space-y-5">
        {/* Welcome */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-500/20 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {lang === 'he' ? `שלום, ${user?.full_name?.split(' ')[0] || ''}! 👋` : `Hello, ${user?.full_name?.split(' ')[0] || ''}! 👋`}
            </h2>
            <p className="text-white/40 text-sm mt-0.5">
              {profile
                ? (lang === 'he'
                  ? `${profile.investor_type === 'experienced' ? 'משקיע מנוסה' : 'משקיע מתחיל'} · סיכון: ${profile.risk_tolerance === 'aggressive' ? 'אגרסיבי' : profile.risk_tolerance === 'moderate' ? 'מתון' : 'שמרני'}`
                  : `${profile.investor_type} investor · Risk: ${profile.risk_tolerance}`)
                : (lang === 'he' ? 'ברוך הבא! השלם את ה-Onboarding כדי להתאים אישית.' : 'Welcome! Complete onboarding to personalize your experience.')}
            </p>
          </div>
          {!profile && (
            <a
              href="/onboarding"
              className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-all"
            >
              {lang === 'he' ? 'השלם פרופיל' : 'Complete Profile'}
            </a>
          )}
        </div>

        <MarketTicker />
        <QuickStats profile={profile} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3"><PortfolioChart /></div>
          <div className="lg:col-span-2"><TopOpportunities /></div>
        </div>

        <MarketNews />
      </div>
    </DashboardLayout>
  );
}