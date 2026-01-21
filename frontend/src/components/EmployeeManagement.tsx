import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import employeeService from '@services/employeeService';
import positionService from '@services/positionService';
import departmentService from '@services/departmentService';

interface Employee {
  id: string;
  userId: string;
  employeeCode: string;
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  positionId: string;
  positionLevelId?: string;
  subDepartmentId?: string;
  status: string;
  hireDate: string;
  contractType: string;
  educationLevel?: string;
  specialization?: string;
  specialSkills?: string;
  baseSalary: number;
  kpiLevel?: number;
  height?: number;
  weight?: number;
  shirtSize?: string;
  pantSize?: string;
  shoeSize?: string;
  bankAccount?: string;
  lockerNumber?: string;
  notes?: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
    departmentId?: string;
  };
  position?: {
    id: string;
    name: string;
  };
  positionLevel?: {
    id: string;
    level: string;
    baseSalary: number;
    kpiSalary: number;
  };
}

interface Position {
  id: string;
  code: string;
  name: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

interface PositionLevel {
  id: string;
  positionId: string;
  level: string;
  baseSalary: number;
  kpiSalary: number;
}

interface FormData {
  employeeCode: string;
  userId?: string;
  positionId: string;
  positionLevelId?: string;
  status: string;
  hireDate: string;
  contractType: string;
  baseSalary: number;
  gender?: string;
  dateOfBirth?: string;
  phoneNumber?: string;
  address?: string;
  educationLevel?: string;
  specialization?: string;
  specialSkills?: string;
  kpiLevel?: number;
  height?: number;
  weight?: number;
  shirtSize?: string;
  pantSize?: string;
  shoeSize?: string;
  bankAccount?: string;
  lockerNumber?: string;
  notes?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionLevels, setPositionLevels] = useState<PositionLevel[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<FormData>({
    employeeCode: '',
    positionId: '',
    positionLevelId: '',
    status: 'ACTIVE',
    hireDate: new Date().toISOString().split('T')[0],
    contractType: 'PERMANENT',
    baseSalary: 0,
    gender: '',
    dateOfBirth: '',
    phoneNumber: '',
    address: '',
    educationLevel: '',
    specialization: '',
    specialSkills: '',
    kpiLevel: 0,
    height: 0,
    weight: 0,
    shirtSize: '',
    pantSize: '',
    shoeSize: '',
    bankAccount: '',
    lockerNumber: '',
    notes: '',
  });

  useEffect(() => {
    loadEmployees();
    loadPositions();
    loadDepartments();
    loadUsers();
  }, []);

  // Load position levels when position is selected
  useEffect(() => {
    if (formData.positionId) {
      loadPositionLevelsByPosition(formData.positionId);
    } else {
      setPositionLevels([]);
    }
  }, [formData.positionId]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getAllEmployees(1, 100);
      setEmployees(response.data);
      setError('');
    } catch (err) {
      setError('Lỗi tải danh sách nhân viên');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const data = await positionService.getAllPositions();
      setPositions(data);
    } catch (err) {
      console.error('Lỗi tải danh sách chức vụ:', err);
    }
  };

