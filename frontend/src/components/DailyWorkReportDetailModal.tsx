import React, { useEffect, useState } from 'react';
import { X, FileText, Calendar, User, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import Modal from './Modal';
import dailyWorkReportService, { DailyWorkReport } from '../services/dailyWorkReportService';

interface DailyWorkReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Bản nháp',
  SUBMITTED: 'Đã gửi',
  REVIEWED:  'Đã xem',
  APPROVED:  'Đã phê duyệt',
  REJECTED:  'Từ chối',
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT:     'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  REVIEWED:  'bg-yellow-100 text-yellow-700',
  APPROVED:  'bg-green-100 text-green-700',
  REJECTED:  'bg-red-100 text-red-700',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  SUBMITTED: <FileText className="w-3.5 h-3.5" />,
  REVIEWED:  <Eye className="w-3.5 h-3.5" />,
  APPROVED:  <CheckCircle className="w-3.5 h-3.5" />,
  REJECTED:  <XCircle className="w-3.5 h-3.5" />,
};

const DailyWorkReportDetailModal: React.FC<DailyWorkReportDetailModalProps> = ({
  isOpen,
  onClose,
  reportId,
}) => {
  const [report, setReport] = useState<DailyWorkReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !reportId) return;
    setLoading(true);
    dailyWorkReportService.getReportById(reportId)
      .then((res: any) => setReport(res?.data ?? res ?? null))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [isOpen, reportId]);

  const fmt = (date?: string) =>
    date ? new Date(date).toLocaleDateString('vi-VN') : '—';

  const employeeName = report?.employee
    ? `${report.employee.user?.firstName ?? ''} ${report.employee.user?.lastName ?? ''}`.trim()
    : '—';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-4 rounded-t-2xl flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Báo cáo công việc</h2>
              {report && (
                <p className="text-cyan-100 text-xs">
                  {fmt(report.reportDate)} — {employeeName}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-cyan-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
            </div>
          )}

          {!loading && !report && (
            <p className="text-center text-gray-500 py-12">Không tìm thấy báo cáo</p>
          )}

          {!loading && report && (
            <div className="space-y-4">
              {/* Trạng thái */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[report.status] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_ICON[report.status]}
                  {STATUS_LABEL[report.status] ?? report.status}
                </span>
              </div>

              {/* Thông tin chính */}
              <div className="grid grid-cols-2 gap-3">
                <InfoRow icon={<User className="w-4 h-4 text-gray-400" />} label="Nhân viên" value={employeeName} />
                <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Ngày báo cáo" value={fmt(report.reportDate)} />
                {report.workHours !== undefined && report.workHours !== null && (
                  <InfoRow icon={<Clock className="w-4 h-4 text-gray-400" />} label="Số giờ làm" value={`${report.workHours} giờ`} />
                )}
              </div>

              {/* Công việc đã làm */}
              <Section title="Công việc đã thực hiện" content={report.workDescription} color="blue" />

              {/* Thành tựu */}
              {report.achievements && (
                <Section title="Thành tựu / Kết quả" content={report.achievements} color="green" />
              )}

              {/* Khó khăn */}
              {report.challenges && (
                <Section title="Khó khăn / Vấn đề" content={report.challenges} color="orange" />
              )}

              {/* Kế hoạch ngày mai */}
              {report.planForNextDay && (
                <Section title="Kế hoạch ngày hôm sau" content={report.planForNextDay} color="purple" />
              )}

              {/* Nhận xét cấp trên */}
              {report.supervisorComment && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">Nhận xét cấp trên</p>
                  <p className="text-sm text-gray-700">{report.supervisorComment}</p>
                  {report.reviewedAt && (
                    <p className="text-xs text-gray-400 mt-1">Ngày xem: {fmt(report.reviewedAt)}</p>
                  )}
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

const colorMap: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700',
  green:  'bg-green-50 text-green-700',
  orange: 'bg-orange-50 text-orange-700',
  purple: 'bg-purple-50 text-purple-700',
};

const Section: React.FC<{ title: string; content: string; color: string }> = ({ title, content, color }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <p className={`text-xs font-semibold mb-1 ${colorMap[color]?.split(' ')[1] ?? 'text-gray-500'}`}>{title}</p>
    <p className="text-sm text-gray-700 whitespace-pre-line">{content}</p>
  </div>
);

export default DailyWorkReportDetailModal;
