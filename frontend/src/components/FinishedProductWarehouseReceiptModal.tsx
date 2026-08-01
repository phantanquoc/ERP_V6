import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Trash2, PackageCheck } from 'lucide-react';
import Modal from './Modal';
import { FinishedProduct } from '../services/finishedProductService';
import { Warehouse, Lot } from '../services/warehouseService';
import { useWarehouses } from '../hooks/useWarehouses';
import {
  useFinishedProductReceiptRows,
  useConfirmFinishedProductWarehouseReceipt,
  useBulkConfirmFinishedProductReceipt,
} from '../hooks/useFinishedProducts';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const rowSchema = z.object({
  tenSanPham: z.string().min(1, 'Tên sản phẩm không được để trống'),
  soLuongNhap: z.preprocess((v) => (v === '' ? undefined : Number(v)), z.number().positive('Số lượng phải lớn hơn 0')),
  donViTinh: z.string().default('Kg'),
}) as any;

const receiptSchema = z.object({
  warehouseId: z.string().min(1, 'Vui lòng chọn kho nhập'),
  lotId: z.string().min(1, 'Vui lòng chọn lô hàng'),
  rows: z.array(rowSchema).default([]),
}) as any;

type ReceiptFormValues = z.infer<typeof receiptSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinishedProductWarehouseReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Single-product mode: provide a product. Bulk mode: leave null and provide maChienList */
  product: FinishedProduct | null;
  /** Bulk mode: list of maChien values to receipt together */
  maChienList?: string[];
  /** Production day for day-scoping the bulk receipt query */
  productionDay?: string;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FinishedProductWarehouseReceiptModal: React.FC<FinishedProductWarehouseReceiptModalProps> = ({
  isOpen,
  onClose,
  product,
  maChienList = [],
  productionDay,
  onSuccess,
}) => {
  const isBulkMode = maChienList.length > 0;
  const [lots, setLots] = useState<Lot[]>([]);

  // Remote data
  const { data: warehousesRaw, isLoading: warehousesLoading } = useWarehouses();
  const warehouses: Warehouse[] = Array.isArray(warehousesRaw) ? warehousesRaw : ((warehousesRaw as any)?.data ?? []);

  const {
    data: receiptRows,
    isLoading: rowsLoading,
    isError: rowsError,
  } = useFinishedProductReceiptRows(product?.id ?? '');

  const confirmMutation = useConfirmFinishedProductWarehouseReceipt();
  const bulkConfirmMutation = useBulkConfirmFinishedProductReceipt();

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReceiptFormValues>({
    resolver: zodResolver(receiptSchema) as any,
    defaultValues: { warehouseId: '', lotId: '', rows: [] },
  });

  const { fields, remove } = useFieldArray({ control, name: 'rows' });

  const selectedWarehouseId = watch('warehouseId');

  // Pre-fill rows when receiptRows loads
  useEffect(() => {
    if (receiptRows && receiptRows.length > 0) {
      reset({
        warehouseId: '',
        lotId: '',
        rows: receiptRows.map((r) => ({ tenSanPham: r.tenSanPham, soLuongNhap: r.soLuongNhap, donViTinh: 'Kg' })),
      });
    }
  }, [receiptRows, reset]);

  // Update lots when warehouse changes
  useEffect(() => {
    if (!selectedWarehouseId) {
      setLots([]);
      setValue('lotId', '');
      return;
    }
    const warehouse = warehouses.find((w) => w.id === selectedWarehouseId);
    setLots(warehouse?.lots ?? []);
    setValue('lotId', '');
  }, [selectedWarehouseId, warehouses, setValue]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      reset({ warehouseId: '', lotId: '', rows: [] });
      setLots([]);
      confirmMutation.reset();
      bulkConfirmMutation.reset();
    }
  }, [isOpen]);

  const onSubmit = async (values: ReceiptFormValues) => {
    try {
      if (isBulkMode) {
        // Compute thoiGianChien from productionDay for day-scoped query
        const thoiGianChien = productionDay ? `${productionDay}T06:30:00` : undefined;
        await bulkConfirmMutation.mutateAsync({
          maChienList,
          warehouseId: values.warehouseId,
          lotId: values.lotId,
          thoiGianChien,
        });
      } else {
        if (!product) return;
        await confirmMutation.mutateAsync({
          finishedProductId: product.id,
          input: {
            warehouseId: values.warehouseId,
            lotId: values.lotId,
            rows: values.rows,
          },
        });
      }
      onSuccess?.();
      onClose();
    } catch {
      // error displayed via mutation.error
    }
  };

  const isLoading = isBulkMode ? warehousesLoading : (rowsLoading || warehousesLoading);
  const activeMutation = isBulkMode ? bulkConfirmMutation : confirmMutation;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop closeOnBackdrop={false}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 flex flex-col max-h-[calc(100vh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100 shrink-0 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-blue-600" />
              {isBulkMode ? 'Nhập kho toàn bộ' : 'Nhập kho thành phẩm'}
            </h3>
            {isBulkMode ? (
              <p className="text-sm text-gray-600 mt-0.5">
                {maChienList.length} mẻ được chọn:{' '}
                <span className="font-semibold">{maChienList.join(', ')}</span>
              </p>
            ) : product ? (
              <p className="text-sm text-gray-600 mt-0.5">
                Mã chiên: <span className="font-semibold">{product.maChien}</span>
                {' — '}
                <span>{product.tenHangHoa}</span>
              </p>
            ) : null}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

            {/* Loading / error state for rows */}
            {isLoading && (
              <div className="text-center py-6 text-gray-500 text-sm">Đang tải dữ liệu…</div>
            )}
            {rowsError && (
              <div className="text-center py-4 text-red-600 text-sm">
                Không thể tải dữ liệu thành phẩm. Vui lòng thử lại.
              </div>
            )}

            {!isLoading && !rowsError && (
              <>
                {/* Warehouse selector */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kho nhập <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('warehouseId')}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Chọn kho --</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.tenKho}
                        </option>
                      ))}
                    </select>
                    {errors.warehouseId && (
                      <p className="mt-1 text-xs text-red-600">{String(errors.warehouseId.message)}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lô hàng <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('lotId')}
                      disabled={!selectedWarehouseId}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">-- Chọn lô --</option>
                      {lots.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.tenLo}
                        </option>
                      ))}
                    </select>
                    {errors.lotId && (
                      <p className="mt-1 text-xs text-red-600">{String(errors.lotId.message)}</p>
                    )}
                  </div>
                </div>

                {/* Bulk mode: summary info instead of row editor */}
                {isBulkMode ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-md p-4">
                    <p className="text-sm font-medium text-indigo-800 mb-2">
                      Nhập kho {maChienList.length} mẻ chiên
                    </p>
                    <ul className="space-y-1">
                      {maChienList.map((mc) => (
                        <li key={mc} className="text-sm text-indigo-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          {mc}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-indigo-600 mt-3">
                      Hệ thống sẽ tự động tổng hợp khối lượng từng loại thành phẩm của tất cả các máy trong mỗi mẻ.
                    </p>
                  </div>
                ) : (
                  /* Single-product mode: editable rows */
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Danh sách sản phẩm nhập kho
                    </h4>

                    {fields.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-300 rounded-md">
                        Không có loại thành phẩm nào có khối lượng &gt; 0
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {fields.map((field, index) => (
                          <div key={field.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-2">
                            {/* Product name (read-only label) */}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-800 truncate block">
                                {(field as any).tenSanPham}
                              </span>
                              <input type="hidden" {...register(`rows.${index}.tenSanPham`)} />
                            </div>

                            {/* Quantity */}
                            <div className="w-28 shrink-0">
                              <input
                                type="number"
                                step="0.01"
                                {...register(`rows.${index}.soLuongNhap`, { valueAsNumber: true })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Số lượng"
                              />
                              {(errors.rows as any)?.[index]?.soLuongNhap && (
                                <p className="text-xs text-red-600 mt-0.5">
                                  {String((errors.rows as any)?.[index]?.soLuongNhap?.message ?? '')}
                                </p>
                              )}
                            </div>

                            {/* Unit */}
                            <div className="w-16 shrink-0">
                              <input
                                type="text"
                                {...register(`rows.${index}.donViTinh`)}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="Đơn vị"
                              />
                            </div>

                            {/* Remove row */}
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
                              title="Xóa dòng"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.rows && typeof errors.rows.message === 'string' && (
                      <p className="mt-1 text-xs text-red-600">{errors.rows.message}</p>
                    )}
                  </div>
                )}

                {/* Mutation error */}
                {activeMutation.isError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                    {(activeMutation.error as Error)?.message ?? 'Đã xảy ra lỗi khi nhập kho. Vui lòng thử lại.'}
                  </div>
                )}

                {/* Success */}
                {activeMutation.isSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
                    Nhập kho thành công!
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || activeMutation.isPending || isLoading || (!isBulkMode && fields.length === 0)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {(isSubmitting || activeMutation.isPending) ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Đang xử lý…
                </>
              ) : (
                <>
                  <PackageCheck className="w-4 h-4" />
                  {isBulkMode ? `Xác nhận nhập kho (${maChienList.length} mẻ)` : 'Xác nhận nhập kho'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default FinishedProductWarehouseReceiptModal;
