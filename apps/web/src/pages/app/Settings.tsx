// apps/web/src/pages/app/Settings.tsx
// Settings: IG account connections + plan upgrade CTA
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Instagram, Plug, PlugZap, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.store.js';

export default function Settings() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['ig-accounts'],
    queryFn: () => api.get('/oauth/instagram/accounts').then((r) => r.data.data),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/oauth/instagram/accounts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ig-accounts'] }),
  });

  const refreshMutation = useMutation({
    mutationFn: (id: string) => api.post(`/oauth/instagram/accounts/${id}/refresh`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ig-accounts'] }),
  });

  const statusBadge = (status: string) => {
    if (status === 'active') return <span className="badge badge-green">● Active</span>;
    if (status === 'token_expired') return <span className="badge badge-amber">⚠ Token expired</span>;
    return <span className="badge badge-red">Revoked</span>;
  };

  const handleConnectAccount = async () => {
    try {
      const res = await api.get('/oauth/instagram/authorize');
      window.location.href = res.data.data.authUrl;
    } catch (e) {
      console.error('Failed to get auth URL:', e);
    }
  };

  return (
    <div className="section-padding max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* ── Connected accounts ── */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="section-title">Instagram accounts</h2>
          <button onClick={handleConnectAccount} className="btn-primary text-xs py-2">
            <Instagram className="w-3.5 h-3.5" />
            Connect account
          </button>
        </div>

        {isLoading && <div className="skeleton h-20 rounded-xl" />}

        {!isLoading && !accounts?.length && (
          <div className="text-center py-10 text-white/30">
            <Plug className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No Instagram accounts connected yet.</p>
          </div>
        )}

        {accounts?.map((account: Record<string, unknown>) => (
          <div key={String(account['_id'])} className="flex items-center gap-4 p-4 rounded-xl border border-white/8 mb-3 last:mb-0">
            <div className="w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              <Instagram className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">@{String(account['username'] ?? '')}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {statusBadge(String(account['status'] ?? 'active'))}
                <span className="badge badge-gray">{String(account['accountType'] ?? '')}</span>
              </div>
              {!!account['tokenExpiresAt'] && (
                <p className="text-xs text-white/30 mt-0.5">
                  Token expires {new Date(String(account['tokenExpiresAt'])).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => refreshMutation.mutate(String(account['_id']))}
                disabled={refreshMutation.isPending}
                className="btn-ghost p-2 text-white/40 hover:text-emerald-400"
                title="Refresh token"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => disconnectMutation.mutate(String(account['_id']))}
                className="btn-ghost p-2 text-white/40 hover:text-red-400"
                title="Disconnect"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Plan ── */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Plan & billing</h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-brand-500/10 border border-brand-500/20">
          <div>
            <p className="text-sm font-semibold text-white capitalize">{user?.plan} plan</p>
            <p className="text-xs text-white/40 mt-0.5">
              {user?.plan === 'free' ? 'Upgrade for more DMs and accounts' : 'Billed monthly'}
            </p>
          </div>
          {user?.plan === 'free' && (
            <button className="btn-primary text-xs py-2">Upgrade →</button>
          )}
        </div>
      </div>
    </div>
  );
}
