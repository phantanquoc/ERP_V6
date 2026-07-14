import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Plus, Trash2, X } from 'lucide-react';
import { getFileUrl } from '../config/api';
import FileUpload from './FileUpload';
import Modal from './Modal';
import {
  useCreateRepairRequest,
  useGeneratedRepairRequestCode,
  useUpdateRepairRequest,
} from '../hooks/useRepairRequests';
import { useMachineSystemDetails, useMachineSystems } from '../hooks/useMachineSystemDetails';
import { useFaultRecordTypeahead } from '../hooks/useFaultRecords';
import type { FaultTypeaheadItem } from '../services/faultRecordService';
import {
  CreateRepairRequestRequest,
  RepairRequest,
  RepairRequestItemInput,
} from '../services/repairRequestService';
import type { MachineSystem, MachineSystemDetail } from '../services/machineSystemService';

export type RepairRequestFormMode = 'create' | 'edit' | 'view';
export type ItemDraft = RepairRequestItemInput & {
  id?: string;
  faultRecordSearch?: string;
  machineSystem?: MachineSystem | null;
  machineSystemDetail?: MachineSystemDetail | null;
};

export const PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
export const FAULT_TYPES = ['Lỗi mới', 'Lỗi lặp lại'];
export const MANUAL_ENTRY = '__manual__';

const isManualEntry = (item: ItemDraft) => item.machineSystemId === MANUAL_ENTRY;
const hasSystemPicked = (item: ItemDraft) => !!item.machineSystemId && item.machineSystemId !== MANUAL_ENTRY;

export const emptyItem = (machineSystemId = ''): ItemDraft => ({
  machineSystemId,
  machineSystemDetailId: '',
  faultRecordId: null,
  faultRecordSearch: '',
  tenHeThong: '',
  tinhTrangThietBi: '',
  loaiLoi: '',
  noiDungLoi: '',
});

export const emptyForm = (code = ''): CreateRepairRequestRequest => ({
  ngayThang: new Date().toISOString().split('T')[0],
  maYeuCau: code,
  mucDoUuTien: 'Thấp',
  ghiChu: '',
  items: [emptyItem()],
});

// Per-row typeahead component (hook must live inside a component, not inside .map())
interface FaultRecordTypeaheadCellProps {
  value: string; // faultRecordSearch display text
  faultRecordId: string | null;
  disabled: boolean;
  onSelect: (item: FaultTypeaheadItem | null) => void;
}

