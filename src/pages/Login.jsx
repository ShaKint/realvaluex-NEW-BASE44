import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { Brain, Mail, Lock, ArrowRight } from 'lucide-react';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';

export default function Login() {
  const { lang } = useLang();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // If already logged in, redirect to dashboard
  if (!isLoadingAuth && isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await signUpWithEmail(email, password);
        if (err) {
          setError(err.message);
        } else {
          setMessage(lang === 'he' ? 'נשלח אליך מייל אישור. אנא בדוק את התיבה שלך.' : 'Check your email to confirm your account.');
        }
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (err) setError(err.message);
        else navigate('/onboarding');
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) setError(err.message);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col">
      <div className="flex items-center justify-between p-4 sm:p-6">
        <a href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">RealValueX</span>
        </a>
        <LanguageSwitcher />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              {mode === 'login'
                ? (lang === 'he' ? 'ברוך הבא' : 'Welcome Back')
                : (lang === 'he' ? 'הצטרף ל-RealValueX' : 'Join RealValueX')}
            </h2>
            <p className="text-white/50">
              {mode === 'login'
                ? (lang === 'he' ? 'התחבר לחשבון שלך' : 'Sign in to your account')
                : (lang === 'he' ? 'צור חשבון חדש' : 'Create a new account')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/60 text-sm mb-1.5 block">{lang === 'he' ? 'אימייל' : 'Email'}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-white/60 text-sm mb-1.5 block">{lang === 'he' ? 'סיסמה' : 'Password'}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/50 border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold transition-all"
            >
              {loading ? (lang === 'he' ? 'טוען...' : 'Loading...') : (mode === 'login' ? (lang === 'he' ? 'התחבר' : 'Sign In') : (lang === 'he' ? 'הירשם' : 'Sign Up'))}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-white/30 text-xs">{lang === 'he' ? 'או' : 'OR'}</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{lang === 'he' ? 'התחבר עם Google' : 'Continue with Google'}</span>
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
              className="text-white/40 hover:text-white text-sm transition-colors"
            >
              {mode === 'login'
                ? (lang === 'he' ? 'אין לך חשבון? הירשם' : "Don't have an account? Sign up")
                : (lang === 'he' ? 'יש לך חשבון? התחבר' : 'Already have an account? Sign in')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
