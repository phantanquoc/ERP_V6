import React, { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Diamond, Edit, GripVertical, Plus, Search, Trash2, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSearchParams } from 'react-router-dom';
import FileUpload from './FileUpload';
import Modal from './Modal';
import ProjectGantt from './ProjectGantt';
import ProjectOverview from './ProjectOverview';
import ProjectCosts from './ProjectCosts';
import EmployeePicker from './EmployeePicker';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../hooks/useUsers';
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
  useReorderProjectTasks,
  useUpdateProjectPhase,
  useUpdateProjectTask,
  useAddProjectCost,
  useUpdateProjectCost,
  useDeleteProjectCost,
  useProjectApprovals,
  useSubmitApproval,
  useApproveProject,
  useRejectProject,
  useAddTaskGroup,
  useUpdateTaskGroup,
  useDeleteTaskGroup,
  useReorderTaskGroups,
} from '../hooks/useProjectPhases';
import type {
  CreateProjectCostRequest,
  CreateProjectPhaseRequest,
  CreateProjectRequest,
  CreateProjectTaskRequest,
  CreateTaskGroupRequest,
  Project,
  ProjectApproval,
  ProjectCost,
  ProjectPhase,
  ProjectTask,
  ProjectTaskGroup,
  ProjectTaskPriority,
} from '../services/projectService';

type ModalMode = 'create' | 'edit';
type PhaseMode = 'create' | 'edit';
type TaskMode = 'create' | 'edit';
type DetailTab = 'overview' | 'phases' | 'updates' | 'costs' | 'gantt';

const PROJECT_STATUSES = ['Lên kế hoạch', 'Chờ duyệt', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'];
const PHASE_STATUSES = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng'];
const TASK_STATUSES = ['Chưa bắt đầu', 'Đang làm', 'Hoàn thành', 'Trễ'];
const PRIORITY_OPTIONS: { value: ProjectTaskPriority; label: string; color: string }[] = [
  { value: 'KHAN_CAP', label: 'Khẩn cấp', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'CAO', label: 'Cao', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'TRUNG_BINH', label: 'Trung bình', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'THAP', label: 'Thấp', color: 'bg-gray-100 text-gray-600 border-gray-200' },
];

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
  nganSach: '',
});

const emptyTask = (projectPhaseId?: string | null, order = 0): CreateProjectTaskRequest => ({
  tieuDe: '',
  moTa: '',
  nguoiPhuTrach: '',
  projectPhaseId,
  projectTaskGroupId: null,
  tienDo: 0,
  ngayBatDau: '',
  ngayKetThuc: '',
  ngayBatDauThucTe: '',
  ngayHoanThanhThucTe: '',
  deadline: '',
  trangThai: 'Chưa bắt đầu',
  thuTu: order,
  mucDoUuTien: null,
  laMilestone: false,
  ghiChu: '',
});

const statusBadge = (status: string) => {
  if (status === 'Đang thực hiện' || status === 'Đang làm') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'Hoàn thành') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'Trễ') return 'bg-red-100 text-red-700 border-red-200';
  if (status === 'Tạm dừng') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (status === 'Chờ duyệt') return 'bg-purple-100 text-purple-700 border-purple-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const dateInput = (value?: string | null) => value?.split('T')[0] ?? '';
const clampProgress = (value: string | number | undefined) => Math.max(0, Math.min(100, Number(value) || 0));

