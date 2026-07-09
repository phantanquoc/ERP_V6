import React from 'react';
import { TrendingDown, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { PayrollPreview } from '../services/employeeEvaluationService';

interface PayrollImpactPanelProps {
  preview: PayrollPreview | null | undefined;
  isLoading?: boolean;
}

const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
};

const PayrollImpactPanel: React.FC<PayrollImpactPanelProps> = ({ preview, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Đang tải thông tin lương...</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        Không có dữ liệu ảnh hưởng lương.
      </div>
    );
  }

  const deductionPct = preview.currentSup2Percentage > 0
    ? ((preview.projectedDeduction / preview.kpiBonus) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingDown className="w-4 h-4 text-blue-600" />
        <h4 className="text-sm font-semibold text-gray-800">Ảnh hưởng đến lương KPI</h4>
        {preview.isFinalized ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-3 h-3" />
            Đã xác định
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
            <AlertCircle className="w-3 h-3" />
            Dự kiến
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Thưởng KPI</p>
          <p className="text-base font-bold text-blue-700">{formatVND(preview.kpiBonus)}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Điểm CT2 hiện tại</p>
          <p className="text-base font-bold text-gray-700">{preview.currentSup2Percentage.toFixed(1)}%</p>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Khấu trừ dự kiến</p>
          <p className="text-base font-bold text-red-600">
            -{formatVND(preview.projectedDeduction)}
            <span className="text-xs font-normal text-gray-400 ml-1">({deductionPct}%)</span>
          </p>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Thực nhận dự kiến</p>
          <p className="text-base font-bold text-green-700">{formatVND(preview.projectedNet)}</p>
        </div>
      </div>

      {!preview.isFinalized && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800">
            Đây là giá trị <strong>dự kiến</strong> dựa trên điểm hiện tại.
            Giá trị chính thức sẽ được xác định sau khi đánh giá hoàn thành và được phòng kế toán xác nhận.
          </p>
        </div>
      )}
    </div>
  );
};

export default PayrollImpactPanel;
