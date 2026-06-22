import { FormEvent, useMemo, useState } from 'react';
import { CheckCircle, Edit, Eye, Plus, Search, Trash2, Wrench, X } from 'lucide-react';
import { getFileUrl } from '../config/api';
import AcceptanceHandoverForm from './AcceptanceHandoverForm';
import FileUpload from './FileUpload';
import Modal from './Modal';
import ResponsiveRowActions from './ResponsiveRowActions';
import {
  useCreateRepairRequest,
  useDeleteRepairRequest,
  useGeneratedRepairRequestCode,
  useRepairRequests,
  useUpdateRepairRequest,
} from '../hooks/useRepairRequests';
import { useMachineSystemDetails, useMachineSystems } from '../hooks/useMachineSystemDetails';
import repairRequestService, {
  CreateRepairRequestRequest,
  RepairRequest,
  RepairRequestItemInput,
} from '../services/repairRequestService';

type ModalMode = 'create' | 'edit' | 'view';
type ItemDraft = RepairRequestItemInput & { id?: string };

const PRIORITIES = ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'];
const STATUSES = ['Chờ xử lý', 'Đang sửa chữa', 'Hoàn thành'];
const FAULT_TYPES = ['Lỗi mới', 'Lỗi lặp lại'];

const emptyItem = (): ItemDraft => ({
  machineSystemId: '',
  machineSystemDetailId: '',
  tenHeThong: '',
  tinhTrangThietBi: '',
  loaiLoi: '',
  noiDungLoi: '',
});

const emptyForm = (code = ''): CreateRepairRequestRequest => ({
  ngayThang: new Date().toISOString().split('T')[0],
  maYeuCau: code,
  mucDoUuTien: 'Thấp',
  ghiChu: '',
  trangThai: 'Chờ xử lý',
  items: [emptyItem()],
});

