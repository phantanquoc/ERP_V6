import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { X, ShoppingCart, AlertTriangle, Plus, Ban, ExternalLink } from 'lucide-react';
import Modal from './Modal';
import type { ReplenishmentRequest, ReplenishmentRequestItem } from '../services/replenishmentRequestService';
import replenishmentRequestService from '../services/replenishmentRequestService';
import { useQueryClient } from '@tanstack/react-query';
import { replenishmentRequestKeys } from '../hooks/useReplenishmentRequests';
import { useSupplierOptions } from '../hooks/useSuppliers';
import QuickCreateSupplierModal from './QuickCreateSupplierModal';
import SupplierCombobox from './common/SupplierCombobox';
import CancelWithReasonModal from './common/CancelWithReasonModal';

interface ReplenishmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The YCBS row that was clicked. Refetched inside the modal so stale pricing is not submitted. */
  ybs: ReplenishmentRequest | null;
  onConverted?: (ycbsId: string, ycmhId: string) => void;
  onCancelled?: (ycbsId: string) => void;
  onOpenSupplyRequest?: (supplyRequestId: string) => void;
}

/**
 * Purchasing's workbench for a single YCBS.
 *
 * Warehouse created the YCBS without price or supplier. Purchasing fills those
 * here (`PUT /:id`), then converts it into a real YCMH (`POST /:id/convert`) in
 * one atomic transaction. If every line is quoted, the convert also submits for
 * approval — the YCMH lands at `Chờ duyệt` directly; otherwise it lands at
 * `Chờ báo giá` to finish quoting. Either way the YCBS is `Đã chuyển mua hàng`
 * and leaves the replenishment queue.
 */
