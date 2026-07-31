import { FormEvent, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import FileUpload from './FileUpload';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { useAllEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { useCreateAcceptanceHandover } from '../hooks/useAcceptanceHandovers';
import type { CreateAcceptanceHandoverRequest, AcceptanceHandoverItemInput } from '../services/acceptanceHandoverService';
import type { RepairRequest, RepairRequestItem } from '../services/repairRequestService';

interface AcceptanceHandoverFormProps {
  repairRequest: RepairRequest;
  onClose: () => void;
  onSuccess: () => void;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department: string;
}

type HandoverDraft = AcceptanceHandoverItemInput & { rowId: string };

const itemContext = (item: RepairRequestItem) => {
  const system = item.machineSystem
    ? `${item.machineSystem.maHeThong} - ${item.machineSystem.tenHeThong}`
    : item.tenHeThong;
  const detail = item.machineSystemDetail
    ? ` / ${item.machineSystemDetail.maChiTiet} - ${item.machineSystemDetail.tenChiTiet}`
    : '';
  return `${system}${detail}`;
};

const emptyHandoverItem = (item?: RepairRequestItem): HandoverDraft => ({
  rowId: `${Date.now()}-${Math.random()}`,
  repairRequestItemId: item?.id ?? '',
  tinhTrangTruocSuaChua: item ? `${item.tinhTrangThietBi} - ${item.noiDungLoi}` : '',
  tinhTrangSauSuaChua: '',
  ghiChu: '',
});

const AcceptanceHandoverForm = ({ repairRequest, onClose, onSuccess }: AcceptanceHandoverFormProps) => {
  const { user } = useAuth();
  const createHandover = useCreateAcceptanceHandover();
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { data: employeeData, isLoading: loadingEmployees } = useAllEmployeesForAssignment();
  const employees = (employeeData?.employees ?? []) as Employee[];
  const [selectedDepartment, setSelectedDepartment] = useState('');

  const requestItems = useMemo(() => repairRequest.items?.filter((item) => !!item.id) ?? [], [repairRequest.items]);
  const allowedItemIds = useMemo(() => new Set(requestItems.map((item) => item.id)), [requestItems]);
  // Prefill with EVERY item on the parent so users can see the full coverage picture and only need to fill "sau sửa".
  const [handoverItems, setHandoverItems] = useState<HandoverDraft[]>(
    requestItems.length ? requestItems.map((item) => emptyHandoverItem(item)) : []
  );

  // 9.2 Coverage progress — dedupe by repairRequestItemId so 2 rows on the same item don't inflate the count.
  const totalItems = requestItems.length;
  const distinctCoveredIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of handoverItems) {
      if (item.repairRequestItemId && allowedItemIds.has(item.repairRequestItemId)) set.add(item.repairRequestItemId);
    }
    return set;
  }, [handoverItems, allowedItemIds]);
  const coveredInThisForm = distinctCoveredIds.size;
  const missingItemsCount = Math.max(totalItems - coveredInThisForm, 0);
  const willBeFullCoverage = totalItems > 0 && coveredInThisForm >= totalItems;
  const deviceNames = requestItems.length
    ? requestItems.map(itemContext).join('; ')
    : repairRequest.tenHeThong ?? '';
  const beforeSummary = requestItems.length
    ? requestItems.map((item) => `${itemContext(item)}: ${item.tinhTrangThietBi} - ${item.noiDungLoi}`).join('; ')
    : repairRequest.tinhTrangThietBi ?? repairRequest.noiDungLoi ?? '';
  const giver = user ? `${user.lastName} ${user.firstName}`.trim() || user.username : '';
  const [formData, setFormData] = useState<CreateAcceptanceHandoverRequest>({
    repairRequestId: repairRequest.id,
    maYeuCauSuaChua: repairRequest.maYeuCau,
    tenHeThongThietBi: deviceNames,
    tinhTrangTruocSuaChua: beforeSummary,
    tinhTrangSauSuaChua: '',
    nguoiBanGiao: giver,
    nguoiNhan: '',
    nguoiNhanId: '',
    ghiChu: '',
    items: [],
  });

  const departments = useMemo(
    () => Array.from(new Set(employees.map((employee) => employee.department).filter(Boolean))),
    [employees]
  );

  const filteredEmployees = selectedDepartment
    ? employees.filter((employee) => employee.department === selectedDepartment)
    : employees;

  const patchItem = (rowId: string, patch: Partial<HandoverDraft>) => {
    setHandoverItems((items) => items.map((item) => item.rowId === rowId ? { ...item, ...patch } : item));
  };

  const selectRepairItem = (rowId: string, repairRequestItemId: string) => {
    const repairItem = requestItems.find((item) => item.id === repairRequestItemId);
    patchItem(rowId, {
      repairRequestItemId,
      tinhTrangTruocSuaChua: repairItem ? `${repairItem.tinhTrangThietBi} - ${repairItem.noiDungLoi}` : '',
    });
  };

  const addItem = () => {
    const unused = requestItems.find((item) => !handoverItems.some((draft) => draft.repairRequestItemId === item.id));
    if (unused) setHandoverItems((items) => [...items, emptyHandoverItem(unused)]);
  };

  const fillAllMissingItems = () => {
    setHandoverItems((items) => {
      const covered = new Set(items.map((draft) => draft.repairRequestItemId));
      const missing = requestItems.filter((item) => !covered.has(item.id)).map((item) => emptyHandoverItem(item));
      return missing.length ? [...items, ...missing] : items;
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!formData.nguoiNhanId) {
      setError('Vui lòng chọn người nhận');
      return;
    }

    const itemRows = handoverItems
      .map((item) => ({
        repairRequestItemId: item.repairRequestItemId,
        tinhTrangTruocSuaChua: item.tinhTrangTruocSuaChua.trim(),
        tinhTrangSauSuaChua: item.tinhTrangSauSuaChua.trim(),
        ghiChu: item.ghiChu?.trim(),
      }))
      .filter((item) => item.repairRequestItemId && item.tinhTrangTruocSuaChua && item.tinhTrangSauSuaChua);

    if (requestItems.length > 0 && itemRows.length === 0) {
      setError('Vui lòng nhập ít nhất một dòng nghiệm thu theo thiết bị lỗi');
      return;
    }

    const crossRequestItem = itemRows.find((item) => !allowedItemIds.has(item.repairRequestItemId));
    if (crossRequestItem) {
      setError('Dòng nghiệm thu không thuộc yêu cầu sửa chữa hiện tại');
      return;
    }

    // 9.3 Pre-submit hint when full coverage
    if (willBeFullCoverage) {
      const confirmed = confirm('Số hạng mục nghiệm thu bằng tổng hạng mục yêu cầu. Yêu cầu sửa chữa sẽ được đánh dấu hoàn thành sau khi lưu. Tiếp tục?');
      if (!confirmed) return;
    }

    const payload: CreateAcceptanceHandoverRequest = {
      ...formData,
      tinhTrangSauSuaChua: itemRows.length
        ? itemRows.map((item) => {
          const repairItem = requestItems.find((candidate) => candidate.id === item.repairRequestItemId);
          return `${repairItem ? itemContext(repairItem) : 'Thiết bị'}: ${item.tinhTrangSauSuaChua}`;
        }).join('; ')
        : formData.tinhTrangSauSuaChua,
      items: itemRows,
    };

    if (!payload.tinhTrangSauSuaChua.trim()) {
      setError('Vui lòng nhập tình trạng sau khi sửa chữa');
      return;
    }

    try {
      await createHandover.mutateAsync({ data: payload, file: selectedFile ?? undefined });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo nghiệm thu bàn giao');
    }
  };

  return (
    <Modal isOpen onClose={onClose} showBackdrop>
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nghiệm thu bàn giao</h2>
            <p className="text-xs text-gray-500">Yêu cầu {repairRequest.maYeuCau}</p>
          </div>
          <button title="Đóng" onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}

          {totalItems > 0 && (
            willBeFullCoverage ? (
              <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="text-xs leading-relaxed">
                  <div className="font-medium">Nghiệm thu đủ {totalItems}/{totalItems} hạng mục.</div>
                  <div>Sau khi lưu, yêu cầu sửa chữa sẽ tự động chuyển sang <b>Hoàn thành</b>.</div>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="text-xs leading-relaxed">
                    <div className="font-medium">Còn {missingItemsCount}/{totalItems} hạng mục chưa nghiệm thu.</div>
                    <div>Yêu cầu vẫn ở trạng thái <b>Đang sửa chữa</b> đến khi tất cả hạng mục được nghiệm thu.</div>
                  </div>
                </div>
                {missingItemsCount > 0 && (
                  <button
                    type="button"
                    onClick={fillAllMissingItems}
                    className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Thêm {missingItemsCount} hạng mục còn thiếu
                  </button>
                )}
              </div>
            )
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <label className="space-y-1">
              <span className="font-medium text-gray-700">Mã yêu cầu</span>
              <input value={formData.maYeuCauSuaChua} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2" />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-gray-700">Người bàn giao</span>
              <input value={formData.nguoiBanGiao} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2" />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-gray-700">Phòng ban nhận</span>
              <select value={selectedDepartment} onChange={(event) => setSelectedDepartment(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="">Tất cả phòng ban</option>
                {departments.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-medium text-gray-700">Người nhận</span>
              <select
                required
                value={formData.nguoiNhanId ?? ''}
                onChange={(event) => {
                  const employee = employees.find((item) => item._id === event.target.value);
                  setFormData((current) => ({
                    ...current,
                    nguoiNhanId: event.target.value,
                    nguoiNhan: employee ? `${employee.lastName} ${employee.firstName}`.trim() : '',
                  }));
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">{loadingEmployees ? 'Đang tải...' : 'Chọn người nhận'}</option>
                {filteredEmployees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.lastName} {employee.firstName} ({employee.employeeCode})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {requestItems.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">Nghiệm thu theo thiết bị lỗi</span>
                  {totalItems > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${coveredInThisForm >= totalItems ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {coveredInThisForm}/{totalItems} hạng mục
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={handoverItems.length >= requestItems.length}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm hạng mục
                </button>
              </div>

              <div className="space-y-3">
                {handoverItems.map((item, index) => {
                  const repairItem = requestItems.find((candidate) => candidate.id === item.repairRequestItemId);
                  return (
                    <div key={item.rowId} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                      <div className="flex items-start justify-between gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {index + 1}
                          </span>
                          <select
                            value={item.repairRequestItemId}
                            onChange={(event) => selectRepairItem(item.rowId, event.target.value)}
                            className="min-w-0 flex-1 truncate rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800"
                          >
                            <option value="">Chọn thiết bị lỗi</option>
                            {requestItems.map((option) => (
                              <option key={option.id} value={option.id}>{itemContext(option)}</option>
                            ))}
                          </select>
                        </div>
                        {handoverItems.length > 1 && (
                          <button
                            type="button"
                            title="Xóa hạng mục"
                            onClick={() => setHandoverItems((items) => items.filter((draft) => draft.rowId !== item.rowId))}
                            className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 p-4 md:grid-cols-2">
                        <label className="space-y-1.5">
                          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            <span className="inline-block h-2 w-2 rounded-full bg-red-400"></span>
                            Trước sửa chữa
                          </span>
                          <textarea
                            required
                            rows={4}
                            value={item.tinhTrangTruocSuaChua}
                            onChange={(event) => patchItem(item.rowId, { tinhTrangTruocSuaChua: event.target.value })}
                            placeholder={repairItem ? `Ví dụ: ${repairItem.tinhTrangThietBi} - ${repairItem.noiDungLoi}` : 'Mô tả tình trạng trước khi sửa chữa'}
                            className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                        <label className="space-y-1.5">
                          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
                            <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                            Sau sửa chữa
                          </span>
                          <textarea
                            required
                            rows={4}
                            value={item.tinhTrangSauSuaChua}
                            onChange={(event) => patchItem(item.rowId, { tinhTrangSauSuaChua: event.target.value })}
                            placeholder="Mô tả kết quả sau khi hoàn tất sửa chữa"
                            className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                        <label className="space-y-1.5 md:col-span-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Ghi chú hạng mục</span>
                          <input
                            value={item.ghiChu ?? ''}
                            onChange={(event) => patchItem(item.rowId, { ghiChu: event.target.value })}
                            placeholder="Tùy chọn - vật tư thay thế, thời gian sửa, người thực hiện..."
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <label className="block space-y-1">
              <span className="font-medium text-gray-700">Tình trạng sau sửa chữa</span>
              <textarea
                required
                rows={5}
                value={formData.tinhTrangSauSuaChua}
                onChange={(event) => setFormData((current) => ({ ...current, tinhTrangSauSuaChua: event.target.value }))}
                className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm leading-relaxed"
              />
            </label>
          )}

          <label className="block space-y-1">
            <span className="font-medium text-gray-700">Ghi chú</span>
            <textarea rows={2} value={formData.ghiChu ?? ''} onChange={(event) => setFormData((current) => ({ ...current, ghiChu: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>

          <FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] ?? null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar" compact />

          <div className="flex justify-end gap-2 border-t pt-3">
            <button type="button" onClick={onClose} disabled={createHandover.isPending} className="rounded-md border border-gray-300 px-4 py-2 text-gray-700">Hủy</button>
            <button type="submit" disabled={createHandover.isPending} className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white disabled:bg-gray-400">
              {createHandover.isPending ? 'Đang xử lý...' : 'Tạo nghiệm thu'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AcceptanceHandoverForm;
