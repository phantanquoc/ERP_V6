import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, BellOff, MoreVertical, Trash2, CheckCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import notificationService, { AppNotification } from '@services/notificationService';
import pushNotificationService from '@services/pushNotificationService';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationIcon } from '../utils/notificationIcons';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import TaskListModal from './TaskListModal';
import EmployeeSelfEvaluationModal from './EmployeeSelfEvaluationModal';
import AllNotificationsModal from './AllNotificationsModal';
import EmployeePayrollModal from './EmployeePayrollModal';
import AcceptanceHandoverViewModal from './AcceptanceHandoverViewModal';
import LeaveRequestApprovalModal from './LeaveRequestApprovalModal';
import OvertimePlanListModal from './OvertimePlanListModal';
import FeedbackListModal from './FeedbackListModal';
import DailyWorkReportListModal from './DailyWorkReportListModal';
import WorkPlanListModal from './WorkPlanListModal';
import AdminResetPasswordModal from './AdminResetPasswordModal';

// Whether the current browser environment supports Web Push
const pushSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

const NotificationBell = ({ onNotificationClick }: { onNotificationClick?: (notification: AppNotification) => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userIsAdmin = user?.role === 'admin';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [selectedEvaluationNotification, setSelectedEvaluationNotification] = useState<AppNotification | null>(null);
  const [isAllNotificationsOpen, setIsAllNotificationsOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [selectedPayrollNotification, setSelectedPayrollNotification] = useState<AppNotification | null>(null);
  const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false);
  const [selectedAcceptanceHandoverId, setSelectedAcceptanceHandoverId] = useState<string | null>(null);
  const [selectedAcceptanceMessage, setSelectedAcceptanceMessage] = useState<string | undefined>(undefined);
  const [isLeaveRequestModalOpen, setIsLeaveRequestModalOpen] = useState(false);
  const [selectedLeaveRequestId, setSelectedLeaveRequestId] = useState<string | null>(null);
  const [selectedLeaveRequestMessage, setSelectedLeaveRequestMessage] = useState<string | undefined>(undefined);
  const [isOvertimePlanModalOpen, setIsOvertimePlanModalOpen] = useState(false);
  const [selectedOvertimePlanId, setSelectedOvertimePlanId] = useState<string | null>(null);
  const [isFeedbackListModalOpen, setIsFeedbackListModalOpen] = useState(false);
  const [isDailyReportListModalOpen, setIsDailyReportListModalOpen] = useState(false);
  const [isWorkPlanListModalOpen, setIsWorkPlanListModalOpen] = useState(false);
  const [selectedPasswordResetNotification, setSelectedPasswordResetNotification] = useState<AppNotification | null>(null);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Web Push state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushDeniedMessage, setPushDeniedMessage] = useState('');

  // Click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Initialise push enabled state on mount
  useEffect(() => {
    if (!pushSupported) return;
    pushNotificationService.isSubscribed().then(setPushEnabled).catch(() => {});
  }, []);

  const handlePushToggle = async () => {
    if (pushLoading) return;
    setPushDeniedMessage('');
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await pushNotificationService.unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          await pushNotificationService.subscribeToPush();
          setPushEnabled(true);
        } else {
          setPushDeniedMessage('Vui lòng cho phép thông báo trong cài đặt trình duyệt');
        }
      }
    } catch (error) {
      console.error('[NotificationBell] Push toggle error:', error);
    } finally {
      setPushLoading(false);
    }
  };

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const { data: notifications = [], isFetching: loading, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', 'recent', showUnreadOnly],
    queryFn: () => showUnreadOnly
      ? notificationService.getUnreadNotifications()
      : notificationService.getEmployeeNotifications(20),
    enabled: isOpen,
    staleTime: 0,
  });

  // Listen for WebSocket notification events — refetch immediately when dropdown is open
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      if (isOpen) {
        refetchNotifications();
      }
    };
    window.addEventListener('ws-notification', handler);
    return () => window.removeEventListener('ws-notification', handler);
  }, [isOpen, refetchNotifications, queryClient]);

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCountByType'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await notificationService.deleteNotification(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    if (notification.type === 'TASK' || notification.type === 'TASK_ADMIN') {
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
      setSelectedLeaveRequestId(notification.leaveRequestId || null);
      setSelectedLeaveRequestMessage(notification.message);
      setIsLeaveRequestModalOpen(true);
    } else if (notification.type === 'OVERTIME_PLAN' || notification.type === 'OVERTIME_PLAN_APPROVAL') {
      const planId = (notification.metadata as any)?.planId || null;
      setSelectedOvertimePlanId(planId);
      setIsOvertimePlanModalOpen(true);
    } else if (['SUPPLY_REQUEST', 'SUPPLY_REQUEST_PROCESSING', 'SUPPLY_REQUEST_APPROVED', 'SUPPLY_REQUEST_FULFILLED'].includes(notification.type)) {
      navigate('/production/warehouse');
    } else if (notification.type === 'REPAIR_REQUEST') {
      navigate('/technical/quality?tab=repairRequests');
    } else if (notification.type === 'PRIVATE_FEEDBACK') {
      setIsFeedbackListModalOpen(true);
    } else if (notification.type === 'DAILY_WORK_REPORT') {
      setIsDailyReportListModalOpen(true);
    } else if (notification.type === 'WORK_PLAN') {
      setIsWorkPlanListModalOpen(true);
    } else if (notification.type === 'PASSWORD_RESET') {
      setSelectedPasswordResetNotification(notification);
    } else if (notification.type === 'PURCHASE_REQUEST') {
      const prId = (notification.metadata as any)?.purchaseRequestId;
      navigate(prId ? `/purchasing/materials?purchaseRequestId=${prId}` : '/purchasing/materials');
    } else if (notification.type === 'ORDER') {
      navigate('/business/international');
    } else if (notification.type === 'WAREHOUSE') {
      navigate('/production/warehouse');
    } else if (notification.type === 'INVOICE') {
      navigate('/accounting/admin?tab=invoices');
    } else if (notification.type === 'DEBT') {
      navigate('/accounting/admin?tab=debts');
    } else if (notification.type === 'PRODUCTION_REPORT') {
      navigate('/production/management?tab=productionReport');
    } else if (notification.type === 'PROJECT_APPROVAL') {
      const projectId = (notification.metadata as any)?.entityId;
      navigate(projectId ? `/technical/projects?projectId=${projectId}` : '/technical/projects');
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  };

  return (
    <>
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setIsOpen(!isOpen); }}
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
        <div className="fixed inset-x-0 top-14 mx-auto sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-md bg-white rounded-lg shadow-2xl z-50 max-h-[80vh] sm:max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-800">Thông báo</h3>
            <div className="flex items-center gap-2">
              {/* Push notification toggle — only rendered in supported browsers */}
              {pushSupported && (
                <button
                  onClick={handlePushToggle}
                  disabled={pushLoading}
                  title={pushEnabled ? 'Tắt thông báo đẩy' : 'Bật thông báo đẩy'}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                    pushLoading
                      ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400'
                      : pushEnabled
                      ? 'border-blue-500 text-blue-600 hover:bg-blue-50'
                      : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {pushEnabled ? (
                    <Bell className="w-3 h-3" />
                  ) : (
                    <BellOff className="w-3 h-3" />
                  )}
                  {pushEnabled ? 'Tắt thông báo đẩy' : 'Bật thông báo đẩy'}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Permission denied message */}
          {pushDeniedMessage && (
            <div className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200">
              {pushDeniedMessage}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 px-4 py-2 border-b border-gray-200 bg-white items-center">
            <button
              onClick={() => setShowUnreadOnly(false)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                !showUnreadOnly
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setShowUnreadOnly(true)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                showUnreadOnly
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
            </button>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  await notificationService.markAllAsRead();
                  queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }}
                className="ml-auto text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>{showUnreadOnly ? 'Không có thông báo chưa đọc' : 'Không có thông báo'}</p>
              </div>
            ) : (
              (() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                const groups: { label: string; items: typeof notifications }[] = [];
                const todayItems: typeof notifications = [];
                const yesterdayItems: typeof notifications = [];
                const earlierItems: typeof notifications = [];
                for (const n of notifications) {
                  const d = new Date(n.createdAt); d.setHours(0,0,0,0);
                  if (d.getTime() === today.getTime()) todayItems.push(n);
                  else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
                  else earlierItems.push(n);
                }
                if (todayItems.length) groups.push({ label: 'Hôm nay', items: todayItems });
                if (yesterdayItems.length) groups.push({ label: 'Hôm qua', items: yesterdayItems });
                if (earlierItems.length) groups.push({ label: 'Trước đó', items: earlierItems });

                return groups.map(group => (
                  <div key={group.label}>
                    <div className="px-4 py-1.5 bg-gray-100 text-xs font-medium text-gray-500 sticky top-0">
                      {group.label}
                    </div>
                    {group.items.map(notification => (
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
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-start gap-1">
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                      )}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === notification.id ? null : notification.id);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {menuOpenId === notification.id && (
                          <div className="absolute right-0 top-7 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1 min-w-[120px]">
                            <button
                              onClick={(e) => handleDeleteNotification(e, notification.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
                  </div>
                ));
              })()
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
        isAdmin={userIsAdmin}
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
        employeeId={user?.employeeId || null}
        month={new Date().getMonth() + 1}
        year={new Date().getFullYear()}
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
        onClose={() => { setIsOvertimePlanModalOpen(false); setSelectedOvertimePlanId(null); }}
        isAdmin={userIsAdmin}
        canViewAll={userIsAdmin}
        canCreate={userIsAdmin || user?.role === 'department_head'}
        highlightPlanId={selectedOvertimePlanId || undefined}
      />

      {/* Feedback List Modal - opened when clicking PRIVATE_FEEDBACK notification */}
      <FeedbackListModal
        isOpen={isFeedbackListModalOpen}
        onClose={() => setIsFeedbackListModalOpen(false)}
      />

      {/* Daily Work Report List Modal - opened when clicking DAILY_WORK_REPORT notification */}
      <DailyWorkReportListModal
        isOpen={isDailyReportListModalOpen}
        onClose={() => setIsDailyReportListModalOpen(false)}
        isAdmin={userIsAdmin}
      />

      {/* Work Plan List Modal - opened when clicking WORK_PLAN notification */}
      <WorkPlanListModal
        isOpen={isWorkPlanListModalOpen}
        onClose={() => setIsWorkPlanListModalOpen(false)}
        isAdmin={userIsAdmin}
      />

      {/* Admin Reset Password Modal - opened when clicking PASSWORD_RESET notification */}
      {selectedPasswordResetNotification && (
        <AdminResetPasswordModal
          userId={(selectedPasswordResetNotification.metadata?.targetUserId as string) || ''}
          employeeName={selectedPasswordResetNotification.message}
          metadata={selectedPasswordResetNotification.metadata}
          onClose={() => setSelectedPasswordResetNotification(null)}
        />
      )}
    </>
  );
};

export default NotificationBell;
