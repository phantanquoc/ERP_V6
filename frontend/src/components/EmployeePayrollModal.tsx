import React, { useState, useEffect } from 'react';
import { X, DollarSign } from 'lucide-react';
import payrollService, { PayrollDetail } from '@services/payrollService';

interface EmployeePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: string | null; // format: "YYYY-MM"
}

const EmployeePayrollModal: React.FC<EmployeePayrollModalProps> = ({ isOpen, onClose, period }) => {
  const [payroll, setPayroll] = useState<PayrollDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && period) {
      loadPayroll();
    }
    if (!isOpen) {
      setPayroll(null);
      setError('');
    }
  }, [isOpen, period]);

  const loadPayroll = async () => {
    if (!period) return;
    try {
      setLoading(true);
      setError('');
      const [yearStr, monthStr] = period.split('-');
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      const data = await payrollService.getMyPayroll(month, year);
      setPayroll(data);
    } catch (err: any) {
      console.error('Error loading payroll:', err);
      setError(err?.response?.data?.message || 'Không thể tải bảng lương');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Bảng lương của tôi</h2>
              {period && (
                <p className="text-green-100 text-sm">
                  Tháng {parseInt(period.split('-')[1], 10)}/{period.split('-')[0]}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-green-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Đang tải bảng lương...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <p className="text-lg font-medium">{error}</p>
            </div>
          ) : payroll ? (
            <>
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
                <div>
                  <p className="text-sm text-gray-500">Mã NV</p>
                  <p className="font-semibold text-gray-900">{payroll.employeeCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tên NV</p>
                  <p className="font-semibold text-gray-900">{payroll.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vị trí</p>
                  <p className="font-semibold text-gray-900">{payroll.positionName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tháng/Năm</p>
                  <p className="font-semibold text-gray-900">{payroll.month}/{payroll.year}</p>
                </div>
              </div>

              {/* Salary Details */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-bold mb-4 text-lg text-green-700">Thu nhập</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Lương cơ bản:</span>
                      <span className="text-sm font-medium">{payroll.baseSalary.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Lương KPI:</span>
                      <span className="text-sm font-medium">{payroll.kpiBonus.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phụ cấp chức vụ:</span>
                      <span className="text-sm font-medium">{payroll.positionAllowance.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phụ cấp khác:</span>
                      <span className="text-sm font-medium">{payroll.otherAllowances.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Tổng thu nhập:</span>
                      <span>{payroll.totalIncome.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold mb-4 text-lg text-red-600">Khấu trừ</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">BHXH:</span>
                      <span className="text-sm font-medium">{payroll.socialInsurance.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">BHYT:</span>
                      <span className="text-sm font-medium">{payroll.healthInsurance.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">BHTN:</span>
                      <span className="text-sm font-medium">{payroll.unemploymentInsurance.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Thuế TNCN:</span>
                      <span className="text-sm font-medium">{payroll.personalIncomeTax.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Khấu trừ KPI:</span>
                      <span className="text-sm font-medium">{payroll.kpiDeduction.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Khấu trừ ngày nghỉ:</span>
                      <span className="text-sm font-medium">{payroll.leaveDeduction.toLocaleString('vi-VN')} ₫</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Tổng khấu trừ:</span>
                      <span>{payroll.totalDeductions.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Days */}
              <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Ngày làm</p>
                  <p className="text-lg font-bold text-gray-900">{payroll.workDays}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Ngày nghỉ</p>
                  <p className="text-lg font-bold text-gray-900">{payroll.leaveDays}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Giờ OT</p>
                  <p className="text-lg font-bold text-gray-900">{payroll.overtimeHours}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Tiền OT</p>
                  <p className="text-lg font-bold text-green-700">{(payroll.overtimePay ?? 0).toLocaleString('vi-VN')} ₫</p>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">Thực lĩnh:</span>
                  <span className="text-3xl font-bold text-green-600">
                    {payroll.netSalary.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeePayrollModal;

