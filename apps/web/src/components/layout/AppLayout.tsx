import { Outlet, NavLink, useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Film, MessageSquare, BarChart3,
  Inbox, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight,
  Settings as SettingsIcon, CreditCard, AlertTriangle, Instagram
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.js';
import { clsx } from 'clsx';
import ProductTour from '../tour/ProductTour.js';
import { useState, useEffect } from 'react';

const NAV_GROUPS = [
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', tourId: undefined },
      { to: '/reels', icon: Film, label: 'Reels', tourId: 'tour-reels-grid' },
      { to: '/inbox', icon: Inbox, label: 'Inbox', tourId: 'tour-inbox' },
    ]
  },
  {
    label: 'Automations',
    items: [
      { to: '/templates', icon: MessageSquare, label: 'Templates', tourId: 'tour-templates' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics', tourId: 'tour-analytics' },
    ]
  },
  {
    label: 'Account',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', tourId: undefined },
      { to: '/help', icon: HelpCircle, label: 'Help', tourId: undefined },
    ]
  }
];

const MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/reels', icon: Film, label: 'Reels' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    <div className="flex h-[100dvh] overflow-hidden bg-theme-bg">
      {/* ── Desktop Sidebar ── */}
      <aside 
        className={clsx(
          "hidden md:flex flex-col border-r border-theme-border bg-theme-surface transition-all duration-300 z-40 relative",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center text-theme-text-secondary hover:text-theme-text-primary transition-colors z-50 shadow-sm"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Brand/Logo */}
        <div className="px-6 py-6 border-b border-theme-border/50">
          <Link to="/dashboard" className={clsx("flex items-center gap-3 group", isSidebarCollapsed ? "justify-center px-0" : "px-2")}>
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-theme-border flex-shrink-0">
               <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover" />
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden whitespace-nowrap animate-fade-in">
                <span className="font-display font-bold text-xl text-theme-text-primary tracking-tight">ReplyBridge</span>
                <p className="text-[10px] text-theme-text-secondary font-medium uppercase tracking-wider">Craftovon</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 space-y-8 no-scrollbar">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx} className="px-4">
              {!isSidebarCollapsed && (
                <h3 className="px-3 mb-2 text-label uppercase tracking-widest font-semibold text-theme-text-secondary/70">
                  {group.label}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map(({ to, icon: Icon, label, tourId }) => (
                  <NavLink
                    key={to}
                    to={to}
                    id={tourId}
                    title={isSidebarCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150 relative border-l-2',
                        isActive 
                          ? 'border-theme-text-primary text-theme-text-primary bg-theme-border/20 ml-[-1px]' 
                          : 'border-transparent text-theme-text-secondary hover:text-theme-text-primary'
                      )
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>{label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-theme-border/50">
          <div className={clsx("flex items-center gap-3 p-2 rounded-xl bg-theme-border/20 transition-all", isSidebarCollapsed ? "justify-center" : "")}>
            <div className="w-8 h-8 rounded-full bg-theme-text-primary flex items-center justify-center text-sm font-bold text-theme-bg flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-theme-text-primary truncate">{user?.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-theme-text-secondary truncate font-medium">{user?.plan} plan</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-theme-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto relative flex flex-col pb-[80px] md:pb-0">
        {/* Mobile Header — only shows on Settings */}
        <MobileTopBar />

        <div className="flex-1">
          <Outlet />
        </div>
        
        {/* Conditional Footer (Desktop only) */}
        {['/dashboard', '/settings', '/help'].includes(location.pathname) && (
          <AppFooter />
        )}
      </main>

      {/* ── Mobile Floating Pill Nav ── */}
      <MobileBottomNav />

      <ProductTour />
    </div>
  );
}

/* ─── Mobile top bar: shows ONLY on Settings ─── */
function MobileTopBar() {
  const location = useLocation();
  const navigate = useNavigate();

  if (!location.pathname.startsWith('/settings')) {
    return null;
  }

  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-theme-border bg-theme-surface/90 backdrop-blur-md sticky top-0 z-20 rounded-b-2xl shadow-sm">
      <button
        onClick={() => navigate(-1)}
        className="p-2 -ml-2 rounded-lg text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-border/30 transition-colors"
        aria-label="Back"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="font-display font-semibold text-base text-theme-text-primary tracking-tight absolute left-1/2 -translate-x-1/2">
        Settings
      </span>
      <div className="w-9 h-9" /> {/* Spacer for centering */}
    </div>
  );
}

/* ─── Mobile Bottom Nav: standard 4 tabs, OR Settings tabs ─── */
function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const isSettings = location.pathname.startsWith('/settings');
  const activeSettingsTab = searchParams.get('tab') || 'general';

  const SETTINGS_TABS = [
    { id: 'general', label: 'General', shortLabel: 'General', icon: SettingsIcon },
    { id: 'accounts', label: 'Instagram Accounts', shortLabel: 'Accounts', icon: Instagram },
    { id: 'danger', label: 'Danger Zone', shortLabel: 'Danger', icon: AlertTriangle },
  ];

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="relative w-full bg-theme-surface/95 backdrop-blur-xl border-t border-theme-border shadow-[0_-4px_30px_rgba(0,0,0,0.06)] rounded-t-2xl overflow-hidden h-[72px]">
        
        {/* Standard Nav */}
        <nav 
          className={clsx(
            "absolute inset-0 flex items-center justify-between px-4 transition-all duration-300 ease-out",
            isSettings ? "opacity-0 -translate-y-4 pointer-events-none" : "opacity-100 translate-y-0"
          )}
        >
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={clsx(
                  'flex flex-col items-center justify-center w-16 py-2 rounded-xl transition-all duration-200',
                  isActive 
                    ? 'text-theme-text-primary bg-theme-border/30' 
                    : 'text-theme-text-secondary hover:text-theme-text-primary'
                )}
              >
                <Icon className={clsx("w-5 h-5 mb-1 transition-transform", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                <span className={clsx("text-[10px] tracking-tight", isActive ? "font-bold" : "font-medium")}>{label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Settings Nav */}
        <nav 
          className={clsx(
            "absolute inset-0 flex items-center justify-between px-2 transition-all duration-300 ease-out",
            isSettings ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
           <button 
             onClick={() => navigate('/dashboard')} 
             className="flex flex-col items-center justify-center w-[20%] py-2 rounded-xl text-theme-text-secondary hover:text-theme-text-primary transition-colors"
           >
              <ChevronLeft className="w-5 h-5 mb-1" />
              <span className="text-[10px] tracking-tight font-medium">Back</span>
           </button>
           
           {SETTINGS_TABS.map((tab) => {
             const isActive = activeSettingsTab === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => setSearchParams({ tab: tab.id })}
                 className={clsx(
                   'relative flex flex-col items-center justify-center w-[25%] py-2 rounded-xl transition-all duration-200',
                   isActive 
                     ? 'text-theme-text-primary' 
                     : 'text-theme-text-secondary hover:text-theme-text-primary'
                 )}
               >
                 {isActive && (
                   <div className="absolute inset-0 bg-theme-border/30 rounded-xl" />
                 )}
                 <tab.icon className={clsx("w-5 h-5 mb-1 transition-transform relative z-10", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                 <span className={clsx("text-[10px] tracking-tight relative z-10", isActive ? "font-bold" : "font-medium")}>{tab.shortLabel}</span>
               </button>
             );
           })}
        </nav>
      </div>
    </div>
  );
}

/* ─── Footer: structured 2-column layout ─── */
function AppFooter() {
  return (
    <footer className="hidden md:block border-t border-theme-border bg-theme-surface/50 flex-shrink-0">
      <div className="max-w-[1200px] mx-auto px-8 py-10 grid grid-cols-2 gap-8">
        {/* Left: brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-theme-border flex-shrink-0">
              <img src="/logo.png" alt="ReplyBridge" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-semibold text-sm text-theme-text-primary tracking-tight">ReplyBridge</span>
          </div>
          <p className="text-xs text-theme-text-secondary leading-relaxed max-w-[220px]">
            Automate your Instagram DMs. Turn comments into conversions, hands-free.
          </p>
          <p className="text-xs text-theme-text-secondary/60 mt-4">
            © {new Date().getFullYear()} Craftovon. All rights reserved.
          </p>
        </div>

        {/* Right: links */}
        <div className="flex justify-end">
          <div>
            <p className="text-[10px] font-semibold text-theme-text-secondary/60 uppercase tracking-widest mb-3">Legal</p>
            <div className="flex flex-col gap-2">
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                Privacy Policy
              </a>
              <a
                href="/terms"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                Terms of Service
              </a>
              <a
                href="/data-deletion"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-theme-text-secondary hover:text-theme-text-primary transition-colors"
              >
                Data Deletion
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
