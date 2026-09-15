// apps/web/src/pages/legal/PrivacyPolicy.tsx
// REQUIRED for Meta App Review (doc 10 §Privacy Policy Requirements)
// Content from 08-privacy-policy.md — must be hosted at a stable public URL
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-3 px-6 py-4 border-b border-white/8">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-white text-sm">ReplyBridge</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: September 2025</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">1. Who we are</h2>
          <p className="text-white/70">
            Craftovon ("we", "our", "us") operates ReplyBridge, an Instagram comment-to-DM
            automation SaaS. Our registered address and Data Protection contact:
            <strong className="text-white"> virat18mvk@gmail.com</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">2. What data we collect</h2>
          <ul className="space-y-2 text-white/70">
            <li><strong className="text-white">Account data:</strong> email address, name, and hashed password.</li>
            <li><strong className="text-white">Instagram data:</strong> your professional account ID, username, media metadata (captions, thumbnails, post timestamps), and comment text from your reels. We access this via the Instagram Graph API.</li>
            <li><strong className="text-white">Message data:</strong> we log which DMs were sent, to which recipient IDs, and their delivery status. We do not store the content of DMs sent by commenters back to you.</li>
            <li><strong className="text-white">Usage data:</strong> automation statistics (DMs sent, link taps) and timestamps.</li>
            <li><strong className="text-white">Technical data:</strong> IP address, browser user-agent, and server logs retained for 30 days.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">3. How we use your data</h2>
          <ul className="space-y-2 text-white/70">
            <li>To provide the automation service (reading comments, sending DMs on your behalf).</li>
            <li>To send you transactional emails (account creation, token expiry alerts).</li>
            <li>To generate analytics visible only to you.</li>
            <li>To comply with legal obligations.</li>
          </ul>
          <p className="text-white/70 mt-3">
            We do <strong className="text-white">not</strong> sell your data or use it for advertising.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">4. Instagram data & Meta permissions</h2>
          <p className="text-white/70">
            We request three permissions via Instagram Login:
          </p>
          <ul className="space-y-1 text-white/70 mt-2">
            <li><code className="text-brand-300">instagram_business_basic</code> — to read your profile, account ID, and media list.</li>
            <li><code className="text-brand-300">instagram_business_manage_comments</code> — to read comments on your reels and post public comment replies.</li>
            <li><code className="text-brand-300">instagram_business_manage_messages</code> — to send DMs to commenters who respond to our initial message.</li>
          </ul>
          <p className="text-white/70 mt-3">
            Your Instagram access token is stored encrypted (AES-256-GCM) and is never transmitted in plaintext.
            We only send DMs within open messaging windows as defined by Meta policy — we never cold-DM anyone.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">5. Data retention</h2>
          <ul className="space-y-2 text-white/70">
            <li>Comment event logs: 180 days, then auto-deleted.</li>
            <li>Message delivery logs: 180 days, then auto-deleted.</li>
            <li>Conversation state: 24 hours from last activity.</li>
            <li>Account and automation data: until you delete your account.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">6. Your rights</h2>
          <p className="text-white/70">
            You can request access, correction, or deletion of your data at any time.
            Email <a href="mailto:virat18mvk@gmail.com" className="text-brand-400">virat18mvk@gmail.com</a> or
            visit the <Link to="/data-deletion" className="text-brand-400">Data Deletion page</Link>.
            We will respond within 30 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-3">7. Contact</h2>
          <p className="text-white/70">
            For privacy questions: <a href="mailto:virat18mvk@gmail.com" className="text-brand-400">virat18mvk@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
