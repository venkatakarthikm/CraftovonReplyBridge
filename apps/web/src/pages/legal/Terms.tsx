// apps/web/src/pages/legal/Terms.tsx
// Terms of Service — required for Meta App Review
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Terms() {
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
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-8">Last updated: September 2025</p>

        {[
          { title: '1. Acceptance', body: 'By using ReplyBridge ("Service"), you agree to these Terms. If you do not agree, do not use the Service.' },
          { title: '2. Service description', body: 'ReplyBridge automates Instagram comment-to-DM replies. You retain full control; the Service acts on your explicit instructions only.' },
          { title: '3. Platform compliance', body: 'You must comply with Instagram\'s Community Guidelines and Meta\'s Platform Terms. You may not use the Service to send spam, violate Instagram rate limits, or harass users.' },
          { title: '4. Account responsibility', body: 'You are responsible for all activity under your account, including keeping your credentials secure. Notify us immediately of unauthorized access at support@craftovon.com.' },
          { title: '5. Subscription & billing', body: 'Free plan features are provided at no charge. Paid plans are billed monthly. You may cancel at any time; access continues until the billing period ends. No refunds for partial periods.' },
          { title: '6. Termination', body: 'We may suspend or terminate your account for violation of these Terms, non-payment, or misuse of the Instagram API. You may delete your account at any time.' },
          { title: '7. Limitation of liability', body: 'ReplyBridge is provided "as is". We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including Instagram account actions.' },
          { title: '8. Governing law', body: 'These Terms are governed by the laws of the jurisdiction in which Craftovon operates. Disputes shall be resolved by binding arbitration.' },
          { title: '9. Changes', body: 'We may update these Terms. We will notify you by email and in-app notice at least 14 days before material changes take effect.' },
          { title: '10. Contact', body: 'legal@craftovon.com' },
        ].map(({ title, body }) => (
          <section key={title} className="mb-7">
            <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
            <p className="text-white/70 text-sm leading-relaxed">{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
