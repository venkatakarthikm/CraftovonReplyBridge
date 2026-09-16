import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Send, Link2, Zap, CheckCircle2, Circle, X, AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const CHECKLIST_STEPS = [
  { key: 'register', label: 'Create your account', done: true },
  { key: 'connect_ig', label: 'Connect Instagram' },
  { key: 'reels_imported', label: 'Import your reels' },
  { key: 'first_automation', label: 'Set up first automation' },
  { key: 'test_sent', label: 'Send a test DM' },
];

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [hideChecklist, setHideChecklist] = useState(() => localStorage.getItem('hide-onboarding') === 'true');
  
  const checklist = user?.onboarding?.checklist ?? [];
  const allDone = CHECKLIST_STEPS.every((s) => checklist.includes(s.key));

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data),
  });

  const { data: accounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['ig-accounts'],
    queryFn: () => api.get('/oauth/instagram/accounts').then((r) => r.data.data),
  });

  const stats = [
    {
      label: 'DMs Sent Today',
      value: analytics?.dmsSentToday ?? '—',
      icon: Send,
      iconColor: 'text-pink-500',
    },
    {
      label: 'Comments Matched',
      value: analytics?.commentsMatchedToday ?? '—',
      icon: MessageCircle,
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Link Taps',
      value: analytics?.linkTapsToday ?? '—',
      icon: Link2,
      iconColor: 'text-amber-500',
    },
    {
      label: 'Active Automations',
      value: analytics?.activeAutomations ?? '—',
      icon: Zap,
      iconColor: 'text-theme-text-primary',
    },
  ];

  return (
    <div className="layout-container py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-display-lg text-theme-text-primary mb-2 text-3xl">
          Good {getGreeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-theme-text-secondary">
          Here is your automation overview for today.
        </p>
      </div>

      {/* ── Onboarding checklist ── */}
      {!allDone && !hideChecklist && (
        <div className="card p-6 mb-8 border-theme-text-primary shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden animate-fade-in group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-ig" />
          
          <button 
            onClick={() => {
              setHideChecklist(true);
              localStorage.setItem('hide-onboarding', 'true');
            }}
            className="absolute top-4 right-4 p-1 rounded-md text-theme-text-secondary hover:bg-theme-border/50 hover:text-theme-text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="Dismiss checklist"
          >
             <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 ml-2">
            <div>
              <h2 className="text-title mb-1 text-xl">Quick Start Guide</h2>
              <p className="text-sm text-theme-text-secondary">
                Complete these steps to fully automate your first reel.
              </p>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs font-semibold text-theme-text-primary bg-theme-border/50 px-2.5 py-1 rounded-full border border-theme-border">
                 {checklist.length}/{CHECKLIST_STEPS.length} completed
               </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 ml-2">
            {CHECKLIST_STEPS.map((step, idx) => {
              const done = checklist.includes(step.key) || step.done;
              const isNext = !done && (idx === 0 || checklist.includes(CHECKLIST_STEPS[idx - 1]?.key ?? '') || CHECKLIST_STEPS[idx - 1]?.done === true);
              
              return (
                <div
                  key={step.key}
                  className={clsx(
                    "flex flex-col p-4 rounded-xl border transition-all duration-200",
                    done ? "bg-theme-bg border-theme-border/40 opacity-70" :
                    isNext ? "bg-theme-surface border-theme-border shadow-sm ring-1 ring-theme-text-primary/10 cursor-pointer hover:border-theme-text-primary/30" :
                    "bg-theme-bg border-theme-border/60 cursor-pointer hover:bg-theme-surface"
                  )}
                  onClick={() => {
                    if (!done && step.key === 'connect_ig') navigate('/settings');
                    if (!done && step.key === 'first_automation') navigate('/reels');
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    {done ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    ) : isNext ? (
                      <div className="w-6 h-6 rounded-full border-2 border-theme-text-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-theme-text-primary" />
                      </div>
                    ) : (
                      <Circle className="w-6 h-6 text-theme-text-secondary/30" strokeWidth={1.5} />
                    )}
                  </div>
                  <span className={clsx(
                    "text-sm font-semibold",
                    done ? "text-theme-text-secondary line-through" : "text-theme-text-primary"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, iconColor }) => (
          <div key={label} className="card p-5 animate-fade-in bg-theme-surface border-theme-border">
            <div className="flex justify-between items-start mb-4">
               <div className="w-10 h-10 rounded-xl bg-theme-border/50 flex items-center justify-center">
                 <Icon className={clsx('w-5 h-5', iconColor)} />
               </div>
            </div>
            <p className="font-display text-4xl font-semibold tracking-tight text-theme-text-primary mb-1">{analyticsLoading ? '...' : value}</p>
            <p className="text-sm font-medium text-theme-text-secondary">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* ── Charts ── */}
        <div className="card p-6 lg:col-span-2 bg-theme-surface border-theme-border min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-title text-xl">Top Automations Performance</h2>
             <BarChart3 className="w-5 h-5 text-theme-text-secondary" />
          </div>
          {analyticsLoading ? (
            <div className="h-[300px] flex items-center justify-center text-theme-text-secondary">Loading...</div>
          ) : analytics?.byAutomation && analytics.byAutomation.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.byAutomation} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'rgb(var(--color-text-primary))' }}
                  />
                  <Legend />
                  <Bar dataKey="dmsSent" name="DMs Sent" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="linkTaps" name="Link Taps" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="h-[300px] flex flex-col items-center justify-center text-theme-text-secondary border-2 border-dashed border-theme-border rounded-xl">
                <BarChart3 className="w-8 h-8 mb-3 opacity-50" />
                <p>No automation data yet.</p>
             </div>
          )}
        </div>

        {/* ── Account Health ── */}
        <div className="card p-6 bg-theme-surface border-theme-border">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-title text-xl">Account Health</h2>
             <RefreshCw className={clsx("w-4 h-4 text-theme-text-secondary cursor-pointer", accountsLoading && "animate-spin")} />
          </div>
          
          <div className="space-y-4">
            {accountsLoading ? (
              <div className="animate-pulse bg-theme-border/50 h-16 w-full rounded-xl" />
            ) : accounts && accounts.length > 0 ? (
              accounts.map((acc: any) => (
                <div key={acc._id} className="flex items-center gap-3 p-4 rounded-xl border border-theme-border bg-theme-bg">
                  <div className="w-10 h-10 rounded-full bg-gradient-ig p-[2px]">
                    <img src={acc.profilePictureUrl || 'https://via.placeholder.com/150'} alt={acc.username} className="w-full h-full rounded-full border-2 border-theme-bg object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-theme-text-primary truncate">@{acc.username}</p>
                    <p className="text-xs text-theme-text-secondary truncate">{acc.accountName || 'Instagram'}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {acc.status === 'active' ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-red-500/10 text-red-500 border border-red-500/20">
                        <AlertCircle className="w-3 h-3" />
                        Disconnected
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 px-4 border border-dashed border-theme-border rounded-xl">
                <p className="text-sm text-theme-text-secondary mb-3">No accounts connected</p>
                <button onClick={() => navigate('/settings')} className="btn-secondary text-xs py-1.5 px-3">Connect Account</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div className="grid grid-cols-1">
        <div className="card p-6 bg-theme-surface border-theme-border">
          <div className="flex items-center justify-between mb-6">
             <h2 className="text-title text-xl">Recent DMs</h2>
             <span className="text-label flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live
             </span>
          </div>
          <RecentActivity messages={analytics?.recentMessages} isLoading={analyticsLoading} />
        </div>
      </div>
    </div>
  );
}

function RecentActivity({ messages, isLoading }: { messages: any[], isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-theme-border/50 h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!messages?.length) {
    return (
      <div className="text-center py-12">
        <Send className="w-10 h-10 mx-auto mb-4 text-theme-text-secondary/30" />
        <p className="text-sm font-medium text-theme-text-primary">No DMs sent yet.</p>
        <p className="text-xs text-theme-text-secondary mt-1">Set up your first automation on the Reels page.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {messages.slice(0, 6).map((msg: Record<string, unknown>, i: number) => (
        <div key={i} className="flex flex-col gap-3 p-4 rounded-xl border border-theme-border bg-theme-bg hover:border-theme-text-primary/30 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-ig p-[1px] flex-shrink-0">
                 <div className="w-full h-full bg-theme-surface rounded-full flex items-center justify-center text-xs font-bold text-theme-text-primary">
                   {String(msg['recipientId'] ?? '?').slice(-2)}
                 </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-theme-text-primary truncate">User {String(msg['recipientId'] ?? '').slice(0, 5)}...</p>
                <p className="text-xs text-theme-text-secondary mt-0.5">{new Date(String(msg['createdAt'])).toLocaleString()}</p>
              </div>
            </div>
            <span className={clsx(
              "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border",
              msg['status'] === 'sent' 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                : "bg-red-500/10 text-red-500 border-red-500/20"
            )}>
              {String(msg['status'] ?? 'pending')}
            </span>
          </div>
          
          <div className="mt-1 p-3 rounded-lg bg-theme-surface border border-theme-border/50 text-sm text-theme-text-secondary">
             <div className="flex gap-2 items-center mb-1">
               <MessageCircle className="w-3.5 h-3.5" /> 
               <span className="font-medium text-theme-text-primary">Comment Match</span>
             </div>
             <p className="line-clamp-2 pl-5">Automated reply triggered via IG DM for keyword match.</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
