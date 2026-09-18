import React, { useState } from 'react';
import { Eye, CheckCircle, PackageOpen, XCircle } from 'lucide-react';
import { useReplenishmentRequests } from '../hooks/useReplenishmentRequests';
import type { ReplenishmentRequest } from '../services/replenishmentRequestService';

interface ReplenishmentListProps {
  /** Opens the YCBS detail/pricing modal. Content lives in a sibling modal owned by the page. */
  onOpenDetail?: (row: ReplenishmentRequest) => void;
  onOpenSupplyRequest?: (supplyRequestId: string) => void;
  /** @deprecated Luon hien thi tat ca YCBS, dong dang hoat dong (Cho bao gia) to vang. Prop giu lai de tuong thich. */
  showConverted?: boolean;
}

const PAGE_SIZE = 10;

/**
 * The YCBS queue (YC-BS-…).
 *
 * Data comes from `useReplenishmentRequests`, so a convert invalidating the
 * query refreshes this table on its own — previously the queue was a client-side
 * view over `PurchaseRequest {sourceType:'SHORTAGE'}` with its own fetch that no
 * mutation invalidated, so a priced-and-converted row kept showing "Chờ báo giá"
 * until a full reload.
 */
const ReplenishmentList: React.FC<ReplenishmentListProps> = ({
  onOpenDetail,
  onOpenSupplyRequest,
  showConverted = false,
}) => {
  const [page, setPage] = useState(1);
  // Hien thi tat ca YCBS — dong dang hoat dong (Cho bao gia) se to vang o dong
  void showConverted;
  const { data, isFetching, error } = useReplenishmentRequests(
    page,
    PAGE_SIZE,
    undefined,
    undefined,
    undefined,
    undefined,
  );

  if (isFetching) {
    return <div className="text-center py-8 text-sm text-gray-500">Đang tải yêu cầu bổ sung…</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-sm text-red-600">Không tải được danh sách yêu cầu bổ sung.</div>;
  }

  // apiClient returns the JSON body as-is: `{ success, data: rows, pagination }`.
  // So `data.data` is the row array — do NOT unwrap an extra level, or the queue
  // renders empty despite the API returning rows.
  const rows = ((data as { data?: ReplenishmentRequest[] } | undefined)?.data ?? []) as ReplenishmentRequest[];
  const pagination = (data as { pagination?: { total?: number; totalPages?: number } } | undefined)?.pagination ?? {};
  const total = pagination.total ?? rows.length;
  const totalPages = pagination.totalPages ?? (Math.ceil(total / PAGE_SIZE) || 1);

  if (rows.length === 0) {
    return (
      <div className="text-center py-10">
        <PackageOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Chưa có yêu cầu bổ sung nào.</p>
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
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">YC-BS · Tất cả</span>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs text-gray-500 uppercase">
              <th className="px-3 py-2 text-left">Mã</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-left">Ngày</th>
              <th className="px-3 py-2 text-left">Nhân viên</th>
              <th className="px-3 py-2 text-left">Hàng hóa</th>
              <th className="px-3 py-2 text-left">Nguồn</th>
              <th className="px-3 py-2 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const itemNames = (r.items ?? []).map((it) => it.tenGoi).join(', ');
              return (
                <tr
                  key={r.id}
                  onClick={() => onOpenDetail?.(r)}
                  className={`cursor-pointer ${r.trangThai === 'Chờ báo giá' ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-2 font-medium text-blue-600">{r.maYeuCau}</td>
                  <td className="px-3 py-2">
                    {r.trangThai === 'Đã chuyển mua hàng' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle className="w-3 h-3" />
                        Đã chuyển → {r.convertedPurchaseRequest?.maYeuCau ?? 'YCMH'}
                      </span>
                    ) : r.trangThai === 'Đã hủy' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                        <XCircle className="w-3 h-3" />
                        Đã hủy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        <PackageOpen className="w-3 h-3" />
                        Chờ báo giá
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.ngayYeuCau ? new Date(r.ngayYeuCau).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="px-3 py-2">{r.tenNhanVien ?? '—'}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate" title={itemNames}>{itemNames || '—'}</td>
                  <td className="px-3 py-2">
                    {r.supplyRequestId ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenSupplyRequest?.(r.supplyRequestId!); }}
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
                    <button onClick={(e) => { e.stopPropagation(); onOpenDetail?.(r); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Xem / điền giá và chuyển YCMH">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border rounded disabled:opacity-50 text-sm">
            Trước
          </button>
          <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border rounded disabled:opacity-50 text-sm">
            Sau
          </button>
        </div>
      )}
      <p className="text-xs text-gray-400">
        <CheckCircle className="w-3 h-3 inline mr-1" />
        Thu mua điền nhà cung cấp + giá dự kiến trên YCBS, rồi “Chuyển thành YCMH” để đưa sang phê duyệt.
      </p>
    </div>
  );
};

export default ReplenishmentList;
