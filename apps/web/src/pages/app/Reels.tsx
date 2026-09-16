import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Film, Search, RefreshCw, Zap, Settings2, Image as ImageIcon, Play, MessageCircle, Heart, User, Filter, SortDesc } from 'lucide-react';
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
    <div className="layout-container py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-display-lg text-theme-text-primary mb-2 text-3xl">Reels</h1>
          <p className="text-sm text-theme-text-secondary">Manage and track automations for your Instagram reels.</p>
        </div>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="btn-primary py-2.5 px-4 shadow-[0_4px_14px_rgba(225,48,108,0.2)]"
        >
          <RefreshCw className={clsx('w-4 h-4', syncMutation.isPending && 'animate-spin')} />
          Sync latest reels
        </button>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8 p-1.5 bg-theme-surface border border-theme-border rounded-2xl shadow-sm" id="tour-reels-grid">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-secondary" />
          <input
            className="w-full bg-transparent text-sm text-theme-text-primary placeholder-theme-text-secondary pl-10 pr-4 py-2.5 outline-none focus:ring-0"
            placeholder="Search captions..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
        
        <div className="hidden lg:block w-px bg-theme-border my-2" />

        {/* Filters */}
        <div className="flex items-center gap-2 px-2 overflow-x-auto no-scrollbar">
           <Filter className="w-4 h-4 text-theme-text-secondary ml-2 flex-shrink-0 hidden sm:block" />
          {(['all', 'active', 'inactive', 'none'] as FilterMode[]).map((f) => {
            const labels = {
              all: 'All Reels',
              active: 'Automated',
              inactive: 'Paused',
              none: 'No Auto'
            };
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-4 py-1.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0',
                  filter === f
                    ? 'bg-gradient-ig text-white shadow-md'
                    : 'bg-theme-bg text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-border/50'
                )}
              >
                {labels[f]}
              </button>
            )
          })}
        </div>

        <div className="hidden lg:block w-px bg-theme-border my-2" />

        {/* Sort */}
        <div className="relative px-2 flex items-center min-w-[140px]">
           <SortDesc className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-secondary pointer-events-none" />
           <select 
             className="w-full appearance-none bg-transparent text-sm font-semibold text-theme-text-primary pl-10 pr-8 py-2.5 outline-none cursor-pointer hover:bg-theme-bg rounded-xl transition-colors" 
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
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="animate-pulse bg-theme-border/50 rounded-2xl aspect-[4/5]" />
          ))}
        </div>
      )}

      {/* Empty state — no IG connected */}
      {!igAccountId && !isLoading && (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in border border-dashed border-theme-border rounded-3xl bg-theme-surface/50">
          <div className="w-16 h-16 rounded-2xl bg-theme-border flex items-center justify-center mb-6">
             <Film className="w-8 h-8 text-theme-text-secondary" />
          </div>
          <h3 className="text-title text-theme-text-primary mb-2 text-xl">Connect Instagram first</h3>
          <p className="text-sm text-theme-text-secondary mb-8 max-w-sm">
            You need to link your Instagram Professional account to manage your reels and set up automations.
          </p>
          <button onClick={() => navigate('/settings')} className="btn-primary px-6 py-3">
            Go to Settings
          </button>
        </div>
      )}

      {/* Empty state — no reels found */}
      {igAccountId && !isLoading && data?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in border border-dashed border-theme-border rounded-3xl bg-theme-surface/50">
          <div className="w-16 h-16 rounded-2xl bg-theme-border/50 flex items-center justify-center mb-6">
             <Search className="w-8 h-8 text-theme-text-secondary" />
          </div>
          <h3 className="text-title text-theme-text-primary mb-2 text-xl">
            {filter === 'all'
              ? 'No reels found'
              : filter === 'active'
              ? 'No active automated reels'
              : filter === 'inactive'
              ? 'No paused automations'
              : 'No unautomated reels'}
          </h3>
          <p className="text-sm text-theme-text-secondary mb-8 max-w-sm">
            {filter === 'all' 
               ? 'We are still syncing your content, or you might not have any reels posted yet.' 
               : 'Try changing your filter settings to see more results.'}
          </p>
          {filter === 'all' && (
            <button onClick={() => refetch()} className="btn-secondary">
              <RefreshCw className="w-4 h-4 mr-2" /> Check Again
            </button>
          )}
        </div>
      )}

      {/* Reels grid */}
      {data?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
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
    <div className="card group overflow-hidden border-theme-border hover:border-theme-text-primary/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col h-[380px] relative">
      {/* Thumbnail Area */}
      <div className="relative h-[220px] bg-theme-border overflow-hidden flex-shrink-0">
        {media['thumbnailUrl'] ? (
          <img
            src={String(media['thumbnailUrl'])}
            alt="Reel thumbnail"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-theme-text-secondary/30" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10 pointer-events-none" />

        {/* Floating Badges */}
        <div className="absolute top-3 left-3">
          {isActive ? (
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md shadow-sm border border-emerald-400/50">
               <Zap className="w-3 h-3 text-white fill-white" />
               <span className="text-[10px] font-bold text-white uppercase tracking-wide">Automated</span>
             </div>
          ) : hasAutomation ? (
             <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-theme-surface/90 backdrop-blur-md shadow-sm border border-theme-border text-theme-text-primary">
               <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
               <span className="text-[10px] font-bold uppercase tracking-wide">Paused</span>
             </div>
          ) : null}
        </div>

        {/* Video Stats Overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 text-white text-[11px] font-medium drop-shadow-md">
           <div className="flex items-center gap-1"><Play className="w-3 h-3 fill-white" /> {insights?.plays ?? 0}</div>
           <div className="flex items-center gap-1"><MessageCircle className="w-3 h-3 fill-white" /> {insights?.comments ?? 0}</div>
           <div className="flex items-center gap-1"><Heart className="w-3 h-3 fill-white" /> {insights?.likes ?? 0}</div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 bg-theme-surface">
        <p className="text-xs text-theme-text-secondary line-clamp-2 leading-relaxed mb-4 flex-1">
          {String(media['caption'] ?? '').slice(0, 80) || 'No caption provided.'}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-theme-border/60">
           <div className="flex items-center gap-2 text-xs font-semibold text-theme-text-primary">
              <button
                id="tour-toggle"
                onClick={(e) => {
                  e.stopPropagation();
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
              <span className={isActive ? 'text-theme-text-primary' : 'text-theme-text-secondary'}>
                {isActive ? 'On' : 'Off'}
              </span>
           </div>

          <button
            id="tour-automation-btn"
            onClick={onEdit}
            className="flex items-center gap-1.5 text-xs font-semibold text-theme-text-secondary hover:text-theme-text-primary transition-colors bg-theme-border/30 hover:bg-theme-border px-3 py-1.5 rounded-lg"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
