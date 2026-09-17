import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Zap, Link2, MessageCircle, Clock, Save, Smartphone, ChevronRight } from 'lucide-react';
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
      api.get('/automations', { params: { mediaId } }).then((r) => {
        // Handle both object and array responses robustly
        const d = r.data?.data;
        if (Array.isArray(d)) return d[0] || null;
        return d || null;
      }),
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

  // Populate form if we are editing an existing automation
  useEffect(() => {
    if (existing && Object.keys(existing).length > 0) {
      setName(existing.name || 'My Automation');
      setTriggerMode(existing.trigger?.mode || 'any_comment');
      setKeywords(Array.isArray(existing.trigger?.keywords) ? existing.trigger.keywords.join(', ') : '');
      setDmText(existing.privateReply?.text || '');
      setLink(existing.link?.url || '');
      setCommentReplyEnabled(existing.commentReply?.enabled ?? true);
      setCommentReplyText(existing.commentReply?.text || '');
      setBackfillEnabled(existing.backfill?.enabled ?? false);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      existing?._id
        ? api.patch(`/automations/${existing._id}`, payload)
        : api.post('/automations', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      navigate('/reels');
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ['ig-accounts'],
    queryFn: () => api.get('/oauth/instagram/accounts').then((r) => r.data.data),
  });
  const igAccountId = accounts?.[0]?._id;

  const handleSave = () => {
    saveMutation.mutate({
      name,
      mediaId,
      igAccountId,
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
    <div className="layout-container py-6 md:py-8 h-[calc(100dvh-60px)] md:h-[100dvh] overflow-hidden flex flex-col">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
         <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-theme-surface border border-theme-border text-theme-text-secondary hover:text-theme-text-primary transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-display font-semibold text-theme-text-primary truncate">Automation Editor</h1>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-theme-text-secondary">
                 <span className="flex-shrink-0">Reels</span>
                 <ChevronRight className="w-3 h-3 flex-shrink-0" />
                 <span className="text-theme-text-primary truncate min-w-0">{name}</span>
              </div>
            </div>
         </div>
         <button
           id="automation-save"
           onClick={handleSave}
           disabled={saveMutation.isPending || !link || !igAccountId || isLoading}
           className="btn-primary w-full sm:w-auto justify-center shadow-[0_4px_14px_rgba(225,48,108,0.2)]"
         >
           <Save className="w-4 h-4" />
           {saveMutation.isPending ? 'Saving...' : existing ? 'Update Automation' : 'Activate Automation'}
         </button>
      </div>

      {saveMutation.isError && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-fade-in flex-shrink-0">
          Something went wrong. Please check your connection and try again.
        </div>
      )}

      {/* ── Editor Workspace (60/40 Split) ── */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* ── Left Column: Form Controls (60%) ── */}
        <div className="flex-1 lg:flex-[0.6] overflow-y-auto no-scrollbar pb-10 space-y-5 pr-1">
          {isLoading ? (
             <div className="space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="animate-pulse bg-theme-border/50 h-32 rounded-2xl" />)}
             </div>
          ) : (
             <>
                {/* Automation Name */}
                <div className="card p-6 border-theme-border/50 shadow-sm">
                  <label className="block text-label font-medium mb-2">Automation Name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="e.g. Summer Sale Promo" />
                </div>

                {/* Trigger */}
                <div className="card p-6 border-theme-border/50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-ig" />
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border flex items-center justify-center">
                       <Zap className="w-4 h-4 text-theme-text-primary" />
                    </div>
                    <div>
                       <h2 className="text-base font-semibold text-theme-text-primary">Trigger</h2>
                       <p className="text-xs text-theme-text-secondary">What comment starts this automation?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {(['any_comment', 'keyword'] as TriggerMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTriggerMode(mode)}
                        className={clsx(
                          'p-4 rounded-xl border-2 text-sm font-semibold transition-all duration-200 text-left',
                          triggerMode === mode
                            ? 'border-theme-text-primary bg-theme-bg shadow-sm'
                            : 'border-theme-border/50 text-theme-text-secondary hover:border-theme-border bg-transparent'
                        )}
                      >
                        <span className="block mb-1">{mode === 'any_comment' ? '⚡ Any comment' : '🔑 Specific words'}</span>
                        <span className="text-[10px] font-medium text-theme-text-secondary/70">
                          {mode === 'any_comment' ? 'Fires on every single comment' : 'Only fires on specific keywords'}
                        </span>
                      </button>
                    ))}
                  </div>

                  {triggerMode === 'keyword' && (
                    <div className="animate-fade-in mt-4 pt-4 border-t border-theme-border/50">
                      <label className="block text-label font-medium mb-2">
                        Keywords (comma-separated)
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

                {/* Dynamic Link */}
                <div className="card p-6 border-theme-border/50 shadow-sm" id="tour-link-field">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border flex items-center justify-center">
                       <Link2 className="w-4 h-4 text-theme-text-primary" />
                    </div>
                    <div>
                       <h2 className="text-base font-semibold text-theme-text-primary">Destination Link</h2>
                       <p className="text-xs text-theme-text-secondary">Where should the user go?</p>
                    </div>
                  </div>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://your-link.com"
                    value={link}
                    onChange={(e) => setLink(e.currentTarget.value)}
                  />
                </div>

                {/* Private DM Text */}
                <div className="card p-6 border-theme-border/50 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border flex items-center justify-center">
                       <MessageCircle className="w-4 h-4 text-theme-text-primary" />
                    </div>
                    <div>
                       <h2 className="text-base font-semibold text-theme-text-primary">Private Reply (DM)</h2>
                       <p className="text-xs text-theme-text-secondary">Sent directly to their inbox</p>
                    </div>
                  </div>
                  <textarea
                    className="input resize-none"
                    rows={4}
                    value={dmText}
                    onChange={(e) => setDmText(e.currentTarget.value)}
                    placeholder="Your DM text… Use {{name}} for personalization."
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                     {['{{name}}', '{{username}}'].map(tag => (
                        <button key={tag} onClick={() => setDmText(prev => prev + tag)} className="text-[10px] font-semibold text-theme-text-secondary bg-theme-bg border border-theme-border px-2 py-1 rounded-md hover:text-theme-text-primary transition-colors">
                           {tag}
                        </button>
                     ))}
                  </div>
                </div>

                {/* Comment Reply */}
                <div className="card p-6 border-theme-border/50 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border flex items-center justify-center">
                         <MessageCircle className="w-4 h-4 text-theme-text-primary" />
                      </div>
                      <div>
                         <h2 className="text-base font-semibold text-theme-text-primary">Public Reply</h2>
                         <p className="text-xs text-theme-text-secondary">Reply in the comments section</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCommentReplyEnabled(!commentReplyEnabled)}
                      className={clsx('toggle', commentReplyEnabled ? 'toggle-on' : 'toggle-off')}
                    >
                      <span className="toggle-thumb" />
                    </button>
                  </div>
                  
                  {commentReplyEnabled && (
                    <div className="animate-fade-in pt-2">
                       <input
                         className="input"
                         value={commentReplyText}
                         onChange={(e) => setCommentReplyText(e.currentTarget.value)}
                         placeholder="Sent you a DM!"
                       />
                    </div>
                  )}
                </div>

                {/* Backfill */}
                <div className="card p-6 border-theme-border/50 shadow-sm" id="tour-backfill-toggle">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-theme-bg border border-theme-border flex items-center justify-center">
                         <Clock className="w-4 h-4 text-theme-text-primary" />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-theme-text-primary">Answer Old Comments</h2>
                        <p className="text-xs text-theme-text-secondary mt-0.5">
                          Reply to comments made before this was activated.
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
             </>
          )}
        </div>

        {/* ── Right Column: Live Mobile Preview (40%) ── */}
        <div className="hidden lg:flex flex-[0.4] flex-col relative pb-10">
           <div className="sticky top-0 bg-theme-surface border border-theme-border rounded-3xl h-[750px] shadow-2xl overflow-hidden flex flex-col">
              {/* Device Header */}
              <div className="bg-theme-bg py-4 border-b border-theme-border flex items-center justify-center relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-[24px] bg-theme-surface rounded-full border border-theme-border shadow-sm flex items-center justify-center">
                    <div className="w-[12px] h-[12px] rounded-full bg-black/80 flex items-center justify-center mr-1">
                       <div className="w-[4px] h-[4px] rounded-full bg-blue-900/50" />
                    </div>
                    <div className="w-[6px] h-[6px] rounded-full bg-theme-border/50" />
                 </div>
                 <div className="w-full px-6 flex justify-between items-center text-theme-text-secondary text-[11px] font-semibold mt-1">
                    <span>9:41</span>
                    <div className="flex gap-1.5 items-center">
                       <div className="w-3 h-3 rounded-full border border-theme-text-secondary flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-theme-text-secondary" /></div>
                    </div>
                 </div>
              </div>

              {/* Instagram DM UI Simulation */}
              <div className="flex-1 bg-theme-bg overflow-y-auto no-scrollbar flex flex-col">
                 <div className="p-4 border-b border-theme-border flex items-center gap-3 bg-theme-surface sticky top-0 z-10">
                    <ArrowLeft className="w-5 h-5 text-theme-text-primary" />
                    <div className="w-8 h-8 rounded-full bg-gradient-ig p-[1px]">
                       <div className="w-full h-full bg-theme-surface rounded-full flex items-center justify-center font-bold text-xs">U</div>
                    </div>
                    <div className="font-semibold text-sm text-theme-text-primary flex-1">@user</div>
                 </div>
                 
                 <div className="p-4 flex-1 flex flex-col justify-end">
                    <div className="text-center text-[10px] text-theme-text-secondary font-medium mb-6 uppercase tracking-wider">Today 9:41 AM</div>
                    
                    {/* User asking for link */}
                    <div className="flex justify-start mb-4">
                       <div className="bg-theme-surface border border-theme-border rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%]">
                          <p className="text-sm text-theme-text-primary">
                             {triggerMode === 'keyword' && keywords.length > 0 
                                ? `Send me the ${keywords.split(',')[0]}!` 
                                : 'Send me the link! 🔥'}
                          </p>
                       </div>
                    </div>

                    {/* Automation Reply */}
                    <div className="flex justify-end mb-2 animate-fade-in transition-all">
                       <div className="bg-gradient-ig p-[1px] rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                          <div className="bg-theme-surface rounded-[15px] px-4 py-3 w-full">
                             <p className="text-sm text-theme-text-primary whitespace-pre-wrap leading-relaxed">
                                {dmText.replace('{{name}}', 'Alex') || "Your message will appear here..."}
                             </p>
                             
                             {link && (
                               <div className="mt-3 p-3 bg-theme-bg rounded-xl border border-theme-border flex items-center gap-3 active:scale-[0.98] transition-transform cursor-pointer">
                                  <div className="w-10 h-10 rounded-lg bg-theme-border/50 flex items-center justify-center text-theme-text-secondary flex-shrink-0">
                                     <Link2 className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <p className="text-sm font-semibold text-theme-text-primary truncate">Get Link</p>
                                     <p className="text-[10px] text-theme-text-secondary truncate">{new URL(link || 'https://example.com').hostname}</p>
                                  </div>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                    <div className="text-[10px] text-theme-text-secondary text-right font-medium pr-1 mb-6">Seen</div>
                 </div>

                 {/* Input Simulation */}
                 <div className="p-4 bg-theme-surface border-t border-theme-border mt-auto">
                    <div className="h-10 rounded-full border border-theme-border bg-theme-bg px-4 flex items-center gap-2">
                       <div className="w-6 h-6 rounded-full bg-gradient-ig flex items-center justify-center text-white"><Smartphone className="w-3 h-3" /></div>
                       <span className="text-sm text-theme-text-secondary">Message...</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
