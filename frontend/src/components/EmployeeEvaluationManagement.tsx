import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import employeeEvaluationService, { EmployeeEvaluation, EvaluationDetailsResponse } from '@services/employeeEvaluationService';

const EmployeeEvaluationManagement = () => {
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationDetailsResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadEvaluations();
  }, [month, year]);

  const loadEvaluations = async () => {
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
      const details = await employeeEvaluationService.getEvaluationDetails(evaluation.evaluationId);
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

      // Get all employees first
      const response = await fetch('http://localhost:5000/api/employees?page=1&limit=1000', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Lỗi tải danh sách nhân viên');
      }

      const data = await response.json();
      const employees = data.data || [];

      // Create evaluation for each employee
      let successCount = 0;
      for (const employee of employees) {
        try {
          await employeeEvaluationService.createOrUpdateEvaluation(employee.id, month, year);
          successCount++;
        } catch (err) {
          console.error(`Lỗi tạo đánh giá cho nhân viên ${employee.employeeCode}:`, err);
        }
      }

      setSuccess(`Tạo đánh giá thành công cho ${successCount}/${employees.length} nhân viên`);
      loadEvaluations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tạo đánh giá');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvaluations = evaluations.filter(item =>
    item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="bg-white rounded-lg shadow border-b">
        <div className="px-6 py-3 font-medium border-b-2 border-blue-600 text-blue-600">
          Tự đánh giá
        </div>
      </div>

      {/* Search and Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tìm kiếm</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã hoặc tên nhân viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={createEvaluationsForAllEmployees}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Đang tạo...' : 'Tạo đánh giá'}
          </button>
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">MNV</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Tên NV</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Vị trí</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">% Tự đánh giá</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">% Cấp trên 1</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">% Cấp trên 2</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvaluations.map(evaluation => (
                <tr key={evaluation.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{evaluation.employeeCode}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{evaluation.employeeName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{evaluation.positionName}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{evaluation.selfScore.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{evaluation.supervisorScore1.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{evaluation.supervisorScore2.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-sm">
                    {evaluation.evaluationId ? (
                      <button
                        onClick={() => openDetailModal(evaluation)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết đánh giá"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    ) : (
                      <span className="text-gray-400 cursor-not-allowed" title="Chưa có đánh giá">
                        <Eye className="w-5 h-5" />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Đánh giá nhân viên</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedEvaluation.employeeCode} - {selectedEvaluation.employeeName} ({selectedEvaluation.positionName})
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
                      {selectedEvaluation.details.map(detail => (
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
        </div>
      )}
    </div>
  );
};

export default EmployeeEvaluationManagement;

