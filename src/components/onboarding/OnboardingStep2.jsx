import { useLang } from '@/lib/LanguageContext';
import { t } from '@/lib/i18n';
import { Slider } from '@/components/ui/slider';

export default function OnboardingStep2({ value, onChange }) {
  const { lang } = useLang();
  const years = value || 0;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="text-6xl font-bold text-white mb-2">{years}</div>
        <div className="text-white/50">{t(lang, 'yearsLabel')}</div>
      </div>
      <Slider
        min={0}
        max={30}
        step={1}
        value={[years]}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between text-white/40 text-sm">
        <span>0</span>
        <span>10</span>
        <span>20</span>
        <span>30+</span>
      </div>
    </div>
  );
}