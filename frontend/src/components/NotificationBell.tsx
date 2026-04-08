import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, Clock, AlertCircle, Target, ClipboardList, DollarSign, PackageCheck, CalendarDays, ShoppingCart, Truck, FileText } from 'lucide-react';
import notificationService, { Notification } from '@services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import TaskListModal from './TaskListModal';
import EmployeeSelfEvaluationModal from './EmployeeSelfEvaluationModal';
import AllNotificationsModal from './AllNotificationsModal';
import EmployeePayrollModal from './EmployeePayrollModal';
import AcceptanceHandoverViewModal from './AcceptanceHandoverViewModal';
import LeaveRequestApprovalModal from './LeaveRequestApprovalModal';
import OvertimePlanListModal from './OvertimePlanListModal';
import MeetingModal from './MeetingModal';
import { meetingService, Meeting } from '../services/meetingService';
import FeedbackListModal from './FeedbackListModal';
import SupplyAdjustmentModal from './SupplyAdjustmentModal';
import OrderDetailModal from './OrderDetailModal';
import PurchaseRequestDetailModal from './PurchaseRequestDetailModal';
import WorkPlanDetailModal from './WorkPlanDetailModal';
import DailyWorkReportDetailModal from './DailyWorkReportDetailModal';

/**
 * Returns a human-readable relative time string in Vietnamese.
 * e.g. "2 phút trước", "1 giờ trước", "Hôm nay", "Hôm qua"
 */
function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Groups notifications by date: "Hôm nay", "Hôm qua", or "Trước đó"
 */
function groupByDate(notifications: Notification[]): Array<{ label: string; items: Notification[] }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Array<{ label: string; items: Notification[] }> = [];
  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  for (const n of notifications) {
    const notifDate = new Date(n.createdAt);
    notifDate.setHours(0, 0, 0, 0);

    if (notifDate.getTime() === today.getTime()) {
      todayItems.push(n);
    } else if (notifDate.getTime() === yesterday.getTime()) {
      yesterdayItems.push(n);
    } else {
      earlierItems.push(n);
    }
  }

  if (todayItems.length > 0) groups.push({ label: 'Hôm nay', items: todayItems });
  if (yesterdayItems.length > 0) groups.push({ label: 'Hôm qua', items: yesterdayItems });
  if (earlierItems.length > 0) groups.push({ label: 'Trước đó', items: earlierItems });

  return groups;
}

/**
 * Returns a navigation link for clicking on a notification.
 * Returns null if no specific link is available.
 */
