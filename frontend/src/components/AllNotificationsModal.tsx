import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Bell, X, ChevronLeft, ChevronRight, CheckCheck, Trash2 } from 'lucide-react';
import notificationService, { AppNotification } from '@services/notificationService';
import { getNotificationIcon } from '../utils/notificationIcons';
import { formatRelativeTime } from '../utils/formatRelativeTime';

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: AppNotification) => void;
}

const ITEMS_PER_PAGE = 15;

function groupByDate(notifications: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const todayItems: AppNotification[] = [];
  const yesterdayItems: AppNotification[] = [];
  const earlierItems: AppNotification[] = [];

  for (const n of notifications) {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) todayItems.push(n);
    else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
    else earlierItems.push(n);
  }

  const groups: { label: string; items: AppNotification[] }[] = [];
  if (todayItems.length) groups.push({ label: 'Hôm nay', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: 'Hôm qua', items: yesterdayItems });
  if (earlierItems.length) groups.push({ label: 'Trước đó', items: earlierItems });
  return groups;
}

const AllNotificationsModal: React.FC<AllNotificationsModalProps> = ({ isOpen, onClose, onNotificationClick }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllNotifications();
      setCurrentPage(1);
    }
  }, [isOpen]);

  // Listen for WS notifications to auto-refresh
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => loadAllNotifications();
    window.addEventListener('ws-notification', handler);
    return () => window.removeEventListener('ws-notification', handler);
  }, [isOpen]);

  const loadAllNotifications = async () => {
    try {
      setLoading(true);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const data = await notificationService.getEmployeeNotifications(200, oneMonthAgo.toISOString());
      setNotifications(data);
    } catch (error) {
      console.error('Error loading all notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      // Signal NotificationBell to re-fetch the unread badge count
      window.dispatchEvent(new Event('ws-notification'));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClick = (notification: AppNotification) => {
    if (!notification.isRead) {
      notificationService.markAsRead(notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
    }
    onNotificationClick(notification);
  };

  const displayedNotifications = showUnreadOnly
    ? notifications.filter(n => !n.isRead)
    : notifications;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const totalPages = Math.ceil(displayedNotifications.length / ITEMS_PER_PAGE);
  const paginatedNotifications = displayedNotifications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const groups = groupByDate(paginatedNotifications);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop closeOnBackdrop={true}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Tất cả thông báo</h2>
              <p className="text-blue-100 text-sm">Trong 1 tháng gần nhất · {displayedNotifications.length} thông báo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter tabs + Mark all read */}
        <div className="flex gap-1 px-6 py-2 border-b border-gray-200 bg-white items-center shrink-0">
          <button
            onClick={() => { setShowUnreadOnly(false); setCurrentPage(1); }}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              !showUnreadOnly
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => { setShowUnreadOnly(true); setCurrentPage(1); }}
            className={`text-sm px-4 py-1.5 rounded-full transition-colors ${
              showUnreadOnly
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="ml-auto text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              Đọc tất cả
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Đang tải thông báo...</p>
            </div>
          ) : displayedNotifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Bell className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">{showUnreadOnly ? 'Không có thông báo chưa đọc' : 'Không có thông báo'}</p>
              <p className="text-sm mt-1">{showUnreadOnly ? 'Tất cả thông báo đã được đọc' : 'Trong 1 tháng gần nhất không có thông báo nào'}</p>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label}>
                <div className="px-6 py-1.5 bg-gray-100 text-xs font-medium text-gray-500 sticky top-0">
                  {group.label}
                </div>
                {group.items.map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => handleClick(notification)}
                    className={`px-6 py-4 border-b border-gray-100 cursor-pointer transition-colors group ${
                      notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        )}
                        <button
                          onClick={(e) => handleDelete(e, notification.id)}
                          className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Xóa thông báo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Trang {currentPage} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AllNotificationsModal;

