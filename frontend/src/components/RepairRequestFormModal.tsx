import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Plus, Trash2, Wrench, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFileUrl } from '../config/api';
import FileUpload from './FileUpload';
import { ModalForm, ModalFooter, FormField, inputCls, selectCls, textareaCls } from './ModalForm';
import StatusBadge, { type BadgeTone } from './shared/StatusBadge';
import MachineSystemCombobox from './common/MachineSystemCombobox';
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
  STATUS_LABELS,
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

const PRIORITY_TONE: Record<string, BadgeTone> = {
  'Khẩn cấp': 'red',
  'Cao': 'yellow',
  'Trung bình': 'blue',
  'Thấp': 'gray',
};

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
  const [activeIndex, setActiveIndex] = useState(-1);

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

  useEffect(() => {
    setActiveIndex(-1);
  }, [typeaheadQuery.data]);

  if (disabled) {
    // View mode: show navigable chip or dash
    if (!faultRecordId && !value) return <span className="text-gray-400">—</span>;
    return (
      <button
        type="button"
        title="Xem lỗi liên quan"
        aria-label="Xem lỗi liên quan"
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

  const selectItem = (item: FaultTypeaheadItem) => {
    setSearch(`${item.maLoi} - ${item.tenLoi}`);
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        placeholder="Tìm mã/tên lỗi..."
        className="w-full rounded-lg border border-gray-300 px-2 py-2.5 text-xs min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        onChange={(e) => {
          setSearch(e.target.value);
          if (!e.target.value) onSelect(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) {
            if (e.key === 'Escape') setOpen(false);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
              e.preventDefault();
              selectItem(suggestions[activeIndex]);
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
      />
      {faultRecordId && (
        <button
          type="button"
          title="Bỏ liên kết"
          aria-label="Bỏ liên kết lỗi"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-red-500"
          onClick={() => { setSearch(''); onSelect(null); }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-xl text-xs max-h-56 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left transition-colors ${idx === activeIndex ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(item)}
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
  onEdit?: () => void;
}

const RepairRequestFormModal = ({
  isOpen,
  onClose,
  mode,
  record,
  lockedMachineSystemId,
  hideCodeField,
  onSaved,
  onEdit,
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
  const isSaving = createRequest.isPending || updateRequest.isPending;
  const formRefSubmit = () => (document.getElementById('repair-request-form') as HTMLFormElement)?.requestSubmit();

  const statusEntry = isView && record?.trangThai ? STATUS_LABELS[record.trangThai] : null;

  const modalTitle = isView
    ? 'Chi tiết yêu cầu'
    : record
      ? 'Sửa yêu cầu sửa chữa'
      : 'Thêm yêu cầu sửa chữa';

  const viewFooter = (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onClose}
        aria-label="Đóng"
        title="Đóng"
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px]"
      >
        Đóng
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="Chỉnh sửa"
          title="Chỉnh sửa"
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px]"
        >
          Chỉnh sửa
        </button>
      )}
    </div>
  );

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
      const msg = 'Vui lòng nhập ít nhất một thiết bị lỗi hợp lệ';
      setError(msg);
      toast.error(msg);
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
      toast.success(mode === 'create' ? 'Đã tạo yêu cầu sửa chữa' : 'Đã cập nhật yêu cầu sửa chữa');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không lưu được yêu cầu sửa chữa';
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <ModalForm
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="5xl"
      footer={isView ? viewFooter : <ModalFooter onClose={onClose} onSubmit={() => formRefSubmit()} submitLabel={record ? 'Lưu' : 'Tạo yêu cầu'} isLoading={isSaving} />}
    >
      <form id="repair-request-form" onSubmit={save} className="space-y-4 text-sm">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}

        {/* P1: status + priority badges in read-only view */}
        {isView && (statusEntry || record?.maYeuCau) && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            {record?.maYeuCau && <span className="font-mono text-xs font-medium text-gray-700">{record.maYeuCau}</span>}
            {statusEntry && <StatusBadge label={statusEntry.label} tone={statusEntry.tone as BadgeTone} />}
            <StatusBadge label={form.mucDoUuTien} tone={PRIORITY_TONE[form.mucDoUuTien] ?? 'gray'} />
          </div>
        )}

        <div className={`grid gap-3 ${hideCodeField ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <FormField label="Ngày" required>
            <input required type="date" disabled={isView} value={form.ngayThang} onChange={(event) => setForm((value) => ({ ...value, ngayThang: event.target.value }))} className={`${inputCls()} min-h-[44px] disabled:bg-gray-50`} />
          </FormField>
          {!hideCodeField && (
            <FormField label="Mã yêu cầu" required>
              <input required disabled={isView || !!record} value={form.maYeuCau} onChange={(event) => setForm((value) => ({ ...value, maYeuCau: event.target.value }))} className={`${inputCls()} min-h-[44px] disabled:bg-gray-50`} />
            </FormField>
          )}
          <FormField label="Ưu tiên" required>
            <select disabled={isView} value={form.mucDoUuTien} onChange={(event) => setForm((value) => ({ ...value, mucDoUuTien: event.target.value }))} className={`${selectCls()} min-h-[44px] disabled:bg-gray-50`}>{PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </FormField>
        </div>

        {isView && record?.createdByName && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="text-xs font-medium text-gray-600">Người yêu cầu: </span>
            <span className="text-sm text-gray-900">{record.createdByName}</span>
          </div>
        )}

        <div className="rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2 font-medium text-gray-800"><Wrench className="h-4 w-4" /> Thiết bị lỗi</div>
            {!isView && <button type="button" onClick={() => setItems((value) => [...value, emptyItem(lockedSystemIdStr)])} title="Thêm thiết bị" aria-label="Thêm thiết bị" className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors min-h-[44px]"><Plus className="h-4 w-4" /> Thêm thiết bị</button>}
          </div>
          <div className="space-y-3 p-3">
            {items.map((item, index) => {
              const itemDetails = detailOptions.filter((detail) => !hasSystemPicked(item) || detail.machineSystemId === item.machineSystemId);
              const manual = isManualEntry(item);
              const picked = hasSystemPicked(item);
              const systemDropdownValue = !isView && !picked && !manual ? '' : (item.machineSystemId ?? '');
              return (
                <div key={item.id ?? index} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm shrink-0 mt-1">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="grid gap-3 md:grid-cols-2">
                        {isView ? (
                          <>
                            <div className="space-y-1 md:col-span-2">
                              <span className="text-xs font-medium text-gray-600">Hệ thống</span>
                              <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-800">
                                {item.machineSystem
                                  ? `${item.machineSystem.maHeThong} - ${item.machineSystem.tenHeThong}`
                                  : item.tenHeThong || '—'}
                              </div>
                            </div>
                            {item.machineSystemDetail && (
                              <div className="space-y-1 md:col-span-2">
                                <span className="text-xs font-medium text-gray-600">Chi tiết máy</span>
                                <div className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm text-gray-800">
                                  {`${item.machineSystemDetail.maChiTiet} - ${item.machineSystemDetail.tenChiTiet}`}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="md:col-span-2">
                              <FormField label="Hệ thống" required>
                                <MachineSystemCombobox
                                  systems={systems}
                                  value={systemDropdownValue}
                                  onSelectSystem={(sid) => selectSystem(index, sid)}
                                  disabled={!!lockedSystemIdStr}
                                  required
                                />
                              </FormField>
                            </div>
                            {picked && (
                              <div className="md:col-span-2">
                                <FormField label="Chi tiết máy (tùy chọn)">
                                  <select value={item.machineSystemDetailId ?? ''} onChange={(event) => selectDetail(index, event.target.value)} className={`${selectCls()} min-h-[44px] text-sm`}>
                                    <option value="">Không chọn</option>
                                    {itemDetails.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
                                  </select>
                                </FormField>
                              </div>
                            )}
                            {manual && (
                              <div className="md:col-span-2">
                                <FormField label="Tên thiết bị" required>
                                  <input required placeholder="VD: Máy sấy tầng 2 khu B" value={item.tenHeThong} onChange={(event) => patchItem(index, { tenHeThong: event.target.value })} className={`${inputCls()} min-h-[44px] text-sm`} />
                                </FormField>
                              </div>
                            )}
                          </>
                        )}
                        <FormField label="Vị trí / khu vực" required>
                          <input required disabled={isView} placeholder="VD: Khu B, tầng 2" value={item.tinhTrangThietBi} onChange={(event) => patchItem(index, { tinhTrangThietBi: event.target.value })} className={`${inputCls()} min-h-[44px] text-sm disabled:bg-gray-50`} />
                        </FormField>
                        <FormField label="Loại lỗi" required>
                          <select required disabled={isView} value={item.loaiLoi} onChange={(event) => patchItem(index, { loaiLoi: event.target.value })} className={`${selectCls()} min-h-[44px] text-sm disabled:bg-gray-50`}>
                            <option value="">Chọn</option>
                            {FAULT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </FormField>
                        <div className="md:col-span-2">
                          <FormField label="Nội dung lỗi" required>
                            <input required disabled={isView} placeholder="Mô tả ngắn gọn triệu chứng lỗi" value={item.noiDungLoi} onChange={(event) => patchItem(index, { noiDungLoi: event.target.value })} className={`${inputCls()} min-h-[44px] text-sm disabled:bg-gray-50`} />
                          </FormField>
                        </div>
                        <div className="md:col-span-2">
                          <FormField label="Lỗi liên quan (tùy chọn)">
                            <FaultRecordTypeaheadCell
                              value={item.faultRecordSearch ?? ''}
                              faultRecordId={item.faultRecordId ?? null}
                              disabled={isView}
                              onSelect={(selected) => patchItem(index, {
                                faultRecordId: selected?.id ?? null,
                                faultRecordSearch: selected ? `${selected.maLoi} - ${selected.tenLoi}` : '',
                              })}
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>
                    {!isView && items.length > 1 && (
                      <button
                        type="button"
                        title="Xóa thiết bị"
                        aria-label="Xóa thiết bị"
                        onClick={() => { if (!window.confirm('Xoá thiết bị này? Hành động không thể hoàn tác.')) return; setItems((value) => value.filter((_, itemIndex) => itemIndex !== index)); }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <FormField label="Ghi chú">
          <textarea disabled={isView} rows={2} value={form.ghiChu ?? ''} onChange={(event) => setForm((value) => ({ ...value, ghiChu: event.target.value }))} className={`${textareaCls()} min-h-[44px] disabled:bg-gray-50`} />
        </FormField>
        {!isView && <FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] ?? null)} compact existingFileUrl={record?.fileDinhKem ? getFileUrl(record.fileDinhKem) : undefined} existingFileName={record?.fileDinhKem ? 'File hiện tại' : undefined} />}
        {isView && record?.fileDinhKem && <a href={getFileUrl(record.fileDinhKem)} target="_blank" rel="noreferrer" className="inline-flex text-sm text-blue-600 hover:underline">Xem file đính kèm</a>}

        {isView && (
          <div className="rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
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
      </form>
    </ModalForm>
  );
};

export default RepairRequestFormModal;
