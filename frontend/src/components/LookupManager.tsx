import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueries } from '@tanstack/react-query';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  LOOKUP_GROUPS,
  LOOKUP_GROUP_LABELS,
  type CascadeConfirmationDetail,
  type Lookup,
  type LookupGroup,
  type LookupUsage,
  type UpdateLookupData,
} from '../types/lookup';
import lookupService, { isCascadeConfirmation } from '../services/lookupService';
import {
  lookupKeys,
  useCreateLookup,
  useDeleteLookup,
  useLookups,
  useLookupsAll,
  useUpdateLookup,
} from '../hooks/useLookups';
import { ApiError } from '../services/apiClient';

/**
 * Admin UI for the shared classification tables — change: shared-lookup-table, group 7.
 *
 * ZERO-DATA-LOSS RULES BAKED INTO THIS COMPONENT — do not "simplify" them away:
 *
 *  1. Delete is SOFT only. There is no hard-delete affordance anywhere. When the API
 *     refuses (400, label still in use) we tell the admin to hide it instead.
 *  2. A label change on an in-use lookup is gated by the backend's 409. We NEVER send
 *     `confirmCascade` on the first attempt — the 409 is the safety gate, and the
 *     cascade only runs after the admin reads old label, new label and record count
 *     and explicitly confirms.
 *  3. Cascade is synchronous (design.md Q1): a non-dismissible spinner modal blocks the
 *     UI while the transaction runs, so the admin cannot double-submit it.
 *  4. Labels are rendered and submitted VERBATIM — never trimmed. Seeded production
 *     data contains a `LOAI_CHI_PHI` value with a trailing space plus case variants
 *     ('Văn phòng phẩm' / 'văn phòng phẩm'); trimming would make those impossible to
 *     tell apart or to fix. Whitespace is made visible instead (see `LabelCell`).
 *
 * Merging those dirty variants via cascade rename is the primary workflow here.
 */

const GROUP_OPTIONS = Object.values(LOOKUP_GROUPS) as LookupGroup[];

/** Usage counts change only when business data does — no need to refetch aggressively. */
const USAGE_STALE_TIME = 5 * 60 * 1000;

interface EditForm {
  label: string;
  sortOrder: number;
  isActive: boolean;
}

/**
 * Renders a label with leading/trailing whitespace made visible.
 *
 * `'sản xuất '` and `'sản xuất'` are two different lookups in production data. Shown
 * as plain text they look identical, so the admin cannot tell which one to merge. The
 * raw string is never modified — only its rendering is annotated.
 */
const LabelCell: React.FC<{ label: string }> = ({ label }) => {
  const leading = label.length - label.trimStart().length;
  const trailing = label.length - label.trimEnd().length;
  const core = label.slice(leading, label.length - trailing);

  const marker = (count: number, side: string) => (
    <span
      className="text-amber-600 bg-amber-50 border border-amber-200 rounded px-0.5"
      title={`${count} khoảng trắng ở ${side} — giá trị được giữ nguyên, không tự động xóa`}
    >
      {'·'.repeat(count)}
    </span>
  );

  return (
    <span className="inline-flex items-center gap-0.5">
      {leading > 0 && marker(leading, 'đầu')}
      <span>{core}</span>
      {trailing > 0 && marker(trailing, 'cuối')}
    </span>
  );
};

