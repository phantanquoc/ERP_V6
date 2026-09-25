import React, { useId } from 'react';
import { X, Package, Calendar, MapPin, FileText, Info, ClipboardCheck, Pencil, XCircle } from 'lucide-react';
import Modal from '../Modal';
import PlanLogHistory from './PlanLogHistory';
import { OutboundPlan } from '../../services/outboundPlanService';
import { resolvePlanBadge } from '../../utils/warehousePlanBadges';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  plan: OutboundPlan | null;
  onCreateIssue?: (plan: OutboundPlan) => void;
  onEdit?: (plan: OutboundPlan) => void;
  onCancel?: (plan: OutboundPlan) => void;
}

function statusBadge(plan: OutboundPlan) {
  const { label, className } = resolvePlanBadge({
    trangThai: plan.trangThai,
    ngayDuKien: plan.ngayDuKien,
    pendingStatus: 'Chờ xuất',
    doneStatus: 'Đã xuất',
  });
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

const OutboundPlanDetailModal: React.FC<Props> = ({ isOpen, onClose, plan, onCreateIssue, onEdit, onCancel }) => {
  const titleId = useId();
  if (!plan) return null;

  const sr = plan.supplyRequest;
  const items = sr?.items ?? [];
  const warehouseLabel = plan.warehouse?.tenKho || '—';
  const warehouseCode = plan.warehouse?.maKho ? ` (${plan.warehouse.maKho})` : '';
  const isTerminal = ['Đã xuất', 'Đã hủy'].includes(plan.trangThai);

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop closeOnBackdrop ariaLabelledby={titleId} className="p-0 sm:p-4">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-2 sm:mx-4 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <div className="flex flex-col flex-1 min-h-0 p-4 sm:p-6">
        <div className="flex items-center justify-between shrink-0 mb-4 gap-3">
          <div className="flex items-center gap-2">
            <h3 id={titleId} className="text-sm font-semibold text-gray-900">
              {plan.maKeHoach}
            </h3>
            {statusBadge(plan)}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết kế hoạch xuất kho"
            className="inline-flex h-8 w-8 items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto flex-1 min-h-0 pr-1">
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <FileText className="h-3.5 w-3.5" /> Yêu cầu cấp bù (YCCB)
            </h4>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>
                  <span className="text-gray-500">Mã yêu cầu:</span>{' '}
                  <span className="font-mono font-medium text-gray-800">{sr?.maYeuCau || '—'}</span>
                </span>
                <span>
                  <span className="text-gray-500">Người yêu cầu:</span>{' '}
                  <span className="font-medium text-gray-800">{sr?.tenNhanVien || '—'}</span>
                </span>
                <span>
                  <span className="text-gray-500">Bộ phận:</span>{' '}
                  <span className="font-medium text-gray-800">{sr?.boPhan || '—'}</span>
                </span>
                <span>
                  <span className="text-gray-500">Trạng thái YCCB:</span>{' '}
                  <span className="font-medium text-gray-800">{sr?.trangThai || '—'}</span>
                </span>
              </div>
            </div>
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <Package className="h-3.5 w-3.5" /> Hàng hóa ({items.length})
            </h4>
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed py-6 text-center text-sm text-gray-400">Không có hàng hóa</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500">
                      <th className="px-3 py-2 text-left font-medium">Tên hàng hóa</th>
                      <th className="px-3 py-2 text-right font-medium">Số lượng</th>
                      <th className="px-3 py-2 text-left font-medium">Đơn vị</th>
                      <th className="px-3 py-2 text-left font-medium">Phân loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={it.id ?? idx} className="border-t">
                        <td className="px-3 py-2 text-xs">{it.tenGoi}</td>
                        <td className="px-3 py-2 text-right text-xs font-medium">{it.soLuong}</td>
                        <td className="px-3 py-2 text-xs">{it.donViTinh}</td>
                        <td className="px-3 py-2 text-xs">{it.phanLoai || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <MapPin className="h-3.5 w-3.5" /> Kho &amp; ngày hẹn
            </h4>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
              <div>
                <div className="text-xs text-gray-500">Kho</div>
                <div className="text-xs font-medium text-gray-800">
                  {warehouseLabel}
                  {warehouseCode}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Ngày dự kiến
                </div>
                <div className="text-xs font-medium text-gray-800">
                  {plan.ngayDuKien ? new Date(plan.ngayDuKien).toLocaleDateString('vi-VN') : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Trạng thái</div>
                <div className="mt-0.5">{statusBadge(plan)}</div>
              </div>
              {plan.lyDoChenhLech && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Lý do chênh lệch</div>
                  <div className="text-xs text-gray-700">{plan.lyDoChenhLech}</div>
                </div>
              )}
              {plan.ghiChu && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500">Ghi chú</div>
                  <div className="text-xs text-gray-700">{plan.ghiChu}</div>
                </div>
              )}
            </div>
          </section>

          {plan.logs && plan.logs.length > 0 ? (
            <section>
              <PlanLogHistory logs={plan.logs} limit={plan.logs.length} />
            </section>
          ) : (
            <div className="flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2.5 text-xs text-gray-400">
              <Info className="h-3.5 w-3.5" /> Chưa có lịch sử thay đổi
            </div>
          )}
        </div>

          <div className="flex flex-wrap justify-end gap-3 mt-4 pt-4 border-t border-gray-100 bg-white shrink-0">
            {!isTerminal && onCreateIssue && (
              <button type="button" onClick={() => onCreateIssue(plan)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
                <ClipboardCheck className="w-4 h-4" /> Xuất kho
              </button>
            )}
            {!isTerminal && onEdit && (
              <button type="button" onClick={() => onEdit(plan)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-md text-sm hover:bg-amber-600">
                <Pencil className="w-4 h-4" /> Sửa ngày hẹn
              </button>
            )}
            {!isTerminal && onCancel && (
              <button type="button" onClick={() => onCancel(plan)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
                <XCircle className="w-4 h-4" /> Hủy kế hoạch
              </button>
            )}
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-sm text-gray-700 hover:bg-gray-50">Đóng</button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OutboundPlanDetailModal;
