// apps/web/src/pages/legal/DataDeletion.tsx
// Data Deletion page — REQUIRED for Facebook/Instagram app review
// Must be a public URL submitted to Meta developer portal
// Reference: 10-meta-app-review.md §Data Deletion
import { Link } from 'react-router-dom';
import { Zap, Trash2, Mail } from 'lucide-react';

export default function DataDeletion() {
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

      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-8 h-8 text-red-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Request Data Deletion</h1>
        <p className="text-white/60 mb-8 leading-relaxed">
          You can request deletion of all your data from Craftovon ReplyBridge at any time.
          This includes your account, Instagram connection details, automation configurations,
          and all associated message logs.
        </p>

        <div className="card p-6 mb-6 text-left">
          <h2 className="text-base font-semibold text-white mb-4">How to delete your data</h2>
          <ol className="space-y-3 text-sm text-white/70">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span>Log in to your ReplyBridge account and go to <strong className="text-white">Settings → Account → Delete Account</strong>. This immediately deletes all your data.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span>If you no longer have account access, email us at <strong className="text-white">virat18mvk@gmail.com</strong> with the subject <em>"Data Deletion Request"</em>. We will process your request within 30 days.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span>To also revoke our Instagram access, go to your Instagram account → Settings → Apps & Websites → Remove Craftovon ReplyBridge.</span>
            </li>
          </ol>
        </div>

        <a
          href="mailto:virat18mvk@gmail.com?subject=Data%20Deletion%20Request"
          className="btn-primary"
        >
          <Mail className="w-4 h-4" />
          Email deletion request
        </a>

        <p className="text-xs text-white/30 mt-6">
          We respond to all deletion requests within 30 days.
          Data is fully purged from all systems within 90 days.
        </p>
      </div>
    </div>
  );
}
