import React, { useState, useEffect, useCallback } from 'react';
import { X, Clock, Calendar, FileText, Eye, Check, XCircle, Users, AlertCircle, Download, CheckCircle, Info, Plus, Pencil } from 'lucide-react';
import { overtimePlanService, OvertimePlan, OvertimePlanStatus } from '../services/overtimePlanService';
import Modal from './Modal';
import { getFileUrl } from '../config/api';
import CreateOvertimePlanModal from './CreateOvertimePlanModal';
import { useAuth } from '../contexts/AuthContext';

interface OvertimePlanListModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  /** When set, the modal opens and immediately shows the detail view for this plan ID */
  initialPlanId?: string | null;
  /** Called after the initial plan ID has been consumed (plan fetched / detail opened) */
  onInitialPlanIdConsumed?: () => void;
  /** Called when user clicks "Tạo kế hoạch" — tells parent to switch to overtime tab if needed (for PlanCombinedModal) */
  onSwitchToTab?: () => void;
  /** When true, renders table content directly without the outer Modal/Portal wrapper (used inside PlanCombinedModal) */
  embedded?: boolean;
}

/** Custom window event fired whenever an overtime plan is created/updated/approved.
 *  Both the creator's modal and admin's modal listen to this to refresh immediately,
 *  independent of WebSocket connectivity.
 */
const OVERTIME_CHANGED_EVENT = 'overtimePlanChanged';
export function dispatchOvertimeChanged() {
  window.dispatchEvent(new CustomEvent(OVERTIME_CHANGED_EVENT));
}

