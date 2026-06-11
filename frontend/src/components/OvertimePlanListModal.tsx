import React, { useState } from 'react';
import { Clock, Calendar, FileText, Eye, Check, XCircle, Users, AlertCircle, Plus } from 'lucide-react';
import { OvertimePlan, OvertimePlanStatus } from '../services/overtimePlanService';
import { useOvertimePlans, useMyOvertimePlans, useApprovePlan } from '../hooks/useOvertimePlans';
import { ModalForm } from './ModalForm';
import CreateOvertimePlanModal from './CreateOvertimePlanModal';
import { getFileUrl } from '../config/api';
interface OvertimePlanListModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  canViewAll?: boolean;
  canCreate?: boolean;
  embedded?: boolean;
  /** ID của plan cần highlight khi mở từ notification */
  highlightPlanId?: string;
}

const OvertimePlanListModal: React.FC<OvertimePlanListModalProps> = ({ isOpen, onClose, isAdmin = false, canViewAll = false, canCreate = false, embedded = false, highlightPlanId }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewPlan, setViewPlan] = useState<OvertimePlan | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const itemsPerPage = 10;

  // TanStack Query hooks
  const allPlansQuery = useOvertimePlans(
    { page: currentPage, limit: itemsPerPage },
    isOpen && (isAdmin || canViewAll)
  );
  const myPlansQuery = useMyOvertimePlans(
    { page: currentPage, limit: itemsPerPage },
    isOpen && !(isAdmin || canViewAll)
  );

  const activeQuery = (isAdmin || canViewAll) ? allPlansQuery : myPlansQuery;
  const plans: OvertimePlan[] = activeQuery.data?.data || [];
  const totalPages = activeQuery.data?.totalPages || 1;
  const totalItems = activeQuery.data?.total || activeQuery.data?.data?.length || 0;
  const loading = activeQuery.isLoading;

  const approvePlan = useApprovePlan();
  const actionLoading = approvePlan.isPending ? approvePlan.variables?.id ?? null : null;

  // Auto-open detail when highlightPlanId is provided from notification
  React.useEffect(() => {
    if (isOpen && highlightPlanId && plans.length > 0) {
      const target = plans.find(p => p.id === highlightPlanId);
      if (target) setViewPlan(target);
    }
  }, [isOpen, highlightPlanId, plans]);

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
      await approvePlan.mutateAsync({ id: planId, trangThai: OvertimePlanStatus.DA_DUYET });
    } catch (error) {
      console.error('Error approving plan:', error);
      alert('Có lỗi xảy ra khi duyệt kế hoạch');
    }
  };

  const handleReject = async (planId: string) => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await approvePlan.mutateAsync({ id: planId, trangThai: OvertimePlanStatus.TU_CHOI, lyDoTuChoi: rejectReason });
      setShowRejectModal(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting plan:', error);
      alert('Có lỗi xảy ra khi từ chối kế hoạch');
    }
  };

  if (!isOpen) return null;

  const tableContent = (
    <div className={embedded ? "p-4 overflow-x-auto max-h-[calc(90vh-220px)]" : "p-6 overflow-x-auto max-h-[calc(90vh-200px)]"}>
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Không có kế hoạch tăng ca nào</p>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Ngày tăng ca</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Người tạo</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Nội dung</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Giờ</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {plans.map((plan) => {
              const statusBadge = getStatusBadge(plan.trangThai);
              const priorityBadge = getPriorityBadge(plan.mucDoUuTien);
              const isPending = plan.trangThai === OvertimePlanStatus.CHO_DUYET;

              return (
                <tr key={plan.id} className={`hover:bg-gray-50 transition-colors ${highlightPlanId === plan.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(plan.ngayTangCa).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge.class}`}>
                        {priorityBadge.label}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {plan.nguoiTao?.lastName} {plan.nguoiTao?.firstName}
                    </div>
                    <div className="text-xs text-gray-500">{plan.nguoiTao?.employeeCode}</div>
                    <div className="text-xs text-gray-400">{plan.nguoiTao?.department}</div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 line-clamp-2 max-w-xs">{plan.noiDung}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{plan.nguoiThamGia?.length || 0} người</span>
                      {plan.files && plan.files.length > 0 && (
                        <span className="ml-2 flex items-center gap-1 text-xs text-blue-600">
                          <FileText className="w-3 h-3" /> {plan.files.length} file
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {plan.gioBatDau} - {plan.gioKetThuc}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.class}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setViewPlan(plan)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {isAdmin && isPending && (
                        <>
                          <button
                            onClick={() => handleApprove(plan.id)}
                            disabled={actionLoading === plan.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Duyệt"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowRejectModal(plan.id)}
                            disabled={actionLoading === plan.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Từ chối"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {!loading && totalItems > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-600">
            Tổng: <span className="font-medium">{totalItems}</span> kế hoạch
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Trước
            </button>
            <span className="px-3 py-1.5 text-sm text-gray-700">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const subModals = (
    <>
      {/* Detail Modal */}
      <ModalForm
        isOpen={!!viewPlan}
        onClose={() => setViewPlan(null)}
        title="Chi tiết kế hoạch tăng ca"
        footer={
          <div className="flex justify-end">
            <button onClick={() => setViewPlan(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Đóng
            </button>
          </div>
        }
      >
        {viewPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Ngày tăng ca</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {new Date(viewPlan.ngayTangCa).toLocaleDateString('vi-VN', { weekday: 'long' })}
                </p>
                <p className="text-sm text-gray-700">{new Date(viewPlan.ngayTangCa).toLocaleDateString('vi-VN')}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Giờ làm việc</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{viewPlan.gioBatDau} - {viewPlan.gioKetThuc}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Người tạo</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{viewPlan.nguoiTao?.lastName} {viewPlan.nguoiTao?.firstName}</p>
                <p className="text-xs text-gray-500">{viewPlan.nguoiTao?.department}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Trạng thái</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusBadge(viewPlan.trangThai).class}`}>
                  {getStatusBadge(viewPlan.trangThai).label}
                </span>
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
                  <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{person.lastName} {person.firstName}</p>
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
                    <a key={idx} href={getFileUrl(file)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                      <FileText className="w-4 h-4" />{file}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ModalForm>

      {/* Reject Reason Modal */}
      <ModalForm
        isOpen={!!showRejectModal}
        onClose={() => { setShowRejectModal(null); setRejectReason(''); }}
        title="Từ chối kế hoạch"
        titleIcon={<XCircle className="w-4 h-4 text-red-500" />}
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button onClick={() => showRejectModal && handleReject(showRejectModal)}
              disabled={actionLoading === showRejectModal}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              {actionLoading === showRejectModal ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">Vui lòng nhập lý do từ chối kế hoạch tăng ca này.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lý do từ chối</label>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              rows={3} autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
              placeholder="Nhập lý do từ chối..." />
          </div>
        </div>
      </ModalForm>

      <CreateOvertimePlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => activeQuery.refetch()}
      />
    </>
  );

  if (embedded) {
    return (
      <>
        {canCreate && (
          <div className="px-4 pt-3 flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo kế hoạch
            </button>
          </div>
        )}
        {tableContent}
        {subModals}
      </>
    );
  }

  return (
    <>
      <ModalForm
        isOpen={isOpen}
        onClose={onClose}
        title={`Kế hoạch tăng ca${(isAdmin || canViewAll) ? ' (Quản lý)' : ''}`}
        titleIcon={<Clock className="w-4 h-4" />}
        maxWidth="5xl"
        footer={canCreate ? (
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tạo kế hoạch
            </button>
          </div>
        ) : undefined}
      >
        {tableContent}
      </ModalForm>

      {subModals}
    </>
  );
};

export default OvertimePlanListModal;

