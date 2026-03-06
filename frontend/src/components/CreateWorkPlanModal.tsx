import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import DatePicker from './DatePicker';
import { workPlanService, WorkPlanPriority, CreateWorkPlanData } from '../services/workPlanService';
import { X, Upload, Calendar, Users, FileText, AlertCircle, ClipboardList } from 'lucide-react';
import axios from 'axios';

interface CreateWorkPlanModalProps {
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

const getPriorityLabel = (p: WorkPlanPriority) => {
  switch (p) {
    case WorkPlanPriority.KHAN_CAP: return 'Khẩn cấp';
    case WorkPlanPriority.CAO: return 'Cao';
    case WorkPlanPriority.TRUNG_BINH: return 'Trung bình';
    case WorkPlanPriority.THAP: return 'Thấp';
  }
};

const CreateWorkPlanModal: React.FC<CreateWorkPlanModalProps> = ({ isOpen, onClose, onSuccess }) => {
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

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [error, setError] = useState('');
  const [fileNames, setFileNames] = useState<string[]>([]);

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
      const token = localStorage.getItem('accessToken');
      const response = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/employees/for-assignment?limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
      });

      let employeeList: any[] = [];
      if (response.data.data) {
        employeeList = Array.isArray(response.data.data) ? response.data.data : response.data.data.data || [];
      } else if (Array.isArray(response.data)) {
        employeeList = response.data;
      }

      const transformedEmployees = employeeList.map((emp: any) => ({
        _id: emp.id || emp._id,
        firstName: emp.user?.firstName || emp.firstName || '',
        lastName: emp.user?.lastName || emp.lastName || '',
        employeeCode: emp.employeeCode || '',
        department: emp.departmentName || emp.subDepartmentName || 'Chưa xác định',
      }));

      setEmployees(transformedEmployees);
      setFilteredEmployees(transformedEmployees);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setFormData({ ...formData, files: fileArray });
      setFileNames(fileArray.map(f => f.name));
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    const currentSelection = formData.nguoiThucHien;
    if (currentSelection.includes(employeeId)) {
      setFormData({
        ...formData,
        nguoiThucHien: currentSelection.filter(id => id !== employeeId),
      });
    } else {
      setFormData({
        ...formData,
        nguoiThucHien: [...currentSelection, employeeId],
      });
    }
  };

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
    setSelectedDepartment('');
    setFileNames([]);
    setError('');
    onClose();
  };

  const getSelectedEmployeeNames = () => {
    return employees
      .filter(emp => formData.nguoiThucHien.includes(emp._id))
      .map(emp => `${emp.firstName} ${emp.lastName}`)
      .join(', ');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-teal-600 to-teal-700">
          <h2 className="text-xl font-bold text-white flex items-center">
            <ClipboardList className="w-5 h-5 mr-2" />
            Tạo kế hoạch công việc mới
          </h2>
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

        {/* Row 2: Tiêu đề kế hoạch */}
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

        {/* Row 3: Lọc theo phòng ban */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Lọc theo phòng ban
          </label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Row 4: Người thực hiện */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <Users className="w-4 h-4 mr-1.5" />
            Người thực hiện <span className="text-red-500 ml-1">*</span>
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
                        checked={formData.nguoiThucHien.includes(emp._id)}
                        onChange={() => handleEmployeeToggle(emp._id)}
                        className="w-4 h-4 mt-0.5 text-teal-600 rounded focus:ring-2 focus:ring-teal-500 flex-shrink-0"
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
              {formData.nguoiThucHien.length > 0 && (
                <div className="mt-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                  <p className="text-sm text-teal-700">
                    <span className="font-medium">Đã chọn {formData.nguoiThucHien.length} người:</span>
                    <span className="ml-1">{getSelectedEmployeeNames()}</span>
                  </p>
                </div>
              )}
            </>
          )}
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center">
            <Upload className="w-4 h-4 mr-1.5" />
            File kèm theo
          </label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
          />
          {fileNames.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {fileNames.map((name, index) => (
                <div key={index} className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">📎 {name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

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
            form="create-work-plan-form"
            disabled={loading}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang tạo...
              </>
            ) : 'Tạo kế hoạch'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateWorkPlanModal;

