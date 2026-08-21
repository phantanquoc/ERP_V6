import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, BellOff, MoreVertical, Trash2, CheckCheck, Check, Search, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import notificationService, { AppNotification } from '@services/notificationService';
import pushNotificationService from '@services/pushNotificationService';
import { useAuth } from '../contexts/AuthContext';
import { getNotificationIcon } from '../utils/notificationIcons';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { resolveDeepLink, resolveModalKind } from './myNotificationsUtils';
import TaskListModal from './TaskListModal';
import EmployeeSelfEvaluationModal from './EmployeeSelfEvaluationModal';
import AllNotificationsModal from './AllNotificationsModal';
import EmployeePayrollModal from './EmployeePayrollModal';
import AcceptanceHandoverViewModal from './AcceptanceHandoverViewModal';
import LeaveRequestApprovalModal from './LeaveRequestApprovalModal';
import OvertimePlanDetailModal from './OvertimePlanDetailModal';
import FeedbackListModal from './FeedbackListModal';
import DailyWorkReportListModal from './DailyWorkReportListModal';
import WorkPlanListModal from './WorkPlanListModal';
import AdminResetPasswordModal from './AdminResetPasswordModal';

// Whether the current browser environment supports Web Push
const pushSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

// ---- Digest grouping helpers -------------------------------------------------
const DIGEST_WINDOW_MS = 5 * 60 * 1000;
const DIGEST_THRESHOLD = 3;

const TYPE_LABELS: Record<string, string> = {
  PURCHASE_REQUEST: 'yêu cầu mua hàng',
  SUPPLY_REQUEST: 'yêu cầu vật tư',
  SUPPLY_REQUEST_PROCESSING: 'yêu cầu vật tư',
  SUPPLY_REQUEST_APPROVED: 'yêu cầu vật tư',
  SUPPLY_REQUEST_FULFILLED: 'yêu cầu vật tư',
  ORDER: 'đơn hàng',
  TASK: 'nhiệm vụ',
  TASK_ADMIN: 'nhiệm vụ',
  EVALUATION: 'đánh giá',
  EVALUATION_SUPERVISOR1: 'đánh giá',
  EVALUATION_SUPERVISOR2: 'đánh giá',
  EVALUATION_COMPLETED: 'đánh giá',
  LEAVE_REQUEST: 'đơn nghỉ phép',
  LEAVE_REQUEST_RESPONSE: 'phản hồi nghỉ phép',
  OVERTIME_PLAN: 'kế hoạch tăng ca',
  OVERTIME_PLAN_APPROVAL: 'kế hoạch tăng ca',
  REPAIR_REQUEST: 'yêu cầu sửa chữa',
  WAREHOUSE: 'phiếu kho',
  INVOICE: 'hóa đơn',
  DEBT: 'công nợ',
  PAYROLL: 'phiếu lương',
  ACCEPTANCE_HANDOVER: 'biên bản nghiệm thu',
  PRIVATE_FEEDBACK: 'phản hồi',
  DAILY_WORK_REPORT: 'báo cáo ngày',
  WORK_PLAN: 'kế hoạch công việc',
  PRODUCTION_REPORT: 'báo cáo sản xuất',
  PASSWORD_RESET: 'yêu cầu đặt lại mật khẩu',
};

function getDigestLabel(type: string): string {
  return TYPE_LABELS[type] ?? 'thông báo';
}

