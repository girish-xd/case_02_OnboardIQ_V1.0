import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { NotificationsModal } from './components/NotificationsModal.js';
import { AuthPage } from './pages/AuthPage.js';
import { ApplicantPortal } from './pages/ApplicantPortal.js';
import { MakerWorkspace } from './pages/MakerWorkspace.js';
import { CheckerWorkspace } from './pages/CheckerWorkspace.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { ShieldAlert, LogOut } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // If initial authentication check is in progress
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300 text-xs font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-slate-700 border-t-slate-200 rounded-full animate-spin"></div>
          <span className="tracking-wider">DECCAN DIGITAL BANK • VERIFYING JWT SESSION...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show the Login and Registration page
  if (!user) {
    return <AuthPage />;
  }

  const isKnownRole = ['APPLICANT', 'MAKER', 'CHECKER', 'ADMIN'].includes(user.role);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased selection:bg-slate-900 selection:text-white">
      <Header onOpenNotifications={() => setIsNotificationsOpen(true)} />

      {/* PRIVATE ROLE-BASED DASHBOARD ROUTING */}
      {/* Strict zero cross-role access: user can ONLY see their persona workspace */}
      <main className="flex-1">
        {user.role === 'APPLICANT' && <ApplicantPortal />}
        {user.role === 'MAKER' && <MakerWorkspace />}
        {user.role === 'CHECKER' && <CheckerWorkspace />}
        {user.role === 'ADMIN' && <AdminDashboard />}

        {!isKnownRole && (
          <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
            <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto mb-3" />
            <h2 className="text-base font-semibold text-slate-900">Unrecognized Role Clearance</h2>
            <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              Your identity token does not possess authorization for this bank workspace. Please sign out and sign in with an authorized operational account.
            </p>
            <button
              onClick={logout}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg inline-flex items-center gap-2 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out to Login Screen</span>
            </button>
          </div>
        )}
      </main>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Modern Minimalist Fintech Footer */}
      <footer className="bg-white/80 border-t border-slate-200/80 py-4 text-xs text-slate-500 mt-auto backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Deccan Digital Bank</span>
            <span className="text-slate-300">/</span>
            <span>OnboardIQ Platform</span>
            <span className="text-slate-300">/</span>
            <span className="font-mono text-slate-400">BFSI-KYC-V1.0</span>
          </div>
          <div className="text-slate-400 font-mono text-[10px]">
            SECURE JWT SESSION • SERVER-SIDE RBAC • DUAL-CONTROL ISOLATION
          </div>
        </div>
      </footer>
    </div>
  );
};
