// apps/web/src/pages/legal/PrivacyPolicy.tsx
// REQUIRED for Meta App Review (doc 10 §Privacy Policy Requirements)
// Content from 08-privacy-policy.md — must be hosted at a stable public URL
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-theme-bg">
      <nav className="flex items-center gap-3 px-6 py-4 border-b border-theme-border bg-theme-surface">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-theme-border flex-shrink-0 bg-theme-surface">
             <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover" />
          </div>
          <span className="font-display font-semibold text-theme-text-primary text-sm tracking-tight">ReplyBridge</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-display-lg text-theme-text-primary mb-2 text-3xl">Privacy Policy</h1>
        <p className="text-theme-text-secondary text-sm mb-12">Last updated: September 2025</p>

        <section className="mb-10">
          <h2 className="text-title text-xl text-theme-text-primary mb-3">1. Who we are</h2>
          <p className="text-body text-theme-text-secondary leading-relaxed">
            Craftovon ("we", "our", "us") operates ReplyBridge, a tool that automates Instagram comment-to-DM replies. 
            Our registered address and Data Protection contact: <strong className="text-theme-text-primary">virat18mvk@gmail.com</strong>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-title text-xl text-theme-text-primary mb-3">2. What data we collect</h2>
          <ul className="space-y-3 text-body text-theme-text-secondary leading-relaxed">
            <li><strong className="text-theme-text-primary font-medium">Account data:</strong> email address, name, and hashed password.</li>
            <li><strong className="text-theme-text-primary font-medium">Instagram data:</strong> your professional account ID, username, media metadata (captions, thumbnails, post timestamps), and comment text from your reels. We access this via the Instagram Graph API.</li>
            <li><strong className="text-theme-text-primary font-medium">Message data:</strong> we log which DMs were sent, to which recipient IDs, and their delivery status. We do not store the content of DMs sent by commenters back to you.</li>
            <li><strong className="text-theme-text-primary font-medium">Usage data:</strong> automation statistics (DMs sent, link taps) and timestamps.</li>
            <li><strong className="text-theme-text-primary font-medium">Technical data:</strong> IP address, browser user-agent, and server logs retained for 30 days.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-title text-xl text-theme-text-primary mb-3">3. How we use your data</h2>
          <ul className="space-y-3 text-body text-theme-text-secondary leading-relaxed">
            <li>To provide the automation service (reading comments, sending DMs on your behalf).</li>
            <li>To send you transactional emails (account creation, token expiry alerts).</li>
            <li>To generate analytics visible only to you.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          <p className="text-body text-theme-text-secondary mt-4">
            We do <strong className="text-theme-text-primary font-medium">not</strong> sell your data or use it for advertising.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-title text-xl text-theme-text-primary mb-3">4. Instagram data & Meta permissions</h2>
          <p className="text-body text-theme-text-secondary leading-relaxed mb-3">
            We request three permissions via Instagram Login:
          </p>
          <ul className="space-y-2 text-body text-theme-text-secondary list-disc pl-5">
            <li><code className="bg-theme-border/50 px-1.5 py-0.5 rounded text-theme-text-primary text-xs">instagram_business_basic</code> — to read your profile, account ID, and media list.</li>
            <li><code className="bg-theme-border/50 px-1.5 py-0.5 rounded text-theme-text-primary text-xs">instagram_business_manage_comments</code> — to read comments on your reels and post public comment replies.</li>
            <li><code className="bg-theme-border/50 px-1.5 py-0.5 rounded text-theme-text-primary text-xs">instagram_business_manage_messages</code> — to send DMs to commenters who respond to our initial message.</li>
          </ul>
          <p className="text-body text-theme-text-secondary mt-4 leading-relaxed">
            Your Instagram access token is stored encrypted and is never transmitted in plaintext.
            We only send DMs within open messaging windows as defined by Meta policy — we never cold-DM anyone.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-title text-xl text-theme-text-primary mb-3">5. Data retention</h2>
          <ul className="space-y-3 text-body text-theme-text-secondary leading-relaxed list-disc pl-5">
            <li>Comment event logs: 180 days, then auto-deleted.</li>
            <li>Message delivery logs: 180 days, then auto-deleted.</li>
            <li>Conversation state: 24 hours from last activity.</li>
            <li>Account and automation data: until you delete your account.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-title text-xl text-theme-text-primary mb-3">6. Your rights</h2>
          <p className="text-body text-theme-text-secondary leading-relaxed">
            You can request access, correction, or deletion of your data at any time.
            Email <a href="mailto:virat18mvk@gmail.com" className="text-theme-text-primary hover:underline font-medium">virat18mvk@gmail.com</a> or
            visit the <Link to="/data-deletion" className="text-theme-text-primary hover:underline font-medium">Data Deletion page</Link>.
            We will respond within 30 days.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-title text-xl text-theme-text-primary mb-3">7. Contact</h2>
          <p className="text-body text-theme-text-secondary">
            For privacy questions: <a href="mailto:virat18mvk@gmail.com" className="text-theme-text-primary hover:underline font-medium">virat18mvk@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