/** Cluster ascending-sorted notifications so every cluster spans at most DIGEST_WINDOW_MS */
function clusterByWindow(sortedAscending: AppNotification[]): AppNotification[][] {
  if (sortedAscending.length <= 1) return [sortedAscending];
  const clusters: AppNotification[][] = [];
  let current: AppNotification[] = [sortedAscending[0]];
  let clusterStart = new Date(sortedAscending[0].createdAt).getTime();
  for (let i = 1; i < sortedAscending.length; i++) {
    const t = new Date(sortedAscending[i].createdAt).getTime();
    if (t - clusterStart <= DIGEST_WINDOW_MS) {
      current.push(sortedAscending[i]);
    } else {
      clusters.push(current);
      current = [sortedAscending[i]];
      clusterStart = t;
    }
  }
  clusters.push(current);
  return clusters;
}

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
  const [expandedDigests, setExpandedDigests] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Web Push state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushDeniedMessage, setPushDeniedMessage] = useState('');

  // Swipe-down to close (mobile bottom-sheet)
  const touchStartYRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current == null) return;
    const delta = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartYRef.current = null;
    if (delta > 60) setIsOpen(false);
  };

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
    refetchOnWindowFocus: true,
  });

  const { data: notifications = [], isFetching: loading, isError, error, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', 'recent', showUnreadOnly],
    queryFn: () => showUnreadOnly
      ? notificationService.getUnreadNotifications()
      : notificationService.getEmployeeNotifications(20),
    enabled: isOpen,
    staleTime: 0,
  });

  const filteredNotifications = useMemo(() => {
    if (!debouncedSearch) return notifications;
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(debouncedSearch) ||
        n.message.toLowerCase().includes(debouncedSearch)
    );
  }, [notifications, debouncedSearch]);

  // Refetch unread count when tab becomes visible again (covers WS disconnect gaps)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [queryClient]);

  // Listen for WebSocket notification events — refetch immediately when dropdown is open
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
      if (isOpen) {
        refetchNotifications();
      }
      // Sound / vibration / app badge — only when tab is hidden (background)
      if (typeof document !== 'undefined' && document.hidden) {
        try {
          const audio = new Audio('/notification.mp3');
          audio.volume = 0.6;
          audio.play().catch(() => {});
        } catch {
          // Audio not available — ignore
        }
        if ('vibrate' in navigator) {
          try { navigator.vibrate(200); } catch { /* ignore */ }
        }
        const navWithBadge = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void> };
        if (typeof navWithBadge.setAppBadge === 'function') {
          const cached = queryClient.getQueryData<number>(['notifications', 'unreadCount']);
          const badgeCount = typeof cached === 'number' ? cached + 1 : 1;
          navWithBadge.setAppBadge(badgeCount).catch(() => {});
        }
      }
    };
    window.addEventListener('ws-notification', handler);
    return () => window.removeEventListener('ws-notification', handler);
  }, [isOpen, refetchNotifications, queryClient]);

  // Clear app badge when all read / dropdown opened and no unread
  useEffect(() => {
    const navWithBadge = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
    if (unreadCount === 0 && typeof navWithBadge.clearAppBadge === 'function') {
      navWithBadge.clearAppBadge().catch(() => {});
    }
  }, [unreadCount]);

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

  const handleMarkSingleAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    await markAsRead(notificationId);
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
    const deepLink = resolveDeepLink(notification);
    if (deepLink) {
      navigate(deepLink);
    } else {
      const kind = resolveModalKind(notification.type);
      if (kind) {
        switch (kind) {
          case 'task':
            setIsTaskListModalOpen(true);
            break;
          case 'evaluation':
            setSelectedEvaluationNotification(notification);
            setIsEvaluationModalOpen(true);
            break;
          case 'payroll':
            setSelectedPayrollNotification(notification);
            setIsPayrollModalOpen(true);
            break;
          case 'acceptanceHandover':
            setSelectedAcceptanceHandoverId(notification.acceptanceHandoverId || null);
            setSelectedAcceptanceMessage(notification.message);
            setIsAcceptanceModalOpen(true);
            break;
          case 'leaveRequest':
            setSelectedLeaveRequestId(notification.leaveRequestId || null);
            setSelectedLeaveRequestMessage(notification.message);
            setIsLeaveRequestModalOpen(true);
            break;
          case 'overtimePlan': {
            const planId = (notification.metadata as Record<string, unknown> | undefined)?.planId as string | null | undefined;
            setSelectedOvertimePlanId(planId ?? null);
            setIsOvertimePlanModalOpen(true);
            break;
          }
          case 'feedback':
            setIsFeedbackListModalOpen(true);
            break;
          case 'dailyWorkReport':
            setIsDailyReportListModalOpen(true);
            break;
          case 'workPlan':
            setIsWorkPlanListModalOpen(true);
            break;
          case 'passwordReset':
            setSelectedPasswordResetNotification(notification);
            break;
          default:
            break;
        }
      } else if (onNotificationClick) {
        onNotificationClick(notification);
      }
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
          <span className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full pointer-events-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh] sm:absolute sm:inset-auto sm:right-0 sm:top-auto sm:mt-2 sm:rounded-lg sm:max-h-96 w-full sm:w-96 max-w-md mx-auto bg-white shadow-2xl z-50 overflow-hidden flex flex-col sm:max-w-none"
        >
          {/* Mobile handle bar */}
          <div className="flex justify-center pt-2 pb-1 sm:hidden shrink-0" aria-hidden>
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 shrink-0">
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
          <div className="flex gap-1 px-4 py-2 border-b border-gray-200 bg-white items-center shrink-0">
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

          {/* Search input */}
          <div className="px-4 py-2 border-b border-gray-200 bg-white shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm kiếm..."
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 space-y-3" aria-busy="true" aria-label="Đang tải thông báo">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-2 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="p-8 text-center">
                <p className="text-sm text-red-500 mb-3">
                  {(error as Error)?.message || 'Không thể tải thông báo. Vui lòng thử lại.'}
                </p>
                <button
                  onClick={() => refetchNotifications()}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Thử lại
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                  <Bell className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 mb-4">{showUnreadOnly ? 'Không có thông báo chưa đọc' : 'Không có thông báo'}</p>
                <button
                  onClick={() => { setIsOpen(false); navigate('/my-notifications'); }}
                  className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Xem tất cả thông báo
                </button>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Không tìm thấy thông báo phù hợp</p>
                <button
                  onClick={() => setSearchInput('')}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                >
                  Xóa tìm kiếm
                </button>
              </div>
            ) : (
              (() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                const groups: { label: string; items: typeof filteredNotifications }[] = [];
                const todayItems: typeof filteredNotifications = [];
                const yesterdayItems: typeof filteredNotifications = [];
                const earlierItems: typeof filteredNotifications = [];
                for (const n of filteredNotifications) {
                  const d = new Date(n.createdAt); d.setHours(0,0,0,0);
                  if (d.getTime() === today.getTime()) todayItems.push(n);
                  else if (d.getTime() === yesterday.getTime()) yesterdayItems.push(n);
                  else earlierItems.push(n);
                }
                if (todayItems.length) groups.push({ label: 'Hôm nay', items: todayItems });
                if (yesterdayItems.length) groups.push({ label: 'Hôm qua', items: yesterdayItems });
                if (earlierItems.length) groups.push({ label: 'Trước đó', items: earlierItems });

                const toggleDigest = (key: string) => {
                  setExpandedDigests((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  });
                };

                const renderNotificationRow = (notification: AppNotification) => (
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
                        {!notification.isRead && (
                          <button
                            onClick={(e) => handleMarkSingleAsRead(e, notification.id)}
                            title="Đánh dấu đã đọc"
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
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
                            <div className="absolute right-0 top-7 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1 min-w-[160px]">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => handleMarkSingleAsRead(e, notification.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Đánh dấu đã đọc
                                </button>
                              )}
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
                );

                return groups.map((group) => {
                  // Inner digest: group by type, then cluster by 5-min window
                  const byType = new Map<string, typeof filteredNotifications>();
                  for (const n of group.items) {
                    const arr = byType.get(n.type);
                    if (arr) arr.push(n);
                    else byType.set(n.type, [n]);
                  }
                  // Keep type order by most recent notification first (desc), matching outer list chronology
                  const typeEntries = Array.from(byType.entries());
                  typeEntries.sort((a, b) => {
                    const aMax = Math.max(...a[1].map((x) => new Date(x.createdAt).getTime()));
                    const bMax = Math.max(...b[1].map((x) => new Date(x.createdAt).getTime()));
                    return bMax - aMax;
                  });

                  return (
                    <div key={group.label}>
                      <div className="px-4 py-1.5 bg-gray-100 text-xs font-medium text-gray-500 sticky top-0 z-[1]">
                        {group.label}
                      </div>
                      {typeEntries.map(([type, typeItems]) => {
                        const sortedAsc = [...typeItems].sort(
                          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                        );
                        const clusters = clusterByWindow(sortedAsc);
                        const clustersDesc = [...clusters].reverse();
                        const showTypeHeader = typeEntries.length > 1 && typeItems.length >= 2;

                        return (
                          <div key={`${group.label}:${type}`}>
                            {showTypeHeader && clustersDesc.every((c) => c.length < DIGEST_THRESHOLD) && (
                              <div className="px-4 py-1 flex items-center gap-2 text-[11px] font-medium text-gray-500 bg-gray-50/80 border-b border-gray-100">
                                <span className="inline-flex items-center gap-1">
                                  {getNotificationIcon(type)}
                                  <span>{getDigestLabel(type)}</span>
                                </span>
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-gray-600 bg-gray-200 rounded-full">
                                  {typeItems.length}
                                </span>
                              </div>
                            )}
                            {clustersDesc.map((cluster) => {
                              const isDigest = cluster.length >= DIGEST_THRESHOLD;
                              if (!isDigest) {
                                return cluster
                                  .slice()
                                  .reverse()
                                  .map((n) => renderNotificationRow(n));
                              }
                              const digestKey = `${group.label}:${type}:${cluster[0].id}`;
                              const isExpanded = expandedDigests.has(digestKey);
                              const hasUnread = cluster.some((n) => !n.isRead);
                              const latestTime = cluster[cluster.length - 1].createdAt;
                              const clusterDesc = [...cluster].reverse();
                              return (
                                <div key={digestKey} className="border-b border-gray-100">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => toggleDigest(digestKey)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleDigest(digestKey);
                                      }
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                      hasUnread ? 'bg-blue-50 hover:bg-blue-100' : 'bg-amber-50/60 hover:bg-amber-50'
                                    }`}
                                  >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                                      {getNotificationIcon(type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                                        <Layers className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                        <span>
                                          {cluster.length} {getDigestLabel(type)} mới
                                        </span>
                                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                                          {cluster.length}
                                        </span>
                                      </p>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        {formatRelativeTime(latestTime)} · trong 5 phút
                                      </p>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center gap-2 text-gray-500">
                                      {hasUnread && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                                      {isExpanded ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                                          Thu gọn <ChevronUp className="w-4 h-4" />
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                                          Mở rộng <ChevronDown className="w-4 h-4" />
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {isExpanded && (
                                    <div className="bg-white border-t border-gray-100">
                                      {clusterDesc.map((n) => renderNotificationRow(n))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center shrink-0">
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

      {/* Overtime Plan Detail Modal - opened when clicking OVERTIME_PLAN notification */}
      {/* Fetches the specific plan directly by ID — does not depend on list/pagination or canViewAll,
          so DEPARTMENT_HEAD users can view department-wide-broadcast plans too */}
      <OvertimePlanDetailModal
        isOpen={isOvertimePlanModalOpen}
        onClose={() => { setIsOvertimePlanModalOpen(false); setSelectedOvertimePlanId(null); }}
        planId={selectedOvertimePlanId}
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