const ProjectList = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isTechnical = user?.department === 'technical' ||
    user?.secondaryDepartments?.some(d => d.departmentCode === 'technical');
  const canWriteAll = user?.role === 'admin' || isTechnical;
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
  const reorderTasks = useReorderProjectTasks();
  const createTask = useCreateProjectTask();
  const updateTask = useUpdateProjectTask();
  const deleteTask = useDeleteProjectTask();
  const addTaskGroup = useAddTaskGroup();
  const editTaskGroup = useUpdateTaskGroup();
  const removeTaskGroup = useDeleteTaskGroup();
  const reorderTaskGroups = useReorderTaskGroups();
  const submitApproval = useSubmitApproval();
  const approveProject = useApproveProject();
  const rejectProject = useRejectProject();
  const usersQuery = useUsers({ limit: 100 });
  const adminUsers = useMemo(() => (usersQuery.data?.data ?? []).filter((u: any) => u.role === 'ADMIN'), [usersQuery.data]);

  const [projectModal, setProjectModal] = useState<{ mode: ModalMode; project?: Project } | null>(null);
  const [projectForm, setProjectForm] = useState<CreateProjectRequest>(emptyProject());
  const [projectFile, setProjectFile] = useState<File | null>(null);
  const [initialPhases, setInitialPhases] = useState<{ tenGiaiDoan: string; ngayBatDau: string; ngayKetThuc: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [detailTab, setDetailTab] = useState<DetailTab>('phases');
  const [phaseModal, setPhaseModal] = useState<{ mode: PhaseMode; phase?: ProjectPhase } | null>(null);
  const [phaseForm, setPhaseForm] = useState<CreateProjectPhaseRequest>(emptyPhase());
  const [taskModal, setTaskModal] = useState<{ mode: TaskMode; task?: ProjectTask; projectPhaseId?: string | null; fromTab?: DetailTab } | null>(null);
  const [taskForm, setTaskForm] = useState<CreateProjectTaskRequest>(emptyTask());
  const [phatSinhModal, setPhatSinhModal] = useState<{ projectPhaseId?: string | null } | null>(null);
  const [phatSinhForm, setPhatSinhForm] = useState({ tieuDe: '', nguoiPhuTrach: '', mucDoUuTien: '' as string, ghiChu: '' });
  const [taskGroupModal, setTaskGroupModal] = useState<{ mode: 'create' | 'edit'; phaseId: string; group?: ProjectTaskGroup } | null>(null);
  const [taskGroupForm, setTaskGroupForm] = useState<CreateTaskGroupRequest>({ tenMuc: '', moTa: '' });
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [error, setError] = useState('');
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [taskFilter, setTaskFilter] = useState({ search: '', status: '', person: '' });

  useEffect(() => {
    const pid = searchParams.get('projectId');
    if (pid) {
      setSelectedProjectId(pid);
      searchParams.delete('projectId');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  const togglePhaseCollapse = (phaseId: string) => {
    setCollapsedPhases((prev) => { const next = new Set(prev); next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId); return next; });
  };
  const collapseAll = () => setCollapsedPhases(new Set(phases.map(p => p.id)));
  const expandAll = () => setCollapsedPhases(new Set());

  const filterTasks = (tasks: ProjectTask[]) => {
    let result = tasks;
    if (taskFilter.search) {
      const q = taskFilter.search.toLowerCase();
      result = result.filter(t => t.tieuDe.toLowerCase().includes(q) || t.nguoiPhuTrach?.toLowerCase().includes(q));
    }
    if (taskFilter.status) result = result.filter(t => t.trangThai === taskFilter.status);
    if (taskFilter.person) result = result.filter(t => t.nguoiPhuTrach === taskFilter.person);
    return result;
  };

  const selectedProjectQuery = useProject(selectedProjectId);
  const unphasedTasksQuery = useProjectUnphasedTasks(selectedProjectId);
  const approvalsQuery = useProjectApprovals(selectedProjectId);
  const projects = projectsQuery.data?.data ?? [];
  const pagination = projectsQuery.data?.pagination;
  const selectedProject = selectedProjectQuery.data?.data;
  const phases = useMemo(
    () => [...(selectedProject?.phases ?? [])].sort((a, b) => a.thuTu - b.thuTu),
    [selectedProject?.phases]
  );
  const unphasedTasks = unphasedTasksQuery.data?.data ?? selectedProject?.unphasedTasks ?? [];
  const approvals: ProjectApproval[] = approvalsQuery.data?.data ?? [];
  const latestApproval = approvals[0];
  const hasRejection = latestApproval?.trangThai === 'TU_CHOI';
  const isPlanLocked = !!selectedProject && selectedProject.trangThai !== 'Lên kế hoạch' && !(selectedProject.trangThai === 'Chờ duyệt' && hasRejection);

  const allProjectTasks = useMemo(() => [...phases.flatMap((p) => p.tasks ?? []), ...unphasedTasks], [phases, unphasedTasks]);
  const lateCount = useMemo(() => allProjectTasks.filter((t) => t.trangThai === 'Trễ').length, [allProjectTasks]);
  const allProjectCosts = useMemo(() => allProjectTasks.flatMap((t) => t.costs ?? []), [allProjectTasks]);
  const tongKH = useMemo(() => allProjectCosts.reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0), [allProjectCosts]);
  const tongTT = useMemo(() => allProjectCosts.reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0), [allProjectCosts]);
  const chenhLech = tongTT - tongKH;
  const fmtCurrency = (v: number) => v.toLocaleString('vi-VN');
  const isCreator = !!selectedProject && (selectedProject.nguoiTaoId === user?._id || selectedProject.nguoiTaoId === user?.employeeId);
  const isActualEditPlanTask = taskModal?.fromTab === 'updates' && !!taskModal?.task && !taskModal.task.laPhatSinh;
  const canChangeStatus = (project?: Project) =>
    user?.role === 'admin' || (!!project && (project.nguoiTaoId === user?._id || project.nguoiTaoId === user?.employeeId));

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
    setInitialPhases([]);
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
        const result = await createProject.mutateAsync({ data: projectForm, file: projectFile ?? undefined });
        if (result?.data?.id) {
          const projectId = result.data.id;
          const validPhases = initialPhases.filter((p) => p.tenGiaiDoan.trim());
          for (let i = 0; i < validPhases.length; i++) {
            await createPhase.mutateAsync({
              projectId,
              data: { tenGiaiDoan: validPhases[i].tenGiaiDoan, ngayBatDau: validPhases[i].ngayBatDau, ngayKetThuc: validPhases[i].ngayKetThuc, thuTu: i + 1, trangThai: 'Chưa bắt đầu' },
            });
          }
          setSelectedProjectId(projectId);
          setDetailTab('overview');
        }
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
      nganSach: phase.nganSach ?? '',
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

  const moveTask = async (taskId: string, direction: -1 | 1, phaseTasks: ProjectTask[], phaseId?: string | null) => {
    if (!selectedProject) return;
    const index = phaseTasks.findIndex((t) => t.id === taskId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= phaseTasks.length) return;
    const taskIds = phaseTasks.map((t) => t.id);
    [taskIds[index], taskIds[target]] = [taskIds[target], taskIds[index]];
    try {
      await reorderTasks.mutateAsync({ projectId: selectedProject.id, data: { taskIds, phaseId: phaseId ?? null } });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không sắp xếp được công việc');
    }
  };

  const handleTaskDragEnd = async (event: DragEndEvent, phaseTasks: ProjectTask[], phaseId?: string | null) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedProject) return;
    const oldIndex = phaseTasks.findIndex((t) => t.id === active.id);
    const newIndex = phaseTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(phaseTasks, oldIndex, newIndex);
    try {
      await reorderTasks.mutateAsync({ projectId: selectedProject.id, data: { taskIds: newOrder.map((t) => t.id), phaseId: phaseId ?? null } });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không sắp xếp được công việc');
    }
  };

  const handlePhaseDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedProject) return;
    const oldIndex = phases.findIndex((p) => p.id === active.id);
    const newIndex = phases.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(phases, oldIndex, newIndex);
    try {
      await reorderPhases.mutateAsync({ projectId: selectedProject.id, data: { phaseIds: newOrder.map((p) => p.id) } });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không sắp xếp được giai đoạn');
    }
  };

  const quickStatusChange = (taskId: string, newStatus: string) => {
    if (!selectedProject) return;
    updateTask.mutate({ projectId: selectedProject.id, taskId, data: { trangThai: newStatus } });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const removePhase = async (phase: ProjectPhase) => {
    if (!selectedProject) return;
    if (!confirm(`Xóa giai đoạn ${phase.tenGiaiDoan}? Công việc sẽ chuyển về chưa phân giai đoạn.`)) return;
    try {
      await deletePhase.mutateAsync({ projectId: selectedProject.id, phaseId: phase.id, moveTasksToUnphased: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được giai đoạn');
    }
  };

  const openTaskGroupModal = (mode: 'create' | 'edit', phaseId: string, group?: ProjectTaskGroup) => {
    setError('');
    setTaskGroupModal({ mode, phaseId, group });
    setTaskGroupForm(group ? { tenMuc: group.tenMuc, moTa: group.moTa ?? '' } : { tenMuc: '', moTa: '' });
  };

  const saveTaskGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProject || !taskGroupModal) return;
    try {
      if (taskGroupModal.group) {
        await editTaskGroup.mutateAsync({ projectId: selectedProject.id, groupId: taskGroupModal.group.id, data: taskGroupForm });
      } else {
        await addTaskGroup.mutateAsync({ projectId: selectedProject.id, phaseId: taskGroupModal.phaseId, data: taskGroupForm });
      }
      setTaskGroupModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được mục công việc');
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!selectedProject || !confirm('Xóa mục công việc? Công việc trong mục sẽ chuyển về chưa phân mục.')) return;
    try {
      await removeTaskGroup.mutateAsync({ projectId: selectedProject.id, groupId });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được mục công việc');
    }
  };

  const moveGroup = async (phaseId: string, groupId: string, direction: -1 | 1) => {
    if (!selectedProject) return;
    const phase = phases.find(p => p.id === phaseId);
    if (!phase?.taskGroups) return;
    const sorted = [...phase.taskGroups].sort((a, b) => a.thuTu - b.thuTu);
    const idx = sorted.findIndex(g => g.id === groupId);
    if (idx < 0) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const newOrder = sorted.map(g => g.id);
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]];
    try {
      await reorderTaskGroups.mutateAsync({ projectId: selectedProject.id, data: { items: newOrder.map((id, i) => ({ id, thuTu: i })) } });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không di chuyển được mục');
    }
  };

  const moveTaskToGroup = async (taskId: string, newGroupId: string | null) => {
    if (!selectedProject) return;
    try {
      await updateTask.mutateAsync({ projectId: selectedProject.id, taskId, data: { projectTaskGroupId: newGroupId } });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không chuyển được công việc');
    }
  };

  const openTaskModal = (mode: TaskMode, projectPhaseId?: string | null, task?: ProjectTask) => {
    setError('');
    setTaskModal({ mode, task, projectPhaseId, fromTab: detailTab });
    setTaskForm(task ? {
      tieuDe: task.tieuDe,
      moTa: task.moTa ?? '',
      nguoiPhuTrach: task.nguoiPhuTrach ?? '',
      projectPhaseId: task.projectPhaseId ?? projectPhaseId ?? null,
      projectTaskGroupId: task.projectTaskGroupId ?? null,
      tienDo: task.tienDo ?? 0,
      ngayBatDau: dateInput(task.ngayBatDau),
      ngayKetThuc: dateInput(task.ngayKetThuc),
      ngayBatDauThucTe: dateInput(task.ngayBatDauThucTe),
      ngayHoanThanhThucTe: dateInput(task.ngayHoanThanhThucTe),
      deadline: dateInput(task.deadline),
      trangThai: task.trangThai,
      thuTu: task.thuTu,
      mucDoUuTien: task.mucDoUuTien ?? null,
      laMilestone: task.laMilestone ?? false,
      ghiChu: task.ghiChu ?? '',
    } : emptyTask(projectPhaseId ?? null, 1));
  };

  const saveTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProject) return;
    const payload = { ...taskForm, tienDo: clampProgress(taskForm.tienDo) };
    if (!taskModal?.task) {
      // Auto-set thuTu for new tasks
      const currentTasks = taskForm.projectPhaseId
        ? (phases.find((p) => p.id === taskForm.projectPhaseId)?.tasks ?? [])
        : unphasedTasks;
      payload.thuTu = currentTasks.length;
    }
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

  const savePhatSinh = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedProject) return;
    try {
      await createTask.mutateAsync({
        projectId: selectedProject.id,
        data: {
          tieuDe: phatSinhForm.tieuDe,
          nguoiPhuTrach: phatSinhForm.nguoiPhuTrach || undefined,
          projectPhaseId: phatSinhModal?.projectPhaseId ?? null,
          mucDoUuTien: (phatSinhForm.mucDoUuTien || null) as ProjectTaskPriority | null,
          ghiChu: phatSinhForm.ghiChu || undefined,
          trangThai: 'Chưa bắt đầu',
          thuTu: 0,
          laPhatSinh: true,
        },
      });
      setPhatSinhModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thêm được công việc phát sinh');
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
          <table className="w-full min-w-[750px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
              <tr>
                <th className="border-b px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[80px]">Mã</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[160px]">Tên dự án</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[100px]">Trạng thái</th>
                <th className="border-b px-3 py-2.5 text-center min-w-[70px]">Giai đoạn</th>
                <th className="border-b px-3 py-2.5 text-center min-w-[70px]">Công việc</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[160px]">Thời gian</th>
                <th className="border-b px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[70px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projectsQuery.isLoading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Chưa có dự án phù hợp.</td></tr>
              ) : projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => { setSelectedProjectId(project.id); setDetailTab('overview'); }}>
                  <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{project.maDuAn}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{project.tenDuAn}</td>
                  <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(project.trangThai)}`}>{project.trangThai}</span></td>
                  <td className="px-3 py-2.5 text-center"><span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-100 text-xs font-medium text-gray-600">{project.phases?.length ?? 0}</span></td>
                  <td className="px-3 py-2.5 text-center"><span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-100 text-xs font-medium text-gray-600">{project.tasks?.length ?? 0}</span></td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate(project.ngayBatDau)} - {formatDate(project.ngayKetThuc)}</td>
                  <td className="px-3 py-2.5 sticky right-0 bg-white z-10" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-0.5">
                      {canWrite(project) && <button title="Xóa" onClick={() => removeProject(project)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>}
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
        <div className="flex max-h-[calc(100vh-2rem)] w-[calc(100vw-3rem)] max-w-[1600px] flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-mono text-xs text-blue-600">{selectedProject?.maDuAn}</p>
              <h3 className="text-base font-semibold text-gray-900">{selectedProject?.tenDuAn ?? 'Chi tiết dự án'}</h3>
            </div>
            <div className="flex items-center gap-1">
              {selectedProject && canWrite(selectedProject) && (
                <button title="Sửa thông tin" onClick={() => openProjectModal('edit', selectedProject)} className="rounded p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600"><Edit className="h-4 w-4" /></button>
              )}
              <button title="Đóng" onClick={() => setSelectedProjectId('')} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {selectedProjectQuery.isLoading && (
              <div className="py-8 text-center text-gray-500">Đang tải...</div>
            )}
            {!selectedProjectQuery.isLoading && !selectedProject && (
              <div className="py-12 text-center">
                <p className="text-gray-500">Dự án không còn tồn tại hoặc đã bị xóa.</p>
                <button onClick={() => setSelectedProjectId('')} className="mt-3 text-sm text-blue-600 hover:text-blue-800">Đóng</button>
              </div>
            )}
            {!selectedProjectQuery.isLoading && selectedProject && (
              <>
                <div className="grid gap-3 md:grid-cols-5">
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Trạng thái</p><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadge(selectedProject.trangThai)}`}>{selectedProject.trangThai}</span></div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Tiến độ tổng</p><p className="mt-1 text-lg font-semibold text-blue-700">{selectedProject.tienDoTongThe ?? 0}%</p></div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Thời gian</p><p className="mt-1 text-gray-800">{formatDate(selectedProject.ngayBatDau)} - {formatDate(selectedProject.ngayKetThuc)}</p></div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Giai đoạn</p><p className="mt-1 text-lg font-semibold text-gray-900">{phases.length}</p></div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Chưa phân GĐ</p><p className="mt-1 text-lg font-semibold text-gray-900">{unphasedTasks.length}</p></div>
                </div>

                {selectedProject.trangThai === 'Lên kế hoạch' && isCreator && (
                  <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5">
                    <p className="shrink-0 text-sm text-blue-800">Gửi duyệt cho:</p>
                    <select value={selectedAdminId} onChange={(e) => setSelectedAdminId(e.target.value)} className="min-w-[160px] rounded-md border border-blue-300 bg-white px-2.5 py-1.5 text-sm">
                      <option value="">-- Chọn admin --</option>
                      {adminUsers.map((a: any) => <option key={a.id} value={a.id}>{a.lastName} {a.firstName}</option>)}
                    </select>
                    <button onClick={() => submitApproval.mutate({ projectId: selectedProject.id, nguoiDuyetId: selectedAdminId || undefined })} disabled={submitApproval.isPending || !selectedAdminId} className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{submitApproval.isPending ? 'Đang gửi...' : 'Gửi duyệt'}</button>
                  </div>
                )}

                {selectedProject.trangThai === 'Chờ duyệt' && hasRejection && isCreator && (
                  <div className="space-y-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-orange-800">Kế hoạch bị từ chối — cập nhật và gửi lại</p>
                      <div className="flex items-center gap-2">
                        <select value={selectedAdminId} onChange={(e) => setSelectedAdminId(e.target.value)} className="min-w-[160px] rounded-md border border-orange-300 bg-white px-2.5 py-1.5 text-sm">
                          <option value="">-- Chọn admin --</option>
                          {adminUsers.map((a: any) => <option key={a.id} value={a.id}>{a.lastName} {a.firstName}</option>)}
                        </select>
                        <button onClick={() => submitApproval.mutate({ projectId: selectedProject.id, nguoiDuyetId: selectedAdminId || undefined })} disabled={submitApproval.isPending || !selectedAdminId} className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">{submitApproval.isPending ? 'Đang gửi...' : 'Gửi duyệt lại'}</button>
                      </div>
                    </div>
                    {latestApproval?.lyDoTuChoi && <p className="text-sm text-orange-700"><span className="font-medium">Lý do:</span> {latestApproval.lyDoTuChoi}</p>}
                  </div>
                )}

                {selectedProject.trangThai === 'Chờ duyệt' && !hasRejection && user?.role === 'admin' && (
                  <div className="flex items-center gap-3 rounded-md border border-purple-200 bg-purple-50 px-4 py-2.5">
                    <p className="flex-1 text-sm text-purple-800">Kế hoạch đang chờ phê duyệt.</p>
                    <button onClick={() => approveProject.mutate({ projectId: selectedProject.id })} disabled={approveProject.isPending} className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">{approveProject.isPending ? 'Đang duyệt...' : 'Phê duyệt'}</button>
                    <button onClick={() => { setRejectReason(''); setRejectModal(true); }} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">Từ chối</button>
                  </div>
                )}

                {selectedProject.trangThai === 'Chờ duyệt' && !hasRejection && user?.role !== 'admin' && !isCreator && (
                  <div className="rounded-md border border-purple-200 bg-purple-50 px-4 py-2.5">
                    <p className="text-sm text-purple-800">Đang chờ admin phê duyệt kế hoạch.</p>
                  </div>
                )}

                <div className="flex items-center gap-1 border-b">
                  <button onClick={() => setDetailTab('overview')} className={`px-3 py-2 text-sm font-medium border-b-2 ${detailTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tổng quan</button>
                  <button onClick={() => setDetailTab('phases')} className={`px-3 py-2 text-sm font-medium border-b-2 ${detailTab === 'phases' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Kế hoạch</button>
                  <button onClick={() => setDetailTab('updates')} className={`px-3 py-2 text-sm font-medium border-b-2 ${detailTab === 'updates' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    Thực tế
                    {lateCount > 0 && <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-700">{lateCount}</span>}
                  </button>
                  <button onClick={() => setDetailTab('costs')} className={`px-3 py-2 text-sm font-medium border-b-2 ${detailTab === 'costs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Chi phi</button>
                  <button onClick={() => setDetailTab('gantt')} className={`px-3 py-2 text-sm font-medium border-b-2 ${detailTab === 'gantt' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Timeline Gantt</button>
                </div>

                {detailTab === 'gantt' && (
                  <ProjectGantt ngayBatDau={selectedProject.ngayBatDau} ngayKetThuc={selectedProject.ngayKetThuc} phases={phases} />
                )}
                {detailTab === 'costs' && (
                  <ProjectCosts projectId={selectedProject.id} phases={phases} canWrite={canWrite(selectedProject)} />
                )}
                {detailTab === 'overview' && (
                  <ProjectOverview project={selectedProject} phases={phases} users={usersQuery.data?.data ?? []} />
                )}
                {detailTab === 'updates' && (
                <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold text-gray-900">Tiến độ thực tế</h4>
                  <div className="flex items-center gap-2">
                    <button onClick={expandAll} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">Mở tất cả</button>
                    <button onClick={collapseAll} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">Thu gọn</button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input value={taskFilter.search} onChange={(e) => setTaskFilter(f => ({ ...f, search: e.target.value }))} placeholder="Tìm công việc..." className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs w-44" />
                  <select value={taskFilter.status} onChange={(e) => setTaskFilter(f => ({ ...f, status: e.target.value }))} className="rounded-md border border-gray-300 px-2 py-1.5 text-xs">
                    <option value="">Tất cả trạng thái</option>
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {(taskFilter.search || taskFilter.status) && <button onClick={() => setTaskFilter({ search: '', status: '', person: '' })} className="text-xs text-blue-600 hover:underline">Xóa bộ lọc</button>}
                </div>

                {(tongKH > 0 || tongTT > 0) && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Tổng kế hoạch</p><p className="mt-1 text-lg font-semibold text-gray-900">{fmtCurrency(tongKH)}đ</p></div>
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3"><p className="text-xs text-gray-500">Tổng thực tế</p><p className="mt-1 text-lg font-semibold text-blue-700">{fmtCurrency(tongTT)}đ</p></div>
                    <div className={`rounded-md border p-3 ${chenhLech > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}><p className="text-xs text-gray-500">Chênh lệch</p><p className={`mt-1 text-lg font-semibold ${chenhLech > 0 ? 'text-red-700' : 'text-green-700'}`}>{chenhLech >= 0 ? '+' : ''}{fmtCurrency(chenhLech)}đ</p></div>
                  </div>
                )}

                <div className="space-y-3">
                  {phases.length === 0 ? (
                    <div className="rounded-md border border-gray-200 px-3 py-6 text-center text-gray-500">Chưa có giai đoạn.</div>
                  ) : phases.map((phase) => (
                    <div key={phase.id} className="rounded-lg border border-gray-200">
                      <div onClick={() => togglePhaseCollapse(phase.id)} className="flex flex-col gap-2 border-b bg-gray-50 px-3 py-2 cursor-pointer select-none lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-gray-500 transition-transform ${collapsedPhases.has(phase.id) ? '' : 'rotate-90'}`}>&#9654;</span>
                            <span className="font-semibold text-gray-900">{phase.thuTu}. {phase.tenGiaiDoan}</span>
                            <span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadge(phase.trangThai)}`}>{phase.trangThai}</span>
                            {((phase.tasks ?? []).flatMap((t) => t.costs ?? []).reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0) > 0 || (phase.tasks ?? []).flatMap((t) => t.costs ?? []).reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0) > 0) && <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">KH: {fmtCurrency((phase.tasks ?? []).flatMap((t) => t.costs ?? []).reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0))}đ | TT: <span className={(phase.tasks ?? []).flatMap((t) => t.costs ?? []).reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0) > (phase.tasks ?? []).flatMap((t) => t.costs ?? []).reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0) ? 'text-red-600' : 'text-green-600'}>{fmtCurrency((phase.tasks ?? []).flatMap((t) => t.costs ?? []).reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0))}đ</span></span>}
                            <span className="text-xs text-gray-400">{(phase.tasks ?? []).length} cv</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-1.5 flex-1 max-w-[200px] rounded-full bg-gray-200 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${phase.tienDo}%` }} />
                            </div>
                            <span className="text-xs text-gray-600">{phase.tienDo}%</span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Phụ trách: {phase.nguoiPhuTrach || '—'}</p>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {canWrite(selectedProject) && <button title="Thêm phát sinh" onClick={() => { setError(''); setPhatSinhForm({ tieuDe: '', nguoiPhuTrach: '', mucDoUuTien: '', ghiChu: '' }); setPhatSinhModal({ projectPhaseId: phase.id }); }} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600"><Plus className="h-4 w-4" /></button>}
                        </div>
                      </div>
                      {!collapsedPhases.has(phase.id) && <GroupedTasksRenderer phase={{ ...phase, tasks: filterTasks(phase.tasks ?? []), taskGroups: phase.taskGroups }} canWrite={canWrite(selectedProject)} viewMode="actual" projectId={selectedProject.id} onEditTask={(task) => openTaskModal('edit', phase.id, task)} onDeleteTask={removeTask} onMoveTask={(taskId, dir) => moveTask(taskId, dir, phase.tasks ?? [], phase.id)} onDragEnd={(event) => handleTaskDragEnd(event, phase.tasks ?? [], phase.id)} onEditGroup={(group) => openTaskGroupModal('edit', phase.id, group)} onDeleteGroup={deleteGroup} onAddTaskToGroup={(groupId) => { openTaskModal('create', phase.id); setTaskForm((f) => ({ ...f, projectTaskGroupId: groupId })); }} onMoveGroup={(groupId, dir) => moveGroup(phase.id, groupId, dir)} onStatusChange={quickStatusChange} onTaskMoveToGroup={moveTaskToGroup} />}
                    </div>
                  ))}</div>

                <div className="rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
                    <h4 className="font-semibold text-gray-900">Công việc chưa phân giai đoạn</h4>
                    {canWrite(selectedProject) && <button onClick={() => { setError(''); setPhatSinhForm({ tieuDe: '', nguoiPhuTrach: '', mucDoUuTien: '', ghiChu: '' }); setPhatSinhModal({ projectPhaseId: null }); }} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Thêm phát sinh</button>}
                  </div>
                  <TaskTable tasks={filterTasks(unphasedTasks)} canWrite={canWrite(selectedProject)} onEdit={(task) => openTaskModal('edit', null, task)} onDelete={removeTask} viewMode="actual" projectId={selectedProject.id} onMoveTask={(taskId, dir) => moveTask(taskId, dir, unphasedTasks, null)} onDragEnd={(event) => handleTaskDragEnd(event, unphasedTasks, null)} phaseId={null} onStatusChange={quickStatusChange} />
                </div>
                </>
                )}
                {detailTab === 'phases' && (
                <>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Kế hoạch dự án</h4>
                  {!isPlanLocked && canWrite(selectedProject) && <button onClick={() => openPhaseModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Thêm giai đoạn</button>}
                </div>
                {isPlanLocked && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">Kế hoạch đã được duyệt — chỉ xem, không chỉnh sửa.</p>}

                <div className="space-y-3">
                  {phases.length === 0 ? (
                    <div className="rounded-md border border-gray-200 px-3 py-6 text-center text-gray-500">Chưa có giai đoạn.</div>
                  ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhaseDragEnd}>
                    <SortableContext items={phases.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                      {phases.map((phase, phaseIndex) => (
                      <SortablePhaseItem key={phase.id} phase={phase} phaseIndex={phaseIndex} phasesLength={phases.length} canWrite={!isPlanLocked && canWrite(selectedProject)} onMovePhase={movePhase} onEditPhase={openPhaseModal} onAddTask={openTaskModal} onAddTaskGroup={(phaseId) => openTaskGroupModal('create', phaseId)} onRemovePhase={removePhase}>
                        <GroupedTasksRenderer phase={phase} canWrite={!isPlanLocked && canWrite(selectedProject)} viewMode="plan" projectId={selectedProject.id} onEditTask={(task) => openTaskModal('edit', phase.id, task)} onDeleteTask={removeTask} onMoveTask={(taskId, dir) => moveTask(taskId, dir, phase.tasks ?? [], phase.id)} onDragEnd={(event) => handleTaskDragEnd(event, phase.tasks ?? [], phase.id)} onEditGroup={(group) => openTaskGroupModal('edit', phase.id, group)} onDeleteGroup={deleteGroup} onAddTaskToGroup={(groupId) => { openTaskModal('create', phase.id); setTaskForm((f) => ({ ...f, projectTaskGroupId: groupId })); }} onMoveGroup={(groupId, dir) => moveGroup(phase.id, groupId, dir)} onTaskMoveToGroup={moveTaskToGroup} />
                      </SortablePhaseItem>
                      ))}
                    </SortableContext>
                  </DndContext>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between border-b bg-gray-50 px-3 py-2">
                    <h4 className="font-semibold text-gray-900">Công việc chưa phân giai đoạn</h4>
                    {!isPlanLocked && canWrite(selectedProject) && <button onClick={() => openTaskModal('create', null)} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Thêm</button>}
                  </div>
                  <TaskTable tasks={unphasedTasks} canWrite={!isPlanLocked && canWrite(selectedProject)} onEdit={(task) => openTaskModal('edit', null, task)} onDelete={removeTask} viewMode="plan" projectId={selectedProject.id} onMoveTask={(taskId, dir) => moveTask(taskId, dir, unphasedTasks, null)} onDragEnd={(event) => handleTaskDragEnd(event, unphasedTasks, null)} />
                </div>
                </>
                )}
              </>
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
              <label className="space-y-1"><span className="font-medium text-gray-700">Trạng thái</span>{canChangeStatus(projectModal?.project) ? <select value={projectForm.trangThai} onChange={(event) => setProjectForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2">{PROJECT_STATUSES.filter((s) => s !== 'Chờ duyệt' && !((projectModal?.project?.trangThai === 'Lên kế hoạch' || projectModal?.project?.trangThai === 'Chờ duyệt') && s === 'Đang thực hiện')).map((status) => <option key={status} value={status}>{status}</option>)}</select> : <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs ${statusBadge(projectForm.trangThai ?? '')}`}>{projectForm.trangThai}</span>}</label>
            </div>
            <FileUpload label="File đính kèm" files={projectFile ? [projectFile] : []} onChange={(files) => setProjectFile(files[0] ?? null)} compact />
            {!projectModal?.project && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Giai đoạn dự kiến</span>
                  <button type="button" onClick={() => setInitialPhases((p) => [...p, { tenGiaiDoan: '', ngayBatDau: '', ngayKetThuc: '' }])} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"><Plus className="h-3.5 w-3.5" /> Thêm</button>
                </div>
                {initialPhases.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Có thể thêm giai đoạn sau khi tạo dự án.</p>
                ) : initialPhases.map((phase, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input placeholder="Tên giai đoạn" value={phase.tenGiaiDoan} onChange={(e) => setInitialPhases((p) => p.map((item, i) => i === idx ? { ...item, tenGiaiDoan: e.target.value } : item))} className="flex-1 min-w-0 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                    <input type="date" title="Bắt đầu" value={phase.ngayBatDau} onChange={(e) => setInitialPhases((p) => p.map((item, i) => i === idx ? { ...item, ngayBatDau: e.target.value } : item))} className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                    <input type="date" title="Kết thúc" value={phase.ngayKetThuc} onChange={(e) => setInitialPhases((p) => p.map((item, i) => i === idx ? { ...item, ngayKetThuc: e.target.value } : item))} className="w-32 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                    <button type="button" onClick={() => setInitialPhases((p) => p.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
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
              <div className="space-y-1"><span className="font-medium text-gray-700">Chủ sở hữu</span><EmployeePicker value={phaseForm.chuSoHuu ?? ''} onChange={(name) => setPhaseForm((form) => ({ ...form, chuSoHuu: name }))} multiple /></div>
              <div className="space-y-1"><span className="font-medium text-gray-700">Người phụ trách</span><EmployeePicker value={phaseForm.nguoiPhuTrach ?? ''} onChange={(name) => setPhaseForm((form) => ({ ...form, nguoiPhuTrach: name }))} multiple /></div>
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

      <Modal isOpen={!!phatSinhModal} onClose={() => setPhatSinhModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <ModalHeader title="Thêm công việc phát sinh" onClose={() => setPhatSinhModal(null)} />
          <form onSubmit={savePhatSinh} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <ErrorBox message={error} />}
            <p className="rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700">Công việc phát sinh ngoài kế hoạch ban đầu.</p>
            <label className="block space-y-1"><span className="font-medium text-gray-700">Tiêu đề</span><input required value={phatSinhForm.tieuDe} onChange={(e) => setPhatSinhForm((f) => ({ ...f, tieuDe: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Mô tả ngắn công việc phát sinh" /></label>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1"><span className="font-medium text-gray-700">Người phụ trách</span><EmployeePicker value={phatSinhForm.nguoiPhuTrach} onChange={(name) => setPhatSinhForm((f) => ({ ...f, nguoiPhuTrach: name }))} multiple /></div>
              <label className="space-y-1"><span className="font-medium text-gray-700">Mức ưu tiên</span><select value={phatSinhForm.mucDoUuTien} onChange={(e) => setPhatSinhForm((f) => ({ ...f, mucDoUuTien: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Không đặt</option>{PRIORITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
            </div>
            <label className="block space-y-1"><span className="font-medium text-gray-700">Ghi chú</span><textarea rows={2} value={phatSinhForm.ghiChu} onChange={(e) => setPhatSinhForm((f) => ({ ...f, ghiChu: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Lý do phát sinh, chi tiết bổ sung..." /></label>
            <FormActions onCancel={() => setPhatSinhModal(null)} submitLabel="Thêm phát sinh" />
          </form>
        </div>
      </Modal>

      <Modal isOpen={!!taskModal} onClose={() => setTaskModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <ModalHeader title={taskModal?.task ? 'Sửa công việc' : 'Thêm công việc'} onClose={() => setTaskModal(null)} />
          <form onSubmit={saveTask} className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {error && <ErrorBox message={error} />}
            {isActualEditPlanTask && <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">Đang cập nhật tiến độ thực tế. Thông tin kế hoạch không thể sửa từ tab này.</p>}
            <label className="block space-y-1"><span className="font-medium text-gray-700">Tiêu đề</span><input required value={taskForm.tieuDe} onChange={(event) => setTaskForm((form) => ({ ...form, tieuDe: event.target.value }))} disabled={!!isActualEditPlanTask} className={`w-full rounded-md border border-gray-300 px-3 py-2 ${isActualEditPlanTask ? 'bg-gray-100 text-gray-500' : ''}`} /></label>
            {!isActualEditPlanTask && (
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1"><span className="font-medium text-gray-700">Giai đoạn</span><select value={taskForm.projectPhaseId ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, projectPhaseId: event.target.value || null, projectTaskGroupId: null }))} className="w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Chưa phân giai đoạn</option>{phases.map((phase) => <option key={phase.id} value={phase.id}>{phase.tenGiaiDoan}</option>)}</select></label>
              {(() => { const selectedPhaseGroups = phases.find(p => p.id === taskForm.projectPhaseId)?.taskGroups ?? []; return selectedPhaseGroups.length > 0 ? (
                <label className="space-y-1"><span className="font-medium text-gray-700">Mục công việc</span><select value={taskForm.projectTaskGroupId ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, projectTaskGroupId: event.target.value || null }))} className="w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Chưa phân mục</option>{selectedPhaseGroups.sort((a, b) => a.thuTu - b.thuTu).map((g) => <option key={g.id} value={g.id}>{g.tenMuc}</option>)}</select></label>
              ) : null; })()}
              <div className="space-y-1"><span className="font-medium text-gray-700">Người phụ trách</span><EmployeePicker value={taskForm.nguoiPhuTrach ?? ''} onChange={(name) => setTaskForm((form) => ({ ...form, nguoiPhuTrach: name }))} multiple /></div>
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="laMilestone" checked={taskForm.laMilestone ?? false} onChange={(event) => setTaskForm((form) => ({ ...form, laMilestone: event.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                <label htmlFor="laMilestone" className="text-sm font-medium text-gray-700">Đánh dấu Milestone</label>
              </div>
            </div>
            )}
            {!isActualEditPlanTask && (
            <fieldset className="rounded-md border border-gray-200 p-3 space-y-3">
              <legend className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kế hoạch</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1"><span className="font-medium text-gray-700">Ngày bắt đầu</span><input type="date" value={taskForm.ngayBatDau ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, ngayBatDau: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
                <label className="space-y-1"><span className="font-medium text-gray-700">Ngày kết thúc</span><input type="date" value={taskForm.ngayKetThuc ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, ngayKetThuc: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
                <label className="space-y-1"><span className="font-medium text-gray-700">Deadline</span><input type="date" value={taskForm.deadline ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, deadline: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              </div>
            </fieldset>
            )}
            {(taskModal?.fromTab === 'updates' || taskModal?.task) && (
            <fieldset className="rounded-md border border-gray-200 p-3 space-y-3">
              <legend className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">Theo dõi thực tế</legend>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1"><span className="font-medium text-gray-700">Mức ưu tiên</span><select value={taskForm.mucDoUuTien ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, mucDoUuTien: (event.target.value || null) as ProjectTaskPriority | null }))} className="w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Không đặt</option>{PRIORITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
                <label className="space-y-1"><span className="font-medium text-gray-700">Trạng thái</span><select value={taskForm.trangThai} onChange={(event) => setTaskForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2">{TASK_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                <label className="space-y-1"><span className="font-medium text-gray-700">Tiến độ (%)</span><input type="number" min={0} max={100} value={taskForm.tienDo ?? 0} onChange={(event) => setTaskForm((form) => ({ ...form, tienDo: clampProgress(event.target.value) }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
                <label className="space-y-1"><span className="font-medium text-gray-700">Bắt đầu thực tế</span><input type="date" value={taskForm.ngayBatDauThucTe ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, ngayBatDauThucTe: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
                <label className="space-y-1"><span className="font-medium text-gray-700">Hoàn thành thực tế</span><input type="date" value={taskForm.ngayHoanThanhThucTe ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, ngayHoanThanhThucTe: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              </div>
            </fieldset>
            )}
            {!isActualEditPlanTask && <label className="block space-y-1"><span className="font-medium text-gray-700">Mô tả</span><textarea rows={2} value={taskForm.moTa ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>}
            <label className="block space-y-1"><span className="font-medium text-gray-700">Ghi chú</span><textarea rows={2} value={taskForm.ghiChu ?? ''} onChange={(event) => setTaskForm((form) => ({ ...form, ghiChu: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Ghi chú nội bộ..." /></label>
            <FormActions onCancel={() => setTaskModal(null)} submitLabel="Lưu" />
          </form>
        </div>
      </Modal>

      {rejectModal && (
        <Modal isOpen onClose={() => setRejectModal(false)}>
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-3">Từ chối kế hoạch</h3>
            <p className="text-sm text-gray-600 mb-3">Nhập lý do từ chối để người tạo biết cần cập nhật gì.</p>
            <textarea required rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Lý do từ chối (bắt buộc)..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-3" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectModal(false)} className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700">Hủy</button>
              <button disabled={!rejectReason.trim() || rejectProject.isPending} onClick={() => { if (selectedProject) rejectProject.mutate({ projectId: selectedProject.id, lyDoTuChoi: rejectReason.trim() }, { onSuccess: () => setRejectModal(false) }); }} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">{rejectProject.isPending ? 'Đang xử lý...' : 'Từ chối'}</button>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={!!taskGroupModal} onClose={() => setTaskGroupModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          <ModalHeader title={taskGroupModal?.group ? 'Sửa mục công việc' : 'Thêm mục công việc'} onClose={() => setTaskGroupModal(null)} />
          <form onSubmit={saveTaskGroup} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <ErrorBox message={error} />}
            <label className="block space-y-1"><span className="font-medium text-gray-700">Tên mục</span><input required value={taskGroupForm.tenMuc} onChange={(e) => setTaskGroupForm((f) => ({ ...f, tenMuc: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="VD: Phần cứng, Phần mềm, Nhân sự..." /></label>
            <label className="block space-y-1"><span className="font-medium text-gray-700">Mô tả (tùy chọn)</span><textarea rows={2} value={taskGroupForm.moTa ?? ''} onChange={(e) => setTaskGroupForm((f) => ({ ...f, moTa: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
            <FormActions onCancel={() => setTaskGroupModal(null)} submitLabel="Lưu" />
          </form>
        </div>
      </Modal>
    </div>
  );
};

const priorityBadge = (priority?: string | null) => {
  const opt = PRIORITY_OPTIONS.find((o) => o.value === priority);
  if (!opt) return null;
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${opt.color}`}>{opt.label}</span>;
};

const COST_CATEGORIES = ['Nhân công', 'Vật tư', 'Phụ liệu', 'Khác'];

const TaskRow = ({ task, isPlan, colCount, canWrite, onEdit, onDelete, projectId, onMoveTask, taskIndex, tasksLength, onStatusChange }: {
  task: ProjectTask; isPlan: boolean; colCount: number; canWrite: boolean;
  onEdit: (t: ProjectTask) => void; onDelete: (t: ProjectTask) => void; projectId?: string;
  onMoveTask?: (taskId: string, direction: -1 | 1) => void; taskIndex: number; tasksLength: number;
  onStatusChange?: (taskId: string, newStatus: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const costs = task.costs ?? [];
  const [showCosts, setShowCosts] = useState(costs.length > 0);
  const [showDetail, setShowDetail] = useState(false);
  const addCost = useAddProjectCost();
  const editCost = useUpdateProjectCost();
  const removeCost = useDeleteProjectCost();
  const [costEditing, setCostEditing] = useState<string | null>(null);
  const [costDetailOpen, setCostDetailOpen] = useState(false);
  const [costForm, setCostForm] = useState<CreateProjectCostRequest>({ loaiChiPhi: 'Nhân công', projectTaskId: task.id });

  const costTotal = costs.reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
  const fmtNum = (v?: number | string | null) => v != null && v !== '' ? Number(v).toLocaleString('vi-VN') : '—';

  const startAddCost = () => {
    setCostForm({ loaiChiPhi: 'Nhân công', tenChiPhi: '', donVi: '', soLuongKeHoach: '', giaKeHoach: '', thanhTienKeHoach: '', soLuongThucTe: '', giaThucTe: '', thanhTienThucTe: '', projectTaskId: task.id, projectPhaseId: task.projectPhaseId });
    setCostEditing('new');
    setCostDetailOpen(!isPlan);
    setShowCosts(true);
  };
  const startEditCost = (cost: ProjectCost) => {
    setCostForm({ loaiChiPhi: cost.loaiChiPhi, tenChiPhi: cost.tenChiPhi ?? '', donVi: cost.donVi ?? '', soLuongKeHoach: cost.soLuongKeHoach ?? '', giaKeHoach: cost.giaKeHoach ?? '', thanhTienKeHoach: cost.thanhTienKeHoach ?? '', soLuongThucTe: cost.soLuongThucTe ?? '', giaThucTe: cost.giaThucTe ?? '', thanhTienThucTe: cost.thanhTienThucTe ?? '', projectTaskId: task.id, projectPhaseId: task.projectPhaseId });
    setCostEditing(cost.id);
    const hasNumeric = !!(cost.soLuongKeHoach || cost.giaKeHoach || cost.thanhTienKeHoach || cost.soLuongThucTe || cost.giaThucTe || cost.thanhTienThucTe);
    setCostDetailOpen(!isPlan || hasNumeric);
  };
  const updateCostField = (field: string, value: string) => {
    setCostForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'soLuongKeHoach' || field === 'giaKeHoach') {
        const sl = parseFloat(String(next.soLuongKeHoach) || '0');
        const gia = parseFloat(String(next.giaKeHoach) || '0');
        next.thanhTienKeHoach = sl && gia ? String(sl * gia) : '';
      }
      if (field === 'soLuongThucTe' || field === 'giaThucTe') {
        const sl = parseFloat(String(next.soLuongThucTe) || '0');
        const gia = parseFloat(String(next.giaThucTe) || '0');
        next.thanhTienThucTe = sl && gia ? String(sl * gia) : '';
      }
      return next;
    });
  };

  const saveCost = () => {
    if (!projectId) return;
    if (costEditing === 'new') {
      addCost.mutate({ projectId, data: costForm }, { onSuccess: () => setCostEditing(null) });
    } else if (costEditing) {
      editCost.mutate({ projectId, costId: costEditing, data: costForm }, { onSuccess: () => setCostEditing(null) });
    }
  };
  const deleteCost = (costId: string) => {
    if (!projectId) return;
    if (confirm('Xóa chi phí này?')) removeCost.mutate({ projectId, costId });
  };

  const isLate = task.trangThai === 'Trễ';
  const isNearDeadline = !isLate && task.deadline && task.trangThai !== 'Hoàn thành' && (() => {
    const diff = new Date(task.deadline!).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  })();
  const rowBg = isLate ? 'bg-red-50 hover:bg-red-100' : isNearDeadline ? 'bg-yellow-50 hover:bg-yellow-100' : 'hover:bg-gray-50';

  return (
    <>
      <tr ref={setNodeRef} style={style} className={rowBg}>
        <td className="px-3 py-2 text-gray-600">
          <span className="flex items-center gap-1">
            {canWrite && onMoveTask && <span {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600"><GripVertical className="h-3.5 w-3.5" /></span>}
            {task.thuTu}
          </span>
        </td>
        <td className="px-3 py-2 text-gray-900">
          <button type="button" onClick={() => setShowDetail(!showDetail)} className="flex items-center gap-1.5 text-left hover:text-blue-700">
            {task.laMilestone && <Diamond className="h-3.5 w-3.5 text-orange-500 fill-orange-500 shrink-0" />}
            <span className="hover:underline">{task.tieuDe}</span>
            {task.laPhatSinh && <span className="rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] text-purple-600 font-medium">Phát sinh</span>}
          </button>
        </td>
        <td className="px-3 py-2 text-gray-700">{task.nguoiPhuTrach || '—'}</td>
        {!isPlan && <td className="px-3 py-2">{priorityBadge(task.mucDoUuTien)}</td>}
        {!isPlan && <td className="px-3 py-2 text-gray-700">{task.tienDo ?? 0}%</td>}
        {!isPlan && <td className="px-3 py-2">
          {canWrite && onStatusChange ? (
            <button onClick={() => {
              const order = ['Chưa bắt đầu', 'Đang làm', 'Hoàn thành'];
              const idx = order.indexOf(task.trangThai);
              const next = order[(idx + 1) % order.length];
              onStatusChange(task.id, next);
            }} title="Click để đổi trạng thái" className={`rounded-full border px-2 py-0.5 text-xs cursor-pointer hover:opacity-80 ${statusBadge(task.trangThai)}`}>{task.trangThai}</button>
          ) : (
            <span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadge(task.trangThai)}`}>{task.trangThai}</span>
          )}
        </td>}
        <td className="px-3 py-2 text-gray-700">
          {isPlan
            ? <>{formatDate(task.ngayBatDau)} - {formatDate(task.ngayKetThuc)}</>
            : <>{formatDate(task.ngayBatDauThucTe)} - {formatDate(task.ngayHoanThanhThucTe)}</>
          }
        </td>
        <td className="px-3 py-2 text-gray-600">
          {costs.length > 0 ? (
            <button onClick={() => setShowCosts(!showCosts)} className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900">
              <span className="font-medium">{fmtNum(costTotal)}đ</span>
              <span className="text-gray-400">({costs.length})</span>
              <span className="text-[10px]">{showCosts ? '▲' : '▼'}</span>
            </button>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        {canWrite && (
          <td className="px-3 py-2">
            <div className="flex justify-end gap-1">
              {onMoveTask && <button title="Lên" disabled={taskIndex === 0} onClick={() => onMoveTask(task.id, -1)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"><ArrowUp className="h-3.5 w-3.5" /></button>}
              {onMoveTask && <button title="Xuống" disabled={taskIndex === tasksLength - 1} onClick={() => onMoveTask(task.id, 1)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"><ArrowDown className="h-3.5 w-3.5" /></button>}
              {isPlan && <button title="Thêm chi phí" onClick={startAddCost} className="rounded p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600"><Plus className="h-4 w-4" /></button>}
              {!isPlan && <button title="Thêm chi phí thực tế" onClick={startAddCost} className="rounded p-1.5 text-gray-500 hover:bg-amber-50 hover:text-amber-600"><Plus className="h-4 w-4" /></button>}
              <button title="Sửa" onClick={() => onEdit(task)} className="rounded p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600"><Edit className="h-4 w-4" /></button>
              {(isPlan || task.laPhatSinh) && <button title="Xóa" onClick={() => onDelete(task)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
            </div>
          </td>
        )}
      </tr>
      {showDetail && (
        <tr>
          <td colSpan={colCount} className="bg-blue-50/50 border-b border-blue-100 px-3 py-2">
            <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-700">
              {task.moTa && <div className="sm:col-span-2"><span className="font-medium text-gray-500">Mô tả:</span> {task.moTa}</div>}
              {task.ghiChu && <div className="sm:col-span-2"><span className="font-medium text-gray-500">Ghi chú:</span> {task.ghiChu}</div>}
              {task.deadline && <div><span className="font-medium text-gray-500">Deadline:</span> {formatDate(task.deadline)}</div>}
              {task.mucDoUuTien && isPlan && <div><span className="font-medium text-gray-500">Ưu tiên:</span> {priorityBadge(task.mucDoUuTien)}</div>}
              {task.ngayBatDau && <div><span className="font-medium text-gray-500">Bắt đầu KH:</span> {formatDate(task.ngayBatDau)}</div>}
              {task.ngayKetThuc && <div><span className="font-medium text-gray-500">Kết thúc KH:</span> {formatDate(task.ngayKetThuc)}</div>}
              {task.ngayBatDauThucTe && <div><span className="font-medium text-gray-500">Bắt đầu TT:</span> {formatDate(task.ngayBatDauThucTe)}</div>}
              {task.ngayHoanThanhThucTe && <div><span className="font-medium text-gray-500">Hoàn thành TT:</span> {formatDate(task.ngayHoanThanhThucTe)}</div>}
              {task.laMilestone && <div><span className="inline-flex items-center gap-1 text-orange-600"><Diamond className="h-3 w-3 fill-orange-500" /> Milestone</span></div>}
            </div>
          </td>
        </tr>
      )}
      {showCosts && (
        <tr>
          <td colSpan={colCount} className="bg-amber-50/50 px-3 py-2">
            <div className="pl-6 space-y-1">
              {!isPlan && costs.length > 0 && (
                <div className="grid grid-cols-[1fr_80px_80px_80px] gap-1 text-[10px] text-gray-500 font-medium uppercase pb-1 border-b border-amber-200">
                  <span>Chi phí</span><span className="text-right">Kế hoạch</span><span className="text-right">Thực tế</span><span className="text-right">Chênh lệch</span>
                </div>
              )}
              {costs.map((cost) => costEditing === cost.id ? (
                <div key={cost.id} className="rounded border border-amber-200 bg-white p-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <select value={costForm.loaiChiPhi} onChange={(e) => setCostForm((f) => ({ ...f, loaiChiPhi: e.target.value }))} className="rounded border px-2 py-1 text-xs">{COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                    <input value={costForm.tenChiPhi ?? ''} onChange={(e) => setCostForm((f) => ({ ...f, tenChiPhi: e.target.value }))} className="flex-1 min-w-0 rounded border px-2 py-1 text-xs" placeholder="Tên chi phí (tuỳ chọn)" />
                    <button type="button" onClick={saveCost} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">Lưu</button>
                    <button type="button" onClick={() => setCostEditing(null)} className="text-xs text-gray-400 hover:text-gray-600">Huỷ</button>
                  </div>
                  <button type="button" onClick={() => setCostDetailOpen(!costDetailOpen)} className="text-xs text-gray-500 hover:text-blue-600">{costDetailOpen ? '▾ Ẩn chi tiết' : '▸ Thêm SL/Giá/Tổng'}</button>
                  {costDetailOpen && (
                    <div className="flex items-center gap-2 pt-1">
                      <input value={costForm.donVi ?? ''} onChange={(e) => setCostForm((f) => ({ ...f, donVi: e.target.value }))} className="w-16 rounded border px-2 py-1 text-xs" placeholder="ĐVT" />
                      {isPlan ? (
                        <>
                          <input type="number" value={costForm.soLuongKeHoach ?? ''} onChange={(e) => updateCostField('soLuongKeHoach', e.target.value)} className="w-16 rounded border px-2 py-1 text-xs text-right" placeholder="SL" />
                          <input type="number" value={costForm.giaKeHoach ?? ''} onChange={(e) => updateCostField('giaKeHoach', e.target.value)} className="w-24 rounded border px-2 py-1 text-xs text-right" placeholder="Đơn giá" />
                          <input type="number" value={costForm.thanhTienKeHoach ?? ''} readOnly tabIndex={-1} className="w-28 rounded border bg-gray-50 px-2 py-1 text-xs text-right text-gray-500" placeholder="Thành tiền" />
                        </>
                      ) : (
                        <>
                          <input type="number" value={costForm.soLuongThucTe ?? ''} onChange={(e) => updateCostField('soLuongThucTe', e.target.value)} className="w-16 rounded border px-2 py-1 text-xs text-right" placeholder="SL TT" />
                          <input type="number" value={costForm.giaThucTe ?? ''} onChange={(e) => updateCostField('giaThucTe', e.target.value)} className="w-24 rounded border px-2 py-1 text-xs text-right" placeholder="Giá TT" />
                          <input type="number" value={costForm.thanhTienThucTe ?? ''} readOnly tabIndex={-1} className="w-28 rounded border bg-gray-50 px-2 py-1 text-xs text-right text-gray-500" placeholder="Thành tiền TT" />
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : isPlan ? (
                <div key={cost.id} className="flex items-center gap-2 text-xs py-0.5 group">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 font-medium">{cost.loaiChiPhi}</span>
                  <span className="text-gray-700">{cost.tenChiPhi || ''}</span>
                  {(cost.thanhTienKeHoach != null && cost.thanhTienKeHoach > 0) && <span className="ml-auto text-gray-500">{fmtNum(cost.thanhTienKeHoach)}đ</span>}
                  {canWrite && (
                    <span className="ml-auto opacity-0 group-hover:opacity-100 flex gap-1">
                      <button onClick={() => startEditCost(cost)} className="text-gray-400 hover:text-green-600"><Edit className="h-3 w-3" /></button>
                      <button onClick={() => deleteCost(cost.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                    </span>
                  )}
                </div>
              ) : (
                <div key={cost.id} className="grid grid-cols-[1fr_80px_80px_80px] gap-1 items-center text-xs py-0.5 group">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 font-medium shrink-0">{cost.loaiChiPhi}</span>
                    <span className="text-gray-700 truncate">{cost.tenChiPhi || ''}</span>
                  </span>
                  <span className="text-right text-gray-500">{fmtNum(cost.thanhTienKeHoach)}</span>
                  <span className="text-right text-gray-800 font-medium">{fmtNum(cost.thanhTienThucTe)}</span>
                  <span className={`text-right ${(cost.thanhTienThucTe ?? 0) > (cost.thanhTienKeHoach ?? 0) ? 'text-red-600' : 'text-green-600'}`}>
                    {cost.thanhTienThucTe != null ? `${(((cost.thanhTienThucTe) - (cost.thanhTienKeHoach ?? 0)) >= 0 ? '+' : '')}${fmtNum((cost.thanhTienThucTe) - (cost.thanhTienKeHoach ?? 0))}` : '—'}
                  </span>
                  {canWrite && (
                    <span className="col-span-4 opacity-0 group-hover:opacity-100 flex gap-1 justify-end -mt-4">
                      <button onClick={() => startEditCost(cost)} className="text-gray-400 hover:text-green-600"><Edit className="h-3 w-3" /></button>
                    </span>
                  )}
                </div>
              ))}
              {costEditing === 'new' && (
                <div className="rounded border border-amber-200 bg-white p-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <select value={costForm.loaiChiPhi} onChange={(e) => setCostForm((f) => ({ ...f, loaiChiPhi: e.target.value }))} className="rounded border px-2 py-1 text-xs">{COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                    <input value={costForm.tenChiPhi ?? ''} onChange={(e) => setCostForm((f) => ({ ...f, tenChiPhi: e.target.value }))} className="flex-1 min-w-0 rounded border px-2 py-1 text-xs" placeholder="Tên chi phí (tuỳ chọn)" />
                    <button type="button" onClick={saveCost} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700">Lưu</button>
                    <button type="button" onClick={() => setCostEditing(null)} className="text-xs text-gray-400 hover:text-gray-600">Huỷ</button>
                  </div>
                  <button type="button" onClick={() => setCostDetailOpen(!costDetailOpen)} className="text-xs text-gray-500 hover:text-blue-600">{costDetailOpen ? '▾ Ẩn chi tiết' : '▸ Thêm SL/Giá/Tổng'}</button>
                  {costDetailOpen && (
                    <div className="flex items-center gap-2 pt-1">
                      <input value={costForm.donVi ?? ''} onChange={(e) => setCostForm((f) => ({ ...f, donVi: e.target.value }))} className="w-16 rounded border px-2 py-1 text-xs" placeholder="ĐVT" />
                      {isPlan ? (
                        <>
                          <input type="number" value={costForm.soLuongKeHoach ?? ''} onChange={(e) => updateCostField('soLuongKeHoach', e.target.value)} className="w-16 rounded border px-2 py-1 text-xs text-right" placeholder="SL" />
                          <input type="number" value={costForm.giaKeHoach ?? ''} onChange={(e) => updateCostField('giaKeHoach', e.target.value)} className="w-24 rounded border px-2 py-1 text-xs text-right" placeholder="Đơn giá" />
                          <input type="number" value={costForm.thanhTienKeHoach ?? ''} readOnly tabIndex={-1} className="w-28 rounded border bg-gray-50 px-2 py-1 text-xs text-right text-gray-500" placeholder="Thành tiền" />
                        </>
                      ) : (
                        <>
                          <input type="number" value={costForm.soLuongThucTe ?? ''} onChange={(e) => updateCostField('soLuongThucTe', e.target.value)} className="w-16 rounded border px-2 py-1 text-xs text-right" placeholder="SL TT" />
                          <input type="number" value={costForm.giaThucTe ?? ''} onChange={(e) => updateCostField('giaThucTe', e.target.value)} className="w-24 rounded border px-2 py-1 text-xs text-right" placeholder="Giá TT" />
                          <input type="number" value={costForm.thanhTienThucTe ?? ''} readOnly tabIndex={-1} className="w-28 rounded border bg-gray-50 px-2 py-1 text-xs text-right text-gray-500" placeholder="Thành tiền TT" />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              {costs.length === 0 && costEditing !== 'new' && <p className="text-xs text-gray-400 italic py-1">Chưa có chi phí.</p>}
              {canWrite && costEditing !== 'new' && <button onClick={startAddCost} className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"><Plus className="h-3 w-3" />Thêm chi phí</button>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const SortablePhaseItem = ({ phase, phaseIndex, phasesLength, canWrite, onMovePhase, onEditPhase, onAddTask, onAddTaskGroup, onRemovePhase, children }: {
  phase: ProjectPhase; phaseIndex: number; phasesLength: number; canWrite: boolean;
  onMovePhase: (phaseId: string, direction: -1 | 1) => void;
  onEditPhase: (mode: 'edit', phase: ProjectPhase) => void;
  onAddTask: (mode: 'create', phaseId: string) => void;
  onAddTaskGroup: (phaseId: string) => void;
  onRemovePhase: (phase: ProjectPhase) => void;
  children: ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: phase.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200">
      <div className="flex flex-col gap-2 border-b bg-gray-50 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {canWrite && <span {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600"><GripVertical className="h-4 w-4" /></span>}
            <span className="font-semibold text-gray-900">{phase.thuTu}. {phase.tenGiaiDoan}</span>
            {(() => { const total = (phase.tasks ?? []).reduce((sum, t) => sum + (t.costs ?? []).reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0), 0); return total > 0 ? <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">{total.toLocaleString('vi-VN')}đ</span> : null; })()}
          </div>
          <p className="mt-1 text-xs text-gray-500">Chủ sở hữu: {phase.chuSoHuu || '—'} | Phụ trách: {phase.nguoiPhuTrach || '—'} | {formatDate(phase.ngayBatDau)} - {formatDate(phase.ngayKetThuc)}</p>
        </div>
        {canWrite && (
          <div className="flex gap-1">
            <button title="Lên" disabled={phaseIndex === 0} onClick={() => onMovePhase(phase.id, -1)} className="rounded p-1.5 text-gray-500 hover:bg-white disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
            <button title="Xuống" disabled={phaseIndex === phasesLength - 1} onClick={() => onMovePhase(phase.id, 1)} className="rounded p-1.5 text-gray-500 hover:bg-white disabled:opacity-40"><ArrowDown className="h-4 w-4" /></button>
            <button title="Sửa" onClick={() => onEditPhase('edit', phase)} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-green-600"><Edit className="h-4 w-4" /></button>
            <button title="Thêm công việc" onClick={() => onAddTask('create', phase.id)} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-blue-600"><Plus className="h-4 w-4" /></button>
            <button title="Thêm mục" onClick={() => onAddTaskGroup(phase.id)} className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-white hover:text-blue-600">+ Mục</button>
            <button title="Xóa" onClick={() => onRemovePhase(phase)} className="rounded p-1.5 text-gray-500 hover:bg-white hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

const DroppableGroupSection = ({ groupId, children }: { groupId: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `group-drop-${groupId}` });
  return <div ref={setNodeRef} className={isOver ? 'ring-2 ring-blue-300 ring-inset rounded' : ''}>{children}</div>;
};

const GroupedTasksRenderer = ({
  phase,
  canWrite,
  viewMode = 'actual',
  projectId,
  onEditTask,
  onDeleteTask,
  onMoveTask,
  onDragEnd,
  onEditGroup,
  onDeleteGroup,
  onAddTaskToGroup,
  onMoveGroup,
  onStatusChange,
  onTaskMoveToGroup,
}: {
  phase: ProjectPhase;
  canWrite: boolean;
  viewMode?: 'plan' | 'actual';
  projectId?: string;
  onEditTask: (task: ProjectTask) => void;
  onDeleteTask: (task: ProjectTask) => void;
  onMoveTask?: (taskId: string, direction: -1 | 1) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onEditGroup: (group: ProjectTaskGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onAddTaskToGroup: (groupId: string) => void;
  onMoveGroup?: (groupId: string, direction: -1 | 1) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onTaskMoveToGroup?: (taskId: string, newGroupId: string | null) => void;
}) => {
  const groups = [...(phase.taskGroups ?? [])].sort((a, b) => a.thuTu - b.thuTu);
  const allTasks = phase.tasks ?? [];
  const hasGroups = groups.length > 0;

  if (!hasGroups) {
    return <TaskTable tasks={allTasks} canWrite={canWrite} onEdit={onEditTask} onDelete={onDeleteTask} viewMode={viewMode} projectId={projectId} onMoveTask={onMoveTask} onDragEnd={onDragEnd} onStatusChange={onStatusChange} />;
  }

  const ungroupedTasks = allTasks.filter(t => !t.projectTaskGroupId);

  const groupedSections: { groupId: string | null; tasks: ProjectTask[] }[] = groups.map((g) => ({
    groupId: g.id,
    tasks: (g.tasks ?? allTasks.filter(t => t.projectTaskGroupId === g.id)).sort((a, b) => a.thuTu - b.thuTu),
  }));
  groupedSections.push({ groupId: null, tasks: ungroupedTasks.sort((a, b) => a.thuTu - b.thuTu) });

  const findGroupForTask = (taskId: string | number): string | null => {
    const tid = String(taskId);
    for (const section of groupedSections) {
      if (section.tasks.some(t => t.id === tid)) return section.groupId;
    }
    return null;
  };

  const handleGroupedDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overId = String(over.id);
    const sourceGroup = findGroupForTask(active.id);
    let targetGroup: string | null;

    if (overId.startsWith('group-drop-')) {
      targetGroup = overId.replace('group-drop-', '');
      if (targetGroup === '__ungrouped') targetGroup = null;
    } else {
      targetGroup = findGroupForTask(over.id);
    }

    if (sourceGroup !== targetGroup && onTaskMoveToGroup) {
      onTaskMoveToGroup(String(active.id), targetGroup);
    } else if (sourceGroup === targetGroup && onDragEnd) {
      onDragEnd(event);
    }
  };

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const isPlan = viewMode === 'plan';
  const colCount = isPlan ? (canWrite ? 6 : 5) : (canWrite ? 9 : 8);

  const allTaskIds = groupedSections.flatMap(s => s.tasks.map(t => t.id));

  const theadRow = (
    <thead className="bg-white text-xs uppercase text-gray-600">
      <tr>
        <th className="w-10 border-b px-3 py-2 text-left">TT</th>
        <th className="border-b px-3 py-2 text-left">Công việc</th>
        <th className="w-[120px] border-b px-3 py-2 text-left">Phụ trách</th>
        {!isPlan && <th className="w-[80px] border-b px-3 py-2 text-left">Ưu tiên</th>}
        {!isPlan && <th className="w-[70px] border-b px-3 py-2 text-left">Tiến độ</th>}
        {!isPlan && <th className="w-[90px] border-b px-3 py-2 text-left">Trạng thái</th>}
        <th className="w-[150px] border-b px-3 py-2 text-left">{isPlan ? 'Ngày KH' : 'Ngày TT'}</th>
        <th className="w-[100px] border-b px-3 py-2 text-left">Chi phí</th>
        {canWrite && <th className="w-[100px] border-b px-3 py-2 text-right">Thao tác</th>}
      </tr>
    </thead>
  );

  return (
    <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleGroupedDragEnd}>
      <SortableContext items={allTaskIds} strategy={verticalListSortingStrategy}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            {theadRow}
            <tbody className="divide-y divide-gray-100">
              {groupedSections.map((section) => {
                const group = section.groupId ? groups.find(g => g.id === section.groupId) : null;
                const dropId = section.groupId ?? '__ungrouped';
                return (
                  <React.Fragment key={dropId}>
                    <tr className={section.groupId ? 'bg-gray-100' : 'bg-gray-50'}>
                      <td colSpan={colCount} className="px-3 py-1.5 border-b border-gray-200">
                        <DroppableGroupSection groupId={dropId}>
                          <div className="flex items-center gap-2">
                            {group ? (
                              <>
                                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{group.tenMuc}</span>
                                {group.moTa && <span className="text-xs text-gray-500">— {group.moTa}</span>}
                                <span className="text-xs text-gray-400">({section.tasks.length})</span>
                                {canWrite && (
                                  <span className="ml-auto flex gap-1">
                                    {onMoveGroup && <button title="Di chuyển lên" onClick={() => onMoveGroup(group.id, -1)} className="rounded p-1 text-gray-400 hover:text-blue-600"><ArrowUp className="h-3.5 w-3.5" /></button>}
                                    {onMoveGroup && <button title="Di chuyển xuống" onClick={() => onMoveGroup(group.id, 1)} className="rounded p-1 text-gray-400 hover:text-blue-600"><ArrowDown className="h-3.5 w-3.5" /></button>}
                                    <button title="Thêm CV vào mục" onClick={() => onAddTaskToGroup(group.id)} className="rounded p-1 text-gray-400 hover:text-blue-600"><Plus className="h-3.5 w-3.5" /></button>
                                    <button title="Sửa mục" onClick={() => onEditGroup(group)} className="rounded p-1 text-gray-400 hover:text-green-600"><Edit className="h-3.5 w-3.5" /></button>
                                    <button title="Xóa mục" onClick={() => onDeleteGroup(group.id)} className="rounded p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-medium text-gray-500 italic">Chưa phân mục</span>
                                <span className="text-xs text-gray-400">({section.tasks.length})</span>
                              </>
                            )}
                          </div>
                        </DroppableGroupSection>
                      </td>
                    </tr>
                    {section.tasks.length === 0 ? (
                      <tr><td colSpan={colCount} className="px-3 py-3 text-center text-gray-400 text-xs">Kéo công việc vào đây</td></tr>
                    ) : section.tasks.map((task, idx) => (
                      <TaskRow key={task.id} task={task} isPlan={isPlan} colCount={colCount} canWrite={canWrite} onEdit={onEditTask} onDelete={onDeleteTask} projectId={projectId} onMoveTask={onMoveTask} taskIndex={idx} tasksLength={section.tasks.length} onStatusChange={onStatusChange} />
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </SortableContext>
    </DndContext>
  );
};

const TaskTable = ({
  tasks,
  canWrite,
  onEdit,
  onDelete,
  viewMode = 'actual',
  projectId,
  onMoveTask,
  onDragEnd,
  onStatusChange,
}: {
  tasks: ProjectTask[];
  canWrite: boolean;
  onEdit: (task: ProjectTask) => void;
  onDelete: (task: ProjectTask) => void;
  viewMode?: 'plan' | 'actual';
  projectId?: string;
  onMoveTask?: (taskId: string, direction: -1 | 1) => void;
  onDragEnd?: (event: DragEndEvent) => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
}) => {
  const isPlan = viewMode === 'plan';
  const colCount = isPlan ? (canWrite ? 6 : 5) : (canWrite ? 9 : 8);
  const tableSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tableBody = (
    <tbody className="divide-y divide-gray-100">
      {tasks.length === 0 ? (
        <tr><td colSpan={colCount} className="px-3 py-4 text-center text-gray-500">Chưa có công việc.</td></tr>
      ) : tasks.map((task, idx) => (
        <TaskRow key={task.id} task={task} isPlan={isPlan} colCount={colCount} canWrite={canWrite} onEdit={onEdit} onDelete={onDelete} projectId={projectId} onMoveTask={onMoveTask} taskIndex={idx} tasksLength={tasks.length} onStatusChange={onStatusChange} />
      ))}
    </tbody>
  );

  return (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[700px] text-sm">
      <thead className="bg-white text-xs uppercase text-gray-600">
        <tr>
          <th className="w-10 border-b px-3 py-2 text-left">TT</th>
          <th className="border-b px-3 py-2 text-left">Công việc</th>
          <th className="w-[120px] border-b px-3 py-2 text-left">Phụ trách</th>
          {!isPlan && <th className="w-[80px] border-b px-3 py-2 text-left">Ưu tiên</th>}
          {!isPlan && <th className="w-[70px] border-b px-3 py-2 text-left">Tiến độ</th>}
          {!isPlan && <th className="w-[90px] border-b px-3 py-2 text-left">Trạng thái</th>}
          <th className="w-[150px] border-b px-3 py-2 text-left">{isPlan ? 'Ngày KH' : 'Ngày TT'}</th>
          <th className="w-[100px] border-b px-3 py-2 text-left">Chi phí</th>
          {canWrite && <th className="w-[100px] border-b px-3 py-2 text-right">Thao tác</th>}
        </tr>
      </thead>
      {canWrite && onDragEnd ? (
        <DndContext sensors={tableSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            {tableBody}
          </SortableContext>
        </DndContext>
      ) : tableBody}
    </table>
  </div>
  );
};

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
