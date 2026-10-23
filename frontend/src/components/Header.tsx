import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  Bell,
  LogOut,
  Building2,
  ShieldCheck,
  Lock,
  User,
} from 'lucide-react';
import { NotificationItem } from '../types/index.js';

interface HeaderProps {
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNotifications }) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

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

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const roleConfig = {
    APPLICANT: {
      label: 'Customer Portal',
      code: 'APPLICANT',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-300/60 ring-1 ring-emerald-500/10',
      dotClass: 'bg-emerald-500',
    },
    MAKER: {
      label: 'KYC Maker Officer',
      code: 'FIRST-LINE DEFENCE',
      badgeClass: 'bg-amber-500/10 text-amber-800 border-amber-300/60 ring-1 ring-amber-500/10',
      dotClass: 'bg-amber-500',
    },
    CHECKER: {
      label: 'Compliance Checker',
      code: 'SECOND-LINE DEFENCE',
      badgeClass: 'bg-indigo-500/10 text-indigo-800 border-indigo-300/60 ring-1 ring-indigo-500/10',
      dotClass: 'bg-indigo-500',
    },
    ADMIN: {
      label: 'System Administrator',
      code: 'ADMIN & AUDIT',
      badgeClass: 'bg-purple-500/10 text-purple-800 border-purple-300/60 ring-1 ring-purple-500/10',
      dotClass: 'bg-purple-500',
    },
  };

  const currentRoleInfo = user
    ? roleConfig[user.role]
    : { label: 'Guest', code: 'GUEST', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', dotClass: 'bg-slate-400' };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Bank Mark & Platform Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5 text-slate-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-slate-950 font-sans">
                  Deccan Digital Bank
                </span>
                <span className="font-mono text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700">
                  OnboardIQ
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>JWT Authenticated</span>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 hidden sm:inline">Enterprise KYC & Watchlist Platform</span>
              </div>
            </div>
          </div>

          {/* Authenticated User & Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Role Badge */}
                <div
                  className={`hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium border ${currentRoleInfo.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentRoleInfo.dotClass}`}></span>
                  <span className="font-semibold">{currentRoleInfo.label}</span>
                </div>

                {/* User Info */}
                <div className="hidden md:flex flex-col text-right pl-2 border-l border-slate-200">
                  <div className="text-xs font-semibold text-slate-900 leading-tight">{user.fullName}</div>
                  <div className="text-[11px] font-mono text-slate-500 leading-tight mt-0.5">{user.username}</div>
                </div>

                {/* Notifications Button */}
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition border border-transparent hover:border-slate-200"
                  title="Compliance Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-slate-900 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
                  title="Sign out of current account and return to login"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Authenticating...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
