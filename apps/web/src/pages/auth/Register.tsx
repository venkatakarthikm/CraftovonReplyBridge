// apps/web/src/pages/auth/Register.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.store.js';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { name, email, password });
      setAuth(res.data.data.accessToken, res.data.data.user);
      navigate('/dashboard');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">ReplyBridge</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost">Sign in</Link>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand mx-auto flex items-center justify-center shadow-brand mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Get started free</h1>
          <p className="text-white/50 text-sm mt-1">Automate every reel's DMs, hands-free.</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Full name</label>
              <input id="register-name" type="text" className="input" placeholder="Alex Smith"
                value={name} onChange={(e) => setName(e.currentTarget.value)} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
              <input id="register-email" type="email" className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.currentTarget.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Password <span className="text-white/30">(min 8 characters)</span>
              </label>
              <input id="register-password" type="password" className="input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.currentTarget.value)}
                required minLength={8} autoComplete="new-password" />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button id="register-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Creating account…' : 'Create free account'}
            </button>

            <p className="text-xs text-white/30 text-center">
              By signing up, you agree to our{' '}
              <Link to="/terms" className="text-brand-400">Terms</Link> and{' '}
              <Link to="/privacy-policy" className="text-brand-400">Privacy Policy</Link>.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-white/40 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
        </p>
      </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 py-8 px-6 text-center text-xs text-white/30">
        <p>© 2025 Craftovon ReplyBridge. All rights reserved.</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link to="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-white">Terms of Service</Link>
          <Link to="/data-deletion" className="hover:text-white">Data Deletion</Link>
        </div>
      </footer>
    </div>
  );
}
