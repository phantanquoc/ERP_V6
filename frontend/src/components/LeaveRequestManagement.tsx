import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Calendar, Clock, FileText, User, AlertCircle, RefreshCw, Download } from 'lucide-react';
import leaveRequestService, { LeaveRequest } from '@services/leaveRequestService';
import { useAuth } from '@contexts/AuthContext';

const LeaveRequestManagement = () => {
  const { user } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    fetchLeaveRequests();
  }, [currentPage, statusFilter]);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await leaveRequestService.getAllLeaveRequests({
        page: currentPage,
        limit: 10,
        status: statusFilter || undefined,
      });
      setLeaveRequests(result.data || []);
      setTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setError('Không thể tải danh sách đơn nghỉ phép');
      setLeaveRequests([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: LeaveRequest) => {
    if (!user?.employeeId) {
      setError('Không tìm thấy thông tin người dùng');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await leaveRequestService.approveLeaveRequest(request.id, user.employeeId);
      setSuccess('Đã phê duyệt đơn nghỉ phép');
      fetchLeaveRequests();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error approving leave request:', error);
      setError('Không thể phê duyệt đơn nghỉ phép');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user?.employeeId) {
      return;
    }

    if (!rejectionReason.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }

    try {
      setError('');
      setSuccess('');
      await leaveRequestService.rejectLeaveRequest(
        selectedRequest.id,
        user.employeeId,
        rejectionReason
      );
      setSuccess('Đã từ chối đơn nghỉ phép');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      fetchLeaveRequests();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      setError('Không thể từ chối đơn nghỉ phép');
    }
  };

  const handleExportExcel = async () => {
    try {
      setError('');
      await leaveRequestService.exportToExcel({
        status: statusFilter || undefined,
      });
      setSuccess('Đã xuất file Excel thành công');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Không thể xuất file Excel');
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ANNUAL: 'Nghỉ phép năm',
      SICK: 'Nghỉ ốm',
      PERSONAL: 'Nghỉ việc riêng',
      MATERNITY: 'Nghỉ thai sản',
      EMERGENCY: 'Nghỉ khẩn cấp',
      COMPENSATORY: 'Nghỉ bù',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Chờ duyệt' },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Đã duyệt' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Từ chối' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Danh sách đơn nghỉ phép</h2>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Từ chối</option>
          </select>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={18} />
          Xuất Excel
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Đang tải...</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Mã đơn</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nhân viên</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Loại nghỉ</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Thời gian</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Ngày tạo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      Không có đơn nghỉ phép nào
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{request.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div>
                          <div className="font-medium">
                            {request.employee?.user.firstName} {request.employee?.user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{request.employee?.employeeCode}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {getLeaveTypeLabel(request.leaveType)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                        </div>
                        {request.isHalfDay && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{request.halfDayPeriod === 'MORNING' ? 'Buổi sáng' : 'Buổi chiều'}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(request.status)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(request.createdAt)}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {request.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(request)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Phê duyệt"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsRejectModalOpen(true);
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Từ chối"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Trước
              </button>
              <span className="px-4 py-2 text-gray-700">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Chi tiết đơn nghỉ phép</h3>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedRequest(null);
                }}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Mã đơn</label>
                  <p className="text-gray-900">{selectedRequest.code}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Trạng thái</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Nhân viên</label>
                <p className="text-gray-900">
                  {selectedRequest.employee?.user.firstName} {selectedRequest.employee?.user.lastName}
                  <span className="text-sm text-gray-500 ml-2">({selectedRequest.employee?.employeeCode})</span>
                </p>
                <p className="text-sm text-gray-600">{selectedRequest.employee?.position.name}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Loại nghỉ phép</label>
                <p className="text-gray-900">{getLeaveTypeLabel(selectedRequest.leaveType)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Ngày bắt đầu</label>
                  <p className="text-gray-900">{formatDate(selectedRequest.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Ngày kết thúc</label>
                  <p className="text-gray-900">{formatDate(selectedRequest.endDate)}</p>
                </div>
              </div>

              {selectedRequest.isHalfDay && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">Nghỉ nửa ngày</label>
                  <p className="text-gray-900">
                    {selectedRequest.halfDayPeriod === 'MORNING' ? 'Buổi sáng' : 'Buổi chiều'}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-700">Lý do nghỉ phép</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-700">File đính kèm</label>
                  <div className="mt-2 space-y-2">
                    {selectedRequest.attachments.map((file, index) => (
                      <a
                        key={index}
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="w-4 h-4" />
                        <span>File {index + 1}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.status !== 'PENDING' && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Thời gian phê duyệt</label>
                    <p className="text-gray-900">{selectedRequest.approvedAt ? formatDateTime(selectedRequest.approvedAt) : '-'}</p>
                  </div>
                  {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Lý do từ chối</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.rejectionReason}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Từ chối đơn nghỉ phép</h3>
              <button
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Bạn có chắc chắn muốn từ chối đơn nghỉ phép <strong>{selectedRequest.code}</strong>?
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lý do từ chối <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={4}
                  placeholder="Nhập lý do từ chối..."
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setRejectionReason('');
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Từ chối
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequestManagement;

