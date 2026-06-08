import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Edit, Eye, Plus, Search, Trash2, X } from 'lucide-react';
import FileUpload from './FileUpload';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import {
  useCreateProject,
  useDeleteProject,
  useProject,
  useProjects,
  useUpdateProject,
} from '../hooks/useProjects';
import {
  useCreateProjectPhase,
  useCreateProjectTask,
  useDeleteProjectPhase,
  useDeleteProjectTask,
  useProjectUnphasedTasks,
  useReorderProjectPhases,
  useUpdateProjectPhase,
  useUpdateProjectTask,
} from '../hooks/useProjectPhases';
import type {
  CreateProjectPhaseRequest,
  CreateProjectRequest,
  CreateProjectTaskRequest,
  Project,
  ProjectPhase,
  ProjectTask,
} from '../services/projectService';

type ModalMode = 'create' | 'edit';
type PhaseMode = 'create' | 'edit';
type TaskMode = 'create' | 'edit';

const PROJECT_STATUSES = ['Lên kế hoạch', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'];
const PHASE_STATUSES = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'];
const TASK_STATUSES = ['Chưa bắt đầu', 'Đang làm', 'Hoàn thành', 'Trễ'];

const emptyProject = (): CreateProjectRequest => ({
  tenDuAn: '',
  moTa: '',
  ngayBatDau: new Date().toISOString().split('T')[0],
  ngayKetThuc: '',
  trangThai: 'Lên kế hoạch',
});

const emptyPhase = (order = 0): CreateProjectPhaseRequest => ({
  tenGiaiDoan: '',
  moTa: '',
  chuSoHuu: '',
  nguoiPhuTrach: '',
  tienDo: 0,
  trangThai: 'Chưa bắt đầu',
  thuTu: order,
  ngayBatDau: '',
  ngayKetThuc: '',
});

const emptyTask = (projectPhaseId?: string | null, order = 0): CreateProjectTaskRequest => ({
  tieuDe: '',
  moTa: '',
  nguoiPhuTrach: '',
  projectPhaseId,
  tienDo: 0,
  ngayBatDau: '',
  ngayKetThuc: '',
  deadline: '',
  trangThai: 'Chưa bắt đầu',
  thuTu: order,
});

const statusBadge = (status: string) => {
  if (status === 'Đang thực hiện' || status === 'Đang làm') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'Hoàn thành') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'Trễ') return 'bg-red-100 text-red-700 border-red-200';
  if (status === 'Tạm dừng') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const dateInput = (value?: string | null) => value?.split('T')[0] ?? '';
const clampProgress = (value: string | number | undefined) => Math.max(0, Math.min(100, Number(value) || 0));

