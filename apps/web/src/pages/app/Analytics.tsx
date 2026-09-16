import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, TrendingUp, Calendar, MousePointerClick, MessageCircle, Send } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../../api/client.js';
import { clsx } from 'clsx';

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
    <div className="layout-container py-8 max-w-5xl" id="tour-analytics">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-display-lg text-theme-text-primary mb-2 text-3xl">Analytics</h1>
          <p className="text-sm text-theme-text-secondary">Track the performance of your automated DMs.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Range picker */}
          <div className="flex items-center p-1 rounded-xl bg-theme-surface border border-theme-border shadow-sm">
             <Calendar className="w-4 h-4 text-theme-text-secondary ml-3 mr-2 hidden sm:block" />
            {(['7d', '30d', '90d'] as const).map((r) => {
              const label = r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days';
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={clsx(
                    'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
                    range === r 
                      ? 'bg-theme-bg text-theme-text-primary shadow-sm border border-theme-border/50' 
                      : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg/50'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          
          {/* CSV export */}
          <a
            href={`${(import.meta as any).env.VITE_API_URL || '/api/v1'}/analytics/export.csv`}
            className="btn-secondary py-2"
            download
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'DMs Sent', value: data?.totalDmsSent ?? '—', trend: '+12%', icon: Send, trendColor: 'text-emerald-500' },
          { label: 'Link Taps', value: data?.totalLinkTaps ?? '—', trend: '+8%', icon: MousePointerClick, trendColor: 'text-emerald-500' },
          { label: 'Click Rate', value: data?.ctr ?? '—', trend: '+3%', icon: TrendingUp, trendColor: 'text-emerald-500' },
        ].map(({ label, value, trend, icon: Icon, trendColor }) => (
          <div key={label} className="card p-6 animate-fade-in group hover:border-theme-text-primary/30 transition-colors">
             <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-theme-bg border border-theme-border flex items-center justify-center text-theme-text-primary shadow-sm">
                   <Icon className="w-5 h-5" />
                </div>
             </div>
            <p className="text-display-lg text-theme-text-primary text-4xl mb-2">{value}</p>
            <div className="flex items-center justify-between">
               <p className="text-sm font-semibold text-theme-text-secondary">{label}</p>
               <p className={clsx("text-xs font-bold flex items-center gap-1", trendColor)}>
                 <TrendingUp className="w-3 h-3" /> {trend}
               </p>
            </div>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="card p-6 mb-8">
        <h2 className="text-title text-xl mb-6">Activity over time</h2>
        
        {isLoading ? (
           <div className="w-full h-[300px] animate-pulse bg-theme-border/50 rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis 
                 dataKey="date" 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500 }} 
                 dy={10}
              />
              <YAxis 
                 axisLine={false} 
                 tickLine={false} 
                 tick={{ fill: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500 }} 
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)'
                }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 2 }}
              />
              <Legend 
                 wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}
                 iconType="circle"
              />
              <Line type="monotone" dataKey="dmsSent" stroke="#E1306C" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#E1306C', stroke: 'var(--color-surface)', strokeWidth: 2 }} name="DMs Sent" />
              <Line type="monotone" dataKey="linkTaps" stroke="#F77737" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#F77737', stroke: 'var(--color-surface)', strokeWidth: 2 }} name="Link Taps" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-automation table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-theme-border flex items-center justify-between">
           <h2 className="text-title text-xl">By automation</h2>
           <button className="text-xs font-semibold text-theme-text-secondary hover:text-theme-text-primary transition-colors flex items-center gap-1">
              View All <TrendingUp className="w-3 h-3" />
           </button>
        </div>
        <AutomationTable automations={data?.byAutomation ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}

function AutomationTable({ automations, isLoading }: { automations: Record<string, unknown>[], isLoading: boolean }) {
  if (isLoading) {
    return (
       <div className="p-6 space-y-4">
         {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-12 bg-theme-border/50 rounded-xl" />)}
       </div>
    );
  }

  if (!automations.length) {
    return (
       <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="w-10 h-10 text-theme-text-secondary/30 mb-4" />
          <p className="text-sm font-semibold text-theme-text-primary">No automation data yet.</p>
          <p className="text-xs text-theme-text-secondary mt-1">Check back after your automations fire.</p>
       </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-theme-bg/50">
          <tr className="text-xs text-theme-text-secondary font-semibold uppercase tracking-wider">
            <th className="px-6 py-4">Automation</th>
            <th className="px-6 py-4 text-right">Matched</th>
            <th className="px-6 py-4 text-right">DMs Sent</th>
            <th className="px-6 py-4 text-right">Link Taps</th>
            <th className="px-6 py-4 text-right">CTR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-theme-border">
          {automations.map((a, i) => (
            <tr key={i} className="hover:bg-theme-bg transition-colors">
              <td className="px-6 py-4 text-theme-text-primary font-semibold">{String(a['name'] ?? 'Automation')}</td>
              <td className="px-6 py-4 text-right text-theme-text-secondary font-medium">{String(a['commentsMatched'] ?? 0)}</td>
              <td className="px-6 py-4 text-right text-theme-text-secondary font-medium">{String(a['dmsSent'] ?? 0)}</td>
              <td className="px-6 py-4 text-right font-bold bg-clip-text text-transparent bg-gradient-ig">
                {String(a['linkTaps'] ?? 0)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-emerald-500">
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
