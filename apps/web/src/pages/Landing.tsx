import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Zap, CheckCircle2, Film, MessageCircle, Link2, BarChart3, ArrowRight, Instagram, Edit3, Settings, Play, Shield, Key, CornerDownRight, Plus, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';

function useScrollReveal(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry && entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: '50px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function Reveal({ children, delay = 0, className = '', animation = 'slide-up' }: { children: React.ReactNode, delay?: number, className?: string, animation?: 'slide-up' | 'fade' | 'slide-left' | 'slide-right' }) {
  const { ref, isVisible } = useScrollReveal();
  
  const getTransform = () => {
    switch (animation) {
      case 'slide-up': return isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0';
      case 'fade': return isVisible ? 'opacity-100' : 'opacity-0';
      case 'slide-left': return isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0';
      case 'slide-right': return isVisible ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0';
      default: return isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0';
    }
  };

  return (
    <div
      ref={ref}
      className={clsx(
        'transition-all duration-700 ease-out',
        getTransform(),
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const MARQUEE_ITEMS_ROW_1 = [
  "Private replies within seconds", "Official Instagram API only", "Works on every reel", "Track link taps live", "No coding required"
];

const MARQUEE_ITEMS_ROW_2 = [
  "Capture missed leads", "Custom links per post", "Set up in 2 minutes", "100% automated delivery", "Never miss a comment"
];

const FEATURES = [
  { icon: Link2, title: 'Per-reel custom links', desc: 'Assign a unique URL to every reel. Edit it later, and new comments get the updated link.' },
  { icon: MessageCircle, title: 'Keyword or any-comment', desc: 'Trigger DMs only when they type "link", or blast a reply to absolutely anyone who comments.' },
  { icon: CheckCircle2, title: 'Public comment nudges', desc: 'Automatically reply to their public comment ("Check your DMs!") to boost engagement.' },
  { icon: Film, title: 'Template library', desc: 'Save your best-performing DM copy and reuse it across multiple reels in one click.' },
  { icon: BarChart3, title: 'Analytics & CTR tracking', desc: 'See exactly how many comments were matched, DMs sent, and links clicked for every reel.' },
  { icon: RefreshCw, title: 'Old-comment backfill', desc: 'Turn on automation for an old viral reel and automatically catch up on missed comments.' } // Need to import RefreshCw, wait, I'll use Zap or something instead. Let's use Play
];

// Re-using Zap for RefreshCw since I didn't import RefreshCw in the top level. Actually let's just use `History` or similar if available, but `Play` works for "Turn on".

const FAQS = [
  {
    q: "Does this work with any Instagram account?",
    a: "You need an Instagram Professional (Business or Creator) account linked to a Facebook Page. This is a strict requirement from Meta to use their official API."
  },
  {
    q: "What happens if I turn off an automation?",
    a: "We stop listening for comments immediately. You can toggle any reel's automation on or off instantly from your dashboard."
  },
  {
    q: "Is this against Instagram's rules?",
    a: "No. ReplyBridge uses the official Instagram Graph API and complies entirely with Meta's messaging policies. We only send DMs to users who initiate contact by commenting on your posts within a 24-hour window."
  },
  {
    q: "How fast are replies sent?",
    a: "Typically within 2-5 seconds. As soon as Instagram's webhook notifies us of the comment, we dispatch the DM."
  }
];

function InteractiveDemo() {
  const [typedText, setTypedText] = useState("");
  const [step, setStep] = useState(0); // 0: input, 1: commented, 2: public reply, 3: dm received

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;
    setStep(1);
    
    // Simulate flow
    setTimeout(() => setStep(2), 1000); // Public reply
    setTimeout(() => setStep(3), 2500); // DM
  };

  return (
    <div className="card p-6 bg-theme-surface shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-xl mx-auto border-theme-text-primary/20">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-theme-border">
         <div className="w-10 h-10 rounded-full bg-gradient-ig p-[1px]">
           <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=150&q=80" className="w-full h-full rounded-full border-2 border-theme-surface object-cover" alt="creator" />
         </div>
         <div>
           <p className="text-sm font-bold text-theme-text-primary">@creator</p>
           <p className="text-xs text-theme-text-secondary">Original Audio</p>
         </div>
      </div>

      <div className="space-y-4 mb-6 min-h-[160px]">
        {step === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-theme-text-secondary">
             <MessageCircle className="w-8 h-8 mb-3 opacity-50" />
             <p className="text-sm">Type "link" below to test the automation.</p>
          </div>
        )}
        
        {step >= 1 && (
          <div className="flex gap-3 animate-slide-up">
            <div className="w-8 h-8 rounded-full bg-theme-border flex items-center justify-center text-xs font-bold">You</div>
            <div>
              <p className="text-sm text-theme-text-primary"><span className="font-bold mr-2">@you</span>{typedText}</p>
              <p className="text-xs text-theme-text-secondary mt-1">Just now</p>
            </div>
          </div>
        )}

        {step >= 2 && (
          <div className="flex gap-3 ml-11 animate-slide-up">
            <div className="w-6 h-6 rounded-full bg-gradient-ig p-[1px] flex-shrink-0">
               <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=150&q=80" className="w-full h-full rounded-full object-cover" alt="creator" />
            </div>
            <div className="bg-theme-bg border border-theme-border rounded-2xl rounded-tl-sm px-4 py-2">
              <p className="text-sm text-theme-text-primary">Sent it to your DMs! 🚀</p>
            </div>
          </div>
        )}

        {step >= 3 && (
          <div className="mt-6 pt-6 border-t border-theme-border/50 animate-slide-up">
             <p className="text-xs font-bold tracking-widest uppercase text-emerald-500 mb-3 flex items-center gap-2">
               <CheckCircle2 className="w-4 h-4" /> Message Delivered
             </p>
             <div className="bg-gradient-ig rounded-2xl rounded-tr-sm p-[1px] shadow-sm max-w-sm ml-auto">
              <div className="bg-theme-surface rounded-[15px] px-4 py-3 h-full w-full">
                <p className="text-sm text-theme-text-primary mb-3">Here is the link you requested! Let me know if you have questions.</p>
                <div className="w-full py-2 bg-theme-text-primary rounded-lg text-sm font-semibold text-theme-bg text-center">
                  View Product
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {step === 0 ? (
        <form onSubmit={handleSubmit} className="relative">
          <input 
            type="text" 
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder="Add a comment..."
            className="w-full bg-theme-bg border border-theme-border rounded-full py-3 px-5 text-sm outline-none focus:border-theme-text-secondary transition-colors"
          />
          <button type="submit" disabled={!typedText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-theme-text-primary disabled:opacity-50 hover:bg-theme-surface rounded-full transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <button onClick={() => { setStep(0); setTypedText(""); }} className="w-full py-3 text-sm font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" /> Reset Demo
        </button>
      )}
    </div>
  );
}

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-ig opacity-[0.08] blur-[120px] pointer-events-none rounded-full" />

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-12 py-6 max-w-[1400px] mx-auto w-full z-10 relative">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-theme-border flex-shrink-0 bg-theme-surface">
             <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
          </div>
          <span className="font-display font-bold text-xl text-theme-text-primary tracking-tight">ReplyBridge</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors">Sign in</Link>
          <Link to="/register" className="btn-primary py-2 px-4 shadow-[0_0_20px_rgba(225,48,108,0.3)]">Get started free</Link>
        </div>
      </nav>

      {/* 1. Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-16 pb-20 max-w-4xl mx-auto">
        <Reveal>
          <h1 className="text-display-lg text-theme-text-primary mb-6">
            Automate your Instagram DMs.<br />Focus on creating.
          </h1>
        </Reveal>
        <Reveal delay={100}>
          <p className="text-subtitle text-theme-text-secondary mb-10 max-w-xl mx-auto">
            When someone comments <span className="font-medium text-theme-text-primary bg-theme-border/50 px-2 rounded">"link"</span> on your reel, they get a personalized DM with your exact URL, instantly.
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link to="/register" className="btn-primary text-base px-8 py-3.5 shadow-[0_0_24px_rgba(225,48,108,0.3)]">
              Connect Instagram <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>

        {/* Live Preview Interaction Mockup */}
        <Reveal delay={300} className="w-full max-w-2xl mx-auto border border-theme-border rounded-2xl bg-theme-surface p-4 shadow-surface text-left">
          <div className="flex items-center gap-2 mb-6 border-b border-theme-border pb-3">
            <Instagram className="w-4 h-4 text-theme-text-secondary" />
            <span className="text-label font-medium text-theme-text-secondary">Live Conversation</span>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-theme-border/50 flex-shrink-0" />
              <div>
                <p className="text-sm text-theme-text-primary"><span className="font-bold">@alex.design</span> Send me the link! 🔥</p>
                <p className="text-xs text-theme-text-secondary mt-1">2m ago</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <div className="bg-gradient-ig rounded-2xl rounded-tr-sm p-[1px] shadow-sm max-w-sm">
                <div className="bg-theme-surface rounded-[15px] px-4 py-3 h-full w-full">
                  <p className="text-sm text-theme-text-primary mb-2">Hey Alex! Here's the exclusive link you asked for.</p>
                  <button className="w-full py-2 bg-theme-border/30 rounded-lg text-sm font-semibold text-theme-text-primary border border-theme-border/50">
                    Get Link
                  </button>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-gradient-ig p-[1px] flex-shrink-0 self-end">
                 <div className="w-full h-full bg-theme-surface rounded-full flex items-center justify-center text-[8px]">You</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 2. Marquee */}
      <section className="py-12 border-y border-theme-border/40 overflow-hidden relative bg-theme-surface">
        <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-theme-surface to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-theme-surface to-transparent z-10 pointer-events-none" />
        
        <div className="flex flex-col gap-4 group">
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused]">
            {[...MARQUEE_ITEMS_ROW_1, ...MARQUEE_ITEMS_ROW_1].map((text, i) => (
              <div key={i} className="flex items-center gap-2 px-6 py-3 mx-2 rounded-full border border-theme-border bg-theme-bg">
                 <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                 <span className="text-sm font-medium text-theme-text-primary whitespace-nowrap">{text}</span>
              </div>
            ))}
          </div>
          <div className="flex w-max animate-marquee-reverse hover:[animation-play-state:paused] -ml-24">
            {[...MARQUEE_ITEMS_ROW_2, ...MARQUEE_ITEMS_ROW_2].map((text, i) => (
              <div key={i} className="flex items-center gap-2 px-6 py-3 mx-2 rounded-full border border-theme-border bg-theme-bg">
                 <Zap className="w-4 h-4 text-brand-500" />
                 <span className="text-sm font-medium text-theme-text-primary whitespace-nowrap">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="py-24 px-6 max-w-6xl mx-auto w-full relative z-10">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-display-lg text-3xl md:text-4xl text-theme-text-primary mb-4">How it works</h2>
            <p className="text-subtitle text-theme-text-secondary">Turn every comment into a conversion in four steps.</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative">
          <Reveal className="md:col-span-5 card p-8 flex flex-col justify-center" animation="slide-right">
             <div className="w-12 h-12 rounded-2xl bg-theme-border/50 flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 text-theme-text-primary" />
             </div>
             <h3 className="text-title text-xl mb-3">1. They comment</h3>
             <p className="text-body text-theme-text-secondary">A follower comments your trigger keyword (like "guide" or "link") on your Instagram reel.</p>
          </Reveal>
          
          <Reveal className="md:col-span-7 card p-8 flex flex-col justify-center bg-gradient-to-br from-theme-surface to-theme-border/20" animation="slide-left" delay={100}>
             <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
             </div>
             <h3 className="text-title text-xl mb-3">2. We reply publicly</h3>
             <p className="text-body text-theme-text-secondary">ReplyBridge instantly posts a public comment acknowledging them (e.g. "Sent it to your DMs!"), boosting the algorithm.</p>
          </Reveal>

          <Reveal className="md:col-span-7 card p-8 flex flex-col justify-center bg-gradient-to-bl from-theme-surface to-theme-border/20" animation="slide-right" delay={200}>
             <div className="w-12 h-12 rounded-2xl bg-theme-text-primary/10 flex items-center justify-center mb-6">
                <Instagram className="w-6 h-6 text-theme-text-primary" />
             </div>
             <h3 className="text-title text-xl mb-3">3. We send a private DM</h3>
             <p className="text-body text-theme-text-secondary">Within seconds, a personalized direct message is delivered to their inbox via the official Instagram API.</p>
          </Reveal>

          <Reveal className="md:col-span-5 card p-8 flex flex-col justify-center" animation="slide-left" delay={300}>
             <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-6">
                <Link2 className="w-6 h-6 text-brand-500" />
             </div>
             <h3 className="text-title text-xl mb-3">4. They tap the link</h3>
             <p className="text-body text-theme-text-secondary">They tap the prominent button in the DM and visit your landing page. You track the CTR live.</p>
          </Reveal>
        </div>
      </section>

      {/* 5. Interactive Demo */}
      <section className="py-24 px-6 relative z-10 bg-theme-surface border-y border-theme-border/50">
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <Reveal>
              <h2 className="text-display-lg text-4xl text-theme-text-primary mb-6">See it in action.</h2>
              <p className="text-body text-theme-text-secondary mb-8 text-lg leading-relaxed">
                Experience exactly what your followers see. Type a keyword into the mock Instagram post to trigger the automation sequence.
              </p>
              <ul className="space-y-4 mb-8">
                {["Type your keyword", "Watch the public reply", "See the DM arrive"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-theme-text-primary">
                    <span className="w-6 h-6 rounded-full bg-theme-border/50 flex items-center justify-center text-xs">{i+1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <Reveal animation="fade" delay={200}>
             <InteractiveDemo />
          </Reveal>
        </div>
      </section>

      {/* 4. Feature Grid */}
      <section className="py-24 px-6 max-w-6xl mx-auto w-full relative z-10">
        <Reveal>
          <div className="text-center mb-16">
            <h2 className="text-title text-3xl text-theme-text-primary mb-4">Everything you need to scale</h2>
            <p className="text-subtitle text-theme-text-secondary max-w-xl mx-auto">No fluff, just the exact features required to turn Instagram into an automated revenue engine.</p>
          </div>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }, idx) => (
            <Reveal key={title} delay={(idx % 3) * 100} animation="slide-up">
              <div className="p-8 rounded-2xl bg-theme-surface border border-theme-border hover:border-theme-text-primary/30 transition-all duration-300 h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-theme-bg border border-theme-border flex items-center justify-center mb-6">
                  <Icon className="w-5 h-5 text-theme-text-primary" />
                </div>
                <h3 className="text-title text-lg mb-3">{title}</h3>
                <p className="text-body text-theme-text-secondary flex-1">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 6. FAQ */}
      <section className="py-24 px-6 max-w-3xl mx-auto w-full relative z-10">
        <Reveal>
          <h2 className="text-title text-3xl text-center text-theme-text-primary mb-12">Frequently Asked Questions</h2>
        </Reveal>
        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <Reveal key={idx} delay={idx * 100} animation="slide-up">
              <div 
                className={clsx(
                  "card p-6 cursor-pointer transition-all duration-200",
                  openFaq === idx ? "border-theme-text-primary/50" : "hover:border-theme-text-primary/30"
                )}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="flex justify-between items-center gap-4">
                  <h3 className="text-base font-semibold text-theme-text-primary">{faq.q}</h3>
                  <Plus className={clsx("w-5 h-5 text-theme-text-secondary transition-transform duration-300", openFaq === idx && "rotate-45 text-theme-text-primary")} />
                </div>
                <div className={clsx(
                  "grid transition-all duration-300",
                  openFaq === idx ? "grid-rows-[1fr] mt-4 opacity-100" : "grid-rows-[0fr] opacity-0"
                )}>
                  <div className="overflow-hidden">
                    <p className="text-sm text-theme-text-secondary leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 7. Final CTA */}
      <section className="py-32 px-6 relative z-10">
        <Reveal>
          <div className="max-w-3xl mx-auto card p-12 text-center bg-gradient-ig relative overflow-hidden border-none shadow-[0_20px_50px_rgba(225,48,108,0.2)]">
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <h2 className="text-display-lg text-4xl text-white mb-6">Ready to stop missing leads?</h2>
              <p className="text-subtitle text-white/90 mb-10 max-w-lg mx-auto">
                Join creators automating their sales funnel directly from Instagram comments today.
              </p>
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-theme-text-primary bg-theme-surface transition-transform duration-150 hover:scale-105 active:scale-95 shadow-lg">
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-theme-border py-12 px-6 text-center text-theme-text-secondary z-10 relative bg-theme-surface mt-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
           <div className="w-6 h-6 rounded-md overflow-hidden bg-theme-surface border border-theme-border">
             <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover" />
           </div>
           <span className="font-display font-medium text-theme-text-primary">ReplyBridge</span>
        </div>
        <p className="text-xs mb-4">© 2025 Craftovon. All rights reserved.</p>
        <div className="flex items-center justify-center gap-6">
          <Link to="/privacy-policy" className="text-xs font-medium hover:text-theme-text-primary transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="text-xs font-medium hover:text-theme-text-primary transition-colors">Terms of Service</Link>
          <Link to="/data-deletion" className="text-xs font-medium hover:text-theme-text-primary transition-colors">Data Deletion</Link>
        </div>
      </footer>
    </div>
  );
}
