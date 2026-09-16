import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Instagram, Plug, RefreshCw, Trash2, User, Mail, Key, Save, Moon, Sun, Monitor, Settings as SettingsIcon, CreditCard, AlertTriangle, ChevronLeft, LogOut } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.store.js';
import { useThemeStore } from '../../stores/theme.store.js';
import { clsx } from 'clsx';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

type SettingsTab = 'general' | 'accounts' | 'billing' | 'danger';

const SETTINGS_TABS = [
  { id: 'general', label: 'General', shortLabel: 'General', icon: SettingsIcon },
  { id: 'accounts', label: 'Instagram Accounts', shortLabel: 'Accounts', icon: Instagram },
  { id: 'billing', label: 'Billing', shortLabel: 'Billing', icon: CreditCard },
  { id: 'danger', label: 'Danger Zone', shortLabel: 'Danger', icon: AlertTriangle },
];

export default function Settings() {
  const { user, setAuth, clearAuth } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = (searchParams.get('tab') as SettingsTab) || 'general';
  const setActiveTab = (tab: SettingsTab) => {
    setSearchParams({ tab });
  };

  // Profile Form State
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');

  const updateProfileMutation = useMutation({
    mutationFn: (payload: Record<string, string>) => api.patch('/auth/me', payload),
    onSuccess: (res) => {
      const currentToken = useAuthStore.getState().token;
      if (currentToken) {
        setAuth(currentToken, res.data.data);
      }
      setPassword('');
      alert('Profile updated successfully');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error?.message ?? 'Failed to update profile');
    }
  });

  const handleUpdateProfile = () => {
    const payload: Record<string, string> = {};
    if (name.trim() && name !== user?.name) payload.name = name.trim();
    if (email.trim() && email !== user?.email) payload.email = email.trim();
    if (password) payload.password = password;
    
    if (Object.keys(payload).length > 0) {
      updateProfileMutation.mutate(payload);
    }
  };

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

  const handleConnectAccount = async () => {
    try {
      const res = await api.get('/oauth/instagram/authorize');
      window.location.href = res.data.data.authUrl;
    } catch (e) {
      console.error('Failed to get auth URL:', e);
    }
  };

  return (
    <div className="layout-container py-8 md:py-12 flex flex-col md:flex-row gap-8">
      {/* ── Left Category Tree (Desktop Only) ── */}
      <div className="hidden md:block w-64 flex-shrink-0 space-y-1">
        <h1 className="text-display-lg text-theme-text-primary mb-8">Settings</h1>
        
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              'w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-theme-border/50 text-theme-text-primary'
                : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-border/30'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Right Content Area ── */}
      <div className="flex-1 max-w-2xl">
        {activeTab === 'general' && (
          <div className="space-y-8 animate-fade-in">
            {/* Theme Settings */}
            <div className="card p-6">
              <h2 className="text-title mb-6">Appearance</h2>
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { id: 'light', icon: Sun, label: 'Light' },
                  { id: 'dark', icon: Moon, label: 'Dark' },
                  { id: 'system', icon: Monitor, label: 'System' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as any)}
                    className={clsx(
                      'flex flex-col items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all',
                      theme === t.id
                        ? 'border-theme-text-primary bg-theme-border/20'
                        : 'border-theme-border hover:border-theme-border/80 bg-theme-bg'
                    )}
                  >
                    <t.icon className={clsx('w-5 h-5 sm:w-6 sm:h-6', theme === t.id ? 'text-theme-text-primary' : 'text-theme-text-secondary')} />
                    <span className="text-[11px] sm:text-sm font-semibold text-theme-text-primary tracking-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Settings */}
            <div className="card p-6">
              <h2 className="text-title mb-1">Profile & Security</h2>
              <p className="text-sm text-theme-text-secondary mb-6">Update your account information.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-label font-medium mb-2">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-secondary" />
                    <input 
                      className="input pl-9" 
                      value={name} 
                      onChange={(e) => setName(e.currentTarget.value)} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-label font-medium mb-2">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-secondary" />
                    <input 
                      type="email"
                      className="input pl-9" 
                      value={email} 
                      onChange={(e) => setEmail(e.currentTarget.value)} 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-label font-medium mb-2">New password (optional)</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-secondary" />
                    <input 
                      type="password"
                      className="input pl-9" 
                      value={password} 
                      onChange={(e) => setPassword(e.currentTarget.value)} 
                      placeholder="Leave blank to keep current"
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-theme-border flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={handleUpdateProfile}
                    disabled={updateProfileMutation.isPending || (!name && !email && !password)}
                    className="btn-primary w-full sm:w-auto justify-center"
                  >
                    <Save className="w-4 h-4" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>

                  {/* Mobile Logout */}
                  <button
                    onClick={() => {
                      clearAuth();
                      navigate('/login');
                    }}
                    className="md:hidden w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-medium text-sm transition-colors text-red-500 bg-red-500/10 hover:bg-red-500/20"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className="space-y-6 animate-fade-in">
            <div className="card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-title mb-1">Instagram Accounts</h2>
                  <p className="text-sm text-theme-text-secondary">Manage connected profiles and tokens.</p>
                </div>
                <button onClick={handleConnectAccount} className="btn-primary shrink-0">
                  <Instagram className="w-4 h-4" />
                  Connect Account
                </button>
              </div>

              {isLoading && <div className="animate-pulse bg-theme-border/50 h-20 rounded-xl" />}

              {!isLoading && !accounts?.length && (
                <div className="text-center py-12">
                  <Plug className="w-12 h-12 mx-auto mb-4 text-theme-text-secondary/50" />
                  <p className="text-theme-text-secondary font-medium">No Instagram accounts connected.</p>
                </div>
              )}

              <div className="space-y-3">
                {accounts?.map((account: any) => (
                  <div key={account._id} className="flex items-center gap-4 p-4 rounded-xl border border-theme-border bg-theme-bg">
                    <div className="w-10 h-10 rounded-full bg-gradient-ig flex items-center justify-center text-white flex-shrink-0">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-theme-text-primary">@{account.username}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1.5 text-xs text-theme-text-secondary">
                          <span className={clsx(
                            'w-2 h-2 rounded-full',
                            account.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                          )} />
                          {account.status === 'active' ? 'Active' : 'Expired'}
                        </span>
                        <span className="text-xs text-theme-text-secondary bg-theme-border px-1.5 py-0.5 rounded-md">
                          {account.accountType}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => refreshMutation.mutate(account._id)}
                        disabled={refreshMutation.isPending}
                        className="btn-ghost"
                        title="Refresh token"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => disconnectMutation.mutate(account._id)}
                        className="btn-ghost hover:text-red-500 hover:bg-red-500/10"
                        title="Disconnect"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="card p-6 animate-fade-in">
            <h2 className="text-title mb-1">Plan & Billing</h2>
            <p className="text-sm text-theme-text-secondary mb-6">Manage your subscription.</p>
            
            <div className="flex items-center justify-between p-5 rounded-xl border border-theme-border bg-theme-bg">
              <div>
                <p className="font-semibold text-theme-text-primary text-lg capitalize">{user?.plan} Plan</p>
                <p className="text-sm text-theme-text-secondary mt-1">
                  {user?.plan === 'free' ? 'Limited to 14 days and basic features.' : 'Active subscription.'}
                </p>
              </div>
              {user?.plan === 'free' && (
                <button className="btn-primary">Upgrade</button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="card p-6 animate-fade-in border-red-500/20 bg-red-500/5">
            <h2 className="text-title text-red-500 mb-1">Danger Zone</h2>
            <p className="text-sm text-red-500/80 mb-6">Irreversible and destructive actions.</p>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-theme-text-primary">Delete Account</p>
                <p className="text-sm text-theme-text-secondary mt-1">Permanently delete your account and all data.</p>
              </div>
              <button className="px-4 py-2 rounded-lg font-medium text-sm text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