const NotificationBell = ({ onNotificationClick }: { onNotificationClick?: (notification: Notification) => void }) => {
  const { user, subscribeToNotifications } = useAuth();
  // isAdmin = role is ADMIN or MANAGER (DEPARTMENT_HEAD / TEAM_LEAD are mapped to MANAGER)
  const userIsAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTaskListModalOpen, setIsTaskListModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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
  const [selectedOvertimePlanId, setSelectedOvertimePlanId] = useState<string | null>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [isSupplyAdjustmentModalOpen, setIsSupplyAdjustmentModalOpen] = useState(false);
  const [selectedSupplyAdjustmentId, setSelectedSupplyAdjustmentId] = useState<string | null>(null);
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isPurchaseRequestModalOpen, setIsPurchaseRequestModalOpen] = useState(false);
  const [selectedPurchaseRequestId, setSelectedPurchaseRequestId] = useState<string | null>(null);
  const [isWorkPlanModalOpen, setIsWorkPlanModalOpen] = useState(false);
  const [selectedWorkPlanId, setSelectedWorkPlanId] = useState<string | null>(null);
  const [isDailyWorkReportModalOpen, setIsDailyWorkReportModalOpen] = useState(false);
  const [selectedDailyWorkReportId, setSelectedDailyWorkReportId] = useState<string | null>(null);

  // Maximum notifications to show in the dropdown
  const MAX_SHOWN = 50;

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time notifications via WebSocket (replaces 30s polling)
    const unsubscribe = subscribeToNotifications((notification) => {
      console.debug('[NotificationBell] WS notification received:', notification.type, notification.title);
      // Refresh the list whenever a new notification is pushed
      loadNotifications();
    });

    return unsubscribe;
  }, [subscribeToNotifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getEmployeeNotifications(MAX_SHOWN);
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
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Open contextual modals for certain notification types
    if (notification.type === 'TASK') {
      setSelectedTaskId(notification.taskId || null);
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
    } else if (notification.type === 'LEAVE_REQUEST' || notification.type === 'LEAVE_REQUEST_RESPONSE') {
      setSelectedLeaveRequestId(notification.leaveRequestId || null);
      setSelectedLeaveRequestMessage(notification.message);
      setIsLeaveRequestModalOpen(true);
    } else if (notification.type === 'OVERTIME_PLAN' || notification.type === 'OVERTIME_PLAN_APPROVAL') {
      setSelectedOvertimePlanId(notification.overtimePlanId || null);
      setIsOvertimePlanModalOpen(true);
    } else if (['MEETING_CREATED', 'MEETING_UPDATED', 'MEETING_CANCELLED', 'MEETING_REMINDER'].includes(notification.type)) {
      if (notification.meetingId) {
        meetingService.getById(notification.meetingId)
          .then(meeting => { setSelectedMeeting(meeting); setIsMeetingModalOpen(true); })
          .catch(() => {});
      }
    } else if (notification.type === 'PRIVATE_FEEDBACK') {
      setSelectedFeedbackId(notification.privateFeedbackId || null);
      setIsFeedbackModalOpen(true);
    } else if (['SUPPLY_ADJUSTMENT_CREATED', 'SUPPLY_ADJUSTMENT_APPROVED', 'SUPPLY_ADJUSTMENT_REJECTED'].includes(notification.type)) {
      setSelectedSupplyAdjustmentId(notification.supplyAdjustmentId || null);
      setIsSupplyAdjustmentModalOpen(true);
    } else if (notification.type === 'ORDER') {
      setSelectedOrderId(notification.orderId || null);
      setIsOrderDetailModalOpen(true);
    } else if (notification.type === 'PURCHASE_REQUEST') {
      setSelectedPurchaseRequestId(notification.purchaseRequestId || null);
      setIsPurchaseRequestModalOpen(true);
    } else if (notification.type === 'WORK_PLAN') {
      setSelectedWorkPlanId(notification.workPlanId || null);
      setIsWorkPlanModalOpen(true);
    } else if (notification.type === 'DAILY_WORK_REPORT') {
      setSelectedDailyWorkReportId(notification.dailyWorkReportId || null);
      setIsDailyWorkReportModalOpen(true);
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
      case 'LEAVE_REQUEST':
      case 'LEAVE_REQUEST_RESPONSE':
        return <CalendarDays className="w-4 h-4 text-purple-600" />;
      case 'OVERTIME_PLAN':
      case 'OVERTIME_PLAN_APPROVAL':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'ORDER':
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case 'SUPPLY_REQUEST':
        return <ShoppingCart className="w-4 h-4 text-yellow-600" />;
      case 'WAREHOUSE_RECEIPT':
        return <Truck className="w-4 h-4 text-gray-600" />;
      case 'MEETING_CREATED':
      case 'MEETING_UPDATED':
      case 'MEETING_CANCELLED':
      case 'MEETING_REMINDER':
        return <CalendarDays className="w-4 h-4 text-red-600" />;
      case 'SUPPLY_ADJUSTMENT_CREATED':
      case 'SUPPLY_ADJUSTMENT_APPROVED':
      case 'SUPPLY_ADJUSTMENT_REJECTED':
        return <ShoppingCart className="w-4 h-4 text-emerald-600" />;
      case 'PURCHASE_REQUEST':
        return <ShoppingCart className="w-4 h-4 text-teal-600" />;
      case 'WORK_PLAN':
        return <ClipboardList className="w-4 h-4 text-violet-600" />;
      case 'DAILY_WORK_REPORT':
        return <FileText className="w-4 h-4 text-cyan-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  // Group notifications by date
  const groupedNotifications = groupByDate(notifications);

  return (
    <>
      <div className="relative">
        {/* Bell Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
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
          <div className="absolute right-0 mt-2 w-[22rem] bg-white rounded-lg shadow-2xl z-50 max-h-[42rem] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Thông báo</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      await notificationService.markAllAsRead();
                      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    Đánh dấu tất cả đã đọc
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

            {/* Notifications List — grouped by date */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Đang tải...</div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Không có thông báo</p>
                </div>
              ) : (
                <>
                  {groupedNotifications.map(group => (
                    <div key={group.label}>
                      {/* Group header */}
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {group.label}
                        </span>
                      </div>

                      {group.items.map(notification => {
                        const content = (
                          <div
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
                                  {getRelativeTime(notification.createdAt)}
                                </p>
                              </div>
                              {!notification.isRead && (
                                <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
                              )}
                            </div>
                          </div>
                        );

                        return (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
                <button
                  onClick={() => { setIsOpen(false); setIsAllNotificationsOpen(true); }}
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
        onClose={() => { setIsTaskListModalOpen(false); setSelectedTaskId(null); }}
        initialTaskId={selectedTaskId}
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
      <OvertimePlanListModal
        isOpen={isOvertimePlanModalOpen}
        onClose={() => { setIsOvertimePlanModalOpen(false); setSelectedOvertimePlanId(null); }}
        isAdmin={userIsAdmin}
        initialPlanId={selectedOvertimePlanId}
        onInitialPlanIdConsumed={() => setSelectedOvertimePlanId(null)}
      />

      {/* Meeting Modal - opened when clicking MEETING notification */}
      {isMeetingModalOpen && (
        <MeetingModal
          meeting={selectedMeeting}
          onClose={() => { setIsMeetingModalOpen(false); setSelectedMeeting(null); }}
          onSuccess={() => { setIsMeetingModalOpen(false); setSelectedMeeting(null); }}
        />
      )}

      {/* Feedback Modal - opened when clicking PRIVATE_FEEDBACK notification */}
      <FeedbackListModal
        isOpen={isFeedbackModalOpen}
        onClose={() => { setIsFeedbackModalOpen(false); setSelectedFeedbackId(null); }}
        initialFeedbackId={selectedFeedbackId}
      />

      {/* Supply Adjustment Modal - opened when clicking SUPPLY_ADJUSTMENT_* notification */}
      <SupplyAdjustmentModal
        isOpen={isSupplyAdjustmentModalOpen}
        onClose={() => { setIsSupplyAdjustmentModalOpen(false); setSelectedSupplyAdjustmentId(null); }}
        initialId={selectedSupplyAdjustmentId}
      />

      {/* Order Detail Modal - opened when clicking ORDER notification */}
      <OrderDetailModal
        isOpen={isOrderDetailModalOpen}
        onClose={() => { setIsOrderDetailModalOpen(false); setSelectedOrderId(null); }}
        orderId={selectedOrderId}
      />

      {/* Purchase Request Modal - opened when clicking PURCHASE_REQUEST notification */}
      <PurchaseRequestDetailModal
        isOpen={isPurchaseRequestModalOpen}
        onClose={() => { setIsPurchaseRequestModalOpen(false); setSelectedPurchaseRequestId(null); }}
        purchaseRequestId={selectedPurchaseRequestId}
      />

      {/* Work Plan Modal */}
      <WorkPlanDetailModal
        isOpen={isWorkPlanModalOpen}
        onClose={() => { setIsWorkPlanModalOpen(false); setSelectedWorkPlanId(null); }}
        workPlanId={selectedWorkPlanId}
      />

      {/* Daily Work Report Modal */}
      <DailyWorkReportDetailModal
        isOpen={isDailyWorkReportModalOpen}
        onClose={() => { setIsDailyWorkReportModalOpen(false); setSelectedDailyWorkReportId(null); }}
        reportId={selectedDailyWorkReportId}
      />
    </>
  );
};

export default NotificationBell;
