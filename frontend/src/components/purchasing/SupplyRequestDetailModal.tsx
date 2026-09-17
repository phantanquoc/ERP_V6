import { useEffect, useState } from 'react';
import { X, ClipboardList } from 'lucide-react';
import Modal from '../Modal';
import supplyRequestService, { SupplyRequest } from '../../services/supplyRequestService';

interface Props {
  supplyRequestId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColor = (s: string) => {
  switch (s) {
    case 'Chưa cung cấp': return 'bg-amber-100 text-amber-800';
    case 'Đang xử lý': return 'bg-blue-100 text-blue-800';
    case 'Chờ bổ sung': return 'bg-orange-100 text-orange-800';
    case 'Chờ bổ sung (quá hạn)': return 'bg-red-100 text-red-800';
    case 'Đã cung cấp đủ': return 'bg-green-100 text-green-800';
    case 'Đã mua hàng': return 'bg-purple-100 text-purple-800';
    case 'Đã nhập kho': return 'bg-emerald-100 text-emerald-800';
    case 'Đã hủy': return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const fulfillmentColor = (s?: string) => {
  switch (s) {
    case 'Chờ xử lý': return 'bg-gray-100 text-gray-600';
    case 'Đang xử lý': return 'bg-blue-100 text-blue-800';
    case 'Đã cấp đủ': return 'bg-green-100 text-green-800';
    case 'Cấp một phần': return 'bg-amber-100 text-amber-800';
    case 'Chuyển thu mua': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-600';
  }
};

export default function SupplyRequestDetailModal({ supplyRequestId, isOpen, onClose }: Props) {
  const [data, setData] = useState<SupplyRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !supplyRequestId) return;
    setLoading(true);
    setError(null);
    setData(null);
    supplyRequestService.getSupplyRequestById(supplyRequestId)
      .then((res: unknown) => {
        const r = res as { data?: unknown };
        const d = r?.data as { data?: SupplyRequest } | SupplyRequest | undefined;
        // apiClient returns { success, data: SupplyRequest } — unwrap one or two levels
        const sr = (d as { data?: SupplyRequest })?.data ?? (d as SupplyRequest);
        if (sr && (sr as SupplyRequest).maYeuCau) setData(sr as SupplyRequest);
        else setError('Không tải được chi tiết YCCB');
      })
      .catch((e: unknown) => {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? (e as Error)?.message ?? 'Không tải được chi tiết YCCB';
        const status = (e as { response?: { status?: number } })?.response?.status;
        setError(status === 403 ? 'Tài khoản chưa có quyền xem YCCB (supply-requests:READ). Liên hệ admin chạy lại seed-rules.' : msg);
      })
      .finally(() => setLoading(false));
  }, [isOpen, supplyRequestId]);

  // Allow close on backdrop / Esc via Modal's own handlers; reset when closed
  const handleClose = () => {
    setData(null);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} closeOnBackdrop ariaLabel="Chi tiết yêu cầu cung ứng">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl md:max-w-5xl flex flex-col modal-viewport-h overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Chi tiết yêu cầu cung ứng {data?.maYeuCau ? <span className="ml-2 text-sm font-normal text-gray-500">{data.maYeuCau}</span> : null}
          </h2>
          <button onClick={handleClose} aria-label="Đóng" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="text-center py-10 text-sm text-gray-500">Đang tải chi tiết YCCB…</div>
          ) : error ? (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm bg-gray-50 p-3 rounded-md">
                <div><span className="font-medium text-gray-600">Mã yêu cầu:</span> <span className="text-indigo-600 font-medium">{data.maYeuCau}</span></div>
                <div><span className="font-medium text-gray-600">Ngày yêu cầu:</span> {new Date(data.ngayYeuCau).toLocaleDateString('vi-VN')}</div>
                <div><span className="font-medium text-gray-600">Nhân viên:</span> {data.tenNhanVien} <span className="text-gray-400">({data.maNhanVien})</span></div>
                <div><span className="font-medium text-gray-600">Bộ phận:</span> {data.boPhan}</div>
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span className="font-medium text-gray-600">Trạng thái:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(data.trangThai)}`}>{data.trangThai}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Danh sách hàng hóa</h3>
                <div className="border border-gray-200 rounded-md overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs sm:text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tên gọi</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Phân loại</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Yêu cầu</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Đã cấp</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">ĐVT</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium">{item.tenGoi}</td>
                          <td className="px-3 py-2 hidden lg:table-cell">{item.phanLoai}</td>
                          <td className="px-3 py-2 text-right">{item.soLuong.toLocaleString('vi-VN')}</td>
                          <td className="px-3 py-2 text-right text-blue-700 font-medium">{(item.fulfilledQty ?? 0).toLocaleString('vi-VN')}</td>
                          <td className="px-3 py-2 hidden sm:table-cell">{item.donViTinh}</td>
                          <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${fulfillmentColor(item.fulfillmentStatus)}`}>{item.fulfillmentStatus ?? 'Chờ xử lý'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-gray-600">Mức ưu tiên:</span> {data.mucDoUuTien}</div>
                <div><span className="font-medium text-gray-600">Mục đích:</span> <span className="text-gray-700">{data.mucDichYeuCau}</span></div>
                {data.ghiChu && <div className="sm:col-span-2"><span className="font-medium text-gray-600">Ghi chú:</span> <span className="text-gray-700">{data.ghiChu}</span></div>}
                {data.trangThai === 'Đã hủy' && data.lyDoHuy && (
                  <div className="sm:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm">
                    <span className="font-medium text-red-800">Lý do hủy:</span> <span className="text-red-900">{data.lyDoHuy}</span>
                    {data.nguoiHuy ? <span className="text-red-700 text-xs"> · bởi {data.nguoiHuy}</span> : null}
                    {data.ngayHuy ? <span className="text-red-700 text-xs"> · {new Date(data.ngayHuy).toLocaleString('vi-VN')}</span> : null}
                  </div>
                )}
                <div><span className="font-medium text-gray-600">Tạo lúc:</span> <span className="text-gray-700">{new Date(data.createdAt).toLocaleString('vi-VN')}</span></div>
                <div><span className="font-medium text-gray-600">Cập nhật:</span> <span className="text-gray-700">{new Date(data.updatedAt).toLocaleString('vi-VN')}</span></div>
              </div>

              {(data.replenishmentRequests?.length || data.purchaseRequests?.length) ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm">
                  <div className="font-medium text-gray-700 mb-2">Liên kết</div>
                  <div className="space-y-1 text-xs">
                    {data.replenishmentRequests?.map((rr) => (
                      <div key={rr.id}><span className="text-gray-500">YCBS</span> <span className="font-medium">{rr.maYeuCau}</span> <span className="text-gray-500">— {rr.trangThai}</span>{rr.convertedPurchaseRequest ? <span className="text-blue-600"> → {rr.convertedPurchaseRequest.maYeuCau}</span> : null}</div>
                    ))}
                    {data.purchaseRequests?.map((pr) => (
                      <div key={pr.id}><span className="text-gray-500">YCMH</span> <span className="font-medium">{pr.maYeuCau}</span> <span className="text-gray-500">— {pr.trangThai}</span></div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200 bg-gray-50 shrink-0 rounded-b-xl">
          <button onClick={handleClose} className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-white">Đóng</button>
        </div>
      </div>
    </Modal>
  );
}
