import React, { useState, useEffect } from 'react';
import {
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  Clock,
  TrendingUp,
} from 'lucide-react';
import employeeEvaluationService, { EmployeeEvaluation, EvaluationDetailsResponse } from '@services/employeeEvaluationService';
import { useCompletionStats } from '../hooks/useEmployeeEvaluation';
import TableFilter, { FilterField } from './TableFilter';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';

const EmployeeEvaluationManagement = () => {
  const { user } = useAuth();
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD;
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', evaluationStatus: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filterFields: FilterField[] = [
    {
      key: 'evaluationStatus',
      label: 'Trạng thái đánh giá',
      type: 'select',
      options: [
        { value: 'evaluated', label: 'Đã đánh giá' },
        { value: 'not_evaluated', label: 'Chưa đánh giá' },
      ],
    },
  ];
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationDetailsResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { data: completionStats } = useCompletionStats(canView ? month : 0, canView ? year : 0);

  useEffect(() => {
    loadEvaluations();
  }, [month, year, canView]);

  const loadEvaluations = async () => {
    if (!canView) {
      setEvaluations([]);
      return;
    }
    try {
      setLoading(true);
      const data = await employeeEvaluationService.getEmployeeEvaluations(month, year);
      setEvaluations(data || []);
      setError('');
    } catch (err) {
      setError('Lỗi tải danh sách đánh giá');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (evaluation: EmployeeEvaluation) => {
    if (!evaluation.evaluationId) {
      setError('Chưa có đánh giá cho nhân viên này');
      return;
    }

    try {
      setDetailLoading(true);
      // BUG 4: Pass isManager=true to go directly to manager endpoint
      const details = await employeeEvaluationService.getEvaluationDetails(evaluation.evaluationId, true);
      setSelectedEvaluation(details);
      setIsDetailModalOpen(true);
      setError('');
    } catch (err) {
      setError('Lỗi tải chi tiết đánh giá');
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedEvaluation(null);
  };

  const createEvaluationsForAllEmployees = async () => {
    try {
      setLoading(true);
      setError('');

      // BUG 5: Use bulk endpoint instead of looping sequentially
      const result = await employeeEvaluationService.createBulkEvaluations(month, year);
      setSuccess(`Tạo đánh giá thành công cho ${result.created} nhân viên (bỏ qua ${result.skipped} đã có đánh giá)`);
      setTimeout(() => setSuccess(''), 3000);
      loadEvaluations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo đánh giá');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter(item => {
    const s = filterValues._search.toLowerCase();
    const matchesSearch = item.employeeCode.toLowerCase().includes(s) || item.employeeName.toLowerCase().includes(s);
    const matchesStatus =
      !filterValues.evaluationStatus ||
      (filterValues.evaluationStatus === 'evaluated' && item.evaluationId) ||
      (filterValues.evaluationStatus === 'not_evaluated' && !item.evaluationId);
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredEvaluations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedEvaluations = filteredEvaluations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Month/Year Selector */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tháng</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">Năm</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Completion Stats Dashboard */}
      {canView && completionStats && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-500 font-medium">Tổng số</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{completionStats.total}</p>
            </div>

            <div className="bg-white rounded-xl border border-yellow-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-gray-500 font-medium">Chờ tự đánh giá</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{completionStats.selfPending}</p>
            </div>

            <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-gray-500 font-medium">Chờ cấp trên</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {completionStats.supervisor1Pending + completionStats.supervisor2Pending}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500 font-medium">Hoàn thành</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {completionStats.completed + completionStats.acknowledged}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-500 font-medium">Tỷ lệ</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {completionStats.completionRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Department Breakdown */}
          {completionStats.byDepartment.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Theo phòng ban</h3>
              <div className="space-y-2">
                {completionStats.byDepartment.map((dept) => (
                  <div key={dept.departmentName} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-40 shrink-0 truncate" title={dept.departmentName}>
                      {dept.departmentName}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(dept.rate, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-24 shrink-0 text-right">
                      {dept.completed}/{dept.total} ({dept.rate.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Đánh giá nhân viên</h2>
        <button
          onClick={createEvaluationsForAllEmployees}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? 'Đang tạo...' : 'Tạo đánh giá'}
        </button>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm theo mã hoặc tên nhân viên..."
      />

      {/* Evaluations Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">MNV</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên NV</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Vị trí</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">% Tự đánh giá</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">% Cấp trên 1</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">% Cấp trên 2</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEvaluations.map((evaluation, index) => (
                  <tr
                    key={evaluation.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {evaluation.employeeCode}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {evaluation.employeeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {evaluation.positionName}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {evaluation.selfScore.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {evaluation.supervisorScore1.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {evaluation.supervisorScore2.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        {evaluation.evaluationId ? (
                          <button
                            onClick={() => openDetailModal(evaluation)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                            title="Xem chi tiết đánh giá"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        ) : (
                          <span className="p-1.5 text-gray-400 cursor-not-allowed" title="Chưa có đánh giá">
                            <Eye className="w-5 h-5" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} / {totalItems} mục
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen && !!selectedEvaluation} onClose={closeDetailModal} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Đánh giá nhân viên</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEvaluation?.employeeCode} - {selectedEvaluation?.employeeName} ({selectedEvaluation?.positionName})
                  </p>
                </div>
                <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {detailLoading ? (
                <div className="text-center py-8 text-gray-500">Đang tải...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-100">
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">STT</th>
                        <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium">Trách nhiệm</th>
                        <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">Tỷ trọng (%)</th>
                        <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">Cá nhân tự đánh giá</th>
                        <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">Cấp trên 1</th>
                        <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium">Cấp trên 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEvaluation?.details.map(detail => (
                        <tr key={detail.responsibilityId} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 text-sm">{detail.stt}</td>
                          <td className="border border-gray-300 px-4 py-2 text-sm">
                            <div className="font-medium">{detail.title}</div>
                            <div className="text-xs text-gray-600">{detail.description}</div>
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm">{detail.weight}%</td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                            {detail.selfScore !== null && detail.selfScore !== undefined
                              ? `${detail.selfScore.toFixed(1)}%`
                              : '-'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                            {detail.supervisorScore1 !== null && detail.supervisorScore1 !== undefined
                              ? `${detail.supervisorScore1.toFixed(1)}%`
                              : '-'}
                          </td>
                          <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                            {detail.supervisorScore2 !== null && detail.supervisorScore2 !== undefined
                              ? `${detail.supervisorScore2.toFixed(1)}%`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeDetailModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
      </Modal>
    </div>
  );
};

export default EmployeeEvaluationManagement;

