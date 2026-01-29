import React, { useState, useEffect } from 'react';
import { Eye, Edit2, Save, X } from 'lucide-react';
import payrollService, { PayrollItem, PayrollDetail } from '@services/payrollService';
import evaluationService from '@services/employeeEvaluationService';
import { usePayrollByMonthYear, payrollKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';

const PayrollManagement: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollDetail | null>(null);
  const [editingPayroll, setEditingPayroll] = useState<PayrollDetail | null>(null);
  const [evaluations, setEvaluations] = useState<any[]>([]);

  const queryClient = useQueryClient();
  const { data: payrolls = [], isLoading: loading } = usePayrollByMonthYear(selectedMonth, selectedYear);

  useEffect(() => {
    fetchEvaluations();
  }, [selectedMonth, selectedYear]);

  const fetchEvaluations = async () => {
    try {
      const data = await evaluationService.getEmployeeEvaluations(selectedMonth, selectedYear);
      setEvaluations(data);
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    }
  };

  // Helper function to get supervisor2 percentage for an employee
  const getSupervisor2Percentage = (employeeCode: string): number => {
    const evaluation = evaluations.find(e => e.employeeCode === employeeCode);
    return evaluation?.supervisorScore2 ?? 0;
  };

  const handleViewDetail = async (payroll: PayrollItem) => {
    try {
      let detail: PayrollDetail;

      if (payroll.payrollId) {
        // Đã có bảng lương => lấy chi tiết từ API
        detail = await payrollService.getPayrollDetail(payroll.payrollId);
      } else {
        // Chưa có bảng lương => khởi tạo mặc định và tự tính khấu trừ KPI / ngày nghỉ
        const evaluation = evaluations.find(e => e.employeeCode === payroll.employeeCode);
        const supervisor2Percentage = evaluation?.supervisorScore2 ?? 0;

        // Khấu trừ KPI = Lương KPI * (100% - % Cấp trên 2)
        const kpiDeduction =
          payroll.kpiBonus > 0
            ? Math.round((payroll.kpiBonus * (100 - supervisor2Percentage)) / 100)
            : 0;

        // Khấu trừ ngày nghỉ = (Lương cơ bản / 26) * Số ngày nghỉ
        const leaveDeduction =
          payroll.baseSalary > 0 && payroll.leaveDays > 0
            ? Math.round((payroll.baseSalary / 26) * payroll.leaveDays)
            : 0;

        const totalIncome =
          payroll.baseSalary +
          payroll.kpiBonus +
          payroll.positionAllowance +
          payroll.otherAllowances;

        const totalDeductions =
          payroll.socialInsurance +
          payroll.healthInsurance +
          payroll.unemploymentInsurance +
          payroll.personalIncomeTax +
          kpiDeduction +
          leaveDeduction;

        const netSalary = totalIncome - totalDeductions;

        detail = {
          employeeId: payroll.employeeId,
          employeeCode: payroll.employeeCode,
          employeeName: payroll.employeeName,
          positionName: payroll.positionName,
          month: payroll.month,
          year: payroll.year,
          baseSalary: payroll.baseSalary,
          kpiBonus: payroll.kpiBonus,
          positionAllowance: payroll.positionAllowance,
          otherAllowances: payroll.otherAllowances,
          totalIncome,
          socialInsurance: payroll.socialInsurance,
          healthInsurance: payroll.healthInsurance,
          unemploymentInsurance: payroll.unemploymentInsurance,
          personalIncomeTax: payroll.personalIncomeTax,
          kpiDeduction,
          leaveDeduction,
          totalDeductions,
          netSalary,
          workDays: payroll.workDays,
          leaveDays: payroll.leaveDays,
          overtimeHours: payroll.overtimeHours,
        };
      }

      setSelectedPayroll(detail);
      setEditingPayroll({ ...detail });
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching payroll detail:', error);
      alert('Lỗi khi tải chi tiết bảng tính lương');
    }
  };

  const handleSavePayroll = async () => {
    if (!editingPayroll) return;

    try {
      const payload = {
        baseSalary: editingPayroll.baseSalary,
        kpiBonus: editingPayroll.kpiBonus,
        positionAllowance: editingPayroll.positionAllowance,
        otherAllowances: editingPayroll.otherAllowances,
        socialInsurance: editingPayroll.socialInsurance,
        healthInsurance: editingPayroll.healthInsurance,
        unemploymentInsurance: editingPayroll.unemploymentInsurance,
        personalIncomeTax: editingPayroll.personalIncomeTax,
        kpiDeduction: editingPayroll.kpiDeduction,
        leaveDeduction: editingPayroll.leaveDeduction,
        workDays: editingPayroll.workDays,
        leaveDays: editingPayroll.leaveDays,
        overtimeHours: editingPayroll.overtimeHours,
      };

      if (editingPayroll.id) {
        await payrollService.updatePayroll(editingPayroll.id, payload);
      } else {
        await payrollService.createOrUpdatePayroll(
          editingPayroll.employeeId,
          editingPayroll.month,
          editingPayroll.year,
          payload
        );
      }

      alert('Cập nhật bảng tính lương thành công');
      setShowDetailModal(false);
      queryClient.invalidateQueries({ queryKey: payrollKeys.lists() });
    } catch (error) {
      console.error('Error updating payroll:', error);
      alert('Lỗi khi cập nhật bảng tính lương');
    }
  };

  const getEvaluationScore = (employeeCode: string) => {
    const evaluation = evaluations.find(e => e.employeeCode === employeeCode);
    if (!evaluation) return 0;
    return (
      ((evaluation.selfScoreAvg || 0) +
        (evaluation.supervisorScore1Avg || 0) +
        (evaluation.supervisorScore2Avg || 0)) /
      3
    );
  };

  const filteredPayrolls = payrolls.filter(
    item =>
      item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Bảng Tính Lương</h2>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Tháng</label>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {months.map(m => (
              <option key={m} value={m}>
                Tháng {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Năm</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            {years.map(y => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tìm kiếm</label>
          <input
            type="text"
            placeholder="Mã NV hoặc Tên NV"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: payrollKeys.lists() })}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">STT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã NV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên NV</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Vị trí</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">Lương cơ bản</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">Lương KPI</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">Phụ cấp khác</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">Tổng khấu trừ</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900 border-r border-gray-200">Thực lĩnh</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayrolls.map((payroll, index) => (
                <tr
                  key={payroll.employeeId}
                  className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">{index + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                    {payroll.employeeCode}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                    {payroll.employeeName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                    {payroll.positionName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right border-r border-gray-200">
                    {payroll.baseSalary.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right border-r border-gray-200">
                    {payroll.kpiBonus.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right border-r border-gray-200">
                    {(payroll.positionAllowance + payroll.otherAllowances).toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right border-r border-gray-200">
                    {payroll.totalDeductions.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right border-r border-gray-200">
                    {payroll.netSalary.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleViewDetail(payroll)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <Eye size={16} />
                        Chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && editingPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-100 px-6 py-4 flex justify-between items-center border-b">
              <h3 className="text-xl font-bold">Chi tiết Bảng Tính Lương</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b">
                <div>
                  <p className="text-sm text-gray-600">Mã NV</p>
                  <p className="font-semibold">{editingPayroll.employeeCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tên NV</p>
                  <p className="font-semibold">{editingPayroll.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vị trí</p>
                  <p className="font-semibold">{editingPayroll.positionName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tháng/Năm</p>
                  <p className="font-semibold">
                    {editingPayroll.month}/{editingPayroll.year}
                  </p>
                </div>
              </div>

              {/* Salary Details */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-bold mb-4 text-lg">Thu nhập</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-sm">Lương cơ bản:</label>
                      <input
                        type="number"
                        value={editingPayroll.baseSalary}
                        onChange={e => {
                          const newBaseSalary = Number(e.target.value);
                          const newLeaveDeduction =
                            newBaseSalary > 0 && editingPayroll.leaveDays > 0
                              ? Math.round((newBaseSalary / 26) * editingPayroll.leaveDays)
                              : 0;
                          setEditingPayroll({
                            ...editingPayroll,
                            baseSalary: newBaseSalary,
                            leaveDeduction: newLeaveDeduction,
                          });
                        }}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between">
                      <label className="text-sm">Lương KPI:</label>
                      <input
                        type="number"
                        value={editingPayroll.kpiBonus}
                        onChange={e => {
                          const newKpiBonus = Number(e.target.value);
                          const supervisor2Percentage = getSupervisor2Percentage(
                            editingPayroll.employeeCode
                          );
                          const newKpiDeduction =
                            newKpiBonus > 0
                              ? Math.round((newKpiBonus * (100 - supervisor2Percentage)) / 100)
                              : 0;
                          setEditingPayroll({
                            ...editingPayroll,
                            kpiBonus: newKpiBonus,
                            kpiDeduction: newKpiDeduction,
                          });
                        }}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between">
                      <label className="text-sm">Phụ cấp chức vụ:</label>
                      <input
                        type="number"
                        value={editingPayroll.positionAllowance}
                        onChange={e =>
                          setEditingPayroll({
                            ...editingPayroll,
                            positionAllowance: Number(e.target.value),
                          })
                        }
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between">
                      <label className="text-sm">Phụ cấp khác:</label>
                      <input
                        type="number"
                        value={editingPayroll.otherAllowances}
                        onChange={e =>
                          setEditingPayroll({
                            ...editingPayroll,
                            otherAllowances: Number(e.target.value),
                          })
                        }
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <label>Tổng thu nhập:</label>
                      <span>
                        {(
                          editingPayroll.baseSalary +
                          editingPayroll.kpiBonus +
                          editingPayroll.positionAllowance +
                          editingPayroll.otherAllowances
                        ).toLocaleString('vi-VN')}{' '}
                        ₫
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold mb-4 text-lg">Khấu trừ</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <label className="text-sm">BHXH:</label>
                      <input
                        type="number"
                        value={editingPayroll.socialInsurance}
                        onChange={e =>
                          setEditingPayroll({
                            ...editingPayroll,
                            socialInsurance: Number(e.target.value),
                          })
                        }
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between">
                      <label className="text-sm">BHYT:</label>
                      <input
                        type="number"
                        value={editingPayroll.healthInsurance}
                        onChange={e =>
                          setEditingPayroll({
                            ...editingPayroll,
                            healthInsurance: Number(e.target.value),
                          })
                        }
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between">
                      <label className="text-sm">BHTN:</label>
                      <input
                        type="number"
                        value={editingPayroll.unemploymentInsurance}
                        onChange={e =>
                          setEditingPayroll({
                            ...editingPayroll,
                            unemploymentInsurance: Number(e.target.value),
                          })
                        }
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between">
                      <label className="text-sm">Thuế TNCN:</label>
                      <input
                        type="number"
                        value={editingPayroll.personalIncomeTax}
                        onChange={e =>
                          setEditingPayroll({
                            ...editingPayroll,
                            personalIncomeTax: Number(e.target.value),
                          })
                        }
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between">
                      <label className="text-sm">Khấu trừ KPI:</label>
                      <input
                        type="number"
                        value={editingPayroll.kpiDeduction}
                        onChange={e =>
                          setEditingPayroll({
                            ...editingPayroll,
                            kpiDeduction: Number(e.target.value),
                          })
                        }
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between">
                      <label className="text-sm">Khấu trừ ngày nghỉ:</label>
                      <input
                        type="number"
                        value={editingPayroll.leaveDeduction}
                        onChange={e =>
                          setEditingPayroll({
                            ...editingPayroll,
                            leaveDeduction: Number(e.target.value),
                          })
                        }
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2">
                      <label>Tổng khấu trừ:</label>
                      <span>
                        {(
                          editingPayroll.socialInsurance +
                          editingPayroll.healthInsurance +
                          editingPayroll.unemploymentInsurance +
                          editingPayroll.personalIncomeTax +
                          editingPayroll.kpiDeduction +
                          editingPayroll.leaveDeduction
                        ).toLocaleString('vi-VN')}{' '}
                        ₫
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Days */}
              <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b">
                <div>
                  <label className="block text-sm font-medium mb-2">Số ngày làm</label>
                  <input
                    type="number"
                    value={editingPayroll.workDays}
                    onChange={e =>
                      setEditingPayroll({
                        ...editingPayroll,
                        workDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Số ngày nghỉ</label>
                  <input
                    type="number"
                    value={editingPayroll.leaveDays}
                    onChange={e => {
                      const newLeaveDays = Number(e.target.value);
                      const newLeaveDeduction =
                        editingPayroll.baseSalary > 0 && newLeaveDays > 0
                          ? Math.round((editingPayroll.baseSalary / 26) * newLeaveDays)
                          : 0;
                      setEditingPayroll({
                        ...editingPayroll,
                        leaveDays: newLeaveDays,
                        leaveDeduction: newLeaveDeduction,
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Giờ OT</label>
                  <input
                    type="number"
                    value={editingPayroll.overtimeHours}
                    onChange={e =>
                      setEditingPayroll({
                        ...editingPayroll,
                        overtimeHours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-blue-50 p-4 rounded mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Thực lĩnh:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {(
                      editingPayroll.baseSalary +
                      editingPayroll.kpiBonus +
                      editingPayroll.positionAllowance +
                      editingPayroll.otherAllowances -
                      editingPayroll.socialInsurance -
                      editingPayroll.healthInsurance -
                      editingPayroll.unemploymentInsurance -
                      editingPayroll.personalIncomeTax -
                      editingPayroll.kpiDeduction -
                      editingPayroll.leaveDeduction
                    ).toLocaleString('vi-VN')}{' '}
                    ₫
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={handleSavePayroll}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <Save size={18} />
                  Lưu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;

