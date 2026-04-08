import React, { useEffect, useState } from 'react';
import { X, ClipboardList, Calendar, User, FileText } from 'lucide-react';
import Modal from './Modal';
import workPlanService, { WorkPlan, WorkPlanStatus, WorkPlanPriority } from '../services/workPlanService';

interface WorkPlanDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  workPlanId: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  [WorkPlanStatus.CHUA_BAT_DAU]:   'Chưa bắt đầu',
  [WorkPlanStatus.DANG_THUC_HIEN]: 'Đang thực hiện',
  [WorkPlanStatus.HOAN_THANH]:     'Hoàn thành',
  [WorkPlanStatus.HUY]:            'Đã huỷ',
};

const STATUS_COLOR: Record<string, string> = {
  [WorkPlanStatus.CHUA_BAT_DAU]:   'bg-gray-100 text-gray-700',
  [WorkPlanStatus.DANG_THUC_HIEN]: 'bg-blue-100 text-blue-700',
  [WorkPlanStatus.HOAN_THANH]:     'bg-green-100 text-green-700',
  [WorkPlanStatus.HUY]:            'bg-red-100 text-red-700',
};

const PRIORITY_LABEL: Record<string, string> = {
  [WorkPlanPriority.KHAN_CAP]:   'Khẩn cấp',
  [WorkPlanPriority.CAO]:        'Cao',
  [WorkPlanPriority.TRUNG_BINH]: 'Trung bình',
  [WorkPlanPriority.THAP]:       'Thấp',
};

const PRIORITY_COLOR: Record<string, string> = {
  [WorkPlanPriority.KHAN_CAP]:   'bg-red-100 text-red-700',
  [WorkPlanPriority.CAO]:        'bg-orange-100 text-orange-700',
  [WorkPlanPriority.TRUNG_BINH]: 'bg-blue-100 text-blue-700',
  [WorkPlanPriority.THAP]:       'bg-gray-100 text-gray-700',
};

const WorkPlanDetailModal: React.FC<WorkPlanDetailModalProps> = ({ isOpen, onClose, workPlanId }) => {
  const [plan, setPlan] = useState<WorkPlan | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !workPlanId) return;
    setLoading(true);
    workPlanService.getWorkPlanById(workPlanId)
      .then((res: any) => setPlan(res?.data ?? res ?? null))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [isOpen, workPlanId]);

  const fmt = (date?: string) =>
    date ? new Date(date).toLocaleDateString('vi-VN') : '—';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 rounded-t-2xl flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">
                {plan ? plan.tieuDe : 'Kế hoạch công việc'}
              </h2>
              <p className="text-violet-100 text-xs">Chi tiết kế hoạch</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-violet-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            </div>
          )}

          {!loading && !plan && (
            <p className="text-center text-gray-500 py-12">Không tìm thấy kế hoạch công việc</p>
          )}

          {!loading && plan && (
            <div className="space-y-5">
              {/* Trạng thái & ưu tiên */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[plan.trangThai] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[plan.trangThai] ?? plan.trangThai}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLOR[plan.mucDoUuTien] ?? 'bg-gray-100 text-gray-700'}`}>
                  Ưu tiên: {PRIORITY_LABEL[plan.mucDoUuTien] ?? plan.mucDoUuTien}
                </span>
              </div>

              {/* Thông tin chính */}
              <div className="grid grid-cols-2 gap-4">
                <InfoRow
                  icon={<User className="w-4 h-4 text-gray-400" />}
                  label="Người tạo"
                  value={plan.nguoiTao ? `${plan.nguoiTao.firstName} ${plan.nguoiTao.lastName}` : '—'}
                />
                <InfoRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Ngày tạo"
                  value={fmt(plan.createdAt)}
                />
                <InfoRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Bắt đầu"
                  value={fmt(plan.ngayBatDau)}
                />
                <InfoRow
                  icon={<Calendar className="w-4 h-4 text-gray-400" />}
                  label="Kết thúc"
                  value={fmt(plan.ngayKetThuc)}
                />
              </div>

              {/* Nội dung */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">Nội dung kế hoạch</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{plan.noiDung}</p>
              </div>

              {/* Người thực hiện */}
              {plan.nguoiThucHien && plan.nguoiThucHien.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Người thực hiện ({plan.nguoiThucHien.length})
                  </p>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {plan.nguoiThucHien.map((emp: any) => (
                      <div key={emp.id} className="px-4 py-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {emp.firstName} {emp.lastName}
                        </span>
                        {emp.employeeCode && (
                          <span className="text-xs text-gray-400">({emp.employeeCode})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              {plan.ghiChu && (
                <div className="bg-yellow-50 rounded-lg p-4 text-sm text-gray-700">
                  <span className="font-medium text-yellow-700">Ghi chú: </span>{plan.ghiChu}
                </div>
              )}

              {/* Files */}
              {plan.files && plan.files.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">File đính kèm ({plan.files.length})</p>
                  <div className="space-y-1">
                    {plan.files.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-blue-600">
                        <FileText className="w-4 h-4" />
                        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                          File {i + 1}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  </div>
);

export default WorkPlanDetailModal;
