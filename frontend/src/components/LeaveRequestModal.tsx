import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Clock, CheckCircle, Umbrella, Heart, Briefcase, Baby, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import DatePicker from './DatePicker';
import leaveRequestService, { LeaveRequest } from '../services/leaveRequestService';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  showBackdrop?: boolean;
  onSuccess?: () => void;
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Nghỉ phép năm',
  SICK: 'Nghỉ ốm',
  PERSONAL: 'Nghỉ việc riêng',
  MATERNITY: 'Nghỉ thai sản',
  EMERGENCY: 'Nghỉ khẩn cấp',
  COMPENSATORY: 'Nghỉ bù',
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING:  { text: 'Chờ duyệt', cls: 'bg-yellow-100 text-yellow-800' },
  APPROVED: { text: 'Đã duyệt',  cls: 'bg-green-100 text-green-800'   },
  REJECTED: { text: 'Từ chối',   cls: 'bg-red-100 text-red-800'       },
};

const formatDate = (iso: string) => {
  const d = new Date(iso.substring(0, 10));
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({ isOpen, onClose, showBackdrop = false, onSuccess }) => {
  const { user } = useAuth();

  // --- Tab state ---
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // --- Create form state ---
  const [formData, setFormData] = useState({
    leaveType: '',
    startDate: '',
    endDate: '',
    startTime: '08:00',
    endTime: '17:00',
    reason: '',
    isHalfDay: false,
    halfDayPeriod: 'morning',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --- History state ---
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Leave types config
  const leaveTypes = [
    { value: 'annual',       label: 'Nghỉ phép năm',  color: 'bg-blue-500',   icon: Umbrella      },
    { value: 'sick',         label: 'Nghỉ ốm',         color: 'bg-red-500',    icon: Heart         },
    { value: 'personal',     label: 'Nghỉ việc riêng', color: 'bg-yellow-500', icon: Briefcase     },
    { value: 'maternity',    label: 'Nghỉ thai sản',   color: 'bg-pink-500',   icon: Baby          },
    { value: 'emergency',    label: 'Nghỉ khẩn cấp',  color: 'bg-orange-500', icon: AlertTriangle },
    { value: 'compensatory', label: 'Nghỉ bù',         color: 'bg-green-500',  icon: RefreshCw     },
  ];

  // Reset everything when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('create');
      setFormData({
        leaveType: '',
        startDate: '',
        endDate: '',
        startTime: '08:00',
        endTime: '17:00',
        reason: '',
        isHalfDay: false,
        halfDayPeriod: 'morning',
      });
      setErrors({});
      setSubmitSuccess(false);
      setHistory([]);
      setHistoryPage(1);
      setHistoryTotalPages(1);
    }
  }, [isOpen]);

  // Load history when tab switches to history or page changes
  useEffect(() => {
    if (activeTab === 'history' && isOpen) {
      loadHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isOpen, historyPage]);

  const loadHistory = async () => {
    if (!user?.employeeId) return;
    setHistoryLoading(true);
    try {
      const res = await leaveRequestService.getAllLeaveRequests({
        employeeId: user.employeeId,
        page: historyPage,
        limit: 10,
      });
      setHistory(res.data);
      setHistoryTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Error loading leave history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- Form helpers ---
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.leaveType) newErrors.leaveType = 'Vui lòng chọn loại nghỉ phép';
    if (!formData.startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!formData.endDate)   newErrors.endDate   = 'Vui lòng chọn ngày kết thúc';
    if (
      formData.startDate && formData.endDate &&
      new Date(formData.startDate) > new Date(formData.endDate)
    ) {
      newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    }
    if (!formData.reason.trim()) newErrors.reason = 'Vui lòng nhập lý do nghỉ phép';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateLeaveDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end   = new Date(formData.endDate);
    const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return formData.isHalfDay ? 0.5 : diffDays;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user?.employeeId) { alert('Không tìm thấy thông tin nhân viên'); return; }

    setIsSubmitting(true);
    try {
      const leaveTypeMap: Record<string, string> = {
        annual: 'ANNUAL', sick: 'SICK', personal: 'PERSONAL',
        maternity: 'MATERNITY', emergency: 'EMERGENCY', compensatory: 'COMPENSATORY',
      };
      const halfDayPeriodMap: Record<string, string> = { morning: 'MORNING', afternoon: 'AFTERNOON' };

      await leaveRequestService.createLeaveRequest({
        employeeId:    user.employeeId,
        leaveType:     leaveTypeMap[formData.leaveType],
        startDate:     formData.startDate,
        endDate:       formData.endDate,
        startTime:     formData.startTime,
        endTime:       formData.endTime,
        isHalfDay:     formData.isHalfDay,
        halfDayPeriod: formData.isHalfDay ? halfDayPeriodMap[formData.halfDayPeriod] : undefined,
        reason:        formData.reason,
        attachments:   [],
      });

      setSubmitSuccess(true);
      if (onSuccess) onSuccess();
      setTimeout(() => { setSubmitSuccess(false); onClose(); }, 2000);
    } catch (error: any) {
      console.error('Error submitting leave request:', error);
      alert(error.response?.data?.message || 'Lỗi khi gửi đơn nghỉ phép');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop={showBackdrop}>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-[calc(100vw-1rem)] sm:w-full mx-2 sm:mx-4 flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-4 sm:px-6 rounded-t-2xl shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Đăng ký nghỉ phép</h2>
                <p className="text-orange-100 text-sm">{user?.lastName} {user?.firstName}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-orange-200 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="border-b border-gray-200 px-4 sm:px-6 shrink-0">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Tạo đơn mới
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Lịch sử
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">

          {/* Create tab */}
          {activeTab === 'create' && (
            <>
              {submitSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Đăng ký nghỉ phép thành công!</h3>
                  <p className="text-gray-600">Đơn nghỉ phép của bạn đã được gửi và đang chờ phê duyệt.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Leave Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Loại nghỉ phép *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {leaveTypes.map((type) => {
                        const IconComponent = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => handleInputChange('leaveType', type.value)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              formData.leaveType === type.value
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <div className={`w-8 h-8 rounded-full ${type.color} flex items-center justify-center`}>
                                <IconComponent className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-medium">{type.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {errors.leaveType && <p className="mt-1 text-sm text-red-600">{errors.leaveType}</p>}
                  </div>

                  {/* Half Day Option */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isHalfDay}
                        onChange={(e) => handleInputChange('isHalfDay', e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Nghỉ nửa ngày</span>
                    </label>
                    {formData.isHalfDay && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleInputChange('halfDayPeriod', 'morning')}
                          className={`p-2 rounded-lg border transition-all ${
                            formData.halfDayPeriod === 'morning'
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          Buổi sáng
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInputChange('halfDayPeriod', 'afternoon')}
                          className={`p-2 rounded-lg border transition-all ${
                            formData.halfDayPeriod === 'afternoon'
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          Buổi chiều
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <DatePicker
                      label="Từ ngày"
                      value={formData.startDate}
                      onChange={(date) => handleInputChange('startDate', date)}
                      minDate={new Date().toISOString().split('T')[0]}
                      maxDate={formData.endDate || undefined}
                      error={errors.startDate}
                      required
                    />
                    <DatePicker
                      label="Đến ngày"
                      value={formData.endDate}
                      onChange={(date) => handleInputChange('endDate', date)}
                      minDate={formData.startDate || new Date().toISOString().split('T')[0]}
                      error={errors.endDate}
                      required
                    />
                  </div>

                  {/* Leave Duration Summary */}
                  {formData.startDate && formData.endDate && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-800">
                          Tổng số ngày nghỉ: {calculateLeaveDays()} ngày
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lý do nghỉ phép *</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      placeholder="Nhập lý do nghỉ phép..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      rows={4}
                    />
                    {errors.reason && <p className="mt-1 text-sm text-red-600">{errors.reason}</p>}
                  </div>

                  {/* Submit */}
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all bg-orange-600 hover:bg-orange-700 text-white ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Đang gửi...</span>
                        </div>
                      ) : 'Gửi đơn nghỉ phép'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* History tab */}
          {activeTab === 'history' && (
            <div>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-lg border border-gray-100 p-4 animate-pulse">
                      <div className="flex justify-between mb-2">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-4 bg-gray-200 rounded w-16" />
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Calendar className="w-14 h-14 mb-3 text-gray-300" />
                  <p className="text-sm">Chưa có đơn xin nghỉ nào</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {history.map(lv => {
                      const status = STATUS_LABEL[lv.status] ?? { text: lv.status, cls: 'bg-gray-100 text-gray-700' };
                      const dateRange = lv.isHalfDay
                        ? `${formatDate(lv.startDate)} (${lv.halfDayPeriod === 'MORNING' ? 'Sáng' : 'Chiều'})`
                        : `${formatDate(lv.startDate)} → ${formatDate(lv.endDate)}`;

                      return (
                        <div key={lv.id} className="rounded-lg border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-800">
                              {LEAVE_TYPE_LABELS[lv.leaveType] ?? lv.leaveType}
                            </span>
                            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${status.cls}`}>
                              {status.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <FileText className="w-3 h-3" />
                            <span>{dateRange}</span>
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{lv.reason}</p>
                          {lv.status === 'REJECTED' && lv.rejectionReason && (
                            <p className="mt-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                              Lý do từ chối: {lv.rejectionReason}
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-gray-400">
                            Tạo lúc: {formatDate(lv.createdAt)}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Trước
                      </button>
                      <span className="text-sm text-gray-600">
                        Trang {historyPage}/{historyTotalPages}
                      </span>
                      <button
                        onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                        disabled={historyPage === historyTotalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                      >
                        Sau
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default LeaveRequestModal;
