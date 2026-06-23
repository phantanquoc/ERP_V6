import { FormEvent, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import Modal from './Modal';
import {
  useCreateMachineSystemDetail,
  useMachineSystemDetails,
  useNextDetailCode,
  useUpdateMachineSystemDetail,
} from '../hooks/useMachineSystemDetails';
import type {
  CreateMachineSystemDetailRequest,
  MachineSystem,
  MachineSystemDetail,
  MachineSystemDetailType,
  UpdateMachineSystemDetailRequest,
} from '../services/machineSystemService';

const DETAIL_TYPES: { value: MachineSystemDetailType; label: string }[] = [
  { value: 'THIET_BI', label: 'Thiết bị' },
  { value: 'CUM', label: 'Cụm' },
  { value: 'LINH_KIEN', label: 'Linh kiện' },
  { value: 'DIEM_KIEM_TRA', label: 'Điểm kiểm tra' },
];

const getSystemName = (system: MachineSystem) =>
  `${system.maHeThong} - ${system.tenHeThong}`;

const getDetailPath = (detail: MachineSystemDetail) => {
  const parent = detail.parentDetail ? `${detail.parentDetail.maChiTiet} / ` : '';
  return `${parent}${detail.maChiTiet} - ${detail.tenChiTiet}`;
};

const emptyDetailForm = (machineSystemId = ''): CreateMachineSystemDetailRequest => ({
  machineSystemId,
  parentDetailId: '',
  loaiChiTiet: 'THIET_BI',
  maChiTiet: '',
  tenChiTiet: '',
  viTri: '',
  moTa: '',
  maNguoiPhuTrach: '',
  nguoiPhuTrach: '',
  thuTu: 0,
  hoatDong: true,
  trangThai: 'Đang hoạt động',
});

export interface MachineSystemDetailFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  record?: MachineSystemDetail;
  /** When provided, the system selector is pre-filled and disabled */
  lockedMachineSystemId?: string;
  allSystems: MachineSystem[];
  onClose: () => void;
  onSuccess?: () => void;
}

