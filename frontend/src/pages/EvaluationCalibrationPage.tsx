import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import { useCalibrationHeatmap } from '../hooks/useEmployeeEvaluation';
import CalibrationDashboard from '../components/CalibrationDashboard';

const EvaluationCalibrationPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const canView =
    isAuthenticated &&
    user != null &&
    (user.role === UserRole.ADMIN || user.role === UserRole.DEPARTMENT_HEAD);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView) {
    return <Navigate to="/dashboard" replace />;
  }

  return <EvaluationCalibrationContent />;
};

// Separate content component so hooks don't run on early return paths
const EvaluationCalibrationContent: React.FC = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { data: calibrationData, isLoading } = useCalibrationHeatmap(month, year);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Phân bố điểm đánh giá</h1>
        <div className="flex gap-3">
          <div>
            <label className="text-sm font-medium text-gray-600 mr-2">Tháng</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600 mr-2">Năm</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">Đang tải dữ liệu phân bố điểm...</div>
      ) : calibrationData ? (
        <CalibrationDashboard data={calibrationData} month={month} year={year} />
      ) : (
        <div className="py-16 text-center text-gray-500">Không có dữ liệu phân bố điểm cho kỳ này.</div>
      )}
    </div>
  );
};

export default EvaluationCalibrationPage;
