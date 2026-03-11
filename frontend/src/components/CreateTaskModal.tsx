import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import { taskService, TaskPriority, CreateTaskData } from '../services/taskService';
import { X, Calendar, Users, FileText, AlertCircle } from 'lucide-react';
import apiClient from '../services/apiClient';
import FileUpload from './FileUpload';
import { getTaskPriorityLabel } from '../utils/taskHelpers';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
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

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedDepartment) {
      setFilteredEmployees(employees.filter(emp => emp.department === selectedDepartment));
    } else {
      setFilteredEmployees(employees);
    }
  }, [selectedDepartment, employees]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    setError('');
    try {
      const response = await apiClient.get('/employees/for-assignment', { params: { limit: 1000 } });

      console.log('Employee API response:', response);

      // Handle different response structures
      let employeeList: any[] = [];
      if (response.data) {
        employeeList = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else if (Array.isArray(response)) {
        employeeList = response as any;
      }

      // Transform employee data to match our interface
      const transformedEmployees = employeeList.map((emp: any) => ({
        _id: emp.id || emp._id,
        firstName: emp.user?.firstName || emp.firstName || '',
        lastName: emp.user?.lastName || emp.lastName || '',
        employeeCode: emp.employeeCode || '',
        department: emp.departmentName || emp.subDepartmentName || 'Chưa xác định',
      }));

      console.log('Transformed employees:', transformedEmployees);

      setEmployees(transformedEmployees);
      setFilteredEmployees(transformedEmployees);

      // Extract unique departments
      const uniqueDepts = Array.from(new Set(transformedEmployees.map((emp: Employee) => emp.department).filter(Boolean)));
      setDepartments(uniqueDepts as string[]);
    } catch (err: any) {
      console.error('Error fetching employees:', err);
      const errorMsg = err.response?.data?.message || 'Không thể tải danh sách nhân viên';
      setError(errorMsg);
    } finally {
      setLoadingEmployees(false);
    }
  };

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
      alert('Tạo nhiệm vụ thành công!');
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo nhiệm vụ');
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
      .map(emp => `${emp.firstName} ${emp.lastName}`)
      .join(', ');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <h2 className="text-xl font-bold text-white">Tạo nhiệm vụ mới</h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-5">
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
                        <span className="font-medium">{emp.firstName} {emp.lastName}</span>
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
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="submit"
            form="create-task-form"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo...
              </>
            ) : 'Tạo nhiệm vụ'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateTaskModal;

