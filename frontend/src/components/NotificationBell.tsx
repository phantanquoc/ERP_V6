import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';
import notificationService, { Notification } from '@services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationIcon } from '../utils/notificationIcons';
import TaskListModal from './TaskListModal';
import EmployeeSelfEvaluationModal from './EmployeeSelfEvaluationModal';
import AllNotificationsModal from './AllNotificationsModal';
import EmployeePayrollModal from './EmployeePayrollModal';
import AcceptanceHandoverViewModal from './AcceptanceHandoverViewModal';
import LeaveRequestApprovalModal from './LeaveRequestApprovalModal';
import OvertimePlanListModal from './OvertimePlanListModal';

const NotificationBell = ({ onNotificationClick }: { onNotificationClick?: (notification: Notification) => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userIsAdmin = user?.role === 'admin';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedEvaluationNotification, setSelectedEvaluationNotification] = useState<Notification | null>(null);
  const [isAllNotificationsOpen, setIsAllNotificationsOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedPayrollNotification, setSelectedPayrollNotification] = useState<Notification | null>(null);
  const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false);
  const [selectedAcceptanceHandoverId, setSelectedAcceptanceHandoverId] = useState<string | null>(null);
  const [selectedAcceptanceMessage, setSelectedAcceptanceMessage] = useState<string | undefined>(undefined);
  const [isLeaveRequestModalOpen, setIsLeaveRequestModalOpen] = useState(false);
  const [selectedLeaveRequestId, setSelectedLeaveRequestId] = useState<string | null>(null);
  const [selectedLeaveRequestMessage, setSelectedLeaveRequestMessage] = useState<string | undefined>(undefined);
  const [isOvertimePlanModalOpen, setIsOvertimePlanModalOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getEmployeeNotifications(5);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.type === 'TASK') {
      setIsTaskListModalOpen(true);
    } else if (['EVALUATION', 'EVALUATION_SUPERVISOR1', 'EVALUATION_SUPERVISOR2', 'EVALUATION_COMPLETED'].includes(notification.type)) {
      setSelectedEvaluationNotification(notification);
      setIsEvaluationModalOpen(true);
    } else if (notification.type === 'PAYROLL') {
      setSelectedPayrollNotification(notification);
      setIsPayrollModalOpen(true);
    } else if (notification.type === 'ACCEPTANCE_HANDOVER') {
      setSelectedAcceptanceHandoverId(notification.acceptanceHandoverId || null);
      setSelectedAcceptanceMessage(notification.message);
      setIsAcceptanceModalOpen(true);
    } else if (notification.type === 'LEAVE_REQUEST') {
      setSelectedLeaveRequestId(notification.leaveRequestId || null);
      setSelectedLeaveRequestMessage(notification.message);
      setIsLeaveRequestModalOpen(true);
    } else if (notification.type === 'LEAVE_REQUEST_RESPONSE') {
      // NV xem kết quả đơn nghỉ phép — mở modal xem đơn của mình
      setSelectedLeaveRequestId(notification.leaveRequestId || null);
      setSelectedLeaveRequestMessage(notification.message);
      setIsLeaveRequestModalOpen(true);
    } else if (notification.type === 'OVERTIME_PLAN' || notification.type === 'OVERTIME_PLAN_APPROVAL') {
      setIsOvertimePlanModalOpen(true);
    } else if (['SUPPLY_REQUEST', 'SUPPLY_REQUEST_PROCESSING', 'SUPPLY_REQUEST_APPROVED', 'SUPPLY_REQUEST_FULFILLED'].includes(notification.type)) {
      // Navigate đến trang quản lý yêu cầu cung ứng
      navigate('/production/warehouse');
    }
    // PASSWORD_RESET: chỉ mark read, không cần mở gì
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  };

  return (
    <>
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => { if (!isOpen) loadNotifications(); setIsOpen(!isOpen); }}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        title="Thông báo"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">Thông báo</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Không có thông báo</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                    notification.isRead
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
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

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <button
                onClick={() => { setIsAllNotificationsOpen(true); setIsOpen(false); }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>

      {/* Task List Modal - opened when clicking TASK notification */}
      <TaskListModal
        isOpen={isTaskListModalOpen}
        onClose={() => setIsTaskListModalOpen(false)}
      />

      {/* Evaluation Modal - opened when clicking EVALUATION notification */}
      <EmployeeSelfEvaluationModal
        isOpen={isEvaluationModalOpen}
        onClose={() => {
          setIsEvaluationModalOpen(false);
          setSelectedEvaluationNotification(null);
        }}
        evaluationId={selectedEvaluationNotification?.evaluationId || null}
        notificationId={selectedEvaluationNotification?.id}
        evaluationPeriod={selectedEvaluationNotification?.period}
      />

      {/* All Notifications Modal */}
      <AllNotificationsModal
        isOpen={isAllNotificationsOpen}
        onClose={() => setIsAllNotificationsOpen(false)}
        onNotificationClick={(notification) => {
          setIsAllNotificationsOpen(false);
          handleNotificationClick(notification);
        }}
      />

      {/* Payroll Modal - opened when clicking PAYROLL notification */}
      <EmployeePayrollModal
        isOpen={isPayrollModalOpen}
        onClose={() => {
          setIsPayrollModalOpen(false);
          setSelectedPayrollNotification(null);
        }}
        period={selectedPayrollNotification?.period}
      />

      {/* Acceptance Handover Modal - opened when clicking ACCEPTANCE_HANDOVER notification */}
      <AcceptanceHandoverViewModal
        isOpen={isAcceptanceModalOpen}
        onClose={() => {
          setIsAcceptanceModalOpen(false);
          setSelectedAcceptanceHandoverId(null);
          setSelectedAcceptanceMessage(undefined);
        }}
        acceptanceHandoverId={selectedAcceptanceHandoverId}
        notificationMessage={selectedAcceptanceMessage}
      />

      {/* Leave Request Modal - opened when clicking LEAVE_REQUEST notification */}
      <LeaveRequestApprovalModal
        isOpen={isLeaveRequestModalOpen}
        onClose={() => {
          setIsLeaveRequestModalOpen(false);
          setSelectedLeaveRequestId(null);
          setSelectedLeaveRequestMessage(undefined);
        }}
        leaveRequestId={selectedLeaveRequestId}
        notificationMessage={selectedLeaveRequestMessage}
      />

      {/* Overtime Plan Modal - opened when clicking OVERTIME_PLAN notification */}
      {/* #3 Fix: Pass isAdmin prop so admin sees all plans with approve buttons */}
      <OvertimePlanListModal
        isOpen={isOvertimePlanModalOpen}
        onClose={() => setIsOvertimePlanModalOpen(false)}
        isAdmin={userIsAdmin}
        canViewAll={userIsAdmin}
        canCreate={userIsAdmin || user?.role === 'department_head'}
      />
    </>
  );
};

export default NotificationBell;

