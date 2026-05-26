import React, { useState, useEffect } from 'react';
import DatePicker from './DatePicker';
import { overtimePlanService, CreateOvertimePlanData } from '../services/overtimePlanService';
import { TaskPriority } from '../services/taskService';
import { Calendar, Users, FileText, AlertCircle, Clock } from 'lucide-react';
import apiClient from '../services/apiClient';
import FileUpload from './FileUpload';
import { ModalForm, ModalFooter } from './ModalForm';

interface CreateOvertimePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planId?: string;
  initialData?: Partial<Omit<CreateOvertimePlanData, 'files'>> & { nguoiThamGiaUserIds?: string[] };
}

interface Employee {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
}

const CreateOvertimePlanModal: React.FC<CreateOvertimePlanModalProps> = ({ isOpen, onClose, onSuccess, planId, initialData }) => {
  const isEditMode = !!planId;
  const defaultForm: CreateOvertimePlanData = { nguoiThamGia: [], noiDung: '', ngayTangCa: '', gioBatDau: '', gioKetThuc: '', ghiChu: '', mucDoUuTien: TaskPriority.TRUNG_BINH, files: [] };

  const [formData, setFormData] = useState<CreateOvertimePlanData>(defaultForm);
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
      if (!initialData) { setFormData(defaultForm); }
      setSelectedDepartment('');
      setError('');
    }
  }, [isOpen, planId]);

  // After employees load, map user IDs to employee IDs for edit mode
  useEffect(() => {
    if (isOpen && initialData && employees.length > 0) {
      const userIds = initialData.nguoiThamGiaUserIds || [];
      // Map user IDs back to employee IDs for the checkbox selection
      const employeeIds = userIds.length > 0
        ? employees.filter(emp => userIds.includes(emp.userId)).map(emp => emp._id)
        : (initialData.nguoiThamGia || []);
      setFormData(prev => ({
        ...prev,
        noiDung: initialData.noiDung || '',
        ngayTangCa: initialData.ngayTangCa || '',
        gioBatDau: initialData.gioBatDau || '',
        gioKetThuc: initialData.gioKetThuc || '',
        ghiChu: initialData.ghiChu || '',
        mucDoUuTien: initialData.mucDoUuTien || TaskPriority.TRUNG_BINH,
        nguoiThamGia: employeeIds,
        files: [],
      }));
    }
  }, [employees, isOpen, planId]);

  useEffect(() => {
    if (selectedDepartment) {
      setFilteredEmployees(employees.filter(emp => emp.department === selectedDepartment));
    } else { setFilteredEmployees(employees); }
  }, [selectedDepartment, employees]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    setError('');
    try {
      const response = await apiClient.get('/employees/for-assignment', { params: { limit: 1000 } });
      let employeeList: any[] = [];
      if (response.data) {
        employeeList = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
      } else if (Array.isArray(response)) { employeeList = response as any; }
      const transformed = employeeList.map((emp: any) => ({
        _id: emp.id || emp._id,
        userId: emp.userId || '',
        firstName: emp.user?.firstName || emp.firstName || '',
        lastName: emp.user?.lastName || emp.lastName || '',
        employeeCode: emp.employeeCode || '',
        department: emp.departmentName || emp.subDepartmentName || 'Chưa xác định',
      }));
      setEmployees(transformed);
      setFilteredEmployees(transformed);
      const uniqueDepts = Array.from(new Set(transformed.map((emp: Employee) => emp.department).filter(Boolean)));
      setDepartments(uniqueDepts as string[]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách nhân viên');
    } finally { setLoadingEmployees(false); }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    const current = formData.nguoiThamGia;
    setFormData({ ...formData, nguoiThamGia: current.includes(employeeId) ? current.filter(id => id !== employeeId) : [...current, employeeId] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.nguoiThamGia.length === 0) { setError('Vui lòng chọn ít nhất một người tham gia'); return; }
    if (!formData.noiDung.trim()) { setError('Vui lòng nhập nội dung công việc tăng ca'); return; }
    if (!formData.ngayTangCa) { setError('Vui lòng chọn ngày tăng ca'); return; }
    if (!formData.gioBatDau) { setError('Vui lòng chọn giờ bắt đầu'); return; }
    if (!formData.gioKetThuc) { setError('Vui lòng chọn giờ kết thúc'); return; }
    if (formData.gioBatDau >= formData.gioKetThuc) { setError('Giờ kết thúc phải sau giờ bắt đầu'); return; }
    try {
      setLoading(true);
      if (isEditMode && planId) {
        await overtimePlanService.update(planId, formData);
        alert('Cập nhật kế hoạch tăng ca thành công!');
      } else {
        await overtimePlanService.create(formData);
        alert('Tạo kế hoạch tăng ca thành công!');
      }
      onSuccess?.();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || (isEditMode ? 'Có lỗi xảy ra khi cập nhật kế hoạch' : 'Có lỗi xảy ra khi tạo kế hoạch tăng ca'));
    } finally { setLoading(false); }
  };

  const handleClose = () => { setFormData(defaultForm); setSelectedDepartment(''); setError(''); onClose(); };

  const getSelectedNames = () =>
    employees.filter(emp => formData.nguoiThamGia.includes(emp._id)).map(emp => `${emp.firstName} ${emp.lastName}`).join(', ');

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Chỉnh sửa kế hoạch tăng ca' : 'Tạo kế hoạch tăng ca'}
      footer={<ModalFooter onClose={handleClose} onSubmit={() => (document.getElementById('create-overtime-plan-form') as HTMLFormElement)?.requestSubmit()} submitLabel={isEditMode ? 'Cập nhật kế hoạch' : 'Tạo kế hoạch tăng ca'} isLoading={loading} />}
    >
      <form onSubmit={handleSubmit} className="space-y-5" id="create-overtime-plan-form">
        {error && (<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center"><AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" /><span className="text-sm">{error}</span></div>)}
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center"><Calendar className="w-4 h-4 mr-1.5" />Ngày tạo</label>
          <input type="text" value={new Date().toLocaleDateString('vi-VN')} disabled className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 text-sm" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Lọc theo phòng ban</label>
          <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm">
            <option value="">Tất cả phòng ban</option>{departments.map(dept => (<option key={dept} value={dept}>{dept}</option>))}</select></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center"><Users className="w-4 h-4 mr-1.5" />Người tham gia tăng ca <span className="text-red-500 ml-1">*</span></label>
          {loadingEmployees ? (<div className="border border-gray-300 rounded-lg p-4 text-center"><p className="text-gray-500 text-sm">Đang tải danh sách nhân viên...</p></div>
          ) : filteredEmployees.length === 0 ? (<div className="border border-gray-300 rounded-lg p-4 text-center"><p className="text-gray-500 text-sm">Không có nhân viên nào</p></div>
          ) : (<><div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50"><div className="space-y-1.5">
            {filteredEmployees.map(emp => (<label key={emp._id} className="flex items-start space-x-2.5 cursor-pointer hover:bg-white p-2 rounded transition-colors">
              <input type="checkbox" checked={formData.nguoiThamGia.includes(emp._id)} onChange={() => handleEmployeeToggle(emp._id)} className="w-4 h-4 mt-0.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0" />
              <span className="text-sm text-gray-700"><span className="font-medium">{emp.firstName} {emp.lastName}</span><span className="text-gray-500"> - {emp.employeeCode}</span><span className="text-gray-400 text-xs block">{emp.department}</span></span>
            </label>))}</div></div>
            {formData.nguoiThamGia.length > 0 && (<div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"><p className="text-sm text-blue-700"><span className="font-medium">Đã chọn {formData.nguoiThamGia.length} người:</span><span className="ml-1">{getSelectedNames()}</span></p></div>)}</>)}</div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center"><FileText className="w-4 h-4 mr-1.5" />Nội dung công việc tăng ca <span className="text-red-500 ml-1">*</span></label>
          <textarea value={formData.noiDung} onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })} rows={3} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none" placeholder="Mô tả chi tiết nội dung công việc tăng ca..." required /></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><DatePicker label="Ngày tăng ca" value={formData.ngayTangCa} onChange={(date) => setFormData({ ...formData, ngayTangCa: date })} placeholder="Chọn ngày tăng ca" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center"><Clock className="w-4 h-4 mr-1.5" />Giờ bắt đầu <span className="text-red-500 ml-1">*</span></label>
            <input type="time" value={formData.gioBatDau} onChange={(e) => setFormData({ ...formData, gioBatDau: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center"><Clock className="w-4 h-4 mr-1.5" />Giờ kết thúc <span className="text-red-500 ml-1">*</span></label>
            <input type="time" value={formData.gioKetThuc} onChange={(e) => setFormData({ ...formData, gioKetThuc: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm" required /></div>
        </div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
          <textarea value={formData.ghiChu} onChange={(e) => setFormData({ ...formData, ghiChu: e.target.value })} rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none" placeholder="Ghi chú thêm (nếu có)..." /></div>
        {!isEditMode && (<FileUpload label="File kèm theo" files={formData.files || []} onChange={(files) => setFormData({ ...formData, files })} multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />)}
      </form>
    </ModalForm>
  );
};

export default CreateOvertimePlanModal;

