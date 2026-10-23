import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  ShieldCheck,
  Bell,
  UserCheck,
  LogOut,
  Building2,
  RefreshCw,
  FileText,
  Sliders,
  CheckCircle,
} from 'lucide-react';
import { NotificationItem } from '../types/index.js';

interface HeaderProps {
  onOpenNotifications: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  activeTab,
  setActiveTab,
}) => {
  const { user, switchUser, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchUnread = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      const unread = data.notifications.filter((n: NotificationItem) => n.status !== 'READ').length;
      setUnreadCount(unread);
    } catch (_) {}
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const roleConfig = {
    APPLICANT: { label: 'Applicant Portal', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    MAKER: { label: 'KYC Maker (Officer)', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
    CHECKER: { label: 'Compliance Checker', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    ADMIN: { label: 'Bank Administrator', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  const currentRoleInfo = user ? roleConfig[user.role] : { label: 'Guest', badgeClass: 'bg-slate-100 text-slate-700' };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Demo Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-slate-300">HCLTech BFSI Hackathon — Case 02: OnboardIQ</span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">Track: Full Stack Web Engineer</span>
        </div>

        {/* Live Role Switcher for seamless demo walkthrough */}
        <div className="flex items-center gap-1.5 my-0.5">
          <span className="text-slate-400 font-semibold mr-1">Switch Role:</span>
          <button
            onClick={() => switchUser('applicant1')}
            className={`px-2 py-0.5 rounded transition ${
              user?.username === 'applicant1'
                ? 'bg-emerald-600 text-white font-medium'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Applicant
          </button>
          <button
            onClick={() => switchUser('maker1')}
            className={`px-2 py-0.5 rounded transition ${
              user?.username === 'maker1'
                ? 'bg-amber-600 text-white font-medium'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Maker (U1)
          </button>
          <button
            onClick={() => switchUser('maker2')}
            className={`px-2 py-0.5 rounded transition ${
              user?.username === 'maker2'
                ? 'bg-amber-600 text-white font-medium'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Maker (U2)
          </button>
          <button
            onClick={() => switchUser('checker1')}
            className={`px-2 py-0.5 rounded transition ${
              user?.username === 'checker1'
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Checker (C1)
          </button>
          <button
            onClick={() => switchUser('admin1')}
            className={`px-2 py-0.5 rounded transition ${
              user?.username === 'admin1'
                ? 'bg-purple-600 text-white font-medium'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Admin (A1)
          </button>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Deccan Digital Bank
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-brand-50 text-brand-700 border border-brand-200">
                  OnboardIQ
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Intelligent KYC Onboarding, Document Verification & Watchlist Screening
              </p>
            </div>
          </div>

          {/* User Status & Navigation Actions */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex flex-col text-right">
                  <div className="text-sm font-semibold text-slate-800">{user.fullName}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>

                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${currentRoleInfo.badgeClass}`}
                >
                  {currentRoleInfo.label}
                </span>

                {/* Notifications Button */}
                <button
                  onClick={onOpenNotifications}
                  className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-full transition"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <span className="text-sm text-slate-500">Connecting...</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
