import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import OnboardingStep1 from '@/components/onboarding/OnboardingStep1';
import OnboardingStep2 from '@/components/onboarding/OnboardingStep2';
import OnboardingStep3 from '@/components/onboarding/OnboardingStep3';
import OnboardingStep4 from '@/components/onboarding/OnboardingStep4';
import OnboardingStep5 from '@/components/onboarding/OnboardingStep5';
import { CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const { lang, isRTL } = useLang();
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    investor_type: null,
    step2: { years: 0, styles: [], horizons: [], markets: [], sectors: [] },
    has_existing_portfolio: null,
    risk_tolerance: null,
    investment_goals: '',
  });

  const canProceed = () => {
    if (step === 1) return !!form.investor_type;
    if (step === 2) return true;
    if (step === 3) return form.has_existing_portfolio !== null;
    if (step === 4) return !!form.risk_tolerance;
    return true;
  };

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    await base44.entities.UserProfile.create({
      user_id: user.email,
      investor_type: form.investor_type,
      experience_years: form.step2?.years ?? 0,
      investing_styles: form.step2?.styles ?? [],
      investment_horizons: form.step2?.horizons ?? [],
      active_markets: form.step2?.markets ?? [],
      preferred_sectors: form.step2?.sectors ?? [],
      has_existing_portfolio: form.has_existing_portfolio,
      risk_tolerance: form.risk_tolerance,
      investment_goals: form.investment_goals,
      preferred_language: lang,
      onboarding_completed: true,
      onboarding_step: TOTAL_STEPS,
    });
    setSaving(false);
    navigate('/dashboard');
  };

  const stepTitles = {
    1: [t(lang, 'step1Title'), t(lang, 'step1Subtitle')],
    2: [t(lang, 'step2Title'), t(lang, 'step2Subtitle')],
    3: [t(lang, 'step3Title'), t(lang, 'step3Subtitle')],
    4: [t(lang, 'step4Title'), t(lang, 'step4Subtitle')],
    5: [t(lang, 'step5Title'), t(lang, 'step5Subtitle')],
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;
  const NextIcon = isRTL ? ArrowLeft : ArrowRight;

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-indigo-800 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6">
        <div className="text-white font-bold text-lg tracking-tight">RealValueX™</div>
        <LanguageSwitcher />
      </div>

      {/* Progress */}
      <div className="px-4 sm:px-8 mb-6">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-white/40 text-xs mb-2">
            <span>{t(lang, 'stepOf')} {step} {t(lang, 'of')} {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">{stepTitles[step][0]}</h2>
            <p className="text-white/50">{stepTitles[step][1]}</p>
          </div>

          {step === 1 && <OnboardingStep1 value={form.investor_type} onChange={v => setForm(f => ({ ...f, investor_type: v }))} />}
          {step === 2 && <OnboardingStep2 value={form.step2} onChange={v => setForm(f => ({ ...f, step2: v }))} />}
          {step === 3 && <OnboardingStep3 value={form.has_existing_portfolio} onChange={v => setForm(f => ({ ...f, has_existing_portfolio: v }))} />}
          {step === 4 && <OnboardingStep4 value={form.risk_tolerance} onChange={v => setForm(f => ({ ...f, risk_tolerance: v }))} />}
          {step === 5 && <OnboardingStep5 value={form.investment_goals} onChange={v => setForm(f => ({ ...f, investment_goals: v }))} />}
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 sm:p-8">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <BackIcon className="w-4 h-4" />
              <span>{t(lang, 'back')}</span>
            </button>
          ) : <div />}

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all"
            >
              <span>{t(lang, 'next')}</span>
              <NextIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{saving ? t(lang, 'loading') : t(lang, 'finish')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}