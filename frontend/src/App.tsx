import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.js';
import { Header } from './components/Header.js';
import { NotificationsModal } from './components/NotificationsModal.js';
import { ApplicantPortal } from './pages/ApplicantPortal.js';
import { MakerWorkspace } from './pages/MakerWorkspace.js';
import { CheckerWorkspace } from './pages/CheckerWorkspace.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { UserCheck, ShieldCheck, BarChart3, FileText } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('applicant');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Automatically sync tab with user role on role switch
  React.useEffect(() => {
    if (user) {
      if (user.role === 'APPLICANT') setActiveTab('applicant');
      else if (user.role === 'MAKER') setActiveTab('maker');
      else if (user.role === 'CHECKER') setActiveTab('checker');
      else if (user.role === 'ADMIN') setActiveTab('admin');
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm font-medium">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to Deccan Digital Bank OnboardIQ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Role Navigation Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('applicant')}
            className={`py-3.5 px-3 border-b-2 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'applicant'
                ? 'border-brand-700 text-brand-700 bg-brand-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Applicant Portal</span>
          </button>

          <button
            onClick={() => setActiveTab('maker')}
            className={`py-3.5 px-3 border-b-2 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'maker'
                ? 'border-amber-600 text-amber-700 bg-amber-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>KYC Maker Review</span>
          </button>

          <button
            onClick={() => setActiveTab('checker')}
            className={`py-3.5 px-3 border-b-2 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'checker'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Compliance Checker</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`py-3.5 px-3 border-b-2 text-xs font-bold flex items-center gap-2 whitespace-nowrap transition ${
              activeTab === 'admin'
                ? 'border-purple-600 text-purple-700 bg-purple-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Admin & Analytics</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === 'applicant' && <ApplicantPortal />}
        {activeTab === 'maker' && <MakerWorkspace />}
        {activeTab === 'checker' && <CheckerWorkspace />}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      {/* Notifications Drawer */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © 2026 Deccan Digital Bank. OnboardIQ Platform — Built for HCLTech BFSI Hackathon.
          </span>
          <span className="text-slate-400">
            Simulated environment • Synthetic KYC Documents • RBI Compliant Maker-Checker
          </span>
        </div>
      </footer>
    </div>
  );
};
