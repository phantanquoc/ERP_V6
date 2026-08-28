import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Clock, Calendar, FileText, Check, XCircle, Users, AlertCircle, Plus,
  Trash2, FileImage, FileSpreadsheet, FileCode,
} from 'lucide-react';
import { OvertimePlan, OvertimePlanStatus } from '../services/overtimePlanService';
import { useOvertimePlans, useMyOvertimePlans, useApprovePlan, useDeleteOvertimePlan } from '../hooks/useOvertimePlans';
import { ModalForm } from './ModalForm';
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
  /** ID của plan cần highlight khi mở từ notification */
  highlightPlanId?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * A plan may only be edited while pending or approved. Terminal statuses
 * (TU_CHOI, HOAN_THANH, HUY) are closed — the backend rejects such edits
 * because they would silently rewrite payroll for a closed period.
 */
function isEditableStatus(trangThai: OvertimePlanStatus): boolean {
  return trangThai === OvertimePlanStatus.CHO_DUYET || trangThai === OvertimePlanStatus.DA_DUYET;
}

/** Format "DD/MM" from an ISO date string or Date-like value */
function fmtDMY(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/** Render "Ngày tăng ca" cell value from items array */
function renderDateRange(plan: OvertimePlan): string {
  const items = plan.items ?? [];
  if (items.length === 0) return '—';
  if (items.length === 1) return `1 ngày ${fmtDMY(items[0].ngayTangCa)}`;
  const sorted = [...items].sort((a, b) => a.ngayTangCa.localeCompare(b.ngayTangCa));
  return `${items.length} ngày (${fmtDMY(sorted[0].ngayTangCa)} – ${fmtDMY(sorted[sorted.length - 1].ngayTangCa)})`;
}

/** Count total unique participants across all items */
function countParticipants(plan: OvertimePlan): number {
  const ids = new Set<string>();
  (plan.items ?? []).forEach(item => item.nguoiThamGiaIds.forEach(id => ids.add(id)));
  return ids.size;
}

/** Compute hours between "HH:mm" strings (positive, capped at 24) */
function computeHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, diff) / 60;
}

// ── file preview helpers ──────────────────────────────────────────────────────

type FileIconType = 'image' | 'spreadsheet' | 'code' | 'text';

function getFileType(filename: string): FileIconType {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (/^(jpg|jpeg|png|gif|webp)$/.test(ext)) return 'image';
  if (/^(xlsx|xls|csv)$/.test(ext)) return 'spreadsheet';
  if (/^(doc|docx)$/.test(ext)) return 'code';
  return 'text';
}

/** Strip leading timestamp prefix like "1234567890-" from a filename */
function friendlyName(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  return base.replace(/^\d+-/, '');
}

function FileCardIcon({ type }: { type: FileIconType }) {
  switch (type) {
    case 'image': return <FileImage className="w-5 h-5 text-blue-500 flex-shrink-0" />;
    case 'spreadsheet': return <FileSpreadsheet className="w-5 h-5 text-green-600 flex-shrink-0" />;
    case 'code': return <FileCode className="w-5 h-5 text-indigo-500 flex-shrink-0" />;
    default: return <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />;
  }
}

