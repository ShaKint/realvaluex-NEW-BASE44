import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';

export default function OnboardingStep5({ value, onChange }) {
  const { lang } = useLang();

  return (
    <div>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={t(lang, 'goalsPlaceholder')}
        rows={5}
        className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 text-base"
      />
    </div>
  );
}