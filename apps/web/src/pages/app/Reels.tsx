// apps/web/src/pages/app/Reels.tsx
// Reels grid: thumbnail, caption, automation badge, toggle, edit button
// Empty states from 06-onboarding-tour.md §4
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Film, Search, RefreshCw, Zap, ToggleLeft, ToggleRight, Settings2, AlertCircle } from 'lucide-react';
import { api } from '../../api/client.js';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

type FilterMode = 'all' | 'active' | 'inactive' | 'none';
type SortMode = 'postedAt' | 'plays' | 'reach' | 'likes' | 'comments';

export default function Reels() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('postedAt');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ['ig-accounts'],
    queryFn: () => api.get('/oauth/instagram/accounts').then((r) => r.data.data),
  });

  const igAccountId = accounts?.[0]?._id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reels', igAccountId, filter, search, sort],
    queryFn: () =>
      api.get('/media', {
        params: { igAccountId, type: 'REEL', search: search || undefined, automated: filter, sort },
      }).then((r) => r.data.data),
    enabled: !!igAccountId,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ automationId, enabled }: { automationId: string; enabled: boolean }) =>
      api.patch(`/automations/${automationId}/toggle`, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reels'] }),
  });

  const syncMutation = useMutation({
    mutationFn: () => api.post('/media/sync', { igAccountId }),
    onSuccess: () => setTimeout(() => refetch(), 2000),
  });

  return (
    <div className="section-padding max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reels</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage automations for each reel</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="btn-secondary"
        >
          <RefreshCw className={clsx('w-4 h-4', syncMutation.isPending && 'animate-spin')} />
          Sync reels
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6" id="tour-reels-grid">
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="input pl-9"
            placeholder="Search reels…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-full sm:w-auto">
          {(['all', 'active', 'inactive', 'none'] as FilterMode[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize',
                filter === f
                  ? 'bg-brand-500 text-white shadow-brand'
                  : 'text-white/50 hover:text-white'
              )}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'inactive' ? 'Inactive' : 'No Auto'}
            </button>
          ))}
        </div>
        <select 
          className="input w-full sm:w-auto text-xs py-1.5 h-[34px]" 
          value={sort} 
          onChange={(e) => setSort(e.target.value as SortMode)}
        >
          <option value="postedAt">Most Recent</option>
          <option value="plays">Most Plays</option>
          <option value="reach">Highest Reach</option>
          <option value="likes">Most Likes</option>
          <option value="comments">Most Comments</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="skeleton rounded-2xl aspect-[4/5]" />
          ))}
        </div>
      )}

      {/* Empty state — no IG connected */}
      {!igAccountId && !isLoading && (
        <div className="text-center py-24 animate-fade-in">
          <Film className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect Instagram first</h3>
          <p className="text-white/40 text-sm mb-6">Go to Settings to connect your Instagram account.</p>
          <button onClick={() => navigate('/settings')} className="btn-primary">
            Go to Settings
          </button>
        </div>
      )}

      {/* Empty state — no reels yet (from 06-onboarding-tour.md §4) */}
      {igAccountId && !isLoading && data?.length === 0 && (
        <div className="text-center py-24 animate-fade-in">
          <Film className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {filter === 'all'
              ? 'Connect finished — reels usually appear within a minute.'
              : filter === 'active'
              ? 'No active automated reels yet'
              : 'No matching reels'}
          </h3>
          <p className="text-white/40 text-sm mb-6">
            {filter === 'all' && 'Hang tight, or click Refresh below.'}
          </p>
          {filter === 'all' && (
            <button onClick={() => refetch()} className="btn-secondary">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          )}
        </div>
      )}

      {/* Reels grid */}
      {data?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.map((media: Record<string, unknown>) => (
            <ReelCard
              key={String(media['_id'])}
              media={media}
              onToggle={(automationId, enabled) => toggleMutation.mutate({ automationId, enabled })}
              onEdit={() => navigate(`/reels/${media['mediaId']}/automation`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReelCard({
  media,
  onToggle,
  onEdit,
}: {
  media: Record<string, unknown>;
  onToggle: (automationId: string, enabled: boolean) => void;
  onEdit: () => void;
}) {
  const automation = media['automation'] as { enabled: boolean, _id: string } | undefined;
  const hasAutomation = !!automation;
  const isActive = automation?.enabled === true;
  const insights = media['insights'] as Record<string, number> | undefined;

  return (
    <div className="card-hover overflow-hidden group animate-fade-in">
      {/* Thumbnail */}
      <div className="relative aspect-[4/5] bg-surface-50 overflow-hidden">
        {media['thumbnailUrl'] ? (
          <img
            src={String(media['thumbnailUrl'])}
            alt={String(media['caption'] ?? 'Reel').slice(0, 30)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <Film className="w-12 h-12" />
          </div>
        )}

        {/* Automation badge */}
        <div className="absolute top-2 left-2">
          {isActive ? (
            <span className="badge badge-green"><Zap className="w-2.5 h-2.5" /> ON</span>
          ) : hasAutomation ? (
            <span className="badge badge-amber">OFF</span>
          ) : (
            <span className="badge badge-gray">No Auto</span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-3">
        {insights && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-[10px] text-white/40 bg-white/5 p-2 rounded-lg">
            <div>Plays: {insights.plays ?? 0}</div>
            <div>Reach: {insights.reach ?? 0}</div>
            <div>Likes: {insights.likes ?? 0}</div>
            <div>Comments: {insights.comments ?? 0}</div>
          </div>
        )}
        
        <p className="text-xs text-white/60 line-clamp-2 mb-3 leading-relaxed">
          {String(media['caption'] ?? 'No caption').slice(0, 80) || 'No caption'}
        </p>

        <div className="flex items-center justify-between">
          {/* Toggle — tour target */}
          <button
            id="tour-toggle"
            onClick={() => {
              if (automation?._id) {
                onToggle(automation._id, !isActive);
              } else {
                onEdit();
              }
            }}
            className={clsx('toggle', isActive ? 'toggle-on' : 'toggle-off')}
            aria-label={isActive ? 'Disable automation' : 'Enable automation'}
          >
            <span className="toggle-thumb" />
          </button>

          {/* Edit automation button — tour target */}
          <button
            id="tour-automation-btn"
            onClick={onEdit}
            className="btn-ghost text-xs py-1.5"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Automate
          </button>
        </div>
      </div>
    </div>
  );
}
