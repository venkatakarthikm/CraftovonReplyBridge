// apps/web/src/pages/app/Analytics.tsx
// Analytics: date range, Recharts line chart (DMs/day), per-automation table
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../../api/client.js';

export default function Analytics() {
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  const from = new Date(Date.now() - (range === '7d' ? 7 : range === '30d' ? 30 : 90) * 86400000).toISOString();
  const to = new Date().toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', from, to],
    queryFn: () => api.get('/analytics/overview', { params: { from, to } }).then((r) => r.data.data),
  });

  const chartData = data?.daily ?? generatePlaceholderData(range === '7d' ? 7 : range === '30d' ? 30 : 90);

  return (
    <div className="section-padding max-w-5xl mx-auto" id="tour-analytics">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-white/50 text-sm mt-0.5">Track your automation performance</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Range picker */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  range === r ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {/* CSV export */}
          <a
            href={`${(import.meta as any).env.VITE_API_URL || '/api/v1'}/analytics/export.csv`}
            className="btn-secondary"
            download
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'DMs Sent', value: data?.totalDmsSent ?? '—', trend: '+12%', color: 'text-brand-400' },
          { label: 'Link Taps', value: data?.totalLinkTaps ?? '—', trend: '+8%', color: 'text-amber-400' },
          { label: 'Click Rate', value: data?.ctr ?? '—', trend: '+3%', color: 'text-emerald-400' },
        ].map(({ label, value, trend, color }) => (
          <div key={label} className="stat-card">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-white/50">{label}</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {trend} vs last period
            </p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="card p-6 mb-6">
        <h2 className="section-title mb-6">DMs over time</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: '#1a1a3e',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '12px',
                color: '#e2e8f0',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
            <Line type="monotone" dataKey="dmsSent" stroke="#6366f1" strokeWidth={2} dot={false} name="DMs Sent" />
            <Line type="monotone" dataKey="linkTaps" stroke="#f59e0b" strokeWidth={2} dot={false} name="Link Taps" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Per-automation table */}
      <div className="card p-6">
        <h2 className="section-title mb-4">By automation</h2>
        <AutomationTable automations={data?.byAutomation ?? []} />
      </div>
    </div>
  );
}

function AutomationTable({ automations }: { automations: Record<string, unknown>[] }) {
  if (!automations.length) {
    return <p className="text-center text-white/30 py-8 text-sm">No automation data yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/40 text-xs border-b border-white/8">
            <th className="text-left pb-3 font-medium">Automation</th>
            <th className="text-right pb-3 font-medium">Matched</th>
            <th className="text-right pb-3 font-medium">DMs Sent</th>
            <th className="text-right pb-3 font-medium">Link Taps</th>
            <th className="text-right pb-3 font-medium">CTR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {automations.map((a, i) => (
            <tr key={i} className="hover:bg-white/3">
              <td className="py-3 text-white font-medium">{String(a['name'] ?? 'Automation')}</td>
              <td className="py-3 text-right text-white/70">{String(a['commentsMatched'] ?? 0)}</td>
              <td className="py-3 text-right text-white/70">{String(a['dmsSent'] ?? 0)}</td>
              <td className="py-3 text-right text-amber-400">{String(a['linkTaps'] ?? 0)}</td>
              <td className="py-3 text-right text-emerald-400">
                {a['dmsSent'] ? `${Math.round((Number(a['linkTaps'] ?? 0) / Number(a['dmsSent'])) * 100)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function generatePlaceholderData(days: number) {
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    dmsSent: 0,
    linkTaps: 0,
  }));
}
