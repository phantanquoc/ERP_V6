import React from 'react';
import { Clock, FileText, FileImage, FileSpreadsheet, FileCode } from 'lucide-react';
import { OvertimePlanStatus } from '../services/overtimePlanService';
import { useOvertimePlanDetail } from '../hooks/useOvertimePlans';
import { ModalForm } from './ModalForm';
import { getFileUrl } from '../config/api';

interface OvertimePlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** ID của plan cần xem chi tiết — fetch trực tiếp theo ID, không phụ thuộc list/pagination */
  planId: string | null | undefined;
}

// ── helpers ──────────────────────────────────────────────────────────────────
// Duplicated from OvertimePlanListModal.tsx on purpose — keeps this detail-only
// modal self-contained so notification click flows never depend on list/pagination
// state or canViewAll/isAdmin flags. See plan for OvertimePlanDetailModal.

/** Compute hours between "HH:mm" strings (positive, capped at 24) */
function computeHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, diff) / 60;
}

function getStatusBadge(status: OvertimePlanStatus) {
  const badges: Record<string, { label: string; class: string }> = {
    [OvertimePlanStatus.CHO_DUYET]: { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-700' },
    [OvertimePlanStatus.DA_DUYET]: { label: 'Đã duyệt', class: 'bg-blue-100 text-blue-700' },
    [OvertimePlanStatus.TU_CHOI]: { label: 'Từ chối', class: 'bg-red-100 text-red-700' },
    [OvertimePlanStatus.HOAN_THANH]: { label: 'Hoàn thành', class: 'bg-green-100 text-green-700' },
    [OvertimePlanStatus.HUY]: { label: 'Hủy', class: 'bg-gray-100 text-gray-700' },
  };
  return badges[status] || badges[OvertimePlanStatus.CHO_DUYET];
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

/**
 * Detail-only modal for a single overtime plan, fetched directly by ID.
 * Used by notification click flows (NotificationBell, MyNotificationsDetailModal)
 * so DEPARTMENT_HEAD (and other non-admin) users can view department-wide-broadcast
 * plans that would otherwise be absent from the "my plans" list query.
 *
 * Read-only: no Approve/Reject/Edit/Delete actions — those remain in
 * OvertimePlanListModal's row actions.
 */
const OvertimePlanDetailModal: React.FC<OvertimePlanDetailModalProps> = ({ isOpen, onClose, planId }) => {
  const { data: plan, isLoading, isError } = useOvertimePlanDetail(planId, isOpen);

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết kế hoạch tăng ca"
      maxWidth="4xl"
      footer={
        <div className="flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Đóng
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : !plan || isError ? (
        <div className="text-center py-12">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Không tìm thấy kế hoạch tăng ca</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Người tạo</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{plan.nguoiTao?.lastName} {plan.nguoiTao?.firstName}</p>
              <p className="text-xs text-gray-500">{plan.nguoiTao?.department}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Trạng thái</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusBadge(plan.trangThai).class}`}>
                {getStatusBadge(plan.trangThai).label}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Nội dung công việc</p>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{plan.noiDung}</p>
          </div>
          {plan.ghiChu && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Ghi chú</p>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{plan.ghiChu}</p>
            </div>
          )}
          {/* Items sub-table sorted by ngayTangCa ASC (ordered from backend) */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              Chi tiết ngày tăng ca ({plan.items?.length ?? 0} dòng)
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
                  {(plan.items ?? []).map((item) => {
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
          {/* File preview cards */}
          {plan.files && plan.files.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">File đính kèm</p>
              <div className="space-y-2">
                {plan.files.map((file, idx) => (
                  <FileCard key={idx} file={file} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ModalForm>
  );
};

export default OvertimePlanDetailModal;
