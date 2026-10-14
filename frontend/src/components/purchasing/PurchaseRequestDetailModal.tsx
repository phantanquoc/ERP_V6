import { useMemo } from 'react';
import { Edit, BadgeCheck, Ban, X, PackageOpen, FilePenLine, Paperclip } from 'lucide-react';
import Modal from '../Modal';
import type { PurchaseRequest } from '../../types/purchaseRequest';
import { labelForPurchaseRequest } from '../../utils/purchaseRequestLabel';
import { sourceTypeLabel, sourceTypeBadgeClass, trangThaiBadgeClass } from '../../utils/purchaseRequestBadges';
import { normalizeBoPhan } from '../../utils/normalizeBoPhan';
import AttachmentList, { collectAttachments } from '../common/AttachmentList';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequest: PurchaseRequest | null;
  canEdit: boolean;
  canUpdate: boolean;
  isActualPriceConfirmed: (pr: PurchaseRequest) => boolean;
  onEdit: (pr: PurchaseRequest) => void;
  onCancel: (pr: PurchaseRequest) => void;
  onConfirmPrice: (pr: PurchaseRequest) => void;
  onQuickUpdate?: (pr: PurchaseRequest) => void;
  onViewInboundPlan?: (pr: PurchaseRequest) => void;
  onUpdateAttachment?: (pr: PurchaseRequest) => void;
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return '—'; }
}
function formatDateTime(d?: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('vi-VN'); } catch { return '—'; }
}
function arrivalBadge(ngayDuKienNhap?: string | null): { label: string; cls: string } | null {
  if (!ngayDuKienNhap) return null;
  const d = new Date(ngayDuKienNhap);
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((dDay.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: 'Quá hạn', cls: 'bg-red-100 text-red-700 border-red-200' };
  if (diffDays <= 3) return { label: 'Sắp đến hạn', cls: 'bg-amber-100 text-amber-700 border-amber-200' };
  return null;
}
type SectionTone = 'slate' | 'blue' | 'amber' | 'emerald' | 'violet' | 'orange';
const toneMap: Record<SectionTone, { wrap: string; head: string }> = {
  slate:   { wrap: 'bg-slate-50/50 border-slate-200', head: 'bg-slate-100/70 border-slate-200 text-slate-700' },
  blue:    { wrap: 'bg-blue-50/30 border-blue-100',   head: 'bg-blue-50 border-blue-100 text-blue-700' },
  amber:   { wrap: 'bg-amber-50/30 border-amber-100',  head: 'bg-amber-50 border-amber-100 text-amber-700' },
  emerald: { wrap: 'bg-emerald-50/30 border-emerald-100', head: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
  violet:  { wrap: 'bg-violet-50/30 border-violet-100', head: 'bg-violet-50 border-violet-100 text-violet-700' },
  orange:  { wrap: 'bg-orange-50/30 border-orange-100', head: 'bg-orange-50 border-orange-100 text-orange-700' },
};
function Section({ title, tone = 'slate', children }: { title: string; tone?: SectionTone; children: React.ReactNode }) {
  const c = toneMap[tone];
  return (
    <div className={`border rounded-lg overflow-hidden ${c.wrap}`}>
      <div className={`px-3 py-1.5 border-b ${c.head}`}>
        <span className="text-xs font-semibold tracking-wide">{title}</span>
      </div>
      <div className="bg-white/70">{children}</div>
    </div>
  );
}
function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2">
      <div className="text-[11px] font-medium text-gray-500 leading-none mb-1">{label}</div>
      <div className="text-sm text-gray-800 leading-tight">{children}</div>
    </div>
  );
}

