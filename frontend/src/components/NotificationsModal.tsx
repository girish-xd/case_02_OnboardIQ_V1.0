import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { NotificationItem } from '../types/index.js';
import { X, Bell, Check, Clock } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, status: 'READ' } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <Bell className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                Compliance & Workflow Notices
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">Real-time application audit updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/30">
          {loading ? (
            <div className="text-center py-12 text-xs font-mono text-slate-400">Loading notices...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-medium text-slate-500">No active notices.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">All workflow tasks are up to date.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`p-3.5 rounded-lg border text-xs transition ${
                  n.status === 'READ'
                    ? 'bg-white border-slate-200/70 text-slate-500 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-800 shadow-xs ring-1 ring-slate-900/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-slate-900 leading-snug">{n.title}</span>
                  {n.status !== 'READ' && (
                    <button
                      onClick={() => handleMarkRead(n._id)}
                      className="text-[10px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition flex items-center gap-1 flex-shrink-0"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Mark Read</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">{n.message}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                  <Clock className="w-3 h-3 text-slate-300" />
                  <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>•</span>
                  <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
