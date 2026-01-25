import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { privateFeedbackService, FeedbackType } from '../services/privateFeedbackService';

interface PrivateFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: FeedbackType; // 'GOP_Y' hoặc 'NEU_KHO_KHAN'
  onSuccess?: () => void;
}

const PrivateFeedbackModal: React.FC<PrivateFeedbackModalProps> = ({
  isOpen,
  onClose,
  type,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    content: '',
    notes: '',
    purpose: '', // Chỉ cho GOP_Y
    solution: '', // Chỉ cho NEU_KHO_KHAN
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isGopY = type === 'GOP_Y';
  const title = isGopY ? 'Góp ý riêng' : 'Nêu khó khăn';
  const contentLabel = isGopY ? 'Nội dung góp ý' : 'Nội dung khó khăn';

  useEffect(() => {
    if (isOpen) {
      // Reset form khi mở modal
      setFormData({
        content: '',
        notes: '',
        purpose: '',
        solution: ''
      });
      setSelectedFiles([]);
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.content.trim()) {
      newErrors.content = `${contentLabel} không được để trống`;
    }

    if (isGopY && !formData.purpose.trim()) {
      newErrors.purpose = 'Mục đích góp ý không được để trống';
    }

    if (!isGopY && !formData.solution.trim()) {
      newErrors.solution = 'Giải pháp đề xuất không được để trống';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Tạo FormData để gửi file
      const formDataToSend = new FormData();
      formDataToSend.append('type', type);
      formDataToSend.append('content', formData.content);
      if (formData.notes) formDataToSend.append('notes', formData.notes);
      if (isGopY && formData.purpose) formDataToSend.append('purpose', formData.purpose);
      if (!isGopY && formData.solution) formDataToSend.append('solution', formData.solution);

      // Thêm files
      selectedFiles.forEach((file) => {
        formDataToSend.append('files', file);
      });

      // Gọi API với FormData
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Vui lòng đăng nhập lại');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + ''}/private-feedbacks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Không set Content-Type khi gửi FormData, browser sẽ tự set
        },
        body: formDataToSend
      });

      const result = await response.json();
      console.log('Response:', result);

      if (!response.ok) {
        console.error('Error response:', result);
        throw new Error(result.message || result.error || 'Lỗi khi gửi feedback');
      }

      alert(`${title} đã được gửi thành công!`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      alert(error.message || `Lỗi khi gửi ${title.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Giới hạn 5 files
    if (selectedFiles.length + files.length > 5) {
      alert('Chỉ được chọn tối đa 5 files');
      return;
    }

    // Kiểm tra kích thước file (max 10MB mỗi file)
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert('Mỗi file không được vượt quá 10MB');
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Ngày tháng (auto) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ngày tháng
            </label>
            <input
              type="text"
              value={new Date().toLocaleDateString('vi-VN')}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
            />
          </div>

          {/* Nội dung góp ý / khó khăn */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {contentLabel} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              rows={4}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.content ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={`Nhập ${contentLabel.toLowerCase()}...`}
              disabled={isSubmitting}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-500">{errors.content}</p>
            )}
          </div>

          {/* Mục đích góp ý (chỉ cho GOP_Y) */}
          {isGopY && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mục đích góp ý <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.purpose}
                onChange={(e) => handleInputChange('purpose', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.purpose ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập mục đích góp ý..."
                disabled={isSubmitting}
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-500">{errors.purpose}</p>
              )}
            </div>
          )}

          {/* Giải pháp đề xuất (chỉ cho NEU_KHO_KHAN) */}
          {!isGopY && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Giải pháp đề xuất <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.solution}
                onChange={(e) => handleInputChange('solution', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.solution ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Nhập giải pháp đề xuất..."
                disabled={isSubmitting}
              />
              {errors.solution && (
                <p className="mt-1 text-sm text-red-500">{errors.solution}</p>
              )}
            </div>
          )}

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ghi chú
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập ghi chú (tùy chọn)..."
              disabled={isSubmitting}
            />
          </div>

          {/* File kèm theo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File kèm theo (Tối đa 5 files, mỗi file &lt; 10MB)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                disabled={isSubmitting}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  Click để chọn file
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JPG, PNG, PDF, DOC, DOCX, XLS, XLSX, TXT
                </p>
              </label>
            </div>

            {/* Danh sách file đã chọn */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Gửi'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrivateFeedbackModal;

