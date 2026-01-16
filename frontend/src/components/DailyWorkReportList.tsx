import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
} from 'lucide-react';
import dailyWorkReportService, { DailyWorkReport } from '../services/dailyWorkReportService';
import DailyWorkReportModal from './DailyWorkReportModal';

const DailyWorkReportList: React.FC = () => {
  const [reports, setReports] = useState<DailyWorkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyWorkReport | null>(null);
  const [viewReport, setViewReport] = useState<DailyWorkReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [page]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await dailyWorkReportService.getMyReports(page, 10);
      setReports(response.data);
      setTotalPages(response.pagination.totalPages);
    } catch (error: any) {
      console.error('Error loading reports:', error);
      setError(error.message || 'Không thể tải danh sách báo cáo');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedReport(null);
    setIsModalOpen(true);
  };

  const handleEdit = (report: DailyWorkReport) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
      return;
    }

    try {
      await dailyWorkReportService.deleteReport(id);
      loadReports();
    } catch (error: any) {
      alert(error.message || 'Không thể xóa báo cáo');
    }
  };

  const handleView = (report: DailyWorkReport) => {
    setViewReport(report);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: <Edit className="w-3 h-3" />, text: 'Bản nháp' },
      SUBMITTED: { color: 'bg-blue-100 text-blue-800', icon: <Send className="w-3 h-3" />, text: 'Đã gửi' },
      REVIEWED: { color: 'bg-yellow-100 text-yellow-800', icon: <Eye className="w-3 h-3" />, text: 'Đã xem' },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" />, text: 'Đã duyệt' },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" />, text: 'Từ chối' },
    };

    const config = statusConfig[status] || statusConfig.SUBMITTED;

    return (
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        <span>{config.text}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Báo cáo công việc hàng ngày</h2>
                <p className="text-sm text-gray-600">Quản lý và theo dõi báo cáo công việc của bạn</p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Tạo báo cáo mới</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Reports List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600 font-medium">Đang tải báo cáo...</p>
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có báo cáo nào</h3>
              <p className="text-gray-600 mb-6">Bắt đầu tạo báo cáo công việc hàng ngày của bạn</p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Tạo báo cáo đầu tiên</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-lg font-semibold text-gray-900">
                      {new Date(report.reportDate).toLocaleDateString('vi-VN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    {getStatusBadge(report.status)}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{report.workHours || 0} giờ làm việc</span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">{report.workDescription}</p>
                  </div>

                  {/* Supervisor Comment */}
                  {report.supervisorComment && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-1">Nhận xét của quản lý:</p>
                      <p className="text-sm text-blue-800">{report.supervisorComment}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 mt-4">
                    <button
                      onClick={() => handleView(report)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Xem</span>
                    </button>
                    {(report.status === 'DRAFT' || report.status === 'SUBMITTED') && (
                      <>
                        <button
                          onClick={() => handleEdit(report)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleDelete(report.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Xóa</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <span className="text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      )}

      {/* View Report Modal */}
      {viewReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Chi tiết báo cáo</h3>
                <button
                  onClick={() => setViewReport(null)}
                  className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày báo cáo</label>
                  <p className="text-gray-900">
                    {new Date(viewReport.reportDate).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số giờ làm việc</label>
                  <p className="text-gray-900">{viewReport.workHours || 0} giờ</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <div>{getStatusBadge(viewReport.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả công việc</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewReport.workDescription}</p>
                </div>
                {viewReport.achievements && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thành tựu</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{viewReport.achievements}</p>
                  </div>
                )}
                {viewReport.challenges && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Khó khăn</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{viewReport.challenges}</p>
                  </div>
                )}
                {viewReport.planForNextDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kế hoạch ngày mai</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{viewReport.planForNextDay}</p>
                  </div>
                )}
                {viewReport.supervisorComment && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium text-blue-900 mb-1">Nhận xét của quản lý</label>
                    <p className="text-blue-800 whitespace-pre-wrap">{viewReport.supervisorComment}</p>
                    {viewReport.reviewedAt && (
                      <p className="text-xs text-blue-600 mt-2">
                        Đã xem lúc: {new Date(viewReport.reviewedAt).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Modal */}
        <DailyWorkReportModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          report={selectedReport}
          onSuccess={loadReports}
        />
      </div>
    </div>
  );
};

export default DailyWorkReportList;

