// apps/web/src/App.tsx
// Root router — public routes + protected app routes
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store.js';

// Public pages
import Landing from './pages/Landing.js';
import Login from './pages/auth/Login.js';
import Register from './pages/auth/Register.js';
import PrivacyPolicy from './pages/legal/PrivacyPolicy.js';
import Terms from './pages/legal/Terms.js';
import DataDeletion from './pages/legal/DataDeletion.js';

// App shell + pages
import AppLayout from './components/layout/AppLayout.js';
import Dashboard from './pages/app/Dashboard.js';
import Reels from './pages/app/Reels.js';
import AutomationEditor from './pages/app/AutomationEditor.js';
import Templates from './pages/app/Templates.js';
import Inbox from './pages/app/Inbox.js';
import Analytics from './pages/app/Analytics.js';
import Settings from './pages/app/Settings.js';
import Help from './pages/app/Help.js';

import { ThemeProvider } from './components/ThemeProvider.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/data-deletion" element={<DataDeletion />} />

      {/* Protected app routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reels" element={<Reels />} />
        <Route path="/reels/:mediaId/automation" element={<AutomationEditor />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        <Route path="/help/:slug" element={<Help />} />
      </Route>
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}