  const loadPositionLevelsByPosition = async (positionId: string) => {
    try {
      const data = await positionService.getPositionLevelsByPosition(positionId);
      setPositionLevels(data);
    } catch (err) {
      console.error('Lỗi tải danh sách cấp độ:', err);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await departmentService.getAllDepartments();
      setDepartments(data);
    } catch (err) {
      console.error('Lỗi tải danh sách phòng ban:', err);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng:', err);
      setUsers([]);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Reset position level, salary and KPI when position changes
    if (name === 'positionId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        positionLevelId: '',
        baseSalary: 0,
        kpiLevel: 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'baseSalary' ? parseFloat(value) : value
      }));
    }

    // Auto-fill salary and KPI when position level is selected
    if (name === 'positionLevelId' && value) {
      try {
        const selectedLevel = positionLevels.find(pl => pl.id === value);
        if (selectedLevel) {
          setFormData(prev => ({
            ...prev,
            baseSalary: selectedLevel.baseSalary,
            kpiLevel: selectedLevel.kpiSalary
          }));
        }
      } catch (err) {
        console.error('Lỗi lấy lương cấp độ:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (selectedEmployee) {
        await employeeService.updateEmployee(selectedEmployee.id, formData);
        setSuccess('Cập nhật nhân viên thành công');
        setIsFormModalOpen(false);
        loadEmployees();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi cập nhật nhân viên';
      setError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;

    try {
      await employeeService.deleteEmployee(id);
      setSuccess('Xóa nhân viên thành công');
      loadEmployees();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi xóa nhân viên';
      setError(errorMessage);
    }
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      employeeCode: employee.employeeCode,
      positionId: employee.positionId,
      positionLevelId: employee.positionLevelId,
      status: employee.status,
      hireDate: employee.hireDate.split('T')[0],
      contractType: employee.contractType,
      baseSalary: employee.baseSalary,
      gender: employee.gender,
      dateOfBirth: employee.dateOfBirth,
      phoneNumber: employee.phoneNumber,
      address: employee.address,
      educationLevel: employee.educationLevel,
      specialization: employee.specialization,
      specialSkills: employee.specialSkills,
      kpiLevel: employee.kpiLevel || 0,
      height: employee.height || 0,
      weight: employee.weight || 0,
      shirtSize: employee.shirtSize || '',
      pantSize: employee.pantSize || '',
      shoeSize: employee.shoeSize || '',
      bankAccount: employee.bankAccount || '',
      lockerNumber: employee.lockerNumber || '',
      notes: employee.notes,
    });
    setIsFormModalOpen(true);
  };

  const openDetailModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedEmployee(null);
  };

  const getDepartmentName = (departmentId?: string): string => {
    if (!departmentId) return '-';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || '-';
  };

  const filteredEmployees = employees.filter(emp =>
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.user?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.user?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Tìm kiếm theo mã NV, họ tên, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-80"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có nhân viên nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã NV</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Họ tên</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Chức vụ</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Phòng ban</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {emp.employeeCode}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {emp.user?.firstName} {emp.user?.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {emp.user?.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {emp.position?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-200">
                      {getDepartmentName(emp.user?.departmentId)}
                    </td>
                    <td className="px-6 py-4 text-center border-r border-gray-200">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        emp.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-red-100 text-red-700 border border-red-300'
                      }`}>
                        {emp.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openDetailModal(emp)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id)}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Chỉnh sửa nhân viên</h2>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Thông tin cơ bản */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mã nhân viên *</label>
                    <input
                      type="text"
                      name="employeeCode"
                      value={formData.employeeCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chức vụ *</label>
                    <select
                      name="positionId"
                      value={formData.positionId}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Chọn chức vụ</option>
                      {positions.map(position => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cấp độ nhân viên</label>
                    <select
                      name="positionLevelId"
                      value={formData.positionLevelId || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Chọn cấp độ</option>
                      {positionLevels.map(level => (
                        <option key={level.id} value={level.id}>
                          {level.level} - {level.baseSalary.toLocaleString('vi-VN')} VND
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày vào làm *</label>
                    <input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại hợp đồng</label>
                    <select
                      name="contractType"
                      value={formData.contractType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="PERMANENT">Chính thức</option>
                      <option value="TEMPORARY">Tạm thời</option>
                      <option value="PROBATION">Thử việc</option>
                      <option value="PART_TIME">Bán thời gian</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">Đang làm việc</option>
                      <option value="INACTIVE">Không hoạt động</option>
                      <option value="ON_LEAVE">Đang nghỉ</option>
                      <option value="TERMINATED">Đã nghỉ việc</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Thông tin cá nhân */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cá nhân</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Giới tính</label>
                    <select
                      name="gender"
                      value={formData.gender || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                      <option value="OTHER">Khác</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin công việc */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin công việc</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trình độ học vấn</label>
                    <select
                      name="educationLevel"
                      value={formData.educationLevel || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Chọn trình độ</option>
                      <option value="HIGH_SCHOOL">Trung học</option>
                      <option value="ASSOCIATE">Cao đẳng</option>
                      <option value="BACHELOR">Đại học</option>
                      <option value="MASTER">Thạc sĩ</option>
                      <option value="DOCTORATE">Tiến sĩ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chuyên ngành</label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kỹ năng đặc biệt</label>
                    <input
                      type="text"
                      name="specialSkills"
                      value={formData.specialSkills || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin lương */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin lương</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lương cơ bản *</label>
                    <input
                      type="number"
                      name="baseSalary"
                      value={formData.baseSalary}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mức KPI</label>
                    <input
                      type="number"
                      name="kpiLevel"
                      value={formData.kpiLevel || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin thân thể */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin thân thể</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chiều cao (cm)</label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cân nặng (kg)</label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size áo</label>
                    <input
                      type="text"
                      name="shirtSize"
                      value={formData.shirtSize || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size quần</label>
                    <input
                      type="text"
                      name="pantSize"
                      value={formData.pantSize || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size giày</label>
                    <input
                      type="text"
                      name="shoeSize"
                      value={formData.shoeSize || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thông tin khác */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin khác</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản ngân hàng</label>
                    <input
                      type="text"
                      name="bankAccount"
                      value={formData.bankAccount || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Số tủ khóa</label>
                    <input
                      type="text"
                      name="lockerNumber"
                      value={formData.lockerNumber || ''}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                    <textarea
                      name="notes"
                      value={formData.notes || ''}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Chi tiết nhân viên</h2>
              <button
                onClick={closeDetailModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Thông tin cơ bản */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mã nhân viên</label>
                    <p className="text-gray-900">{selectedEmployee.employeeCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Họ tên</label>
                    <p className="text-gray-900">{selectedEmployee.user?.firstName} {selectedEmployee.user?.lastName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedEmployee.user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chức vụ</label>
                    <p className="text-gray-900">{selectedEmployee.position?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phòng ban</label>
                    <p className="text-gray-900">{getDepartmentName(selectedEmployee.user?.departmentId)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                    <p className="text-gray-900">{selectedEmployee.status}</p>
                  </div>
                </div>
              </div>

              {/* Thông tin cá nhân */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin cá nhân</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Giới tính</label>
                    <p className="text-gray-900">{selectedEmployee.gender || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày sinh</label>
                    <p className="text-gray-900">{selectedEmployee.dateOfBirth ? new Date(selectedEmployee.dateOfBirth).toLocaleDateString('vi-VN') : '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                    <p className="text-gray-900">{selectedEmployee.phoneNumber || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                    <p className="text-gray-900">{selectedEmployee.address || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Thông tin công việc */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin công việc</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Ngày vào làm</label>
                    <p className="text-gray-900">{new Date(selectedEmployee.hireDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loại hợp đồng</label>
                    <p className="text-gray-900">{selectedEmployee.contractType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Trình độ học vấn</label>
                    <p className="text-gray-900">{selectedEmployee.educationLevel || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chuyên ngành</label>
                    <p className="text-gray-900">{selectedEmployee.specialization || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Kỹ năng đặc biệt</label>
                    <p className="text-gray-900">{selectedEmployee.specialSkills || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Thông tin lương */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin lương</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lương cơ bản</label>
                    <p className="text-gray-900">{selectedEmployee.baseSalary.toLocaleString('vi-VN')} VND</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Lương KPI</label>
                    <p className="text-gray-900">{selectedEmployee.kpiLevel ? `${selectedEmployee.kpiLevel.toLocaleString('vi-VN')} VND` : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Thông tin thân thể */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin thân thể</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chiều cao (cm)</label>
                    <p className="text-gray-900">{selectedEmployee.height || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cân nặng (kg)</label>
                    <p className="text-gray-900">{selectedEmployee.weight || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Size áo</label>
                    <p className="text-gray-900">{selectedEmployee.shirtSize || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Size quần</label>
                    <p className="text-gray-900">{selectedEmployee.pantSize || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Size giày</label>
                    <p className="text-gray-900">{selectedEmployee.shoeSize || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Thông tin khác */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin khác</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Số tài khoản ngân hàng</label>
                    <p className="text-gray-900">{selectedEmployee.bankAccount || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Số tủ khóa</label>
                    <p className="text-gray-900">{selectedEmployee.lockerNumber || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Ghi chú</label>
                    <p className="text-gray-900">{selectedEmployee.notes || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    openEditModal(selectedEmployee);
                    closeDetailModal();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default EmployeeManagement;

