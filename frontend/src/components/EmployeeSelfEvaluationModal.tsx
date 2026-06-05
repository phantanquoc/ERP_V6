import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { parseNumberInput } from '../utils/numberInput';
import employeeEvaluationService, { EvaluationDetail, EvaluationDetailsResponse } from '../services/employeeEvaluationService';
import notificationService from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import SubordinateEvaluationList from './SubordinateEvaluationList';
import Modal from './Modal';

interface EmployeeSelfEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId: string | null;
  notificationId?: string;
  evaluationPeriod?: string | null;
  initialTab?: 'self' | 'subordinate' | 'history';
  employeeId?: string | null;
  month?: number;
  year?: number;
  onEvaluationCreated?: (evaluationId: string) => void;
}

interface EvaluationHistory {
  evaluationId: string;
  period: string;
  status: string;
  selfScore: number;
  supervisorScore1: number | null;
  supervisorScore2: number | null;
  score: number;
  createdAt: string;
  updatedAt: string;
}

const EmployeeSelfEvaluationModal: React.FC<EmployeeSelfEvaluationModalProps> = ({
  isOpen,
  onClose,
  evaluationId,
  notificationId,
  evaluationPeriod,
  initialTab,
  employeeId,
  month,
  year,
  onEvaluationCreated,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isManager = isAdmin || user?.role === UserRole.DEPARTMENT_HEAD || user?.role === UserRole.TEAM_LEAD;
  const defaultTab = initialTab || (isAdmin ? 'subordinate' : 'self');
  const [activeTab, setActiveTab] = useState<'self' | 'subordinate' | 'history'>(defaultTab);
  const [details, setDetails] = useState<EvaluationDetail[]>([]);
  // SUGGESTION fix: track evaluation status to disable self-eval inputs when done
  const [evaluationStatus, setEvaluationStatus] = useState<string>('SELF_PENDING');
  const [history, setHistory] = useState<EvaluationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingScores, setEditingScores] = useState<{ [key: string]: number }>({});
  const [evaluationPeriodState, setEvaluationPeriodState] = useState<string | null>(evaluationPeriod || null);
  const [selectedSubordinate, setSelectedSubordinate] = useState<any | null>(null);
  const [subordinateEvaluation, setSubordinateEvaluation] = useState<EvaluationDetailsResponse | null>(null);
  const [subordinateEditingScores, setSubordinateEditingScores] = useState<{
    [key: string]: { supervisorScore1?: number; supervisorScore2?: number };
  }>({});
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'self' | 'subordinate' }>({ open: false, type: 'self' });
  const [supervisor1Name, setSupervisor1Name] = useState<string | null>(null);
  const [supervisor2Name, setSupervisor2Name] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [showRubric, setShowRubric] = useState(false);
  const [subordinateComments, setSubordinateComments] = useState<{ [key: string]: string }>({});
  const [previousPeriodScore, setPreviousPeriodScore] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && (evaluationId || (employeeId && month && year))) {
      loadEvaluationData();
    }
  }, [isOpen, evaluationId, employeeId, month, year]);
  useEffect(() => {
    if (!isOpen) {
      setActiveTab(defaultTab);
      setSelectedSubordinate(null);
      setSubordinateEvaluation(null);
      setSubordinateEditingScores({});
      setSubordinateComments({});
      setShowRubric(false);
      setError('');
      setSuccess('');
      setPreviousPeriodScore(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setEvaluationPeriodState(evaluationPeriod || null);
  }, [evaluationPeriod]);



  const loadEvaluationData = async () => {
    // Always ensure evaluation + details exist (backfills missing details)
    let currentEvalId = evaluationId;
    if (employeeId && month && year) {
      try {
        setError('');
        const created = await employeeEvaluationService.createOrUpdateEvaluation(employeeId, month, year);
        currentEvalId = created.id;
        // Notify parent of the new evaluationId so it can update its state
        if (!evaluationId && onEvaluationCreated) {
          onEvaluationCreated(currentEvalId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi tạo đánh giá');
        setLoading(false);
        return;
      }
    }

    if (!currentEvalId || currentEvalId === 'null') {
      setError('Chưa có đánh giá — vui lòng chờ quản lý tạo đánh giá trước khi xem chi tiết');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Load current evaluation details (no isManager — this is self-eval view)
      const detailsData = await employeeEvaluationService.getEvaluationDetails(currentEvalId);
      setDetails(detailsData.details || []);
      setEvaluationStatus(detailsData.status || 'SELF_PENDING');
      setSupervisor1Name(detailsData.supervisor1Name || null);
      setSupervisor2Name(detailsData.supervisor2Name || null);
      if (detailsData.period) {
        setEvaluationPeriodState(detailsData.period);
      }

      // Load evaluation history
      const historyData = await employeeEvaluationService.getEvaluationHistory(currentEvalId);
      const historyList: EvaluationHistory[] = historyData.history || [];
      setHistory(historyList);
      if (!supervisor1Name && historyData.supervisor1Name) setSupervisor1Name(historyData.supervisor1Name);
      if (!supervisor2Name && historyData.supervisor2Name) setSupervisor2Name(historyData.supervisor2Name);

      // Extract previous period score (most recent completed period that isn't the current one)
      const completedPrev = historyList
        .filter(h => (h.status === 'COMPLETED' || h.status === 'ACKNOWLEDGED') && h.evaluationId !== currentEvalId)
        .sort((a, b) => b.period.localeCompare(a.period));
      setPreviousPeriodScore(completedPrev.length > 0 ? completedPrev[0].score : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu đánh giá');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDetailKey = (detail: EvaluationDetail) => detail.detailId ?? detail.responsibilityId;

  const handleScoreChange = (detailKey: string, score: number) => {
    if (score < 0 || score > 100) return;
    setEditingScores(prev => ({
      ...prev,
      [detailKey]: score,
    }));
  };

  const handleSubordinateScoreChange = (
    detailId: string | null | undefined,
    field: 'supervisorScore1' | 'supervisorScore2',
    value: number
  ) => {
    if (!detailId || value < 0 || value > 100) return;

    setSubordinateEditingScores(prev => ({
      ...prev,
      [detailId]: {
        ...prev[detailId],
        [field]: value,
      },
    }));
  };

  const handleSubordinateCommentChange = (detailId: string, comment: string) => {
    setSubordinateComments(prev => ({ ...prev, [detailId]: comment }));
  };

  const handleAcknowledge = async () => {
    if (!evaluationId) return;
    setAcknowledging(true);
    setError('');
    try {
      await employeeEvaluationService.acknowledgeEvaluation(evaluationId);
      setEvaluationStatus('ACKNOWLEDGED');
      setSuccess('Đã xác nhận đã xem kết quả đánh giá');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xác nhận đánh giá');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleSaveAllScores = async () => {
    const entries = details
      .filter(d => d.detailId && editingScores[getDetailKey(d)] !== undefined)
      .map(d => ({ detailId: d.detailId!, score: editingScores[getDetailKey(d)] }));

    if (entries.length === 0) {
      setError('Không có điểm nào thay đổi');
      return;
    }

    setConfirmDialog({ open: false, type: 'self' });
    setSaving(true);
    setError('');
    try {
      for (const entry of entries) {
        await employeeEvaluationService.updateEvaluationDetail(entry.detailId, entry.score, undefined, undefined);
      }
      setSuccess(`Đã lưu thành công ${entries.length} tiêu chí`);
      setEditingScores({});
      await loadEvaluationData();
      if (notificationId) {
        try { await notificationService.markAsRead(notificationId); } catch {}
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi lưu điểm đánh giá');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllSubordinateScores = async () => {
    const entries = subordinateEvaluation?.details
      .filter(d => d.detailId && subordinateEditingScores[d.detailId])
      .map(d => ({
        detailId: d.detailId!,
        scores: subordinateEditingScores[d.detailId!],
      })) ?? [];

    if (entries.length === 0) {
      setError('Không có điểm nào thay đổi');
      return;
    }

    setConfirmDialog({ open: false, type: 'subordinate' });
    setSaving(true);
    setError('');
    try {
      for (const entry of entries) {
        const comment = subordinateComments[entry.detailId];
        await employeeEvaluationService.updateEvaluationDetail(
          entry.detailId, undefined, entry.scores.supervisorScore1, entry.scores.supervisorScore2, true, comment
        );
      }
      setSuccess(`Đã lưu thành công ${entries.length} tiêu chí`);
      setSubordinateEditingScores({});
      setSubordinateComments({});
      if (subordinateEvaluation) {
        const updated = await employeeEvaluationService.getEvaluationDetails(subordinateEvaluation.evaluationId, true);
        setSubordinateEvaluation(updated);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi lưu điểm đánh giá');
    } finally {
      setSaving(false);
    }
  };

  const parsePeriodToMonthYear = (period: string | null): { month: number; year: number } => {
    if (!period) {
      const now = new Date();
      return { month: now.getMonth() + 1, year: now.getFullYear() };
    }

    const [yearStr, monthStr] = period.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);

    if (!year || !month) {
      const now = new Date();
      return { month: now.getMonth() + 1, year: now.getFullYear() };
    }

    return { month, year };
  };


  if (!isOpen) return null;

  const { month: subordinateMonth, year: subordinateYear } = parsePeriodToMonthYear(evaluationPeriodState);

  // SUGGESTION fix: determine if self-eval inputs should be disabled
  const selfEvalLocked = evaluationStatus !== 'SELF_PENDING';

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    return `Tháng ${month}/${year}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
        {/* Header — shrink-0, outside scroll */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-gray-800">Đánh giá nhân viên</h3>
              <p className="text-sm text-gray-600 mt-1">Xem và cập nhật đánh giá của bạn</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            {!isAdmin && (
              <button
                onClick={() => setActiveTab('self')}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'self'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Tự đánh giá
              </button>
            )}
            {isManager && (
              <button
                onClick={() => {
                  setActiveTab('subordinate');
                  setSelectedSubordinate(null);
                  setSubordinateEvaluation(null);
                  setSubordinateEditingScores({});
                }}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  activeTab === 'subordinate'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Đánh giá cấp dưới
              </button>
            )}
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Lịch sử đánh giá
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          ) : (
            <>
              {/* Tab Content */}
              {activeTab === 'self' && (
                <>
                  {/* SUGGESTION fix: show locked message when status is past SELF_PENDING */}
                  {selfEvalLocked && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-700">Bạn đã hoàn thành tự đánh giá. Điểm tự đánh giá không thể thay đổi.</p>
                    </div>
                  )}

                  {/* Acknowledge button when status is COMPLETED */}
                  {evaluationStatus === 'COMPLETED' && (
                    <div className="mb-4 flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">Đánh giá đã hoàn thành. Bấm xác nhận để ghi nhận bạn đã xem kết quả.</p>
                      <button
                        onClick={handleAcknowledge}
                        disabled={acknowledging}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm font-medium shadow-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {acknowledging ? 'Đang xác nhận...' : 'Xác nhận đã xem'}
                      </button>
                    </div>
                  )}

                  {/* Acknowledged badge */}
                  {evaluationStatus === 'ACKNOWLEDGED' && (
                    <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-700">Đã xác nhận — Bạn đã xem kết quả đánh giá này</span>
                    </div>
                  )}

                  {/* Rubric guide — collapsible */}
                  {!selfEvalLocked && (
                    <div className="mb-4">
                      <button
                        onClick={() => setShowRubric(r => !r)}
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Info className="w-4 h-4" />
                        {showRubric ? 'Ẩn hướng dẫn thang điểm' : 'Xem hướng dẫn thang điểm'}
                      </button>
                      {showRubric && (
                        <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                          <p className="font-semibold text-blue-800 mb-2">Hướng dẫn chấm điểm (0-100):</p>
                          <ul className="space-y-1 text-blue-700">
                            <li><strong>1-20 — Không đạt:</strong> Chưa hoàn thành nhiệm vụ</li>
                            <li><strong>21-40 — Cần cải thiện:</strong> Hoàn thành dưới 50%</li>
                            <li><strong>41-60 — Đạt yêu cầu:</strong> Hoàn thành 50-75%</li>
                            <li><strong>61-80 — Tốt:</strong> Hoàn thành 75-95%</li>
                            <li><strong>81-100 — Xuất sắc:</strong> Hoàn thành trên 95%, có sáng kiến</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress indicator + previous period reference — only while editing */}
                  {!selfEvalLocked && details.length > 0 && (() => {
                    const total = details.length;
                    const scored = details.filter(d => {
                      const key = getDetailKey(d);
                      const editing = editingScores[key];
                      return editing !== undefined ? true : d.selfScore !== null && d.selfScore !== undefined;
                    }).length;
                    const pct = total > 0 ? Math.round((scored / total) * 100) : 0;
                    return (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">
                            Đã chấm <strong>{scored}/{total}</strong> tiêu chí
                          </span>
                          {previousPeriodScore !== null && (
                            <span className="text-xs text-gray-500">
                              Tham khảo — Kỳ trước: <strong>{previousPeriodScore.toFixed(1)}%</strong>
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                   {/* Evaluation Details Table */}
                   <div className="overflow-x-auto mb-6">
                     {details.length === 0 ? (
                       <div className="text-center py-8 text-gray-500">
                         <p className="text-sm">Chưa có tiêu chí đánh giá. Vui lòng liên hệ quản lý để cập nhật vị trí và trách nhiệm.</p>
                       </div>
                     ) : (
                     <table className="w-full text-sm">
                       <thead>
                         <tr className="bg-gray-50 border-b border-gray-200">
                           <th className="px-4 py-3 text-left font-semibold text-gray-700">STT</th>
                           <th className="px-4 py-3 text-left font-semibold text-gray-700">Tiêu chí đánh giá</th>
                           <th className="px-4 py-3 text-left font-semibold text-gray-700">Trọng số (%)</th>
                           <th className="px-4 py-3 text-left font-semibold text-gray-700">Tự đánh giá (0-100)</th>
                           {details.some(d => d.supervisorScore1 != null) && (
                             <th className="px-4 py-3 text-center font-semibold text-gray-700">
                               {supervisor1Name || 'Cấp trên 1'}
                             </th>
                           )}
                           {details.some(d => d.supervisorScore2 != null) && (
                             <th className="px-4 py-3 text-center font-semibold text-gray-700">
                               {supervisor2Name || 'Cấp trên 2'}
                             </th>
                           )}
                         </tr>
                       </thead>
                      <tbody>
                         {details.map((detail, index) => (
                           <tr key={detail.detailId ?? detail.responsibilityId ?? `detail-${index}`} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">{detail.title}</p>
                                <p className="text-xs text-gray-600 mt-1">{detail.description}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{detail.weight}%</td>
                             <td className="px-4 py-3">
                               <input
                                 type="number"
                                 min="0"
                                 max="100"
                                 disabled={selfEvalLocked}
                                 value={editingScores[getDetailKey(detail)] ?? detail.selfScore ?? ''}
                                 onChange={(e) => handleScoreChange(getDetailKey(detail), parseNumberInput(e.target.value))}
                                className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  selfEvalLocked
                                    ? 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500'
                                    : 'border-gray-300'
                                }`}
                                placeholder="0-100"
                               />
                            </td>
                            {details.some(d => d.supervisorScore1 != null) && (
                              <td className="px-4 py-3 text-center text-gray-700">
                                {detail.supervisorScore1 != null ? detail.supervisorScore1 : '-'}
                              </td>
                            )}
                            {details.some(d => d.supervisorScore2 != null) && (
                              <td className="px-4 py-3 text-center text-gray-700">
                                {detail.supervisorScore2 != null ? detail.supervisorScore2 : '-'}
                              </td>
                            )}
                          </tr>
                        ))}
                       </tbody>
                     </table>
                     )}
                   </div>

                   {/* Summary + Save All */}
                   {!selfEvalLocked && (
                     <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                       <p className="text-sm text-blue-800">
                         <strong>Hướng dẫn:</strong> Nhập điểm 0-100 cho mỗi tiêu chí, sau đó bấm <strong>Lưu tất cả</strong>.
                       </p>
                       <button
                         onClick={() => setConfirmDialog({ open: true, type: 'self' })}
                         disabled={saving || Object.keys(editingScores).length === 0}
                         className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                       >
                         <Save className="w-4 h-4" />
                         Lưu tất cả
                       </button>
                     </div>
                   )}
                </>
              )}

              {activeTab === 'subordinate' && isManager && (
                <>
                  {!selectedSubordinate && (
                    <div className="mb-6">
                      <SubordinateEvaluationList
                        month={subordinateMonth}
                        year={subordinateYear}
                        onEvaluate={(subordinate, details) => {
                          setSelectedSubordinate(subordinate);
                          setSubordinateEvaluation(details);
                          setSubordinateEditingScores({});
                        }}
                      />
                    </div>
                  )}

                  {selectedSubordinate && subordinateEvaluation && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {subordinateEvaluation.employeeCode} - {subordinateEvaluation.employeeName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {subordinateEvaluation.positionName} · {formatPeriod(subordinateEvaluation.period)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSubordinate(null);
                            setSubordinateEvaluation(null);
                            setSubordinateEditingScores({});
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          ← Quay lại danh sách
                        </button>
                      </div>

                      {(() => {
                        const evalStatus = subordinateEvaluation.status;
                        const canEditSup1 = selectedSubordinate.isSupervisor1 && evalStatus === 'SUPERVISOR1_PENDING';
                        const canEditSup2 = selectedSubordinate.isSupervisor2 && evalStatus === 'SUPERVISOR2_PENDING';
                        const isReadOnly = !canEditSup1 && !canEditSup2;

                        return (
                          <>
                            {isReadOnly && (
                              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                {evalStatus === 'COMPLETED'
                                  ? 'Đánh giá đã hoàn thành. Không thể chỉnh sửa.'
                                  : evalStatus === 'SELF_PENDING'
                                    ? 'Nhân viên chưa hoàn thành tự đánh giá.'
                                    : evalStatus === 'SUPERVISOR2_PENDING' && selectedSubordinate.isSupervisor1
                                      ? 'Bạn đã đánh giá xong. Đang chờ cấp trên 2.'
                                      : evalStatus === 'SUPERVISOR1_PENDING' && selectedSubordinate.isSupervisor2
                                        ? 'Đang chờ cấp trên 1 đánh giá trước.'
                                        : 'Không thể chỉnh sửa ở trạng thái hiện tại.'}
                              </div>
                            )}

                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">STT</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Trách nhiệm</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Tỷ trọng (%)</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Cá nhân tự đánh giá</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Cấp trên 1</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Cấp trên 2</th>
                                    {(canEditSup1 || canEditSup2) && (
                                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Nhận xét</th>
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {subordinateEvaluation.details.map(detail => (
                                    <tr
                                      key={detail.detailId || detail.responsibilityId}
                                      className="border-b border-gray-200 hover:bg-gray-50"
                                    >
                                      <td className="px-4 py-3 text-gray-700">{detail.stt}</td>
                                      <td className="px-4 py-3">
                                        <div>
                                          <p className="font-medium text-gray-900">{detail.title}</p>
                                          <p className="text-xs text-gray-600 mt-1">{detail.description}</p>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center text-gray-700">{detail.weight}%</td>
                                      <td className="px-4 py-3 text-center text-gray-700">
                                        {detail.selfScore ?? '-'}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {canEditSup1 ? (
                                          <>
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              value={
                                                subordinateEditingScores[detail.detailId || '']?.supervisorScore1 ??
                                                detail.supervisorScore1 ??
                                                ''
                                              }
                                              onChange={(e) =>
                                                detail.detailId &&
                                                handleSubordinateScoreChange(
                                                  detail.detailId,
                                                  'supervisorScore1',
                                                  parseNumberInput(e.target.value)
                                                )
                                              }
                                              className="w-20 px-2 py-1 border border-gray-300 bg-white rounded text-sm text-center"
                                            />
                                            {(() => {
                                              const entered = subordinateEditingScores[detail.detailId || '']?.supervisorScore1;
                                              if (entered !== undefined && detail.selfScore !== null && detail.selfScore !== undefined) {
                                                const diff = Math.abs(entered - detail.selfScore);
                                                if (diff > 20) {
                                                  return (
                                                    <p className="text-xs text-yellow-600 mt-1">
                                                      Lệch {diff} điểm so với tự đánh giá
                                                    </p>
                                                  );
                                                }
                                              }
                                              return null;
                                            })()}
                                          </>
                                        ) : (
                                          <span className="text-sm text-gray-700">{detail.supervisorScore1 ?? '-'}</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {canEditSup2 ? (
                                          <>
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              value={
                                                subordinateEditingScores[detail.detailId || '']?.supervisorScore2 ??
                                                detail.supervisorScore2 ??
                                                ''
                                              }
                                              onChange={(e) =>
                                                detail.detailId &&
                                                handleSubordinateScoreChange(
                                                  detail.detailId,
                                                  'supervisorScore2',
                                                  parseNumberInput(e.target.value)
                                                )
                                              }
                                              className="w-20 px-2 py-1 border border-gray-300 bg-white rounded text-sm text-center"
                                            />
                                            {(() => {
                                              const entered = subordinateEditingScores[detail.detailId || '']?.supervisorScore2;
                                              if (entered !== undefined && detail.selfScore !== null && detail.selfScore !== undefined) {
                                                const diff = Math.abs(entered - detail.selfScore);
                                                if (diff > 20) {
                                                  return (
                                                    <p className="text-xs text-yellow-600 mt-1">
                                                      Lệch {diff} điểm so với tự đánh giá
                                                    </p>
                                                  );
                                                }
                                              }
                                              return null;
                                            })()}
                                          </>
                                        ) : (
                                          <span className="text-sm text-gray-700">{detail.supervisorScore2 ?? '-'}</span>
                                        )}
                                      </td>
                                      {(canEditSup1 || canEditSup2) && (
                                        <td className="px-4 py-3">
                                          <textarea
                                            rows={2}
                                            value={detail.detailId ? (subordinateComments[detail.detailId] ?? '') : ''}
                                            onChange={(e) => detail.detailId && handleSubordinateCommentChange(detail.detailId, e.target.value)}
                                            placeholder="Nhận xét (tùy chọn)"
                                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          />
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {!isReadOnly && Object.keys(subordinateEditingScores).length > 0 && (
                              <div className="flex justify-end mt-4">
                                <button
                                  onClick={() => setConfirmDialog({ open: true, type: 'subordinate' })}
                                  disabled={saving}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium shadow-sm"
                                >
                                  <Save className="w-4 h-4" />
                                  Lưu tất cả
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'history' && (
                <>
                  {/* History Tab */}
                  <div className="overflow-x-auto">
                    {history.length > 0 ? (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">Kỳ đánh giá</th>
                            <th className="px-4 py-3 text-center font-semibold text-blue-700">Tự đánh giá</th>
                            {history.some(h => h.supervisorScore1 != null) && (
                              <th className="px-4 py-3 text-center font-semibold text-orange-700">
                                <div>Cấp trên 1</div>
                                {supervisor1Name && <div className="text-xs font-normal text-gray-500">{supervisor1Name}</div>}
                              </th>
                            )}
                            {history.some(h => h.supervisorScore2 != null) && (
                              <th className="px-4 py-3 text-center font-semibold text-purple-700">
                                <div>Cấp trên 2</div>
                                {supervisor2Name && <div className="text-xs font-normal text-gray-500">{supervisor2Name}</div>}
                              </th>
                            )}
                            <th className="px-4 py-3 text-center font-semibold text-green-700">Tổng hợp</th>
                            <th className="px-4 py-3 text-center font-semibold text-gray-700">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item) => (
                            <tr key={item.evaluationId} className="border-b border-gray-200 hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <p className="font-medium text-gray-900">{formatPeriod(item.period)}</p>
                                <p className="text-xs text-gray-500">{new Date(item.updatedAt).toLocaleDateString('vi-VN')}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-lg font-bold text-blue-600">{item.selfScore.toFixed(1)}</span>
                              </td>
                              {history.some(h => h.supervisorScore1 != null) && (
                                <td className="px-4 py-3 text-center">
                                  {item.supervisorScore1 != null ? (
                                    <span className="text-lg font-semibold text-orange-600">{item.supervisorScore1.toFixed(1)}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              )}
                              {history.some(h => h.supervisorScore2 != null) && (
                                <td className="px-4 py-3 text-center">
                                  {item.supervisorScore2 != null ? (
                                    <span className="text-lg font-semibold text-purple-600">{item.supervisorScore2.toFixed(1)}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              )}
                              <td className="px-4 py-3 text-center">
                                {item.score > 0 ? (
                                  <span className="text-lg font-bold text-green-600">{item.score.toFixed(1)}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {item.status === 'COMPLETED' ? (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">Hoàn thành</span>
                                ) : item.status === 'ACKNOWLEDGED' ? (
                                  <span className="px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded">Đã xác nhận</span>
                                ) : (
                                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">Đang đánh giá</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600">Chưa có lịch sử đánh giá</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Close Button */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Modal isOpen={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, type: 'self' })} showBackdrop closeOnBackdrop={false}>
        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Xác nhận lưu</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">
              {confirmDialog.type === 'self'
                ? 'Bạn có chắc chắn muốn lưu tất cả điểm tự đánh giá?'
                : 'Bạn có chắc chắn muốn lưu tất cả điểm đánh giá cấp dưới?'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ open: false, type: 'self' })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={() => confirmDialog.type === 'self' ? handleSaveAllScores() : handleSaveAllSubordinateScores()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
              >
                {saving ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
      </Modal>
    </Modal>
  );
};

export default EmployeeSelfEvaluationModal;
