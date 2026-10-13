import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Eye, RefreshCw } from 'lucide-react';
import purchaseRequestService from '../../services/purchaseRequestService';
import { normalizeBoPhan, CANONICAL_BO_PHAN } from '../../utils/normalizeBoPhan';
import { trangThaiBadgeClass, formatVND, formatDateVN } from '../../utils/purchaseRequestBadges';
import { useUrlDetailId } from '../../hooks/useUrlState';
import type { PurchaseRequest } from '../../types/purchaseRequest';
import AttachmentList, { collectAttachments } from '../common/AttachmentList';
import PurchaseRequestDetailModal from '../purchasing/PurchaseRequestDetailModal';

const ALL_STATUSES = ['Chờ báo giá', 'Chờ duyệt', 'Đã duyệt', 'Hoàn thành', 'Từ chối', 'Đã hủy'];
const DEFAULT_STATUSES = ['Chờ báo giá', 'Chờ duyệt', 'Đã duyệt', 'Hoàn thành'];
const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tất cả nguồn' },
  { value: 'MANUAL', label: 'Thủ công' },
  { value: 'REORDER', label: 'Tự động' },
  { value: 'QUICK', label: 'Mua nhanh' },
];

function buildTrangThaiParam(selected: string[]): string | undefined {
  if (!selected.length || selected.length === ALL_STATUSES.length) return undefined;
  return selected.join(',');
}

