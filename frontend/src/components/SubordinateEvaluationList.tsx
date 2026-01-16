import { useState, useEffect } from 'react';
import { Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import employeeEvaluationService, { EvaluationDetailsResponse } from '@services/employeeEvaluationService';

interface Subordinate {
  userId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  evaluationId: string;
  period: string;
  selfScorePercentage: number;
  supervisorScore1Percentage: number;
  supervisorScore2Percentage: number;
  status: string;
  isSupervisor1: boolean;
  isSupervisor2: boolean;
}

interface SubordinateEvaluationListProps {
  month: number;
  year: number;
  onEvaluate: (subordinate: Subordinate, details: EvaluationDetailsResponse) => void;
}

const SubordinateEvaluationList = ({ month, year, onEvaluate }: SubordinateEvaluationListProps) => {
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubordinates();
  }, [month, year]);

  const loadSubordinates = async () => {
    try {
      setLoading(true);
      const data = await employeeEvaluationService.getSubordinatesForEvaluation(month, year);
      setSubordinates(data || []);
      setError('');
    } catch (err) {
      setError('Lỗi tải danh sách nhân viên cấp dưới');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string; icon: any } } = {
      'SELF_PENDING': { label: 'Chờ tự đánh giá', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'SUPERVISOR1_PENDING': { label: 'Chờ cấp trên 1', color: 'bg-blue-100 text-blue-800', icon: Clock },
      'SUPERVISOR2_PENDING': { label: 'Chờ cấp trên 2', color: 'bg-purple-100 text-purple-800', icon: Clock },
      'COMPLETED': { label: 'Hoàn thành', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'NOT_STARTED': { label: 'Chưa bắt đầu', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
    };

    const config = statusMap[status] || statusMap['NOT_STARTED'];
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </div>
    );
  };

  const handleViewEvaluation = async (subordinate: Subordinate) => {
    try {
      const details = await employeeEvaluationService.getEvaluationDetails(subordinate.evaluationId);
      onEvaluate(subordinate, details);
    } catch (err) {
      setError('Lỗi tải chi tiết đánh giá');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  if (subordinates.length === 0) {
    return <div className="p-8 text-center text-gray-500">Không có nhân viên cấp dưới</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">MNV</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Tên NV</th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Vị trí</th>
            <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Tự đánh giá</th>
            <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Cấp trên 1</th>
            <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Cấp trên 2</th>
            <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Trạng thái</th>
            <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {subordinates.map(subordinate => (
            <tr key={subordinate.employeeId} className="border-b hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{subordinate.employeeCode}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{subordinate.employeeName}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{subordinate.positionName}</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{subordinate.selfScorePercentage.toFixed(1)}%</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{subordinate.supervisorScore1Percentage.toFixed(1)}%</td>
              <td className="px-6 py-4 text-center text-sm text-gray-900">{subordinate.supervisorScore2Percentage.toFixed(1)}%</td>
              <td className="px-6 py-4 text-center text-sm">{getStatusBadge(subordinate.status)}</td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => handleViewEvaluation(subordinate)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Xem chi tiết đánh giá"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubordinateEvaluationList;

