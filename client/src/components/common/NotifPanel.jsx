import { useEffect } from "react";
import { X, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNotifStore } from "../../context/stores";
import { notificationAPI } from "../../services/api";
import Avatar from "./Avatar";

export default function NotifPanel({ onClose }) {
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } = useNotifStore();

  useEffect(() => {
    notificationAPI.list({ limit: 30 }).then(({ data }) => {
      setNotifications(data.data, data.unreadCount);
    });
  }, []);

  const handleMarkRead = async (id) => {
    await notificationAPI.markRead(id);
    markRead(id);
  };

  const handleMarkAll = async () => {
    await notificationAPI.markAllRead();
    markAllRead();
  };

  return (
    <div className="fixed right-4 top-16 w-96 z-50 animate-slide-up">
      <div className="card border-surface-500 shadow-2xl overflow-hidden">
        {}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-600">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm">Notifications</span>
            {unreadCount > 0 && (
              <span className="badge bg-brand-600/30 text-brand-400 border-brand-600/40">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button onClick={handleMarkAll} className="btn-icon" title="Mark all read">
                <CheckCheck size={15} />
              </button>
            )}
            <button onClick={onClose} className="btn-icon">
              <X size={15} />
            </button>
          </div>
        </div>

        {}
        <div className="max-h-[420px] overflow-y-auto divide-y divide-surface-600">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-surface-600/50 transition-colors ${
                  !n.isRead ? "bg-brand-600/5" : ""
                }`}
                onClick={() => !n.isRead && handleMarkRead(n._id)}
              >
                <Avatar user={n.actor} size="sm" className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 leading-snug">{n.title}</p>
                  {n.message && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{n.message}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
