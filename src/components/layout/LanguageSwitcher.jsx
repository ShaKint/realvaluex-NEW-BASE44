import { useLang } from '@/lib/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { lang, toggleLang } = useLang();
  return (
    <button
      onClick={toggleLang}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm font-medium ${className}`}
    >
      <span>{lang === 'he' ? '🇮🇱 עב' : '🇺🇸 EN'}</span>
      <span className="text-white/40">|</span>
      <span>{lang === 'he' ? 'EN' : 'עב'}</span>
    </button>
  );
}