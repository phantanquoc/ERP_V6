import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, Clock, AlertCircle, Target, ClipboardList, ChevronLeft, ChevronRight, DollarSign, PackageCheck } from 'lucide-react';
import notificationService, { Notification } from '@services/notificationService';

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
}

const ITEMS_PER_PAGE = 10;

const AllNotificationsModal: React.FC<AllNotificationsModalProps> = ({ isOpen, onClose, onNotificationClick }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'EVALUATION':
        return <ClipboardList className="w-4 h-4 text-orange-600" />;
      case 'EVALUATION_SUPERVISOR1':
      case 'EVALUATION_SUPERVISOR2':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'EVALUATION_COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'TASK':
        return <Target className="w-4 h-4 text-indigo-600" />;
      case 'PAYROLL':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'ACCEPTANCE_HANDOVER':
        return <PackageCheck className="w-4 h-4 text-teal-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleClick = (notification: Notification) => {
    onNotificationClick(notification);
  };

  const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
  const paginatedNotifications = notifications.slice(
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
              <p className="text-blue-100 text-sm">Trong 1 tháng gần nhất · {notifications.length} thông báo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Đang tải thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Bell className="w-16 h-16 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">Không có thông báo</p>
              <p className="text-sm mt-1">Trong 1 tháng gần nhất không có thông báo nào</p>
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

