import { useLang } from '@/lib/LanguageContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';

const generateData = (days, base, trend) => {
  const data = [];
  let val = base;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    val = val + (Math.random() - 0.45) * (base * 0.025) + trend;
    data.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(val),
    });
  }
  return data;
};

const RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
];

export default function PortfolioChart() {
  const { lang } = useLang();
  const [range, setRange] = useState(1);

  const data = generateData(RANGES[range].days, 100000, 80);
  const start = data[0].value;
  const end = data[data.length - 1].value;
  const change = end - start;
  const changePct = ((change / start) * 100).toFixed(2);
  const isUp = change >= 0;

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-white/40 text-xs mb-1">{lang === 'he' ? 'שווי תיק' : 'Portfolio Value'}</div>
          <div className="text-2xl font-bold text-white">${end.toLocaleString()}</div>
          <div className={`text-sm mt-0.5 font-medium ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? '+' : ''}{change.toLocaleString()} ({isUp ? '+' : ''}{changePct}%)
          </div>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRange(i)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                range === i ? 'bg-indigo-600 text-white' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUp ? '#6366f1' : '#f43f5e'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={isUp ? '#6366f1' : '#f43f5e'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
            formatter={(v) => [`$${v.toLocaleString()}`, lang === 'he' ? 'שווי' : 'Value']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isUp ? '#6366f1' : '#f43f5e'}
            strokeWidth={2}
            fill="url(#portGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}