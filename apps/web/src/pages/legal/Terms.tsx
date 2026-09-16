// apps/web/src/pages/legal/Terms.tsx
// Terms of Service — required for Meta App Review
import { Link } from 'react-router-dom';

export default function Terms() {
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
        <h1 className="text-display-lg text-theme-text-primary mb-2 text-3xl">Terms of Service</h1>
        <p className="text-theme-text-secondary text-sm mb-12">Last updated: September 2025</p>

        {[
          { title: '1. Acceptance', body: 'By using ReplyBridge ("Service"), you agree to these Terms. If you do not agree, do not use the Service.' },
          { title: '2. Service description', body: 'ReplyBridge automates Instagram comment-to-DM replies. You retain full control; the Service acts on your explicit instructions only.' },
          { title: '3. Platform compliance', body: 'You must comply with Instagram\'s Community Guidelines and Meta\'s Platform Terms. You may not use the Service to send spam, violate Instagram rate limits, or harass users.' },
          { title: '4. Account responsibility', body: 'You are responsible for all activity under your account, including keeping your credentials secure. Notify us immediately of unauthorized access at virat18mvk@gmail.com.' },
          { title: '5. Termination', body: 'We may suspend or terminate your account for violation of these Terms or misuse of the Instagram API. You may delete your account at any time.' },
          { title: '6. Limitation of liability', body: 'ReplyBridge is provided "as is". We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including Instagram account actions.' },
          { title: '7. Governing law', body: 'These Terms are governed by the laws of the jurisdiction in which Craftovon operates. Disputes shall be resolved by binding arbitration.' },
          { title: '8. Changes', body: 'We may update these Terms. We will notify you by email and in-app notice at least 14 days before material changes take effect.' },
          { title: '9. Contact', body: 'virat18mvk@gmail.com' },
        ].map(({ title, body }) => (
          <section key={title} className="mb-8">
            <h2 className="text-title text-xl text-theme-text-primary mb-3">{title}</h2>
            <p className="text-body text-theme-text-secondary leading-relaxed">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
