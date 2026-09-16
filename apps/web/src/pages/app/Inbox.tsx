import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox as InboxIcon, Clock, CheckCircle2, Send, X, MessageSquare, Loader2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { clsx } from 'clsx';

const STAGE_BADGE: Record<string, { label: string; className: string; icon?: React.ElementType }> = {
  awaiting_user_reply: { label: 'Awaiting reply', className: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Loader2 },
  sent_get_link: { label: 'Link sent', className: 'text-brand-500 bg-brand-500/10 border-brand-500/20', icon: Send },
  completed: { label: 'Completed', className: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  closed: { label: 'Closed', className: 'text-theme-text-secondary bg-theme-border/50 border-theme-border' },
};

export default function Inbox() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: () => api.get('/inbox').then((r) => r.data.data),
    refetchInterval: 30_000, // poll every 30s
  });

  const closeMutation = useMutation({
    mutationFn: (participantId: string) => api.post(`/inbox/${participantId}/close`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox'] }),
  });

  return (
    <div className="layout-container py-8 max-w-4xl" id="tour-inbox">
      <div className="mb-8">
        <h1 className="text-display-lg text-theme-text-primary mb-2 text-3xl">Inbox</h1>
        <p className="text-sm text-theme-text-secondary">
          Track live automations in progress. No cold DMs.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="animate-pulse bg-theme-border/50 h-24 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && !data?.length && (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in border border-dashed border-theme-border rounded-3xl bg-theme-surface/50">
          <div className="w-16 h-16 rounded-2xl bg-theme-border/50 flex items-center justify-center mb-6">
             <InboxIcon className="w-8 h-8 text-theme-text-secondary" />
          </div>
          <h3 className="text-title text-theme-text-primary mb-2 text-xl">Inbox is quiet</h3>
          <p className="text-sm text-theme-text-secondary max-w-sm">
            Active conversations will appear here instantly when someone interacts with your reels.
          </p>
        </div>
      )}

      {data?.length > 0 && (
        <div className="space-y-4">
          {data.map((conv: Record<string, unknown>) => {
            const stage = String(conv['stage'] ?? 'closed');
            const badge = STAGE_BADGE[stage] ?? STAGE_BADGE['closed']!;
            const BadgeIcon = badge.icon;

            return (
              <div key={String(conv['_id'])} className="card p-5 flex items-center gap-5 hover:border-theme-text-primary/30 hover:shadow-surface transition-all group">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-ig p-[1px] flex-shrink-0">
                  <div className="w-full h-full bg-theme-surface rounded-full flex items-center justify-center font-bold text-theme-text-primary">
                    {String(conv['participantId'] ?? '?').slice(-2).toUpperCase()}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-base font-semibold text-theme-text-primary truncate">
                      @{String(conv['participantId'] ?? 'unknown')}
                    </p>
                    <span className={clsx("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide", badge.className)}>
                      {BadgeIcon && <BadgeIcon className={clsx("w-3 h-3", stage === 'awaiting_user_reply' && "animate-spin")} />}
                      {badge.label}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-theme-text-secondary">
                    <span className="flex items-center gap-1.5 bg-theme-bg px-2 py-1 rounded-md border border-theme-border">
                      <MessageSquare className="w-3.5 h-3.5" />
                      From Comment
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Last active: {formatRelative(String(conv['lastInboundAt'] ?? ''))}
                    </span>
                  </div>
                </div>

                {/* Close button */}
                {stage !== 'completed' && stage !== 'closed' && (
                  <button
                    onClick={() => closeMutation.mutate(String(conv['participantId']))}
                    className="p-2 rounded-xl text-theme-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Close conversation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRelative(dateStr: string) {
  if (!dateStr) return 'unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
