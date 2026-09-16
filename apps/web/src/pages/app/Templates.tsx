import { useState, useMemo } from 'react';
import { MessageSquare, LayoutTemplate, Smartphone, Save, Link2, MessageCircle, X } from 'lucide-react';
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
    isSystem: true
  },
  {
    name: 'Professional Sales',
    bundle: {
      privateReply: 'Hello {{name}}. Thank you for your interest. Click the button below to access the requested resource.',
      commentReply: 'We have sent a direct message to your inbox with the information.',
      linkDm: 'Here is your direct access link. We look forward to working with you.',
    },
    isSystem: true
  },
  {
    name: 'Urgent Promo',
    bundle: {
      privateReply: 'Hey {{name}}! 🔥 The deal is almost gone. Tap below to claim your spot before it expires!',
      commentReply: 'Sent! 🚀 Check your DMs before the link expires!',
      linkDm: 'Here is your VIP link! Act fast! ⏳',
    },
    isSystem: true
  }
];

export default function Templates() {
  const queryClient = useQueryClient();
  const [selectedTheme, setSelectedTheme] = useState<BundleTemplate>(DEFAULT_THEMES[0]!);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  
  const { data: dbTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.post('/templates', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert('Template saved to your library!');
    }
  });

  const allTemplates = useMemo(() => {
    const userBundles = (dbTemplates || []).filter((t: any) => t.kind === 'bundle').map((t: any) => ({
      _id: t._id,
      name: t.name,
      bundle: {
        privateReply: t.bundle?.privateReply ?? '',
        commentReply: t.bundle?.commentReply ?? '',
        linkDm: t.bundle?.linkDm ?? '',
      },
      isSystem: t.isSystem
    }));
    return [...DEFAULT_THEMES, ...userBundles];
  }, [dbTemplates]);

  const handleUpdate = (field: keyof BundleTemplate['bundle'], value: string) => {
    setSelectedTheme(prev => ({
      ...prev,
      bundle: { ...prev.bundle, [field]: value }
    }));
  };

  const handleSave = () => {
    saveMutation.mutate({
      name: selectedTheme.name + ' (Custom)',
      kind: 'bundle',
      bundle: selectedTheme.bundle
    });
  };

  return (
    <div className="section-padding h-[calc(100vh-60px)] md:h-screen flex flex-col max-w-7xl mx-auto overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Template Themes</h1>
          <p className="text-white/50 text-sm mt-0.5">Pick a bundle, customize it, and preview how it looks.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
        
        {/* Left Column: Selection and Editor */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto pr-2 pb-10">
          
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">1. Select a Theme</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            {allTemplates.map((theme, i) => (
              <button
                key={theme._id || i}
                onClick={() => setSelectedTheme(theme)}
                className={clsx(
                  'p-4 rounded-xl border text-left transition-all duration-200',
                  selectedTheme.name === theme.name 
                    ? 'bg-brand-500/10 border-brand-500 shadow-brand' 
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <LayoutTemplate className={clsx("w-4 h-4", selectedTheme.name === theme.name ? "text-brand-400" : "text-white/40")} />
                  <span className="font-semibold text-sm text-white">{theme.name}</span>
                </div>
                <p className="text-xs text-white/40 line-clamp-1">{theme.bundle.privateReply}</p>
              </button>
            ))}
          </div>

          <div className="h-px w-full bg-white/10 my-2 shrink-0" />

          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">2. Customize Bundle</h2>
          
          <div className="space-y-4 shrink-0">
            {/* Private Reply */}
            <div className="card p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-white">Private Reply (First DM)</span>
              </div>
              <textarea 
                className="input resize-none h-20 text-sm" 
                value={selectedTheme.bundle.privateReply}
                onChange={(e) => handleUpdate('privateReply', e.target.value)}
              />
            </div>

            {/* Link DM */}
            <div className="card p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-white">Link DM (After button tap)</span>
              </div>
              <textarea 
                className="input resize-none h-16 text-sm" 
                value={selectedTheme.bundle.linkDm}
                onChange={(e) => handleUpdate('linkDm', e.target.value)}
              />
            </div>

            {/* Public Comment */}
            <div className="card p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Public Comment Reply</span>
              </div>
              <input 
                className="input text-sm" 
                value={selectedTheme.bundle.commentReply}
                onChange={(e) => handleUpdate('commentReply', e.target.value)}
              />
            </div>
            
            <button 
              onClick={handleSave} 
              disabled={saveMutation.isPending}
              className="btn-primary w-full justify-center mt-2"
            >
              <Save className="w-4 h-4" />
              Save to Library
            </button>
          </div>

        </div>

        {/* Floating Mobile Button */}
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button 
            onClick={() => setShowMobilePreview(true)}
            className="btn-primary shadow-2xl rounded-full px-6 py-3 bg-brand-600 hover:bg-brand-500"
          >
            <Smartphone className="w-5 h-5 mr-1" />
            See Live Preview
          </button>
        </div>

        {/* Right Column: Live Preview */}
        <div className={clsx(
          "w-full lg:w-1/2 flex-col items-center justify-center bg-surface-50 rounded-3xl border border-white/5 relative overflow-hidden p-6 lg:p-0 min-h-[600px]",
          !showMobilePreview && "hidden lg:flex",
          showMobilePreview && "fixed inset-0 z-50 bg-black/95 m-0 rounded-none min-h-screen !flex overflow-y-auto pt-20 pb-10"
        )}>
          {showMobilePreview && (
            <button 
              onClick={() => setShowMobilePreview(false)}
              className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          )}

          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-purple-500/10 pointer-events-none" />
          
          <h2 className="absolute top-6 left-6 text-sm font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> Live Preview
          </h2>

          {/* Simulated Phone Mockup */}
          <div className="relative w-[320px] h-[640px] bg-black rounded-[40px] border-[8px] border-[#1e1e24] shadow-2xl flex flex-col overflow-hidden z-10">
            {/* Phone Notch */}
            <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
              <div className="w-32 h-6 bg-[#1e1e24] rounded-b-xl" />
            </div>

            {/* Header */}
            <div className="pt-10 pb-3 px-4 border-b border-white/10 bg-[#121212] flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-orange-400 p-[2px]">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">IG</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Your Brand</p>
                <p className="text-[10px] text-white/50">ReplyBridge Automation</p>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#000000] p-4 flex flex-col gap-4 overflow-y-auto text-sm">
              
              {/* Comment Simulation */}
              <div className="bg-[#121212] p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-medium text-white/40 mb-1">Public Comment Section</p>
                <p className="text-white text-xs"><b>@user:</b> Send me the link please!</p>
                <div className="mt-2 pl-3 border-l-2 border-brand-500/50">
                  <p className="text-white/80 text-xs"><b>@yourbrand:</b> {selectedTheme.bundle.commentReply}</p>
                </div>
              </div>

              <div className="w-full h-px bg-white/5 my-2" />

              <p className="text-[10px] text-center font-medium text-white/30 uppercase tracking-wider">Direct Messages</p>

              {/* Private Reply Simulation */}
              <div className="self-start max-w-[85%]">
                <div className="bg-[#262626] text-white p-3 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed shadow-md">
                  {selectedTheme.bundle.privateReply.replace('{{name}}', 'Alex')}
                </div>
                {/* Simulated Button Template */}
                <div className="mt-1 bg-[#262626] border border-white/10 rounded-xl overflow-hidden cursor-pointer hover:bg-[#333333] transition-colors text-center py-2 shadow-md">
                  <span className="text-[#3b82f6] font-semibold text-sm">Get Link</span>
                </div>
              </div>

              {/* User Tapping Button Simulation */}
              <div className="self-end max-w-[85%] mt-2">
                <div className="bg-[#3797f0] text-white p-3 rounded-2xl rounded-tr-sm text-[13px] shadow-md">
                  Get Link
                </div>
              </div>

              {/* Link DM Simulation */}
              <div className="self-start max-w-[85%] mt-2 mb-6">
                <div className="bg-[#262626] text-white p-3 rounded-2xl rounded-tl-sm text-[13px] leading-relaxed shadow-md">
                  {selectedTheme.bundle.linkDm}
                  <div className="mt-2 p-2 bg-[#121212] rounded-lg border border-white/10 flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-500/20 rounded flex items-center justify-center">
                      <Link2 className="w-4 h-4 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/80 truncate">https://your-link.com</p>
                      <p className="text-[9px] text-white/40 uppercase">Tap to visit</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
