import React, { useState, useEffect } from 'react';
import DatePicker from './DatePicker';
import FileUpload from './FileUpload';
import { workPlanService, WorkPlanPriority, CreateWorkPlanData } from '../services/workPlanService';
import { Calendar, Users, FileText, AlertCircle, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ModalForm, ModalFooter } from './ModalForm';

interface CreateWorkPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const getPriorityLabel = (p: WorkPlanPriority) => {
  switch (p) {
    case WorkPlanPriority.KHAN_CAP: return 'Khẩn cấp';
    case WorkPlanPriority.CAO: return 'Cao';
    case WorkPlanPriority.TRUNG_BINH: return 'Trung bình';
    case WorkPlanPriority.THAP: return 'Thấp';
  }
};

const CreateWorkPlanModal: React.FC<CreateWorkPlanModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();

  const [formData, setFormData] = useState<CreateWorkPlanData>({
    tieuDe: '',
    nguoiThucHien: [],
    noiDung: '',
    ngayBatDau: '',
    ngayKetThuc: '',
    ghiChu: '',
    mucDoUuTien: WorkPlanPriority.TRUNG_BINH,
    files: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto fill người thực hiện = user đang login
  useEffect(() => {
    if (isOpen && user?.employeeId) {
      setFormData(prev => ({ ...prev, nguoiThucHien: [user.employeeId!] }));
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.tieuDe.trim()) {
      setError('Vui lòng nhập tiêu đề kế hoạch');
      return;
    }

    if (formData.nguoiThucHien.length === 0) {
      setError('Vui lòng chọn ít nhất một người thực hiện');
      return;
    }

    if (!formData.noiDung.trim()) {
      setError('Vui lòng nhập nội dung kế hoạch');
      return;
    }

    if (!formData.ngayBatDau) {
      setError('Vui lòng chọn ngày bắt đầu');
      return;
    }

    if (!formData.ngayKetThuc) {
      setError('Vui lòng chọn ngày kết thúc');
      return;
    }

    try {
      setLoading(true);
      await workPlanService.createWorkPlan(formData);
      alert('Tạo kế hoạch công việc thành công!');
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('Error creating work plan:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo kế hoạch công việc');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tieuDe: '',
      nguoiThucHien: [],
      noiDung: '',
      ngayBatDau: '',
      ngayKetThuc: '',
      ghiChu: '',
      mucDoUuTien: WorkPlanPriority.TRUNG_BINH,
      files: [],
    });
    setError('');
    onClose();
  };



  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title="Tạo kế hoạch công việc mới"
      titleIcon={<ClipboardList className="w-4 h-4" />}
      footer={<ModalFooter onClose={handleClose} onSubmit={() => (document.getElementById('create-work-plan-form') as HTMLFormElement)?.requestSubmit()} submitLabel="Tạo kế hoạch" isLoading={loading} />}
    >
      <form onSubmit={handleSubmit} className="space-y-5" id="create-work-plan-form">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Row 1: Ngày tạo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <Calendar className="w-4 h-4 mr-1.5" />
            Ngày tạo
          </label>
          <input
            type="text"
            value={new Date().toLocaleDateString('vi-VN')}
            disabled
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm"
          />
        </div>

        {/* Row 2: Người thực hiện (auto fill) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <Users className="w-4 h-4 mr-1.5" />
            Người thực hiện
          </label>
          <input
            type="text"
            value={user ? `${user.lastName} ${user.firstName}${user.employeeCode ? ` - ${user.employeeCode}` : ''}` : ''}
            disabled
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm"
          />
        </div>

        {/* Row 3: Tiêu đề kế hoạch */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <FileText className="w-4 h-4 mr-1.5" />
            Tiêu đề kế hoạch <span className="text-red-500 ml-1">*</span>
          </label>
          <input
            type="text"
            value={formData.tieuDe}
            onChange={(e) => setFormData({ ...formData, tieuDe: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            placeholder="Nhập tiêu đề kế hoạch..."
            required
          />
        </div>

        {/* Row 5: Nội dung kế hoạch */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <FileText className="w-4 h-4 mr-1.5" />
            Nội dung kế hoạch <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={formData.noiDung}
            onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
            placeholder="Mô tả chi tiết nội dung kế hoạch..."
            required
          />
        </div>

        {/* Row 6: Mức độ ưu tiên & Ngày bắt đầu */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mức độ ưu tiên <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.mucDoUuTien}
              onChange={(e) => setFormData({ ...formData, mucDoUuTien: e.target.value as WorkPlanPriority })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              required
            >
              <option value={WorkPlanPriority.THAP}>{getPriorityLabel(WorkPlanPriority.THAP)}</option>
              <option value={WorkPlanPriority.TRUNG_BINH}>{getPriorityLabel(WorkPlanPriority.TRUNG_BINH)}</option>
              <option value={WorkPlanPriority.CAO}>{getPriorityLabel(WorkPlanPriority.CAO)}</option>
              <option value={WorkPlanPriority.KHAN_CAP}>{getPriorityLabel(WorkPlanPriority.KHAN_CAP)}</option>
            </select>
          </div>

          <div>
            <DatePicker
              label="Ngày bắt đầu"
              value={formData.ngayBatDau}
              onChange={(date) => setFormData({ ...formData, ngayBatDau: date })}
              minDate={new Date().toISOString().split('T')[0]}
              placeholder="Chọn ngày bắt đầu"
              required
            />
          </div>
        </div>

        {/* Row 7: Ngày kết thúc */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <DatePicker
              label="Ngày kết thúc"
              value={formData.ngayKetThuc}
              onChange={(date) => setFormData({ ...formData, ngayKetThuc: date })}
              minDate={formData.ngayBatDau || new Date().toISOString().split('T')[0]}
              placeholder="Chọn ngày kết thúc"
              required
            />
          </div>
        </div>

        {/* Row 8: Ghi chú */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Ghi chú
          </label>
          <textarea
            value={formData.ghiChu}
            onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
            placeholder="Ghi chú thêm (nếu có)..."
          />
        </div>

        {/* Row 9: File kèm theo */}
        <FileUpload
          label="File kèm theo"
          files={formData.files || []}
          onChange={(files) => setFormData({ ...formData, files })}
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
        />

      </form>
    </ModalForm>
  );
};

export default CreateWorkPlanModal;