const OvertimePlanListModal: React.FC<OvertimePlanListModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
  initialPlanId,
  onInitialPlanIdConsumed,
  onSwitchToTab,
  embedded = false,
}) => {
  const { subscribeToNotifications, user } = useAuth();
  const userIsAdmin = user?.role === 'ADMIN';
  const isManager = ['ADMIN', 'DEPARTMENT_HEAD', 'TEAM_LEAD'].includes((user?.role as string) ?? '');
  const [plans, setPlans] = useState<OvertimePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewPlan, setViewPlan] = useState<OvertimePlan | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState<OvertimePlan | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<OvertimePlan | null>(null);
  // Incrementing this forces the fetch effect to re-run immediately
  const [refreshKey, setRefreshKey] = useState(0);
  const itemsPerPage = 10;

  /** Reset to page 1 and trigger an immediate re-fetch */
  const refresh = useCallback(() => {
    setCurrentPage(1);
    setRefreshKey(k => k + 1);
  }, []);

  // ── Primary fetch effect — runs on open, page change, or forced refresh ──
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        const params = { page: currentPage, limit: itemsPerPage };
        const response = isAdmin
          ? await overtimePlanService.getAll(params)
          : await overtimePlanService.getMyPlans(params);
        if (!cancelled) {
          setPlans(response.data || []);
          setTotalPages(response.totalPages || 1);
          setTotalItems(response.total || response.data?.length || 0);
        }
      } catch (error) {
        console.error('Error loading overtime plans:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [isOpen, currentPage, refreshKey, isAdmin]);

  // ── Open detail view when launched from a notification click ──
  // When initialPlanId is provided (from clicking a notification), fetch that plan
  // and open the detail view immediately instead of showing the list first.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const openDetail = async () => {
      try {
        const plan = await overtimePlanService.getById(initialPlanId);
        if (!cancelled) {
          setViewPlan(plan);
          onInitialPlanIdConsumed?.();
        }
      } catch (error) {
        console.error('Error loading plan from notification:', error);
        if (!cancelled) {
          // Even if fetch fails, tell parent the ID was consumed so we don't retry
          onInitialPlanIdConsumed?.();
        }
      }
    };

    if (initialPlanId) {
      openDetail();
    }
    return () => { cancelled = true; };
  }, [isOpen, initialPlanId, onInitialPlanIdConsumed]);

  // ── Reset viewPlan when modal closes so detail doesn't persist on next open ──
  useEffect(() => {
    if (!isOpen) setViewPlan(null);
  }, [isOpen]);

  // ── Real-time via WebSocket (when WS is connected) ──
  // Use direct setState instead of refresh() to avoid stale closure issues.
  useEffect(() => {
    if (!isOpen) return;
    return subscribeToNotifications((notification) => {
      if (
        notification.type === 'OVERTIME_PLAN' ||
        notification.type === 'OVERTIME_PLAN_APPROVAL'
      ) {
        setCurrentPage(1);
        setRefreshKey(k => k + 1);
      }
    });
  }, [isOpen, subscribeToNotifications]);

  // ── Real-time via window event (works even when WS is down / admin has no employee) ──
  // ⚠️ Call setRefreshKey directly instead of through refresh() to avoid stale closure.
  // The refresh() function is created via useCallback and captures setRefreshKey at render time —
  // if the component re-renders (e.g. isCreateOpen state change after create) between
  // dispatchOvertimeChanged() and the event firing, the old refresh closure is stale and
  // the increment never propagates to the fetch effect.
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => {
      setCurrentPage(1);
      setRefreshKey(k => k + 1);
    };
    window.addEventListener(OVERTIME_CHANGED_EVENT, handler);
    window.addEventListener('OVERTIME_PLAN_CHANGED', handler);
    return () => {
      window.removeEventListener(OVERTIME_CHANGED_EVENT, handler);
      window.removeEventListener('OVERTIME_PLAN_CHANGED', handler);
    };
  }, [isOpen]);

  const getStatusBadge = (status: OvertimePlanStatus) => {
    const badges: Record<string, { label: string; class: string }> = {
      [OvertimePlanStatus.CHO_DUYET]: { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-700' },
      [OvertimePlanStatus.DA_DUYET]: { label: 'Đã duyệt', class: 'bg-blue-100 text-blue-700' },
      [OvertimePlanStatus.TU_CHOI]: { label: 'Từ chối', class: 'bg-red-100 text-red-700' },
      [OvertimePlanStatus.HOAN_THANH]: { label: 'Hoàn thành', class: 'bg-green-100 text-green-700' },
      [OvertimePlanStatus.HUY]: { label: 'Hủy', class: 'bg-gray-100 text-gray-700' },
    };
    return badges[status] || badges[OvertimePlanStatus.CHO_DUYET];
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      CAO: { label: 'Cao', class: 'bg-red-100 text-red-700' },
      TRUNG_BINH: { label: 'Trung bình', class: 'bg-yellow-100 text-yellow-700' },
      THAP: { label: 'Thấp', class: 'bg-gray-100 text-gray-700' },
      KHAN_CAP: { label: 'Khẩn cấp', class: 'bg-red-100 text-red-700' },
    };
    return badges[priority] || badges.TRUNG_BINH;
  };

  const handleApprove = async (planId: string) => {
    try {
      setActionLoading(planId);
      await overtimePlanService.approvePlan(planId, OvertimePlanStatus.DA_DUYET);
      setShowApproveModal(null);
      dispatchOvertimeChanged();
    } catch (error) {
      console.error('Error approving plan:', error);
      alert('Có lỗi xảy ra khi duyệt kế hoạch');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (planId: string) => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setActionLoading(planId);
      await overtimePlanService.approvePlan(planId, OvertimePlanStatus.TU_CHOI, rejectReason);
      setShowRejectModal(null);
      setRejectReason('');
      dispatchOvertimeChanged();
    } catch (error) {
      console.error('Error rejecting plan:', error);
      alert('Có lỗi xảy ra khi từ chối kế hoạch');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (planId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn thu hồi kế hoạch tăng ca này? Chấm công tự động đã tạo sẽ bị xóa.')) return;
    try {
      setActionLoading(planId);
      await overtimePlanService.revokePlan(planId);
      dispatchOvertimeChanged();
    } catch (error: any) {
      console.error('Error revoking plan:', error);
      alert(error?.response?.data?.message || 'Có lỗi xảy ra khi thu hồi kế hoạch');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const tableContent = (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-3" />
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Clock className="w-14 h-14 text-gray-200 mb-3" />
          <p className="text-gray-400 text-base font-medium">Chưa có kế hoạch tăng ca nào</p>
          <p className="text-gray-400 text-sm mt-1">Nhấn "Tạo kế hoạch" để bắt đầu</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">STT</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Ngày tăng ca</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Giờ</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Người tạo</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Nội dung</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Người TG</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Ưu tiên</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map((plan, index) => {
                const statusBadge = getStatusBadge(plan.trangThai);
                const priorityBadge = getPriorityBadge(plan.mucDoUuTien);
                const isPending = plan.trangThai === OvertimePlanStatus.CHO_DUYET;
                const isApproved = plan.trangThai === OvertimePlanStatus.DA_DUYET;
                const isCreator = plan.nguoiTaoId === user?._id;
                const canRevoke = !isApproved && (isManager || isCreator);

                return (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-500">{(currentPage - 1) * 10 + index + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                      {new Date(plan.ngayTangCa).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{plan.gioBatDau}–{plan.gioKetThuc}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-orange-600">
                            {plan.nguoiTao?.firstName?.[0]}{plan.nguoiTao?.lastName?.[0]}
                          </span>
                        </div>
                        <span className="text-gray-900 truncate max-w-[120px]">
                          {plan.nguoiTao?.firstName} {plan.nguoiTao?.lastName}
                          {isCreator && <span className="ml-1 text-xs text-orange-500">(bạn)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[200px] truncate" title={plan.noiDung}>{plan.noiDung}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{plan.nguoiThamGia?.length || 0}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.class}`}>
                        {priorityBadge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.class}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewPlan(plan)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isPending && isCreator && (
                          <button
                            onClick={() => { setEditPlan(plan); setIsCreateOpen(true); }}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {userIsAdmin && isPending && (
                          <>
                            <button
                              onClick={() => setShowApproveModal(plan)}
                              disabled={actionLoading === plan.id}
                              className="p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-40 rounded-lg transition-colors"
                              title="Duyệt"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowRejectModal(plan.id)}
                              disabled={actionLoading === plan.id}
                              className="p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-40 rounded-lg transition-colors"
                              title="Từ chối"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canRevoke && (
                          <button
                            onClick={() => handleRevoke(plan.id)}
                            disabled={actionLoading === plan.id}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 rounded-lg transition-colors"
                            title="Thu hồi"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalItems > 0 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Tổng <span className="font-semibold text-gray-700">{totalItems}</span> kế hoạch
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Trước
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-600 font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const header = (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-orange-400/30 bg-gradient-to-r from-orange-500 to-orange-600 flex-shrink-0">
      <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
        <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
        <span>Kế hoạch tăng ca</span>
        {isAdmin && <span className="text-xs sm:text-sm font-normal opacity-80">(Quản lý)</span>}
      </h2>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setEditPlan(null); onSwitchToTab?.(); setIsCreateOpen(true); }}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tạo kế hoạch</span>
          <span className="sm:hidden">Tạo</span>
        </button>
        {!embedded && (
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors p-1">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>
    </div>
  );

  // Sub-modals are rendered via Portal regardless of embedded mode
  const subModals = (
    <>
      {/* Detail Modal */}
      <Modal isOpen={!!viewPlan} onClose={() => setViewPlan(null)}>
        {viewPlan && (
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600">
              <h2 className="text-xl font-bold text-white">Chi tiết kế hoạch tăng ca</h2>
              <button onClick={() => setViewPlan(null)} className="text-white hover:text-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Ngày tăng ca</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {new Date(viewPlan.ngayTangCa).toLocaleDateString('vi-VN', { weekday: 'long' })}
                  </p>
                  <p className="text-sm text-gray-700">
                    {new Date(viewPlan.ngayTangCa).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Giờ làm việc</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {viewPlan.gioBatDau} - {viewPlan.gioKetThuc}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Người tạo</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {viewPlan.nguoiTao?.firstName} {viewPlan.nguoiTao?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{viewPlan.nguoiTao?.department}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Trạng thái</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusBadge(viewPlan.trangThai).class}`}>
                    {getStatusBadge(viewPlan.trangThai).label}
                  </span>
                  {viewPlan.trangThai === OvertimePlanStatus.DA_DUYET && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-2.5 py-1.5">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Chấm công tăng ca đã được tự động tạo cho {viewPlan.nguoiThamGia?.length || 0} người tham gia</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Nội dung công việc</p>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{viewPlan.noiDung}</p>
              </div>

              {viewPlan.ghiChu && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Ghi chú</p>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{viewPlan.ghiChu}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Người tham gia ({viewPlan.nguoiThamGia?.length || 0})</p>
                <div className="mt-2 space-y-2">
                  {viewPlan.nguoiThamGia?.map((person, idx) => (
                    <div key={idx} className="flex items-center bg-gray-50 px-3 py-2 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{person.firstName} {person.lastName}</p>
                        <p className="text-xs text-gray-500">{person.employeeCode} • {person.department}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {viewPlan.files && viewPlan.files.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">File đính kèm</p>
                  <div className="mt-2 space-y-1">
                    {viewPlan.files.map((file, idx) => (
                      <a
                        key={idx}
                        href={getFileUrl(file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {file}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setViewPlan(null)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Reason Modal */}
      <Modal isOpen={!!showRejectModal} onClose={() => { setShowRejectModal(null); setRejectReason(''); }}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-red-600">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <XCircle className="w-6 h-6" />
              Từ chối kế hoạch
            </h2>
            <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }} className="text-white hover:text-gray-200 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">Vui lòng nhập lý do từ chối kế hoạch tăng ca này.</p>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lý do từ chối</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm resize-none"
              placeholder="Nhập lý do từ chối..."
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={() => showRejectModal && handleReject(showRejectModal)}
              disabled={actionLoading === showRejectModal}
              className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium transition-colors"
            >
              {actionLoading === showRejectModal ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Approve Confirmation Modal */}
      <Modal isOpen={!!showApproveModal} onClose={() => setShowApproveModal(null)}>
        {showApproveModal && (
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-green-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Check className="w-6 h-6" />
                Xác nhận duyệt kế hoạch
              </h2>
              <button onClick={() => setShowApproveModal(null)} className="text-white hover:text-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Ngày tăng ca</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(showApproveModal.ngayTangCa).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Giờ làm việc</p>
                    <p className="text-sm font-semibold text-gray-900">{showApproveModal.gioBatDau} → {showApproveModal.gioKetThuc}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Người tham gia</p>
                    <p className="text-sm font-semibold text-gray-900">{showApproveModal.nguoiThamGia?.length || 0} nhân viên</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Tự động tạo chấm công</p>
                  <p>
                    Khi duyệt, hệ thống sẽ <strong>tự động tạo bản ghi chấm công tăng ca</strong> cho{' '}
                    <strong>{showApproveModal.nguoiThamGia?.length || 0} người tham gia</strong>.
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-blue-700 list-disc list-inside">
                    <li>Nếu chưa có chấm công ngày đó → tạo mới với trạng thái <strong>Tăng ca</strong></li>
                    <li>Nếu đã có chấm công → cập nhật giờ ra theo giờ kết thúc tăng ca</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowApproveModal(null)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleApprove(showApproveModal.id)}
                disabled={actionLoading === showApproveModal.id}
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {actionLoading === showApproveModal.id ? 'Đang xử lý...' : 'Xác nhận duyệt'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Overtime Plan Modal */}
      <CreateOvertimePlanModal
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setEditPlan(null); }}
        onSuccess={() => {
          setIsCreateOpen(false);
          setEditPlan(null);
          dispatchOvertimeChanged();
        }}
        planId={editPlan?.id}
        initialData={editPlan ? {
          nguoiThamGia: editPlan.nguoiThamGiaIds,
          nguoiThamGiaUserIds: editPlan.nguoiThamGiaIds,
          noiDung: editPlan.noiDung,
          ngayTangCa: editPlan.ngayTangCa,
          gioBatDau: editPlan.gioBatDau,
          gioKetThuc: editPlan.gioKetThuc,
          ghiChu: editPlan.ghiChu,
          mucDoUuTien: editPlan.mucDoUuTien,
        } : undefined}
      />
    </>
  );

  if (embedded) {
    return (
      <>
        <div className="flex flex-col h-full overflow-hidden">
          {header}
          {tableContent}
        </div>
        {subModals}
      </>
    );
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {header}
          {tableContent}
        </div>
      </Modal>
      {subModals}
    </>
  );
};

export default OvertimePlanListModal;

