import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, X } from 'lucide-react';
import { api } from '../../api/client.js';
import { useAuthStore } from '../../stores/auth.store.js';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth, token } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate('/dashboard', { replace: true });
  }, [token, navigate]);

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
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-theme-bg relative">
      {/* ── Mobile Background (Hidden on Desktop) ── */}
      <div className="absolute inset-0 md:hidden bg-[url('https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      </div>

      {/* ── Left Pane: Product Preview (Desktop Only) ── */}
      <div className="hidden md:flex flex-1 flex-col justify-between p-12 bg-theme-surface border-r border-theme-border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-ig opacity-[0.03] pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <Link to="/" className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-theme-border flex-shrink-0 bg-theme-surface cursor-pointer group">
           <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
        </Link>
        <Link to="/" className="text-2xl font-bold font-display tracking-tight text-theme-text-primary hover:text-theme-text-secondary transition-colors">
          ReplyBridge
        </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md">
          <h2 className="text-display-lg text-theme-text-primary mb-6">Automate your DMs. Focus on creating.</h2>
          <p className="text-subtitle text-theme-text-secondary mb-12">
            Join thousands of creators using ReplyBridge to instantly deliver links and digital products directly via Instagram DMs.
          </p>

          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-theme-border flex items-center justify-center text-theme-text-primary font-bold">1</div>
               <p className="text-sm font-medium text-theme-text-primary">Connect your Instagram Professional account.</p>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-theme-border flex items-center justify-center text-theme-text-primary font-bold">2</div>
               <p className="text-sm font-medium text-theme-text-primary">Pick a reel and set a trigger word.</p>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-theme-border flex items-center justify-center text-theme-text-primary font-bold">3</div>
               <p className="text-sm font-medium text-theme-text-primary">Watch the automated DMs flow in.</p>
             </div>
          </div>
        </div>

        <div className="relative z-10 text-xs font-medium text-theme-text-secondary">
          © 2025 Craftovon ReplyBridge
        </div>
      </div>

      {/* ── Right Pane: Form ── */}
      <div className="flex-1 flex flex-col justify-end md:justify-center p-4 md:p-12 relative z-10 min-h-screen md:min-h-0">
        
        {/* Mobile Header (Top) */}
        <div className="md:hidden absolute top-8 left-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-theme-border flex-shrink-0 bg-theme-surface">
             <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover" />
          </div>
          <span className="font-display font-semibold text-lg text-white">ReplyBridge</span>
        </div>

        {/* Auth Form Sheet (Mobile Bottom Sheet / Desktop Centered) */}
        <div className="w-full max-w-md mx-auto bg-theme-surface md:bg-transparent rounded-t-[32px] md:rounded-none p-8 md:p-0 pt-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-none relative">
          {/* Close affordance — mobile only, goes back to landing */}
          <div className="md:hidden flex items-center justify-between mb-6">
            <div className="w-1 h-5 rounded-full bg-theme-border mx-auto" />
          </div>
          <button
            onClick={() => navigate('/')}
            className="md:hidden absolute top-4 right-4 p-2 rounded-full bg-theme-border/40 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="mb-8 md:text-left text-center">
            <h1 className="text-title text-theme-text-primary mb-2">Create an account</h1>
            <p className="text-sm text-theme-text-secondary font-medium">
              Already have an account? <Link to="/login" className="text-theme-text-primary hover:underline">Sign in</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-label font-medium mb-2">Full name</label>
              <input
                id="register-name"
                type="text"
                className="input"
                placeholder="Alex Smith"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                required
              />
            </div>

            <div>
              <label className="block text-label font-medium mb-2">Email address</label>
              <input
                id="register-email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                 <label className="block text-label font-medium">Password</label>
              </div>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-secondary hover:text-theme-text-primary transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-theme-text-secondary mt-2">Must be at least 8 characters long.</p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-fade-in font-medium">
                {error}
              </div>
            )}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full group mt-2"
            >
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />}
            </button>
            
            <div className="relative py-4 flex items-center justify-center">
               <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-theme-border"></div>
               </div>
               <span className="relative bg-theme-surface px-4 text-xs font-medium text-theme-text-secondary uppercase tracking-widest">or</span>
            </div>

            {/* Simulated Google Login Button */}
            <button
              type="button"
              className="btn-secondary w-full"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>
            
            <p className="text-xs text-theme-text-secondary text-center mt-6">
              By signing up, you agree to our <Link to="/terms" className="text-theme-text-primary hover:underline">Terms</Link> and <Link to="/privacy-policy" className="text-theme-text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