const FaultRecordTypeaheadCell = ({ value, faultRecordId, disabled, onSelect }: FaultRecordTypeaheadCellProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);

  // Keep local display text in sync when parent resets (e.g. emptyItem)
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const typeaheadQuery = useFaultRecordTypeahead({
    trangThai: ['DANG_THEO_DOI', 'TAI_PHAT'],
    search: search.trim().length >= 1 ? search.trim() : undefined,
    limit: 10,
  });
  const suggestions: FaultTypeaheadItem[] = typeaheadQuery.data?.data ?? [];

  if (disabled) {
    // View mode: show navigable chip or dash
    if (!faultRecordId && !value) return <span className="text-gray-400">—</span>;
    return (
      <button
        type="button"
        title="Xem lỗi liên quan"
        onClick={() => {
          if (faultRecordId) {
            navigate(`/technical/quality?tab=repairAndFault&faultRecordId=${faultRecordId}`);
          }
        }}
        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Link2 className="h-3 w-3 shrink-0" />
        {value || faultRecordId}
      </button>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        placeholder="Tìm mã/tên lỗi..."
        className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs"
        onChange={(e) => {
          setSearch(e.target.value);
          if (!e.target.value) onSelect(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {faultRecordId && (
        <button
          type="button"
          title="Bỏ liên kết"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-red-500"
          onClick={() => { setSearch(''); onSelect(null); }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg text-xs max-h-48 overflow-y-auto">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-blue-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setSearch(`${item.maLoi} - ${item.tenLoi}`);
                  onSelect(item);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-gray-800">{item.maLoi}</span>
                <span className="ml-1 text-gray-500">{item.tenLoi}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface RepairRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: RepairRequestFormMode;
  record?: RepairRequest | null;
  lockedMachineSystemId?: string | number;
  hideCodeField?: boolean;
  onSaved?: () => void;
}

const RepairRequestFormModal = ({
  isOpen,
  onClose,
  mode,
  record,
  lockedMachineSystemId,
  hideCodeField,
  onSaved,
}: RepairRequestFormModalProps) => {
  const lockedSystemIdStr = lockedMachineSystemId != null ? String(lockedMachineSystemId) : undefined;

  const generatedCode = useGeneratedRepairRequestCode();
  const systemsQuery = useMachineSystems({ page: 1, limit: 200, hoatDong: true, sortBy: 'maHeThong', sortOrder: 'asc' });
  const detailsQuery = useMachineSystemDetails({ page: 1, limit: 400, hoatDong: true, sortBy: 'thuTu', sortOrder: 'asc' });
  const systems = systemsQuery.data?.data ?? [];
  const details = detailsQuery.data?.data ?? [];
  const detailOptions = useMemo(() => details, [details]);

  const createRequest = useCreateRepairRequest();
  const updateRequest = useUpdateRepairRequest();

  const [form, setForm] = useState<CreateRepairRequestRequest>(emptyForm());
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const isView = mode === 'view';

  // Reset form/items whenever the modal is (re)opened for a given record/mode.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSelectedFile(null);
    setForm(record ? {
      ngayThang: record.ngayThang?.split('T')[0] ?? '',
      maYeuCau: record.maYeuCau,
      mucDoUuTien: record.mucDoUuTien,
      ghiChu: record.ghiChu ?? '',
    } : emptyForm(mode === 'create' ? (generatedCode.data ?? '') : ''));
    setItems(record?.items?.length ? record.items.map((item) => ({
      id: item.id,
      machineSystemId: item.machineSystemId ?? (item.tenHeThong ? MANUAL_ENTRY : ''),
      machineSystemDetailId: item.machineSystemDetailId ?? '',
      faultRecordId: item.faultRecordId ?? null,
      faultRecordSearch: item.faultRecord ? `${item.faultRecord.maLoi} - ${item.faultRecord.tenLoi}` : '',
      tenHeThong: item.tenHeThong,
      tinhTrangThietBi: item.tinhTrangThietBi,
      loaiLoi: item.loaiLoi,
      noiDungLoi: item.noiDungLoi,
      machineSystem: item.machineSystem ?? null,
      machineSystemDetail: item.machineSystemDetail ?? null,
    })) : [emptyItem(lockedSystemIdStr)]);
    // generatedCode.data intentionally excluded: only used as the initial value at open time,
    // handled separately below so it doesn't clobber in-progress edits once it resolves late.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, record, lockedSystemIdStr]);

  // If opened in create mode before the generated code query resolves, backfill it once ready.
  useEffect(() => {
    if (!isOpen || mode !== 'create' || record || !generatedCode.data) return;
    setForm((current) => (current.maYeuCau ? current : { ...current, maYeuCau: generatedCode.data ?? '' }));
  }, [isOpen, mode, record, generatedCode.data]);

  const patchItem = (index: number, patch: Partial<ItemDraft>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const selectSystem = (index: number, systemId: string) => {
    if (systemId === MANUAL_ENTRY) {
      patchItem(index, {
        machineSystemId: MANUAL_ENTRY,
        machineSystemDetailId: '',
        tenHeThong: '',
      });
      return;
    }
    const effectiveSystemId = lockedSystemIdStr ?? systemId;
    const system = systems.find((item) => item.id === effectiveSystemId);
    patchItem(index, {
      machineSystemId: effectiveSystemId,
      machineSystemDetailId: '',
      tenHeThong: system ? `${system.maHeThong} - ${system.tenHeThong}` : '',
    });
  };

  const selectDetail = (index: number, detailId: string) => {
    const detail = details.find((item) => item.id === detailId);
    const system = detail?.machineSystem ?? systems.find((item) => item.id === detail?.machineSystemId);
    patchItem(index, {
      machineSystemId: lockedSystemIdStr ?? detail?.machineSystemId ?? '',
      machineSystemDetailId: detailId,
      tenHeThong: detail
        ? `${system?.maHeThong ?? ''} ${system?.tenHeThong ?? ''} / ${detail.maChiTiet} - ${detail.tenChiTiet}`.trim()
        : '',
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const cleanedItems = items.map((item) => {
      const isManual = item.machineSystemId === MANUAL_ENTRY;
      return {
        machineSystemId: isManual ? undefined : (item.machineSystemId || undefined),
        machineSystemDetailId: isManual ? undefined : (item.machineSystemDetailId || undefined),
        faultRecordId: item.faultRecordId || null,
        tenHeThong: item.tenHeThong.trim(),
        tinhTrangThietBi: item.tinhTrangThietBi.trim(),
        loaiLoi: item.loaiLoi,
        noiDungLoi: item.noiDungLoi.trim(),
      };
    }).filter((item) => item.tenHeThong && item.tinhTrangThietBi && item.loaiLoi && item.noiDungLoi);

    if (cleanedItems.length === 0) {
      setError('Vui lòng nhập ít nhất một thiết bị lỗi hợp lệ');
      return;
    }

    const payload: CreateRepairRequestRequest = {
      ...form,
      tenHeThong: cleanedItems[0]?.tenHeThong,
      tinhTrangThietBi: cleanedItems[0]?.tinhTrangThietBi,
      loaiLoi: cleanedItems[0]?.loaiLoi,
      noiDungLoi: cleanedItems[0]?.noiDungLoi,
      items: cleanedItems,
    };

    try {
      if (record) {
        await updateRequest.mutateAsync({ id: record.id, data: payload, file: selectedFile ?? undefined });
      } else {
        await createRequest.mutateAsync({ data: payload, file: selectedFile ?? undefined });
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được yêu cầu sửa chữa');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">{isView ? 'Chi tiết yêu cầu' : record ? 'Sửa yêu cầu' : 'Thêm yêu cầu'}</h3>
          <button title="Đóng" onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={save} className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
          <div className={`grid gap-3 ${hideCodeField ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            <label className="space-y-1">
              <span className="font-medium text-gray-700">Ngày</span>
              <input required type="date" disabled={isView} value={form.ngayThang} onChange={(event) => setForm((value) => ({ ...value, ngayThang: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
            </label>
            {!hideCodeField && (
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Mã yêu cầu</span>
                <input required disabled={isView || !!record} value={form.maYeuCau} onChange={(event) => setForm((value) => ({ ...value, maYeuCau: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
            )}
            <label className="space-y-1">
              <span className="font-medium text-gray-700">Ưu tiên</span>
              <select disabled={isView} value={form.mucDoUuTien} onChange={(event) => setForm((value) => ({ ...value, mucDoUuTien: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            </label>
          </div>

          <div className="rounded-lg border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
              <div className="font-medium text-gray-800">Thiết bị lỗi</div>
              {!isView && <button type="button" onClick={() => setItems((value) => [...value, emptyItem(lockedSystemIdStr)])} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /> Thêm thiết bị</button>}
            </div>
            <div className="space-y-3 p-3">
              {items.map((item, index) => {
                const itemDetails = detailOptions.filter((detail) => !hasSystemPicked(item) || detail.machineSystemId === item.machineSystemId);
                const manual = isManualEntry(item);
                const picked = hasSystemPicked(item);
                const systemDropdownValue = !isView && !picked && !manual ? '' : (item.machineSystemId ?? '');
                return (
                  <div key={item.id ?? index} className="rounded-lg border border-gray-200 bg-gray-50/40 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Thiết bị #{index + 1}</div>
                      {!isView && items.length > 1 && (
                        <button type="button" title="Xóa thiết bị" onClick={() => setItems((value) => value.filter((_, itemIndex) => itemIndex !== index))} className="inline-flex items-center gap-1 rounded p-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" /> Xóa
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {isView ? (
                        <>
                          <div className="space-y-1 md:col-span-2">
                            <span className="text-xs font-medium text-gray-600">Hệ thống</span>
                            <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800">
                              {item.machineSystem
                                ? `${item.machineSystem.maHeThong} - ${item.machineSystem.tenHeThong}`
                                : item.tenHeThong || '—'}
                            </div>
                          </div>
                          {item.machineSystemDetail && (
                            <div className="space-y-1 md:col-span-2">
                              <span className="text-xs font-medium text-gray-600">Chi tiết máy</span>
                              <div className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800">
                                {`${item.machineSystemDetail.maChiTiet} - ${item.machineSystemDetail.tenChiTiet}`}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <label className="space-y-1 md:col-span-2">
                            <span className="text-xs font-medium text-gray-600">Hệ thống</span>
                            <select required disabled={!!lockedSystemIdStr} value={systemDropdownValue} onChange={(event) => selectSystem(index, event.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50">
                              <option value="" disabled>-- Chọn hệ thống --</option>
                              {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
                              <option value={MANUAL_ENTRY}>Không có trong danh sách (nhập tay)</option>
                            </select>
                          </label>
                          {picked && (
                            <label className="space-y-1 md:col-span-2">
                              <span className="text-xs font-medium text-gray-600">Chi tiết máy (tùy chọn)</span>
                              <select value={item.machineSystemDetailId ?? ''} onChange={(event) => selectDetail(index, event.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm">
                                <option value="">Không chọn</option>
                                {itemDetails.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
                              </select>
                            </label>
                          )}
                          {manual && (
                            <label className="space-y-1 md:col-span-2">
                              <span className="text-xs font-medium text-gray-600">Tên thiết bị</span>
                              <input required placeholder="VD: Máy sấy tầng 2 khu B" value={item.tenHeThong} onChange={(event) => patchItem(index, { tenHeThong: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
                            </label>
                          )}
                        </>
                      )}
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-gray-600">Vị trí / khu vực</span>
                        <input required disabled={isView} placeholder="VD: Khu B, tầng 2" value={item.tinhTrangThietBi} onChange={(event) => patchItem(index, { tinhTrangThietBi: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-gray-600">Loại lỗi</span>
                        <select required disabled={isView} value={item.loaiLoi} onChange={(event) => patchItem(index, { loaiLoi: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50">
                          <option value="">Chọn</option>
                          {FAULT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium text-gray-600">Nội dung lỗi</span>
                        <input required disabled={isView} placeholder="Mô tả ngắn gọn triệu chứng lỗi" value={item.noiDungLoi} onChange={(event) => patchItem(index, { noiDungLoi: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm disabled:bg-gray-50" />
                      </label>
                      <label className="space-y-1 md:col-span-2">
                        <span className="text-xs font-medium text-gray-600">Lỗi liên quan (tùy chọn)</span>
                        <FaultRecordTypeaheadCell
                          value={item.faultRecordSearch ?? ''}
                          faultRecordId={item.faultRecordId ?? null}
                          disabled={isView}
                          onSelect={(selected) => patchItem(index, {
                            faultRecordId: selected?.id ?? null,
                            faultRecordSearch: selected ? `${selected.maLoi} - ${selected.tenLoi}` : '',
                          })}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="font-medium text-gray-700">Ghi chú</span>
            <textarea disabled={isView} rows={2} value={form.ghiChu ?? ''} onChange={(event) => setForm((value) => ({ ...value, ghiChu: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
          </label>
          {!isView && <FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] ?? null)} compact existingFileUrl={record?.fileDinhKem ? getFileUrl(record.fileDinhKem) : undefined} existingFileName={record?.fileDinhKem ? 'File hiện tại' : undefined} />}
          {isView && record?.fileDinhKem && <a href={getFileUrl(record.fileDinhKem)} target="_blank" rel="noreferrer" className="inline-flex text-sm text-blue-600 hover:underline">Xem file đính kèm</a>}

          {isView && (
            <div className="rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 px-3 py-2">
                <span className="font-medium text-gray-800">Lịch sử nghiệm thu</span>
              </div>
              {(record?.acceptanceHandovers?.length ?? 0) === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-400">Chưa có nghiệm thu cho yêu cầu này.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {record!.acceptanceHandovers!.map((nt) => (
                    <div key={nt.id} className="px-3 py-3 text-sm">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-medium text-blue-700">{nt.maNghiemThu}</span>
                        <span className="text-xs text-gray-500">{new Date(nt.ngayNghiemThu).toLocaleDateString('vi-VN')}</span>
                      </div>
                      {nt.tenHeThongThietBi && (
                        <div className="text-gray-700 mb-1">
                          <span className="text-xs font-medium text-gray-500">Hệ thống/thiết bị: </span>{nt.tenHeThongThietBi}
                        </div>
                      )}
                      {nt.tinhTrangTruocSuaChua && (
                        <div className="text-gray-700 mb-1">
                          <span className="text-xs font-medium text-gray-500">Trước sửa: </span>{nt.tinhTrangTruocSuaChua}
                        </div>
                      )}
                      {nt.tinhTrangSauSuaChua && (
                        <div className="text-gray-700 mb-1">
                          <span className="text-xs font-medium text-gray-500">Sau sửa: </span>{nt.tinhTrangSauSuaChua}
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        {nt.nguoiBanGiao && <span>Người bàn giao: <span className="text-gray-700">{nt.nguoiBanGiao}</span></span>}
                        {nt.nguoiNhan && <span>Người nhận: <span className="text-gray-700">{nt.nguoiNhan}</span></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2">{isView ? 'Đóng' : 'Hủy'}</button>
            {!isView && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Lưu</button>}
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default RepairRequestFormModal;
