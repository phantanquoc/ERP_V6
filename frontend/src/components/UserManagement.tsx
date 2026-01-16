import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Eye,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import userService from '@services/userService';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  departmentId?: string;
  departmentName?: string;
  subDepartmentId?: string | null;
  subDepartmentName?: string | null;
  supervisor1Id?: string | null;
  supervisor2Id?: string | null;
  supervisor1?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  supervisor2?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password?: string;
  departmentId?: string;
  subDepartmentId?: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface SubDepartment {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Function to convert role to Vietnamese display name
  const getRoleDisplayName = (role: string): string => {
    const roleMap: { [key: string]: string } = {
      'EMPLOYEE': 'Nhân viên',
      'TEAM_LEAD': 'Trưởng phòng',
      'DEPARTMENT_HEAD': 'Trưởng bộ phận',
      'ADMIN': 'Admin'
    };
    return roleMap[role] || role;
  };

  // Department states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [filteredSubDepartments, setFilteredSubDepartments] = useState<SubDepartment[]>([]);

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    password: '',
    departmentId: '',
    subDepartmentId: '',
  });

  // Fetch users and departments on mount
  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  // Filter sub-departments when department changes
  useEffect(() => {
    if (formData.departmentId) {
      const filtered = subDepartments.filter(
        (sub) => sub.departmentId === formData.departmentId
      );
      setFilteredSubDepartments(filtered);
      // Reset subDepartmentId when department changes
      setFormData((prev) => ({ ...prev, subDepartmentId: '' }));
    } else {
      setFilteredSubDepartments([]);
    }
  }, [formData.departmentId, subDepartments]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await userService.getAllUsers(1, 100);
      setUsers(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/departments/public/all');
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();
      setDepartments(data.data || []);

      // Flatten all sub-departments
      const allSubDepts: SubDepartment[] = [];
      (data.data || []).forEach((dept: any) => {
        if (dept.subDepartments) {
          allSubDepts.push(
            ...dept.subDepartments.map((sub: any) => ({
              id: sub.id,
              name: sub.name,
              code: sub.code,
              departmentId: sub.departmentId,
            }))
          );
        }
      });
      setSubDepartments(allSubDepts);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedUser(null);
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'EMPLOYEE',
      password: '',
      departmentId: '',
      subDepartmentId: '',
    });
    setFilteredSubDepartments([]);
    setIsFormModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEditMode(true);
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departmentId: user.departmentId || '',
      subDepartmentId: user.subDepartmentId || '',
    });
    // Filter sub-departments for edit mode
    if (user.departmentId) {
      const filtered = subDepartments.filter(
        (sub) => sub.departmentId === user.departmentId
      );
      setFilteredSubDepartments(filtered);
    }
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'EMPLOYEE',
      password: '',
      departmentId: '',
      subDepartmentId: '',
    });
    setFilteredSubDepartments([]);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (isEditMode && selectedUser) {
        await userService.updateUser(selectedUser.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          departmentId: formData.departmentId || null,
          subDepartmentId: formData.subDepartmentId || null,
        });
        setSuccess('Cập nhật người dùng thành công');
      } else {
        if (!formData.password) {
          setError('Mật khẩu là bắt buộc');
          return;
        }

        // Create user
        const newUser = await userService.createUser({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          password: formData.password,
          departmentId: formData.departmentId || null,
          subDepartmentId: formData.subDepartmentId || null,
        });

        // Employee is auto-created by backend for EMPLOYEE role
        // No need to create employee manually from frontend

        setSuccess('Tạo người dùng và nhân viên thành công');
      }

      await fetchUsers();
      closeFormModal();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      setLoading(true);
      setError(null);
      await userService.updateUser(user.id, {
        isActive: !user.isActive,
      });
      setSuccess(`${user.isActive ? 'Khóa' : 'Mở khóa'} người dùng thành công`);
      await fetchUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      setError(null);
      await userService.deleteUser(selectedUser.id);
      setSuccess('Xóa người dùng thành công');
      await fetchUsers();
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Users className="w-6 h-6 mr-2 text-blue-600" />
          Quản lý người dùng
        </h2>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
          <button
            onClick={openCreateModal}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Thêm mới
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không tìm thấy người dùng</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ tên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bộ phận</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phòng ban</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hoạt động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{getRoleDisplayName(user.role)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{user.departmentName || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{user.subDepartmentName || '-'}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Hoạt động' : 'Khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openDetailModal(user)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-green-600 hover:text-green-800"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={loading}
                        className="text-orange-600 hover:text-orange-800 disabled:opacity-50"
                        title={user.isActive ? 'Khóa' : 'Mở khóa'}
                      >
                        {user.isActive ? (
                          <Lock className="w-4 h-4" />
                        ) : (
                          <Unlock className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Chi tiết người dùng</h2>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ</label>
                  <p className="text-gray-900">{selectedUser.firstName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                  <p className="text-gray-900">{selectedUser.lastName}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò</label>
                  <p className="text-gray-900">{getRoleDisplayName(selectedUser.role)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedUser.isActive ? 'Hoạt động' : 'Khóa'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày tạo</label>
                  <p className="text-gray-900">{new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày cập nhật</label>
                  <p className="text-gray-900">{new Date(selectedUser.updatedAt).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {/* Supervisor Info Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông tin cấp trên</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cấp trên 1</label>
                    {selectedUser.supervisor1 ? (
                      <div className="text-gray-900">
                        <p className="font-medium">{selectedUser.supervisor1.firstName} {selectedUser.supervisor1.lastName}</p>
                        <p className="text-sm text-gray-500">{selectedUser.supervisor1.email}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500">-</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cấp trên 2</label>
                    {selectedUser.supervisor2 ? (
                      <div className="text-gray-900">
                        <p className="font-medium">{selectedUser.supervisor2.firstName} {selectedUser.supervisor2.lastName}</p>
                        <p className="text-sm text-gray-500">{selectedUser.supervisor2.email}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500">-</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal (Create/Edit) */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isEditMode ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}
                </h2>
                <button
                  onClick={closeFormModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    disabled={isEditMode}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>

                {!isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="EMPLOYEE">Nhân viên</option>
                    <option value="TEAM_LEAD">Trưởng phòng</option>
                    <option value="DEPARTMENT_HEAD">Trưởng bộ phận</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận</label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn bộ phận --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban</label>
                  <select
                    name="subDepartmentId"
                    value={formData.subDepartmentId}
                    onChange={handleFormChange}
                    disabled={!formData.departmentId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {filteredSubDepartments.map((subDept) => (
                      <option key={subDept.id} value={subDept.id}>
                        {subDept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={closeFormModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Xác nhận xóa</h2>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>? Hành động này không thể hoàn tác.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

