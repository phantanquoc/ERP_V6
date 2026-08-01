import React, { useState } from 'react';
import { FileText, Download, Loader2, AlertCircle } from 'lucide-react';
import employeeEvaluationService from '../services/employeeEvaluationService';

interface EvaluationPdfPreviewProps {
  evaluationId: string;
  employeeName?: string;
  month?: number;
  year?: number;
  className?: string;
}

const EvaluationPdfPreview: React.FC<EvaluationPdfPreviewProps> = ({
  evaluationId,
  employeeName,
  month,
  year,
  className = '',
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const blob = await employeeEvaluationService.downloadPdf(evaluationId);
      const url = URL.createObjectURL(blob);

      // Build a descriptive filename
      const namePart = employeeName ? `_${employeeName.replace(/\s+/g, '_')}` : '';
      const periodPart = month && year ? `_T${String(month).padStart(2, '0')}-${year}` : '';
      const filename = `phieu_danh_gia${namePart}${periodPart}.pdf`;

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Revoke object URL after a short delay to ensure download begins
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải PDF. Vui lòng thử lại.';
      setError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 text-sm rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Tải phiếu đánh giá PDF"
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Đang tải...</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 text-red-500" />
            <span>Xuất PDF</span>
            <Download className="w-3.5 h-3.5 text-gray-400" />
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default EvaluationPdfPreview;
