import React, { useState, useEffect } from 'react';
import { Bell, X, ChevronLeft, ChevronRight } from 'lucide-react';
import notificationService, { AppNotification } from '@services/notificationService';
import { getNotificationIcon } from '../utils/notificationIcons';

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: AppNotification) => void;
}

const ITEMS_PER_PAGE = 10;

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

  const loadAllNotifications = async () => {
    try {
      setLoading(true);
      // Lấy nhiều notification, filter 1 tháng ở frontend
      const data = await notificationService.getEmployeeNotifications(200);
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const filtered = data.filter(n => new Date(n.createdAt) >= oneMonthAgo);
      setNotifications(filtered);
    } catch (error) {
      console.error('Error loading all notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (notification: AppNotification) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
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

        {/* Filter tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-gray-200 bg-white">
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
            paginatedNotifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`px-6 py-4 border-b border-gray-100 cursor-pointer transition-colors ${
                  notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notification.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                  )}
                </div>
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
    </div>
  );
};

export default AllNotificationsModal;