const LookupManager: React.FC = () => {
  const [group, setGroup] = useState<LookupGroup>(LOOKUP_GROUPS.DON_VI_TINH);
  const [showHidden, setShowHidden] = useState(false);
  const [expandedUsageId, setExpandedUsageId] = useState<string | null>(null);

  // Create / edit
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<{ label: string; sortOrder: number }>({
    label: '',
    sortOrder: 0,
  });
  const [editing, setEditing] = useState<Lookup | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ label: '', sortOrder: 0, isActive: true });

  // Cascade confirmation + progress
  const [cascade, setCascade] = useState<{
    detail: CascadeConfirmationDetail;
    id: string;
    data: UpdateLookupData;
  } | null>(null);
  const [cascadeRunning, setCascadeRunning] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Lookup | null>(null);
  const [blockedDelete, setBlockedDelete] = useState<{ label: string; message: string } | null>(
    null
  );

  // Only one of the two list queries is enabled at a time; both hooks must still run.
  const activeQuery = useLookups(group, { enabled: !showHidden });
  const allQuery = useLookupsAll(group, { enabled: showHidden });
  const listQuery = showHidden ? allQuery : activeQuery;
  const rows = useMemo<Lookup[]>(() => listQuery.data ?? [], [listQuery.data]);

  const createMutation = useCreateLookup();
  const updateMutation = useUpdateLookup();
  const deleteMutation = useDeleteLookup();

  /**
   * Usage counts, one request per row, but scoped to the SELECTED GROUP only.
   *
   * The table holds 74 lookups across 11 groups; firing 74 requests on mount would be
   * wasteful. Because exactly one group is ever displayed, this is bounded by the
   * largest group (DON_VI_TINH = 23) and most groups need 1–9. Results share the same
   * cache keys the mutations invalidate (`lookupKeys.usage(id)`), so a cascade rename
   * refreshes the badges without any bespoke wiring, and switching groups back and
   * forth is free within the stale window.
   */
  const usageQueries = useQueries({
    queries: rows.map((row) => ({
      queryKey: lookupKeys.usage(row.id),
      queryFn: () => lookupService.getUsage(row.id),
      staleTime: USAGE_STALE_TIME,
    })),
  });

  const usageOf = (index: number): LookupUsage | undefined => usageQueries[index]?.data;

  const resetCreate = () => {
    setCreateForm({ label: '', sortOrder: 0 });
    setShowCreate(false);
  };

  const openCreate = () => {
    setCreateForm({ label: '', sortOrder: rows.length });
    setShowCreate(true);
  };

  const handleCreate = async () => {
    // Reject a blank/whitespace-only label, but submit the label itself verbatim.
    if (!createForm.label.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }
    try {
      await createMutation.mutateAsync({
        group,
        label: createForm.label,
        sortOrder: createForm.sortOrder,
      });
      toast.success('Thêm danh mục thành công');
      resetCreate();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        toast.error('Giá trị này đã tồn tại trong nhóm');
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Lỗi khi thêm danh mục');
    }
  };

  const openEdit = (item: Lookup) => {
    setEditing(item);
    setEditForm({ label: item.label, sortOrder: item.sortOrder, isActive: item.isActive });
  };

  const closeEdit = () => {
    setEditing(null);
  };

  /**
   * First attempt is always WITHOUT `confirmCascade`. If the label change would touch
   * business rows the backend answers 409 and writes nothing; we then show the
   * confirmation dialog and only the admin's click authorises the cascade.
   */
  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editForm.label.trim()) {
      toast.error('Vui lòng nhập tên danh mục');
      return;
    }

    const payload: UpdateLookupData = {
      label: editForm.label,
      sortOrder: editForm.sortOrder,
      isActive: editForm.isActive,
    };

    try {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
      toast.success('Cập nhật danh mục thành công');
      closeEdit();
    } catch (err) {
      const detail = isCascadeConfirmation(err);
      if (detail) {
        setCascade({ detail, id: editing.id, data: payload });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật danh mục');
    }
  };

  const handleConfirmCascade = async () => {
    if (!cascade || cascadeRunning) return;
    setCascadeRunning(true);
    try {
      await updateMutation.mutateAsync({
        id: cascade.id,
        data: { ...cascade.data, confirmCascade: true },
      });
      toast.success(`Đã cập nhật ${cascade.detail.affectedRecords} bản ghi`);
      setCascade(null);
      closeEdit();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      // The backend rolls data and audit back together — say so plainly.
      toast.error(`Đổi tên thất bại: ${message}. Không có dữ liệu nào bị thay đổi.`);
      setCascade(null);
    } finally {
      setCascadeRunning(false);
    }
  };

  const handleToggleActive = async (item: Lookup) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, data: { isActive: !item.isActive } });
      toast.success(item.isActive ? 'Đã ẩn danh mục' : 'Đã hiện danh mục');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái');
    }
  };

  /** Soft delete only. In-use values are refused — we offer hiding instead. */
  const requestDelete = (item: Lookup, usage?: LookupUsage) => {
    if (usage && usage.usageCount > 0) {
      setBlockedDelete({
        label: item.label,
        message: `Không thể xóa — đang được ${usage.usageCount} bản ghi sử dụng. Hãy ẩn thay vì xóa.`,
      });
      return;
    }
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteMutation.mutateAsync(target.id);
      toast.success('Đã ẩn danh mục');
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 400) {
        setBlockedDelete({
          label: target.label,
          message:
            err.message || 'Không thể xóa — đang được sử dụng. Hãy ẩn thay vì xóa.',
        });
        return;
      }
      toast.error(err instanceof Error ? err.message : 'Lỗi khi ẩn danh mục');
    }
  };

  const busy = updateMutation.isPending || createMutation.isPending || deleteMutation.isPending;

  return (
    <div className="p-4 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <label htmlFor="lookup-group" className="block text-xs font-medium text-gray-600 mb-1">
            Nhóm danh mục
          </label>
          <select
            id="lookup-group"
            value={group}
            onChange={(e) => {
              setGroup(e.target.value as LookupGroup);
              setExpandedUsageId(null);
            }}
            className="w-full sm:w-64 px-3 py-2 border rounded-md text-sm bg-white"
          >
            {GROUP_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {LOOKUP_GROUP_LABELS[g]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="rounded"
            />
            Hiện mục đã ẩn
          </label>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus size={16} /> Thêm giá trị
          </button>
        </div>
      </div>

      {/* Error banner with retry */}
      {listQuery.isError && (
        <div className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">Không tải được danh mục. Thử lại?</p>
          <button
            onClick={() => listQuery.refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-100 text-sm"
          >
            <RefreshCw size={14} /> Tải lại
          </button>
        </div>
      )}

      {listQuery.isLoading ? (
        <div className="border rounded-lg bg-white divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3 animate-pulse">
              <div className="h-3 bg-gray-200 rounded flex-1" />
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 && !listQuery.isError ? (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-gray-400">Nhóm này chưa có giá trị nào</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            <Plus size={16} /> Thêm giá trị đầu tiên
          </button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Tên</th>
                <th className="hidden md:table-cell px-3 py-2 text-left font-medium text-gray-600">
                  Mã
                </th>
                <th className="hidden md:table-cell px-3 py-2 text-center font-medium text-gray-600 w-24">
                  Thứ tự
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 w-32">Sử dụng</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 w-28">Trạng thái</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((item, index) => {
                const usage = usageOf(index);
                const usageLoading = usageQueries[index]?.isLoading;
                const expanded = expandedUsageId === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <tr className={item.isActive ? '' : 'bg-gray-50 text-gray-400'}>
                      <td className="px-3 py-2">
                        <LabelCell label={item.label} />
                        <span className="md:hidden block text-xs text-gray-400 font-mono mt-0.5">
                          {item.code}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 font-mono text-xs text-gray-500">
                        {item.code}
                      </td>
                      <td className="hidden md:table-cell px-3 py-2 text-center">
                        {item.sortOrder}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {usageLoading ? (
                          <span className="text-xs text-gray-400">…</span>
                        ) : (
                          <button
                            onClick={() => setExpandedUsageId(expanded ? null : item.id)}
                            title="Xem chi tiết bảng đang sử dụng"
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              usage && usage.usageCount > 0
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {usage && usage.usageCount > 0
                              ? `${usage.usageCount} bản ghi`
                              : 'Chưa dùng'}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleToggleActive(item)}
                          disabled={busy}
                          title={item.isActive ? 'Ẩn giá trị này' : 'Hiện lại giá trị này'}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            item.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {item.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                          {item.isActive ? 'Hiển thị' : 'Đã ẩn'}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => requestDelete(item, usage)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Ẩn giá trị (không xóa dữ liệu)"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expanded && (
                      <tr className="bg-blue-50/50">
                        <td colSpan={6} className="px-3 py-2">
                          {usage && usage.breakdown.length > 0 ? (
                            <ul className="text-xs text-gray-700 space-y-0.5">
                              {usage.breakdown.map((b) => (
                                <li key={`${b.table}.${b.column}`}>
                                  <span className="font-medium">{b.table}</span>
                                  <span className="text-gray-500">.{b.column}</span> — {b.count} bản
                                  ghi
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-gray-500">
                              Chưa có bản ghi nào dùng giá trị này.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Xóa ở đây chỉ <strong>ẩn</strong> giá trị, không bao giờ xóa dữ liệu. Đổi tên một giá trị
        đang được sử dụng sẽ cập nhật đồng loạt các bản ghi liên quan và luôn cần xác nhận.
      </p>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">
                Thêm giá trị — {LOOKUP_GROUP_LABELS[group]}
              </h3>
              <button onClick={resetCreate} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tên giá trị *</label>
                <input
                  type="text"
                  autoFocus
                  value={createForm.label}
                  onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="VD: Lọ"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Thứ tự</label>
                <input
                  type="number"
                  value={createForm.sortOrder}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <p className="text-xs text-gray-500">Mã được sinh tự động từ tên.</p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                onClick={resetCreate}
                className="px-3 py-1.5 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:bg-gray-400"
              >
                <Save size={16} /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && !cascade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Sửa giá trị</h3>
              <button onClick={closeEdit} className="text-gray-500 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">Tên giá trị *</label>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                {editForm.label !== editForm.label.trim() && (
                  <p className="mt-1 text-xs text-amber-700">
                    Giá trị này có khoảng trắng ở đầu/cuối và sẽ được lưu đúng như vậy.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Thứ tự</label>
                <input
                  type="number"
                  value={editForm.sortOrder}
                  onChange={(e) =>
                    setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="rounded"
                />
                Đang hiển thị
              </label>
              <p className="text-xs text-gray-500">
                Nếu giá trị đang được sử dụng, việc đổi tên sẽ cần xác nhận trước khi cập nhật các
                bản ghi liên quan.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                onClick={closeEdit}
                className="px-3 py-1.5 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm disabled:bg-gray-400"
              >
                <Save size={16} /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/*
        Cascade confirmation. While `cascadeRunning` this modal has NO dismiss control and
        the confirm button is disabled — the admin cannot close it or double-submit the
        synchronous transaction.
      */}
      {cascade && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">Xác nhận đổi tên đồng loạt</h3>
            </div>

            {cascadeRunning ? (
              <div className="p-6 flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-700">
                  Đang cập nhật {cascade.detail.affectedRecords} bản ghi...
                </p>
                <p className="text-xs text-gray-500 text-center">
                  Vui lòng không đóng cửa sổ này. Toàn bộ thay đổi nằm trong một giao dịch.
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-800">
                    Đổi tên{' '}
                    <strong className="font-mono">
                      <LabelCell label={cascade.detail.oldLabel} />
                    </strong>{' '}
                    thành{' '}
                    <strong className="font-mono">
                      <LabelCell label={cascade.detail.newLabel} />
                    </strong>{' '}
                    sẽ cập nhật <strong>{cascade.detail.affectedRecords}</strong> bản ghi. Tiếp tục?
                  </p>
                  <p className="text-xs text-gray-500">
                    Các bản ghi đang lưu giá trị cũ sẽ được ghi lại thành giá trị mới. Thao tác này
                    được ghi vào lịch sử thay đổi.
                  </p>
                </div>
                <div className="flex justify-end gap-2 px-4 py-3 border-t">
                  <button
                    onClick={() => setCascade(null)}
                    className="px-3 py-1.5 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleConfirmCascade}
                    className="px-4 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700 text-sm"
                  >
                    Xác nhận cập nhật
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Soft-delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-4 py-3 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Ẩn giá trị này?</h3>
            </div>
            <div className="p-4 text-sm text-gray-700 space-y-2">
              <p>
                Giá trị <strong>{deleteTarget.label}</strong> sẽ được ẩn khỏi các danh sách chọn.
              </p>
              <p className="text-xs text-gray-500">
                Dữ liệu không bị xóa. Bạn có thể hiện lại bất cứ lúc nào bằng ô “Hiện mục đã ẩn”.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 border rounded-md text-sm text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Ẩn giá trị
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked delete (API 400, or pre-checked usage > 0) */}
      {blockedDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="text-sm font-semibold text-gray-900">Không thể xóa</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              <p>{blockedDelete.message}</p>
            </div>
            <div className="flex justify-end px-4 py-3 border-t">
              <button
                onClick={() => setBlockedDelete(null)}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookupManager;
