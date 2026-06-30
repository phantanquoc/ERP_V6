import React, { useRef, useEffect, useCallback, useState } from 'react';
import { X, ExternalLink, Clock, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppNotification } from '../services/notificationService';
import {
  NOTIFICATION_TYPE_LABELS,
  resolveDeepLink,
  resolveModalKind,
  NotificationModalKind,
} from './myNotificationsUtils';
import { useMarkNotificationAsRead } from '../hooks/useMyNotifications';
import { useAuth } from '../contexts/AuthContext';
import DailyWorkReportListModal from './DailyWorkReportListModal';
import FeedbackListModal from './FeedbackListModal';
import WorkPlanListModal from './WorkPlanListModal';
import TaskListModal from './TaskListModal';
import EmployeeSelfEvaluationModal from './EmployeeSelfEvaluationModal';
import EmployeePayrollModal from './EmployeePayrollModal';
import AcceptanceHandoverViewModal from './AcceptanceHandoverViewModal';
import LeaveRequestApprovalModal from './LeaveRequestApprovalModal';
import OvertimePlanListModal from './OvertimePlanListModal';
import AdminResetPasswordModal from './AdminResetPasswordModal';

// ---- focus trap hook ---------------------------------------------------
function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void
) {
  useEffect(() => {
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;

    const getFocusable = () =>
      Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => n.offsetParent !== null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onEscape(); return; }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, containerRef, onEscape]);
}

// ---- helpers -----------------------------------------------------------

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${m}`;
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <span className="w-32 flex-shrink-0 text-xs font-medium text-gray-500 pt-0.5">{label}</span>
    <div className="flex-1 text-sm text-gray-900">{children}</div>
  </div>
);

// ---- component ---------------------------------------------------------

interface MyNotificationsDetailModalProps {
  item: AppNotification | null;
  onClose: () => void;
}

const MyNotificationsDetailModal: React.FC<MyNotificationsDetailModalProps> = ({
  item,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userIsAdmin = user?.role === 'admin';
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = item !== null;
  const [activeModalKind, setActiveModalKind] = useState<NotificationModalKind>(null);

  const markAsRead = useMarkNotificationAsRead();

  // Optimistically mark as read when modal opens for an unread item
  const hasMarkedRef = useRef(false);
  useEffect(() => {
    if (isOpen && item && !item.isRead && !hasMarkedRef.current) {
      hasMarkedRef.current = true;
      markAsRead.mutate(item.id);
    }
    if (!isOpen) {
      hasMarkedRef.current = false;
      setActiveModalKind(null);
    }
  }, [isOpen, item]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      const t = setTimeout(() => closeButtonRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => { onClose(); }, [onClose]);

  useFocusTrap(dialogRef as React.RefObject<HTMLElement | null>, isOpen, handleClose);

  if (!item) return null;

  const deepLink = resolveDeepLink({
    type: item.type,
    metadata: item.metadata,
    entityId: (item.metadata?.entityId as string | undefined),
    period: item.period,
  });

  const modalKind: NotificationModalKind = !deepLink ? resolveModalKind(item.type) : null;
  const canOpenDetail = Boolean(deepLink) || modalKind !== null;

  const typeLabel = NOTIFICATION_TYPE_LABELS[item.type] ?? item.type;
  const metaEntries = item.metadata
    ? Object.entries(item.metadata).filter(([k, v]) => v != null && v !== '' && k !== 'entityId' && k !== 'event')
    : [];

  const handleOpenDetail = () => {
    if (deepLink) {
      onClose();
      navigate(deepLink);
      return;
    }
    if (modalKind) {
      setActiveModalKind(modalKind);
    }
  };

  const handleInnerModalClose = () => {
    setActiveModalKind(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notif-modal-title"
          className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-gray-100">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-xs text-gray-400 font-medium mb-0.5">{typeLabel}</p>
              <h2
                id="notif-modal-title"
                className="text-base font-semibold text-gray-900 leading-snug"
              >
                {item.title}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-0">
            <DetailRow label="Thời gian">
              <div className="flex items-center gap-1.5 text-gray-700">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                {formatDateTime(item.createdAt)}
              </div>
            </DetailRow>

            <DetailRow label="Loại">
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-700">{typeLabel}</span>
              </div>
            </DetailRow>

            <DetailRow label="Nội dung">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{item.message}</p>
            </DetailRow>

            {/* Additional metadata */}
            {metaEntries.map(([key, value]) => (
              <DetailRow key={key} label={key}>
                <span className="text-gray-700">{String(value)}</span>
              </DetailRow>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Đóng
            </button>
            {canOpenDetail && (
              <button
                type="button"
                onClick={handleOpenDetail}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ExternalLink className="w-4 h-4" />
                Mở chi tiết
              </button>
            )}
          </div>
        </div>
      </div>

      {/* In-place detail/list modals for modal-only notification types */}
      <DailyWorkReportListModal
        isOpen={activeModalKind === 'dailyWorkReport'}
        onClose={handleInnerModalClose}
        initialItemId={item.metadata?.entityId as string | undefined}
      />
      <FeedbackListModal
        isOpen={activeModalKind === 'feedback'}
        onClose={handleInnerModalClose}
        initialItemId={item.metadata?.entityId as string | undefined}
      />
      <WorkPlanListModal
        isOpen={activeModalKind === 'workPlan'}
        onClose={handleInnerModalClose}
        initialItemId={item.metadata?.entityId as string | undefined}
      />
      <TaskListModal
        isOpen={activeModalKind === 'task'}
        onClose={handleInnerModalClose}
        isAdmin={userIsAdmin}
      />
      <EmployeeSelfEvaluationModal
        isOpen={activeModalKind === 'evaluation'}
        onClose={handleInnerModalClose}
        evaluationId={item.evaluationId ?? null}
        notificationId={item.id}
        evaluationPeriod={item.period}
        employeeId={user?.employeeId || null}
        month={new Date().getMonth() + 1}
        year={new Date().getFullYear()}
      />
      <EmployeePayrollModal
        isOpen={activeModalKind === 'payroll'}
        onClose={handleInnerModalClose}
        period={item.period}
      />
      <AcceptanceHandoverViewModal
        isOpen={activeModalKind === 'acceptanceHandover'}
        onClose={handleInnerModalClose}
        acceptanceHandoverId={item.acceptanceHandoverId ?? null}
        notificationMessage={item.message}
      />
      <LeaveRequestApprovalModal
        isOpen={activeModalKind === 'leaveRequest'}
        onClose={handleInnerModalClose}
        leaveRequestId={item.leaveRequestId ?? null}
        notificationMessage={item.message}
      />
      <OvertimePlanListModal
        isOpen={activeModalKind === 'overtimePlan'}
        onClose={handleInnerModalClose}
        isAdmin={userIsAdmin}
        canViewAll={userIsAdmin}
        canCreate={userIsAdmin || user?.role === 'department_head'}
        highlightPlanId={(item.metadata?.planId as string | undefined) ?? undefined}
      />
      {activeModalKind === 'passwordReset' && (
        <AdminResetPasswordModal
          userId={(item.metadata?.targetUserId as string) || ''}
          employeeName={item.message}
          metadata={item.metadata}
          onClose={handleInnerModalClose}
        />
      )}
    </>
  );
};

export default MyNotificationsDetailModal;
