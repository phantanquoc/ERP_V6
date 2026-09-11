import React, { useState } from 'react';
import { Eye, CheckCircle, PackageOpen } from 'lucide-react';
import { useReplenishmentRequests } from '../hooks/useReplenishmentRequests';
import type { ReplenishmentRequest } from '../services/replenishmentRequestService';

interface ReplenishmentListProps {
  /** Opens the YCBS detail/pricing modal. Content lives in a sibling modal owned by the page. */
  onOpenDetail?: (row: ReplenishmentRequest) => void;
  onOpenSupplyRequest?: (supplyRequestId: string) => void;
  /**
   * Show converted/cancelled YCBS too. Default false: the queue shows only
   * "Chờ báo giá" — once purchasing converts one it leaves the queue and the
   * resulting YCMH appears in the purchase-request list instead.
   */
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
  const { data, isFetching, error } = useReplenishmentRequests(
    page,
    PAGE_SIZE,
    undefined,
    undefined,
    undefined,
    showConverted ? undefined : { trangThai: 'Chờ báo giá' },
  );

  if (isFetching) {
    return <div className="text-center py-8 text-sm text-gray-500">Đang tải yêu cầu bổ sung…</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-sm text-red-600">Không tải được danh sách yêu cầu bổ sung.</div>;
  }

  // The endpoint answers `{ success, data, pagination }`; apiClient already unwraps
  // one level, so the rows may sit on either `data.data` or `data`.
  const payload = (data as { data?: { data?: ReplenishmentRequest[]; pagination?: { total?: number; totalPages?: number } } } | undefined)?.data
    ?? (data as { data?: ReplenishmentRequest[]; pagination?: { total?: number; totalPages?: number } } | undefined);
  const rows = (payload?.data ?? []) as ReplenishmentRequest[];
  const pagination = payload?.pagination ?? {};
  const total = pagination.total ?? rows.length;
  const totalPages = pagination.totalPages ?? (Math.ceil(total / PAGE_SIZE) || 1);

  if (rows.length === 0) {
    return (
      <div className="text-center py-10">
        <PackageOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">
          {showConverted ? 'Chưa có yêu cầu bổ sung nào.' : 'Chưa có yêu cầu bổ sung (YC-BS · Chờ báo giá)'}
        </p>
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
          YC-BS · {showConverted ? 'Tất cả' : 'Chờ báo giá'}
        </span>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs text-gray-500 uppercase">
              <th className="px-3 py-2 text-left">Mã</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-left">Ngày</th>
              <th className="px-3 py-2 text-left">Nhân viên</th>
              <th className="px-3 py-2 text-left">Sản phẩm</th>
              <th className="px-3 py-2 text-left">Nguồn</th>
              <th className="px-3 py-2 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const itemNames = (r.items ?? []).map((it) => it.tenGoi).join(', ');
              return (
                <tr key={r.id} className="hover:bg-amber-50/60">
                  <td className="px-3 py-2 font-medium text-blue-600">{r.maYeuCau}</td>
                  <td className="px-3 py-2">
                    {r.trangThai === 'Đã chuyển mua hàng' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle className="w-3 h-3" />
                        Đã chuyển → {r.convertedPurchaseRequest?.maYeuCau ?? 'YCMH'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        <PackageOpen className="w-3 h-3" />
                        Yêu cầu bổ sung
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{r.ngayYeuCau ? new Date(r.ngayYeuCau).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="px-3 py-2">{r.tenNhanVien ?? '—'}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate" title={itemNames}>{itemNames || '—'}</td>
                  <td className="px-3 py-2">
                    {r.supplyRequestId ? (
                      <button
                        onClick={() => onOpenSupplyRequest?.(r.supplyRequestId!)}
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
                    <button onClick={() => onOpenDetail?.(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Xem / điền giá và chuyển YCMH">
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
