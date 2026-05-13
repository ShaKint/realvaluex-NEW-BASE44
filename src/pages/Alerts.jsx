**להחליף: `src/pages/Alerts.jsx`**

נתיב: https://github.com/ShaKint/realvaluex-NEW-BASE44/blob/main/src/pages/Alerts.jsx

תוכן:

```jsx
// src/pages/Alerts.jsx
// FULL REWRITE: base44.entities.Alert → supabase.from('alerts')
// base44.auth.me() → useAuth() context

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
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
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ticker: '', alert_type: 'price_above', target_value: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error) setAlerts(data || []);
      setLoading(false);
    })();
  }, [user]);

  const addAlert = async () => {
    if (!form.ticker || !form.alert_type || !user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        ticker: form.ticker.toUpperCase(),
        alert_type: form.alert_type,
        target_value: form.target_value ? parseFloat(form.target_value) : null,
        notes: form.notes || null,
        is_active: true,
        triggered: false,
      })
      .select()
      .single();
    if (!error && data) setAlerts(prev => [data, ...prev]);
    setForm({ ticker: '', alert_type: 'price_above', target_value: '', notes: '' });
    setShowForm(false);
    setSaving(false);
  };

  const toggleAlert = async (alert) => {
    const newVal = !alert.is_active;
    const { error } = await supabase
      .from('alerts')
      .update({ is_active: newVal })
      .eq('id', alert.id);
    if (!error) setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_active: newVal } : a));
  };

  const deleteAlert = async (id) => {
    const { error } = await supabase.from('alerts').delete().eq('id', id);
    if (!error) setAlerts(prev => prev.filter(a => a.id !== id));
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
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'he' ? 'חדש' : 'New'}</span>
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
            <input
              type="text"
              value={form.ticker}
              onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))}
              placeholder={lang === 'he' ? 'סמל מניה (AAPL)' : 'Ticker (AAPL)'}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
            />
            <select
              value={form.alert_type}
              onChange={e => setForm(f => ({ ...f, alert_type: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
            >
              {ALERT_TYPES[lang].map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            {needsValue(form.alert_type) && (
              <input
                type="number"
                value={form.target_value}
                onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
                placeholder={lang === 'he' ? 'ערך יעד' : 'Target value'}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
              />
            )}
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={lang === 'he' ? 'הערות (אופציונלי)' : 'Notes (optional)'}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={addAlert}
              disabled={saving || !form.ticker}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold transition-all text-sm"
            >
              {saving ? (lang === 'he' ? 'שומר...' : 'Saving...') : (lang === 'he' ? 'צור התראה' : 'Create Alert')}
            </button>
          </div>
        )}

        {loading && <div className="text-center py-12 text-white/40">{lang === 'he' ? 'טוען...' : 'Loading...'}</div>}

        {!loading && alerts.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">
            {lang === 'he' ? 'אין התראות עדיין. צור התראה ראשונה!' : 'No alerts yet. Create your first alert!'}
          </div>
        )}

        {triggeredAlerts.length > 0 && (
          <div>
            <h3 className="text-amber-400 text-xs uppercase tracking-widest mb-3">{lang === 'he' ? `הופעלו (${triggeredAlerts.length})` : `Triggered (${triggeredAlerts.length})`}</h3>
            <div className="space-y-2">{triggeredAlerts.map(a => <AlertCard key={a.id} alert={a} />)}</div>
          </div>
        )}

        {activeAlerts.length > 0 && (
          <div>
            <h3 className="text-white/40 text-xs uppercase tracking-widest mb-3">{lang === 'he' ? `פעילות (${activeAlerts.length})` : `Active (${activeAlerts.length})`}</h3>
            <div className="space-y-2">{activeAlerts.map(a => <AlertCard key={a.id} alert={a} />)}</div>
          </div>
        )}

        {inactiveAlerts.length > 0 && (
          <div>
            <h3 className="text-white/25 text-xs uppercase tracking-widest mb-3">{lang === 'he' ? `כבויות (${inactiveAlerts.length})` : `Inactive (${inactiveAlerts.length})`}</h3>
            <div className="space-y-2">{inactiveAlerts.map(a => <AlertCard key={a.id} alert={a} />)}</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
```
