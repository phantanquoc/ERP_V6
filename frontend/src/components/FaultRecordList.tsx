import { FormEvent, useMemo, useState } from 'react';
import { Edit, Eye, Plus, Power, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FileUpload from './FileUpload';
import Modal from './Modal';
import {
  useCreateFaultRecord,
  useCreateFaultRecordFromTemplate,
  useDeleteFaultRecord,
  useFaultRecords,
  useUpdateFaultRecord,
} from '../hooks/useFaultRecords';
import {
  useCreateFaultTemplate,
  useDeactivateFaultTemplate,
  useDeleteFaultTemplate,
  useFaultTemplates,
  useUpdateFaultTemplate,
} from '../hooks/useFaultTemplates';
import { useMachineSystemDetails, useMachineSystems } from '../hooks/useMachineSystemDetails';
import { useMachinesForSystem } from '../hooks/useMachines';
import type { FaultRecord, CreateFaultRecordRequest } from '../services/faultRecordService';
import type { FaultTemplate, CreateFaultTemplateRequest } from '../services/faultTemplateService';
import type { FaultRecordFilters } from '../services/faultRecordService';
import type { FaultTemplateFilters } from '../services/faultTemplateService';

type ViewMode = 'records' | 'templates';
type ModalMode = 'create' | 'edit' | 'view';

const SEVERITIES = ['Nghiêm trọng', 'Trung bình', 'Nhẹ'];
const RECORD_STATUSES = ['Đang theo dõi', 'Đã xử lý', 'Tái phát'];
const TEMPLATE_STATUSES = ['Đang áp dụng', 'Tạm dừng'];

const severityBadge = (value: string) => {
  if (value === 'Nghiêm trọng') return 'bg-red-100 text-red-700 border-red-200';
  if (value === 'Trung bình') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const statusBadge = (value: string) => {
  if (value === 'Đã xử lý' || value === 'Đang áp dụng') return 'bg-green-100 text-green-700 border-green-200';
  if (value === 'Đang theo dõi') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

const emptyRecordForm = (nguoiPhatHien = ''): CreateFaultRecordRequest => ({
  tenLoi: '',
  moTa: '',
  maHeThong: '',
  machineSystemId: '',
  machineSystemDetailId: '',
  machineId: '',
  faultTemplateId: '',
  mucDo: 'Trung bình',
  trangThai: 'Đang theo dõi',
  nguoiPhatHien,
  ngayPhatHien: new Date().toISOString().split('T')[0],
});

const emptyTemplateForm = (): CreateFaultTemplateRequest => ({
  tenMauLoi: '',
  moTa: '',
  mucDo: 'Trung bình',
  machineSystemId: '',
  machineSystemDetailId: '',
  hoatDong: true,
  trangThai: 'Đang áp dụng',
  ghiChu: '',
});

const FaultRecordList = () => {
  const { user } = useAuth();
  const reporter = user ? `${user.lastName} ${user.firstName}`.trim() : '';
  const isTechnical = user?.department === 'technical' ||
    user?.secondaryDepartments?.some(d => d.departmentCode === 'technical');
  const canWrite = user?.role === 'admin' || isTechnical;
  const canDelete = user?.role === 'admin' || isTechnical;

  const [view, setView] = useState<ViewMode>('records');
  const [recordFilters, setRecordFilters] = useState<FaultRecordFilters>({ page: 1, limit: 10, sortBy: 'ngayPhatHien', sortOrder: 'desc' });
  const [templateFilters, setTemplateFilters] = useState<FaultTemplateFilters>({ page: 1, limit: 10, sortBy: 'maMauLoi', sortOrder: 'asc' });

  const recordsQuery = useFaultRecords(recordFilters);
  const templatesQuery = useFaultTemplates(templateFilters);
  const activeTemplatesQuery = useFaultTemplates({ page: 1, limit: 300, activeOnly: true, sortBy: 'tenMauLoi', sortOrder: 'asc' });
  const systemsQuery = useMachineSystems({ page: 1, limit: 200, hoatDong: true, sortBy: 'maHeThong', sortOrder: 'asc' });
  const detailsQuery = useMachineSystemDetails({ page: 1, limit: 300, hoatDong: true, machineSystemId: recordFilters.machineSystemId || templateFilters.machineSystemId });

  const createRecord = useCreateFaultRecord();
  const createRecordFromTemplate = useCreateFaultRecordFromTemplate();
  const updateRecord = useUpdateFaultRecord();
  const deleteRecord = useDeleteFaultRecord();
  const createTemplate = useCreateFaultTemplate();
  const updateTemplate = useUpdateFaultTemplate();
  const deactivateTemplate = useDeactivateFaultTemplate();
  const deleteTemplate = useDeleteFaultTemplate();

  const records = recordsQuery.data?.data ?? [];
  const templates = templatesQuery.data?.data ?? [];
  const activeTemplates = activeTemplatesQuery.data?.data ?? [];
  const systems = systemsQuery.data?.data ?? [];
  const details = detailsQuery.data?.data ?? [];

  const [recordModal, setRecordModal] = useState<{ mode: ModalMode; record?: FaultRecord } | null>(null);
  const [templateModal, setTemplateModal] = useState<{ mode: ModalMode; template?: FaultTemplate } | null>(null);
  const [recordForm, setRecordForm] = useState<CreateFaultRecordRequest>(emptyRecordForm(reporter));
  const [templateForm, setTemplateForm] = useState<CreateFaultTemplateRequest>(emptyTemplateForm());
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const detailOptionsForRecord = useMemo(
    () => details.filter((detail) => !recordForm.machineSystemId || detail.machineSystemId === recordForm.machineSystemId),
    [details, recordForm.machineSystemId]
  );
  const detailOptionsForTemplate = useMemo(
    () => details.filter((detail) => !templateForm.machineSystemId || detail.machineSystemId === templateForm.machineSystemId),
    [details, templateForm.machineSystemId]
  );

  const machinesForRecordQuery = useMachinesForSystem(recordForm.machineSystemId ?? '');
  const machinesForRecord = machinesForRecordQuery.data ?? [];

  const openRecordModal = (mode: ModalMode, record?: FaultRecord) => {
    setError('');
    setSelectedFile(null);
    setRecordModal({ mode, record });
    setRecordForm(record ? {
      tenLoi: record.tenLoi,
      moTa: record.moTa,
      maHeThong: record.maHeThong ?? record.machineSystem?.maHeThong ?? '',
      machineSystemId: record.machineSystemId ?? '',
      machineSystemDetailId: record.machineSystemDetailId ?? '',
      machineId: record.machineId ?? '',
      faultTemplateId: record.faultTemplateId ?? '',
      mucDo: record.mucDo,
      trangThai: record.trangThai,
      nguoiPhatHien: record.nguoiPhatHien,
      ngayPhatHien: record.ngayPhatHien?.split('T')[0] ?? '',
    } : emptyRecordForm(reporter));
  };

  const openTemplateModal = (mode: ModalMode, template?: FaultTemplate) => {
    setError('');
    setSelectedFile(null);
    setTemplateModal({ mode, template });
    setTemplateForm(template ? {
      maMauLoi: template.maMauLoi,
      tenMauLoi: template.tenMauLoi,
      moTa: template.moTa,
      mucDo: template.mucDo,
      machineSystemId: template.machineSystemId,
      machineSystemDetailId: template.machineSystemDetailId,
      hoatDong: template.hoatDong,
      trangThai: template.trangThai,
      ghiChu: template.ghiChu ?? '',
    } : emptyTemplateForm());
  };

  const syncSystemFromDetail = (detailId: string, target: 'record' | 'template') => {
    const detail = details.find((item) => item.id === detailId);
    if (target === 'record') {
      setRecordForm((form) => ({
        ...form,
        machineSystemDetailId: detailId,
        machineSystemId: detail?.machineSystemId ?? form.machineSystemId,
        maHeThong: detail?.machineSystem?.maHeThong ?? form.maHeThong,
      }));
    } else {
      setTemplateForm((form) => ({
        ...form,
        machineSystemDetailId: detailId,
        machineSystemId: detail?.machineSystemId ?? form.machineSystemId,
      }));
    }
  };

  const chooseTemplate = (templateId: string) => {
    const template = activeTemplates.find((item) => item.id === templateId);
    setRecordForm((form) => ({
      ...form,
      faultTemplateId: templateId,
      tenLoi: template?.tenMauLoi ?? form.tenLoi,
      moTa: template?.moTa ?? form.moTa,
      mucDo: template?.mucDo ?? form.mucDo,
      machineSystemId: template?.machineSystemId ?? form.machineSystemId,
      machineSystemDetailId: template?.machineSystemDetailId ?? form.machineSystemDetailId,
      maHeThong: template?.machineSystem?.maHeThong ?? form.maHeThong,
    }));
  };

  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload: CreateFaultRecordRequest = {
        ...recordForm,
        machineSystemId: recordForm.machineSystemId || undefined,
        machineSystemDetailId: recordForm.machineSystemDetailId || undefined,
        machineId: recordForm.machineId || undefined,
        faultTemplateId: recordForm.faultTemplateId || undefined,
        maHeThong: recordForm.maHeThong || undefined,
      };
      if (recordModal?.record) {
        await updateRecord.mutateAsync({ id: recordModal.record.id, data: payload, file: selectedFile ?? undefined });
      } else if (payload.faultTemplateId) {
        await createRecordFromTemplate.mutateAsync({
          data: {
            faultTemplateId: payload.faultTemplateId,
            nguoiPhatHien: payload.nguoiPhatHien,
            ngayPhatHien: payload.ngayPhatHien,
            trangThai: payload.trangThai,
            tenLoi: payload.tenLoi,
            moTa: payload.moTa,
            mucDo: payload.mucDo,
          },
          file: selectedFile ?? undefined,
        });
      } else {
        await createRecord.mutateAsync({ data: payload, file: selectedFile ?? undefined });
      }
      setRecordModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được bản ghi lỗi');
    }
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload: CreateFaultTemplateRequest = {
        ...templateForm,
        machineSystemId: templateForm.machineSystemId || undefined,
      };
      if (templateModal?.template) {
        await updateTemplate.mutateAsync({ id: templateModal.template.id, data: payload, file: selectedFile ?? undefined });
      } else {
        await createTemplate.mutateAsync({ data: payload, file: selectedFile ?? undefined });
      }
      setTemplateModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được mẫu lỗi');
    }
  };

  const pager = (pagination: typeof recordsQuery.data.pagination, page: number, setPage: (page: number) => void) => {
    if (!pagination || pagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
        <span className="text-gray-600">Trang {pagination.page}/{pagination.totalPages} - {pagination.total} dòng</span>
        <div className="flex gap-1">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Trước</button>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Sau</button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Lỗi cơ điện</h2>
          <p className="text-xs text-gray-500">Mẫu lỗi tham chiếu và bản ghi lỗi thực tế theo chi tiết máy.</p>
        </div>
        <div className="flex rounded-lg border border-gray-300 bg-white p-1 text-sm">
          <button onClick={() => setView('records')} className={`rounded-md px-3 py-1.5 ${view === 'records' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>Bản ghi lỗi</button>
          <button onClick={() => setView('templates')} className={`rounded-md px-3 py-1.5 ${view === 'templates' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>Mẫu lỗi</button>
        </div>
      </div>

      {view === 'records' ? (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-gray-600">Tổng: {recordsQuery.data?.pagination?.total ?? 0} bản ghi</div>
              {canWrite && <button onClick={() => openRecordModal('create')} className="inline-flex w-fit items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Thêm bản ghi</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input value={recordFilters.search ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, search: event.target.value, page: 1 }))} placeholder="Tìm lỗi" className="w-52 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm" />
              </div>
              <select value={recordFilters.machineSystemId ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, machineSystemId: event.target.value || undefined, machineSystemDetailId: undefined, page: 1 }))} className="min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả hệ thống</option>
                {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
              </select>
              <select value={recordFilters.machineSystemDetailId ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, machineSystemDetailId: event.target.value || undefined, page: 1 }))} className="min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả chi tiết</option>
                {details.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
              </select>
              <select value={recordFilters.mucDo ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, mucDo: event.target.value || undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả mức độ</option>
                {SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={recordFilters.trangThai ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, trangThai: event.target.value || undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả trạng thái</option>
                {RECORD_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="border-b px-3 py-2 text-left">Mã lỗi</th>
                  <th className="border-b px-3 py-2 text-left">Tên lỗi</th>
                  <th className="border-b px-3 py-2 text-left">Hệ thống</th>
                  <th className="border-b px-3 py-2 text-left">Máy</th>
                  <th className="border-b px-3 py-2 text-left">Chi tiết</th>
                  <th className="border-b px-3 py-2 text-left">Mẫu</th>
                  <th className="border-b px-3 py-2 text-left">Mức độ</th>
                  <th className="border-b px-3 py-2 text-left">Trạng thái</th>
                  <th className="border-b px-3 py-2 text-left">Phát hiện</th>
                  <th className="border-b px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recordsQuery.isLoading ? (
                  <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-500">Đang tải...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-500">Chưa có bản ghi lỗi phù hợp.</td></tr>
                ) : records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-blue-700">{record.maLoi}</td>
                    <td className="px-3 py-2 text-gray-900">{record.tenLoi}</td>
                    <td className="px-3 py-2 text-gray-700">{record.machineSystem ? `${record.machineSystem.maHeThong} - ${record.machineSystem.tenHeThong}` : record.maHeThong ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{record.machine ? `${record.machine.maMay} - ${record.machine.tenMay}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{record.machineSystemDetail ? `${record.machineSystemDetail.maChiTiet} - ${record.machineSystemDetail.tenChiTiet}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{record.faultTemplate?.tenMauLoi ?? '—'}</td>
                    <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${severityBadge(record.mucDo)}`}>{record.mucDo}</span></td>
                    <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadge(record.trangThai)}`}>{record.trangThai}</span></td>
                    <td className="px-3 py-2 text-gray-700">{record.nguoiPhatHien} - {formatDate(record.ngayPhatHien)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button title="Xem" onClick={() => openRecordModal('view', record)} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                        {canWrite && <button title="Sửa" onClick={() => openRecordModal('edit', record)} className="rounded p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600"><Edit className="h-4 w-4" /></button>}
                        {canDelete && <button title="Xóa" onClick={() => deleteRecord.mutate(record.id)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pager(recordsQuery.data?.pagination, recordFilters.page ?? 1, (page) => setRecordFilters((filters) => ({ ...filters, page })))}
        </section>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-gray-600">Tổng: {templatesQuery.data?.pagination?.total ?? 0} mẫu</div>
              {canWrite && <button onClick={() => openTemplateModal('create')} className="inline-flex w-fit items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Thêm mẫu lỗi</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input value={templateFilters.search ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, search: event.target.value, page: 1 }))} placeholder="Tìm mẫu" className="w-52 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm" />
              </div>
              <select value={templateFilters.machineSystemId ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, machineSystemId: event.target.value || undefined, machineSystemDetailId: undefined, page: 1 }))} className="min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả hệ thống</option>
                {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
              </select>
              <select value={templateFilters.machineSystemDetailId ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, machineSystemDetailId: event.target.value || undefined, page: 1 }))} className="min-w-[220px] rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả chi tiết</option>
                {details.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
              </select>
              <select value={templateFilters.mucDo ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, mucDo: event.target.value || undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả mức độ</option>
                {SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={templateFilters.hoatDong === undefined ? '' : String(templateFilters.hoatDong)} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, hoatDong: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả hoạt động</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Dừng</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-600">
                <tr>
                  <th className="border-b px-3 py-2 text-left">Mã mẫu</th>
                  <th className="border-b px-3 py-2 text-left">Tên mẫu</th>
                  <th className="border-b px-3 py-2 text-left">Hệ thống</th>
                  <th className="border-b px-3 py-2 text-left">Chi tiết</th>
                  <th className="border-b px-3 py-2 text-left">Mức độ</th>
                  <th className="border-b px-3 py-2 text-left">Trạng thái</th>
                  <th className="border-b px-3 py-2 text-left">Bản ghi</th>
                  <th className="border-b px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templatesQuery.isLoading ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Đang tải...</td></tr>
                ) : templates.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">Chưa có mẫu lỗi phù hợp.</td></tr>
                ) : templates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-blue-700">{template.maMauLoi}</td>
                    <td className="px-3 py-2 text-gray-900">{template.tenMauLoi}</td>
                    <td className="px-3 py-2 text-gray-700">{template.machineSystem ? `${template.machineSystem.maHeThong} - ${template.machineSystem.tenHeThong}` : '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{template.machineSystemDetail ? `${template.machineSystemDetail.maChiTiet} - ${template.machineSystemDetail.tenChiTiet}` : '—'}</td>
                    <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${severityBadge(template.mucDo)}`}>{template.mucDo}</span></td>
                    <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${statusBadge(template.hoatDong ? template.trangThai : 'Dừng')}`}>{template.hoatDong ? template.trangThai : 'Dừng'}</span></td>
                    <td className="px-3 py-2 text-gray-700">{template._count?.faultRecords ?? 0}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button title="Xem" onClick={() => openTemplateModal('view', template)} className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-blue-600"><Eye className="h-4 w-4" /></button>
                        {canWrite && <button title="Sửa" onClick={() => openTemplateModal('edit', template)} className="rounded p-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600"><Edit className="h-4 w-4" /></button>}
                        {canWrite && template.hoatDong && <button title="Dừng hoạt động" onClick={() => deactivateTemplate.mutate(template.id)} className="rounded p-1.5 text-gray-500 hover:bg-yellow-50 hover:text-yellow-700"><Power className="h-4 w-4" /></button>}
                        {canDelete && <button title="Xóa" onClick={() => deleteTemplate.mutate(template.id)} className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pager(templatesQuery.data?.pagination, templateFilters.page ?? 1, (page) => setTemplateFilters((filters) => ({ ...filters, page })))}
        </section>
      )}

      <Modal isOpen={!!recordModal} onClose={() => setRecordModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">{recordModal?.mode === 'view' ? 'Chi tiết bản ghi lỗi' : recordModal?.record ? 'Sửa bản ghi lỗi' : 'Thêm bản ghi lỗi'}</h3>
            <button title="Đóng" onClick={() => setRecordModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={saveRecord} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Chọn từ mẫu lỗi</span>
                <select disabled={recordModal?.mode === 'view' || !!recordModal?.record} value={recordForm.faultTemplateId ?? ''} onChange={(event) => chooseTemplate(event.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Không dùng mẫu</option>
                  {activeTemplates.map((template) => <option key={template.id} value={template.id}>{template.maMauLoi} - {template.tenMauLoi}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Hệ thống</span>
                <select disabled={recordModal?.mode === 'view'} value={recordForm.machineSystemId ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, machineSystemId: event.target.value, machineSystemDetailId: '', machineId: '', maHeThong: systems.find((system) => system.id === event.target.value)?.maHeThong ?? '' }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Chọn hệ thống</option>
                  {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Chi tiết máy</span>
                <select disabled={recordModal?.mode === 'view'} value={recordForm.machineSystemDetailId ?? ''} onChange={(event) => syncSystemFromDetail(event.target.value, 'record')} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Không chọn</option>
                  {detailOptionsForRecord.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Máy cụ thể</span>
                <select disabled={recordModal?.mode === 'view' || !recordForm.machineSystemId} value={recordForm.machineId ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, machineId: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Không chọn</option>
                  {machinesForRecord.map((m: any) => <option key={m.id} value={m.id}>{m.maMay} - {m.tenMay}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Tên lỗi</span>
                <input required disabled={recordModal?.mode === 'view'} value={recordForm.tenLoi ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, tenLoi: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Người phát hiện</span>
                <input required disabled={recordModal?.mode === 'view'} value={recordForm.nguoiPhatHien} onChange={(event) => setRecordForm((form) => ({ ...form, nguoiPhatHien: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Mức độ</span>
                <select disabled={recordModal?.mode === 'view'} value={recordForm.mucDo ?? 'Trung bình'} onChange={(event) => setRecordForm((form) => ({ ...form, mucDo: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Trạng thái</span>
                <select disabled={recordModal?.mode === 'view'} value={recordForm.trangThai ?? 'Đang theo dõi'} onChange={(event) => setRecordForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{RECORD_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Ngày phát hiện</span>
                <input type="date" disabled={recordModal?.mode === 'view'} value={recordForm.ngayPhatHien ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, ngayPhatHien: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Mô tả</span>
                <textarea required disabled={recordModal?.mode === 'view'} rows={3} value={recordForm.moTa ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              {recordModal?.mode !== 'view' && <div className="md:col-span-2"><FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] ?? null)} compact /></div>}
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" onClick={() => setRecordModal(null)} className="rounded-md border border-gray-300 px-4 py-2">{recordModal?.mode === 'view' ? 'Đóng' : 'Hủy'}</button>
              {recordModal?.mode !== 'view' && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Lưu</button>}
            </div>
          </form>
        </div>
      </Modal>

      <Modal isOpen={!!templateModal} onClose={() => setTemplateModal(null)} showBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">{templateModal?.mode === 'view' ? 'Chi tiết mẫu lỗi' : templateModal?.template ? 'Sửa mẫu lỗi' : 'Thêm mẫu lỗi'}</h3>
            <button title="Đóng" onClick={() => setTemplateModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={saveTemplate} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Hệ thống</span>
                <select disabled={templateModal?.mode === 'view'} value={templateForm.machineSystemId ?? ''} onChange={(event) => setTemplateForm((form) => ({ ...form, machineSystemId: event.target.value, machineSystemDetailId: '' }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Chọn hệ thống</option>
                  {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Chi tiết máy</span>
                <select required disabled={templateModal?.mode === 'view'} value={templateForm.machineSystemDetailId} onChange={(event) => syncSystemFromDetail(event.target.value, 'template')} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Chọn chi tiết</option>
                  {detailOptionsForTemplate.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Tên mẫu lỗi</span>
                <input required disabled={templateModal?.mode === 'view'} value={templateForm.tenMauLoi} onChange={(event) => setTemplateForm((form) => ({ ...form, tenMauLoi: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Mức độ</span>
                <select disabled={templateModal?.mode === 'view'} value={templateForm.mucDo} onChange={(event) => setTemplateForm((form) => ({ ...form, mucDo: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Trạng thái</span>
                <select disabled={templateModal?.mode === 'view'} value={templateForm.trangThai ?? 'Đang áp dụng'} onChange={(event) => setTemplateForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{TEMPLATE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="flex items-center gap-2 pt-6">
                <input type="checkbox" disabled={templateModal?.mode === 'view'} checked={!!templateForm.hoatDong} onChange={(event) => setTemplateForm((form) => ({ ...form, hoatDong: event.target.checked }))} />
                <span className="font-medium text-gray-700">Đang hoạt động</span>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Mô tả</span>
                <textarea required disabled={templateModal?.mode === 'view'} rows={3} value={templateForm.moTa} onChange={(event) => setTemplateForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Ghi chú</span>
                <textarea disabled={templateModal?.mode === 'view'} rows={2} value={templateForm.ghiChu ?? ''} onChange={(event) => setTemplateForm((form) => ({ ...form, ghiChu: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              {templateModal?.mode !== 'view' && <div className="md:col-span-2"><FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] ?? null)} compact /></div>}
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" onClick={() => setTemplateModal(null)} className="rounded-md border border-gray-300 px-4 py-2">{templateModal?.mode === 'view' ? 'Đóng' : 'Hủy'}</button>
              {templateModal?.mode !== 'view' && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Lưu</button>}
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default FaultRecordList;
