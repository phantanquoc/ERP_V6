import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import DatePicker from './DatePicker';
import { taskService, TaskPriority, CreateTaskData } from '../services/taskService';
import { Calendar, Users, FileText, AlertCircle } from 'lucide-react';
import FileUpload from './FileUpload';
import { getTaskPriorityLabel } from '../utils/taskHelpers';
import { ModalForm, ModalFooter } from './ModalForm';
import { useAllEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CreateTaskData>({
    nguoiNhan: [],
    noiDung: '',
    thoiHanHoanThanh: '',
    ghiChu: '',
    mucDoUuTien: TaskPriority.TRUNG_BINH,
    files: [],
  });

  const { data: employeeData, isLoading: loadingEmployees } = useAllEmployeesForAssignment();
  const employees = employeeData?.employees ?? [];
  const departments = employeeData?.departments ?? [];

  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredEmployees = useMemo(() => {
    if (selectedDepartment) {
      return employees.filter(emp => emp.department === selectedDepartment);
    }
    return employees;
  }, [selectedDepartment, employees]);

  const handleEmployeeToggle = (employeeId: string) => {
    const currentSelection = formData.nguoiNhan;
    if (currentSelection.includes(employeeId)) {
      setFormData({
        ...formData,
        nguoiNhan: currentSelection.filter(id => id !== employeeId),
      });
    } else {
      setFormData({
        ...formData,
        nguoiNhan: [...currentSelection, employeeId],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.nguoiNhan.length === 0) {
      setError('Vui lòng chọn ít nhất một người nhận nhiệm vụ');
      return;
    }

    if (!formData.noiDung.trim()) {
      setError('Vui lòng nhập nội dung nhiệm vụ');
      return;
    }

    if (!formData.thoiHanHoanThanh) {
      setError('Vui lòng chọn thời hạn hoàn thành');
      return;
    }

    try {
      setLoading(true);
      await taskService.createTask(formData);
      toast.success('Đã tạo nhiệm vụ');
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('Error creating task:', err);
      const msg = err.response?.data?.message || 'Có lỗi xảy ra khi tạo nhiệm vụ';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nguoiNhan: [],
      noiDung: '',
      thoiHanHoanThanh: '',
      ghiChu: '',
      mucDoUuTien: TaskPriority.TRUNG_BINH,
      files: [],
    });
    setSelectedDepartment('');
    setError('');
    onClose();
  };

  const getSelectedEmployeeNames = () => {
    return employees
      .filter(emp => formData.nguoiNhan.includes(emp._id))
      .map(emp => `${emp.lastName} ${emp.firstName}`)
      .join(', ');
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title="Tạo nhiệm vụ mới"
      footer={<ModalFooter onClose={handleClose} onSubmit={() => (document.getElementById('create-task-form') as HTMLFormElement)?.requestSubmit()} submitLabel="Tạo nhiệm vụ" isLoading={loading} />}
    >
      <form onSubmit={handleSubmit} className="space-y-5" id="create-task-form">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Row 1: Ngày giao */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <Calendar className="w-4 h-4 mr-1.5" />
            Ngày giao
          </label>
          <input
            type="text"
            value={new Date().toLocaleDateString('vi-VN')}
            disabled
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm"
          />
        </div>

        {/* Row 2: Lọc theo phòng ban */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Lọc theo phòng ban
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Row 3: Người nhận nhiệm vụ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <Users className="w-4 h-4 mr-1.5" />
            Người nhận nhiệm vụ <span className="text-red-500 ml-1">*</span>
          </label>

          {loadingEmployees ? (
            <div className="border border-gray-300 rounded-lg p-4 text-center">
              <p className="text-gray-500 text-sm">Đang tải danh sách nhân viên...</p>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="border border-gray-300 rounded-lg p-4 text-center">
              <p className="text-gray-500 text-sm">
                {selectedDepartment ? 'Không có nhân viên nào trong phòng ban này' : 'Không có nhân viên nào'}
              </p>
            </div>
          ) : (
            <>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                <div className="space-y-1.5">
                  {filteredEmployees.map(emp => (
                    <label
                      key={emp._id}
                      className="flex items-start space-x-2.5 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={formData.nguoiNhan.includes(emp._id)}
                        onChange={() => handleEmployeeToggle(emp._id)}
                        className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">{emp.lastName} {emp.firstName}</span>
                        <span className="text-gray-500"> - {emp.employeeCode}</span>
                        <span className="text-gray-400 text-xs block">{emp.department}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {formData.nguoiNhan.length > 0 && (
                <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">Đã chọn {formData.nguoiNhan.length} người:</span>
                    <span className="ml-1">{getSelectedEmployeeNames()}</span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Row 4: Nội dung */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <FileText className="w-4 h-4 mr-1.5" />
            Nội dung nhiệm vụ <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={formData.noiDung}
            onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })}
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            placeholder="Mô tả chi tiết nội dung nhiệm vụ..."
            required
          />
        </div>

        {/* Row 5: Mức độ ưu tiên & Thời hạn */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mức độ ưu tiên */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mức độ ưu tiên <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.mucDoUuTien}
              onChange={(e) => setFormData({ ...formData, mucDoUuTien: e.target.value as TaskPriority })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              required
            >
              <option value={TaskPriority.THAP}>{getTaskPriorityLabel(TaskPriority.THAP)}</option>
              <option value={TaskPriority.TRUNG_BINH}>{getTaskPriorityLabel(TaskPriority.TRUNG_BINH)}</option>
              <option value={TaskPriority.CAO}>{getTaskPriorityLabel(TaskPriority.CAO)}</option>
              <option value={TaskPriority.KHAN_CAP}>{getTaskPriorityLabel(TaskPriority.KHAN_CAP)}</option>
            </select>
          </div>

          {/* Thời hạn hoàn thành */}
          <div>
            <DatePicker
              label="Thời hạn hoàn thành"
              value={formData.thoiHanHoanThanh}
              onChange={(date) => setFormData({ ...formData, thoiHanHoanThanh: date })}
              minDate={new Date().toISOString().split('T')[0]}
              placeholder="Chọn thời hạn hoàn thành"
              required
            />
          </div>
        </div>

        {/* Row 6: Ghi chú */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Ghi chú
          </label>
          <textarea
            value={formData.ghiChu}
            onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })}
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
            placeholder="Ghi chú thêm (nếu có)..."
          />
        </div>

        {/* Row 7: File kèm theo */}
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

export default CreateTaskModal;

