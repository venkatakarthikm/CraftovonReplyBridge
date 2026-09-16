// apps/web/src/components/layout/AppLayout.tsx
// Main application shell: sidebar + top bar + content area
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Film, MessageSquare, BarChart3,
  Inbox, Settings, HelpCircle, Zap, LogOut, Menu, X
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.js';
import { clsx } from 'clsx';
import ProductTour from '../tour/ProductTour.js';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/reels', icon: Film, label: 'Reels', tourId: 'tour-reels-grid' },
  { to: '/templates', icon: MessageSquare, label: 'Templates', tourId: 'tour-templates' },
  { to: '/inbox', icon: Inbox, label: 'Inbox', tourId: 'tour-inbox' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', tourId: 'tour-analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/help', icon: HelpCircle, label: 'Help' },
];

export default function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Keep user profile up to date (e.g., after OAuth redirects)
  useEffect(() => {
    if (user?.id) {
      import('../../api/client.js').then(({ api }) => {
        api.get('/auth/me').then((res) => {
          const { _id, email, name, role, plan, onboarding } = res.data.data;
          useAuthStore.getState().updateUser({
            id: _id,
            email,
            name,
            role,
            plan,
            onboarding
          });
        }).catch(() => {});
      });
    }
  }, [user?.id]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* ── Mobile Top Header ── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/8 bg-surface-100/80 backdrop-blur-md absolute top-0 w-full z-20">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-sm text-white">ReplyBridge</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside 
        className={clsx(
          "fixed md:static inset-y-0 right-0 md:left-0 z-40 w-72 md:w-64 flex flex-col border-l md:border-l-0 md:border-r border-white/8 bg-surface-100 backdrop-blur-xl transition-transform duration-300 md:transform-none flex-shrink-0",
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="font-bold text-sm text-white">ReplyBridge</span>
              <p className="text-[10px] text-white/40 leading-none">by Craftovon</p>
            </div>
          </div>
          <button 
            className="md:hidden p-1 rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 md:px-3 py-6 md:py-4 overflow-y-auto flex flex-col gap-2 md:gap-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, tourId }) => (
            <NavLink
              key={to}
              to={to}
              id={tourId}
              className={({ isActive }) =>
                clsx(
                  'nav-link flex items-center gap-4 md:gap-3 px-5 py-4 md:px-3 md:py-2 rounded-2xl md:rounded-xl text-lg md:text-sm font-medium transition-colors',
                  isActive ? 'active bg-brand-500/10 text-brand-400' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                )
              }
            >
              <Icon className="w-6 h-6 md:w-4 md:h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 md:p-3 border-t border-white/8">
          <div className="flex items-center gap-3 px-3 py-3 md:py-2 bg-white/5 rounded-2xl md:rounded-xl">
            <div className="w-10 h-10 md:w-7 md:h-7 rounded-full bg-brand-600 flex items-center justify-center text-sm md:text-xs font-bold text-white flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base md:text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-sm md:text-[10px] text-white/40 truncate">{user?.plan?.toUpperCase()} plan</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 md:p-2 ml-1 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
              title="Sign out"
            >
              <LogOut className="w-6 h-6 md:w-4 md:h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pt-[60px] md:pt-0 relative flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        {/* Footer */}
        {['/dashboard', '/settings', '/help'].includes(location.pathname) && (
          <footer className="border-t border-white/8 py-6 px-6 text-center text-xs text-white/30 mt-auto flex-shrink-0">
            <p>© 2025 Craftovon ReplyBridge. All rights reserved.</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <a href="/privacy-policy" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </footer>
        )}
      </main>

      {/* ── Guided product tour ── */}
      <ProductTour />
    </div>
  );
}
