import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ExternalLink, Clock, Tag, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HistoryItem, getEntityDetailEndpoint } from '../services/myHistoryService';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { useFocusTrap } from '../hooks/useFocusTrap';
import TaskListModal from './TaskListModal';
import WorkPlanListModal from './WorkPlanListModal';
import DailyWorkReportListModal from './DailyWorkReportListModal';
import OvertimePlanListModal from './OvertimePlanListModal';
import LeaveRequestApprovalModal from './LeaveRequestApprovalModal';
import AcceptanceHandoverViewModal from './AcceptanceHandoverViewModal';
import FeedbackListModal from './FeedbackListModal';
import HistoryEntityDetailModal from './HistoryEntityDetailModal';

// ---- status display ---------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
  DANG_XU_LY: 'Đang xử lý',
  MOI_TAO: 'Mới tạo',
  TU_CHOI: 'Từ chối',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  CHO_DUYET: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  DANG_XU_LY: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  HOAN_THANH: 'bg-green-50 text-green-700 border-green-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  DA_DUYET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  TU_CHOI: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
  DA_HUY: 'bg-gray-100 text-gray-500 border-gray-200',
  MOI_TAO: 'bg-slate-50 text-slate-600 border-slate-200',
};

// Entity types that have a dedicated list/detail modal (no route to navigate)
const MODAL_ENTITY_TYPES = new Set([
  'task',
  'work-plan',
  'daily-work-report',
  'overtime-plan',
  'leave-request',
  'acceptance-handover',
  'private-feedback',
]);

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${m}`;
}

// ---- detail row -------------------------------------------------------
const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
    <span className="w-32 flex-shrink-0 text-xs font-medium text-gray-500 pt-0.5">{label}</span>
    <div className="flex-1 text-sm text-gray-900">{children}</div>
  </div>
);

// ---- main component ---------------------------------------------------
interface MyHistoryDetailModalProps {
  item: HistoryItem | null;
  onClose: () => void;
}

const MyHistoryDetailModal: React.FC<MyHistoryDetailModalProps> = ({ item, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // TODO(Rule Matrix): display-only admin flag — not a resource gate; keep literal until resource mapping defined
  const userIsAdmin = user?.role === UserRole.ADMIN;
  const isDepartmentHead = user?.role === 'department_head';

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Child modal state — only one open at a time
  const [openModal, setOpenModal] = useState<{
    type: string;
    entityId: string;
  } | null>(null);

  // Generic read-only entity detail modal state
  const [openEntityDetail, setOpenEntityDetail] = useState<{
    entityType: string;
    entityId: string;
    routeHint: string | null;
    displayTitle: string;
  } | null>(null);

  const isOpen = item !== null;

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      // Small delay to ensure the DOM is painted
      const t = setTimeout(() => closeButtonRef.current?.focus(), 10);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Focus trap + Escape
  useFocusTrap(dialogRef as React.RefObject<HTMLElement | null>, isOpen, handleClose);

  if (!item && !openModal && !openEntityDetail) return null;

  const handleOpenOriginal = () => {
    if (!item) return;

    // 7 loại entity đã có list-modal riêng — giữ nguyên
    if (MODAL_ENTITY_TYPES.has(item.entityType)) {
      setOpenModal({ type: item.entityType, entityId: item.entityId });
      onClose();
      return;
    }

    // Entity có endpoint detail → mở HistoryEntityDetailModal (không đá sang trang module)
    if (getEntityDetailEndpoint(item.entityType)) {
      setOpenEntityDetail({
        entityType: item.entityType,
        entityId: item.entityId,
        routeHint: item.routeHint ?? null,
        displayTitle: item.title,
      });
      onClose();
      return;
    }

    // Fallback: navigate như hiện tại
    if (item.routeHint) {
      onClose();
      navigate(item.routeHint);
    }
  };

  const handleChildModalClose = () => setOpenModal(null);

  const openButtonLabel = item
    ? (MODAL_ENTITY_TYPES.has(item.entityType)
      ? 'Xem trong danh sách'
      : (getEntityDetailEndpoint(item.entityType) ? 'Xem chi tiết' : 'Mở ở trang gốc'))
    : 'Mở ở trang gốc';

  const metaEntries =
    item && item.metadata ? Object.entries(item.metadata).filter(([, v]) => v != null && v !== '') : [];

  const statusLabel = item?.status ? (STATUS_LABEL[item.status] ?? item.status) : null;
  const statusColor = item?.status
    ? (STATUS_COLOR[item.status] ?? 'bg-gray-100 text-gray-500 border-gray-200')
    : '';

  return (
    <>
      {/* Detail modal */}
      {item && (
        <>
          {/* Backdrop — aria-hidden so screen readers skip it */}
          <div
            className="fixed inset-0 bg-black/40 z-50"
            aria-hidden="true"
            onClick={handleClose}
          />
          {/* Dialog — sibling of backdrop, NOT a descendant of aria-hidden */}
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
          <div
            ref={dialogRef}
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-xs text-gray-400 font-medium mb-0.5">{item.group}</p>
                <h2
                  id="history-modal-title"
                  className="text-base font-semibold text-gray-900 leading-snug"
                >
                  {item.title}
                </h2>
                {item.code && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{item.code}</p>
                )}
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

              {statusLabel && (
                <DetailRow label="Trạng thái">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                </DetailRow>
              )}

              <DetailRow label="Vai trò">
                <div
                  className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                    item.role === 'creator'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {item.role === 'creator' ? (
                    <>
                      <User className="w-3 h-3" /> Người tạo
                    </>
                  ) : (
                    <>
                      <Users className="w-3 h-3" /> Liên quan
                    </>
                  )}
                </div>
              </DetailRow>

              <DetailRow label="Loại">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-700">{item.entityType}</span>
                </div>
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
              {(item.routeHint || MODAL_ENTITY_TYPES.has(item.entityType) || getEntityDetailEndpoint(item.entityType)) && (
                <button
                  type="button"
                  onClick={handleOpenOriginal}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <ExternalLink className="w-4 h-4" />
                  {openButtonLabel}
                </button>
              )}
            </div>
          </div>
          </div>
        </>
      )}

      {/* Child modals — opened on "Xem trong danh sách" for modal-only entity types */}
      <TaskListModal
        isOpen={openModal?.type === 'task'}
        onClose={handleChildModalClose}
        isAdmin={userIsAdmin}
      />

      <WorkPlanListModal
        isOpen={openModal?.type === 'work-plan'}
        onClose={handleChildModalClose}
        isAdmin={userIsAdmin}
      />

      <DailyWorkReportListModal
        isOpen={openModal?.type === 'daily-work-report'}
        onClose={handleChildModalClose}
        isAdmin={userIsAdmin}
      />

      <OvertimePlanListModal
        isOpen={openModal?.type === 'overtime-plan'}
        onClose={handleChildModalClose}
        isAdmin={userIsAdmin}
        canViewAll={userIsAdmin}
        canCreate={userIsAdmin || isDepartmentHead}
        highlightPlanId={openModal?.type === 'overtime-plan' ? openModal.entityId : undefined}
      />

      <LeaveRequestApprovalModal
        isOpen={openModal?.type === 'leave-request'}
        onClose={handleChildModalClose}
        leaveRequestId={openModal?.type === 'leave-request' ? openModal.entityId : ''}
      />

      <AcceptanceHandoverViewModal
        isOpen={openModal?.type === 'acceptance-handover'}
        onClose={handleChildModalClose}
        acceptanceHandoverId={openModal?.type === 'acceptance-handover' ? openModal.entityId : ''}
      />

      <FeedbackListModal
        isOpen={openModal?.type === 'private-feedback'}
        onClose={handleChildModalClose}
      />

      <HistoryEntityDetailModal
        isOpen={openEntityDetail !== null}
        onClose={() => setOpenEntityDetail(null)}
        entityType={openEntityDetail?.entityType ?? null}
        entityId={openEntityDetail?.entityId ?? null}
        routeHint={openEntityDetail?.routeHint ?? null}
        displayTitle={openEntityDetail?.displayTitle}
      />
    </>
  );
};

export default MyHistoryDetailModal;
