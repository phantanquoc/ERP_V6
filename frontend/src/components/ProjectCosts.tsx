import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Edit, Plus, Trash2, X } from 'lucide-react';
import {
  useAddProjectCost,
  useDeleteProjectCost,
  useProjectCosts,
  useUpdateProjectCost,
} from '../hooks/useProjectPhases';
import type { CreateProjectCostRequest, ProjectCost, ProjectPhase } from '../services/projectService';

const COST_CATEGORIES = ['Nhân công', 'Vật tư', 'Phụ liệu', 'Khác'];

interface ProjectCostsProps {
  projectId: string;
  phases: ProjectPhase[];
  canWrite: boolean;
}

const emptyCost = (): CreateProjectCostRequest => ({
  loaiChiPhi: 'Nhân công',
  tenChiPhi: '',
  donVi: '',
  soLuongKeHoach: '',
  giaKeHoach: '',
  thanhTienKeHoach: '',
  soLuongThucTe: '',
  giaThucTe: '',
  thanhTienThucTe: '',
  projectPhaseId: null,
});

const fmt = (val?: number | null) =>
  val != null ? Number(val).toLocaleString('vi-VN') : '—';

const isOver = (kh?: number | null, tt?: number | null) =>
  kh != null && tt != null && tt > kh;

const ProjectCosts = ({ projectId, phases, canWrite }: ProjectCostsProps) => {
  const costsQuery = useProjectCosts(projectId);
  const addCost = useAddProjectCost();
  const editCost = useUpdateProjectCost();
  const removeCost = useDeleteProjectCost();

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; cost?: ProjectCost } | null>(null);
  const [form, setForm] = useState<CreateProjectCostRequest>(emptyCost());
  const [error, setError] = useState('');
  const [filterPhase, setFilterPhase] = useState<string>('');

  const allCosts = costsQuery.data?.data ?? [];
  const costs = filterPhase
    ? allCosts.filter((c) => c.projectPhaseId === filterPhase)
    : allCosts;

  // Aggregate by category for summary
  const summary = COST_CATEGORIES.map((cat) => {
    const rows = allCosts.filter((c) => c.loaiChiPhi === cat);
    const kh = rows.reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
    const tt = rows.reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0);
    return { cat, kh, tt };
  });

  const totalKH = summary.reduce((s, r) => s + r.kh, 0);
  const totalTT = summary.reduce((s, r) => s + r.tt, 0);

  const openModal = (mode: 'create' | 'edit', cost?: ProjectCost) => {
    setError('');
    setModal({ mode, cost });
    setForm(cost ? {
      loaiChiPhi: cost.loaiChiPhi,
      tenChiPhi: cost.tenChiPhi ?? '',
      donVi: cost.donVi ?? '',
      soLuongKeHoach: cost.soLuongKeHoach ?? '',
      giaKeHoach: cost.giaKeHoach ?? '',
      thanhTienKeHoach: cost.thanhTienKeHoach ?? '',
      soLuongThucTe: cost.soLuongThucTe ?? '',
      giaThucTe: cost.giaThucTe ?? '',
      thanhTienThucTe: cost.thanhTienThucTe ?? '',
      projectPhaseId: cost.projectPhaseId ?? null,
    } : emptyCost());
  };

  const autoCalc = (field: 'kh' | 'tt') => {
    if (field === 'kh') {
      const sl = parseFloat(String(form.soLuongKeHoach)) || 0;
      const gia = parseFloat(String(form.giaKeHoach)) || 0;
      if (sl && gia) setForm((f) => ({ ...f, thanhTienKeHoach: sl * gia }));
    } else {
      const sl = parseFloat(String(form.soLuongThucTe)) || 0;
      const gia = parseFloat(String(form.giaThucTe)) || 0;
      if (sl && gia) setForm((f) => ({ ...f, thanhTienThucTe: sl * gia }));
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      projectPhaseId: form.projectPhaseId || null,
    };
    try {
      if (modal?.cost) {
        await editCost.mutateAsync({ projectId, costId: modal.cost.id, data: payload });
      } else {
        await addCost.mutateAsync({ projectId, data: payload });
      }
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được chi phí');
    }
  };

  const remove = async (cost: ProjectCost) => {
    if (!confirm(`Xóa chi phí "${cost.tenChiPhi || cost.loaiChiPhi}"?`)) return;
    try {
      await removeCost.mutateAsync({ projectId, costId: cost.id });
      toast.success('Đã xóa chi phí');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xóa được chi phí');
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary table */}
      <div>
        <h4 className="mb-2 font-semibold text-gray-900">Tổng hợp chi phí</h4>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="border-b px-3 py-2.5 text-left">Loại chi phí</th>
                <th className="border-b px-3 py-2.5 text-right">Kế hoạch (VND)</th>
                <th className="border-b px-3 py-2.5 text-right">Thực tế (VND)</th>
                <th className="border-b px-3 py-2.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.map(({ cat, kh, tt }) => (
                <tr key={cat} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 font-medium text-gray-900">{cat}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{kh ? fmt(kh) : '—'}</td>
                  <td className={`px-3 py-2 text-right font-medium ${tt > kh && kh > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {tt ? fmt(tt) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {kh > 0 && tt > kh ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Vượt kế hoạch
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">
                        Trong kế hoạch
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-3 py-2.5 text-gray-900">Tổng cộng</td>
                <td className="px-3 py-2.5 text-right text-gray-900">{fmt(totalKH)}</td>
                <td className={`px-3 py-2.5 text-right ${totalTT > totalKH && totalKH > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {fmt(totalTT)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {totalKH > 0 && totalTT > totalKH && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-700">
                      <AlertTriangle className="h-3 w-3" /> Vượt
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail table */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold text-gray-900">Chi tiết chi phí</h4>
          <div className="flex items-center gap-2">
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Tất cả</option>
              <option value="null">Chi phí toàn dự án</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>{p.tenGiaiDoan}</option>
              ))}
            </select>
            {canWrite && (
              <button
                onClick={() => openModal('create')}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Thêm chi phí
              </button>
            )}
          </div>
        </div>

        {costsQuery.isLoading ? (
          <div className="py-6 text-center text-gray-500">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="border-b px-3 py-2.5 text-left">Loại</th>
                  <th className="border-b px-3 py-2.5 text-left">Tên chi phí</th>
                  <th className="border-b px-3 py-2.5 text-left">Đơn vị</th>
                  <th className="border-b px-3 py-2.5 text-right">SL KH</th>
                  <th className="border-b px-3 py-2.5 text-right">Giá KH</th>
                  <th className="border-b px-3 py-2.5 text-right">T.Tiền KH</th>
                  <th className="border-b px-3 py-2.5 text-right">SL TT</th>
                  <th className="border-b px-3 py-2.5 text-right">Giá TT</th>
                  <th className="border-b px-3 py-2.5 text-right">T.Tiền TT</th>
                  <th className="border-b px-3 py-2.5 text-left">Giai đoạn</th>
                  {canWrite && <th className="border-b px-3 py-2.5 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costs.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 11 : 10} className="px-3 py-6 text-center text-gray-500">
                      Chưa có chi phí.
                    </td>
                  </tr>
                ) : costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-gray-900 font-medium">{cost.loaiChiPhi}</td>
                    <td className="px-3 py-2 text-gray-700">{cost.tenChiPhi || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{cost.donVi || '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{cost.soLuongKeHoach ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(cost.giaKeHoach)}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{fmt(cost.thanhTienKeHoach)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{cost.soLuongThucTe ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(cost.giaThucTe)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${isOver(cost.thanhTienKeHoach, cost.thanhTienThucTe) ? 'text-red-600' : 'text-gray-700'}`}>
                      {fmt(cost.thanhTienThucTe)}
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {cost.projectPhaseId
                        ? phases.find((p) => p.id === cost.projectPhaseId)?.tenGiaiDoan ?? '—'
                        : 'Toàn dự án'}
                    </td>
                    {canWrite && (
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openModal('edit', cost)}
                            title="Sửa"
                            className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(cost)}
                            title="Xóa"
                            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!!modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">
                {modal.cost ? 'Sửa chi phí' : 'Thêm chi phí'}
              </h3>
              <button onClick={() => setModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={save} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>
              )}
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Loại chi phí</span>
                  <select
                    required
                    value={form.loaiChiPhi}
                    onChange={(e) => setForm((f) => ({ ...f, loaiChiPhi: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    {COST_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Tên chi phí</span>
                  <input
                    value={form.tenChiPhi ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, tenChiPhi: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Đơn vị</span>
                  <input
                    value={form.donVi ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, donVi: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>
              <div className="rounded-md border border-gray-200 bg-blue-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Kế hoạch</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="font-medium text-gray-700">Số lượng KH</span>
                    <input
                      type="number"
                      min={0}
                      value={form.soLuongKeHoach ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, soLuongKeHoach: e.target.value }))}
                      onBlur={() => autoCalc('kh')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-medium text-gray-700">Giá KH (VND)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.giaKeHoach ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, giaKeHoach: e.target.value }))}
                      onBlur={() => autoCalc('kh')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-medium text-gray-700">Thành tiền KH (VND)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.thanhTienKeHoach ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, thanhTienKeHoach: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-green-50 p-3 space-y-2">
                <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">Thực tế</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1">
                    <span className="font-medium text-gray-700">Số lượng TT</span>
                    <input
                      type="number"
                      min={0}
                      value={form.soLuongThucTe ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, soLuongThucTe: e.target.value }))}
                      onBlur={() => autoCalc('tt')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-medium text-gray-700">Giá TT (VND)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.giaThucTe ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, giaThucTe: e.target.value }))}
                      onBlur={() => autoCalc('tt')}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="font-medium text-gray-700">Thành tiền TT (VND)</span>
                    <input
                      type="number"
                      min={0}
                      value={form.thanhTienThucTe ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, thanhTienThucTe: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </label>
                </div>
              </div>
              <label className="block space-y-1">
                <span className="font-medium text-gray-700">Giai đoạn</span>
                <select
                  value={form.projectPhaseId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, projectPhaseId: e.target.value || null }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Chi phí toàn dự án</option>
                  {phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>{phase.tenGiaiDoan}</option>
                  ))}
                </select>
              </label>
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

export default ProjectCosts;
