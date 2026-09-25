import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, Edit, Eye, Trash2, CheckCircle, FilePenLine } from 'lucide-react';
import purchaseRequestService from '../../services/purchaseRequestService';
import { normalizeBoPhan, CANONICAL_BO_PHAN } from '../../utils/normalizeBoPhan';
import { labelForPurchaseRequest } from '../../utils/purchaseRequestLabel';
import type { PurchaseRequest } from '../../types/purchaseRequest';

export type PurchaseSubTab = 'requests' | 'purchased';

const DEFAULT_REQUESTS_STATUSES = ['Chờ báo giá', 'Chờ duyệt'];
const DEFAULT_PURCHASED_STATUSES = ['Đã duyệt', 'Hoàn thành'];
const PURCHASED_ALL_OPTIONS = ['Đã duyệt', 'Hoàn thành', 'Từ chối', 'Đã hủy'];

function buildTrangThaiParam(selected: string[]): string | undefined {
  if (!selected.length) return undefined;
  return selected.join(',');
}

function StatusMultiSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((x) => x !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-xs text-gray-500 mr-1">Trạng thái:</span>
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function PurchaseRequestSubTabs({
  phanLoaiNCC,
  canEditPR,
  canDeletePR,
  canUpdatePR,
  onOpenDetail,
  onEdit,
  onDelete,
  onSubmitForApproval,
  onComplete,
  onQuickUpdate,
  refreshKey,
  onCountsChange,
}: {
  phanLoaiNCC: string;
  canEditPR: boolean;
  canDeletePR: boolean;
  canUpdatePR: boolean;
  onOpenDetail: (pr: PurchaseRequest) => void;
  onEdit: (pr: PurchaseRequest) => void;
  onDelete: (id: string) => void;
  onSubmitForApproval: (pr: PurchaseRequest) => void;
  onComplete: (pr: PurchaseRequest) => void;
  onQuickUpdate?: (pr: PurchaseRequest) => void;
  refreshKey?: number;
  onCountsChange?: (total: number) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSub = searchParams.get('purchaseSubTab');
  const purchaseSubTab: PurchaseSubTab = rawSub === 'purchased' ? 'purchased' : 'requests';
  const setPurchaseSubTab = useCallback(
    (v: PurchaseSubTab) => {
      const p = new URLSearchParams(searchParams);
      p.set('purchaseSubTab', v);
      setSearchParams(p, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Sub1 state
  const [searchRequests, setSearchRequests] = useState('');
  const [pageRequests, setPageRequests] = useState(1);
  const [totalPagesRequests, setTotalPagesRequests] = useState(1);
  const [dataRequests, setDataRequests] = useState<PurchaseRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [trangThaiRequests, setTrangThaiRequests] = useState<string[]>([...DEFAULT_REQUESTS_STATUSES]);
  const [boPhanRequests, setBoPhanRequests] = useState('');

  // Sub2 state
  const [searchPurchased, setSearchPurchased] = useState('');
  const [pagePurchased, setPagePurchased] = useState(1);
  const [totalPagesPurchased, setTotalPagesPurchased] = useState(1);
  const [dataPurchased, setDataPurchased] = useState<PurchaseRequest[]>([]);
  const [loadingPurchased, setLoadingPurchased] = useState(false);
  const [trangThaiPurchased, setTrangThaiPurchased] = useState<string[]>([...DEFAULT_PURCHASED_STATUSES]);
  const [boPhanPurchased, setBoPhanPurchased] = useState('');

  // Counts for pills
  const [countRequests, setCountRequests] = useState(0);
  const [countPurchased, setCountPurchased] = useState(0);
  // TODO: pill cam sub2 should be "Đã duyệt chưa chốt giaThucTe" — needs server aggregation; using count Đã duyệt for now
  const [countPurchasedUnpriced, setCountPurchasedUnpriced] = useState(0);

  const activeSearch = purchaseSubTab === 'requests' ? searchRequests : searchPurchased;
  const activeBoPhan = purchaseSubTab === 'requests' ? boPhanRequests : boPhanPurchased;
  const activeData = purchaseSubTab === 'requests' ? dataRequests : dataPurchased;
  const activeLoading = purchaseSubTab === 'requests' ? loadingRequests : loadingPurchased;
  const activePage = purchaseSubTab === 'requests' ? pageRequests : pagePurchased;
  const activeTotalPages = purchaseSubTab === 'requests' ? totalPagesRequests : totalPagesPurchased;

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const res: any = await purchaseRequestService.getAllPurchaseRequests(pageRequests, 10, searchRequests || undefined, undefined, undefined, {
        phanLoaiNCC,
        trangThai: buildTrangThaiParam(trangThaiRequests),
        supplyRequestBoPhan: boPhanRequests || undefined,
      } as any);
      setDataRequests((res.data as PurchaseRequest[]) || []);
      setTotalPagesRequests(res.pagination?.totalPages || 1);
    } catch (e) {
      console.error('fetchRequests', e);
    } finally {
      setLoadingRequests(false);
    }
  }, [pageRequests, searchRequests, phanLoaiNCC, trangThaiRequests, boPhanRequests]);

  const fetchPurchased = useCallback(async () => {
    setLoadingPurchased(true);
    try {
      const res: any = await purchaseRequestService.getAllPurchaseRequests(pagePurchased, 10, searchPurchased || undefined, undefined, undefined, {
        phanLoaiNCC,
        trangThai: buildTrangThaiParam(trangThaiPurchased),
        supplyRequestBoPhan: boPhanPurchased || undefined,
      } as any);
      setDataPurchased((res.data as PurchaseRequest[]) || []);
      setTotalPagesPurchased(res.pagination?.totalPages || 1);
    } catch (e) {
      console.error('fetchPurchased', e);
    } finally {
      setLoadingPurchased(false);
    }
  }, [pagePurchased, searchPurchased, phanLoaiNCC, trangThaiPurchased, boPhanPurchased]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests, refreshKey]);
  useEffect(() => {
    fetchPurchased();
  }, [fetchPurchased, refreshKey]);

  // Keep current sub tab fresh when its filters change (fetch* already covers it)
  // counts
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r: any = await purchaseRequestService.getAllPurchaseRequests(1, 1, undefined, undefined, undefined, {
          phanLoaiNCC,
          trangThai: DEFAULT_REQUESTS_STATUSES.join(','),
        } as any);
        if (!cancelled) setCountRequests(Number(r.pagination?.total ?? 0));
      } catch {}
    })();
    (async () => {
      try {
        const r: any = await purchaseRequestService.getAllPurchaseRequests(1, 1, undefined, undefined, undefined, {
          phanLoaiNCC,
          trangThai: DEFAULT_PURCHASED_STATUSES.join(','),
        } as any);
        if (!cancelled) setCountPurchased(Number(r.pagination?.total ?? 0));
        const r2: any = await purchaseRequestService.getAllPurchaseRequests(1, 1, undefined, undefined, undefined, {
          phanLoaiNCC,
          trangThai: 'Đã duyệt',
        } as any);
        if (!cancelled) setCountPurchasedUnpriced(Number(r2.pagination?.total ?? 0));
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [phanLoaiNCC, refreshKey, dataRequests.length, dataPurchased.length]);

  // expose counts via data attribute for parent pill (optional)
  useEffect(() => {
    if (onCountsChange) onCountsChange(countRequests + countPurchased);
    const el = document.getElementById('purchase-subtab-counts');
    if (el) {
      el.dataset.requests = String(countRequests);
      el.dataset.purchased = String(countPurchased);
      el.dataset.total = String(countRequests + countPurchased);
    }
  }, [countRequests, countPurchased, onCountsChange]);

  const isActualPriceConfirmed = (item: any): boolean => {
    const lines = (item?.items ?? []) as Array<{ giaThucTe?: number | null }>;
    return lines.length > 0 && lines.every((l) => l.giaThucTe != null && Number(l.giaThucTe) > 0);
  };

  const renderTable = (rows: PurchaseRequest[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã yêu cầu</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày yêu cầu</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nhân viên</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bộ phận</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hàng hóa</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mức độ ưu tiên</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((item: any, index: number) => {
            const page = purchaseSubTab === 'requests' ? pageRequests : pagePurchased;
            return (
              <tr key={item.id} onClick={() => onOpenDetail(item)} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{(page - 1) * 10 + index + 1}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  {item.maYeuCau}
                  {item.sourceType === 'SHORTAGE' && item.trangThai === 'Chờ báo giá' && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 align-middle">
                      {labelForPurchaseRequest(item)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(item.ngayYeuCau).toLocaleDateString('vi-VN')}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.tenNhanVien}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" title={item.supplyRequest?.boPhan ?? ''}>
                  {item.supplyRequest?.boPhan ? normalizeBoPhan(item.supplyRequest.boPhan) : '—'}
                </td>
                <td className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                  {item.items && item.items.length > 0 ? (
                    <div className="space-y-0.5">
                      {item.items.map((subItem: any, i: number) => {
                          const qKH = Number(subItem.soLuong) || 0;
                          const qTTraw = subItem.soLuongThucTe;
                          const hasDiff = qTTraw != null && Math.abs(Number(qTTraw) - qKH) > 1e-9;
                          return (
                          <div key={i} className="text-xs">
                            <span className="font-medium">{subItem.tenHangHoa}</span>
                            <span className="text-gray-400 ml-1">
                              x{qKH}{hasDiff ? `→${Number(qTTraw)}` : ''} {subItem.donViTinh}
                            </span>
                            {subItem.giaDuKien && <span className="text-green-600 ml-1">{Number(subItem.giaDuKien).toLocaleString('vi-VN')}đ</span>}
                            {hasDiff && <span className="ml-1 px-1 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 border border-amber-200">lệch</span>}
                          </div>
                        );})}
                    </div>
                  ) : (
                    <span className="text-gray-400">{item.tenHangHoa || '-'}</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.mucDoUuTien === 'Cao'
                        ? 'bg-red-100 text-red-800'
                        : item.mucDoUuTien === 'Trung bình'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {item.mucDoUuTien}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.trangThai === 'Chờ báo giá'
                        ? 'bg-orange-100 text-orange-800'
                        : item.trangThai === 'Chờ duyệt'
                          ? 'bg-yellow-100 text-yellow-800'
                          : item.trangThai === 'Đã duyệt'
                            ? isActualPriceConfirmed(item)
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                            : item.trangThai === 'Từ chối'
                              ? 'bg-red-100 text-red-800'
                              : item.trangThai === 'Đã hủy'
                                ? 'bg-gray-100 text-gray-800'
                                : item.trangThai === 'Hoàn thành'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {item.trangThai}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => onOpenDetail(item)} className="text-blue-600 hover:text-blue-800" title="Xem chi tiết">
                      <Eye className="w-4 h-4" />
                    </button>
                    {canEditPR && (
                      <button onClick={() => onEdit(item)} className="text-green-600 hover:text-green-800" title="Chỉnh sửa">
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {canUpdatePR && onQuickUpdate && item.trangThai === 'Đã duyệt' && (
                      <button onClick={() => onQuickUpdate(item)} className="text-blue-600 hover:text-blue-800" title="Cập nhật thông tin đơn hàng">
                        <FilePenLine className="w-4 h-4" />
                      </button>
                    )}
                    {canDeletePR && (
                      <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {canUpdatePR && item.trangThai === 'Chờ báo giá' && (
                      <button
                        onClick={() => onSubmitForApproval(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded hover:bg-orange-100 border border-orange-200 text-xs font-medium"
                        title="Gửi admin phê duyệt"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Gửi duyệt
                      </button>
                    )}
                    {canUpdatePR && item.trangThai === 'Đã duyệt' && (
                      <button
                        onClick={() => onComplete(item)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100 border border-emerald-200 text-xs font-medium"
                        title="Đã mua hàng xong"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Đã mua xong
                      </button>
                    )}
                    {item.trangThai === 'Hoàn thành' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                        <CheckCircle className="w-3.5 h-3.5" /> Đã hoàn thành
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      {/* hidden bridge for parent pill sync */}
      <span id="purchase-subtab-counts" className="hidden" data-requests={countRequests} data-purchased={countPurchased} data-total={countRequests + countPurchased} />

      {/* Sub tabs header */}
      <div className="flex gap-2 border-b mb-4">
        <button
          onClick={() => setPurchaseSubTab('requests')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${purchaseSubTab === 'requests' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Danh sách yêu cầu
          {countRequests > 0 && <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white min-w-[18px]">{countRequests}</span>}
        </button>
        <button
          onClick={() => setPurchaseSubTab('purchased')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${purchaseSubTab === 'purchased' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Danh sách mua hàng
          {countPurchasedUnpriced > 0 && <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white min-w-[18px]">{countPurchasedUnpriced}</span>}
          {countPurchasedUnpriced === 0 && countPurchased > 0 && <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-gray-400 text-white min-w-[18px]">{countPurchased}</span>}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {purchaseSubTab === 'requests' ? (
          <StatusMultiSelect options={DEFAULT_REQUESTS_STATUSES} value={trangThaiRequests} onChange={(v) => { setTrangThaiRequests(v); setPageRequests(1); }} />
        ) : (
          <StatusMultiSelect options={PURCHASED_ALL_OPTIONS} value={trangThaiPurchased} onChange={(v) => { setTrangThaiPurchased(v); setPagePurchased(1); }} />
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Bộ phận:</span>
          <select
            value={activeBoPhan}
            onChange={(e) => {
              const v = e.target.value;
              if (purchaseSubTab === 'requests') { setBoPhanRequests(v); setPageRequests(1); }
              else { setBoPhanPurchased(v); setPagePurchased(1); }
            }}
            className="border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả bộ phận</option>
            {CANONICAL_BO_PHAN.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Tìm kiếm yêu cầu mua hàng..."
              value={activeSearch}
              onChange={(e) => {
                if (purchaseSubTab === 'requests') { setSearchRequests(e.target.value); setPageRequests(1); }
                else { setSearchPurchased(e.target.value); setPagePurchased(1); }
              }}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-64"
            />
          </div>
          <button
            onClick={() => (purchaseSubTab === 'requests' ? fetchRequests() : fetchPurchased())}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Search className="h-4 w-4" /> Tìm kiếm
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={async () => {
              try { await purchaseRequestService.exportToExcel({ search: activeSearch || undefined }); } catch (e) { console.error(e); alert('Lỗi khi xuất Excel'); }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="h-4 w-4" /> Xuất Excel
          </button>
        </div>
      </div>

      {activeLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      ) : activeData.length === 0 ? (
        <div className="text-center py-8"><p className="text-gray-500">Chưa có yêu cầu mua hàng nào</p></div>
      ) : (
        renderTable(activeData as any)
      )}

      {activeTotalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => (purchaseSubTab === 'requests' ? setPageRequests((p) => Math.max(1, p - 1)) : setPagePurchased((p) => Math.max(1, p - 1)))}
            disabled={activePage === 1}
            className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Trước
          </button>
          <span className="text-sm text-gray-600">Trang {activePage} / {activeTotalPages}</span>
          <button
            onClick={() => (purchaseSubTab === 'requests' ? setPageRequests((p) => Math.min(activeTotalPages, p + 1)) : setPagePurchased((p) => Math.min(activeTotalPages, p + 1)))}
            disabled={activePage === activeTotalPages}
            className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
