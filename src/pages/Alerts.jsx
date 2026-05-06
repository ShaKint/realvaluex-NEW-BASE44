import { useState, useEffect } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { Bell, Plus, Trash2, ToggleLeft, ToggleRight, TrendingUp, TrendingDown, AlertTriangle, Newspaper } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const ALERT_TYPES = {
  he: [
    { key: 'price_above', label: 'מחיר מעל', icon: TrendingUp, color: 'text-emerald-400' },
    { key: 'price_below', label: 'מחיר מתחת', icon: TrendingDown, color: 'text-rose-400' },
    { key: 'percent_change', label: 'שינוי % יומי', icon: AlertTriangle, color: 'text-amber-400' },
    { key: 'earnings', label: 'דוח רווחים', icon: Newspaper, color: 'text-indigo-400' },
  ],
  en: [
    { key: 'price_above', label: 'Price Above', icon: TrendingUp, color: 'text-emerald-400' },
    { key: 'price_below', label: 'Price Below', icon: TrendingDown, color: 'text-rose-400' },
    { key: 'percent_change', label: 'Daily % Change', icon: AlertTriangle, color: 'text-amber-400' },
    { key: 'earnings', label: 'Earnings Report', icon: Newspaper, color: 'text-indigo-400' },
  ],
};

const needsValue = (type) => ['price_above', 'price_below', 'percent_change'].includes(type);