function FileCard({ file }: { file: string }) {
  const url = getFileUrl(file);
  const type = getFileType(file);
  const name = friendlyName(file);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-blue-600 hover:text-blue-800"
    >
      {type === 'image' && (
        <img
          src={url}
          alt={name}
          className="w-20 h-20 object-cover rounded flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <FileCardIcon type={type} />
      <span className="break-all">{name}</span>
    </a>
  );
}

// ── main component ────────────────────────────────────────────────────────────

const OvertimePlanListModal: React.FC<OvertimePlanListModalProps> = ({
  isOpen, onClose, isAdmin = false, canViewAll = false, canCreate = false, embedded = false, highlightPlanId,
}) => {
  const { user } = useAuth();
  // Display-only gate for no-department users (change no-dept-self-service-access):
  // the backend already filters getAll/getById and denies CREATE/UPDATE/DELETE; this
  // merely hides the affordances so the UI stays consistent.
  const hasAnyDepartment =
    !!user?.department ||
    !!user?.departmentCode ||
    !!user?.departmentName ||
    (user?.secondaryDepartments?.length ?? 0) > 0;
  const isNoDepartment = !hasAnyDepartment;

  // No-department users never see create/approve/edit/delete regardless of canCreate/isAdmin
  const effectiveCanCreate = canCreate && !isNoDepartment;
  const effectiveIsAdmin = isAdmin && !isNoDepartment;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editPlan, setEditPlan] = useState<OvertimePlan | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewPlan, setViewPlan] = useState<OvertimePlan | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
  const deletePlan = useDeleteOvertimePlan();
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
      toast.success('Đã duyệt kế hoạch tăng ca');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi duyệt kế hoạch');
    }
  };

  const handleReject = async (planId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await approvePlan.mutateAsync({ id: planId, trangThai: OvertimePlanStatus.TU_CHOI, lyDoTuChoi: rejectReason });
      toast.success('Đã từ chối kế hoạch tăng ca');
      setShowRejectModal(null);
      setRejectReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi từ chối kế hoạch');
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deletePlan.mutateAsync(confirmDeleteId);
      toast.success('Đã xóa kế hoạch tăng ca');
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa kế hoạch');
    }
  };

  if (!isOpen) return null;

  const tableContent = (
    <>
      <div className={embedded ? "p-4 overflow-x-auto" : "p-6 overflow-x-auto max-h-[calc(90vh-200px)]"}>
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
                <tr
                  key={plan.id}
                  onClick={() => setViewPlan(plan)}
                  className={`hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${highlightPlanId === plan.id ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {renderDateRange(plan)}
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
                      <span className="text-xs text-gray-500">{countParticipants(plan)} người</span>
                      {plan.files && plan.files.length > 0 && (
                        <span className="ml-2 flex items-center gap-1 text-xs text-blue-600">
                          <FileText className="w-3 h-3" /> {plan.files.length} file
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.class}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {effectiveIsAdmin && isPending && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(plan.id); }}
                            disabled={actionLoading === plan.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Duyệt"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowRejectModal(plan.id); }}
                            disabled={actionLoading === plan.id}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Từ chối"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Admin can delete any plan regardless of status */}
                      {effectiveIsAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(plan.id); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      </div>

      {/* Pagination */}
      {!loading && plans.length > 0 && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Trước</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((page, idx, arr) => (
                  <React.Fragment key={page}>
                    {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                    <button onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-sm rounded-md ${page === currentPage ? 'bg-orange-500 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{page}</button>
                  </React.Fragment>
                ))}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">Sau</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const subModals = (
    <>
      {/* Detail Modal — Task 3.7: items sub-table */}
      <ModalForm
        isOpen={!!viewPlan}
        onClose={() => setViewPlan(null)}
        title="Chi tiết kế hoạch tăng ca"
        maxWidth="4xl"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setViewPlan(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Đóng
            </button>
            {effectiveIsAdmin && viewPlan && isEditableStatus(viewPlan.trangThai) && (
              <button
                onClick={() => { setViewPlan(null); setEditPlan(viewPlan); setShowCreateModal(true); }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Chỉnh sửa
              </button>
            )}
          </div>
        }
      >
        {viewPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            {/* Items sub-table sorted by ngayTangCa ASC (ordered from backend) */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                Chi tiết ngày tăng ca ({viewPlan.items?.length ?? 0} dòng)
              </p>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Ngày</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Ca</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Nhân sự</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Giờ bắt đầu</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Giờ kết thúc</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tổng giờ</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(viewPlan.items ?? []).map((item) => {
                      const hours = computeHours(item.gioBatDau, item.gioKetThuc);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                            {new Date(item.ngayTangCa).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                            {item.workShiftName ?? <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            <div className="space-y-0.5">
                              {item.nguoiThamGia?.length > 0
                                ? item.nguoiThamGia.map((p, idx) => (
                                    <p key={idx} className="text-xs text-gray-700">
                                      {p.lastName} {p.firstName}
                                      <span className="text-gray-400 ml-1">({p.employeeCode})</span>
                                    </p>
                                  ))
                                : <span className="text-xs text-gray-400">—</span>
                              }
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">{item.gioBatDau}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">{item.gioKetThuc}</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-medium">
                            {hours.toFixed(1)}h
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Task 3.8: File preview cards */}
            {viewPlan.files && viewPlan.files.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">File đính kèm</p>
                <div className="space-y-2">
                  {viewPlan.files.map((file, idx) => (
                    <FileCard key={idx} file={file} />
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

      {/* Confirm Delete Modal */}
      <ModalForm
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Xác nhận xóa kế hoạch"
        titleIcon={<Trash2 className="w-4 h-4 text-red-500" />}
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setConfirmDeleteId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Hủy
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deletePlan.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deletePlan.isPending ? 'Đang xóa...' : 'Xóa kế hoạch'}
            </button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-1">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">Bạn có chắc muốn xóa kế hoạch tăng ca này? Hành động này không thể hoàn tác.</p>
        </div>
      </ModalForm>

      {/* Create / Edit Modal */}
      <CreateOvertimePlanModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditPlan(null); }}
        onSuccess={() => { activeQuery.refetch(); setEditPlan(null); }}
        initialData={editPlan}
      />
    </>
  );

  if (embedded) {
    return (
      <>
        {effectiveCanCreate && (
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
        title={`Kế hoạch tăng ca${!isNoDepartment && (isAdmin || canViewAll) ? ' (Quản lý)' : ''}`}
        titleIcon={<Clock className="w-4 h-4" />}
        maxWidth="5xl"
        footer={effectiveCanCreate ? (
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