function arrivalBadge(ngayDuKienNhap?: string | null): { label: string; cls: string } | null {
  if (!ngayDuKienNhap) return null;
  const d = new Date(ngayDuKienNhap);
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
  const diff = Math.floor((dDay.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: 'Quá hạn', cls: 'bg-red-100 text-red-700 border-red-200' };
  if (diff <= 3) return { label: 'Sắp đến hạn', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return null;
}

export default function AccountingPurchaseList({ month, year }: { month?: number; year?: number }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [data, setData] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([...DEFAULT_STATUSES]);
  const [boPhan, setBoPhan] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [detail, setDetail] = useState<PurchaseRequest | null>(null);
  const detailId = useUrlDetailId('purchaseRequestId');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await purchaseRequestService.getAllPurchaseRequests(
        page, 10, search || undefined, month, year,
        { trangThai: buildTrangThaiParam(selectedStatuses), supplyRequestBoPhan: boPhan || undefined, sourceType: sourceType || undefined },
      );
      setData((res.data as PurchaseRequest[]) || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotal(Number(res.pagination?.total ?? 0));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, month, year, selectedStatuses, boPhan, sourceType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // reset page when filters change
  useEffect(() => { setPage(1); }, [selectedStatuses, boPhan, sourceType, month, year]);

  // deep-link: open detail when URL has purchaseRequestId
  useEffect(() => {
    if (!detailId.id) { setDetail(null); return; }
    const found = data.find((r) => r.id === detailId.id);
    if (found) { setDetail(found); return; }
    // fetch single if not in current page
    purchaseRequestService.getPurchaseRequestById(detailId.id).then((res: any) => {
      const pr = res.data?.data ?? res.data;
      if (pr?.id) setDetail(pr);
    }).catch(() => {});
  }, [detailId.id, data]);

  const openDetail = (pr: PurchaseRequest) => {
    setDetail(pr);
    detailId.open(pr.id);
  };
  const closeDetail = () => {
    setDetail(null);
    detailId.close();
  };

  const toggleStatus = (s: string) => {
    setSelectedStatuses((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-gray-500 mr-1">Trạng thái:</span>
          {ALL_STATUSES.map((s) => {
            const active = selectedStatuses.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleStatus(s)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {s}
              </button>
            );
          })}
          {selectedStatuses.length !== DEFAULT_STATUSES.length || selectedStatuses.some((s) => !DEFAULT_STATUSES.includes(s)) ? (
            <button type="button" onClick={() => setSelectedStatuses([...DEFAULT_STATUSES])} className="text-xs text-blue-600 hover:underline ml-1">Mặc định</button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Bộ phận:</span>
          <select value={boPhan} onChange={(e) => setBoPhan(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Tất cả</option>
            {CANONICAL_BO_PHAN.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Nguồn:</span>
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Search + actions */}
      <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input type="text" placeholder="Mã / tên hàng / NCC..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-sm" />
          </div>
          <button onClick={() => fetchData()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            <Search className="h-4 w-4" /> Tìm kiếm
          </button>
          <button onClick={() => fetchData()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 bg-white rounded-md hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{total} phiếu</span>
          <button onClick={async () => { try { await purchaseRequestService.exportToExcel({ search: search || undefined }); } catch (e) { console.error(e); alert('Lỗi khi xuất Excel'); } }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
            <Download className="h-4 w-4" /> Xuất Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div><p className="mt-3 text-sm text-gray-500">Đang tải...</p></div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">Không có dữ liệu mua hàng</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left font-medium text-gray-500">STT</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Mã YC</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Ngày YC</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Người YC / Bộ phận</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Phân loại</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Hàng hóa</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Tổng dự kiến</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Tổng thực tế</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Chênh lệch</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">NCC</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Kho / Ngày DK</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500">Nhập kho</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500">Tệp</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Hóa đơn</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Công nợ</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Trạng thái</th>
                <th className="px-2 py-2 text-center font-medium text-gray-500">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((pr: any, idx: number) => {
                const stt = (page - 1) * 10 + idx + 1;
                const items: any[] = pr.items ?? [];
                const distinctPhanLoai = [...new Set(items.map((it: any) => it.phanLoai).filter(Boolean))];
                const phanLoaiLabel = distinctPhanLoai.length === 0 ? '—' : distinctPhanLoai.length === 1 ? distinctPhanLoai[0] : `${distinctPhanLoai[0]} +${distinctPhanLoai.length - 1}`;
                let duKien = 0, thucTe = 0;
                let hasThucTe = false;
                for (const it of items) {
                  duKien += (Number(it.soLuong) || 0) * (Number(it.giaDuKien) || 0);
                  if (it.giaThucTe != null && Number(it.giaThucTe) > 0) {
                    thucTe += (Number(it.soLuongThucTe ?? it.soLuong) || 0) * Number(it.giaThucTe);
                    hasThucTe = true;
                  }
                }
                const chenh = hasThucTe ? thucTe - duKien : 0;
                const suppliers = [...new Map(items.map((it: any) => it.supplier).filter(Boolean).map((s: any) => [s.id ?? s.tenNhaCungCap, s]) as any).values()] as any[];
                const tenKho = pr.warehouse?.tenKho ?? pr.inboundPlan?.warehouse?.tenKho ?? null;
                const badge = arrivalBadge(pr.ngayDuKienNhap);
                const inboundDone = (pr.warehouseReceipts && pr.warehouseReceipts.length > 0) || pr.inboundPlan?.trangThai === 'COMPLETED' || pr.inboundPlan?.trangThai === 'Đã nhập';
                return (
                  <tr key={pr.id} onClick={() => openDetail(pr)} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-2 py-2 text-gray-600">{stt}</td>
                    <td className="px-2 py-2 font-medium text-blue-600 whitespace-nowrap">{pr.maYeuCau}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{formatDateVN(pr.ngayYeuCau)}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-gray-800">{pr.tenNhanVien}</div>
                      <div className="text-gray-500" title={pr.supplyRequest?.boPhan ?? ''}>{pr.supplyRequest?.boPhan ? normalizeBoPhan(pr.supplyRequest.boPhan) : '—'}</div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap" title={distinctPhanLoai.join(', ')}>
                      {phanLoaiLabel}
                      {distinctPhanLoai.length > 1 && <span className="ml-1 text-gray-400">+{distinctPhanLoai.length - 1} loại</span>}
                    </td>
                    <td className="px-2 py-2 max-w-[180px]">
                      {items.length === 0 ? <span className="text-gray-400">—</span> : (
                        <div className="space-y-0.5">
                          {items.map((it: any, i: number) => {
                            const qdiff = it.soLuongThucTe != null && Math.abs(Number(it.soLuongThucTe) - Number(it.soLuong)) > 1e-9;
                            return (
                              <div key={it.id ?? i} className="truncate">
                                <span className="font-medium">{it.tenHangHoa}</span>
                                <span className="text-gray-500 ml-1">x{it.soLuong} {it.donViTinh}</span>
                                {qdiff && <span className="ml-1 px-1 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 border border-amber-200">lệch</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      {duKien ? formatVND(duKien) : (pr.trangThai === 'Chờ báo giá' ? <span className="text-gray-400 italic">Chưa báo giá</span> : '—')}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      {hasThucTe ? <span className="font-medium text-gray-800">{formatVND(thucTe)}</span> : <span className="text-gray-400 italic">Chưa chốt</span>}
                    </td>
                    <td className={`px-2 py-2 text-right whitespace-nowrap font-medium ${!hasThucTe ? 'text-gray-400' : chenh > 0 ? 'text-red-600' : chenh < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {!hasThucTe ? '—' : `${chenh > 0 ? '+' : ''}${chenh.toLocaleString('vi-VN')}đ`}
                    </td>
                    <td className="px-2 py-2 max-w-[120px] truncate" title={suppliers.map((s: any) => s.tenNhaCungCap).join(', ')}>
                      {suppliers.length === 0 ? <span className="text-gray-400">—</span> : (
                        <>{suppliers[0].tenNhaCungCap}{suppliers.length > 1 && <span className="text-gray-400"> +{suppliers.length - 1}</span>}</>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-gray-800">{tenKho ?? <span className="text-gray-400">—</span>}</div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">{pr.ngayDuKienNhap ? formatDateVN(pr.ngayDuKienNhap) : ''}</span>
                        {badge && <span className={`px-1 py-0.5 rounded text-[10px] font-medium border ${badge.cls}`}>{badge.label}</span>}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center whitespace-nowrap">
                      {inboundDone ? <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">Đã nhập</span> : <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">Chưa</span>}
                    </td>
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <AttachmentList variant="chip" urls={(pr as any).aggregatedAttachments?.all ?? collectAttachments(pr as any, (pr as any).supplyRequest)} />
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-xs" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const invs: any[] = (pr as any).linkedInvoices ?? [];
                        if (!invs.length) return <span className="text-gray-400">Chưa có</span>;
                        return (
                          <div className="space-y-0.5">
                            {invs.slice(0,2).map((inv: any) => (
                              <div key={inv.id} className="flex items-center gap-1">
                                <span className="font-medium text-blue-600">{inv.soHoaDon}</span>
                                <span className={`px-1 py-0.5 rounded text-[10px] ${inv.trangThai === 'Đã thanh toán' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{inv.trangThai}</span>
                              </div>
                            ))}
                            {invs.length > 2 && <span className="text-gray-400">+{invs.length - 2} hóa đơn</span>}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap text-xs">
                      {(() => {
                        const debts: any[] = (pr as any).linkedDebts ?? [];
                        if (!debts.length) return <span className="text-gray-400">—</span>;
                        const conNo = debts.reduce((s: number, d: any) => s + ((Number(d.soTienPhaiTra)||0) - (Number(d.soTienDaThanhToan)||0)), 0);
                        return <span className={conNo > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>{conNo.toLocaleString('vi-VN')}đ</span>;
                      })()}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trangThaiBadgeClass(pr.trangThai)}`}>{pr.trangThai}</span>
                    </td>
                    <td className="px-2 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openDetail(pr)} className="text-blue-600 hover:text-blue-800 p-1" title="Xem"><Eye className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Trước</button>
          <span className="text-sm text-gray-600">Trang {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">Sau</button>
        </div>
      )}

      {/* Read-only detail modal */}
      <PurchaseRequestDetailModal
        isOpen={!!detail}
        onClose={closeDetail}
        purchaseRequest={detail as any}
        canEdit={false}
        canUpdate={false}
        isActualPriceConfirmed={(pr: any) => {
          const lines = (pr?.items ?? []) as Array<{ giaThucTe?: number | null }>;
          return lines.length > 0 && lines.every((l) => l.giaThucTe != null && Number(l.giaThucTe) > 0);
        }}
        onEdit={() => {}}
        onCancel={() => {}}
        onConfirmPrice={() => {}}
      />
    </div>
  );
}