export default function Alerts() {
  const { lang } = useLang();
  const [alerts, setAlerts] = useState([]);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: '', alert_type: 'price_above', target_value: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u) {
        base44.entities.Alert.filter({ user_id: u.id }).then(data => {
          setAlerts(data || []);
          setLoading(false);
        });
      }
    });
  }, []);

  const addAlert = async () => {
    if (!form.ticker || !form.alert_type) return;
    setSaving(true);
    const created = await base44.entities.Alert.create({
      user_id: user.id,
      ticker: form.ticker.toUpperCase(),
      alert_type: form.alert_type,
      target_value: form.target_value ? parseFloat(form.target_value) : null,
      notes: form.notes,
      is_active: true,
      triggered: false,
    });
    setAlerts(prev => [created, ...prev]);
    setForm({ ticker: '', alert_type: 'price_above', target_value: '', notes: '' });
    setShowForm(false);
    setSaving(false);
  };

  const toggleAlert = async (alert) => {
    const updated = await base44.entities.Alert.update(alert.id, { is_active: !alert.is_active });
    setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_active: !a.is_active } : a));
  };

  const deleteAlert = async (id) => {
    await base44.entities.Alert.delete(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const activeAlerts = alerts.filter(a => a.is_active && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);
  const inactiveAlerts = alerts.filter(a => !a.is_active && !a.triggered);

  const AlertTypeInfo = ({ type }) => {
    const found = ALERT_TYPES[lang].find(t => t.key === type);
    if (!found) return null;
    const Icon = found.icon;
    return <span className={`flex items-center gap-1 text-xs ${found.color}`}><Icon className="w-3.5 h-3.5" />{found.label}</span>;
  };

  const AlertCard = ({ alert }) => (
    <div className={`p-4 rounded-2xl border transition-all ${alert.triggered ? 'bg-amber-500/5 border-amber-500/20' : alert.is_active ? 'bg-white/5 border-white/5 hover:border-white/10' : 'bg-white/2 border-white/5 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${alert.triggered ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-white'}`}>
            {alert.ticker?.slice(0, 4)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">{alert.ticker}</span>
              {alert.triggered && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">{lang === 'he' ? 'הופעלה!' : 'Triggered!'}</span>}
            </div>
            <AlertTypeInfo type={alert.alert_type} />
            {alert.target_value && (
              <div className="text-white/40 text-xs mt-0.5">
                {alert.alert_type === 'percent_change' ? `${alert.target_value}%` : `$${alert.target_value}`}
              </div>
            )}
            {alert.notes && <div className="text-white/30 text-xs mt-1">{alert.notes}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toggleAlert(alert)} className="text-white/30 hover:text-white transition-colors">
            {alert.is_active ? <ToggleRight className="w-5 h-5 text-indigo-400" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => deleteAlert(alert.id)} className="text-white/20 hover:text-rose-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{lang === 'he' ? 'התראות' : 'Alerts'}</h1>
              <p className="text-white/35 text-xs">{lang === 'he' ? 'התראות מחיר ואירועים' : 'Price & event alerts'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            {lang === 'he' ? 'הוסף התראה' : 'Add Alert'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <div className="text-white font-medium text-sm">{lang === 'he' ? 'התראה חדשה' : 'New Alert'}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-white/40 text-xs mb-1.5">{lang === 'he' ? 'סימול מניה' : 'Ticker Symbol'}</div>
                <input
                  value={form.ticker}
                  onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>
              <div>
                <div className="text-white/40 text-xs mb-1.5">{lang === 'he' ? 'סוג התראה' : 'Alert Type'}</div>
                <select
                  value={form.alert_type}
                  onChange={e => setForm(f => ({ ...f, alert_type: e.target.value }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  {ALERT_TYPES[lang].map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
            </div>
            {needsValue(form.alert_type) && (
              <div>
                <div className="text-white/40 text-xs mb-1.5">
                  {form.alert_type === 'percent_change'
                    ? (lang === 'he' ? 'שינוי % (לדוגמה: 5 או -5)' : 'Change % (e.g. 5 or -5)')
                    : (lang === 'he' ? 'מחיר יעד ($)' : 'Target Price ($)')}
                </div>
                <input
                  type="number"
                  value={form.target_value}
                  onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                  placeholder={form.alert_type === 'percent_change' ? '5' : '150.00'}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
            <div>
              <div className="text-white/40 text-xs mb-1.5">{lang === 'he' ? 'הערות (אופציונלי)' : 'Notes (optional)'}</div>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={lang === 'he' ? 'למה הגדרת התראה זו?' : 'Why did you set this alert?'}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors">
                {lang === 'he' ? 'ביטול' : 'Cancel'}
              </button>
              <button
                onClick={addAlert}
                disabled={saving || !form.ticker}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
              >
                {saving ? '...' : (lang === 'he' ? 'שמור התראה' : 'Save Alert')}
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: lang === 'he' ? 'פעילות' : 'Active', count: activeAlerts.length, color: 'text-emerald-400' },
            { label: lang === 'he' ? 'הופעלו' : 'Triggered', count: triggeredAlerts.length, color: 'text-amber-400' },
            { label: lang === 'he' ? 'כבויות' : 'Paused', count: inactiveAlerts.length, color: 'text-white/30' },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-white/30 text-xs mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alert Lists */}
        {loading ? (
          <div className="text-center py-12 text-white/30 text-sm">{lang === 'he' ? 'טוען...' : 'Loading...'}</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <div className="text-white/30 text-sm">{lang === 'he' ? 'אין התראות עדיין. לחץ "הוסף התראה" כדי להתחיל.' : 'No alerts yet. Click "Add Alert" to start.'}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {triggeredAlerts.length > 0 && (
              <div>
                <div className="text-amber-400/60 text-xs uppercase tracking-widest mb-2">{lang === 'he' ? 'הופעלו' : 'Triggered'}</div>
                <div className="space-y-2">{triggeredAlerts.map(a => <AlertCard key={a.id} alert={a} />)}</div>
              </div>
            )}
            {activeAlerts.length > 0 && (
              <div>
                <div className="text-white/25 text-xs uppercase tracking-widest mb-2">{lang === 'he' ? 'פעילות' : 'Active'}</div>
                <div className="space-y-2">{activeAlerts.map(a => <AlertCard key={a.id} alert={a} />)}</div>
              </div>
            )}
            {inactiveAlerts.length > 0 && (
              <div>
                <div className="text-white/20 text-xs uppercase tracking-widest mb-2">{lang === 'he' ? 'כבויות' : 'Paused'}</div>
                <div className="space-y-2">{inactiveAlerts.map(a => <AlertCard key={a.id} alert={a} />)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}