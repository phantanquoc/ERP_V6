import React, { useEffect, useMemo, useState } from 'react';
import { X, BadgeCheck, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import purchaseRequestService from '../services/purchaseRequestService';

/**
 * Only the fields this modal reads. Typed structurally rather than as the service's
 * `PurchaseRequest` because the purchasing pages carry their own (looser) version of
 * that shape, and the modal must accept either without a cast.
 */
export interface ConfirmPriceTarget {
  id: string;
  maYeuCau: string;
  lyDoChenhLech?: string | null;
  items?: Array<{
    id: string;
    tenHangHoa: string;
    soLuong: number;
    soLuongThucTe?: number | null;
    donViTinh?: string;
    giaDuKien?: number | null;
    giaThucTe?: number | null;
  }> | null;
}

interface ConfirmActualPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequest: ConfirmPriceTarget | null;
  onSuccess?: () => void;
  thenComplete?: boolean;
}

interface PriceRow {
  id: string;
  tenHangHoa: string;
  donViTinh: string;
  soLuong: number;
  soLuongThucTe: string;
  giaDuKien: number | null;
  giaThucTe: string;
}

const money = (n: number) => n.toLocaleString('vi-VN');

const ConfirmActualPriceModal: React.FC<ConfirmActualPriceModalProps> = ({
  isOpen,
  onClose,
  purchaseRequest,
  onSuccess,
  thenComplete = false,
}) => {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [lyDoChenhLech, setLyDoChenhLech] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !purchaseRequest) return;
    setError(null);
    setLyDoChenhLech(purchaseRequest.lyDoChenhLech ?? '');
    setRows(
      (purchaseRequest.items ?? []).map((item) => ({
        id: item.id,
        tenHangHoa: item.tenHangHoa,
        soLuong: Number(item.soLuong ?? 0),
        soLuongThucTe: String(item.soLuongThucTe ?? item.soLuong ?? ''),
        donViTinh: item.donViTinh ?? '',
        giaDuKien: item.giaDuKien ?? null,
        giaThucTe: String(item.giaThucTe ?? item.giaDuKien ?? ''),
      })),
    );
  }, [isOpen, purchaseRequest]);

  const hasQtyDiff = useMemo(() => {
    for (const r of rows) {
      const tt = Number(r.soLuongThucTe);
      if (!Number.isFinite(tt)) continue;
      if (Math.abs(tt - Number(r.soLuong)) > 1e-9) return true;
    }
    return false;
  }, [rows]);

  const totals = useMemo(() => {
    let duKien = 0;
    let thucTe = 0;
    let invalid = false;
    for (const row of rows) {
      duKien += (row.giaDuKien ?? 0) * row.soLuong;
      const price = Number(row.giaThucTe);
      const qty = Number(row.soLuongThucTe);
      if (!Number.isFinite(price) || price <= 0) invalid = true;
      if (!Number.isFinite(qty) || qty <= 0) invalid = true;
      thucTe += (Number.isFinite(price) ? price : 0) * (Number.isFinite(qty) ? qty : 0);
    }
    return { duKien, thucTe, invalid, equal: Math.abs(thucTe - duKien) < 1e-9 };
  }, [rows]);

  if (!isOpen || !purchaseRequest) return null;

  const handleSubmit = async () => {
    setError(null);
    if (totals.invalid) {
      setError('Giá và số lượng thực tế của mỗi dòng phải lớn hơn 0');
      return;
    }
    if (hasQtyDiff && !lyDoChenhLech.trim()) {
      setError('Vui lòng nhập lý do chênh lệch khi số lượng thực tế khác kế hoạch');
      return;
    }
    setSaving(true);
    try {
      await purchaseRequestService.confirmActualPrice(
        purchaseRequest.id,
        rows.map((row) => ({ id: row.id, giaThucTe: Number(row.giaThucTe), soLuongThucTe: Number(row.soLuongThucTe) })),
        hasQtyDiff ? lyDoChenhLech.trim() : null,
      );
      if (thenComplete) {
        await purchaseRequestService.updatePurchaseRequest(purchaseRequest.id, { trangThai: 'Hoàn thành' } as any);
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không xác nhận được giá/số lượng thực tế');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Xác nhận giá thực tế">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()} role="document">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-green-600" />
              Xác nhận giá & số lượng thực tế
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {purchaseRequest.maYeuCau} · hàng đã về, cần chốt số tiền và số lượng thực trả cho từng mặt hàng
              {thenComplete && ' — xác nhận sẽ đóng phiếu (Hoàn thành) và báo kho nhập hàng luôn'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Giá/SL thực tế đang để mặc định bằng kế hoạch — chỉ cần sửa những dòng thay đổi.
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 w-8">STT</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Tên hàng hoá</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">ĐVT</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">SL KH</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-28">SL TT</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Giá KH</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-36">Giá TT</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => {
                  const price = Number(row.giaThucTe);
                  const qty = Number(row.soLuongThucTe);
                  const validPrice = Number.isFinite(price) && price > 0;
                  const validQty = Number.isFinite(qty) && qty > 0;
                  const valid = validPrice && validQty;
                  const differs = (valid && row.giaDuKien !== null && Math.abs(price - row.giaDuKien) > 1e-9) || Math.abs(qty - row.soLuong) > 1e-9;
                  return (
                    <tr key={row.id} className={differs ? 'bg-amber-50/40' : undefined}>
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{row.tenHangHoa}</td>
                      <td className="px-3 py-2 text-gray-600">{row.donViTinh || '—'}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{money(row.soLuong)}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.soLuongThucTe}
                          onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, soLuongThucTe: e.target.value } : r)))}
                          aria-label={`Số lượng thực tế ${row.tenHangHoa}`}
                          className={`w-full px-2 py-1 text-right border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${validQty ? 'border-gray-300' : 'border-red-400 bg-red-50'}`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {row.giaDuKien != null ? `${money(row.giaDuKien)}đ` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={row.giaThucTe}
                          onChange={(e) =>
                            setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, giaThucTe: e.target.value } : r)))
                          }
                          aria-label={`Giá thực tế ${row.tenHangHoa}`}
                          className={`w-full px-2 py-1 text-right border rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${
                            validPrice ? 'border-gray-300' : 'border-red-400 bg-red-50'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">
                        {valid ? `${money(price * qty)}đ` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold border-t border-gray-200">
                  <td colSpan={7} className="px-3 py-2 text-right">
                    Tổng kế hoạch {money(totals.duKien)}đ · Tổng thực tế
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${totals.equal ? '' : totals.thucTe > totals.duKien ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {money(totals.thucTe)}đ
                    {!totals.equal &&
                      (() => {
                        const diff = totals.thucTe - totals.duKien;
                        const sign = diff > 0 ? '+' : '-';
                        const colorClass = diff > 0 ? 'text-red-600' : 'text-green-600';
                        return <span className={`ml-1 font-normal ${colorClass}`}>({sign}{money(Math.abs(diff))}đ)</span>;
                      })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {hasQtyDiff && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lý do chênh lệch <span className="text-red-500">*</span></label>
              <textarea
                value={lyDoChenhLech}
                onChange={(e) => setLyDoChenhLech(e.target.value)}
                rows={2}
                placeholder="Nhập lý do khi số lượng thực tế khác kế hoạch..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

          {!totals.equal &&
            (() => {
              const diff = totals.thucTe - totals.duKien;
              const sign = diff > 0 ? '+' : '-';
              const colorClass = diff > 0 ? 'text-red-600' : 'text-green-600';
              const verb = diff > 0 ? 'tăng' : 'giảm';
              return (
                <p className="text-xs text-gray-500">
                  Tổng thực tế {verb}{' '}
                  <span className={`font-semibold ${colorClass}`}>
                    {sign}
                    {money(Math.abs(diff))}đ
                  </span>{' '}
                  so với kế hoạch — xác nhận sẽ cập nhật giá vốn của các mặt hàng này trong danh mục theo bình quân gia
                  quyền.
                </p>
              );
            })()}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-lg">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100">
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || totals.invalid || rows.length === 0}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <BadgeCheck className="w-4 h-4" />
            {saving ? 'Đang lưu…' : thenComplete ? 'Xác nhận & Đã mua xong' : 'Xác nhận giá thực tế'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmActualPriceModal;
