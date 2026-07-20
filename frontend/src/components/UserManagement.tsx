import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Download,
  Edit,
  Eye,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle,
  KeyRound
} from 'lucide-react';
import userService from '@services/userService';
import { API_BASE_URL } from '../config/api';
import { useUsers, userKeys, useDepartments } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import TableFilter, { FilterField } from './TableFilter';
import AdminResetPasswordModal from './AdminResetPasswordModal';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';

interface SecondaryDeptEntry {
  departmentId: string;
  subDepartmentId: string;
  role: string;
}

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
  /** New: array of secondary departments */
  secondaryDepartments?: Array<{
    id?: string;
    departmentId: string;
    departmentName?: string | null;
    subDepartmentId?: string | null;
    subDepartmentName?: string | null;
    role: string;
  }>;
  supervisor1Id?: string | null;
  supervisor2Id?: string | null;
  supervisor1?: { id: string; firstName: string; lastName: string; email: string } | null;
  supervisor2?: { id: string; firstName: string; lastName: string; email: string } | null;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password?: string;
  departmentId?: string;
  subDepartmentId?: string;
  secondaryDepartments: SecondaryDeptEntry[];
  supervisor1Id?: string;
  supervisor2Id?: string;
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const { data: usersData, isLoading: loading } = useUsers({ page: 1, limit: 100, enabled: isAdmin });
  const users = usersData?.data || [];
  const { data: departments = [] } = useDepartments();

  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', role: '', isActive: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filterFields: FilterField[] = [
    {
      key: 'role',
      label: 'Vai trò',
      type: 'select',
      options: [
        { value: 'EMPLOYEE', label: 'Nhân viên' },
        { value: 'TEAM_LEAD', label: 'Trưởng phòng' },
        { value: 'DEPARTMENT_HEAD', label: 'Trưởng bộ phận' },
        { value: 'ADMIN', label: 'Admin' },
      ],
    },
    {
      key: 'isActive',
      label: 'Trạng thái',
      type: 'select',
      options: [
        { value: 'true', label: 'Hoạt động' },
        { value: 'false', label: 'Khóa' },
      ],
    },
  ];

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
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [filteredSubDepartments, setFilteredSubDepartments] = useState<SubDepartment[]>([]);
  // Per-entry filtered sub-departments for secondary list
  const [filteredSecondarySubDepts, setFilteredSecondarySubDepts] = useState<SubDepartment[][]>([]);

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    password: '',
    departmentId: '',
    subDepartmentId: '',
    secondaryDepartments: [],
    supervisor1Id: '',
    supervisor2Id: '',
  });

  const skipSubDeptResetRef = useRef(false);

  useEffect(() => {
    fetchSubDepartments();
  }, []);

  // Filter sub-departments when primary department changes
  useEffect(() => {
    if (formData.departmentId) {
      const filtered = subDepartments.filter(sub => sub.departmentId === formData.departmentId);
      setFilteredSubDepartments(filtered);
      if (skipSubDeptResetRef.current) {
        skipSubDeptResetRef.current = false;
      } else {
        setFormData(prev => ({ ...prev, subDepartmentId: '' }));
      }
    } else {
      setFilteredSubDepartments([]);
    }
  }, [formData.departmentId, subDepartments]);

  // Re-sync secondary sub-dept filter lists when subDepartments data loads.
  // Fixes the race where openEditModal runs before fetchSubDepartments completes.
  useEffect(() => {
    if (!subDepartments.length) return;
    setFilteredSecondarySubDepts(prev =>
      prev.map((arr, i) => {
        const deptId = formData.secondaryDepartments[i]?.departmentId;
        // Only backfill entries that are empty but have a departmentId set
        if (arr.length === 0 && deptId) {
          return subDepartments.filter(s => s.departmentId === deptId);
        }
        return arr;
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subDepartments]);

  // ─── Secondary department helpers ────────────────────────────────────────────
  const addSecondaryDept = () => {
    setFormData(prev => ({
      ...prev,
      secondaryDepartments: [...prev.secondaryDepartments, { departmentId: '', subDepartmentId: '', role: 'EMPLOYEE' }],
    }));
    setFilteredSecondarySubDepts(prev => [...prev, []]);
  };

  const removeSecondaryDept = (index: number) => {
    setFormData(prev => ({
      ...prev,
      secondaryDepartments: prev.secondaryDepartments.filter((_, i) => i !== index),
    }));
    setFilteredSecondarySubDepts(prev => prev.filter((_, i) => i !== index));
  };

  const updateSecondaryDept = (index: number, field: keyof SecondaryDeptEntry, value: string) => {
    setFormData(prev => {
      const updated = [...prev.secondaryDepartments];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'departmentId') updated[index].subDepartmentId = '';
      return { ...prev, secondaryDepartments: updated };
    });
    if (field === 'departmentId') {
      const filtered = subDepartments.filter(s => s.departmentId === value);
      setFilteredSecondarySubDepts(prev => {
        const updated = [...prev];
        updated[index] = filtered;
        return updated;
      });
    }
  };

  const fetchSubDepartments = async () => {
    try {
      const response = await fetch(API_BASE_URL + '/departments/public/all');
      if (!response.ok) throw new Error('Failed to fetch departments');
      const data = await response.json();

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
      console.error('Failed to fetch sub-departments:', err);
    }
  };

  const filteredUsers = users.filter(user => {
    const s = filterValues._search.toLowerCase();
    const matchesSearch =
      user.firstName.toLowerCase().includes(s) ||
      user.lastName.toLowerCase().includes(s) ||
      user.email.toLowerCase().includes(s);
    const matchesRole = !filterValues.role || user.role === filterValues.role;
    const matchesActive =
      !filterValues.isActive ||
      (filterValues.isActive === 'true' && user.isActive) ||
      (filterValues.isActive === 'false' && !user.isActive);
    return matchesSearch && matchesRole && matchesActive;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
      secondaryDepartments: [],
    });
    setFilteredSubDepartments([]);
    setFilteredSecondarySubDepts([]);
    setIsFormModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setIsEditMode(true);
    setSelectedUser(user);
    skipSubDeptResetRef.current = true;

    // Map secondaryDepartments array (new) or fallback to legacy fields
    const secondaryList: SecondaryDeptEntry[] = (user.secondaryDepartments ?? []).map(s => ({
      departmentId: s.departmentId,
      subDepartmentId: s.subDepartmentId ?? '',
      role: s.role,
    }));

    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departmentId: user.departmentId || '',
      subDepartmentId: user.subDepartmentId || '',
      secondaryDepartments: secondaryList,
      supervisor1Id: user.supervisor1Id || '',
      supervisor2Id: user.supervisor2Id || '',
    });

    if (user.departmentId) {
      setFilteredSubDepartments(subDepartments.filter(s => s.departmentId === user.departmentId));
    }

    // Pre-populate filtered sub-depts for each secondary entry
    const preFiltered = secondaryList.map(s =>
      s.departmentId ? subDepartments.filter(sub => sub.departmentId === s.departmentId) : []
    );
    setFilteredSecondarySubDepts(preFiltered);
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
      secondaryDepartments: [],
      supervisor1Id: '',
      supervisor2Id: '',
    });
    setFilteredSubDepartments([]);
    setFilteredSecondarySubDepts([]);
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
      setError(null);

      if (isEditMode && selectedUser) {
        await userService.updateUser(selectedUser.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          departmentId: formData.departmentId || null,
          subDepartmentId: formData.subDepartmentId || null,
          secondaryDepartments: formData.secondaryDepartments.map(s => ({
            departmentId: s.departmentId,
            subDepartmentId: s.subDepartmentId || null,
            role: s.role,
          })),
          supervisor1Id: formData.supervisor1Id || null,
          supervisor2Id: formData.supervisor2Id || null,
        });
        setSuccess('Cập nhật người dùng thành công');
      } else {
        if (!formData.password) {
          setError('Mật khẩu là bắt buộc');
          return;
        }

        const newUser = await userService.createUser({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          password: formData.password,
          departmentId: formData.departmentId || null,
          subDepartmentId: formData.subDepartmentId || null,
          secondaryDepartments: formData.secondaryDepartments.map(s => ({
            departmentId: s.departmentId,
            subDepartmentId: s.subDepartmentId || null,
            role: s.role,
          })),
        });

        // Employee is auto-created by backend for EMPLOYEE role
        // No need to create employee manually from frontend

        setSuccess('Tạo người dùng và nhân viên thành công');
      }

      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      closeFormModal();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      setError(null);
      await userService.updateUser(user.id, {
        isActive: !user.isActive,
      });
      setSuccess(`${user.isActive ? 'Khóa' : 'Mở khóa'} người dùng thành công`);
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      setError(null);
      await userService.deleteUser(selectedUser.id);
      setSuccess('Xóa người dùng thành công');
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      setIsDeleteConfirmOpen(false);
      setSelectedUser(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-4">
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
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Users className="w-6 h-6 mr-2 text-blue-600" />
          Quản lý người dùng
        </h2>
        <button
          onClick={openCreateModal}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Thêm mới
        </button>
      </div>

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm theo họ tên, email..."
      />

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không tìm thấy người dùng</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Họ tên</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Email</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Vai trò</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Bộ phận</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Phòng ban</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Trạng thái</th>
                  <th className="px-3 py-3 sm:px-6 sm:py-4 text-center text-sm font-semibold text-gray-900">Hoạt động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, index) => (
                  <tr
                    key={user.id}
                    onClick={() => openDetailModal(user)}
                    className={`border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      {user.lastName} {user.firstName}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-700 border-r border-gray-200">
                      {user.email}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200">
                      <div>{getRoleDisplayName(user.role)}</div>
                      {(user.secondaryDepartments ?? []).map((s, i) => (
                        <div key={i} className="text-xs text-blue-600 mt-0.5">(Phụ {i+1}) {getRoleDisplayName(s.role)}</div>
                      ))}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200">
                      <div>{user.departmentName || '-'}</div>
                      {(user.secondaryDepartments ?? []).map((s, i) => (
                        <div key={i} className="text-xs text-blue-600 mt-0.5">(Phụ {i+1}) {s.departmentName}</div>
                      ))}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-sm text-gray-900 border-r border-gray-200">
                      <div>{user.subDepartmentName || '-'}</div>
                      {(user.secondaryDepartments ?? []).map((s, i) => s.subDepartmentName ? (
                        <div key={i} className="text-xs text-blue-600 mt-0.5">(Phụ {i+1}) {s.subDepartmentName}</div>
                      ) : null)}
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-center border-r border-gray-200">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        user.isActive
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-red-100 text-red-700 border border-red-300'
                      }`}>
                        {user.isActive ? 'Hoạt động' : 'Khóa'}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(user); }}
                          disabled={loading}
                          className="p-1.5 text-orange-600 hover:bg-orange-100 rounded-md transition-colors disabled:opacity-50"
                          title={user.isActive ? 'Khóa' : 'Mở khóa'}
                        >
                          {user.isActive ? (
                            <Lock className="w-5 h-5" />
                          ) : (
                            <Unlock className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setResetPasswordUser(user); }}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded-md transition-colors"
                          title="Đặt lại mật khẩu"
                        >
                          <KeyRound className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                            setIsDeleteConfirmOpen(true);
                          }}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredUsers.length)} / {filteredUsers.length} mục
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen && !!selectedUser} onClose={closeDetailModal} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            {/* Header — shrink-0, outside scroll */}
            <div className="px-3 py-3 sm:px-6 sm:py-4 border-b border-gray-200 shrink-0">
              <div className="flex justify-between items-center">
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
            </div>
            {/* Body — scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {selectedUser && (<>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Họ</label>
                  <p className="text-gray-900">{selectedUser.lastName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên</label>
                  <p className="text-gray-900">{selectedUser.firstName}</p>
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

              {/* Secondary Departments Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Bộ phận phụ</h3>
                {(() => {
                  const list = selectedUser.secondaryDepartments?.length
                    ? selectedUser.secondaryDepartments
                    : selectedUser.secondaryDepartmentId
                      ? [{ departmentName: selectedUser.secondaryDepartmentName, subDepartmentName: selectedUser.secondarySubDepartmentName, role: selectedUser.secondaryRole ?? '' }]
                      : [];
                  if (list.length === 0) return <p className="text-sm text-gray-400 italic">Không có bộ phận phụ</p>;
                  return (
                    <div className="space-y-2">
                      {list.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <span className="text-xs font-medium text-blue-600 w-12 shrink-0">Phụ {i+1}</span>
                          <span className="text-sm text-gray-900 flex-1">{s.departmentName || '-'}</span>
                          <span className="text-sm text-gray-600 w-32">{s.subDepartmentName || 'Tất cả phòng'}</span>
                          <span className="text-sm font-medium text-blue-700 w-32">{getRoleDisplayName(s.role)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Supervisor Info Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Thông tin cấp trên</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cấp trên 1</label>
                    {selectedUser.supervisor1 ? (
                      <div className="text-gray-900">
                        <p className="font-medium">{selectedUser.supervisor1.lastName} {selectedUser.supervisor1.firstName}</p>
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
                        <p className="font-medium">{selectedUser.supervisor2.lastName} {selectedUser.supervisor2.firstName}</p>
                        <p className="text-sm text-gray-500">{selectedUser.supervisor2.email}</p>
                      </div>
                    ) : (
                      <p className="text-gray-500">-</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeDetailModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    openEditModal(selectedUser);
                  }}
                  disabled={!isAdmin}
                  title={!isAdmin ? "Bạn không có quyền chỉnh sửa" : ""}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Chỉnh sửa
                </button>
              </div>
              </>)}
            </div>
          </div>
      </Modal>

      {/* Form Modal (Create/Edit) */}
      <Modal isOpen={isFormModalOpen} onClose={closeFormModal} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            {/* Header — shrink-0, outside scroll */}
            <div className="px-3 py-3 sm:px-6 sm:py-4 border-b border-gray-200 shrink-0">
              <div className="flex justify-between items-center">
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
            </div>
            {/* Body — scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Họ *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
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

                {/* Bộ phận phụ — dynamic list */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Bộ phận phụ</label>
                    <button
                      type="button"
                      onClick={addSecondaryDept}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Thêm bộ phận phụ
                    </button>
                  </div>

                  {formData.secondaryDepartments.length === 0 && (
                    <p className="text-sm text-gray-400 italic">Chưa có bộ phận phụ</p>
                  )}

                  {formData.secondaryDepartments.map((entry, i) => (
                    <div key={i} className="flex gap-2 mb-2 items-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <select
                        value={entry.departmentId}
                        onChange={e => updateSecondaryDept(i, 'departmentId', e.target.value)}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Bộ phận --</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>

                      <select
                        value={entry.role}
                        onChange={e => updateSecondaryDept(i, 'role', e.target.value)}
                        className="w-36 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="EMPLOYEE">Nhân viên</option>
                        <option value="TEAM_LEAD">Trưởng phòng</option>
                        <option value="DEPARTMENT_HEAD">Trưởng bộ phận</option>
                      </select>

                      <select
                        value={entry.subDepartmentId}
                        onChange={e => updateSecondaryDept(i, 'subDepartmentId', e.target.value)}
                        disabled={!entry.departmentId}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        <option value="">-- Phòng ban (tùy chọn) --</option>
                        {(filteredSecondarySubDepts[i] ?? []).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeSecondaryDept(i)}
                        className="p-1 text-red-400 hover:text-red-600 transition-colors shrink-0"
                        title="Xóa"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Supervisor Assignment */}
                {isEditMode && (
                  <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Cấp trên đánh giá</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Cấp trên 1</label>
                        <select
                          name="supervisor1Id"
                          value={formData.supervisor1Id || ''}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Không có --</option>
                          {users.filter(u => u.id !== selectedUser?.id && (u.role === 'TEAM_LEAD' || u.role === 'DEPARTMENT_HEAD' || u.role === 'ADMIN')).map(u => (
                            <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({getRoleDisplayName(u.role)})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Cấp trên 2</label>
                        <select
                          name="supervisor2Id"
                          value={formData.supervisor2Id || ''}
                          onChange={handleFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Không có --</option>
                          {users.filter(u => u.id !== selectedUser?.id && (u.role === 'TEAM_LEAD' || u.role === 'DEPARTMENT_HEAD' || u.role === 'ADMIN')).map(u => (
                            <option key={u.id} value={u.id}>{u.lastName} {u.firstName} ({getRoleDisplayName(u.role)})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 col-span-2">
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
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteConfirmOpen && !!selectedUser} onClose={() => setIsDeleteConfirmOpen(false)} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Xác nhận xóa</h2>
              <p className="text-gray-600 mb-6">
                Bạn có chắc chắn muốn xóa người dùng <strong>{selectedUser?.lastName} {selectedUser?.firstName}</strong>? Hành động này không thể hoàn tác.
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
      </Modal>

      {/* Admin Reset Password Modal */}
      {resetPasswordUser && (
        <AdminResetPasswordModal
          userId={resetPasswordUser.id}
          employeeName={`${resetPasswordUser.lastName} ${resetPasswordUser.firstName}`}
          onClose={() => setResetPasswordUser(null)}
        />
      )}
    </div>
  );
};

export default UserManagement;

