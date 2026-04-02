import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Eye, Download, AlertCircle } from 'lucide-react';
import leaveRequestService, { LeaveRequest } from '@services/leaveRequestService';
import { useAuth } from '@contexts/AuthContext';
import { useLeaveRequests, leaveRequestKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable, Column } from './DataTable';
import { formatDate, formatDateTime } from '../utils/formatters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getLeaveTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    ANNUAL:       'Nghỉ phép năm',
    SICK:         'Nghỉ ốm',
    PERSONAL:     'Nghỉ việc riêng',
    MATERNITY:    'Nghỉ thai sản',
    EMERGENCY:    'Nghỉ khẩn cấp',
    COMPENSATORY: 'Nghỉ bù',
  };
  return labels[type] || type;
};

const getStatusBadge = (status: string) => {
  const badges: Record<string, { bg: string; text: string; label: string }> = {
    PENDING:  { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Chờ duyệt' },
    APPROVED: { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Đã duyệt'  },
    REJECTED: { bg: 'bg-red-100',    text: 'text-red-800',     label: 'Từ chối'  },
  };
  const badge = badges[status] || badges.PENDING;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const LeaveRequestManagement: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const pageSize = 10;

  // ── Modals
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // ── Alerts
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');

  // ── React Query
  const { data: leaveRequestsData, isLoading, refetch } = useLeaveRequests({
    page: 1,
    limit: 1000,
    status: statusFilter || undefined,
  });
  const leaveRequests = leaveRequestsData?.data || [];

  // ── Realtime: LEAVE_REQUEST_CHANGED
  useEffect(() => {
    const handler = () => { refetch(); };
    window.addEventListener('LEAVE_REQUEST_CHANGED', handler);
    return () => window.removeEventListener('LEAVE_REQUEST_CHANGED', handler);
  }, [refetch]);

  // ── Filtered data
  const filteredData = leaveRequests.filter(req =>
    searchText
      ? req.code?.toLowerCase().includes(searchText.toLowerCase()) ||
        `${req.employee?.user.firstName} ${req.employee?.user.lastName}`.toLowerCase().includes(searchText.toLowerCase())
      : true
  );

  const total = filteredData.length;

  // ── Actions
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
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Không thể phê duyệt đơn nghỉ phép');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user?.employeeId) return;
    if (!rejectionReason.trim()) {
      setError('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setError('');
      setSuccess('');
      await leaveRequestService.rejectLeaveRequest(selectedRequest.id, user.employeeId, rejectionReason);
      setSuccess('Đã từ chối đơn nghỉ phép');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      queryClient.invalidateQueries({ queryKey: leaveRequestKeys.lists() });
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Không thể từ chối đơn nghỉ phép');
    }
  };

  const handleExportExcel = async () => {
    try {
      setError('');
      await leaveRequestService.exportToExcel({ status: statusFilter || undefined });
      setSuccess('Đã xuất file Excel thành công');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Không thể xuất file Excel');
    }
  };

  // ── DataTable columns
  const columns: Column<LeaveRequest>[] = [
    {
      key: 'code',
      label: 'Mã đơn',
      width: '120px',
      filterable: true,
      filterType: 'text',
      render: (row) => (
        <span className="font-semibold text-blue-600">{row.code}</span>
      ),
    },
    {
      key: 'employeeName',
      label: 'Nhân viên',
      filterable: true,
      filterType: 'text',
      width: '200px',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.employee?.user.firstName} {row.employee?.user.lastName}
          </div>
          <div className="text-xs text-gray-500">{row.employee?.employeeCode}</div>
        </div>
      ),
    },
    {
      key: 'leaveType',
      label: 'Loại nghỉ',
      width: '140px',
      render: (row) => (
        <span className="text-gray-700">{getLeaveTypeLabel(row.leaveType)}</span>
      ),
    },
    {
      key: 'dateRange',
      label: 'Thời gian',
      width: '200px',
      render: (row) => (
        <div className="text-sm text-gray-700">
          <div>{formatDate(row.startDate)} – {formatDate(row.endDate)}</div>
          {row.isHalfDay && (
            <div className="text-xs text-gray-500 mt-0.5">
              Nửa ngày ({row.halfDayPeriod === 'MORNING' ? 'Buổi sáng' : 'Buổi chiều'})
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      width: '130px',
      filterable: true,
      filterType: 'select',
      filterOptions: [
        { value: 'PENDING',  label: 'Chờ duyệt' },
        { value: 'APPROVED', label: 'Đã duyệt'   },
        { value: 'REJECTED', label: 'Từ chối'    },
      ],
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'createdAt',
      label: 'Ngày tạo',
      width: '120px',
      render: (row) => (
        <span className="text-sm text-gray-600">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      width: '160px',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => { setSelectedRequest(row); setIsDetailModalOpen(true); }}
            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4" />
          </button>
          {row.status === 'PENDING' && (
            <>
              <button
                onClick={() => handleApprove(row)}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                title="Phê duyệt"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setSelectedRequest(row); setIsRejectModalOpen(true); }}
                className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                title="Từ chối"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    setCurrentPage(1);
    if (filters.status) setStatusFilter(filters.status as string);
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Danh sách đơn nghỉ phép</h2>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={18} />
          Xuất Excel
        </button>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* ── Quick status filter bar ── */}
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setCurrentPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'Tất cả' : s === 'PENDING' ? 'Chờ duyệt' : s === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
          </button>
        ))}
      </div>

      {/* ── DataTable ── */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        total={total}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onFilterChange={handleFilterChange}
        emptyMessage="Không có đơn nghỉ phép nào"
        rowKey="id"
      />

      {/* ── Detail Modal ── */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Chi tiết đơn nghỉ phép</h3>
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedRequest(null); }}
                className="text-white hover:text-gray-200 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-500">Mã đơn</label>
                  <p className="text-gray-900 font-medium">{selectedRequest.code}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-500">Trạng thái</label>
                  <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-500">Nhân viên</label>
                <p className="text-gray-900">
                  {selectedRequest.employee?.user.firstName} {selectedRequest.employee?.user.lastName}
                  <span className="text-sm text-gray-500 ml-2">({selectedRequest.employee?.employeeCode})</span>
                </p>
                <p className="text-sm text-gray-600">{selectedRequest.employee?.position?.name}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-500">Loại nghỉ phép</label>
                <p className="text-gray-900">{getLeaveTypeLabel(selectedRequest.leaveType)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-500">Ngày bắt đầu</label>
                  <p className="text-gray-900">{formatDate(selectedRequest.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-500">Ngày kết thúc</label>
                  <p className="text-gray-900">{formatDate(selectedRequest.endDate)}</p>
                </div>
              </div>

              {selectedRequest.isHalfDay && (
                <div>
                  <label className="text-sm font-semibold text-gray-500">Nghỉ nửa ngày</label>
                  <p className="text-gray-900">
                    {selectedRequest.halfDayPeriod === 'MORNING' ? 'Buổi sáng' : 'Buổi chiều'}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-gray-500">Lý do nghỉ phép</label>
                <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-gray-500">File đính kèm</label>
                  <div className="mt-2 space-y-2">
                    {selectedRequest.attachments.map((file, index) => (
                      <a
                        key={index}
                        href={file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        {file}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.status !== 'PENDING' && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-gray-500">Thời gian phê duyệt</label>
                    <p className="text-gray-900">{selectedRequest.approvedAt ? formatDateTime(selectedRequest.approvedAt) : '—'}</p>
                  </div>
                  {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500">Lý do từ chối</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedRequest.rejectionReason}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
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
                className="text-white hover:text-gray-200 text-xl leading-none"
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
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setRejectionReason('');
                    setSelectedRequest(null);
                    setError('');
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
