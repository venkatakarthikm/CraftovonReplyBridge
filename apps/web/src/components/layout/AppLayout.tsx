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
          <div className="w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center shadow-brand">
            <Zap className="w-3.5 h-3.5 text-white" />
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
          "fixed md:static inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-white/8 bg-surface-100 backdrop-blur-xl transition-transform duration-300 md:transform-none flex-shrink-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand">
              <Zap className="w-4 h-4 text-white" />
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
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, tourId }) => (
            <NavLink
              key={to}
              to={to}
              id={tourId}
              className={({ isActive }) =>
                clsx('nav-link', isActive && 'active')
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/8">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.plan?.toUpperCase()} plan</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-link w-full text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto pt-[60px] md:pt-0 relative flex flex-col">
        <div className="flex-1">
          <Outlet />
        </div>
        {/* Footer */}
        <footer className="border-t border-white/8 py-6 px-6 text-center text-xs text-white/30 mt-auto">
          <p>© 2025 Craftovon ReplyBridge. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="/privacy-policy" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </footer>
      </main>

      {/* ── Guided product tour ── */}
      <ProductTour />
    </div>
  );
}
