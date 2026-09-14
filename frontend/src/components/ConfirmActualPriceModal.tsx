import React, { useEffect, useMemo, useState } from 'react';
import { X, BadgeCheck, AlertTriangle } from 'lucide-react';
import purchaseRequestService from '../services/purchaseRequestService';

/**
 * Only the fields this modal reads. Typed structurally rather than as the service's
 * `PurchaseRequest` because the purchasing pages carry their own (looser) version of
 * that shape, and the modal must accept either without a cast.
 */
export interface ConfirmPriceTarget {
  id: string;
  maYeuCau: string;
  items?: Array<{
    id: string;
    tenHangHoa: string;
    soLuong: number;
    donViTinh?: string;
    giaDuKien?: number | null;
    giaThucTe?: number | null;
  }> | null;
}

interface ConfirmActualPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** YCMH ở trạng thái `Đã duyệt`. */
  purchaseRequest: ConfirmPriceTarget | null;
  onSuccess?: () => void;
}

interface PriceRow {
  id: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  /** Giá dự kiến / kế hoạch — chỉ để đối chiếu, không sửa. */
  giaDuKien: number | null;
  /** Giá thực tế; khởi tạo = giaThucTe đã lưu, nếu chưa có thì = giaDuKien. */
  giaThucTe: string;
}

const money = (n: number) => n.toLocaleString('vi-VN');

/**
 * Purchasing confirms what was actually paid per line once the YCMH is approved and
 * the goods are known.
 *
 * Every row is pre-filled with its estimate, so the common case (price held) is a
 * single click rather than re-keying the table — that is the point of the whole
 * step. Only the actual price is editable: the estimate is the baseline the actual
 * is compared against, and changing it here would destroy the comparison.
 *
 * Confirming does not move the YCMH to `Hoàn thành`; that stays a separate action.
 */
const ConfirmActualPriceModal: React.FC<ConfirmActualPriceModalProps> = ({
  isOpen,
  onClose,
  purchaseRequest,
  onSuccess,
}) => {
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !purchaseRequest) return;
    setError(null);
    setRows(
      (purchaseRequest.items ?? []).map((item) => ({
        id: item.id,
        tenHangHoa: item.tenHangHoa,
        soLuong: Number(item.soLuong ?? 0),
        donViTinh: item.donViTinh ?? '',
        giaDuKien: item.giaDuKien ?? null,
        giaThucTe: String(item.giaThucTe ?? item.giaDuKien ?? ''),
      })),
    );
  }, [isOpen, purchaseRequest]);

  const totals = useMemo(() => {
    let duKien = 0;
    let thucTe = 0;
    let invalid = false;
    for (const row of rows) {
      duKien += (row.giaDuKien ?? 0) * row.soLuong;
      const price = Number(row.giaThucTe);
      if (!Number.isFinite(price) || price <= 0) invalid = true;
      thucTe += (Number.isFinite(price) ? price : 0) * row.soLuong;
    }
    return { duKien, thucTe, invalid, equal: Math.abs(thucTe - duKien) < 1e-9 };
  }, [rows]);

  if (!isOpen || !purchaseRequest) return null;

  const handleSubmit = async () => {
    setError(null);
    if (totals.invalid) {
      setError('Giá thực tế của mỗi dòng phải lớn hơn 0');
      return;
    }
    setSaving(true);
    try {
      await purchaseRequestService.confirmActualPrice(
        purchaseRequest.id,
        rows.map((row) => ({ id: row.id, giaThucTe: Number(row.giaThucTe) })),
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Không xác nhận được giá thực tế');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-green-600" />
              Xác nhận giá thực tế
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {purchaseRequest.maYeuCau} · hàng đã về, cần chốt số tiền thực trả cho từng mặt hàng
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Giá thực tế đang để mặc định bằng giá kế hoạch — chỉ cần sửa những dòng thay đổi so với báo giá.
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600 w-8">STT</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Tên hàng hoá</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Số lượng</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">ĐVT</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Giá kế hoạch</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 w-40">Giá thực tế</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => {
                  const price = Number(row.giaThucTe);
                  const valid = Number.isFinite(price) && price > 0;
                  const differsFromPlan = valid && row.giaDuKien !== null && Math.abs(price - row.giaDuKien) > 1e-9;
                  return (
                    <tr key={row.id} className={differsFromPlan ? 'bg-amber-50/40' : undefined}>
                      <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{row.tenHangHoa}</td>
                      <td className="px-3 py-2 text-right">{money(row.soLuong)}</td>
                      <td className="px-3 py-2 text-gray-600">{row.donViTinh || '—'}</td>
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
                            valid ? 'border-gray-300' : 'border-red-400 bg-red-50'
                          }`}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-800">
                        {valid ? `${money(price * row.soLuong)}đ` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold border-t border-gray-200">
                  <td colSpan={6} className="px-3 py-2 text-right">
                    Tổng kế hoạch {money(totals.duKien)}đ · Tổng thực tế
                  </td>
                  <td className={`px-3 py-2 text-right ${totals.equal ? '' : 'text-amber-700'}`}>
                    {money(totals.thucTe)}đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {!totals.equal && (
            <p className="text-xs text-gray-500">
              Tổng thực tế lệch tổng kế hoạch {money(Math.abs(totals.thucTe - totals.duKien))}đ — xác nhận sẽ cập nhật
              giá vốn của các mặt hàng này trong danh mục theo bình quân gia quyền.
            </p>
          )}
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
            {saving ? 'Đang lưu…' : 'Xác nhận giá thực tế'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActualPriceModal;
