import { useNavigate } from 'react-router-dom';
import { useLang } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import {
  Brain, ArrowLeft, ChevronDown, Target, Shield, Clock, Activity,
  TrendingUp, BarChart3, Zap, Eye, CheckCircle, XCircle, Star
} from 'lucide-react';

const SectionDivider = () => (
  <div className="flex items-center gap-4 my-2">
    <div className="flex-1 h-px bg-white/5" />
    <div className="w-1 h-1 rounded-full bg-indigo-500/50" />
    <div className="flex-1 h-px bg-white/5" />
  </div>
);

const LayerCard = ({ number, title, subtitle, items, color }) => (
  <div className={`p-6 rounded-2xl border bg-gradient-to-br ${color} transition-all hover:scale-[1.01]`}>
    <div className="flex items-start gap-4 mb-4">
      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 font-black text-white text-lg">
        {number}
      </div>
      <div>
        <div className="font-bold text-white text-lg">{title}</div>
        <div className="text-white/50 text-sm">{subtitle}</div>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className="px-2.5 py-1 rounded-lg bg-white/10 text-white/70 text-xs">{item}</span>
      ))}
    </div>
  </div>
);

const TypeCard = ({ type, titleHe, titleEn, descHe, descEn, advantageHe, advantageEn, color, icon: Icon }) => {
  return (
    <div className={`p-6 rounded-2xl border bg-gradient-to-br ${color}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-black text-white text-lg">{type}</div>
          <div className="text-white/60 text-sm font-medium">{titleHe}</div>
        </div>
      </div>
      <p className="text-white/50 text-sm mb-3">{descHe}</p>
      <div className="px-3 py-2 rounded-lg bg-white/10 text-white/70 text-xs">
        <span className="text-white/40">יתרון: </span>{advantageHe}
      </div>
    </div>
  );
};

export default function Welcome() {
  const { lang } = useLang();
  const navigate = useNavigate();

  const layers = [
    {
      number: '1',
      title: 'Opportunity',
      subtitle: 'האם יש כאן הזדמנות אמיתית?',
      items: ['X-Factor', 'יתרון תחרותי', 'חפיר עסקי', 'טכנולוגיה קשה לשכפול', 'שווקים בצמיחה', 'פוטנציאל שינוי מבני'],
      color: 'from-indigo-900/60 to-violet-900/40 border-indigo-500/20',
    },
    {
      number: '2',
      title: 'Validation',
      subtitle: 'כמה אפשר לסמוך על התזה?',
      items: ['ביצועים פיננסיים', 'הנהלה', 'מוסדיים', 'תזרים', 'חוב', 'עמידה בתחזיות', 'סיכונים גיאופוליטיים'],
      color: 'from-blue-900/60 to-cyan-900/40 border-blue-500/20',
    },
    {
      number: '3',
      title: 'Timing & Allocation',
      subtitle: 'מתי נכנסים וכמה מקצים?',
      items: ['פערי תמחור', 'מומנטום', 'Technical Structure', 'חזרה לממוצע', 'אזורי כניסה', 'יחס סיכוי-סיכון'],
      color: 'from-emerald-900/60 to-teal-900/40 border-emerald-500/20',
    },
    {
      number: '4',
      title: 'Thesis Monitoring',
      subtitle: 'האם משהו השתנה?',
      items: ['חדשות', 'דוחות', 'שינויי שוק', 'טריגרים עסקיים', 'שינויי סנטימנט', 'נקודות יציאה'],
      color: 'from-amber-900/60 to-orange-900/40 border-amber-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white" dir="rtl">

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight">RealValueX™</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/dashboard')}
              className="hidden sm:flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors"
            >
              <span>כניסה</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/onboarding')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold transition-all"
            >
              התחל עכשיו
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-sm mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span>36 פרקי ניתוח · 260 שאלות עומק · AI מבוסס Claude</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-6 leading-[1.15]">
          <span className="bg-gradient-to-r from-white via-indigo-200 to-violet-300 bg-clip-text text-transparent">
            פלטפורמת השקעות שחושבת<br className="hidden sm:block" /> כמו מנהל הון
          </span>
        </h1>

        <p className="text-lg text-white/40 max-w-2xl mx-auto mb-3 leading-relaxed">
          ומלווה כמו שותף אישי
        </p>

        <div className="max-w-2xl mx-auto mb-10 space-y-3 text-white/55 text-base leading-relaxed">
          <p>רוב פלטפורמות ההשקעה נותנות נתונים.<br />
          <span className="text-white/80 font-medium">RealValueX™ נבנתה כדי לעשות משהו אחר לגמרי.</span></p>
          <p>להבין את המשקיע שמאחורי המסך — ולעזור לו לקבל החלטות טובות יותר לאורך זמן.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/onboarding')}
            className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-900/40 transition-all hover:scale-105"
          >
            <span>בנה את הפרופיל שלך</span>
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => document.getElementById('how').scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm transition-all"
          >
            <span>איך זה עובד?</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how" className="max-w-5xl mx-auto px-4 sm:px-6 pb-24">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-white/5 mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">השקעות מתחילות באדם — לא במניה</h2>
          <p className="text-white/40 mb-6 leading-relaxed">
            לפני שמנתחים מניה, צריך להבין את המשקיע. לכן תהליך העבודה ב-RealValueX™ מתחיל ב-Onboarding חכם שממפה:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { emoji: '🎯', text: 'מטרות פיננסיות' },
              { emoji: '📅', text: 'אופק השקעה' },
              { emoji: '📊', text: 'רמת ניסיון' },
              { emoji: '🛡️', text: 'סיבולת סיכון' },
              { emoji: '😨', text: 'פחדים' },
              { emoji: '📈', text: 'ציפיות תשואה' },
              { emoji: '🧠', text: 'סגנון קבלת החלטות' },
              { emoji: '⚡', text: 'סגנון ניתוח' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5">
                <span>{item.emoji}</span>
                <span className="text-white/60 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-200/80 text-sm leading-relaxed">
              המטרה היא לא "לדחוף מניות" — אלא לבנות אסטרטגיה שמתאימה לאדם שמפעיל אותה.
            </p>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─── ENGINE ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-medium mb-4">המנוע שמאחורי המערכת</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">מודל RealValueX™</h2>
          <p className="text-white/40 max-w-xl mx-auto">מודל ניתוח השקעות מתקדם שפותח לאורך שנים ומשלב בין שלושה עולמות</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Zap, title: 'חשיבת Venture Capital', desc: 'זיהוי פוטנציאל לפני שהשוק מזהה אותו', color: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/30' },
            { icon: BarChart3, title: 'אנליזה מוסדית', desc: 'הבנת הפער בין מחיר לערך אמיתי', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30' },
            { icon: Target, title: 'ניהול הון מקצועי', desc: 'הקצאת הון חכמה, לא רק בחירת מניות', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30' },
          ].map(({ icon: Icon, title, desc, color }, i) => (
            <div key={i} className={`p-5 rounded-2xl bg-gradient-to-br border ${color} text-center`}>
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="font-bold text-white mb-1">{title}</div>
              <div className="text-white/40 text-sm">{desc}</div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { num: '36', label: 'פרקי ניתוח' },
            { num: '260+', label: 'שאלות עומק' },
            { num: '4', label: 'שכבות חשיבה' },
          ].map((s, i) => (
            <div key={i} className="text-center p-4 rounded-2xl bg-white/3 border border-white/5">
              <div className="text-3xl sm:text-4xl font-black text-white mb-1">{s.num}</div>
              <div className="text-white/35 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* ─── 4 LAYERS ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 text-xs font-medium mb-4">ארכיטקטורת הניתוח</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">ארבע שכבות החשיבה</h2>
          <p className="text-white/40 max-w-xl mx-auto">כל מניה עוברת ניתוח רב-שכבתי שמבטיח תמונה מלאה לפני קבלת החלטה</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {layers.map(l => <LayerCard key={l.number} {...l} />)}
        </div>
      </section>

      <SectionDivider />

      {/* ─── RUC ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-indigo-950 to-violet-950 border border-indigo-500/20">
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6">הפרמטר שמשנה את דרך החשיבה</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">Remaining Upside Capacity™</h2>
          <p className="text-white/50 mb-8 max-w-2xl leading-relaxed">
            רוב המשקיעים מסתכלים על מה שמניה כבר עשתה.<br />
            <span className="text-white/80">RealValueX™ מחשבת כמה עוד נשאר לה לעלות.</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { title: 'Repricing', desc: 'פער בין מחיר השוק לשווי ההוגן', color: 'border-indigo-500/30 bg-indigo-500/10' },
              { title: 'Business Growth', desc: 'צמיחה בהכנסות, רווחיות והתרחבות עסקית', color: 'border-violet-500/30 bg-violet-500/10' },
              { title: 'X-Factor', desc: 'שינוי מבני שהשוק עדיין לא מתמחר', color: 'border-amber-500/30 bg-amber-500/10' },
            ].map((item, i) => (
              <div key={i} className={`p-4 rounded-xl border ${item.color}`}>
                <div className="font-bold text-white mb-1">{item.title}</div>
                <div className="text-white/45 text-sm">{item.desc}</div>
              </div>
            ))}
          </div>
          {/* Scenarios */}
          <div className="border-t border-white/5 pt-6">
            <div className="text-white/40 text-sm mb-3 font-medium">כל השקעה נבחנת בשלושה תרחישים:</div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Bear 🐻', color: 'bg-rose-500/10 border-rose-500/20 text-rose-300' },
                { label: 'Base 📊', color: 'bg-blue-500/10 border-blue-500/20 text-blue-300' },
                { label: 'Bull 🚀', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' },
              ].map((s, i) => (
                <div key={i} className={`text-center p-3 rounded-xl border text-sm font-semibold ${s.color}`}>
                  {s.label}
                </div>
              ))}
            </div>
            <div className="mt-3 text-white/30 text-xs text-center">
              לכל תרחיש: הסתברות · Expected Value · Upside Potential
            </div>
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* ─── TYPE A/B/C ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-medium mb-4">סיווג השקעות</div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">שלושת סוגי ההשקעות</h2>
          <p className="text-white/40 max-w-xl mx-auto">הסיווג קובע אסטרטגיית כניסה, גודל פוזיציה, קצב הגדלה וStop Loss</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TypeCard
            type="TYPE A"
            titleHe="Re-Rating"
            descHe="השוק מתמחר את החברה בצורה שגויה."
            advantageHe="היתרון נמצא במחיר"
            color="from-rose-900/40 to-pink-900/30 border-rose-500/20"
            icon={TrendingUp}
          />
          <TypeCard
            type="TYPE B"
            titleHe="Structural Compounder"
            descHe="החברה בונה יתרון שמתחזק עם הזמן."
            advantageHe="המבנה העסקי ויכולת הצמיחה"
            color="from-indigo-900/40 to-blue-900/30 border-indigo-500/20"
            icon={BarChart3}
          />
          <TypeCard
            type="TYPE C"
            titleHe="Hybrid"
            descHe="שילוב בין דיסקאונט משמעותי למנועי צמיחה חזקים."
            advantageHe="גם מחיר וגם צמיחה"
            color="from-violet-900/40 to-purple-900/30 border-violet-500/20"
            icon={Star}
          />
        </div>
      </section>

      <SectionDivider />

      {/* ─── WHAT YOU GET ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">הרבה מעבר לניתוח מניות</h2>
          <p className="text-white/40">RealValueX™ מנהלת עבורך סביבת השקעה שלמה</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {[
            { emoji: '📊', text: 'ניתוח תיקי השקעות' },
            { emoji: '⭐', text: 'Wish List חכם' },
            { emoji: '📋', text: 'מעקב מניות שנמכרו' },
            { emoji: '🔍', text: 'זיהוי הזדמנויות' },
            { emoji: '🏆', text: 'דירוג מניות' },
            { emoji: '🏗️', text: 'בניית תיק מאפס' },
            { emoji: '🤖', text: 'ניתוח עומק AI' },
            { emoji: '💬', text: 'שאלות אינטראקטיביות' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/4 border border-white/5 hover:bg-white/7 transition-all">
              <span className="text-xl">{item.emoji}</span>
              <span className="text-white/60 text-sm">{item.text}</span>
            </div>
          ))}
        </div>

        {/* What it provides */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { icon: Shield, title: 'Structure', desc: 'שיטה ברורה לקבלת החלטות', color: 'text-indigo-400' },
            { icon: Eye, title: 'Information', desc: 'ניתוח עומק, נתונים, תזות וסיכונים', color: 'text-blue-400' },
            { icon: Brain, title: 'Guidance', desc: 'המלצות ותובנות מותאמות לסוג המשקיע שאתה', color: 'text-violet-400' },
          ].map(({ icon: Icon, title, desc, color }, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/4 border border-white/5 text-center">
              <Icon className={`w-6 h-6 ${color} mx-auto mb-3`} />
              <div className="font-bold text-white mb-1">{title}</div>
              <div className="text-white/40 text-sm">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <SectionDivider />

      {/* ─── WHAT WE DON'T DO ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/15">
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-rose-400" />
              <div className="font-bold text-white">מה RealValueX™ לא עושה</div>
            </div>
            <ul className="space-y-2.5">
              {['רודפת אחרי רעש', 'מוכרת חלומות', 'מספקת "טיפים חמים"'].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-white/45 text-sm">
                  <div className="w-1 h-1 rounded-full bg-rose-400/50 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/15">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <div className="font-bold text-white">מה היא כן עושה</div>
            </div>
            <p className="text-white/55 text-sm leading-relaxed">
              בונה ודאות הדרגתית סביב תזה ומקצה הון בהתאם.
            </p>
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
              <p className="text-emerald-200/70 text-xs leading-relaxed">
                ההבדל בין משקיע לבין מנהל הון אינו כמה מניות הוא מכיר — אלא כמה נכון הוא יודע להקצות לכל אחת.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center p-10 sm:p-16 rounded-3xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/20">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">RealValueX™</h2>
          <p className="text-indigo-300 text-lg font-medium mb-8">Capital Allocation Intelligence.</p>
          <button
            onClick={() => navigate('/onboarding')}
            className="group inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl font-bold text-lg shadow-2xl shadow-indigo-900/50 transition-all hover:scale-105"
          >
            <span>בנה את הפרופיל שלך</span>
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 text-center py-8 text-white/20 text-sm">
        RealValueX™ 2026 · Capital Allocation Intelligence · כל הזכויות שמורות
      </footer>

    </div>
  );
}