const ReplenishmentDetailModal: React.FC<ReplenishmentDetailModalProps> = ({
  isOpen,
  onClose,
  ybs,
  onConverted,
  onCancelled,
  onOpenSupplyRequest,
}) => {
  const queryClient = useQueryClient();
  const [detail, setDetail] = useState<ReplenishmentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rows, setRows] = useState<Array<{ id: string; phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string; nhaCungCapId: string; giaDuKien: string }>>([]);
  // Inline "create supplier" from the NCC dropdown — idx is the row the button
  // was clicked on, so the new supplier lands as that row's nhaCungCapId.
  const [quickCreateRowIdx, setQuickCreateRowIdx] = useState<number | null>(null);

  const {
    data: suppliers,
    isLoading: suppliersLoading,
    isError: suppliersError,
    refetch: refetchSuppliers,
  } = useSupplierOptions();
  const supplierList = (suppliers ?? []) as Array<{ id: string; tenNhaCungCap: string; maNhaCungCap: string }>;

  const fetchIdRef = useRef<string | null>(null);


  useEffect(() => {
    if (!isOpen || !ybs?.id) return;
    // Token check: capture the id this effect ran for. If `ybs.id` changes (or the
    // modal closes) before the request settles, a newer effect has already moved
    // `fetchIdRef.current` — so this response is stale and must not touch state.
    const currentId = ybs.id;
    fetchIdRef.current = currentId;
    setLoading(true);
    replenishmentRequestService
      .getReplenishmentRequestById(currentId)
      .then((res: any) => {
        if (fetchIdRef.current !== currentId) return;
        const row = (res?.data?.data ?? res?.data ?? res) as ReplenishmentRequest;
        setDetail(row);
        setRows(
          (row.items ?? []).map((it: ReplenishmentRequestItem) => ({
            id: it.id,
            phanLoai: it.phanLoai,
            tenGoi: it.tenGoi,
            soLuong: Number(it.soLuong),
            donViTinh: it.donViTinh,
            nhaCungCapId: it.nhaCungCapId ?? '',
            giaDuKien: it.giaDuKien != null ? String(it.giaDuKien) : '',
          })),
        );
      })
      .catch(() => {
        if (fetchIdRef.current !== currentId) return;
        toast.error('Không tải được chi tiết YCBS');
      })
      .finally(() => {
        if (fetchIdRef.current === currentId) setLoading(false);
      });
    // On unmount / id change, invalidate so any in-flight response is ignored.
    return () => {
      if (fetchIdRef.current === currentId) fetchIdRef.current = null;
    };
  }, [isOpen, ybs?.id]);

  const readOnly = detail?.trangThai !== 'Chờ báo giá';

  const liveDetail = useMemo<ReplenishmentRequest | null>(() => {
    if (!detail) return null;
    return {
      ...detail,
      items: rows.map((r) => ({
        id: r.id,
        replenishmentRequestId: detail.id,
        phanLoai: r.phanLoai,
        tenGoi: r.tenGoi,
        soLuong: r.soLuong,
        donViTinh: r.donViTinh,
        nhaCungCapId: r.nhaCungCapId || null,
        giaDuKien: r.giaDuKien ? Number(r.giaDuKien) : null,
        createdAt: '',
        updatedAt: '',
      })) as ReplenishmentRequestItem[],
    };
  }, [detail, rows]);

  // Convert no longer requires full pricing: the YCBS quote is a prefill, and
  // YCMH's own "gửi duyệt" re-enforces NCC+price per line (submitForApproval).
  const missingPricing = useMemo(() => {
    if (!liveDetail) return [];
    return liveDetail.items
      .filter((it) => !it.nhaCungCapId || it.giaDuKien == null || Number(it.giaDuKien) <= 0)
      .map((it) => it.tenGoi);
  }, [liveDetail]);

  const setRowField = (idx: number, patch: Partial<(typeof rows)[number]>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    if (!detail || readOnly) return;
    setSaving(true);
    try {
      const payload = {
        mucDoUuTien: detail.mucDoUuTien,
        ghiChu: detail.ghiChu ?? undefined,
        items: rows.map((r) => ({
          // Server locks phanLoai/tenGoi/soLuong/ĐVT — these values must match exactly.
          phanLoai: r.phanLoai,
          tenGoi: r.tenGoi,
          soLuong: r.soLuong,
          donViTinh: r.donViTinh,
          nhaCungCapId: r.nhaCungCapId || null,
          giaDuKien: r.giaDuKien ? Number(r.giaDuKien) : null,
        })),
      };
      const res: any = await replenishmentRequestService.updateReplenishmentRequest(detail.id, payload as any);
      const updated = (res?.data?.data ?? res?.data) as ReplenishmentRequest;
      if (updated) setDetail(updated);
      toast.success('Đã lưu giá và nhà cung cấp');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!detail) return;
    // Always persist current edits first. The previous code only saved when a
    // JSON.stringify diff matched — but giaDuKien arrives as a number and `rows`
    // holds a string, so e.g. `50000` vs `"50000"` matched and a genuinely-edited
    // NCC/price was silently skipped: convert then built a YCMH from stale rows.
    // Saving unconditionally is one extra idempotent PUT and guarantees the
    // server sees exactly what the purchasing agent left in the table.
    setSaving(true);
    try {
      await replenishmentRequestService.updateReplenishmentRequest(detail.id, {
        items: rows.map((r) => ({
          phanLoai: r.phanLoai, tenGoi: r.tenGoi, soLuong: r.soLuong, donViTinh: r.donViTinh,
          nhaCungCapId: r.nhaCungCapId || null, giaDuKien: r.giaDuKien ? Number(r.giaDuKien) : null,
        })),
      } as any);
    } catch (e: any) {
      setSaving(false);
      toast.error(e?.response?.data?.message ?? 'Lưu trước khi chuyển thất bại');
      return;
    }
    setSaving(false);
    setConverting(true);
    try {
      const res: any = await replenishmentRequestService.convertToPurchaseRequest(detail.id);
      const row = (res?.data?.data ?? res?.data) as ReplenishmentRequest | undefined;
      const ycmh = row?.convertedPurchaseRequest as { id?: string; maYeuCau?: string; trangThai?: string } | undefined;
      const statusNote = ycmh?.trangThai === 'Chờ duyệt' ? ' (đã gửi duyệt)' : '';
      toast.success(`Đã chuyển YCBS ${detail.maYeuCau} thành YCMH ${ycmh?.maYeuCau ?? ''}${statusNote}`);
      // Refresh both queues: the converted YCBS leaves the replenishment list
      // and the new YCMH appears in the purchase-request list. This is what
      // useConvertReplenishmentRequest.onSuccess does — the modal bypasses the
      // hook (direct service call), so it must invalidate manually.
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      onConverted?.(detail.id, ycmh?.id ?? '');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Chuyển thành YCMH thất bại');
    } finally {
      setConverting(false);
    }
  };

  const handleCancel = async (lyDoHuy: string) => {
    if (!detail) return;
    setCancelling(true);
    try {
      const res: any = await replenishmentRequestService.cancelReplenishmentRequest(detail.id, lyDoHuy);
      toast.success(`Đã hủy YCBS ${detail.maYeuCau}`);
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: replenishmentRequestKeys.detail(detail.id) });
      queryClient.invalidateQueries({ queryKey: ['supply-requests'] });
      const supplyRequestId: string | null =
        res?.data?.data?.supplyRequestId ??
        res?.data?.supplyRequestId ??
        detail.supplyRequestId ??
        detail.supplyRequest?.id ??
        null;
      if (supplyRequestId) {
        queryClient.invalidateQueries({ queryKey: ['supply-requests', 'detail', supplyRequestId] });
      }
      onCancelled?.(detail.id);
      setShowCancelModal(false);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Hủy YCBS thất bại');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col modal-viewport-h overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              Yêu cầu bổ sung {detail?.maYeuCau ?? ybs?.maYeuCau ?? ''}
            </h2>
            {detail && (
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <span>
                  Nguồn:{' '}
                  {detail.supplyRequestId ? (
                    <button
                      type="button"
                      onClick={() => onOpenSupplyRequest?.(detail.supplyRequestId!)}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline"
                      title="Xem chi tiết YCCB nguồn"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {detail.supplyRequest?.maYeuCau ?? detail.supplyRequestId ?? '—'}
                    </button>
                  ) : (
                    '—'
                  )}
                  {detail.phanLoaiGroup ? <> · {detail.phanLoaiGroup}</> : null}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" aria-label="Đóng"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">

          {loading ? (
            <div className="text-center py-8 text-sm text-gray-500">Đang tải…</div>
          ) : readOnly && detail ? (
            (() => {
              const cancelled = detail.trangThai === 'Đã hủy';
              const reopened = detail.cancelledYcmh as { maYeuCau: string; lyDoHuy?: string | null; ngayHuy?: string | null } | null | undefined;
              return (
            <div className={`rounded border px-4 py-3 text-sm ${cancelled ? 'border-red-200 bg-red-50 text-red-800' : reopened ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
              YCBS này đã <strong>{detail.trangThai}</strong>
              {detail.convertedPurchaseRequest ? <> — đã chuyển thành <span className="font-mono">{detail.convertedPurchaseRequest.maYeuCau}</span>.</> : '.'}
              {' '}Không thể sửa giá/NCC nữa.
              {cancelled && (
                <div className="mt-1 text-red-900">
                  <span className="font-medium">Lý do hủy:</span> {detail.lyDoHuy || 'Không có lý do (hủy trước khi tính năng này có)'}
                  {detail.nguoiHuy && <span className="text-xs"> · bởi {detail.nguoiHuy}</span>}
                  {detail.ngayHuy && <span className="text-xs"> · {new Date(detail.ngayHuy).toLocaleString('vi-VN')}</span>}
                </div>
              )}
              {!cancelled && reopened && (
                <div className="mt-1 text-blue-900">
                  Đã mở lại vì <span className="font-mono">{reopened.maYeuCau}</span> đã hủy
                  {reopened.lyDoHuy ? <> — lý do: {reopened.lyDoHuy}</> : null}
                  {reopened.ngayHuy ? <span className="text-xs"> · {new Date(reopened.ngayHuy).toLocaleDateString('vi-VN')}</span> : null}
                </div>
              )}
            </div>
              );
            })()
          ) : missingPricing.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Chưa báo giá đủ — thiếu NCC/giá: {missingPricing.join(', ')}. Chuyển ngay thì YCMH ở Chờ báo giá và báo giá tiếp ở đó; điền đủ thì YCMH gửi duyệt luôn.
            </div>
          ) : (
            <div className="rounded border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-800">
              Đã đủ NCC và giá — "Chuyển thành YCMH" sẽ gửi duyệt luôn, không cần qua danh sách YCMH.
            </div>
          )}

          {!loading && (
            <div className="overflow-x-auto border border-gray-200 rounded">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">STT</th>
                    <th className="px-3 py-2 text-left">Phân loại</th>
                    <th className="px-3 py-2 text-left">Tên hàng</th>
                    <th className="px-3 py-2 text-right">Số lượng</th>
                    <th className="px-3 py-2 text-left">ĐVT</th>
                    <th className="px-3 py-2 text-left">Nhà cung cấp</th>
                    <th className="px-3 py-2 text-right">Giá dự kiến</th>
                    <th className="px-3 py-2 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, idx) => {
                    const thanhTien = r.giaDuKien ? Number(r.giaDuKien) * r.soLuong : 0;
                    return (
                      <tr key={r.id || idx}>
                        <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2 text-xs">{r.phanLoai}</td>
                        <td className="px-3 py-2 font-medium">{r.tenGoi}</td>
                        <td className="px-3 py-2 text-right">{r.soLuong}</td>
                        <td className="px-3 py-2">{r.donViTinh}</td>
                        <td className="px-3 py-2 min-w-[180px]">
                          <div className="flex items-center gap-1">
                            <SupplierCombobox
                              suppliers={supplierList}
                              value={r.nhaCungCapId}
                              onChange={(id) => setRowField(idx, { nhaCungCapId: id })}
                              disabled={readOnly}
                              loading={suppliersLoading}
                              error={suppliersError}
                              onRetry={() => refetchSuppliers()}
                              placeholder="— Chọn NCC —"
                              accessory={
                                !readOnly ? (
                                  <button
                                    type="button"
                                    onClick={() => setQuickCreateRowIdx(idx)}
                                    title="Thêm nhà cung cấp mới"
                                    className="p-1 shrink-0 text-green-700 hover:bg-green-50 rounded"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                ) : undefined
                              }
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={r.giaDuKien}
                            onChange={(e) => setRowField(idx, { giaDuKien: e.target.value })}
                            disabled={readOnly}
                            placeholder="0"
                            className="w-28 px-2 py-1 text-sm border border-gray-200 rounded text-right disabled:bg-gray-50"
                          />
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{thanhTien ? thanhTien.toLocaleString('vi-VN') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer — pinned to the modal bottom (outside the scroll body). */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-lg">
            {!readOnly && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={saving || converting || cancelling}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-500 rounded hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                title="Hủy YCBS nhập sai — rời khỏi hàng chờ, không tạo YCMH. YCCB nguồn sẽ quay lại Đang xử lý."
              >
                <Ban className="w-4 h-4" />
                Hủy YCBS
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={() => { onClose(); }} className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50">Đóng</button>
              {!readOnly && (
                <button onClick={handleSave} disabled={saving || converting} className="px-4 py-2 text-sm bg-white border border-amber-300 text-amber-700 rounded hover:bg-amber-50 disabled:opacity-50">
                  {saving ? 'Đang lưu…' : 'Lưu giá & NCC'}
                </button>
              )}
              {!readOnly && (
                <button
                  onClick={handleConvert}
                  disabled={saving || converting}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
                  title="Chuyển thành YCMH (đủ giá/NCC thì gửi duyệt luôn)"
                >
                  {converting ? 'Đang chuyển…' : 'Chuyển thành YCMH'}
                </button>
              )}
            </div>
          </div>
      </div>
    </Modal>
      {quickCreateRowIdx !== null && (
        <QuickCreateSupplierModal
          key={quickCreateRowIdx}
          isOpen
          onClose={() => setQuickCreateRowIdx(null)}
          defaultLoaiCungCap={rows[quickCreateRowIdx]?.phanLoai || undefined}
          onCreated={(s) => setRowField(quickCreateRowIdx, { nhaCungCapId: s.id })}
        />
      )}
      <CancelWithReasonModal
        isOpen={showCancelModal}
        onClose={() => { if (!cancelling) setShowCancelModal(false); }}
        onConfirm={handleCancel}
        loading={cancelling}
        ticketLabel={`YCBS ${detail?.maYeuCau ?? ybs?.maYeuCau ?? ''}`}
        description="Phiếu rời khỏi hàng chờ báo giá và không tạo YCMH."
        details={[
          'Người tạo YCCB nguồn nhận thông báo kèm lý do.',
          'Nếu YCCB không còn YCBS nào đang chờ, nó quay lại "Đang xử lý" để kho tạo yêu cầu bổ sung lại.',
        ]}
      />
    </>
  );
};

export default ReplenishmentDetailModal;
