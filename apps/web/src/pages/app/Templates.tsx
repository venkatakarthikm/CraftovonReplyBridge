import { useState, useMemo } from 'react';
import { MessageSquare, LayoutTemplate, Smartphone, Save, Link2, MessageCircle, X, Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

interface BundleTemplate {
  _id?: string;
  name: string;
  bundle: {
    privateReply: string;
    commentReply: string;
    linkDm: string;
  };
  isSystem?: boolean;
}

const DEFAULT_THEMES: BundleTemplate[] = [
  {
    name: 'Friendly & Casual',
    bundle: {
      privateReply: 'Hey {{name}}! Thanks so much for your comment 👋 Tap below to grab the link you asked for!',
      commentReply: 'Just sent you a DM with the details! 💌',
      linkDm: 'Here you go! Let me know if you have any questions 👇',
    },
    isSystem: true,
  },
  {
    name: 'Professional Sales',
    bundle: {
      privateReply: 'Hello {{name}}. Thank you for your interest. Click the button below to access the requested resource.',
      commentReply: 'We have sent a direct message to your inbox with the information.',
      linkDm: 'Here is your direct access link. We look forward to working with you.',
    },
    isSystem: true,
  },
  {
    name: 'Urgent Promo',
    bundle: {
      privateReply: 'Hey {{name}}! 🔥 The deal is almost gone. Tap below to claim your spot before it expires!',
      commentReply: 'Sent! 🚀 Check your DMs before the link expires!',
      linkDm: 'Here is your VIP link! Act fast! ⏳',
    },
    isSystem: true,
  },
];

export default function Templates() {
  const queryClient = useQueryClient();

  // Selection & edit state
  const [selected, setSelected] = useState<BundleTemplate | null>(null);
  const [edited, setEdited] = useState<BundleTemplate['bundle'] | null>(null);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // Success flash
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: dbTemplates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then((r) => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: { name: string; kind: string; bundle: BundleTemplate['bundle'] }) =>
      api.post('/templates', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    },
  });

  const allTemplates = useMemo((): BundleTemplate[] => {
    const userBundles: BundleTemplate[] = (dbTemplates || [])
      .filter((t: any) => t.kind === 'bundle')
      .map((t: any) => ({
        _id: t._id,
        name: t.name,
        bundle: {
          privateReply: t.bundle?.privateReply ?? '',
          commentReply: t.bundle?.commentReply ?? '',
          linkDm: t.bundle?.linkDm ?? '',
        },
        isSystem: t.isSystem,
      }));
    return [...DEFAULT_THEMES, ...userBundles];
  }, [dbTemplates]);

  const handleSelect = (theme: BundleTemplate) => {
    setSelected(theme);
    setEdited({ ...theme.bundle });
    setIsSuccess(false);
  };

  const handleFieldChange = (field: keyof BundleTemplate['bundle'], value: string) => {
    setEdited((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = () => {
    if (!selected || !edited) return;
    saveMutation.mutate({
      name: selected.name + (selected.isSystem ? ' (Custom)' : ''),
      kind: 'bundle',
      bundle: edited,
    });
  };

  const currentBundle = edited ?? selected?.bundle;

  return (
    <div className="layout-container py-8">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-theme-text-primary mb-2">Templates</h1>
        <p className="text-sm text-theme-text-secondary">
          Pick a message bundle and apply it to any automation.
        </p>
      </div>

      {/* ── Template Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-theme-border/30 h-48 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTemplates.map((theme, i) => {
            const isSelected = selected?.name === theme.name;
            return (
              <button
                key={theme._id || i}
                onClick={() => handleSelect(theme)}
                className={clsx(
                  'card p-5 text-left transition-colors duration-150 w-full border-l-4',
                  isSelected
                    ? 'border-l-theme-text-primary bg-theme-bg'
                    : 'border-l-transparent hover:border-l-theme-border'
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-theme-border/30 flex items-center justify-center flex-shrink-0">
                    <LayoutTemplate className="w-4 h-4 text-theme-text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <p className={clsx('text-sm font-semibold truncate', isSelected ? 'text-theme-text-primary' : 'text-theme-text-primary')}>
                      {theme.name}
                    </p>
                    {theme.isSystem && (
                      <span className="text-[10px] font-medium text-theme-text-secondary uppercase tracking-wider">Built-in</span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-theme-text-primary ml-auto flex-shrink-0 mt-0.5" />}
                </div>
                <p className="text-xs text-theme-text-secondary line-clamp-2 leading-relaxed">
                  {theme.bundle.privateReply}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Edit Panel (appears below grid when a template is selected) ── */}
      {selected && edited && (
        <div className="mt-8 card p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-theme-text-primary">
                Customize: {selected.name}
              </h2>
              <p className="text-sm text-theme-text-secondary mt-0.5">
                Changes apply only to saved copies — the original is unchanged.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setPreviewOpen(true)}
                className="btn-secondary"
              >
                <Smartphone className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={saveMutation.isPending || isSuccess}
                className={clsx(
                  'btn-primary',
                  isSuccess && 'opacity-100 !bg-emerald-600'
                )}
              >
                {isSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saveMutation.isPending ? 'Saving...' : isSuccess ? 'Saved!' : 'Save copy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Public comment */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-theme-text-secondary" />
                <label className="text-label font-medium">Public comment reply</label>
              </div>
              <input
                className="input text-sm"
                value={edited.commentReply}
                onChange={(e) => handleFieldChange('commentReply', e.target.value)}
              />
            </div>

            {/* Private DM */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-theme-text-secondary" />
                <label className="text-label font-medium">Private reply (first DM)</label>
              </div>
              <textarea
                className="input resize-none"
                rows={4}
                value={edited.privateReply}
                onChange={(e) => handleFieldChange('privateReply', e.target.value)}
              />
            </div>

            {/* Link DM */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-theme-text-secondary" />
                <label className="text-label font-medium">Follow-up (after button tap)</label>
              </div>
              <textarea
                className="input resize-none"
                rows={4}
                value={edited.linkDm}
                onChange={(e) => handleFieldChange('linkDm', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ── */}
      {previewOpen && currentBundle && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}
        >
          <div className="w-full max-w-sm bg-theme-surface border border-theme-border rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-theme-text-secondary" />
                <span className="text-sm font-semibold text-theme-text-primary">DM Preview</span>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-lg text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated DM thread */}
            <div className="p-5 bg-theme-bg space-y-4 max-h-[60dvh] overflow-y-auto">
              {/* Comment section callout */}
              <div className="border border-theme-border rounded-xl p-3 bg-theme-surface">
                <p className="text-[10px] font-semibold text-theme-text-secondary uppercase tracking-wider mb-2">
                  Public comment
                </p>
                <p className="text-xs text-theme-text-primary"><span className="font-semibold">@user:</span> Send me the link please!</p>
                <div className="mt-2 pl-3 border-l-2 border-theme-text-primary/30">
                  <p className="text-xs text-theme-text-secondary">
                    <span className="font-semibold text-theme-text-primary">@yourbrand:</span>{' '}
                    {currentBundle.commentReply || '...'}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <span className="text-[10px] font-semibold text-theme-text-secondary uppercase tracking-widest">Direct messages</span>
              </div>

              {/* First DM bubble */}
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-theme-surface border border-theme-border rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-sm text-theme-text-primary leading-relaxed whitespace-pre-wrap">
                    {currentBundle.privateReply.replace('{{name}}', 'Alex') || '...'}
                  </p>
                  <div className="mt-2 py-2 bg-theme-bg border border-theme-border rounded-xl text-center cursor-pointer">
                    <span className="text-xs font-semibold text-theme-text-primary">Get Link</span>
                  </div>
                </div>
              </div>

              {/* User taps button */}
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-theme-surface border border-theme-border rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <p className="text-sm text-theme-text-primary">Get Link</p>
                </div>
              </div>

              {/* Follow-up DM */}
              <div className="flex justify-end">
                <div className="max-w-[85%] bg-theme-surface border border-theme-border rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-sm text-theme-text-primary leading-relaxed whitespace-pre-wrap">
                    {currentBundle.linkDm || '...'}
                  </p>
                  <div className="mt-2 p-2.5 bg-theme-bg border border-theme-border rounded-xl flex items-center gap-2 cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-theme-border/30 flex items-center justify-center flex-shrink-0">
                      <Link2 className="w-4 h-4 text-theme-text-secondary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-theme-text-primary">your-link.com</p>
                      <p className="text-[9px] text-theme-text-secondary">Tap to open</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
