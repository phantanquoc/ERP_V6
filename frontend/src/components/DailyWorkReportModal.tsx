import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FileText,
  Award,
  AlertCircle,
  Clock,
  CheckCircle,
  TrendingUp,
  Paperclip,
} from 'lucide-react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import dailyWorkReportService, {
  DailyWorkReport,
  CreateDailyWorkReportRequest,
} from '../services/dailyWorkReportService';

interface DailyWorkReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report?: DailyWorkReport | null;
  onSuccess?: () => void;
}

const DailyWorkReportModal: React.FC<DailyWorkReportModalProps> = ({
  isOpen,
  onClose,
  report,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateDailyWorkReportRequest>({
    reportDate: new Date().toISOString().split('T')[0],
    workDescription: '',
    achievements: '',
    challenges: '',
    planForNextDay: '',
    workHours: 8,
    status: 'SUBMITTED',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (report) {
        // Edit mode
        setFormData({
          reportDate: new Date(report.reportDate).toISOString().split('T')[0],
          workDescription: report.workDescription,
          achievements: report.achievements || '',
          challenges: report.challenges || '',
          planForNextDay: report.planForNextDay || '',
          workHours: report.workHours || 8,
          status: report.status,
        });
      } else {
        // Create mode
        setFormData({
          reportDate: new Date().toISOString().split('T')[0],
          workDescription: '',
          achievements: '',
          challenges: '',
          planForNextDay: '',
          workHours: 8,
          status: 'SUBMITTED',
        });
      }
      setErrors({});
      setSubmitSuccess(false);
      setSelectedFiles([]);
    }
  }, [isOpen, report]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.reportDate) {
      newErrors.reportDate = 'Vui lòng chọn ngày báo cáo';
    }

    if (!formData.workDescription.trim()) {
      newErrors.workDescription = 'Vui lòng mô tả công việc đã làm';
    }

    if (formData.workHours && (formData.workHours < 0 || formData.workHours > 24)) {
      newErrors.workHours = 'Số giờ làm việc phải từ 0 đến 24';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare attachments data
      let attachmentsData = formData.attachments;
      if (selectedFiles.length > 0) {
        // Convert files to attachment objects (in real app, upload to server first)
        const fileAttachments = selectedFiles.map(file => ({
          fileName: file.name,
          fileSize: file.size,
          fileUrl: URL.createObjectURL(file), // Temporary URL - in production, upload to server
          uploadedAt: new Date().toISOString(),
        }));
        attachmentsData = JSON.stringify(fileAttachments);
      }

      const dataToSubmit = {
        ...formData,
        attachments: attachmentsData,
      };

      if (report) {
        // Update existing report
        await dailyWorkReportService.updateReport(report.id, dataToSubmit);
      } else {
        // Create new report
        await dailyWorkReportService.createReport(dataToSubmit);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Có lỗi xảy ra khi lưu báo cáo',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">
                {report ? 'Cập nhật báo cáo công việc' : 'Báo cáo công việc hàng ngày'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {submitSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {report ? 'Cập nhật thành công!' : 'Gửi báo cáo thành công!'}
              </h3>
              <p className="text-gray-600">Báo cáo của bạn đã được lưu</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Report Date */}
              <DatePicker
                label="Ngày báo cáo"
                value={formData.reportDate}
                onChange={(date) => setFormData({ ...formData, reportDate: date })}
                error={errors.reportDate}
                required
              />

              {/* Work Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số giờ làm việc
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={formData.workHours}
                    onChange={(e) => setFormData({ ...formData, workHours: parseFloat(e.target.value) })}
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.workHours ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="8"
                  />
                </div>
                {errors.workHours && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.workHours}
                  </p>
                )}
              </div>

              {/* Work Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả công việc đã làm <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.workDescription}
                  onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                  rows={4}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    errors.workDescription ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Mô tả chi tiết công việc bạn đã thực hiện trong ngày..."
                />
                {errors.workDescription && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.workDescription}
                  </p>
                )}
              </div>

              {/* Achievements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thành tựu/Kết quả đạt được
                </label>
                <div className="relative">
                  <Award className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.achievements}
                    onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Những thành tựu hoặc kết quả tích cực..."
                  />
                </div>
              </div>

              {/* Challenges */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Khó khăn/Vấn đề gặp phải
                </label>
                <div className="relative">
                  <AlertCircle className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.challenges}
                    onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Những khó khăn hoặc vấn đề cần hỗ trợ..."
                  />
                </div>
              </div>

              {/* Plan for Next Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kế hoạch cho ngày hôm sau
                </label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <textarea
                    value={formData.planForNextDay}
                    onChange={(e) => setFormData({ ...formData, planForNextDay: e.target.value })}
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Kế hoạch công việc cho ngày tiếp theo..."
                  />
                </div>
              </div>

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File đính kèm
                </label>
                <div className="space-y-3">
                  {/* Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors"
                    >
                      <Paperclip className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Chọn file để đính kèm</span>
                    </label>
                  </div>

                  {/* File List */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <Paperclip className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {errors.submit}
                  </p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:from-green-700 hover:to-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  disabled={isSubmitting}
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Đang lưu...' : report ? 'Cập nhật' : 'Gửi báo cáo'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DailyWorkReportModal;

