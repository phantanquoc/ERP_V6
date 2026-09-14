import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { X, ShoppingCart, AlertTriangle } from 'lucide-react';
import type { ReplenishmentRequest, ReplenishmentRequestItem } from '../services/replenishmentRequestService';
import replenishmentRequestService from '../services/replenishmentRequestService';
import { useSupplierOptions } from '../hooks/useSuppliers';

interface ReplenishmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The YCBS row that was clicked. Refetched inside the modal so stale pricing is not submitted. */
  ybs: ReplenishmentRequest | null;
  onConverted?: (ycbsId: string, ycmhId: string) => void;
}

/**
 * Purchasing's workbench for a single YCBS.
 *
 * Warehouse created the YCBS without price or supplier. Purchasing fills those
 * here (`PUT /:id`), then converts it into a real YCMH (`POST /:id/convert`) in
 * one atomic transaction. After conversion the YCBS is `Đã chuyển mua hàng` and
 * leaves the replenishment queue — the new YCMH (`Chờ duyệt`) appears in the
 * purchase-request list for approval.
 */
const ReplenishmentDetailModal: React.FC<ReplenishmentDetailModalProps> = ({
  isOpen,
  onClose,
  ybs,
  onConverted,
}) => {
  const [detail, setDetail] = useState<ReplenishmentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [rows, setRows] = useState<Array<{ id: string; phanLoai: string; tenGoi: string; soLuong: number; donViTinh: string; nhaCungCapId: string; giaDuKien: string }>>([]);

  const { data: suppliersData } = useSupplierOptions();
  const suppliers = (suppliersData?.data ?? suppliersData ?? []) as Array<{ id: string; tenNhaCungCap: string; maNhaCungCap: string }>;

  useEffect(() => {
    if (!isOpen || !ybs?.id) return;
    setLoading(true);
    replenishmentRequestService
      .getReplenishmentRequestById(ybs.id)
      .then((res: any) => {
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
      .catch(() => toast.error('Không tải được chi tiết YCBS'))
      .finally(() => setLoading(false));
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
    // Persist any unsaved edits first so convert sees the latest NCC/price
    if (JSON.stringify(rows.map((r) => ({ n: r.nhaCungCapId, g: r.giaDuKien }))) !==
        JSON.stringify((detail.items ?? []).map((it) => ({ n: it.nhaCungCapId ?? '', g: it.giaDuKien != null ? String(it.giaDuKien) : '' })))) {
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
    }
    setConverting(true);
    try {
      const res: any = await replenishmentRequestService.convertToPurchaseRequest(detail.id);
      const row = (res?.data?.data ?? res?.data) as ReplenishmentRequest | undefined;
      const ycmh = row?.convertedPurchaseRequest as { id?: string; maYeuCau?: string } | undefined;
      toast.success(`Đã chuyển YCBS ${detail.maYeuCau} thành YCMH ${ycmh?.maYeuCau ?? ''}`);
      onConverted?.(detail.id, ycmh?.id ?? '');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Chuyển thành YCMH thất bại');
    } finally {
      setConverting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              Yêu cầu bổ sung {detail?.maYeuCau ?? ybs?.maYeuCau ?? ''}
            </h2>
            {detail && <p className="text-xs text-gray-500 mt-1">Nguồn: {detail.supplyRequest?.maYeuCau ?? detail.supplyRequestId ?? '—'} · {detail.phanLoaiGroup ?? ''}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded" aria-label="Đóng"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-500">Đang tải…</div>
          ) : readOnly && detail ? (
            <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              YCBS này đã <strong>{detail.trangThai}</strong>
              {detail.convertedPurchaseRequest ? <> — đã chuyển thành <span className="font-mono">{detail.convertedPurchaseRequest.maYeuCau}</span>.</> : '.'}
              {' '}Không thể sửa giá/NCC nữa.
            </div>
          ) : missingPricing.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Chưa báo giá đủ — thiếu NCC/giá: {missingPricing.join(', ')}. Vẫn có thể chuyển thành YCMH, thu mua sẽ báo giá tiếp ở đó.
            </div>
          ) : null}

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
                          <select
                            value={r.nhaCungCapId}
                            onChange={(e) => setRowField(idx, { nhaCungCapId: e.target.value })}
                            disabled={readOnly}
                            className="w-full px-2 py-1 text-sm border border-gray-200 rounded disabled:bg-gray-50"
                          >
                            <option value="">— Chọn NCC —</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>{s.tenNhaCungCap} ({s.maNhaCungCap})</option>
                            ))}
                          </select>
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50">Đóng</button>
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
                title="Chuyển thành YCMH (báo giá tiếp ở YCMH)"
              >
                {converting ? 'Đang chuyển…' : 'Chuyển thành YCMH'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReplenishmentDetailModal;
