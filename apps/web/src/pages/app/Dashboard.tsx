// apps/web/src/pages/app/Dashboard.tsx
// Dashboard: stat cards, onboarding checklist, recent activity feed
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Send, Link2, Zap, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { useNavigate } from 'react-router-dom';

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
  const checklist = user?.onboarding?.checklist ?? [];
  const allDone = CHECKLIST_STEPS.every((s) => checklist.includes(s.key));

  const { data: analytics } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data),
  });

  const stats = [
    {
      label: 'DMs Sent Today',
      value: analytics?.dmsSentToday ?? '—',
      icon: Send,
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
    },
    {
      label: 'Comments Matched',
      value: analytics?.commentsMatchedToday ?? '—',
      icon: MessageCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Link Taps',
      value: analytics?.linkTapsToday ?? '—',
      icon: Link2,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Active Automations',
      value: analytics?.activeAutomations ?? '—',
      icon: Zap,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
  ];

  return (
    <div className="section-padding max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Good {getGreeting()}, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Here's what's happening with your automations today.
        </p>
      </div>

      {/* ── Onboarding checklist (pinned until complete) ── */}
      {!allDone && (
        <div className="card p-6 mb-8 border-brand-500/30 bg-gradient-card animate-fade-in">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="section-title">Get started 🚀</h2>
              <p className="section-subtitle mt-0.5">
                Complete these steps to unlock your 14-day Pro trial.
              </p>
            </div>
            <span className="badge badge-purple">
              {checklist.length}/{CHECKLIST_STEPS.length} done
            </span>
          </div>

          <div className="space-y-3">
            {CHECKLIST_STEPS.map((step) => {
              const done = checklist.includes(step.key) || step.done;
              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-150 ${done ? 'opacity-60' : 'hover:bg-white/5 cursor-pointer'}`}
                  onClick={() => {
                    if (!done && step.key === 'connect_ig') navigate('/settings');
                    if (!done && step.key === 'first_automation') navigate('/reels');
                  }}
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-white/25 flex-shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${done ? 'line-through text-white/40' : 'text-white'}`}>
                    {step.label}
                  </span>
                  {!done && <ChevronRight className="w-4 h-4 text-white/25 ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="stat-card animate-fade-in">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-1`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/50">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Recent activity ── */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Recent Activity</h2>
        <RecentActivity />
      </div>
    </div>
  );
}

function RecentActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ['recent-messages'],
    queryFn: () => api.get('/analytics/overview').then((r) => r.data.data?.recentMessages ?? []),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12 text-white/30">
        <Send className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No DMs sent yet.</p>
        <p className="text-xs mt-1">Set up your first automation on the Reels page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((msg: Record<string, unknown>, i: number) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-xs text-brand-300 font-bold flex-shrink-0">
            {String(msg['recipientId'] ?? '?').slice(-2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white truncate">{String(msg['type'] ?? '')}</p>
            <p className="text-xs text-white/40">{String(msg['status'] ?? '')}</p>
          </div>
          <span className={`badge ml-auto flex-shrink-0 ${msg['status'] === 'sent' ? 'badge-green' : 'badge-red'}`}>
            {String(msg['status'] ?? '')}
          </span>
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
