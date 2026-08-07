import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import Modal from './Modal';
import { useUpdateMachineStatus } from '../hooks/useMachineSystemDetails';
import type { MachineStatus } from '../services/machineSystemService';

const STATUS_OPTIONS: { value: MachineStatus; label: string }[] = [
  { value: 'HOAT_DONG', label: 'Hoạt động' },
  { value: 'BAO_TRI', label: 'Bảo trì' },
  { value: 'NGUNG_HOAT_DONG', label: 'Ngừng hoạt động' },
];

const schema = z.object({
  trangThaiMoi: z.enum(['HOAT_DONG', 'BAO_TRI', 'NGUNG_HOAT_DONG'], {
    message: 'Vui lòng chọn trạng thái',
  }),
  nguyenNhan: z.string().min(1, 'Nguyên nhân là bắt buộc'),
  ghiChu: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface MachineStatusUpdateDialogProps {
  machineSystemId: string | null;
  machineName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const MachineStatusUpdateDialog = ({
  machineSystemId,
  machineName,
  onClose,
  onSuccess,
}: MachineStatusUpdateDialogProps) => {
  const updateStatus = useUpdateMachineStatus();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      trangThaiMoi: 'HOAT_DONG',
      nguyenNhan: '',
      ghiChu: '',
    },
  });

  useEffect(() => {
    if (!machineSystemId) reset();
  }, [machineSystemId, reset]);

  const onSubmit = async (values: FormValues) => {
    if (!machineSystemId) return;
    try {
      await updateStatus.mutateAsync({
        id: machineSystemId,
        data: {
          trangThaiMoi: values.trangThaiMoi,
          nguyenNhan: values.nguyenNhan,
          ghiChu: values.ghiChu || undefined,
        },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      // error handled below
    }
  };

  const isOpen = !!machineSystemId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop>
      <div
        className="flex modal-viewport-h w-full max-w-md flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900">
            Cập nhật trạng thái{machineName ? ` — ${machineName}` : ''}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
          {updateStatus.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              {updateStatus.error instanceof Error ? updateStatus.error.message : 'Không cập nhật được trạng thái'}
            </div>
          )}

          <label className="block space-y-1">
            <span className="font-medium text-gray-700">
              Trạng thái mới <span className="text-red-500">*</span>
            </span>
            <select
              {...register('trangThaiMoi')}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {errors.trangThaiMoi && (
              <p className="text-xs text-red-600">{errors.trangThaiMoi.message}</p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="font-medium text-gray-700">
              Nguyên nhân <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              {...register('nguyenNhan')}
              placeholder="Nhập nguyên nhân thay đổi trạng thái"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.nguyenNhan && (
              <p className="text-xs text-red-600">{errors.nguyenNhan.message}</p>
            )}
          </label>

          <label className="block space-y-1">
            <span className="font-medium text-gray-700">Ghi chú</span>
            <textarea
              {...register('ghiChu')}
              rows={2}
              placeholder="Ghi chú thêm (tuỳ chọn)"
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || updateStatus.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {updateStatus.isPending ? 'Đang lưu...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default MachineStatusUpdateDialog;
