// apps/web/src/pages/Landing.tsx
// Public landing page
import { Link, Navigate } from 'react-router-dom';
import { Zap, CheckCircle2, Film, MessageCircle, Link2, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store.js';

const FEATURES = [
  { icon: Film, title: 'Per-reel automations', desc: 'Every reel gets its own trigger, DM text, and link. No one-size-fits-all.' },
  { icon: MessageCircle, title: 'Instant private replies', desc: 'Comments trigger a DM within seconds. Never miss a lead.' },
  { icon: Link2, title: 'Dynamic per-reel links', desc: 'Edit the link anytime. New comments instantly get the latest URL.' },
  { icon: BarChart3, title: 'Full analytics', desc: 'Track comments matched, DMs sent, and link taps per reel.' },
];

const PRICING = [
  { key: 'free', name: 'Free', price: '$0', features: ['1 IG account', '500 DMs/month', '3 automations'], cta: 'Get started' },
  { key: 'starter', name: 'Starter', price: '$19/mo', features: ['2 IG accounts', '5,000 DMs/month', '20 automations', 'Analytics'], cta: 'Start free trial', popular: true },
  { key: 'pro', name: 'Pro', price: '$49/mo', features: ['5 IG accounts', '25,000 DMs/month', 'Unlimited automations', 'API access'], cta: 'Start free trial' },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">ReplyBridge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost">Sign in</Link>
          <Link to="/register" className="btn-primary">Get started free</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="text-center py-28 px-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-medium mb-6 animate-fade-in">
          <Zap className="w-3 h-3" />
          Instagram comment → DM automation
        </div>
        <h1 className="text-5xl font-extrabold text-white leading-tight mb-6 animate-slide-up">
          Automate every reel's DMs,{' '}
          <span className="gradient-text">hands-free.</span>
        </h1>
        <p className="text-xl text-white/60 mb-10 max-w-xl mx-auto leading-relaxed animate-slide-up">
          Someone comments "link" on your reel → they get a personalized DM with your link, instantly.
          No manual work, no missed leads.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/register" className="btn-primary px-8 py-3.5 text-base">
            Start free — no credit card
          </Link>
          <Link to="/login" className="btn-secondary px-6 py-3.5 text-base">Sign in</Link>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Everything you need</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-hover p-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Simple pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING.map(({ key, name, price, features, cta, popular }) => (
            <div
              key={key}
              className={`card p-6 relative ${popular ? 'border-brand-500/50 bg-gradient-card shadow-brand' : ''}`}
            >
              {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="badge badge-purple">Most popular</span>
                </div>
              )}
              <h3 className="font-bold text-white mb-1">{name}</h3>
              <p className="text-2xl font-extrabold text-white mb-4">{price}</p>
              <ul className="space-y-2 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={popular ? 'btn-primary w-full justify-center' : 'btn-secondary w-full justify-center'}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 py-8 px-6 text-center text-xs text-white/30">
        <p>© 2025 Craftovon. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white">Terms of Service</Link>
          <Link to="/data-deletion" className="hover:text-white">Data Deletion</Link>
        </div>
      </footer>
    </div>
  );
}
