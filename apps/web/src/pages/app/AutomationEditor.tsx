// apps/web/src/pages/app/AutomationEditor.tsx
// Full automation editor: trigger, DM text, link, backfill toggle, comment reply
// Tour targets: #tour-link-field, #tour-backfill-toggle
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Zap, Link2, MessageCircle, Clock, Save } from 'lucide-react';
import { api } from '../../api/client.js';
import { clsx } from 'clsx';

type TriggerMode = 'any_comment' | 'keyword';

export default function AutomationEditor() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch existing automation for this reel (if any)
  const { data: existing, isLoading } = useQuery({
    queryKey: ['automation', mediaId],
    queryFn: () =>
      api.get('/automations', { params: { mediaId } }).then((r) => r.data.data?.[0] ?? null),
    enabled: !!mediaId,
  });

  const [triggerMode, setTriggerMode] = useState<TriggerMode>('any_comment');
  const [keywords, setKeywords] = useState('');
  const [dmText, setDmText] = useState('Hey {{name}}! Thanks for your comment 👋 Here\'s the link you asked for 👇');
  const [link, setLink] = useState('');
  const [commentReplyEnabled, setCommentReplyEnabled] = useState(true);
  const [commentReplyText, setCommentReplyText] = useState('📩 Check your DMs — sent you the link!');
  const [backfillEnabled, setBackfillEnabled] = useState(false);
  const [name, setName] = useState('My Automation');

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      existing
        ? api.patch(`/automations/${existing._id}`, payload)
        : api.post('/automations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      navigate('/reels');
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      name,
      mediaId,
      scope: 'media',
      enabled: true,
      trigger: {
        mode: triggerMode,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        matchAs: 'contains',
      },
      privateReply: { text: dmText },
      commentReply: { enabled: commentReplyEnabled, text: commentReplyText },
      link: { url: link, buttonTitle: 'Get Link' },
      backfill: { enabled: backfillEnabled, lastBackfilledCommentAt: null },
    });
  };

  return (
    <div className="section-padding max-w-2xl mx-auto">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="btn-ghost mb-6 -ml-1">
        <ArrowLeft className="w-4 h-4" />
        Back to reels
      </button>

      <h1 className="text-2xl font-bold text-white mb-1">Automation Editor</h1>
      <p className="text-white/50 text-sm mb-8">Configure how this reel responds to comments.</p>

      <div className="space-y-5">
        {/* Automation name */}
        <div className="card p-5">
          <label className="block text-xs font-medium text-white/60 mb-2">Automation name</label>
          <input className="input" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        </div>

        {/* ── Trigger ── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-brand-400" />
            <h2 className="text-sm font-semibold text-white">Trigger</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {(['any_comment', 'keyword'] as TriggerMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setTriggerMode(mode)}
                className={clsx(
                  'p-3 rounded-xl border text-sm font-medium transition-all duration-150',
                  triggerMode === mode
                    ? 'border-brand-500/60 bg-brand-500/10 text-brand-300'
                    : 'border-white/10 text-white/50 hover:border-white/20'
                )}
              >
                {mode === 'any_comment' ? '⚡ Any comment' : '🔑 Specific words'}
              </button>
            ))}
          </div>

          {triggerMode === 'keyword' && (
            <div>
              <label className="block text-xs text-white/40 mb-1.5">
                Keywords (comma-separated, case-insensitive, contains match)
              </label>
              <input
                className="input"
                placeholder="link, price, dm, info"
                value={keywords}
                onChange={(e) => setKeywords(e.currentTarget.value)}
              />
            </div>
          )}
        </div>

        {/* ── DM text ── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Private reply (first DM)</h2>
          </div>
          <textarea
            className="input resize-none"
            rows={3}
            value={dmText}
            onChange={(e) => setDmText(e.currentTarget.value)}
            placeholder="Your DM text… Use {{name}} for personalization."
          />
          <p className="text-xs text-white/30 mt-1.5">
            Variables: {'{{name}}'}, {'{{username}}'}, {'{{reel_caption_first_line}}'}
          </p>
        </div>

        {/* ── Dynamic link ── */}
        <div className="card p-5" id="tour-link-field">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Link to send</h2>
          </div>
          <input
            className="input"
            type="url"
            placeholder="https://your-link.com"
            value={link}
            onChange={(e) => setLink(e.currentTarget.value)}
          />
          <p className="text-xs text-white/30 mt-1.5">
            Each reel can have a different link. Change it anytime — takes effect immediately.
          </p>
        </div>

        {/* ── Comment reply (public) ── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Public comment reply</h2>
            </div>
            <button
              onClick={() => setCommentReplyEnabled(!commentReplyEnabled)}
              className={clsx('toggle', commentReplyEnabled ? 'toggle-on' : 'toggle-off')}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
          {commentReplyEnabled && (
            <input
              className="input"
              value={commentReplyText}
              onChange={(e) => setCommentReplyText(e.currentTarget.value)}
            />
          )}
          <p className="text-xs text-white/30 mt-1.5">
            Reply publicly under the comment so others see it too.
          </p>
        </div>

        {/* ── Backfill toggle ── */}
        <div className="card p-5" id="tour-backfill-toggle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-400" />
              <div>
                <h2 className="text-sm font-semibold text-white">Answer old comments</h2>
                <p className="text-xs text-white/40 mt-0.5">
                  Reply to comments made before this automation was created.
                  Comments older than 7 days can't receive DMs (Instagram rule).
                </p>
              </div>
            </div>
            <button
              onClick={() => setBackfillEnabled(!backfillEnabled)}
              className={clsx('toggle flex-shrink-0 ml-4', backfillEnabled ? 'toggle-on' : 'toggle-off')}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        </div>

        {/* Save */}
        <button
          id="automation-save"
          onClick={handleSave}
          disabled={saveMutation.isPending || !link}
          className="btn-primary w-full justify-center"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving…' : existing ? 'Update automation' : 'Activate automation'}
        </button>

        {saveMutation.isError && (
          <p className="text-red-400 text-sm text-center animate-fade-in">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
