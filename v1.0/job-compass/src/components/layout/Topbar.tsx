'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Bell, Compass, Zap } from 'lucide-react';
import { useNotifications, useUnreadCount } from '@/lib/use-store';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/store';
import { cn, relativeTime } from '@/lib/utils';

export function Topbar() {
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotif(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Compass className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-800">求职罗盘</span>
      </div>

      <div className="hidden md:block">
        <h1 className="text-lg font-semibold text-gray-800">求职工作台</h1>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/applications/new?mode=quick"
          title="快速录入"
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-200 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Zap className="w-4 h-4" />
          <span className="hidden sm:inline">快速录入</span>
        </Link>
        <Link
          href="/applications/new"
          title="新建投递"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">新建投递</span>
        </Link>

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif((v) => !v)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-medium text-sm text-gray-800">通知</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    全部已读
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">暂无通知</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={cn(
                        'px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50',
                        !n.isRead && 'bg-blue-50/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">{n.title}</span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.content}</p>
                      <span className="text-[11px] text-gray-400 mt-1 block">{relativeTime(n.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
