import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Edit,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  AlertTriangle,
  FileDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePositions, positionKeys } from '../hooks';
import { useQueryClient } from '@tanstack/react-query';
import positionService, { Position } from '@services/positionService';
import TableFilter, { FilterField } from './TableFilter';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';

import { POSITION_CATEGORY_LABEL, PositionCategory } from '../services/positionService';
import apiClient from '@services/apiClient';

interface FormData {
  code: string;
  name: string;
  description: string;
  category: PositionCategory;
}

interface PositionManagementProps {
  initialPositionId?: string;
}

const PositionManagement = ({ initialPositionId }: PositionManagementProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD;
  const { data: positions = [], isLoading: loading } = usePositions(canManage);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', name: '' });
  const [usageFilter, setUsageFilter] = useState<'all' | 'in_use' | 'empty'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<PositionCategory>('OFFICE');
  const [bulkLoading, setBulkLoading] = useState(false);

  const filterFields: FilterField[] = [
    {
      key: 'name',
      label: 'Tên vị trí',
      type: 'text',
      placeholder: 'Lọc theo tên vị trí...',
    },
  ];

  const employeeCountOf = (pos: Position): number => pos.employees?.length ?? 0;
  // Warn when a position with active employees hasn't been categorized —
  // it means the evaluation mode (Quick/Full) isn't chosen yet.
  const needsCategory = (pos: Position): boolean => employeeCountOf(pos) > 0 && !pos.category;

  const usageStats = useMemo(() => {
    let inUse = 0;
    let empty = 0;
    for (const pos of positions) {
      if (employeeCountOf(pos) > 0) inUse++;
      else empty++;
    }
    return { total: positions.length, inUse, empty };
  }, [positions]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    description: '',
    category: 'OFFICE',
  });
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<{ employeeCount: number; levelCount: number; responsibilityCount: number } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Open detail modal on mount when initialPositionId is provided
  useEffect(() => {
    if (initialPositionId && positions.length > 0 && !isDetailModalOpen) {
      const pos = positions.find(p => p.id === initialPositionId);
      if (pos) openDetailModal(pos);
    }
  // Only run when positions first load; don't re-open after user closes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPositionId, positions.length]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      await apiClient.download('/positions/export.xlsx', `vi-tri-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      setError('Không thể xuất Excel. Vui lòng thử lại.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isEditMode && selectedPosition) {
        await positionService.updatePosition(selectedPosition.id, formData);
        setSuccess('Cập nhật vị trí thành công');
      } else {
        await positionService.createPosition(formData);
        setSuccess('Tạo vị trí thành công');
      }
      setIsFormModalOpen(false);
      queryClient.invalidateQueries({ queryKey: positionKeys.all });
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu vị trí');
    }
  };

  const handleDelete = async (position: Position) => {
    try {
      setDeleteLoading(true);
      const usage = await positionService.getPositionUsage(position.id);
      setDeleteUsage(usage);
      setDeleteTarget(position);
    } catch {
      setError('Không thể kiểm tra thông tin sử dụng');
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await positionService.deletePosition(deleteTarget.id);
      setSuccess('Xóa vị trí thành công');
      setDeleteTarget(null);
      setDeleteUsage(null);
      queryClient.invalidateQueries({ queryKey: positionKeys.all });
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xóa vị trí');
      setDeleteTarget(null);
      setDeleteUsage(null);
    }
  };

  const handleBulkCategoryChange = async () => {
    if (selectedPositionIds.size === 0) return;
    try {
      setBulkLoading(true);
      await positionService.bulkUpdateCategory([...selectedPositionIds], bulkCategory);
      setSuccess(`Đã cập nhật danh mục cho ${selectedPositionIds.size} vị trí`);
      setSelectedPositionIds(new Set());
      queryClient.invalidateQueries({ queryKey: positionKeys.all });
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật danh mục');
    } finally {
      setBulkLoading(false);
    }
  };

  const openCreateModal = () => {
    setIsEditMode(false);
    setFormData({ code: '', name: '', description: '', category: 'OFFICE' });
    setIsFormModalOpen(true);
  };

  const openCreateModalRef = React.useRef(openCreateModal);
  openCreateModalRef.current = openCreateModal;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openCreateModalRef.current();
      }
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Tìm"]');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const openEditModal = (position: Position) => {
    setIsEditMode(true);
    setSelectedPosition(position);
    setFormData({
      code: position.code,
      name: position.name,
      description: position.description || '',
      category: (position.category as PositionCategory) || 'OFFICE',
    });
    setIsFormModalOpen(true);
  };

  const openDetailModal = (position: Position) => {
    setSelectedPosition(position);
    setIsDetailModalOpen(true);
  };

  const closeModals = () => {
    setIsFormModalOpen(false);
    setIsDetailModalOpen(false);
    setSelectedPosition(null);
  };

  const filteredPositions = useMemo(() => {
    const s = filterValues._search.toLowerCase();
    const nameFilter = filterValues.name?.toLowerCase() ?? '';
    return positions
      .filter(pos => {
        const matchesSearch = pos.code.toLowerCase().includes(s) || pos.name.toLowerCase().includes(s);
        const matchesName = !nameFilter || pos.name.toLowerCase().includes(nameFilter);
        const count = employeeCountOf(pos);
        const matchesUsage =
          usageFilter === 'all'
          || (usageFilter === 'in_use' && count > 0)
          || (usageFilter === 'empty' && count === 0);
        return matchesSearch && matchesName && matchesUsage;
      })
      // Sort: positions with more employees first; ties broken by needs-category warning, then name
      .sort((a, b) => {
        const diff = employeeCountOf(b) - employeeCountOf(a);
        if (diff !== 0) return diff;
        const warnDiff = Number(needsCategory(b)) - Number(needsCategory(a));
        if (warnDiff !== 0) return warnDiff;
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [positions, filterValues, usageFilter]);

  const totalPages = Math.ceil(filteredPositions.length / itemsPerPage);
  const paginatedPositions = filteredPositions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes - handled by TableFilter onChange

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Quản lý vị trí</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            {exportLoading ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Thêm vị trí
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {/* Search & Filter */}
      <TableFilter
        filters={filterFields}
        values={filterValues}
        onChange={(vals) => { setFilterValues(vals); setCurrentPage(1); }}
        searchPlaceholder="Tìm kiếm theo mã vị trí, tên vị trí..."
      />

      {/* Usage filter chips */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all', label: 'Tất cả', count: usageStats.total },
          { key: 'in_use', label: 'Đang dùng', count: usageStats.inUse },
          { key: 'empty', label: 'Trống', count: usageStats.empty },
        ] as const).map(chip => (
          <button
            key={chip.key}
            onClick={() => { setUsageFilter(chip.key); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              usageFilter === chip.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {chip.label} <span className={`ml-1 ${usageFilter === chip.key ? 'text-blue-100' : 'text-gray-500'}`}>({chip.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : filteredPositions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            {selectedPositionIds.size > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-sm font-medium text-blue-800">
                  Đã chọn {selectedPositionIds.size} vị trí
                </span>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as PositionCategory)}
                  className="px-3 py-1.5 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PRODUCTION">{POSITION_CATEGORY_LABEL.PRODUCTION}</option>
                  <option value="OFFICE">{POSITION_CATEGORY_LABEL.OFFICE}</option>
                  <option value="MANAGEMENT">{POSITION_CATEGORY_LABEL.MANAGEMENT}</option>
                </select>
                <button
                  onClick={handleBulkCategoryChange}
                  disabled={bulkLoading}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {bulkLoading ? 'Đang cập nhật...' : 'Đổi danh mục'}
                </button>
                <button
                  onClick={() => setSelectedPositionIds(new Set())}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                  <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 w-10">
                    <input
                      type="checkbox"
                      checked={paginatedPositions.length > 0 && paginatedPositions.every(p => selectedPositionIds.has(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPositionIds(prev => new Set([...prev, ...paginatedPositions.map(p => p.id)]));
                        } else {
                          setSelectedPositionIds(prev => {
                            const next = new Set(prev);
                            paginatedPositions.forEach(p => next.delete(p.id));
                            return next;
                          });
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mã vị trí</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Tên vị trí</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-r border-gray-200">Số NV</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Danh mục</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200">Mô tả</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPositions.map((position, index) => {
                  const count = employeeCountOf(position);
                  const warn = needsCategory(position);
                  const rowClass = warn
                    ? 'bg-amber-50 hover:bg-amber-100'
                    : count > 0
                      ? (index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50')
                      : (index % 2 === 0 ? 'bg-white hover:bg-blue-50 opacity-70' : 'bg-gray-50 hover:bg-blue-50 opacity-70');
                  return (
                  <tr
                    key={position.id}
                    className={`border-b border-gray-200 transition-colors ${rowClass}`}
                  >
                    <td className="px-4 py-4 text-center border-r border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedPositionIds.has(position.id)}
                        onChange={(e) => {
                          setSelectedPositionIds(prev => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(position.id);
                            else next.delete(position.id);
                            return next;
                          });
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600 border-r border-gray-200">
                      {position.code}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <span>{position.name}</span>
                        {warn && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 border border-amber-300"
                            title="Vị trí đang có nhân viên nhưng chưa chọn danh mục — cần chọn để xác định chế độ đánh giá Quick/Full"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            Chưa chọn danh mục
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center border-r border-gray-200">
                      {count > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium"
                          title={`${count} nhân viên đang được gán vị trí này`}
                        >
                          <Users className="w-3 h-3" />
                          {count}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">–</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {position.category ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          position.category === 'PRODUCTION' ? 'bg-orange-100 text-orange-800'
                          : position.category === 'MANAGEMENT' ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                        }`}>
                          {POSITION_CATEGORY_LABEL[position.category as PositionCategory]}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Chưa chọn</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 border-r border-gray-200">
                      {position.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => openDetailModal(position)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(position)}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(position)}
                          disabled={deleteLoading}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50"
                          title="Xóa"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredPositions.length)} / {filteredPositions.length} vị trí
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  page === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
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

      {/* Form Modal */}
      <Modal isOpen={isFormModalOpen} onClose={closeModals} showBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {isEditMode ? 'Chỉnh sửa vị trí' : 'Thêm vị trí mới'}
                </h3>
                <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã vị trí *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên vị trí *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as PositionCategory })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="PRODUCTION">{POSITION_CATEGORY_LABEL.PRODUCTION}</option>
                    <option value="OFFICE">{POSITION_CATEGORY_LABEL.OFFICE}</option>
                    <option value="MANAGEMENT">{POSITION_CATEGORY_LABEL.MANAGEMENT}</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Sản xuất = Chấm nhanh (Quick mode). Văn phòng / Quản lý = Đánh giá đầy đủ (Full mode) với mục tiêu, IDP, bằng chứng.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModals}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {isEditMode ? 'Cập nhật' : 'Thêm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailModalOpen && !!selectedPosition} onClose={closeModals} showBackdrop closeOnBackdrop={true}>
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 flex flex-col max-h-[calc(100vh-2rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Chi tiết vị trí</h3>
                <button onClick={closeModals} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {selectedPosition && (<>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Mã vị trí</label>
                  <p className="text-gray-900">{selectedPosition.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tên vị trí</label>
                  <p className="text-gray-900">{selectedPosition.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Danh mục</label>
                  <p className="text-gray-900">
                    {selectedPosition.category
                      ? POSITION_CATEGORY_LABEL[selectedPosition.category as PositionCategory]
                      : 'Văn phòng'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Mô tả</label>
                  <p className="text-gray-900">{selectedPosition.description || '-'}</p>
                </div>
              </div>

              {/* Cross-links */}
              <div className="flex gap-2 pt-3 border-t border-gray-100 mt-3">
                <button
                  onClick={() => {
                    closeModals();
                    navigate(`?tab=responsibilities&positionId=${selectedPosition.id}`);
                  }}
                  className="flex-1 px-3 py-2 text-sm text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 text-center"
                >
                  Xem tiêu chí ({selectedPosition._count?.responsibilities ?? 0})
                </button>
                <button
                  onClick={() => {
                    closeModals();
                    navigate(`?tab=levels&positionId=${selectedPosition.id}`);
                  }}
                  className="flex-1 px-3 py-2 text-sm text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-50 text-center"
                >
                  Xem bậc lương ({selectedPosition._count?.levels ?? 0})
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    openEditModal(selectedPosition);
                    setIsDetailModalOpen(false);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              </div>
              </>)}
            </div>
          </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => { setDeleteTarget(null); setDeleteUsage(null); }} showBackdrop closeOnBackdrop>
        <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-800 mb-3">Xác nhận xóa vị trí</h3>
          {deleteUsage && (deleteUsage.employeeCount > 0 || deleteUsage.levelCount > 0 || deleteUsage.responsibilityCount > 0) && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 space-y-1">
              <p className="font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Cảnh báo — vị trí đang được sử dụng:</p>
              {deleteUsage.employeeCount > 0 && <p>• {deleteUsage.employeeCount} nhân viên đang gán vị trí này</p>}
              {deleteUsage.levelCount > 0 && <p>• {deleteUsage.levelCount} bậc lương</p>}
              {deleteUsage.responsibilityCount > 0 && <p>• {deleteUsage.responsibilityCount} tiêu chí đánh giá</p>}
              <p className="mt-2">Xóa vị trí sẽ ảnh hưởng tất cả dữ liệu liên quan.</p>
            </div>
          )}
          <p className="text-gray-600 text-sm mb-4">Bạn có chắc chắn muốn xóa vị trí <strong>{deleteTarget?.name}</strong>?</p>
          <div className="flex gap-3">
            <button onClick={() => { setDeleteTarget(null); setDeleteUsage(null); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
            <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Xóa</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PositionManagement;

