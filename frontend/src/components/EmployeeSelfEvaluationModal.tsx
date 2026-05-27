import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar } from 'lucide-react';
import { parseNumberInput } from '../utils/numberInput';
import employeeEvaluationService, { EvaluationDetail, EvaluationDetailsResponse } from '../services/employeeEvaluationService';
import notificationService from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import SubordinateEvaluationList from './SubordinateEvaluationList';

interface EmployeeSelfEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId: string | null;
  notificationId?: string;
  evaluationPeriod?: string | null;
  initialTab?: 'self' | 'subordinate' | 'history';
}

interface EvaluationHistory {
  evaluationId: string;
  period: string;
  selfScore: number;
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

  useEffect(() => {
    if (isOpen && evaluationId) {
      loadEvaluationData();
    }
  }, [isOpen, evaluationId]);
  useEffect(() => {
    if (!isOpen) {
      setActiveTab(defaultTab);
      setSelectedSubordinate(null);
      setSubordinateEvaluation(null);
      setSubordinateEditingScores({});
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  useEffect(() => {
    setEvaluationPeriodState(evaluationPeriod || null);
  }, [evaluationPeriod]);



  const loadEvaluationData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load current evaluation details (no isManager — this is self-eval view)
      const detailsData = await employeeEvaluationService.getEvaluationDetails(evaluationId!);
      setDetails(detailsData.details || []);
      // SUGGESTION fix: capture status from response
      setEvaluationStatus(detailsData.status || 'SELF_PENDING');
      if (detailsData.period) {
        setEvaluationPeriodState(detailsData.period);
      }

      // Load evaluation history
      const historyData = await employeeEvaluationService.getEvaluationHistory(evaluationId!);
      setHistory(historyData.history || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu đánh giá');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (detailId: string, score: number) => {
    if (score >= 0 && score <= 100) {
      setEditingScores(prev => ({
        ...prev,
        [detailId]: score,
      }));
    }
  };

  const handleSaveScore = async (detailId: string) => {
    try {
      setSaving(true);
      setError('');
      const score = editingScores[detailId];

      if (score === undefined) return;

      // Self-eval: no isManager param
      await employeeEvaluationService.updateEvaluationDetail(
        detailId,
        score,
        undefined,
        undefined
      );

      setSuccess('Cập nhật điểm đánh giá thành công');
      setEditingScores(prev => {
        const newScores = { ...prev };
        delete newScores[detailId];
        return newScores;
      });

      // Reload data
      await loadEvaluationData();

      // Mark notification as read if provided
      if (notificationId) {
        try {
          await notificationService.markAsRead(notificationId);
        } catch (err) {
          console.error('Error marking notification as read:', err);
        }
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật điểm');
    } finally {
      setSaving(false);
    }
  };

  const handleSubordinateScoreChange = (
    detailId: string,
    field: 'supervisorScore1' | 'supervisorScore2',
    value: number
  ) => {
    if (value < 0 || value > 100) return;

    setSubordinateEditingScores(prev => ({
      ...prev,
      [detailId]: {
        ...prev[detailId],
        [field]: value,
      },
    }));
  };

  const handleSaveSubordinateScore = async (detailId: string) => {
    try {
      setSaving(true);
      setError('');
      const scores = subordinateEditingScores[detailId];

      if (!scores) return;

      // BUG 4: Pass isManager=true since this is a manager evaluating a subordinate
      await employeeEvaluationService.updateEvaluationDetail(
        detailId,
        undefined,
        scores.supervisorScore1,
        scores.supervisorScore2,
        true
      );

      setSuccess('Cập nhật điểm đánh giá cấp dưới thành công');
      setSubordinateEditingScores(prev => {
        const newScores = { ...prev };
        delete newScores[detailId];
        return newScores;
      });

      if (subordinateEvaluation) {
        // BUG 4: Pass isManager=true here as well
        const updated = await employeeEvaluationService.getEvaluationDetails(subordinateEvaluation.evaluationId, true);
        setSubordinateEvaluation(updated);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi cập nhật điểm đánh giá cấp dưới');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
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

                  {/* Evaluation Details Table */}
                  <div className="overflow-x-auto mb-6">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">STT</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Tiêu chí đánh giá</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Trọng số (%)</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Tự đánh giá (0-100)</th>
                          {!selfEvalLocked && (
                            <th className="px-4 py-3 text-center font-semibold text-gray-700">Hành động</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {details.map((detail, index) => (
                          <tr key={detail.detailId} className="border-b border-gray-200 hover:bg-gray-50">
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
                                value={editingScores[detail.detailId!] ?? detail.selfScore ?? ''}
                                onChange={(e) => handleScoreChange(detail.detailId!, parseNumberInput(e.target.value))}
                                className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  selfEvalLocked
                                    ? 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500'
                                    : 'border-gray-300'
                                }`}
                                placeholder="0-100"
                              />
                            </td>
                            {!selfEvalLocked && (
                              <td className="px-4 py-3 text-center">
                                {editingScores[detail.detailId!] !== undefined && (
                                  <button
                                    onClick={() => handleSaveScore(detail.detailId!)}
                                    disabled={saving}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-xs font-medium"
                                  >
                                    <Save className="w-4 h-4" />
                                    Lưu
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary */}
                  {!selfEvalLocked && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-800">
                        <strong>Hướng dẫn:</strong> Vui lòng nhập điểm tự đánh giá từ 0-100 cho mỗi tiêu chí. Điểm cuối cùng sẽ được tính dựa trên trọng số của từng tiêu chí.
                      </p>
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
                              <th className="px-4 py-3 text-center font-semibold text-gray-700">Hành động</th>
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
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    disabled={!selectedSubordinate.isSupervisor1}
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
                                    className={`w-20 px-2 py-1 border rounded text-sm text-center ${
                                      selectedSubordinate.isSupervisor1
                                        ? 'border-gray-300 bg-white'
                                        : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                                    }`}
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    disabled={!selectedSubordinate.isSupervisor2}
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
                                    className={`w-20 px-2 py-1 border rounded text-sm text-center ${
                                      selectedSubordinate.isSupervisor2
                                        ? 'border-gray-300 bg-white'
                                        : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                                    }`}
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {subordinateEditingScores[detail.detailId || ''] && detail.detailId && (
                                    <button
                                      onClick={() => handleSaveSubordinateScore(detail.detailId!)}
                                      disabled={saving}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-xs font-medium"
                                    >
                                      <Save className="w-4 h-4" />
                                      Lưu
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'history' && (
                <>
                  {/* History Tab */}
                  <div className="space-y-3">
                    {history.length > 0 ? (
                      history.map((item) => (
                        <div
                          key={item.evaluationId}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-semibold text-gray-900">{formatPeriod(item.period)}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Cập nhật: {new Date(item.updatedAt).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <div>
                                <div className="text-2xl font-bold text-blue-600">
                                  {item.selfScore.toFixed(1)}%
                                </div>
                                <p className="text-xs text-gray-600">Tự đánh giá</p>
                              </div>
                              {item.score > 0 && (
                                <div>
                                  <div className="text-lg font-semibold text-green-600">
                                    {item.score.toFixed(1)}%
                                  </div>
                                  <p className="text-xs text-gray-600">Điểm tổng hợp</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
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
    </div>
  );
};

export default EmployeeSelfEvaluationModal;
