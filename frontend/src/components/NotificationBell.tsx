import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, BellOff, MoreVertical, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import notificationService, { AppNotification } from '@services/notificationService';
import pushNotificationService from '@services/pushNotificationService';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import {
  getNotificationConfig,
  getNotificationIcon,
  NotificationActionTarget,
  resolveNotificationRoute,
} from '../utils/notificationIcons';
import { getNotificationAuditDetail, getNotificationAuditHeadline } from '../utils/notificationAudit';
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

// Whether the current browser environment supports Web Push
const pushSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

const NotificationBell = ({ onNotificationClick }: { onNotificationClick?: (notification: AppNotification) => void }) => {
  const { user } = useAuth();
  const { settings } = useSystemSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userIsAdmin = user?.role === 'admin';
  const notificationSettings = settings?.notificationSettings;
  const inAppEnabled = notificationSettings?.channels.inAppEnabled ?? true;
  const webPushEnabled = notificationSettings?.channels.webPushEnabled ?? true;
  const unreadPollingIntervalSeconds = notificationSettings?.ui.unreadPollingIntervalSeconds ?? 10;
  const recentLimit = notificationSettings?.ui.recentLimit ?? 20;
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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
  const [isFeedbackListModalOpen, setIsFeedbackListModalOpen] = useState(false);
  const [isDailyReportListModalOpen, setIsDailyReportListModalOpen] = useState(false);
  const [isWorkPlanModalOpen, setIsWorkPlanModalOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  // Web Push state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushDeniedMessage, setPushDeniedMessage] = useState('');

  // Initialise push enabled state on mount
  useEffect(() => {
    if (!pushSupported || !webPushEnabled) return;
    pushNotificationService.isSubscribed().then(setPushEnabled).catch(() => {});
  }, [webPushEnabled]);

  const handlePushToggle = async () => {
    if (pushLoading || !webPushEnabled) return;
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
      setActionError('Không thể cập nhật trạng thái thông báo đẩy. Vui lòng thử lại.');
    } finally {
      setPushLoading(false);
    }
  };

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: inAppEnabled,
    refetchInterval: unreadPollingIntervalSeconds * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const {
    data: notifications = [],
    isFetching: loading,
    isError: notificationsLoadFailed,
  } = useQuery({
    queryKey: ['notifications', 'recent', showUnreadOnly],
    queryFn: () => showUnreadOnly
      ? notificationService.getUnreadNotifications()
      : notificationService.getEmployeeNotifications(recentLimit),
    enabled: isOpen && inAppEnabled,
    staleTime: 0,
  });

  // Auto-scroll to top when notifications list updates while dropdown is open
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [notifications, isOpen]);

  const markAsRead = async (notification: AppNotification) => {
    if (notification.isRead) {
      return;
    }

    try {
      setActionError('');
      const optimisticTimestamp = new Date().toISOString();

      queryClient.setQueriesData<AppNotification[]>(
        { queryKey: ['notifications', 'recent'] },
        (currentNotifications) => {
          if (!currentNotifications) {
            return currentNotifications;
          }

          return currentNotifications.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  isRead: true,
                  readAt: item.readAt ?? optimisticTimestamp,
                  updatedAt: optimisticTimestamp,
                }
              : item
          );
        }
      );
      queryClient.setQueryData<number>(
        ['notifications', 'unreadCount'],
        (currentUnreadCount) => Math.max(0, (currentUnreadCount ?? 0) - 1)
      );

      await notificationService.markAsRead(notification.id);
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCountByType'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCountByType'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
      console.error('Error marking notification as read:', error);
      setActionError('Không thể đánh dấu đã đọc. Vui lòng thử lại.');
    }
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      setActionError('');
      await notificationService.deleteNotification(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      console.error('Error deleting notification:', error);
      setActionError('Không thể xóa thông báo. Vui lòng thử lại.');
    }
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    const notificationConfig = getNotificationConfig(notification);
    const markAsReadPromise = markAsRead(notification);

    if (notificationConfig.actionType === 'route') {
      const route = resolveNotificationRoute(notificationConfig.actionTarget);
      if (route) {
        navigate(route);
      }
    } else {
      switch (notificationConfig.actionTarget) {
        case NotificationActionTarget.TASK_LIST:
          setIsTaskListModalOpen(true);
          break;
        case NotificationActionTarget.EVALUATION:
          setSelectedEvaluationNotification(notification);
          setIsEvaluationModalOpen(true);
          break;
        case NotificationActionTarget.PAYROLL:
          setSelectedPayrollNotification(notification);
          setIsPayrollModalOpen(true);
          break;
        case NotificationActionTarget.ACCEPTANCE_HANDOVER:
          setSelectedAcceptanceHandoverId(notification.acceptanceHandoverId || null);
          setSelectedAcceptanceMessage(notification.message);
          setIsAcceptanceModalOpen(true);
          break;
        case NotificationActionTarget.LEAVE_REQUEST:
          setSelectedLeaveRequestId(notification.leaveRequestId || null);
          setSelectedLeaveRequestMessage(notification.message);
          setIsLeaveRequestModalOpen(true);
          break;
        case NotificationActionTarget.OVERTIME_PLAN:
          setIsOvertimePlanModalOpen(true);
          break;
        case NotificationActionTarget.FEEDBACK_LIST:
          setIsFeedbackListModalOpen(true);
          break;
        case NotificationActionTarget.DAILY_WORK_REPORT_LIST:
          setIsDailyReportListModalOpen(true);
          break;
        case NotificationActionTarget.WORK_PLAN_LIST:
          setIsWorkPlanModalOpen(true);
          break;
        default:
          break;
      }
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
    await markAsReadPromise;
  };

  return (
    <>
    <div className="relative">
      {/* Bell Button */}
        <button
          onClick={() => {
            setActionError('');
            setPushDeniedMessage('');
            setIsOpen(!isOpen);
          }}
          className="relative flex h-11 w-11 items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          title={inAppEnabled ? 'Thông báo' : 'Thông báo đang bị tắt bởi quản trị viên'}
          aria-label="Mở danh sách thông báo"
        >
          <Bell className="w-6 h-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          className="fixed inset-x-0 top-14 mx-auto sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-md bg-white rounded-lg shadow-2xl z-50 max-h-[80vh] sm:max-h-96 overflow-hidden flex flex-col"
          role="dialog"
          aria-modal="false"
          aria-labelledby="notification-bell-title"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
            <h3 id="notification-bell-title" className="text-lg font-bold text-gray-800">Thông báo</h3>
            <div className="flex items-center gap-2">
              {/* Push notification toggle — only rendered in supported browsers */}
              {pushSupported && webPushEnabled && (
                <button
                  onClick={handlePushToggle}
                  disabled={pushLoading}
                  title={pushEnabled ? 'Tắt thông báo đẩy' : 'Bật thông báo đẩy'}
                  className={`flex min-h-11 items-center gap-1 rounded-full border px-3 py-2 text-xs transition-colors ${
                    pushLoading
                      ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-400'
                      : pushEnabled
                      ? 'border-blue-500 text-blue-600 hover:bg-blue-50'
                      : 'border-gray-300 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {pushEnabled ? (
                    <Bell className="w-3 h-3" aria-hidden="true" />
                  ) : (
                    <BellOff className="w-3 h-3" aria-hidden="true" />
                  )}
                  {pushEnabled ? 'Tắt thông báo đẩy' : 'Bật thông báo đẩy'}
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-11 w-11 items-center justify-center text-gray-400 hover:text-gray-600"
                aria-label="Đóng bảng thông báo"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {!inAppEnabled && (
            <div
              className="px-4 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-200"
              role="status"
              aria-live="polite"
            >
              Thông báo trong hệ thống đang được tắt trong Cài đặt hệ thống.
            </div>
          )}

          {/* Permission denied message */}
          {pushDeniedMessage && (
            <div
              className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-200"
              role="status"
              aria-live="polite"
            >
              {pushDeniedMessage}
            </div>
          )}

          {(actionError || notificationsLoadFailed) && (
            <div
              className="px-4 py-2 text-xs text-red-700 bg-red-50 border-b border-red-200"
              role="alert"
              aria-live="assertive"
            >
              {actionError || 'Không thể tải thông báo. Vui lòng thử lại.'}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 px-4 py-2 border-b border-gray-200 bg-white" aria-label="Lọc thông báo">
            <button
              onClick={() => setShowUnreadOnly(false)}
              disabled={!inAppEnabled}
              aria-pressed={!showUnreadOnly}
              className={`min-h-11 rounded-full px-4 py-2 text-xs transition-colors ${
                !showUnreadOnly
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setShowUnreadOnly(true)}
              disabled={!inAppEnabled}
              aria-pressed={showUnreadOnly}
              className={`min-h-11 rounded-full px-4 py-2 text-xs transition-colors ${
                showUnreadOnly
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-500 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Notifications List */}
          <div ref={scrollRef} className="overflow-y-auto flex-1">
            {!inAppEnabled ? (
              <div className="p-8 text-center text-gray-500" role="status" aria-live="polite">
                <BellOff className="w-12 h-12 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                <p>Thông báo trong hệ thống đang tắt theo cấu hình admin.</p>
              </div>
            ) : loading ? (
              <div className="p-4 text-center text-gray-500" role="status" aria-live="polite">
                Đang tải...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500" role="status" aria-live="polite">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" aria-hidden="true" />
                <p>{showUnreadOnly ? 'Không có thông báo chưa đọc' : 'Không có thông báo'}</p>
              </div>
            ) : (
              notifications.map(notification => {
                const notificationConfig = getNotificationConfig(notification);
                const isInteractive = notificationConfig.actionType !== 'none';
                const auditHeadline = getNotificationAuditHeadline(notification);
                const auditDetail = getNotificationAuditDetail(notification);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 transition-colors ${
                      notification.isRead
                        ? 'bg-white'
                        : 'bg-blue-50'
                    }`}
                  >
                    <div className="flex gap-3">
                      {isInteractive ? (
                        <button
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`flex flex-1 min-w-0 gap-3 text-left rounded-lg p-2 -m-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            notification.isRead ? 'hover:bg-gray-50' : 'hover:bg-blue-100'
                          }`}
                          aria-label={`Mở thông báo: ${notification.title}`}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            {auditHeadline && (
                              <p className="mt-2 text-xs font-medium text-slate-700">
                                {auditHeadline}
                              </p>
                            )}
                            {auditDetail && (
                              <p className="mt-1 text-xs text-slate-500">
                                {auditDetail}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="flex flex-1 min-w-0 gap-3 p-2 -m-2 opacity-90">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            {auditHeadline && (
                              <p className="mt-2 text-xs font-medium text-slate-700">
                                {auditHeadline}
                              </p>
                            )}
                            {auditDetail && (
                              <p className="mt-1 text-xs text-slate-500">
                                {auditDetail}
                              </p>
                            )}
                            <p className="mt-2 text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      )}
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
                            className="flex h-11 w-11 items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            aria-label="Mở tùy chọn thông báo"
                          >
                            <MoreVertical className="w-4 h-4" aria-hidden="true" />
                          </button>
                          {menuOpenId === notification.id && (
                            <div className="absolute right-0 top-11 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1 min-w-[120px]">
                              <button
                                onClick={(e) => handleDeleteNotification(e, notification.id)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {inAppEnabled && notifications.length > 0 && (
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
      />

      {/* All Notifications Modal */}
      <AllNotificationsModal
        isOpen={isAllNotificationsOpen}
        onClose={() => setIsAllNotificationsOpen(false)}
        historyWindowDays={notificationSettings?.ui.historyWindowDays ?? 30}
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

      <WorkPlanListModal
        isOpen={isWorkPlanModalOpen}
        onClose={() => setIsWorkPlanModalOpen(false)}
        isAdmin={userIsAdmin}
      />
    </>
  );
};

export default NotificationBell;
