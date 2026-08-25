import React, { useState, useEffect, useCallback } from 'react';
import { Eye, CheckCircle, PackageOpen } from 'lucide-react';
import purchaseRequestService from '../services/purchaseRequestService';
import { labelForPurchaseRequest } from '../utils/purchaseRequestLabel';

interface ReplenishmentListProps {
  onOpenDetail?: (pr: any) => void;
  onOpenSupplyRequest?: (supplyRequestId: string) => void;
}

const ReplenishmentList: React.FC<ReplenishmentListProps> = ({ onOpenDetail, onOpenSupplyRequest }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await purchaseRequestService.getAllPurchaseRequests(1, 10000, undefined, undefined, undefined, {
        sourceType: 'SHORTAGE',
        trangThai: 'Chờ báo giá',
      });
      // fallback: if backend ignores sourceType/trangThai, filter client-side as safety
      const data: any[] = res?.data ?? [];
      const filtered = data.filter(
        (r: any) => r.sourceType === 'SHORTAGE' && r.trangThai === 'Chờ báo giá'
      );
      // Use server total when available
      const serverTotal = res?.pagination?.total;
      const effective = filtered.length > 0 || data.length === 0 ? filtered : data;
      setRows(effective);
      setTotal(typeof serverTotal === 'number' ? serverTotal : effective.length);
      setTotalPages(Math.ceil((typeof serverTotal === 'number' ? serverTotal : effective.length) / 10) || 1);
      void page;
    } catch (e) {
      console.error('Failed to load replenishment list', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const paged = rows.slice((page - 1) * 10, page * 10);

  if (loading) {
    return <div className="text-center py-8 text-sm text-gray-500">Đang tải yêu cầu bổ sung...</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-10">
        <PackageOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Chưa có yêu cầu bổ sung (SHORTAGE · Chờ báo giá)</p>
        <p className="text-xs text-gray-400 mt-1">Các phiếu thiếu hàng sau khi kho cấp một phần sẽ xuất hiện ở đây.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Yêu cầu bổ sung <span className="font-normal text-gray-500">({total})</span>
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          SHORTAGE · Chờ báo giá
        </span>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs text-gray-500 uppercase">
              <th className="px-3 py-2 text-left">Mã</th>
              <th className="px-3 py-2 text-left">Nhãn</th>
              <th className="px-3 py-2 text-left">Ngày</th>
              <th className="px-3 py-2 text-left">Nhân viên</th>
              <th className="px-3 py-2 text-left">Sản phẩm</th>
              <th className="px-3 py-2 text-left">Nguồn</th>
              <th className="px-3 py-2 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.map((r: any) => (
              <tr key={r.id} className="hover:bg-amber-50/60">
                <td className="px-3 py-2 font-medium text-blue-600">{r.maYeuCau}</td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <PackageOpen className="w-3 h-3" />
                    {labelForPurchaseRequest(r)}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">{r.ngayYeuCau ? new Date(r.ngayYeuCau).toLocaleDateString('vi-VN') : '—'}</td>
                <td className="px-3 py-2">{r.tenNhanVien ?? '—'}</td>
                <td className="px-3 py-2 max-w-[220px] truncate" title={(r.items ?? []).map((it: any) => it.tenHangHoa).join(', ')}>
                  {(r.items ?? []).map((it: any) => it.tenHangHoa).join(', ') || '—'}
                </td>
                <td className="px-3 py-2">
                  {r.supplyRequestId ? (
                    <button
                      onClick={() => onOpenSupplyRequest?.(r.supplyRequestId)}
                      className="text-xs text-indigo-600 hover:underline"
                      title={r.supplyRequestId}
                    >
                      {r.supplyRequest?.maYeuCau ?? r.supplyRequestId.slice(0, 8)}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => onOpenDetail?.(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Xem chi tiết">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50 text-sm">
            Trước
          </button>
          <span className="text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50 text-sm">
            Sau
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400">
        <CheckCircle className="w-3 h-3 inline mr-1" />
        Sau khi thu mua báo giá và gửi duyệt, phiếu sẽ chuyển sang “Yêu cầu mua hàng” (Chờ duyệt).
      </p>
    </div>
  );
};

export default ReplenishmentList;
