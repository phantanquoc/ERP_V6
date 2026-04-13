import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar, FileText, Eye, Check, XCircle, Users, AlertCircle, Download, Plus } from 'lucide-react';
import { overtimePlanService, OvertimePlan, OvertimePlanStatus } from '../services/overtimePlanService';
import Modal from './Modal';
import CreateOvertimePlanModal from './CreateOvertimePlanModal';
import { getFileUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface OvertimePlanListModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  canViewAll?: boolean;
  canCreate?: boolean;
  embedded?: boolean;
}

const OvertimePlanListModal: React.FC<OvertimePlanListModalProps> = ({ isOpen, onClose, isAdmin = false, canViewAll = false, canCreate = false, embedded = false }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<OvertimePlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [viewPlan, setViewPlan] = useState<OvertimePlan | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    if (isOpen) loadPlans();
  }, [isOpen, currentPage]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: itemsPerPage };
      const response = (isAdmin || canViewAll)
        ? await overtimePlanService.getAll(params)
        : await overtimePlanService.getMyPlans(params);
      setPlans(response.data || []);
      setTotalPages(response.totalPages || 1);
      setTotalItems(response.total || response.data?.length || 0);
    } catch (error) {
      console.error('Error loading overtime plans:', error);
    } finally {
      setLoading(false);
    }
  };

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
      await loadPlans();
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
      await loadPlans();
    } catch (error) {
      console.error('Error rejecting plan:', error);
      alert('Có lỗi xảy ra khi từ chối kế hoạch');
    } finally {
      setActionLoading(null);
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
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
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
                      {plan.nguoiTao?.firstName} {plan.nguoiTao?.lastName}
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
                    <div key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
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

      <CreateOvertimePlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => loadPlans()}
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
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-orange-600">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock className="w-6 h-6" />
              Kế hoạch tăng ca
              {(isAdmin || canViewAll) && <span className="text-sm font-normal opacity-80">(Quản lý)</span>}
            </h2>
            <div className="flex items-center gap-3">
              {canCreate && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Tạo kế hoạch
                </button>
              )}
              <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {tableContent}
        </div>
      </Modal>

      {subModals}
    </>
  );
};

export default OvertimePlanListModal;