export default function PurchaseRequestDetailModal({
  isOpen, onClose, purchaseRequest, canEdit, canUpdate, isActualPriceConfirmed, onEdit, onCancel, onConfirmPrice, onQuickUpdate, onViewInboundPlan, onUpdateAttachment,
}: Props) {
  const pr = purchaseRequest;
  const totals = useMemo(() => {
    if (!pr?.items?.length) return { duKien: 0, thucTe: 0, hasThucTe: false };
    let duKien = 0, thucTe = 0;
    let hasThucTe = false;
    for (const it of pr.items as any[]) {
      const qKH = Number(it.soLuong) || 0;
      const qTT = Number((it as any).soLuongThucTe ?? qKH) || 0;
      duKien += qKH * (Number(it.giaDuKien) || 0);
      if (it.giaThucTe != null && Number(it.giaThucTe) > 0) {
        thucTe += qTT * Number(it.giaThucTe);
        hasThucTe = true;
      }
    }
    return { duKien, thucTe, hasThucTe };
  }, [pr]);

  if (!isOpen || !pr) return null;

  const positionName = pr.employee?.position?.name;
  const showPriceConfirm = pr.trangThai === 'Đã duyệt' && canUpdate;
  const showCancel = (pr.trangThai === 'Chờ báo giá' || pr.trangThai === 'Chờ duyệt') && canEdit;
  const badge = arrivalBadge(pr.ngayDuKienNhap);
  const tenKho = pr.warehouse?.tenKho ?? pr.inboundPlan?.warehouse?.tenKho ?? null;
  const hasShipping = !!(pr.ngayDuKienNhap || tenKho || pr.ghiChuVanChuyen || pr.inboundPlan);

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Chi tiết yêu cầu mua hàng" className="p-0 sm:p-4">
      <div className="bg-white rounded-lg shadow-sm max-w-5xl w-full mx-2 sm:mx-4 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} role="document">
        <div className="flex justify-between items-start px-5 pt-4 pb-3 border-b border-gray-100 shrink-0 gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-800">Chi tiết {labelForPurchaseRequest(pr)}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-sm font-semibold text-blue-600">{pr.maYeuCau}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trangThaiBadgeClass(pr.trangThai)}`}>{pr.trangThai}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sourceTypeBadgeClass(pr.sourceType)}`}>{sourceTypeLabel(pr.sourceType)}</span>
              {isActualPriceConfirmed(pr) && pr.trangThai === 'Đã duyệt' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">Đã chốt giá</span>
              )}
              {!isActualPriceConfirmed(pr) && pr.trangThai === 'Đã duyệt' && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Chưa chốt giá</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 py-3 space-y-3">
          {(pr.supplyRequest || pr.replenishmentRequest || (pr.warehouseReceipts && pr.warehouseReceipts.length > 0)) && (
            <div className="px-3 py-2 bg-blue-50/40 border border-blue-100 rounded-lg flex flex-wrap gap-2 text-xs">
              {pr.supplyRequest && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-500">YCCB:</span>
                  <span className="font-medium text-blue-700">{pr.supplyRequest.maYeuCau}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${trangThaiBadgeClass(pr.supplyRequest.trangThai)}`}>{pr.supplyRequest.trangThai}</span>
                  {pr.supplyRequest.boPhan && <span className="text-gray-500 ml-1" title={pr.supplyRequest.boPhan}>· {normalizeBoPhan(pr.supplyRequest.boPhan)}</span>}
                </span>
              )}
              {pr.replenishmentRequest && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-500">YCBS:</span>
                  <span className="font-medium text-blue-700">{pr.replenishmentRequest.maYeuCau}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[11px] ${trangThaiBadgeClass(pr.replenishmentRequest.trangThai)}`}>{pr.replenishmentRequest.trangThai}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <span className="text-gray-400">→</span>
                <span className="text-gray-500">YCMH:</span>
                <span className="font-medium text-gray-800">{pr.maYeuCau}</span>
              </span>
              {pr.warehouseReceipts && pr.warehouseReceipts.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <span className="text-gray-400">→</span>
                  <span className="text-gray-500">Nhập kho:</span>
                  {pr.warehouseReceipts.map((w: any) => (
                    <span key={w.id} className="font-medium text-emerald-700">{w.maPhieuNhap ?? w.maPhieu ?? w.id.slice(0, 8)}</span>
                  ))}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-400"><span>→</span> Chưa có phiếu nhập kho</span>
              )}
            </div>
          )}

          <Section title="Thông tin chung" tone="blue">
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-y divide-gray-100 sm:divide-y-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 col-span-2 sm:col-span-3 divide-x divide-gray-100 border-b border-gray-100">
                <Cell label="Mã yêu cầu"><span className="font-semibold text-blue-600">{pr.maYeuCau}</span></Cell>
                <Cell label="Ngày yêu cầu">{formatDate(pr.ngayYeuCau)}</Cell>
                <Cell label="Mức độ ưu tiên"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' : pr.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{pr.mucDoUuTien}</span></Cell>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 col-span-2 sm:col-span-3 divide-x divide-gray-100 border-b border-gray-100">
                <Cell label="Nhân viên yêu cầu"><span className="font-medium">{pr.tenNhanVien}</span>{positionName && <span className="text-xs text-gray-500 ml-1">· {positionName}</span>}</Cell>
                <Cell label="Mã nhân viên">{pr.maNhanVien}</Cell>
                <Cell label="Bộ phận yêu cầu"><span title={pr.supplyRequest?.boPhan ?? ''}>{pr.supplyRequest?.boPhan ? normalizeBoPhan(pr.supplyRequest.boPhan) : '—'}</span></Cell>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 col-span-2 sm:col-span-3 divide-x divide-gray-100">
                <Cell label="Phân loại">{pr.items?.[0]?.phanLoai ?? pr.phanLoai ?? '—'}</Cell>
                <Cell label="Trạng thái"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${trangThaiBadgeClass(pr.trangThai)}`}>{pr.trangThai}</span></Cell>
                <Cell label="Nguồn"><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${sourceTypeBadgeClass(pr.sourceType)}`}>{sourceTypeLabel(pr.sourceType)}</span></Cell>
              </div>
              <div className="grid grid-cols-2 col-span-2 sm:col-span-3 divide-x divide-gray-100 border-t border-gray-100">
                <Cell label="Người duyệt">{pr.nguoiDuyet ? <span className="font-medium">{pr.nguoiDuyet}</span> : <span className="text-gray-400 italic">Chưa có</span>}</Cell>
                <Cell label="Ngày duyệt">{pr.ngayDuyet ? formatDate(pr.ngayDuyet) : <span className="text-gray-400 italic">Chưa duyệt</span>}</Cell>
              </div>
            </div>
          </Section>

          {hasShipping && (
            <Section title="Vận chuyển & Nhập kho" tone="amber">
              <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-gray-100">
                <Cell label="Ngày DK hàng về">{pr.ngayDuKienNhap ? (<span className="inline-flex items-center gap-1.5 font-medium">{formatDate(pr.ngayDuKienNhap)}{badge && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.cls}`}>{badge.label}</span>}</span>) : <span className="text-gray-400">Chưa có</span>}</Cell>
                <Cell label="Kho DK nhập">{tenKho ? <span className="font-medium">{tenKho}</span> : <span className="text-gray-400">Chưa chọn</span>}</Cell>
                <Cell label="Ghi chú vận chuyển">{pr.ghiChuVanChuyen ? <span className="whitespace-pre-wrap">{pr.ghiChuVanChuyen}</span> : <span className="text-gray-400">—</span>}</Cell>
              </div>
              {pr.inboundPlan && (
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-emerald-50/60 border-t border-gray-100 text-sm">
                  <span className="text-xs font-medium text-emerald-700">Kế hoạch:</span>
                  <span className="font-medium text-gray-800">{pr.inboundPlan.maKeHoach}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white border text-gray-700">{pr.inboundPlan.trangThai}</span>
                  <span className="text-xs text-gray-500">Ngày DK: {formatDate(pr.inboundPlan.ngayDuKien)}</span>
                  {onViewInboundPlan && (<button type="button" onClick={() => onViewInboundPlan(pr)} className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"><PackageOpen className="w-3 h-3" /> Xem kế hoạch</button>)}
                </div>
              )}
            </Section>
          )}

          {pr.items && pr.items.length > 0 && (
            <Section tone="slate" title={`Danh sách hàng hóa · ${pr.items.length} dòng`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-[11px] text-gray-500">
                      <th className="text-left py-1.5 px-2 font-medium">STT</th>
                      <th className="text-left py-1.5 px-2 font-medium">Phân loại</th>
                      <th className="text-left py-1.5 px-2 font-medium">Tên hàng hoá</th>
                      <th className="text-right py-1.5 px-2 font-medium">SL KH</th>
                      <th className="text-right py-1.5 px-2 font-medium">SL TT</th>
                      <th className="text-left py-1.5 px-2 font-medium">ĐVT</th>
                      <th className="text-left py-1.5 px-2 font-medium">Nhà cung cấp</th>
                      <th className="text-right py-1.5 px-2 font-medium">Giá KH</th>
                      <th className="text-right py-1.5 px-2 font-medium">Giá TT</th>
                      <th className="text-right py-1.5 px-2 font-medium">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pr.items.map((item: any, i: number) => {
                      const qKH = Number(item.soLuong) || 0;
                      const qTTraw = item.soLuongThucTe;
                      const qTT = qTTraw != null ? Number(qTTraw) : qKH;
                      const priceTT = item.giaThucTe ?? item.giaDuKien;
                      const hasQtyDiff = qTTraw != null && Math.abs(qTT - qKH) > 1e-9;
                      return (
                        <tr key={item.id ?? i} className="hover:bg-gray-50/60">
                          <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                          <td className="py-1.5 px-2">{item.phanLoai}</td>
                          <td className="py-1.5 px-2 font-medium">{item.tenHangHoa}{hasQtyDiff && <span className="ml-1 inline-flex px-1 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200">lệch {qTT - qKH > 0 ? '+' : ''}{qTT - qKH}</span>}</td>
                          <td className="py-1.5 px-2 text-right text-gray-500">{qKH}</td>
                          <td className={`py-1.5 px-2 text-right ${hasQtyDiff ? 'font-medium text-amber-700' : item.soLuongThucTe != null ? 'text-gray-800' : 'text-gray-400 italic'}`}>{item.soLuongThucTe != null ? String(qTT) : '—'}</td>
                          <td className="py-1.5 px-2">{item.donViTinh}</td>
                          <td className="py-1.5 px-2 text-blue-600 text-xs" title={item.supplier ? `${item.supplier.tenNhaCungCap}${item.supplier.soDienThoai ? ' · ' + item.supplier.soDienThoai : ''}` : ''}>{item.supplier?.tenNhaCungCap || '—'}</td>
                          <td className="py-1.5 px-2 text-right text-gray-500 text-xs">{item.giaDuKien ? Number(item.giaDuKien).toLocaleString('vi-VN') + 'đ' : '—'}</td>
                          <td className={`py-1.5 px-2 text-right text-xs ${item.giaThucTe ? 'font-medium text-green-700' : 'text-gray-400 italic'}`}>{item.giaThucTe ? Number(item.giaThucTe).toLocaleString('vi-VN') + 'đ' : 'chưa chốt'}</td>
                          <td className="py-1.5 px-2 text-right font-medium text-xs">{priceTT ? (Number(priceTT) * qTT).toLocaleString('vi-VN') + 'đ' : '—'}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-semibold text-xs"><td colSpan={7} className="py-1.5 px-2 text-right">Tổng dự kiến:</td><td colSpan={3} className="py-1.5 px-2 text-right text-gray-700">{totals.duKien ? totals.duKien.toLocaleString('vi-VN') + 'đ' : '—'}</td></tr>
                    {totals.hasThucTe && (<><tr className="bg-green-50 font-semibold text-xs"><td colSpan={7} className="py-1.5 px-2 text-right">Tổng thực tế:</td><td colSpan={3} className="py-1.5 px-2 text-right text-green-700">{totals.thucTe.toLocaleString('vi-VN')}đ</td></tr><tr className="bg-white font-medium text-xs"><td colSpan={7} className="py-1.5 px-2 text-right text-gray-500">Chênh lệch:</td><td colSpan={3} className={`py-1.5 px-2 text-right ${totals.thucTe - totals.duKien > 0 ? 'text-red-600' : totals.thucTe - totals.duKien < 0 ? 'text-green-600' : 'text-gray-500'}`}>{(totals.thucTe - totals.duKien > 0 ? '+' : '') + (totals.thucTe - totals.duKien).toLocaleString('vi-VN')}đ</td></tr></>)}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          <Section title="Ghi chú & Trạng thái" tone="orange">
            <div className="divide-y divide-gray-100">
              <div className="px-3 py-2 grid grid-cols-1 gap-1"><span className="text-[11px] font-medium text-gray-500">Mục đích yêu cầu</span><span className="text-sm text-gray-800">{pr.mucDichYeuCau}</span></div>
              {pr.ghiChu && (<div className="px-3 py-2"><div className="text-[11px] font-medium text-gray-500 mb-1">Ghi chú người yêu cầu</div><p className="text-sm text-gray-800 whitespace-pre-wrap">{pr.ghiChu}</p></div>)}
              <div className="px-3 py-2"><div className="text-[11px] font-medium text-gray-500 mb-1">Ghi chú thu mua</div>{pr.ghiChuMuaHang ? <p className="text-sm text-gray-800 whitespace-pre-wrap">{pr.ghiChuMuaHang}</p> : <p className="text-sm text-gray-400 italic">Chưa có</p>}</div>
              {pr.lyDoChenhLech && (<div className="px-3 py-2 bg-amber-50/50 border-l-2 border-amber-400"><div className="text-[11px] font-medium text-amber-700 mb-1">Lý do chênh lệch số lượng</div><p className="text-sm text-gray-800 whitespace-pre-wrap">{pr.lyDoChenhLech}</p></div>)}
              {pr.lyDoHuy && (<div className="px-3 py-2 bg-red-50/60 border-l-2 border-red-400"><div className="text-[11px] font-medium text-red-600 mb-1">Lý do hủy</div><p className="text-sm text-gray-800 whitespace-pre-wrap">{pr.lyDoHuy}</p><div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-600">{pr.nguoiHuy && <span>Người hủy: <span className="font-medium text-gray-800">{pr.nguoiHuy}</span></span>}{pr.ngayHuy && <span>Ngày hủy: <span className="font-medium text-gray-800">{formatDateTime(pr.ngayHuy)}</span></span>}</div></div>)}
            </div>
          </Section>

          {((pr as any).linkedInvoices?.length > 0 || (pr as any).linkedDebts?.length > 0) && (
            <Section title="Hóa đơn & Công nợ liên quan" tone="emerald">
              <div className="p-3 space-y-3">
                {(pr as any).linkedInvoices?.length > 0 && (<div><p className="text-[11px] font-medium text-gray-500 mb-1.5">Hóa đơn</p><div className="space-y-1">{(pr as any).linkedInvoices.map((inv: any) => (<div key={inv.id} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded px-3 py-1.5 text-xs"><span className="font-medium text-blue-700">{inv.soHoaDon}</span><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${inv.trangThai === 'Đã thanh toán' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{inv.trangThai}</span><span className="text-gray-600">{inv.thanhTien != null ? Number(inv.thanhTien).toLocaleString('vi-VN') + 'đ' : ''}</span></div>))}</div></div>)}
                {(pr as any).linkedDebts?.length > 0 && (<div><p className="text-[11px] font-medium text-gray-500 mb-1.5">Công nợ</p><div className="space-y-1">{(pr as any).linkedDebts.map((d: any) => { const conNo = (Number(d.soTienPhaiTra) || 0) - (Number(d.soTienDaThanhToan) || 0); return (<div key={d.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded px-3 py-1.5 text-xs"><span className="text-gray-600">{new Date(d.ngayPhatSinh).toLocaleDateString('vi-VN')}</span><span className="text-gray-700">Phải trả: {Number(d.soTienPhaiTra || 0).toLocaleString('vi-VN')}đ</span><span className={conNo > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>Còn nợ: {conNo.toLocaleString('vi-VN')}đ</span></div>); })}</div></div>)}
              </div>
            </Section>
          )}

          <Section title="Tệp đính kèm" tone="violet">
            <div className="p-3">
              <AttachmentList label="" urls={(pr as unknown as { aggregatedAttachments?: { all: string[] } }).aggregatedAttachments?.all ?? collectAttachments(pr as unknown as { tepDinhKem?: string[] | null; fileKemTheo?: string | null }, pr.supplyRequest as unknown as { tepDinhKem?: string[] | null; fileKemTheo?: string | null } | null)} emptyText="Không có file đính kèm" />
            </div>
          </Section>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 px-1">
            <span>Ngày tạo: <span className="font-medium text-gray-700">{formatDateTime(pr.createdAt)}</span></span>
            <span>Cập nhật: <span className="font-medium text-gray-700">{formatDateTime(pr.updatedAt)}</span></span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-gray-100 bg-white shrink-0">
          {pr.inboundPlan && onViewInboundPlan && (<button type="button" onClick={() => onViewInboundPlan(pr)} className="px-3 py-1.5 bg-sky-600 text-white rounded text-sm hover:bg-sky-700 inline-flex items-center gap-1.5"><PackageOpen className="w-3.5 h-3.5" /> Kế hoạch nhập</button>)}
          {showPriceConfirm && (<button type="button" onClick={() => onConfirmPrice(pr)} className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700 inline-flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5" /> Xác nhận & Đã mua xong{!isActualPriceConfirmed(pr) && <span className="ml-1 px-1 py-0.5 rounded text-[10px] bg-white text-emerald-700">chưa chốt</span>}</button>)}
          {showCancel && (<button type="button" onClick={() => onCancel(pr)} className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 inline-flex items-center gap-1.5"><Ban className="w-3.5 h-3.5" /> Hủy phiếu</button>)}
          {pr.trangThai === 'Hoàn thành' && onUpdateAttachment && (canEdit || canUpdate) && (<button type="button" onClick={() => onUpdateAttachment(pr)} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 inline-flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Cập nhật tệp</button>)}
          {canEdit && (<button type="button" onClick={() => onEdit(pr)} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 inline-flex items-center gap-1.5"><Edit className="w-3.5 h-3.5" /> Chỉnh sửa</button>)}
          {canUpdate && onQuickUpdate && pr.trangThai === 'Đã duyệt' && (<button type="button" onClick={() => onQuickUpdate(pr)} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 inline-flex items-center gap-1.5"><FilePenLine className="w-3.5 h-3.5" /> Cập nhật</button>)}
          <button onClick={onClose} className="px-3 py-1.5 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </Modal>
  );
}
