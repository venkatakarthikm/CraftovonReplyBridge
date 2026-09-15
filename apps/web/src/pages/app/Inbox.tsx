// apps/web/src/pages/app/Inbox.tsx
// Inbox: active conversation states with stage badges
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox as InboxIcon, Clock, CheckCircle2, Send, X } from 'lucide-react';
import { api } from '../../api/client.js';

const STAGE_BADGE: Record<string, { label: string; className: string }> = {
  awaiting_user_reply: { label: 'Awaiting reply', className: 'badge-amber' },
  sent_get_link: { label: 'Link sent', className: 'badge-blue' },
  completed: { label: 'Completed', className: 'badge-green' },
  closed: { label: 'Closed', className: 'badge-gray' },
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
    <div className="section-padding max-w-3xl mx-auto" id="tour-inbox">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Inbox</h1>
        <p className="text-white/50 text-sm mt-0.5">
          Active conversations. Nobody gets messaged without an open window — we never cold-DM.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      )}

      {!isLoading && !data?.length && (
        <div className="text-center py-24 animate-fade-in">
          <InboxIcon className="w-14 h-14 mx-auto mb-4 text-white/20" />
          <h3 className="text-lg font-semibold text-white mb-2">No active conversations</h3>
          <p className="text-white/40 text-sm">
            When someone comments and your automation fires, they'll appear here.
          </p>
        </div>
      )}

      {data?.length > 0 && (
        <div className="space-y-3">
          {data.map((conv: Record<string, unknown>) => {
            const stage = String(conv['stage'] ?? 'closed');
            const badge = STAGE_BADGE[stage] ?? STAGE_BADGE['closed']!;

            return (
              <div key={String(conv['_id'])} className="card-hover p-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-300 font-bold text-sm flex-shrink-0">
                  {String(conv['participantId'] ?? '?').slice(-2)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-white truncate">
                      @{String(conv['participantId'] ?? 'unknown')}
                    </p>
                    <span className={`badge ${badge.className}`}>{badge.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelative(String(conv['lastInboundAt'] ?? ''))}
                    </span>
                    {conv['sourceCommentId'] && (
                      <span className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        From comment
                      </span>
                    )}
                  </div>
                </div>

                {/* Close button */}
                {stage !== 'completed' && stage !== 'closed' && (
                  <button
                    onClick={() => closeMutation.mutate(String(conv['participantId']))}
                    className="btn-ghost text-white/30 hover:text-red-400 p-1.5"
                    title="Close conversation"
                  >
                    <X className="w-4 h-4" />
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
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
