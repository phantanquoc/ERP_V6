import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
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
  const firstItem = requestItems[0];
  const [handoverItems, setHandoverItems] = useState<HandoverDraft[]>(firstItem ? [emptyHandoverItem(firstItem)] : []);
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

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="font-medium text-gray-700">Snapshot hệ thống/thiết bị</span>
              <textarea value={formData.tenHeThongThietBi} disabled rows={2} className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2" />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-gray-700">Tình trạng trước sửa chữa</span>
              <textarea value={formData.tinhTrangTruocSuaChua} disabled rows={2} className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2" />
            </label>
          </div>

          {requestItems.length > 0 ? (
            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <div className="font-medium text-gray-800">Nghiệm thu theo thiết bị lỗi</div>
                <button type="button" onClick={addItem} disabled={handoverItems.length >= requestItems.length} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs disabled:opacity-40">
                  <Plus className="h-3.5 w-3.5" /> Thêm dòng
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Thiết bị lỗi</th>
                      <th className="px-3 py-2 text-left">Trước sửa</th>
                      <th className="px-3 py-2 text-left">Sau sửa</th>
                      <th className="px-3 py-2 text-left">Ghi chú</th>
                      <th className="px-3 py-2 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {handoverItems.map((item) => (
                      <tr key={item.rowId}>
                        <td className="px-3 py-2">
                          <select value={item.repairRequestItemId} onChange={(event) => selectRepairItem(item.rowId, event.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5">
                            <option value="">Chọn thiết bị lỗi</option>
                            {requestItems.map((repairItem) => (
                              <option key={repairItem.id} value={repairItem.id}>{itemContext(repairItem)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2"><textarea required rows={2} value={item.tinhTrangTruocSuaChua} onChange={(event) => patchItem(item.rowId, { tinhTrangTruocSuaChua: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5" /></td>
                        <td className="px-3 py-2"><textarea required rows={2} value={item.tinhTrangSauSuaChua} onChange={(event) => patchItem(item.rowId, { tinhTrangSauSuaChua: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5" /></td>
                        <td className="px-3 py-2"><input value={item.ghiChu ?? ''} onChange={(event) => patchItem(item.rowId, { ghiChu: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5" /></td>
                        <td className="px-3 py-2 text-right">
                          {handoverItems.length > 1 && <button type="button" title="Xóa dòng" onClick={() => setHandoverItems((items) => items.filter((draft) => draft.rowId !== item.rowId))} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <label className="block space-y-1">
              <span className="font-medium text-gray-700">Tình trạng sau sửa chữa</span>
              <textarea required rows={3} value={formData.tinhTrangSauSuaChua} onChange={(event) => setFormData((current) => ({ ...current, tinhTrangSauSuaChua: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" />
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
