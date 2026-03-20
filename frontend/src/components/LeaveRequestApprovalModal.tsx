import { useState, useEffect } from 'react';
import { X, Loader2, Check, XCircle } from 'lucide-react';
import leaveRequestService, { LeaveRequest } from '../services/leaveRequestService';
import { useAuth } from '../contexts/AuthContext';

interface LeaveRequestApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequestId: string | null;
  notificationMessage?: string;
}

const LeaveRequestApprovalModal = ({ isOpen, onClose, leaveRequestId, notificationMessage }: LeaveRequestApprovalModalProps) => {
  const { user } = useAuth();
  const [data, setData] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (isOpen && (leaveRequestId || notificationMessage)) {
      loadData();
    } else {
      setData(null);
      setError('');
      setActionLoading(false);
      setRejectionReason('');
      setShowRejectForm(false);
    }
  }, [isOpen, leaveRequestId, notificationMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (leaveRequestId) {
        const response = await leaveRequestService.getLeaveRequestById(leaveRequestId);
        setData(response);
      } else if (notificationMessage) {
        const match = notificationMessage.match(/NP-\d+/);
        if (match) {
          const code = match[0];
          const response = await leaveRequestService.getAllLeaveRequests({ page: 1, limit: 100 });
          const list = response.data || [];
          const found = list.find((item: LeaveRequest) => item.code === code);
          if (found) {
            setData(found);
          } else {
            setError('Không tìm thấy đơn nghỉ phép');
          }
        } else {
          setError('Không tìm thấy mã đơn nghỉ phép trong thông báo');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin đơn nghỉ phép');
    } finally {
      setLoading(false);
    }
  };

  const getLeaveTypeLabel = (type: string): string => {
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
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Chờ phê duyệt</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Đã phê duyệt</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Từ chối</span>;
      default:
        return null;
    }
  };

  const handleApprove = async () => {
    if (!data || !user?.employeeId) return;
    try {
      setActionLoading(true);
      await leaveRequestService.approveLeaveRequest(data.id, user.employeeId);
      const updated = await leaveRequestService.getLeaveRequestById(data.id);
      setData(updated);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi phê duyệt đơn nghỉ phép');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!data || !user?.employeeId || !rejectionReason.trim()) return;
    try {
      setActionLoading(true);
      await leaveRequestService.rejectLeaveRequest(data.id, user.employeeId, rejectionReason.trim());
      const updated = await leaveRequestService.getLeaveRequestById(data.id);
      setData(updated);
      setShowRejectForm(false);
      setRejectionReason('');
    } catch (err: any) {
      setError(err.message || 'Lỗi khi từ chối đơn nghỉ phép');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Chi tiết đơn nghỉ phép</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Đang tải...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã đơn</label>
                  <p className="text-gray-900 font-semibold">{data.code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <p>{getStatusBadge(data.status)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nhân viên</label>
                  <p className="text-gray-900">{data.employee?.user ? `${data.employee.user.lastName} ${data.employee.user.firstName}` : '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ</label>
                  <p className="text-gray-900">{data.employee?.position?.name || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                  <p className="text-gray-900">{data.employee?.subDepartment?.name || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại nghỉ phép</label>
                  <p className="text-gray-900">{getLeaveTypeLabel(data.leaveType)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <p className="text-gray-900">{new Date(data.startDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <p className="text-gray-900">{new Date(data.endDate).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {data.isHalfDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nghỉ nửa ngày</label>
                  <p className="text-gray-900">{data.halfDayPeriod === 'MORNING' ? 'Buổi sáng' : 'Buổi chiều'}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{data.reason}</p>
              </div>

              {data.status === 'REJECTED' && data.rejectionReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối</label>
                  <p className="text-gray-900 bg-red-50 p-3 rounded-lg">{data.rejectionReason}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
                <p className="text-gray-900">{new Date(data.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>

              {showRejectForm && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lý do từ chối</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder="Nhập lý do từ chối..."
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectionReason(''); }}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      disabled={actionLoading}
                    >
                      Hủy
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                      disabled={actionLoading || !rejectionReason.trim()}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Xác nhận từ chối
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end gap-2">
          {data?.status === 'PENDING' && !showRejectForm && (
            <>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Phê duyệt
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                disabled={actionLoading}
              >
                <XCircle className="w-4 h-4" />
                Từ chối
              </button>
            </>
          )}
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRequestApprovalModal;

