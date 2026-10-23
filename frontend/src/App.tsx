import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { NotificationsModal } from './components/NotificationsModal.js';
import { AuthPage } from './pages/AuthPage.js';
import { ApplicantPortal } from './pages/ApplicantPortal.js';
import { MakerWorkspace } from './pages/MakerWorkspace.js';
import { CheckerWorkspace } from './pages/CheckerWorkspace.js';
import { AdminDashboard } from './pages/AdminDashboard.js';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // If initial authentication check is in progress
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300 text-sm font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to Deccan Digital Bank OnboardIQ...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show the Login and Registration page
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Header onOpenNotifications={() => setIsNotificationsOpen(true)} />

      {/* PRIVATE ROLE-BASED DASHBOARD ROUTING */}
      {/* Each user persona has exclusive access ONLY to their own personal workspace */}
      <main className="flex-1">
        {user.role === 'APPLICANT' && (
          <div className="animate-fadeIn">
            <ApplicantPortal />
          </div>
        )}

        {user.role === 'MAKER' && (
          <div className="animate-fadeIn">
            <MakerWorkspace />
          </div>
        )}

        {user.role === 'CHECKER' && (
          <div className="animate-fadeIn">
            <CheckerWorkspace />
          </div>
        )}

        {user.role === 'ADMIN' && (
          <div className="animate-fadeIn">
            <AdminDashboard />
          </div>
        )}
      </main>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 Deccan Digital Bank. OnboardIQ Platform — Full Stack Web Engineer Track.
          </span>
          <span className="text-slate-400">
            Private Dashboard • Role-Enforced RBAC • Zero Cross-Role Data Leakage
          </span>
        </div>
      </footer>
    </div>
  );
};
