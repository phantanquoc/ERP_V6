import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import DatePicker from './DatePicker';
import FileUpload from './FileUpload';
import EmployeeSelectionModal from './EmployeeSelectionModal';
import { WorkPlan, WorkPlanPriority, WorkPlanStatus, CreateWorkPlanData, UpdateWorkPlanData } from '../services/workPlanService';
import { Calendar, Users, FileText, AlertCircle, ClipboardList, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ModalForm, ModalFooter } from './ModalForm';
import { useCreateWorkPlan, useUpdateWorkPlan } from '../hooks/useWorkPlans';
import { UserRole } from '../types/auth';
import { useAllEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';

interface CreateWorkPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: WorkPlan | null;
}

const getPriorityLabel = (p: WorkPlanPriority) => {
  switch (p) {
    case WorkPlanPriority.KHAN_CAP: return 'Khẩn cấp';
    case WorkPlanPriority.CAO: return 'Cao';
    case WorkPlanPriority.TRUNG_BINH: return 'Trung bình';
    case WorkPlanPriority.THAP: return 'Thấp';
  }
};

const CreateWorkPlanModal: React.FC<CreateWorkPlanModalProps> = ({ isOpen, onClose, onSuccess, initialData = null }) => {
  const { user } = useAuth();
  const isEditMode = !!initialData;
  const isAdminUser = user?.role === UserRole.ADMIN;

  const createMutation = useCreateWorkPlan();
  const updateMutation = useUpdateWorkPlan();

  // Fetch all employees to resolve IDs → names for chips
  const { data: employeeData } = useAllEmployeesForAssignment();
  const allEmployees = employeeData?.employees ?? [];

  const [tieuDe, setTieuDe] = useState('');
  const [noiDung, setNoiDung] = useState('');
  const [ngayBatDau, setNgayBatDau] = useState('');
  const [ngayKetThuc, setNgayKetThuc] = useState('');
  const [mucDoUuTien, setMucDoUuTien] = useState<WorkPlanPriority>(WorkPlanPriority.TRUNG_BINH);
  const [trangThai, setTrangThai] = useState<WorkPlanStatus>(WorkPlanStatus.CHUA_BAT_DAU);
  const [ghiChu, setGhiChu] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [keepFiles, setKeepFiles] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [error, setError] = useState('');

  // Resolve selected IDs to employee objects for chip display
  const selectedEmployees = useMemo(
    () => allEmployees.filter(e => selectedEmployeeIds.includes(e._id)),
    [allEmployees, selectedEmployeeIds],
  );

  // Initialize form on open
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTieuDe(initialData.tieuDe);
        setNoiDung(initialData.noiDung);
        setNgayBatDau(initialData.ngayBatDau.split('T')[0]);
        setNgayKetThuc(initialData.ngayKetThuc.split('T')[0]);
        setMucDoUuTien(initialData.mucDoUuTien);
        setTrangThai(initialData.trangThai);
        setGhiChu(initialData.ghiChu || '');
        setSelectedEmployeeIds(initialData.nguoiThucHienIds || []);
        setKeepFiles(initialData.files || []);
      } else {
        setTieuDe('');
        setNoiDung('');
        setNgayBatDau('');
        setNgayKetThuc('');
        setMucDoUuTien(WorkPlanPriority.TRUNG_BINH);
        setTrangThai(WorkPlanStatus.CHUA_BAT_DAU);
        setGhiChu('');
        setSelectedEmployeeIds(user?.employeeId ? [user.employeeId] : []);
        setKeepFiles([]);
      }
      setNewFiles([]);
      setError('');
    }
  }, [isOpen, initialData, user?.employeeId]);

  const handleRemoveKeepFile = (fileUrl: string) => {
    setKeepFiles(prev => prev.filter(f => f !== fileUrl));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tieuDe.trim()) {
      setError('Vui lòng nhập tiêu đề kế hoạch');
      return;
    }
    if (selectedEmployeeIds.length === 0) {
      setError('Vui lòng chọn ít nhất một người thực hiện');
      return;
    }
    if (!noiDung.trim()) {
      setError('Vui lòng nhập nội dung kế hoạch');
      return;
    }
    if (!ngayBatDau) {
      setError('Vui lòng chọn ngày bắt đầu');
      return;
    }
    if (!ngayKetThuc) {
      setError('Vui lòng chọn ngày kết thúc');
      return;
    }

    if (isEditMode && initialData) {
      const updateData: UpdateWorkPlanData = {
        tieuDe,
        noiDung,
        ngayBatDau,
        ngayKetThuc,
        mucDoUuTien,
        ghiChu,
        nguoiThucHien: selectedEmployeeIds,
        keepFiles,
      };
      // Only admin can change trangThai via this form; creator cannot
      if (isAdminUser) {
        updateData.trangThai = trangThai;
      }

      updateMutation.mutate(
        { id: initialData.id, data: updateData, files: newFiles.length > 0 ? newFiles : undefined },
        {
          onSuccess: () => {
            toast.success('Đã cập nhật kế hoạch');
            onSuccess?.();
            handleClose();
          },
          onError: (err: any) => {
            const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật kế hoạch';
            setError(msg);
            toast.error(msg);
          },
        },
      );
    } else {
      const createData: CreateWorkPlanData = {
        tieuDe,
        noiDung,
        nguoiThucHien: selectedEmployeeIds,
        ngayBatDau,
        ngayKetThuc,
        mucDoUuTien,
        ghiChu,
        files: newFiles.length > 0 ? newFiles : undefined,
      };

      createMutation.mutate(createData, {
        onSuccess: () => {
          toast.success('Đã tạo kế hoạch công việc');
          onSuccess?.();
          handleClose();
        },
        onError: (err: any) => {
          const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo kế hoạch công việc';
          setError(msg);
          toast.error(msg);
        },
      });
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const title = isEditMode ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch công việc mới';
  const submitLabel = isEditMode ? 'Lưu' : 'Tạo kế hoạch';

  return (
    <>
      <ModalForm
        isOpen={isOpen}
        onClose={handleClose}
        title={title}
        titleIcon={<ClipboardList className="w-4 h-4" />}
        footer={
          <ModalFooter
            onClose={handleClose}
            onSubmit={() => (document.getElementById('create-work-plan-form') as HTMLFormElement)?.requestSubmit()}
            submitLabel={submitLabel}
            isLoading={isLoading}
          />
        }
      >
        <form onSubmit={handleSubmit} className="space-y-5" id="create-work-plan-form">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Ngày tạo (create mode only) */}
          {!isEditMode && (
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
          )}

          {/* Người thực hiện — multi-pick */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
              <Users className="w-4 h-4 mr-1.5" />
              Người thực hiện <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="space-y-2">
              {selectedEmployees.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEmployees.map(emp => (
                    <span key={emp._id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {emp.lastName} {emp.firstName}
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeIds(prev => prev.filter(id => id !== emp._id))}
                        className="ml-0.5 hover:text-blue-600 transition-colors"
                        aria-label={`Bỏ chọn ${emp.lastName} ${emp.firstName}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowEmployeeModal(true)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Chọn nhân sự
              </button>
            </div>
          </div>

          {/* Tiêu đề */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
              <FileText className="w-4 h-4 mr-1.5" />
              Tiêu đề kế hoạch <span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="text"
              value={tieuDe}
              onChange={(e) => setTieuDe(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              placeholder="Nhập tiêu đề kế hoạch..."
              required
            />
          </div>

          {/* Nội dung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
              <FileText className="w-4 h-4 mr-1.5" />
              Nội dung kế hoạch <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={noiDung}
              onChange={(e) => setNoiDung(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
              placeholder="Mô tả chi tiết nội dung kế hoạch..."
              required
            />
          </div>

          {/* Mức độ ưu tiên & Ngày bắt đầu */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mức độ ưu tiên <span className="text-red-500">*</span>
              </label>
              <select
                value={mucDoUuTien}
                onChange={(e) => setMucDoUuTien(e.target.value as WorkPlanPriority)}
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
                value={ngayBatDau}
                onChange={(date) => setNgayBatDau(date)}
                minDate={isEditMode ? undefined : new Date().toISOString().split('T')[0]}
                placeholder="Chọn ngày bắt đầu"
                required
              />
            </div>
          </div>

          {/* Ngày kết thúc & Trạng thái (admin edit only) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <DatePicker
                label="Ngày kết thúc"
                value={ngayKetThuc}
                onChange={(date) => setNgayKetThuc(date)}
                minDate={ngayBatDau || (isEditMode ? undefined : new Date().toISOString().split('T')[0])}
                placeholder="Chọn ngày kết thúc"
                required
              />
            </div>
            {isEditMode && isAdminUser && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Trạng thái</label>
                <select
                  value={trangThai}
                  onChange={(e) => setTrangThai(e.target.value as WorkPlanStatus)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                >
                  <option value={WorkPlanStatus.CHUA_BAT_DAU}>Chưa bắt đầu</option>
                  <option value={WorkPlanStatus.DANG_THUC_HIEN}>Đang thực hiện</option>
                  <option value={WorkPlanStatus.HOAN_THANH}>Hoàn thành</option>
                  <option value={WorkPlanStatus.HUY}>Đã hủy</option>
                </select>
              </div>
            )}
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
            <textarea
              value={ghiChu}
              onChange={(e) => setGhiChu(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
              placeholder="Ghi chú thêm (nếu có)..."
            />
          </div>

          {/* Existing files in edit mode */}
          {isEditMode && keepFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">File hiện tại</label>
              <div className="flex flex-wrap gap-2">
                {keepFiles.map((file, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs">
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[150px]">{file.split('/').pop()}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeepFile(file)}
                      className="ml-0.5 hover:text-red-500 transition-colors"
                      aria-label="Xóa file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* New file upload */}
          <FileUpload
            label={isEditMode ? 'Thêm file mới' : 'File kèm theo'}
            files={newFiles}
            onChange={(files) => setNewFiles(files)}
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          />
        </form>
      </ModalForm>

      <EmployeeSelectionModal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        selectedIds={selectedEmployeeIds}
        onConfirm={(ids) => setSelectedEmployeeIds(ids)}
      />
    </>
  );
};

export default CreateWorkPlanModal;
