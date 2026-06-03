import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, X, Download, Search, Users, CheckSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFileUrl } from '../config/api';
import apiClient from '../services/apiClient';
import FileUpload from './FileUpload';

interface ProjectTask {
  id: string;
  tieuDe: string;
  moTa?: string;
  nguoiPhuTrach?: string;
  deadline?: string;
  trangThai: string;
  thuTu: number;
}

interface ProjectMember {
  id: string;
  userId: string;
  vaiTro: string;
}

interface Project {
  id: string;
  maDuAn: string;
  tenDuAn: string;
  moTa?: string;
  ngayBatDau: string;
  ngayKetThuc?: string;
  trangThai: string;
  nguoiTaoId: string;
  fileDinhKem?: string;
  members: ProjectMember[];
  tasks: ProjectTask[];
  createdAt: string;
}

const TRANG_THAI_OPTIONS = ['Lên kế hoạch', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'];
const TASK_TRANG_THAI_OPTIONS = ['Chưa bắt đầu', 'Đang làm', 'Hoàn thành', 'Trễ'];

const trangThaiBadge = (tt: string) => {
  if (tt === 'Đang thực hiện') return 'bg-blue-100 text-blue-700';
  if (tt === 'Hoàn thành') return 'bg-green-100 text-green-700';
  if (tt === 'Tạm dừng') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
};

const taskTrangThaiBadge = (tt: string) => {
  if (tt === 'Đang làm') return 'bg-blue-100 text-blue-700';
  if (tt === 'Hoàn thành') return 'bg-green-100 text-green-700';
  if (tt === 'Trễ') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const ProjectList = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 10;

  const [search, setSearch] = useState('');
  const [filterTrangThai, setFilterTrangThai] = useState('');

  // Project modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    tenDuAn: '',
    moTa: '',
    ngayBatDau: new Date().toISOString().split('T')[0],
    ngayKetThuc: '',
    trangThai: 'Lên kế hoạch',
  });

  // Detail modal (tasks panel inside view)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newTask, setNewTask] = useState({ tieuDe: '', moTa: '', nguoiPhuTrach: '', deadline: '', trangThai: 'Chưa bắt đầu' });
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => { fetchProjects(); }, [currentPage, filterTrangThai]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page: currentPage, limit: itemsPerPage };
      if (search) params.search = search;
      if (filterTrangThai) params.trangThai = filterTrangThai;

      const response = await apiClient.get('/projects', { params }) as any;
      const result = response?.data ?? response;
      setProjects(Array.isArray(result) ? result : []);
      if (response?.pagination) {
        setTotalPages(response.pagination.totalPages);
        setTotal(response.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setIsViewMode(false);
    setSelectedFile(null);
    setFormData({ tenDuAn: '', moTa: '', ngayBatDau: new Date().toISOString().split('T')[0], ngayKetThuc: '', trangThai: 'Lên kế hoạch' });
    setIsProjectModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setIsViewMode(false);
    setSelectedFile(null);
    setFormData({
      tenDuAn: project.tenDuAn,
      moTa: project.moTa ?? '',
      ngayBatDau: project.ngayBatDau?.split('T')[0] ?? '',
      ngayKetThuc: project.ngayKetThuc?.split('T')[0] ?? '',
      trangThai: project.trangThai,
    });
    setIsProjectModalOpen(true);
  };

  const openDetailModal = (project: Project) => {
    setSelectedProject(project);
    setIsDetailOpen(true);
    setIsAddingTask(false);
    setNewTask({ tieuDe: '', moTa: '', nguoiPhuTrach: '', deadline: '', trangThai: 'Chưa bắt đầu' });
  };

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (selectedFile) fd.append('file', selectedFile);

      if (editingProject) {
        await apiClient.put(`/projects/${editingProject.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await apiClient.post('/projects', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setIsProjectModalOpen(false);
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dự án này?')) return;
    try {
      await apiClient.delete(`/projects/${id}`);
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa dự án');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      const payload: Record<string, string> = { tieuDe: newTask.tieuDe };
      if (newTask.moTa) payload.moTa = newTask.moTa;
      if (newTask.nguoiPhuTrach) payload.nguoiPhuTrach = newTask.nguoiPhuTrach;
      if (newTask.deadline) payload.deadline = newTask.deadline;
      payload.trangThai = newTask.trangThai;

      await apiClient.post(`/projects/${selectedProject.id}/tasks`, payload);
      const refreshed = await apiClient.get(`/projects/${selectedProject.id}`) as any;
      const updated = refreshed?.data ?? refreshed;
      setSelectedProject(updated);
      setIsAddingTask(false);
      setNewTask({ tieuDe: '', moTa: '', nguoiPhuTrach: '', deadline: '', trangThai: 'Chưa bắt đầu' });
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi thêm công việc');
    }
  };

  const handleUpdateTaskStatus = async (projectId: string, taskId: string, trangThai: string) => {
    try {
      await apiClient.put(`/projects/${projectId}/tasks/${taskId}`, { trangThai });
      const refreshed = await apiClient.get(`/projects/${projectId}`) as any;
      const updated = refreshed?.data ?? refreshed;
      setSelectedProject(updated);
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi cập nhật công việc');
    }
  };

  const handleDeleteTask = async (projectId: string, taskId: string) => {
    if (!confirm('Xóa công việc này?')) return;
    try {
      await apiClient.delete(`/projects/${projectId}/tasks/${taskId}`);
      const refreshed = await apiClient.get(`/projects/${projectId}`) as any;
      const updated = refreshed?.data ?? refreshed;
      setSelectedProject(updated);
      fetchProjects();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Lỗi khi xóa công việc');
    }
  };

  const isOwner = (project: Project) => project.nguoiTaoId === user?.id || user?.role === 'ADMIN';

  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (filterTrangThai) params.trangThai = filterTrangThai;
      const response = await apiClient.get('/projects/export/excel', { params, responseType: 'blob' }) as any;
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `danh-sach-du-an-${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Danh sách dự án</h2>
          <p className="text-sm text-gray-500 mt-0.5">Tổng: {total} dự án</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download size={16} /> Xuất Excel
          </button>
          <button onClick={openCreateModal} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus size={16} /> Tạo dự án
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px] flex gap-2">
          <input
            type="text"
            placeholder="Tìm mã, tên dự án..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (setCurrentPage(1), fetchProjects())}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => { setCurrentPage(1); fetchProjects(); }} className="px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200">
            <Search size={16} />
          </button>
        </div>
        <select value={filterTrangThai} onChange={e => { setFilterTrangThai(e.target.value); setCurrentPage(1); }} className="px-3 py-2 text-sm border border-gray-300 rounded-lg">
          <option value="">Tất cả trạng thái</option>
          {TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="py-8 text-center text-gray-400">Đang tải...</div>
      ) : projects.length === 0 ? (
        <div className="py-8 text-center text-gray-400">Không có dự án nào</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map(project => (
            <div key={project.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-blue-600">{project.maDuAn}</p>
                  <h3 className="font-semibold text-gray-800 text-sm mt-0.5 truncate">{project.tenDuAn}</h3>
                </div>
                <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${trangThaiBadge(project.trangThai)}`}>
                  {project.trangThai}
                </span>
              </div>
              {project.moTa && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.moTa}</p>}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                <span className="flex items-center gap-1"><Users size={12} /> {project.members.length} thành viên</span>
                <span className="flex items-center gap-1"><CheckSquare size={12} /> {project.tasks.length} công việc</span>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                {new Date(project.ngayBatDau).toLocaleDateString('vi-VN')}
                {project.ngayKetThuc && ` → ${new Date(project.ngayKetThuc).toLocaleDateString('vi-VN')}`}
              </div>
              <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                <button onClick={() => openDetailModal(project)} className="flex-1 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium">
                  Chi tiết
                </button>
                {isOwner(project) && (
                  <>
                    <button onClick={() => openEditModal(project)} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDeleteProject(project.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Trang {currentPage} / {totalPages}</p>
          <div className="flex gap-1">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Trước</button>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40">Sau</button>
          </div>
        </div>
      )}

      {/* Project create/edit modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-gray-800">{editingProject ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}</h3>
              <button onClick={() => setIsProjectModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmitProject} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên dự án <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.tenDuAn} onChange={e => setFormData(f => ({ ...f, tenDuAn: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea rows={3} value={formData.moTa} onChange={e => setFormData(f => ({ ...f, moTa: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu <span className="text-red-500">*</span></label>
                  <input required type="date" value={formData.ngayBatDau} onChange={e => setFormData(f => ({ ...f, ngayBatDau: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input type="date" value={formData.ngayKetThuc} onChange={e => setFormData(f => ({ ...f, ngayKetThuc: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select value={formData.trangThai} onChange={e => setFormData(f => ({ ...f, trangThai: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                  {TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
                <FileUpload onFileSelect={setSelectedFile} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Hủy</button>
                <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">{editingProject ? 'Cập nhật' : 'Tạo dự án'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project detail / tasks modal */}
      {isDetailOpen && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <p className="font-mono text-xs text-blue-600">{selectedProject.maDuAn}</p>
                <h3 className="font-semibold text-gray-800">{selectedProject.tenDuAn}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="p-1.5 hover:bg-gray-100 rounded"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Project info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Trạng thái:</span><p><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${trangThaiBadge(selectedProject.trangThai)}`}>{selectedProject.trangThai}</span></p></div>
                <div><span className="text-gray-500">Thời gian:</span><p>{new Date(selectedProject.ngayBatDau).toLocaleDateString('vi-VN')}{selectedProject.ngayKetThuc && ` → ${new Date(selectedProject.ngayKetThuc).toLocaleDateString('vi-VN')}`}</p></div>
                {selectedProject.moTa && <div className="col-span-2"><span className="text-gray-500">Mô tả:</span><p className="text-gray-700 whitespace-pre-wrap mt-0.5">{selectedProject.moTa}</p></div>}
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800">Công việc ({selectedProject.tasks.length})</h4>
                  {isOwner(selectedProject) && (
                    <button onClick={() => setIsAddingTask(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      <Plus size={12} /> Thêm công việc
                    </button>
                  )}
                </div>

                {isAddingTask && (
                  <form onSubmit={handleAddTask} className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                    <input required type="text" placeholder="Tiêu đề công việc *" value={newTask.tieuDe} onChange={e => setNewTask(t => ({ ...t, tieuDe: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Người phụ trách" value={newTask.nguoiPhuTrach} onChange={e => setNewTask(t => ({ ...t, nguoiPhuTrach: e.target.value }))}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
                      <input type="date" value={newTask.deadline} onChange={e => setNewTask(t => ({ ...t, deadline: e.target.value }))}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setIsAddingTask(false)} className="px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded-lg">Hủy</button>
                      <button type="submit" className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg">Thêm</button>
                    </div>
                  </form>
                )}

                {selectedProject.tasks.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Chưa có công việc nào</p>
                ) : (
                  <div className="space-y-2">
                    {selectedProject.tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{task.tieuDe}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            {task.nguoiPhuTrach && <span>{task.nguoiPhuTrach}</span>}
                            {task.deadline && <span>Hạn: {new Date(task.deadline).toLocaleDateString('vi-VN')}</span>}
                          </div>
                        </div>
                        <select
                          value={task.trangThai}
                          onChange={e => handleUpdateTaskStatus(selectedProject.id, task.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${taskTrangThaiBadge(task.trangThai)}`}
                        >
                          {TASK_TRANG_THAI_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        {isOwner(selectedProject) && (
                          <button onClick={() => handleDeleteTask(selectedProject.id, task.id)} className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
