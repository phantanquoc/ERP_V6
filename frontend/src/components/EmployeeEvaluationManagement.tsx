import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  Clock,
  TrendingUp,
  FileDown,
  BarChart2,
  Search,
  ChevronLeft,
  PanelLeftOpen,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import employeeEvaluationService, { EmployeeEvaluation, EvaluationDetailsResponse } from '@services/employeeEvaluationService';
import { useCompletionStats, useCalibrationHeatmap } from '../hooks/useEmployeeEvaluation';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import CalibrationDashboard from './CalibrationDashboard';
import apiClient from '@services/apiClient';

// ── Status inference ────────────────────────────────────────────────────────

type InferredStatus = 'self_pending' | 'sup1_pending' | 'sup2_pending' | 'completed';

function inferStatus(ev: EmployeeEvaluation): InferredStatus {
  if (!ev.evaluationId || ev.selfScore == null) return 'self_pending';
  if (ev.supervisorScore1 == null) return 'sup1_pending';
  if (ev.supervisorScore2 == null) return 'sup2_pending';
  return 'completed';
}

function statusBadge(status: InferredStatus): { label: string; cls: string } {
  switch (status) {
    case 'self_pending': return { label: 'Chờ tự đánh giá', cls: 'bg-yellow-100 text-yellow-800 border border-yellow-300' };
    case 'sup1_pending': return { label: 'Chờ cấp trên 1', cls: 'bg-orange-100 text-orange-800 border border-orange-300' };
    case 'sup2_pending': return { label: 'Chờ cấp trên 2', cls: 'bg-orange-100 text-orange-800 border border-orange-300' };
    case 'completed':    return { label: 'Hoàn thành',     cls: 'bg-green-100 text-green-800 border border-green-300' };
  }
}

// ── Component ───────────────────────────────────────────────────────────────

const EmployeeEvaluationManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canView = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD;

  // Core data
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Period
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Tabs
  const [activeManagementTab, setActiveManagementTab] = useState<'evaluations' | 'calibration'>('evaluations');

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'self_pending' | 'sup_pending' | 'completed'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'QUICK' | 'FULL'>('all');

  // Selected employee
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeEvaluation | null>(null);

  // Detail modal
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationDetailsResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Hooks
  const { data: completionStats } = useCompletionStats(canView ? month : 0, canView ? year : 0);
  const { data: calibrationData, isLoading: calibrationLoading } = useCalibrationHeatmap(
    activeManagementTab === 'calibration' && canView ? month : 0,
    activeManagementTab === 'calibration' && canView ? year : 0
  );

  useEffect(() => {
    loadEvaluations();
  }, [month, year, canView]);

  // Reset selected employee when period changes
  useEffect(() => {
    setSelectedEmployee(null);
  }, [month, year]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const filename = `danh-gia-nhan-vien-T${String(month).padStart(2, '0')}-${year}.xlsx`;
      await apiClient.download(`/employee-evaluations/export.xlsx?month=${month}&year=${year}`, filename);
    } catch {
      setError('Không thể xuất Excel. Vui lòng thử lại.');
    } finally {
      setExportLoading(false);
    }
  };

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

  // ── Sidebar filtered list ────────────────────────────────────────────────

  const sidebarEvaluations = useMemo(() => {
    const q = sidebarSearch.trim().toLowerCase();
    return evaluations.filter(ev => {
      if (q && !ev.employeeCode.toLowerCase().includes(q) && !ev.employeeName.toLowerCase().includes(q)) return false;
      if (modeFilter !== 'all' && ev.mode !== modeFilter) return false;
      const st = inferStatus(ev);
      if (statusFilter === 'self_pending' && st !== 'self_pending') return false;
      if (statusFilter === 'sup_pending' && st !== 'sup1_pending' && st !== 'sup2_pending') return false;
      if (statusFilter === 'completed' && st !== 'completed') return false;
      return true;
    });
  }, [evaluations, sidebarSearch, statusFilter, modeFilter]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Completion Stats Dashboard — shown above split layout */}
      {canView && completionStats && activeManagementTab === 'evaluations' && (
        <div className="space-y-4">
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
              <p className="text-2xl font-bold text-blue-600">{completionStats.completionRate.toFixed(1)}%</p>
            </div>
          </div>
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

      {/* Error / success banners */}
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

      {/* Tabs */}
      {canView && (
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveManagementTab('evaluations')}
            className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeManagementTab === 'evaluations'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Danh sách đánh giá
          </button>
          <button
            onClick={() => setActiveManagementTab('calibration')}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeManagementTab === 'calibration'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Phân bố điểm
          </button>
        </div>
      )}

      {/* Calibration tab */}
      {activeManagementTab === 'calibration' && canView && (
        <div>
          {calibrationLoading ? (
            <div className="py-12 text-center text-gray-500">Đang tải dữ liệu phân bố điểm...</div>
          ) : calibrationData ? (
            <CalibrationDashboard data={calibrationData} month={month} year={year} />
          ) : (
            <div className="py-12 text-center text-gray-500">Không có dữ liệu phân bố điểm cho kỳ này.</div>
          )}
        </div>
      )}

      {/* Evaluations tab */}
      {(activeManagementTab === 'evaluations' || !canView) && (
        <>
          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Đánh giá nhân viên</h2>
            {canView && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExport}
                  disabled={exportLoading}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
                </button>
                <button
                  onClick={createEvaluationsForAllEmployees}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium"
                >
                  {loading ? 'Đang tạo...' : 'Tạo đánh giá hàng loạt'}
                </button>
              </div>
            )}
          </div>

          {/* Split-view layout */}
          <div className="flex gap-4" style={{ height: 'calc(100vh - 22rem)', minHeight: '400px' }}>

            {/* Sidebar */}
            {!sidebarCollapsed && (
              <aside className="w-72 shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                {/* Period selector + controls */}
                <div className="p-3 border-b border-gray-200 space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Kỳ đánh giá</h3>
                    <button
                      onClick={() => setSidebarCollapsed(true)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Thu gọn thanh bên"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Month / Year selects */}
                  <div className="flex gap-2">
                    <select
                      value={month}
                      onChange={(e) => setMonth(Number(e.target.value))}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                    <select
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm nhân viên..."
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status filter chips */}
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { value: 'all', label: 'Tất cả' },
                        { value: 'self_pending', label: 'Chờ tự đánh giá' },
                        { value: 'sup_pending', label: 'Chờ cấp trên' },
                        { value: 'completed', label: 'Hoàn thành' },
                      ] as const
                    ).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                          statusFilter === opt.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Mode filter chips */}
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { value: 'all', label: 'Tất cả' },
                        { value: 'QUICK', label: 'QUICK' },
                        { value: 'FULL', label: 'FULL' },
                      ] as const
                    ).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setModeFilter(opt.value)}
                        className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                          modeFilter === opt.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employee list */}
                <div className="flex-1 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-sm text-gray-500">Đang tải...</div>
                  ) : sidebarEvaluations.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">Không có dữ liệu</div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {sidebarEvaluations.map(ev => {
                        const st = inferStatus(ev);
                        const badge = statusBadge(st);
                        const isSelected = selectedEmployee?.id === ev.id;
                        return (
                          <li key={ev.id}>
                            <button
                              onClick={() => setSelectedEmployee(ev)}
                              className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors flex flex-col gap-0.5 ${
                                isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-medium text-blue-600">{ev.employeeCode}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900 truncate">{ev.employeeName}</span>
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs text-gray-500 truncate">{ev.positionName}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {ev.mode && (
                                    <span className={`text-xs px-1 py-0.5 rounded font-medium ${
                                      ev.mode === 'QUICK' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {ev.mode}
                                    </span>
                                  )}
                                  {ev.supervisorScore2 != null ? (
                                    <span className="text-xs text-gray-500">{ev.supervisorScore2.toFixed(1)}%</span>
                                  ) : ev.supervisorScore1 != null ? (
                                    <span className="text-xs text-gray-500">{ev.supervisorScore1.toFixed(1)}%</span>
                                  ) : ev.selfScore != null ? (
                                    <span className="text-xs text-gray-500">{ev.selfScore.toFixed(1)}%</span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </aside>
            )}

            {/* Right panel */}
            <div className="flex-1 flex flex-col gap-3 overflow-hidden min-w-0">
              {/* Show sidebar toggle when collapsed */}
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="self-start flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                  Hiện thanh bên
                </button>
              )}

              {/* Panel content */}
              {!selectedEmployee ? (
                <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200">
                  <div className="text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Chọn nhân viên ở thanh bên để xem chi tiết</p>
                  </div>
                </div>
              ) : !selectedEmployee.evaluationId ? (
                <div className="flex-1 flex items-center justify-center bg-white rounded-lg border border-gray-200">
                  <div className="text-center text-gray-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Chưa có đánh giá trong kỳ này</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto bg-white rounded-lg border border-gray-200 p-5">
                  {/* Employee header */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {selectedEmployee.employeeCode}
                        </span>
                        {selectedEmployee.mode && (
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            selectedEmployee.mode === 'QUICK'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedEmployee.mode}
                          </span>
                        )}
                        {(() => {
                          const b = statusBadge(inferStatus(selectedEmployee));
                          return (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${b.cls}`}>
                              {b.label}
                            </span>
                          );
                        })()}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{selectedEmployee.employeeName}</h3>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500">{selectedEmployee.positionName}</p>
                        {selectedEmployee.positionId && (
                          <button
                            onClick={() => navigate(`?tab=positions&positionId=${selectedEmployee.positionId}`)}
                            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Xem vị trí
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openDetailModal(selectedEmployee)}
                        disabled={detailLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Eye className="w-4 h-4" />
                        {detailLoading ? 'Đang tải...' : 'Xem chi tiết'}
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            const blob = await employeeEvaluationService.downloadPdf(selectedEmployee.evaluationId!);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `phieu_danh_gia_${selectedEmployee.employeeName.replace(/\s+/g, '_')}_T${String(month).padStart(2, '0')}-${year}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            setTimeout(() => URL.revokeObjectURL(url), 5000);
                          } catch {
                            setError('Không thể tải PDF. Vui lòng thử lại.');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                      >
                        <FileDown className="w-4 h-4" />
                        Xuất PDF
                      </button>
                    </div>
                  </div>

                  {/* Score summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Tự đánh giá</p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedEmployee.selfScore != null ? `${selectedEmployee.selfScore.toFixed(1)}%` : <span className="text-gray-400 text-base">–</span>}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Cấp trên 1</p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedEmployee.supervisorScore1 != null ? `${selectedEmployee.supervisorScore1.toFixed(1)}%` : <span className="text-gray-400 text-base">–</span>}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Cấp trên 2</p>
                      <p className="text-xl font-bold text-gray-800">
                        {selectedEmployee.supervisorScore2 != null ? `${selectedEmployee.supervisorScore2.toFixed(1)}%` : <span className="text-gray-400 text-base">–</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Detail Modal — unchanged */}
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
                          {detail.selfScore != null ? `${detail.selfScore.toFixed(1)}%` : '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                          {detail.supervisorScore1 != null ? `${detail.supervisorScore1.toFixed(1)}%` : '-'}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center text-sm">
                          {detail.supervisorScore2 != null ? `${detail.supervisorScore2.toFixed(1)}%` : '-'}
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
