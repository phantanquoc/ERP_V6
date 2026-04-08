import React, { useEffect, useState } from 'react';
import { X, Package, Calendar, User, DollarSign, Truck } from 'lucide-react';
import Modal from './Modal';
import { orderService, Order } from '../services/orderService';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
}

const PRODUCTION_STATUS_LABEL: Record<string, string> = {
  CHO_LEN_KE_HOACH:       'Chờ lên kế hoạch',
  CHO_SAN_XUAT:           'Chờ sản xuất',
  DANG_SAN_XUAT:          'Đang sản xuất',
  CHO_GIAO_HANG:          'Chờ giao hàng',
  DA_LEN_CONTAINER:       'Đã lên container',
  DANG_VAN_CHUYEN:        'Đang vận chuyển',
  DA_GIAO_CHO_KHACH_HANG: 'Đã giao cho khách hàng',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  DA_THANH_TOAN_DOT_1:  'Đã thanh toán đợt 1',
  CHO_THANH_TOAN_DOT_2: 'Chờ thanh toán đợt 2',
  DA_THANH_TOAN_DU:     'Đã thanh toán đủ',
};

const PRODUCTION_STATUS_COLOR: Record<string, string> = {
  CHO_LEN_KE_HOACH:       'bg-gray-100 text-gray-700',
  CHO_SAN_XUAT:           'bg-yellow-100 text-yellow-700',
  DANG_SAN_XUAT:          'bg-blue-100 text-blue-700',
  CHO_GIAO_HANG:          'bg-orange-100 text-orange-700',
  DA_LEN_CONTAINER:       'bg-purple-100 text-purple-700',
  DANG_VAN_CHUYEN:        'bg-indigo-100 text-indigo-700',
  DA_GIAO_CHO_KHACH_HANG: 'bg-green-100 text-green-700',
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  DA_THANH_TOAN_DOT_1:  'bg-yellow-100 text-yellow-700',
  CHO_THANH_TOAN_DOT_2: 'bg-orange-100 text-orange-700',
  DA_THANH_TOAN_DU:     'bg-green-100 text-green-700',
};

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ isOpen, onClose, orderId }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !orderId) return;
    setLoading(true);
    orderService.getOrderById(orderId)
      .then((res: any) => setOrder(res?.data ?? res ?? null))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [isOpen, orderId]);

  const fmt = (date?: string) =>
    date ? new Date(date).toLocaleDateString('vi-VN') : '—';

  const fmtCurrency = (val?: number, unit = 'VNĐ') =>
    val ? `${val.toLocaleString('vi-VN')} ${unit}` : '—';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">
                {order ? `Đơn hàng ${order.maDonHang}` : 'Chi tiết đơn hàng'}
              </h2>
              {order && (
                <p className="text-blue-100 text-xs">Báo giá: {order.maBaoGia}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-blue-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}

          {!loading && !order && (
            <p className="text-center text-gray-500 py-12">Không tìm thấy đơn hàng</p>
          )}

          {!loading && order && (
            <div className="space-y-5">
              {/* Trạng thái */}
              <div className="flex flex-wrap gap-3">
                {order.trangThaiSanXuat && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRODUCTION_STATUS_COLOR[order.trangThaiSanXuat] ?? 'bg-gray-100 text-gray-700'}`}>
                    SX: {PRODUCTION_STATUS_LABEL[order.trangThaiSanXuat] ?? order.trangThaiSanXuat}
                  </span>
                )}
                {order.trangThaiThanhToan && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${PAYMENT_STATUS_COLOR[order.trangThaiThanhToan] ?? 'bg-gray-100 text-gray-700'}`}>
                    TT: {PAYMENT_STATUS_LABEL[order.trangThaiThanhToan] ?? order.trangThaiThanhToan}
                  </span>
                )}
              </div>

              {/* Thông tin chung */}
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={<User className="w-4 h-4 text-gray-400" />} label="Khách hàng" value={order.tenKhachHang} />
                <InfoRow icon={<User className="w-4 h-4 text-gray-400" />} label="Nhân viên" value={order.tenNhanVien ?? '—'} />
                <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Ngày đặt" value={fmt(order.ngayDatHang)} />
                <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Ngày giao" value={fmt(order.ngayGiaoHang)} />
                <InfoRow icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="Giá trị (USD)" value={fmtCurrency(order.giaTriDonHangUSD, 'USD')} />
                <InfoRow icon={<DollarSign className="w-4 h-4 text-gray-400" />} label="Giá trị (VNĐ)" value={fmtCurrency(order.giaTriDonHangVND)} />
              </div>

              {/* Kế hoạch sản xuất */}
              {(order.ngayBatDauSanXuatKeHoach || order.ngayHoanThanhSanXuatKeHoach) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> Kế hoạch sản xuất
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                    <div><span className="text-gray-400">Bắt đầu: </span>{fmt(order.ngayBatDauSanXuatKeHoach)}</div>
                    <div><span className="text-gray-400">Hoàn thành KH: </span>{fmt(order.ngayHoanThanhSanXuatKeHoach)}</div>
                    <div><span className="text-gray-400">Hoàn thành TT: </span>{fmt(order.ngayHoanThanhThucTe)}</div>
                  </div>
                </div>
              )}

              {/* Sản phẩm */}
              {order.items && order.items.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Hàng hoá ({order.items.length})</p>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {order.items.map((item) => (
                      <div key={item.id} className="px-4 py-3 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{item.tenHangHoa}</p>
                          {item.yeuCauHangHoa && (
                            <p className="text-xs text-gray-500">{item.yeuCauHangHoa}</p>
                          )}
                        </div>
                        <span className="text-sm text-gray-700 font-mono">
                          {item.soLuong} {item.donVi}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ghi chú */}
              {order.ghiChu && (
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                  <span className="font-medium text-gray-500">Ghi chú: </span>{order.ghiChu}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  </div>
);

export default OrderDetailModal;
