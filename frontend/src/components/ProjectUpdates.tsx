import { FormEvent, useState } from 'react';
import { Edit, Plus, Trash2, X } from 'lucide-react';
import {
  useAddProjectUpdate,
  useDeleteProjectUpdate,
  useProjectUpdates,
  useUpdateProjectUpdate,
} from '../hooks/useProjectPhases';
import type { CreateProjectUpdateRequest, ProjectPhase, ProjectUpdate } from '../services/projectService';
import { useAuth } from '../contexts/AuthContext';

interface ProjectUpdatesProps {
  projectId: string;
  phases: ProjectPhase[];
  canWrite: boolean;
}

const emptyForm = (userName: string): CreateProjectUpdateRequest => ({
  ngay: new Date().toISOString().split('T')[0],
  tieuDe: '',
  noiDung: '',
  tienDoHienTai: 0,
  fileDinhKem: '',
  nguoiCapNhat: userName,
  projectPhaseId: null,
});

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

const ProjectUpdates = ({ projectId, phases, canWrite }: ProjectUpdatesProps) => {
  const { user } = useAuth();
  const userName = user?.name ?? user?.email ?? '';
  const updatesQuery = useProjectUpdates(projectId);
  const addUpdate = useAddProjectUpdate();
  const editUpdate = useUpdateProjectUpdate();
  const removeUpdate = useDeleteProjectUpdate();

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; update?: ProjectUpdate } | null>(null);
  const [form, setForm] = useState<CreateProjectUpdateRequest>(emptyForm(userName));
  const [error, setError] = useState('');

  const updates = updatesQuery.data?.data ?? [];

  const openModal = (mode: 'create' | 'edit', update?: ProjectUpdate) => {
    setError('');
    setModal({ mode, update });
    setForm(update ? {
      ngay: update.ngay.split('T')[0],
      tieuDe: update.tieuDe,
      noiDung: update.noiDung,
      tienDoHienTai: update.tienDoHienTai,
      fileDinhKem: update.fileDinhKem ?? '',
      nguoiCapNhat: update.nguoiCapNhat,
      projectPhaseId: update.projectPhaseId ?? null,
    } : emptyForm(userName));
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      tienDoHienTai: Math.max(0, Math.min(100, Number(form.tienDoHienTai) || 0)),
      projectPhaseId: form.projectPhaseId || null,
    };
    try {
      if (modal?.update) {
        await editUpdate.mutateAsync({ projectId, updateId: modal.update.id, data: payload });
      } else {
        await addUpdate.mutateAsync({ projectId, data: payload });
      }
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được cập nhật');
    }
  };

  const remove = async (update: ProjectUpdate) => {
    if (!confirm(`Xóa cập nhật "${update.tieuDe}"?`)) return;
    try {
      await removeUpdate.mutateAsync({ projectId, updateId: update.id });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được cập nhật');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Nhật ký cập nhật thực tế</h4>
        {canWrite && (
          <button
            onClick={() => openModal('create')}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Thêm cập nhật
          </button>
        )}
      </div>

      {updatesQuery.isLoading ? (
        <div className="py-6 text-center text-gray-500">Đang tải...</div>
      ) : updates.length === 0 ? (
        <div className="rounded-md border border-gray-200 px-3 py-6 text-center text-gray-500">
          Chưa có cập nhật nào.
        </div>
      ) : (
        <div className="space-y-2">
          {updates.map((update) => (
            <div key={update.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500">{formatDate(update.ngay)}</span>
                    <span className="font-medium text-gray-900 truncate">{update.tieuDe}</span>
                    <span className="rounded-full bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs">
                      {update.tienDoHienTai}%
                    </span>
                    {update.projectPhaseId && (
                      <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-xs">
                        {phases.find((p) => p.id === update.projectPhaseId)?.tenGiaiDoan ?? 'Giai đoạn'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{update.noiDung}</p>
                  <p className="mt-1 text-xs text-gray-500">Cập nhật bởi: {update.nguoiCapNhat}</p>
                </div>
                {canWrite && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => openModal('edit', update)}
                      className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                      title="Sửa"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(update)}
                      className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!!modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">
                {modal.update ? 'Sửa cập nhật' : 'Thêm cập nhật'}
              </h3>
              <button onClick={() => setModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={save} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Ngày</span>
                  <input
                    required
                    type="date"
                    value={form.ngay}
                    onChange={(e) => setForm((f) => ({ ...f, ngay: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Tiến độ tại thời điểm (%)</span>
                  <input
                    required
                    type="number"
                    min={0}
                    max={100}
                    value={form.tienDoHienTai}
                    onChange={(e) => setForm((f) => ({ ...f, tienDoHienTai: Number(e.target.value) }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="font-medium text-gray-700">Tiêu đề</span>
                <input
                  required
                  value={form.tieuDe}
                  onChange={(e) => setForm((f) => ({ ...f, tieuDe: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-medium text-gray-700">Nội dung</span>
                <textarea
                  required
                  rows={3}
                  value={form.noiDung}
                  onChange={(e) => setForm((f) => ({ ...f, noiDung: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Giai đoạn liên quan</span>
                  <select
                    value={form.projectPhaseId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, projectPhaseId: e.target.value || null }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="">Toàn dự án</option>
                    {phases.map((phase) => (
                      <option key={phase.id} value={phase.id}>{phase.tenGiaiDoan}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Người cập nhật</span>
                  <input
                    value={form.nguoiCapNhat}
                    onChange={(e) => setForm((f) => ({ ...f, nguoiCapNhat: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectUpdates;