const MachineSystemDetailFormModal = ({
  isOpen,
  mode,
  record,
  lockedMachineSystemId,
  allSystems,
  onClose,
  onSuccess,
}: MachineSystemDetailFormModalProps) => {
  const [detailForm, setDetailForm] = useState<CreateMachineSystemDetailRequest>(
    emptyDetailForm(lockedMachineSystemId ?? '')
  );
  const [error, setError] = useState('');

  const createDetail = useCreateMachineSystemDetail();
  const updateDetail = useUpdateMachineSystemDetail();

  // Auto-fill mã chi tiết when creating
  const nextDetailCodeQuery = useNextDetailCode(
    mode === 'create' ? detailForm.loaiChiTiet : undefined
  );

  useEffect(() => {
    if (mode === 'create' && nextDetailCodeQuery.data?.data?.code) {
      setDetailForm((form) => ({ ...form, maChiTiet: nextDetailCodeQuery.data!.data!.code }));
    }
  }, [nextDetailCodeQuery.data?.data?.code, mode]);

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (mode === 'edit' || mode === 'view') {
      if (record) {
        setDetailForm({
          machineSystemId: record.machineSystemId,
          parentDetailId: record.parentDetailId ?? '',
          loaiChiTiet: record.loaiChiTiet,
          maChiTiet: record.maChiTiet,
          tenChiTiet: record.tenChiTiet,
          viTri: record.viTri ?? '',
          moTa: record.moTa ?? '',
          maNguoiPhuTrach: record.maNguoiPhuTrach ?? '',
          nguoiPhuTrach: record.nguoiPhuTrach ?? '',
          thuTu: record.thuTu,
          hoatDong: record.hoatDong,
          trangThai: record.trangThai,
        });
      }
    } else {
      // mode === 'create'
      setDetailForm(emptyDetailForm(lockedMachineSystemId ?? ''));
    }
  }, [isOpen, mode, record, lockedMachineSystemId]);

  // Parent candidates query — fetches siblings for the selected machine system
  const parentCandidatesQuery = useMachineSystemDetails({
    page: 1,
    limit: 500,
    machineSystemId: detailForm.machineSystemId || undefined,
    hoatDong: true,
    sortBy: 'thuTu',
    sortOrder: 'asc',
  });

  const parentDetailOptions = useMemo(() => {
    if (!detailForm.machineSystemId) return [];
    const type = detailForm.loaiChiTiet;
    if (type === 'THIET_BI') return [];
    const all = (parentCandidatesQuery.data?.data ?? []).filter(
      (d) => d.id !== record?.id
    );
    if (type === 'CUM') return all.filter((d) => d.loaiChiTiet === 'THIET_BI');
    return all.filter((d) => d.loaiChiTiet === 'THIET_BI' || d.loaiChiTiet === 'CUM');
  }, [parentCandidatesQuery.data?.data, detailForm.machineSystemId, detailForm.loaiChiTiet, record?.id]);

  const saveDetail = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'view') return;
    const payload: UpdateMachineSystemDetailRequest = {
      ...detailForm,
      parentDetailId: detailForm.parentDetailId || null,
      thuTu: Number(detailForm.thuTu) || 0,
    };
    try {
      if (record) {
        await updateDetail.mutateAsync({ id: record.id, data: payload });
      } else {
        await createDetail.mutateAsync({ data: detailForm });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được chi tiết máy');
    }
  };

  const systemSelectorDisabled = mode === 'view' || !!lockedMachineSystemId;
  const isLoading = createDetail.isPending || updateDetail.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">
            {mode === 'view' ? 'Chi tiết máy' : record ? 'Sửa chi tiết máy' : 'Thêm chi tiết máy'}
          </h3>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={saveDetail} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="font-medium text-gray-700">Hệ thống</span>
              <select
                required
                disabled={systemSelectorDisabled}
                value={detailForm.machineSystemId}
                onChange={(event) =>
                  setDetailForm((form) => ({ ...form, machineSystemId: event.target.value, parentDetailId: '' }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              >
                <option value="">Chọn hệ thống</option>
                {allSystems.map((system) => (
                  <option key={system.id} value={system.id}>
                    {getSystemName(system)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-medium text-gray-700">Loại chi tiết</span>
              <select
                required
                disabled={mode === 'view'}
                value={detailForm.loaiChiTiet}
                onChange={(event) =>
                  setDetailForm((form) => ({ ...form, loaiChiTiet: event.target.value as MachineSystemDetailType }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              >
                {DETAIL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-medium text-gray-700">Cấp cha</span>
              <select
                disabled={mode === 'view' || !detailForm.machineSystemId}
                value={detailForm.parentDetailId ?? ''}
                onChange={(event) =>
                  setDetailForm((form) => ({ ...form, parentDetailId: event.target.value || null }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              >
                <option value="">Không có</option>
                {parentDetailOptions.map((detail) => (
                  <option key={detail.id} value={detail.id}>
                    {getDetailPath(detail)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="font-medium text-gray-700">
                Mã chi tiết {mode === 'create' && <span className="text-xs text-gray-400">(tự sinh)</span>}
              </span>
              <input
                required
                disabled={mode === 'view' || mode === 'create'}
                value={mode === 'create' && nextDetailCodeQuery.isLoading ? 'Đang tải...' : detailForm.maChiTiet}
                onChange={(event) => setDetailForm((form) => ({ ...form, maChiTiet: event.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              />
            </label>

            <label className="space-y-1">
              <span className="font-medium text-gray-700">Tên chi tiết</span>
              <input
                required
                disabled={mode === 'view'}
                value={detailForm.tenChiTiet}
                onChange={(event) => setDetailForm((form) => ({ ...form, tenChiTiet: event.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              />
            </label>

            <label className="space-y-1">
              <span className="font-medium text-gray-700">Vị trí</span>
              <input
                disabled={mode === 'view'}
                value={detailForm.viTri ?? ''}
                onChange={(event) => setDetailForm((form) => ({ ...form, viTri: event.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              />
            </label>

            <label className="space-y-1">
              <span className="font-medium text-gray-700">Thứ tự</span>
              <input
                type="number"
                disabled={mode === 'view'}
                value={detailForm.thuTu ?? 0}
                onChange={(event) => setDetailForm((form) => ({ ...form, thuTu: Number(event.target.value) }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              />
            </label>

            <label className="space-y-1">
              <span className="font-medium text-gray-700">Người phụ trách</span>
              <input
                disabled={mode === 'view'}
                value={detailForm.nguoiPhuTrach ?? ''}
                onChange={(event) => setDetailForm((form) => ({ ...form, nguoiPhuTrach: event.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              />
            </label>

            <label className="space-y-1">
              <span className="font-medium text-gray-700">Trạng thái</span>
              <input
                disabled={mode === 'view'}
                value={detailForm.trangThai ?? ''}
                onChange={(event) => setDetailForm((form) => ({ ...form, trangThai: event.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              />
            </label>

            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                disabled={mode === 'view'}
                checked={!!detailForm.hoatDong}
                onChange={(event) => setDetailForm((form) => ({ ...form, hoatDong: event.target.checked }))}
              />
              <span className="font-medium text-gray-700">Đang hoạt động</span>
            </label>

            <label className="space-y-1 md:col-span-2">
              <span className="font-medium text-gray-700">Mô tả</span>
              <textarea
                disabled={mode === 'view'}
                rows={2}
                value={detailForm.moTa ?? ''}
                onChange={(event) => setDetailForm((form) => ({ ...form, moTa: event.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              {mode === 'view' ? 'Đóng' : 'Hủy'}
            </button>
            {mode !== 'view' && (
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isLoading ? 'Đang lưu...' : 'Lưu'}
              </button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default MachineSystemDetailFormModal;
