import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import { overtimePlanService, CreateOvertimePlanData } from '../services/overtimePlanService';
import { TaskPriority } from '../services/taskService';
import { X, Calendar, FileText, AlertCircle, Clock, ChevronDown, User } from 'lucide-react';
import FileUpload from './FileUpload';
import { useAuth } from '../contexts/AuthContext';

interface CreateOvertimePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when plan is created/updated successfully — tells parent to switch to overtime tab */
  onSuccess?: () => void;
  /** Called after onSuccess — tells parent to switch to the overtime tab */
  onSwitchToTab?: () => void;
  planId?: string;
  initialData?: Partial<Omit<CreateOvertimePlanData, 'files'>> & { nguoiThamGiaUserIds?: string[] };
}

const PRIORITY_OPTIONS = [
  { value: TaskPriority.THAP, label: '🟢 Thấp' },
  { value: TaskPriority.TRUNG_BINH, label: '🟡 Trung bình' },
  { value: TaskPriority.CAO, label: '🟠 Cao' },
  { value: TaskPriority.KHAN_CAP, label: '🔴 Khẩn cấp' },
];

const CreateOvertimePlanModal: React.FC<CreateOvertimePlanModalProps> = ({ isOpen, onClose, onSuccess, onSwitchToTab, planId, initialData }) => {
  const isEditMode = !!planId;
  const { user } = useAuth();
  const defaultForm: CreateOvertimePlanData = {
    nguoiThamGia: [], // empty = auto-register self on backend
    noiDung: '',
    ngayTangCa: '',
    gioBatDau: '',
    gioKetThuc: '',
    ghiChu: '',
    mucDoUuTien: TaskPriority.TRUNG_BINH,
    files: [],
  };

  const [formData, setFormData] = useState<CreateOvertimePlanData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (initialData) {
        setFormData(prev => ({
          ...prev,
          nguoiThamGia: [],
          noiDung: initialData.noiDung || '',
          ngayTangCa: initialData.ngayTangCa || '',
          gioBatDau: initialData.gioBatDau || '',
          gioKetThuc: initialData.gioKetThuc || '',
          ghiChu: initialData.ghiChu || '',
          mucDoUuTien: initialData.mucDoUuTien || TaskPriority.TRUNG_BINH,
          files: [],
        }));
      } else {
        setFormData(defaultForm);
      }
    }
  }, [isOpen, planId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.noiDung.trim()) { setError('Vui lòng nhập nội dung công việc tăng ca'); return; }
    if (!formData.ngayTangCa) { setError('Vui lòng chọn ngày tăng ca'); return; }
    if (!formData.gioBatDau) { setError('Vui lòng chọn giờ bắt đầu'); return; }
    if (!formData.gioKetThuc) { setError('Vui lòng chọn giờ kết thúc'); return; }
    if (formData.gioBatDau >= formData.gioKetThuc) { setError('Giờ kết thúc phải sau giờ bắt đầu'); return; }
    try {
      setLoading(true);
      if (isEditMode && planId) {
        await overtimePlanService.update(planId, formData);
      } else {
        await overtimePlanService.create(formData);
      }
      // Switch to overtime tab BEFORE closing the modal so the tab is already active
      onSwitchToTab?.();
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || (isEditMode ? 'Có lỗi xảy ra khi cập nhật kế hoạch' : 'Có lỗi xảy ra khi tạo kế hoạch tăng ca'));
    } finally { setLoading(false); }
  };

  const handleClose = () => { setFormData(defaultForm); setError(''); onClose(); };

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Bạn';

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Full-screen on mobile, max-width on desktop */}
      <div className="bg-white rounded-none sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-screen sm:max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 sm:rounded-t-xl flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {isEditMode ? 'Chỉnh sửa yêu cầu tăng ca' : 'Đăng ký tăng ca'}
            </h2>
            <p className="text-orange-100 text-xs mt-0.5">Gửi yêu cầu tăng ca để quản lý phê duyệt</p>
          </div>
          <button onClick={handleClose} className="text-white hover:text-orange-100 transition-colors p-1" type="button">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">

          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Self-register info card */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-orange-600 font-medium uppercase tracking-wide">Đăng ký cho</p>
              <p className="text-sm font-semibold text-orange-900">{fullName}</p>
            </div>
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-orange-500" />
              Nội dung công việc <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.noiDung}
              onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none transition-shadow"
              placeholder="Mô tả công việc tăng ca..."
            />
          </div>

          {/* Ngày tăng ca */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-orange-500" />
              Ngày tăng ca <span className="text-red-500">*</span>
            </label>
            <DatePicker
              label=""
              value={formData.ngayTangCa}
              onChange={(date) => setFormData({ ...formData, ngayTangCa: date })}
              placeholder="Chọn ngày tăng ca"
            />
          </div>

          {/* Giờ bắt đầu & kết thúc — 2 cột */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4 text-orange-500" />
                Từ giờ <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.gioBatDau}
                onChange={(e) => setFormData({ ...formData, gioBatDau: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm text-center transition-shadow"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4 text-orange-500" />
                Đến giờ <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.gioKetThuc}
                onChange={(e) => setFormData({ ...formData, gioKetThuc: e.target.value })}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm text-center transition-shadow"
              />
            </div>
          </div>

          {/* Mức độ ưu tiên */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mức độ ưu tiên</label>
            <div className="relative">
              <select
                value={formData.mucDoUuTien}
                onChange={(e) => setFormData({ ...formData, mucDoUuTien: e.target.value as TaskPriority })}
                className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm bg-white transition-shadow"
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
            <textarea
              value={formData.ghiChu}
              onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-none transition-shadow"
              placeholder="Thêm ghi chú (không bắt buộc)..."
            />
          </div>

          {/* File đính kèm */}
          {!isEditMode && (
            <FileUpload
              label="File đính kèm"
              files={formData.files || []}
              onChange={(files) => setFormData({ ...formData, files })}
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
          )}
        </div>

        {/* Footer buttons — sticky */}
        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-gray-100 bg-white sm:rounded-b-xl flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-2 flex-grow-[2] py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isEditMode ? 'Đang cập nhật...' : 'Đang gửi...'}
              </>
            ) : (
              isEditMode ? '💾 Lưu thay đổi' : '📤 Gửi yêu cầu'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateOvertimePlanModal;