const ProjectList = () => {
  const { user } = useAuth();
  const canWriteAll = user?.role === 'admin' || user?.role === 'department_head' || user?.role === 'team_lead';
  const [filters, setFilters] = useState({ page: 1, limit: 10, search: '', trangThai: '' });
  const projectsQuery = useProjects({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    trangThai: filters.trangThai || undefined,
  });

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createPhase = useCreateProjectPhase();
  const updatePhase = useUpdateProjectPhase();
  const deletePhase = useDeleteProjectPhase();
  const reorderPhases = useReorderProjectPhases();
  const createTask = useCreateProjectTask();
  const updateTask = useUpdateProjectTask();
  const deleteTask = useDeleteProjectTask();

  const [projectModal, setProjectModal] = useState<{ mode: ModalMode; project?: Project } | null>(null);
  const [projectForm, setProjectForm] = useState<CreateProjectRequest>(emptyProject());
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [phaseModal, setPhaseModal] = useState<{ mode: PhaseMode; phase?: ProjectPhase } | null>(null);
  const [phaseForm, setPhaseForm] = useState<CreateProjectPhaseRequest>(emptyPhase());
  const [taskModal, setTaskModal] = useState<{ mode: TaskMode; task?: ProjectTask; projectPhaseId?: string | null } | null>(null);
  const [taskForm, setTaskForm] = useState<CreateProjectTaskRequest>(emptyTask());
  const [error, setError] = useState('');

  const selectedProjectQuery = useProject(selectedProjectId);
  const unphasedTasksQuery = useProjectUnphasedTasks(selectedProjectId);
  const projects = projectsQuery.data?.data ?? [];
  const pagination = projectsQuery.data?.pagination;
  const selectedProject = selectedProjectQuery.data?.data;
  const phases = useMemo(
    () => [...(selectedProject?.phases ?? [])].sort((a, b) => a.thuTu - b.thuTu),
    [selectedProject?.phases]
  );
  const unphasedTasks = unphasedTasksQuery.data?.data ?? selectedProject?.unphasedTasks ?? [];

  useEffect(() => {
    if (selectedProject && !projects.some((project) => project.id === selectedProject.id)) {
      projectsQuery.refetch();
    }
  }, [selectedProject?.updatedAt]);

  const canWrite = (project?: Project) =>
    canWriteAll || !!project && (project.nguoiTaoId === user?._id || project.nguoiTaoId === user?.employeeId);

  const openProjectModal = (mode: ModalMode, project?: Project) => {
    setError('');
    setProjectFile(null);
    setProjectModal({ mode, project });
    setProjectForm(project ? {
      tenDuAn: project.tenDuAn,
      moTa: project.moTa ?? '',
      ngayBatDau: dateInput(project.ngayBatDau),
      ngayKetThuc: dateInput(project.ngayKetThuc),
      trangThai: project.trangThai,
    } : emptyProject());
  };

  const saveProject = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (projectModal?.project) {
        await updateProject.mutateAsync({ id: projectModal.project.id, data: projectForm, file: projectFile ?? undefined });
      } else {
        await createProject.mutateAsync({ data: projectForm, file: projectFile ?? undefined });
      }
      setProjectModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được dự án');
    }
  };

  const removeProject = async (project: Project) => {
    if (!confirm(`Xóa dự án ${project.maDuAn}?`)) return;
    try {
      await deleteProject.mutateAsync(project.id);
      if (selectedProjectId === project.id) setSelectedProjectId('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được dự án');
    }
  };

  const openPhaseModal = (mode: PhaseMode, phase?: ProjectPhase) => {
    if (!selectedProject) return;
    setError('');
    setPhaseModal({ mode, phase });
    setPhaseForm(phase ? {
      tenGiaiDoan: phase.tenGiaiDoan,
      moTa: phase.moTa ?? '',
      chuSoHuuId: phase.chuSoHuuId ?? '',
      chuSoHuu: phase.chuSoHuu ?? '',
      nguoiPhuTrachId: phase.nguoiPhuTrachId ?? '',
      nguoiPhuTrach: phase.nguoiPhuTrach ?? '',
      tienDo: phase.tienDo,
      trangThai: phase.trangThai,
      thuTu: phase.thuTu,
      ngayBatDau: dateInput(phase.ngayBatDau),
      ngayKetThuc: dateInput(phase.ngayKetThuc),
    } : emptyPhase(phases.length + 1));
  };

  const savePhase = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProject) return;
    const payload = { ...phaseForm, tienDo: clampProgress(phaseForm.tienDo), thuTu: Number(phaseForm.thuTu) || phases.length + 1 };
    try {
      if (phaseModal?.phase) {
        await updatePhase.mutateAsync({ projectId: selectedProject.id, phaseId: phaseModal.phase.id, data: payload });
      } else {
        await createPhase.mutateAsync({ projectId: selectedProject.id, data: payload });
      }
      setPhaseModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được giai đoạn');
    }
  };

  const movePhase = async (phaseId: string, direction: -1 | 1) => {
    if (!selectedProject) return;
    const index = phases.findIndex((phase) => phase.id === phaseId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= phases.length) return;
    const phaseIds = phases.map((phase) => phase.id);
    [phaseIds[index], phaseIds[target]] = [phaseIds[target], phaseIds[index]];
    try {
      await reorderPhases.mutateAsync({ projectId: selectedProject.id, data: { phaseIds } });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không sắp xếp được giai đoạn');
    }
  };

  const removePhase = async (phase: ProjectPhase) => {
    if (!selectedProject) return;
    if (!confirm(`Xóa giai đoạn ${phase.tenGiaiDoan}? Công việc sẽ chuyển về chưa phân giai đoạn.`)) return;
    try {
      await deletePhase.mutateAsync({ projectId: selectedProject.id, phaseId: phase.id, moveTasksToUnphased: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được giai đoạn');
    }
  };

  const openTaskModal = (mode: TaskMode, projectPhaseId?: string | null, task?: ProjectTask) => {
    setError('');
    setTaskModal({ mode, task, projectPhaseId });
    setTaskForm(task ? {
      tieuDe: task.tieuDe,
      moTa: task.moTa ?? '',
      nguoiPhuTrach: task.nguoiPhuTrach ?? '',
      projectPhaseId: task.projectPhaseId ?? projectPhaseId ?? null,
      tienDo: task.tienDo ?? 0,
      ngayBatDau: dateInput(task.ngayBatDau),
      ngayKetThuc: dateInput(task.ngayKetThuc),
      deadline: dateInput(task.deadline),
      trangThai: task.trangThai,
      thuTu: task.thuTu,
    } : emptyTask(projectPhaseId ?? null, 1));
  };

  const saveTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProject) return;
    const payload = { ...taskForm, tienDo: clampProgress(taskForm.tienDo), thuTu: Number(taskForm.thuTu) || 0 };
    try {
      if (taskModal?.task) {
        await updateTask.mutateAsync({ projectId: selectedProject.id, taskId: taskModal.task.id, data: payload });
      } else {
        await createTask.mutateAsync({ projectId: selectedProject.id, data: payload });
      }
      setTaskModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được công việc');
    }
  };

  const removeTask = async (task: ProjectTask) => {
    if (!selectedProject || !confirm(`Xóa công việc ${task.tieuDe}?`)) return;
    try {
      await deleteTask.mutateAsync({ projectId: selectedProject.id, taskId: task.id });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được công việc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Dự án kỹ thuật</h2>
          <p className="text-xs text-gray-500">Quản lý dự án, giai đoạn và công việc con.</p>
        </div>
        <button onClick={() => openProjectModal('create')} className="inline-flex w-fit items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Tạo dự án
        </button>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input value={filters.search} onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value, page: 1 }))} placeholder="Tìm dự án" className="w-56 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm" />
          </div>
          <select value={filters.trangThai} onChange={(event) => setFilters((value) => ({ ...value, trangThai: event.target.value, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {PROJECT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="border-b px-3 py-2 text-left">Mã</th>
                <th className="border-b px-3 py-2 text-left">Tên dự án</th>
                <th className="border-b px-3 py-2 text-left">Trạng thái</th>
                <th className="border-b px-3 py-2 text-left">Giai đoạn</th>
                <th className="border-b px-3 py-2 text-left">Công việc</th>
                <th className="border-b px-3 py-2 text-left">Thời gian</th>
                <th className="border-b px-3 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projectsQuery.isLoading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Đang tải...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">Chưa có dự án phù hợp.</td></tr>
              ) : projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-blue-700">{project.maDuAn}</td>
                  <td className="px-3 py-2 text-gray-900">{project.tenDuAn}</td>
                  <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadge(project.trangThai)}`}>{project.trangThai}</span></td>
                  <td className="px-3 py-2 text-gray-700">{project.phases?.length ?? 0}</td>
                  <td className="px-3 py-2 text-gray-700">{project.tasks?.length ?? 0}</td>
                  <td className="px-3 py-2 text-gray-700">{formatDate(project.ngayBatDau)} - {formatDate(project.ngayKetThuc)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button title="Chi tiết" onClick={() => setSelectedProjectId(project.id)} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                      {canWrite(project) && <button title="Sửa" onClick={() => openProjectModal('edit', project)} className="rounded p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600"><Edit className="h-4 w-4" /></button>}
                      {canWrite(project) && <button title="Xóa" onClick={() => removeProject(project)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
            <span className="text-gray-600">Trang {pagination.page}/{pagination.totalPages} - {pagination.total} dòng</span>
            <div className="flex gap-1">
              <button disabled={filters.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Trước</button>
              <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={!!selectedProjectId} onClose={() => setSelectedProjectId('')} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-mono text-xs text-blue-600">{selectedProject?.maDuAn}</p>
              <h3 className="text-base font-semibold text-gray-900">{selectedProject?.tenDuAn ?? 'Chi tiết dự án'}</h3>
            </div>
            <button title="Đóng" onClick={() => setSelectedProjectId('')} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {selectedProjectQuery.isLoading ? (
              <div className="py-8 text-center text-gray-500">Đang tải...</div>
            ) : selectedProject ? (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Trạng thái</p><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadge(selectedProject.trangThai)}`}>{selectedProject.trangThai}</span></div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Thời gian</p><p className="mt-1 text-gray-800">{formatDate(selectedProject.ngayBatDau)} - {formatDate(selectedProject.ngayKetThuc)}</p></div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Giai đoạn</p><p className="mt-1 text-lg font-semibold text-gray-900">{phases.length}</p></div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Chưa phân giai đoạn</p><p className="mt-1 text-lg font-semibold text-gray-900">{unphasedTasks.length}</p></div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Giai đoạn và công việc</h4>
                  {canWrite(selectedProject) && <button onClick={() => openPhaseModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Thêm giai đoạn</button>}
                </div>

                <div className="space-y-3">
                  {phases.length === 0 ? (
                    <div className="rounded-md border border-gray-200 px-3 py-6 text-center text-gray-500">Chưa có giai đoạn.</div>
                  ) : phases.map((phase, phaseIndex) => (
                    <div key={phase.id} className="rounded-lg border border-gray-200">
                      <div className="flex flex-col gap-2 border-b bg-gray-50 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">{phase.thuTu}. {phase.tenGiaiDoan}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadge(phase.trangThai)}`}>{phase.trangThai}</span>
                            <span className="text-xs text-gray-600">{phase.tienDo}%</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Chủ sở hữu: {phase.chuSoHuu || '—'} | Phụ trách: {phase.nguoiPhuTrach || '—'} | {formatDate(phase.ngayBatDau)} - {formatDate(phase.ngayKetThuc)}</p>
                        </div>
                        {canWrite(selectedProject) && (
                          <div className="flex gap-1">
                            <button title="Lên" disabled={phaseIndex === 0} onClick={() => movePhase(phase.id, -1)} className="rounded p-1.5 text-gray-500 hover:bg-white disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
                            <button title="Xuống" disabled={phaseIndex === phases.length - 1} onClick={() => movePhase(phase.id, 1)} className="rounded p-1.5 text-gray-500 hover:bg-white disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
                            <button title="Sửa" onClick={() => openPhaseModal('edit', phase)} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-green-600"><Edit className="h-4 w-4" /></button>
                            <button title="Thêm công việc" onClick={() => openTaskModal('create', phase.id)} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600"><Plus className="h-4 w-4" /></button>
                            <button title="Xóa" onClick={() => removePhase(phase)} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        )}
                      </div>
                      <TaskTable tasks={phase.tasks ?? []} canWrite={canWrite(selectedProject)} onEdit={(task) => openTaskModal('edit', phase.id, task)} onDelete={removeTask} />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
                    <h4 className="font-semibold text-gray-900">Công việc chưa phân giai đoạn</h4>
                    {canWrite(selectedProject) && <button onClick={() => openTaskModal('create', null)} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Thêm</button>}
                  </div>
                  <TaskTable tasks={unphasedTasks} canWrite={canWrite(selectedProject)} onEdit={(task) => openTaskModal('edit', null, task)} onDelete={removeTask} />
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-500">Không tải được dự án.</div>
            )}
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!projectModal} onClose={() => setProjectModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <ModalHeader title={projectModal?.project ? 'Sửa dự án' : 'Tạo dự án'} onClose={() => setProjectModal(null)} />
          <form onSubmit={saveProject} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <ErrorBox message={error} />}
            <label className="block space-y-1"><span className="font-medium text-gray-700">Tên dự án</span><input required value={projectForm.tenDuAn} onChange={(event) => setProjectForm((form) => ({ ...form, tenDuAn: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <label className="block space-y-1"><span className="font-medium text-gray-700">Mô tả</span><textarea rows={2} value={projectForm.moTa ?? ''} onChange={(event) => setProjectForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1"><span className="font-medium text-gray-700">Bắt đầu</span><input required type="date" value={projectForm.ngayBatDau} onChange={(event) => setProjectForm((form) => ({ ...form, ngayBatDau: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Kết thúc</span><input type="date" value={projectForm.ngayKetThuc ?? ''} onChange={(event) => setProjectForm((form) => ({ ...form, ngayKetThuc: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Trạng thái</span><select value={projectForm.trangThai} onChange={(event) => setProjectForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2">{PROJECT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            </div>
            <FileUpload label="File đính kèm" files={projectFile ? [projectFile] : []} onChange={(files) => setProjectFile(files[0] ?? null)} compact />
            <FormActions onCancel={() => setProjectModal(null)} submitLabel="Lưu" />
          </form>
        </div>
      </Modal>

      <Modal isOpen={!!phaseModal} onClose={() => setPhaseModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <ModalHeader title={phaseModal?.phase ? 'Sửa giai đoạn' : 'Thêm giai đoạn'} onClose={() => setPhaseModal(null)} />
          <form onSubmit={savePhase} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <ErrorBox message={error} />}
            <label className="block space-y-1"><span className="font-medium text-gray-700">Tên giai đoạn</span><input required value={phaseForm.tenGiaiDoan} onChange={(event) => setPhaseForm((form) => ({ ...form, tenGiaiDoan: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1"><span className="font-medium text-gray-700">Chủ sở hữu</span><input value={phaseForm.chuSoHuu ?? ''} onChange={(event) => setPhaseForm((form) => ({ ...form, chuSoHuu: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Người phụ trách</span><input value={phaseForm.nguoiPhuTrach ?? ''} onChange={(event) => setPhaseForm((form) => ({ ...form, nguoiPhuTrach: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Tiến độ (%)</span><input type="number" min={0} max={100} value={phaseForm.tienDo ?? 0} onChange={(event) => setPhaseForm((form) => ({ ...form, tienDo: clampProgress(event.target.value) }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Trạng thái</span><select value={phaseForm.trangThai} onChange={(event) => setPhaseForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2">{PHASE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Thứ tự</span><input type="number" value={phaseForm.thuTu ?? 0} onChange={(event) => setPhaseForm((form) => ({ ...form, thuTu: Number(event.target.value) }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Ngày bắt đầu</span><input type="date" value={phaseForm.ngayBatDau ?? ''} onChange={(event) => setPhaseForm((form) => ({ ...form, ngayBatDau: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Ngày kết thúc</span><input type="date" value={phaseForm.ngayKetThuc ?? ''} onChange={(event) => setPhaseForm((form) => ({ ...form, ngayKetThuc: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            </div>
            <label className="block space-y-1"><span className="font-medium text-gray-700">Mô tả</span><textarea rows={2} value={phaseForm.moTa ?? ''} onChange={(event) => setPhaseForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <FormActions onCancel={() => setPhaseModal(null)} submitLabel="Lưu" />
          </form>
        </div>
      </Modal>

      <Modal isOpen={!!taskModal} onClose={() => setTaskModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <ModalHeader title={taskModal?.task ? 'Sửa công việc' : 'Thêm công việc'} onClose={() => setTaskModal(null)} />
          <form onSubmit={saveTask} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <ErrorBox message={error} />}
            <label className="block space-y-1"><span className="font-medium text-gray-700">Tiêu đề</span><input required value={taskForm.tieuDe} onChange={(event) => setTaskForm((form) => ({ ...form, tieuDe: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1"><span className="font-medium text-gray-700">Giai đoạn</span><select value={taskForm.projectPhaseId ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, projectPhaseId: event.target.value || null }))} className="w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Chưa phân giai đoạn</option>{phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.tenGiaiDoan}</option>)}</select></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Người phụ trách</span><input value={taskForm.nguoiPhuTrach ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, nguoiPhuTrach: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Tiến độ (%)</span><input type="number" min={0} max={100} value={taskForm.tienDo ?? 0} onChange={(event) => setTaskForm((form) => ({ ...form, tienDo: clampProgress(event.target.value) }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Trạng thái</span><select value={taskForm.trangThai} onChange={(event) => setTaskForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2">{TASK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Thứ tự</span><input type="number" value={taskForm.thuTu ?? 0} onChange={(event) => setTaskForm((form) => ({ ...form, thuTu: Number(event.target.value) }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Deadline</span><input type="date" value={taskForm.deadline ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, deadline: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Ngày bắt đầu</span><input type="date" value={taskForm.ngayBatDau ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, ngayBatDau: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="space-y-1"><span className="font-medium text-gray-700">Ngày kết thúc</span><input type="date" value={taskForm.ngayKetThuc ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, ngayKetThuc: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            </div>
            <label className="block space-y-1"><span className="font-medium text-gray-700">Mô tả</span><textarea rows={2} value={taskForm.moTa ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <FormActions onCancel={() => setTaskModal(null)} submitLabel="Lưu" />
          </form>
        </div>
      </Modal>
    </div>
  );
};

const TaskTable = ({
  tasks,
  canWrite,
  onEdit,
  onDelete,
}: {
  tasks: ProjectTask[];
  canWrite: boolean;
  onEdit: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
}) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[840px] text-sm">
      <thead className="bg-white text-xs uppercase text-gray-600">
        <tr>
          <th className="border-b px-3 py-2 text-left">Thứ tự</th>
          <th className="border-b px-3 py-2 text-left">Công việc</th>
          <th className="border-b px-3 py-2 text-left">Phụ trách</th>
          <th className="border-b px-3 py-2 text-left">Tiến độ</th>
          <th className="border-b px-3 py-2 text-left">Trạng thái</th>
          <th className="border-b px-3 py-2 text-left">Ngày</th>
          {canWrite && <th className="border-b px-3 py-2 text-right">Thao tác</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {tasks.length === 0 ? (
          <tr><td colSpan={canWrite ? 7 : 6} className="px-3 py-4 text-center text-gray-500">Chưa có công việc.</td></tr>
        ) : tasks.map((task) => (
          <tr key={task.id} className="hover:bg-gray-50">
            <td className="px-3 py-2 text-gray-600">{task.thuTu}</td>
            <td className="px-3 py-2 text-gray-900">{task.tieuDe}</td>
            <td className="px-3 py-2 text-gray-700">{task.nguoiPhuTrach || '—'}</td>
            <td className="px-3 py-2 text-gray-700">{task.tienDo ?? 0}%</td>
            <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadge(task.trangThai)}`}>{task.trangThai}</span></td>
            <td className="px-3 py-2 text-gray-700">{formatDate(task.ngayBatDau || task.deadline)} - {formatDate(task.ngayKetThuc)}</td>
            {canWrite && (
              <td className="px-3 py-2">
                <div className="flex justify-end gap-1">
                  <button title="Sửa" onClick={() => onEdit(task)} className="rounded p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600"><Edit className="h-4 w-4" /></button>
                  <button title="Xóa" onClick={() => onDelete(task)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
  <div className="flex items-center justify-between border-b px-4 py-3">
    <h3 className="text-base font-semibold text-gray-900">{title}</h3>
    <button title="Đóng" onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
  </div>
);

const ErrorBox = ({ message }: { message: string }) => (
  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{message}</div>
);

const FormActions = ({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) => (
  <div className="flex justify-end gap-2 border-t pt-3">
    <button type="button" onClick={onCancel} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700">Hủy</button>
    <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">{submitLabel}</button>
  </div>
);

export default ProjectList;
