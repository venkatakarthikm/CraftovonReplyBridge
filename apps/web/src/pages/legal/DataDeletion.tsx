// apps/web/src/pages/legal/DataDeletion.tsx
// Data Deletion page — REQUIRED for Facebook/Instagram app review
// Must be a public URL submitted to Meta developer portal
// Reference: 10-meta-app-review.md §Data Deletion
import { Link } from 'react-router-dom';
import { Trash2, Mail } from 'lucide-react';

export default function DataDeletion() {
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

      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="text-display-lg text-theme-text-primary mb-4 text-3xl">Request Data Deletion</h1>
        <p className="text-body text-theme-text-secondary mb-8 leading-relaxed max-w-lg mx-auto">
          You can request deletion of all your data from Craftovon ReplyBridge at any time.
          This includes your account, Instagram connection details, automation configurations,
          and all associated message logs.
        </p>

        <div className="card p-6 mb-8 text-left max-w-lg mx-auto">
          <h2 className="text-title text-lg text-theme-text-primary mb-5">How to delete your data</h2>
          <ol className="space-y-4 text-body text-theme-text-secondary">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-theme-border/50 text-theme-text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <span className="leading-relaxed">Log in to your ReplyBridge account and go to <strong className="text-theme-text-primary font-medium">Settings → Danger Zone → Delete Account</strong>. This immediately deletes all your data.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-theme-border/50 text-theme-text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <span className="leading-relaxed">If you no longer have account access, email us at <strong className="text-theme-text-primary font-medium">virat18mvk@gmail.com</strong> with the subject <em>"Data Deletion Request"</em>. We will process your request within 30 days.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-theme-border/50 text-theme-text-primary font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <span className="leading-relaxed">To also revoke our Instagram access, go to your Instagram account → Settings → Apps & Websites → Remove Craftovon ReplyBridge.</span>
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

        <p className="text-label text-theme-text-secondary mt-6 max-w-sm mx-auto">
          We respond to all deletion requests within 30 days.
          Data is fully purged from all systems within 90 days.
        </p>
      </div>
    </div>
  );
}
