import { useMemo } from 'react';
import { Edit, BadgeCheck, Ban, X } from 'lucide-react';
import Modal from '../Modal';
import type { PurchaseRequest } from '../../types/purchaseRequest';
import { labelForPurchaseRequest } from '../../utils/purchaseRequestLabel';
import { sourceTypeLabel, sourceTypeBadgeClass, trangThaiBadgeClass } from '../../utils/purchaseRequestBadges';
import { normalizeBoPhan } from '../../utils/normalizeBoPhan';

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
}

function formatDate(d?: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('vi-VN'); } catch { return '—'; }
}
function formatDateTime(d?: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('vi-VN'); } catch { return '—'; }
}

export default function PurchaseRequestDetailModal({
  isOpen, onClose, purchaseRequest, canEdit, canUpdate, isActualPriceConfirmed, onEdit, onCancel, onConfirmPrice,
}: Props) {
  const pr = purchaseRequest;
  const totals = useMemo(() => {
    if (!pr?.items?.length) return { duKien: 0, thucTe: 0, hasThucTe: false };
    let duKien = 0, thucTe = 0;
    let hasThucTe = false;
    for (const it of pr.items) {
      const q = Number(it.soLuong) || 0;
      duKien += q * (Number(it.giaDuKien) || 0);
      if (it.giaThucTe != null && Number(it.giaThucTe) > 0) {
        thucTe += q * Number(it.giaThucTe);
        hasThucTe = true;
      }
    }
    return { duKien, thucTe, hasThucTe };
  }, [pr]);

  if (!isOpen || !pr) return null;

  const positionName = pr.employee?.position?.name;
  const showPriceConfirm = pr.trangThai === 'Đã duyệt' && canUpdate;
  const showCancel = (pr.trangThai === 'Chờ báo giá' || pr.trangThai === 'Chờ duyệt') && canEdit;

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Chi tiết yêu cầu mua hàng" className="p-0 sm:p-4">
      <div className="bg-white rounded-lg shadow-sm max-w-4xl w-full mx-2 sm:mx-4 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} role="document">
        <div className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-4 shrink-0 gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Chi tiết {labelForPurchaseRequest(pr)}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-6 h-6" /></button>
          </div>

          {/* Chain links */}
          {(pr.supplyRequest || pr.replenishmentRequest || (pr.warehouseReceipts && pr.warehouseReceipts.length > 0)) && (
            <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-2 text-xs">
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
                    <span key={w.id} className="font-medium text-emerald-700">{w.maPhieuNhap ?? w.maPhieu ?? w.id.slice(0,8)}</span>
                  ))}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-400"><span>→</span> Chưa có phiếu nhập kho</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto flex-1 min-h-0 pr-1">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Mã yêu cầu</label>
              <p className="text-sm font-semibold text-blue-600">{pr.maYeuCau}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Ngày yêu cầu</label>
              <p className="text-sm text-gray-900">{formatDate(pr.ngayYeuCau)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Nhân viên yêu cầu</label>
              <p className="text-sm text-gray-900">{pr.tenNhanVien}</p>
              {positionName && <p className="text-xs text-gray-500">{positionName}</p>}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Mã nhân viên</label>
              <p className="text-sm text-gray-900">{pr.maNhanVien}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Phân loại</label>
              <p className="text-sm text-gray-900">{pr.items?.[0]?.phanLoai ?? pr.phanLoai ?? '—'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Mức độ ưu tiên</label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                pr.mucDoUuTien === 'Cao' ? 'bg-red-100 text-red-800' :
                pr.mucDoUuTien === 'Trung bình' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>{pr.mucDoUuTien}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Bộ phận yêu cầu</label>
              <p className="text-sm text-gray-900" title={pr.supplyRequest?.boPhan ?? ''}>{pr.supplyRequest?.boPhan ? normalizeBoPhan(pr.supplyRequest.boPhan) : '—'}</p>
            </div>

            {/* Items table */}
            {pr.items && pr.items.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-2">Danh sách sản phẩm</label>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-2 font-medium text-gray-600">STT</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600">Phân loại</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600">Tên hàng hoá</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-600">Số lượng</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600">ĐVT</th>
                        <th className="text-left py-2 px-2 font-medium text-gray-600">Nhà cung cấp</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-600">Giá kế hoạch</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-600">Giá thực tế</th>
                        <th className="text-right py-2 px-2 font-medium text-gray-600">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pr.items.map((item: any, i: number) => {
                        const price = item.giaThucTe ?? item.giaDuKien;
                        return (
                          <tr key={item.id ?? i} className="border-b border-gray-100">
                            <td className="py-2 px-2">{i + 1}</td>
                            <td className="py-2 px-2">{item.phanLoai}</td>
                            <td className="py-2 px-2 font-medium">{item.tenHangHoa}</td>
                            <td className="py-2 px-2 text-right">{item.soLuong}</td>
                            <td className="py-2 px-2">{item.donViTinh}</td>
                            <td className="py-2 px-2 text-blue-600" title={item.supplier ? `${item.supplier.tenNhaCungCap}${item.supplier.soDienThoai ? ' · ' + item.supplier.soDienThoai : ''}` : ''}>
                              {item.supplier?.tenNhaCungCap || '—'}
                              {item.supplier?.soDienThoai && <span className="text-xs text-gray-400 ml-1">{item.supplier.soDienThoai}</span>}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-500">{item.giaDuKien ? Number(item.giaDuKien).toLocaleString('vi-VN') + 'đ' : '—'}</td>
                            <td className={`py-2 px-2 text-right ${item.giaThucTe ? 'font-medium text-green-700' : 'text-gray-400 italic'}`}>
                              {item.giaThucTe ? Number(item.giaThucTe).toLocaleString('vi-VN') + 'đ' : 'chưa chốt'}
                            </td>
                            <td className="py-2 px-2 text-right font-medium">{price ? (Number(price) * item.soLuong).toLocaleString('vi-VN') + 'đ' : '—'}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-100 font-bold">
                        <td colSpan={6} className="py-2 px-2 text-right">Tổng dự kiến:</td>
                        <td colSpan={3} className="py-2 px-2 text-right text-gray-700">{totals.duKien ? totals.duKien.toLocaleString('vi-VN') + 'đ' : '—'}</td>
                      </tr>
                      {totals.hasThucTe && (
                        <>
                          <tr className="bg-green-50 font-bold">
                            <td colSpan={6} className="py-2 px-2 text-right">Tổng thực tế:</td>
                            <td colSpan={3} className="py-2 px-2 text-right text-green-700">{totals.thucTe.toLocaleString('vi-VN')}đ</td>
                          </tr>
                          <tr className="bg-white font-medium">
                            <td colSpan={6} className="py-2 px-2 text-right text-gray-500">Chênh lệch:</td>
                            <td colSpan={3} className={`py-2 px-2 text-right ${totals.thucTe - totals.duKien > 0 ? 'text-red-600' : totals.thucTe - totals.duKien < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                              {(totals.thucTe - totals.duKien > 0 ? '+' : '') + (totals.thucTe - totals.duKien).toLocaleString('vi-VN')}đ
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Mục đích yêu cầu</label>
              <p className="text-sm text-gray-900">{pr.mucDichYeuCau}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Trạng thái</label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${trangThaiBadgeClass(pr.trangThai)}`}>{pr.trangThai}</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Nguồn</label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${sourceTypeBadgeClass(pr.sourceType)}`}>{sourceTypeLabel(pr.sourceType)}</span>
            </div>
            {pr.ghiChu && (
              <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú người yêu cầu</label>
                <p className="text-sm text-gray-900">{pr.ghiChu}</p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Ghi chú thu mua</label>
              {pr.ghiChuMuaHang ? <p className="text-sm text-gray-900">{pr.ghiChuMuaHang}</p> : <p className="text-sm text-gray-400 italic">Chưa có ghi chú thu mua</p>}
            </div>
            {pr.lyDoHuy && (
              <div className="bg-red-50 p-4 rounded-lg col-span-1 sm:col-span-2 border border-red-200">
                <label className="block text-sm font-medium text-red-600 mb-1">Lý do hủy</label>
                <p className="text-sm text-gray-900">{pr.lyDoHuy}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                  {pr.nguoiHuy && <span>Người hủy: <span className="font-medium text-gray-800">{pr.nguoiHuy}</span></span>}
                  {pr.ngayHuy && <span>Ngày hủy: <span className="font-medium text-gray-800">{formatDateTime(pr.ngayHuy)}</span></span>}
                </div>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Người duyệt</label>
              <p className="text-sm text-gray-900">{pr.nguoiDuyet || <span className="text-gray-400 italic">Chưa có</span>}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-500 mb-1">Ngày duyệt</label>
              <p className="text-sm text-gray-900">{pr.ngayDuyet ? formatDate(pr.ngayDuyet) : <span className="text-gray-400 italic">Chưa duyệt</span>}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg col-span-1 sm:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">File đính kèm</label>
              {pr.fileKemTheo ? (
                <a href={pr.fileKemTheo} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">{pr.fileKemTheo}</a>
              ) : (
                <p className="text-sm text-gray-400 italic">Không có file đính kèm</p>
              )}
            </div>
            <div className="bg-blue-50 p-3 rounded-lg col-span-1 sm:col-span-2 border border-blue-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              <span>Ngày tạo: <span className="font-medium text-gray-800">{formatDateTime(pr.createdAt)}</span></span>
              <span>Cập nhật: <span className="font-medium text-gray-800">{formatDateTime(pr.updatedAt)}</span></span>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 mt-4 pt-4 border-t border-gray-100 bg-white shrink-0">
            {showPriceConfirm && (
              <button type="button" onClick={() => onConfirmPrice(pr)} className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center gap-2">
                <BadgeCheck className="w-4 h-4" /> Xác nhận giá thực tế
                {!isActualPriceConfirmed(pr) && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-white text-amber-700">chưa chốt</span>}
              </button>
            )}
            {showCancel && (
              <button type="button" onClick={() => onCancel(pr)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2">
                <Ban className="w-4 h-4" /> Hủy phiếu
              </button>
            )}
            {canEdit && (
              <button type="button" onClick={() => onEdit(pr)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2">
                <Edit className="w-4 h-4" /> Chỉnh sửa
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