const priorityBadge = (value: string) => {
  if (value === 'Khẩn cấp') return 'bg-red-100 text-red-700 border-red-200';
  if (value === 'Cao') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (value === 'Trung bình') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const statusBadge = (value: string) => {
  if (value === 'Hoàn thành') return 'bg-green-100 text-green-700 border-green-200';
  if (value === 'Đang sửa chữa') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

const itemLabel = (item: ItemDraft) => {
  const linked = item.machineSystemDetailId ? 'Liên kết' : item.machineSystemId ? 'Hệ thống' : 'Text';
  return `${linked}: ${item.tenHeThong || '—'}`;
};

const RepairRequestList = () => {
  const [filters, setFilters] = useState({ page: 1, limit: 10, search: '', trangThai: '' });
  const requestsQuery = useRepairRequests({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    trangThai: filters.trangThai || undefined,
  });
  const generatedCode = useGeneratedRepairRequestCode();
  const systemsQuery = useMachineSystems({ page: 1, limit: 200, hoatDong: true, sortBy: 'maHeThong', sortOrder: 'asc' });
  const detailsQuery = useMachineSystemDetails({ page: 1, limit: 400, hoatDong: true, sortBy: 'thuTu', sortOrder: 'asc' });

  const createRequest = useCreateRepairRequest();
  const updateRequest = useUpdateRepairRequest();
  const deleteRequest = useDeleteRepairRequest();

  const requests = requestsQuery.data?.data ?? [];
  const pagination = requestsQuery.data?.pagination;
  const systems = systemsQuery.data?.data ?? [];
  const details = detailsQuery.data?.data ?? [];

  const [modal, setModal] = useState<{ mode: ModalMode; record?: RepairRequest } | null>(null);
  const [form, setForm] = useState<CreateRepairRequestRequest>(emptyForm());
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [handoverRequest, setHandoverRequest] = useState<RepairRequest | null>(null);
  const [error, setError] = useState('');

  const detailOptions = useMemo(() => details, [details]);

  const openModal = (mode: ModalMode, record?: RepairRequest) => {
    setError('');
    setSelectedFile(null);
    setModal({ mode, record });
    setForm(record ? {
      ngayThang: record.ngayThang?.split('T')[0] ?? '',
      maYeuCau: record.maYeuCau,
      mucDoUuTien: record.mucDoUuTien,
      ghiChu: record.ghiChu ?? '',
      trangThai: record.trangThai,
    } : emptyForm(generatedCode.data ?? ''));
    setItems(record?.items?.length ? record.items.map((item) => ({
      id: item.id,
      machineSystemId: item.machineSystemId ?? '',
      machineSystemDetailId: item.machineSystemDetailId ?? '',
      tenHeThong: item.tenHeThong,
      tinhTrangThietBi: item.tinhTrangThietBi,
      loaiLoi: item.loaiLoi,
      noiDungLoi: item.noiDungLoi,
    })) : [emptyItem()]);
  };

  const patchItem = (index: number, patch: Partial<ItemDraft>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const selectSystem = (index: number, systemId: string) => {
    const system = systems.find((item) => item.id === systemId);
    patchItem(index, {
      machineSystemId: systemId,
      machineSystemDetailId: '',
      tenHeThong: system ? `${system.maHeThong} - ${system.tenHeThong}` : '',
    });
  };

  const selectDetail = (index: number, detailId: string) => {
    const detail = details.find((item) => item.id === detailId);
    const system = detail?.machineSystem ?? systems.find((item) => item.id === detail?.machineSystemId);
    patchItem(index, {
      machineSystemId: detail?.machineSystemId ?? '',
      machineSystemDetailId: detailId,
      tenHeThong: detail
        ? `${system?.maHeThong ?? ''} ${system?.tenHeThong ?? ''} / ${detail.maChiTiet} - ${detail.tenChiTiet}`.trim()
        : '',
    });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const cleanedItems = items.map((item) => ({
      machineSystemId: item.machineSystemId || undefined,
      machineSystemDetailId: item.machineSystemDetailId || undefined,
      tenHeThong: item.tenHeThong.trim(),
      tinhTrangThietBi: item.tinhTrangThietBi.trim(),
      loaiLoi: item.loaiLoi,
      noiDungLoi: item.noiDungLoi.trim(),
    })).filter((item) => item.tenHeThong && item.tinhTrangThietBi && item.loaiLoi && item.noiDungLoi);

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
      if (modal?.record) {
        await updateRequest.mutateAsync({ id: modal.record.id, data: payload, file: selectedFile ?? undefined });
      } else {
        await createRequest.mutateAsync({ data: payload, file: selectedFile ?? undefined });
      }
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được yêu cầu sửa chữa');
    }
  };

  const remove = async (record: RepairRequest) => {
    if (!confirm(`Xóa yêu cầu ${record.maYeuCau}?`)) return;
    try {
      await deleteRequest.mutateAsync(record.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được yêu cầu');
    }
  };

  const exportExcel = async () => {
    try {
      await repairRequestService.exportExcel({ search: filters.search || undefined });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xuất được Excel');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Yêu cầu sửa chữa</h2>
          <p className="text-xs text-gray-500">Mỗi yêu cầu có thể gồm nhiều thiết bị lỗi, có hoặc không có liên kết máy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportExcel} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Xuất Excel</button>
          <button type="button" onClick={() => openModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Thêm mới</button>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input value={filters.search} onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value, page: 1 }))} placeholder="Tìm yêu cầu" className="w-56 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm" />
          </div>
          <select value={filters.trangThai} onChange={(event) => setFilters((value) => ({ ...value, trangThai: event.target.value, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
              <tr>
                <th className="border-b px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[90px]">Mã yêu cầu</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[80px]">Ngày</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[140px]">Thiết bị lỗi</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[140px]">Bối cảnh</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[80px]">Ưu tiên</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[90px]">Trạng thái</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[50px]">File</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[80px]">Nghiệm thu</th>
                <th className="border-b px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[120px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requestsQuery.isLoading ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Chưa có yêu cầu sửa chữa.</td></tr>
              ) : requests.map((request) => {
                const requestItems = request.items?.length ? request.items : [{
                  id: `${request.id}-legacy`,
                  repairRequestId: request.id,
                  tenHeThong: request.tenHeThong ?? '',
                  tinhTrangThietBi: request.tinhTrangThietBi ?? '',
                  loaiLoi: request.loaiLoi ?? '',
                  noiDungLoi: request.noiDungLoi ?? '',
                }];
                return (
                  <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{request.maYeuCau}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">{formatDate(request.ngayThang)}</td>
                    <td className="px-3 py-2.5 text-gray-900">
                      <div className="space-y-0.5">
                        {requestItems.map((item) => <div key={item.id} className="text-xs leading-tight">{item.tenHeThong || '—'}</div>)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      <div className="space-y-0.5">
                        {requestItems.map((item) => (
                          <div key={item.id} className="text-xs leading-tight">
                            {item.machineSystemDetail ? `${item.machineSystemDetail.maChiTiet} - ${item.machineSystemDetail.tenChiTiet}` : item.machineSystem ? `${item.machineSystem.maHeThong} - ${item.machineSystem.tenHeThong}` : item.tinhTrangThietBi || 'Text'}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge(request.mucDoUuTien)}`}>{request.mucDoUuTien}</span></td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(request.trangThai)}`}>{request.trangThai}</span></td>
                    <td className="px-3 py-2.5">{request.fileDinhKem ? <a href={getFileUrl(request.fileDinhKem)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Xem</a> : '—'}</td>
                    <td className="px-3 py-2.5">
                      {(request.acceptanceHandovers?.length ?? 0) > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {request.acceptanceHandovers!.length} NT
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Chưa có
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 sticky right-0 bg-white z-10">
                      <ResponsiveRowActions
                        actions={[
                          { key: 'view', label: 'Xem yêu cầu', icon: <Eye className="h-4 w-4" />, onClick: () => openModal('view', request), tone: 'primary' },
                          { key: 'edit', label: 'Sửa yêu cầu', icon: <Edit className="h-4 w-4" />, onClick: () => openModal('edit', request), tone: 'success' },
                          { key: 'handover', label: 'Nghiệm thu', icon: <CheckCircle className="h-4 w-4" />, onClick: () => setHandoverRequest(request), tone: 'primary' },
                          { key: 'delete', label: 'Xóa yêu cầu', icon: <Trash2 className="h-4 w-4" />, onClick: () => remove(request), tone: 'danger' },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600">Trang {pagination.page}/{pagination.totalPages} - {pagination.total} dòng</span>
            <div className="flex gap-1">
              <button disabled={filters.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Trước</button>
              <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={!!modal} onClose={() => setModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">{modal?.mode === 'view' ? 'Chi tiết yêu cầu' : modal?.record ? 'Sửa yêu cầu' : 'Thêm yêu cầu'}</h3>
            <button title="Đóng" onClick={() => setModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={save} className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
            <div className="grid gap-3 md:grid-cols-4">
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Ngày</span>
                <input required type="date" disabled={modal?.mode === 'view'} value={form.ngayThang} onChange={(event) => setForm((value) => ({ ...value, ngayThang: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Mã yêu cầu</span>
                <input required disabled={modal?.mode === 'view' || !!modal?.record} value={form.maYeuCau} onChange={(event) => setForm((value) => ({ ...value, maYeuCau: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Ưu tiên</span>
                <select disabled={modal?.mode === 'view'} value={form.mucDoUuTien} onChange={(event) => setForm((value) => ({ ...value, mucDoUuTien: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Trạng thái</span>
                <select disabled={modal?.mode === 'view'} value={form.trangThai} onChange={(event) => setForm((value) => ({ ...value, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
            </div>

            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
                <div className="font-medium text-gray-800">Thiết bị lỗi</div>
                {modal?.mode !== 'view' && <button type="button" onClick={() => setItems((value) => [...value, emptyItem()])} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /> Thêm dòng</button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Hệ thống</th>
                      <th className="px-3 py-2 text-left">Chi tiết máy</th>
                      <th className="px-3 py-2 text-left">Snapshot hệ thống/text</th>
                      <th className="px-3 py-2 text-left">Tình trạng/khu vực</th>
                      <th className="px-3 py-2 text-left">Loại lỗi</th>
                      <th className="px-3 py-2 text-left">Nội dung lỗi</th>
                      {modal?.mode !== 'view' && <th className="px-3 py-2 text-right">Xóa</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item, index) => {
                      const itemDetails = detailOptions.filter((detail) => !item.machineSystemId || detail.machineSystemId === item.machineSystemId);
                      return (
                        <tr key={item.id ?? index}>
                          <td className="px-3 py-2">
                            <select disabled={modal?.mode === 'view'} value={item.machineSystemId ?? ''} onChange={(event) => selectSystem(index, event.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 disabled:bg-gray-50">
                              <option value="">Text-only</option>
                              {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select disabled={modal?.mode === 'view'} value={item.machineSystemDetailId ?? ''} onChange={(event) => selectDetail(index, event.target.value)} className="w-full rounded-md border border-gray-300 px-2 py-1.5 disabled:bg-gray-50">
                              <option value="">Không chọn</option>
                              {itemDetails.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input required disabled={modal?.mode === 'view'} value={item.tenHeThong} onChange={(event) => patchItem(index, { tenHeThong: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 disabled:bg-gray-50" />
                            <div className="mt-1 text-xs text-gray-500">{itemLabel(item)}</div>
                          </td>
                          <td className="px-3 py-2"><input required disabled={modal?.mode === 'view'} value={item.tinhTrangThietBi} onChange={(event) => patchItem(index, { tinhTrangThietBi: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 disabled:bg-gray-50" /></td>
                          <td className="px-3 py-2">
                            <select required disabled={modal?.mode === 'view'} value={item.loaiLoi} onChange={(event) => patchItem(index, { loaiLoi: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 disabled:bg-gray-50">
                              <option value="">Chọn</option>
                              {FAULT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2"><input required disabled={modal?.mode === 'view'} value={item.noiDungLoi} onChange={(event) => patchItem(index, { noiDungLoi: event.target.value })} className="w-full rounded-md border border-gray-300 px-2 py-1.5 disabled:bg-gray-50" /></td>
                          {modal?.mode !== 'view' && (
                            <td className="px-3 py-2 text-right">
                              {items.length > 1 && <button type="button" title="Xóa dòng" onClick={() => setItems((value) => value.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="font-medium text-gray-700">Ghi chú</span>
              <textarea disabled={modal?.mode === 'view'} rows={2} value={form.ghiChu ?? ''} onChange={(event) => setForm((value) => ({ ...value, ghiChu: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
            </label>
            {modal?.mode !== 'view' && <FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] ?? null)} compact existingFileUrl={modal?.record?.fileDinhKem ? getFileUrl(modal.record.fileDinhKem) : undefined} existingFileName={modal?.record?.fileDinhKem ? 'File hiện tại' : undefined} />}
            {modal?.mode === 'view' && modal.record?.fileDinhKem && <a href={getFileUrl(modal.record.fileDinhKem)} target="_blank" rel="noreferrer" className="inline-flex text-sm text-blue-600 hover:underline">Xem file đính kèm</a>}

            {modal?.mode === 'view' && (
              <div className="rounded-lg border border-gray-200">
                <div className="border-b border-gray-200 px-3 py-2">
                  <span className="font-medium text-gray-800">Lịch sử nghiệm thu</span>
                </div>
                {(modal.record?.acceptanceHandovers?.length ?? 0) === 0 ? (
                  <p className="px-3 py-4 text-sm text-gray-400">Chưa có nghiệm thu cho yêu cầu này.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {modal.record!.acceptanceHandovers!.map((nt) => (
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
              <button type="button" onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2">{modal?.mode === 'view' ? 'Đóng' : 'Hủy'}</button>
              {modal?.mode !== 'view' && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Lưu</button>}
            </div>
          </form>
        </div>
      </Modal>

      {handoverRequest && (
        <AcceptanceHandoverForm
          repairRequest={handoverRequest}
          onClose={() => setHandoverRequest(null)}
          onSuccess={() => {
            setHandoverRequest(null);
            requestsQuery.refetch();
          }}
        />
      )}

      {requestsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Không tải được danh sách yêu cầu sửa chữa.
        </div>
      )}
      {requests.length === 0 && !requestsQuery.isLoading && (
        <div className="hidden items-center gap-2 text-sm text-gray-500">
          <Wrench className="h-4 w-4" /> Chưa có dữ liệu.
        </div>
      )}
    </div>
  );
};

export default RepairRequestList;
